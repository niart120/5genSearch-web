# GPU 検索 API 統一 仕様書

## 1. 概要

### 1.1 目的

GPU 検索経路を `DatetimeSearchContext` ベースの API に統一し、CPU/GPU 経路で一貫した入力インターフェースを実現する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| `DatetimeSearchContext` | UI からの検索パラメータ (DS設定、日付範囲、時刻範囲、Timer0/VCount範囲、KeySpec) |
| `DateRangeParams` | 開始日〜終了日を指定する日付範囲 (`DatetimeSearchContext` 内に統合) |
| `KeySpec` | 利用可能なボタンを指定し、全組み合わせを探索するための仕様 |
| `StartupCondition` | 単一の起動条件 (Timer0, VCount, KeyCode) |
| `MtseedDatetimeSearchParams` | 単一組み合わせの検索パラメータ (現在の GPU 入力型) |
| `SearchPipeline` | GPU 検索パイプライン (シェーダー実行単位) |

### 1.3 背景・問題

現状の API 構造に不整合がある:

| 経路 | 入力型 | 組み合わせ展開 |
|------|--------|----------------|
| CPU | `DatetimeSearchContext` | Rust 側で `generate_*_search_tasks()` により展開 |
| GPU | `MtseedDatetimeSearchParams` | 展開済み単一組み合わせのみ受け付け |

**問題点:**

1. GPU 経路では `DatetimeSearchContext` を使えない
2. `KeySpec` からの複数 KeyCode 探索が GPU では未実装
3. UI 側で CPU/GPU を切り替える際に異なる型を使い分ける必要がある

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| API 統一 | CPU/GPU 経路で同じ入力型 (`DatetimeSearchContext`) を使用 |
| 機能完備 | GPU 経路でも `KeySpec` による複数 KeyCode 探索が可能 |
| 保守性向上 | UI 側のコードが CPU/GPU 切り替えに依存しない |

### 1.5 着手条件

- GPU Worker テスト基盤が整備されていること (local_036 で達成)
- headless WebGPU テスト環境が動作すること (達成済み)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/search.rs` | 変更 | `DatetimeSearchContext` に `date_range` フィールドを追加 |
| `wasm-pkg/src/datetime_search/mtseed.rs` | 変更 | `generate_mtseed_search_tasks()` から `date_range` パラメータを削除 |
| `wasm-pkg/src/datetime_search/egg.rs` | 変更 | `generate_egg_search_tasks()` から `date_range` パラメータを削除 |
| `wasm-pkg/src/datetime_search/trainer_info.rs` | 変更 | `generate_trainer_info_search_tasks()` から `date_range` パラメータを削除 |
| `wasm-pkg/src/gpu/datetime_search/iterator.rs` | 変更 | `create()` のシグネチャ変更、`new()` API 削除、組み合わせ展開ロジック追加 |
| `wasm-pkg/benches/gpu_datetime_search.rs` | 変更 | ベンチマークを `create()` API に更新 |
| `src/workers/gpu.worker.ts` | 変更 | `gpu-mtseed` タスクに対応、スループット計算をローカル化 |
| `src/workers/types.ts` | 変更 | `GpuMtseedSearchTask` 型の追加 |
| `src/test/integration/wasm-binding.test.ts` | 変更 | テスト更新 |
| `src/test/integration/workers/gpu.worker.test.ts` | 変更 | テスト更新 |
| `src/test/integration/services/worker-pool-gpu.test.ts` | 変更 | テスト更新 |

## 3. 設計方針

### 3.1 API 変更

**変更前:**
```rust
impl GpuDatetimeSearchIterator {
    pub async fn new(params: MtseedDatetimeSearchParams) -> Result<Self, String>
    pub async fn create(
        context: DatetimeSearchContext,
        target_seeds: Vec<MtSeed>,
        date_range: DateRangeParams,
    ) -> Result<Self, String>
}
```

**変更後:**
```rust
impl GpuDatetimeSearchIterator {
    // new() は削除、create() のみ
    pub async fn create(
        context: DatetimeSearchContext,  // date_range を含む
        target_seeds: Vec<MtSeed>,
    ) -> Result<Self, String>
}
```

### 3.2 DatetimeSearchContext への date_range 統合

`date_range` を別引数ではなく `DatetimeSearchContext` のフィールドとして統合:

```rust
pub struct DatetimeSearchContext {
    pub ds: DsConfig,
    pub date_range: DateRangeParams,  // ← 追加
    pub time_range: TimeRangeParams,
    pub ranges: Vec<Timer0VCountRange>,
    pub key_spec: KeySpec,
}
```

**理由:**
- UI は常に `date_range` と `time_range` を一緒に指定する
- 引数を減らしてシンプルな API を提供
- CPU/GPU 両方で同じ型を使用可能

### 3.3 CPU/GPU 経路の統一

両経路で同じ引数構成に統一:

| 関数 | 引数 |
|------|------|
| `generate_mtseed_search_tasks()` | `context`, `target_seeds`, `worker_count` |
| `generate_egg_search_tasks()` | `context`, `egg_params`, `gen_config`, `filter`, `worker_count` |
| `generate_trainer_info_search_tasks()` | `context`, `filter`, `game_start`, `worker_count` |
| `GpuDatetimeSearchIterator::create()` | `context`, `target_seeds` |

### 3.4 内部構造

```rust
pub struct GpuDatetimeSearchIterator {
    // GPU コンテキスト
    gpu_ctx: GpuDeviceContext,
    limits: SearchJobLimits,
    
    // 共通パラメータ
    target_seeds: Vec<MtSeed>,
    ds: DsConfig,
    time_range: TimeRangeParams,
    search_range: SearchRangeParams,  // date_range から変換
    
    // 組み合わせ管理
    combinations: Vec<StartupCondition>,
    current_combo_idx: usize,
    
    // 現在の Pipeline
    pipeline: Option<SearchPipeline>,
    pipeline_offset: u32,
    
    // 進捗管理 (全組み合わせにわたる)
    total_count: u64,
    processed_count: u64,
}
```

### 3.5 動作フロー

```
create(context, target_seeds)
    │
    ▼
context.date_range.to_search_range() → SearchRangeParams
    │
    ▼
expand_combinations(context) → Vec<StartupCondition>
    │
    ▼
combinations[0] で最初の Pipeline 作成
    │
    ▼
┌── next() 呼び出し ◄───────────────────────┐
│       │                                   │
│       ▼                                   │
│   current Pipeline から dispatch          │
│       │                                   │
│       ▼                                   │
│   Pipeline 完了?                          │
│       │ No → バッチ結果を返却              │
│       │ Yes                               │
│       ▼                                   │
│   current_combo_idx++                     │
│       │                                   │
│       ▼                                   │
│   全組み合わせ完了?                        │
│       │ No → 次の Pipeline 作成 ──────────┘
│       │ Yes
│       ▼
│   is_done = true, None 返却
└───────────────────────────────────────────
```

### 3.6 進捗計算

全組み合わせにわたる統合進捗（組み合わせ別進捗は報告しない）:

```rust
// 総処理数 = 検索範囲の秒数 × 組み合わせ数
total_count = seconds_in_range * combinations.len()

// 累計処理数 = 完了した組み合わせの処理数 + 現在の Pipeline の処理数
processed_count = completed_combos * seconds_per_combo + current_pipeline.processed

// 進捗率
progress = processed_count as f64 / total_count as f64
```

**スループット計算:**

CPU Worker と同様に、TypeScript 側で経過時間と処理数から計算:

```typescript
// GPU Worker 内で計算
const throughput = elapsedMs > 0 ? (processedCount / elapsedMs) * 1000 : 0;
```

### 3.7 設計決定事項

| 項目 | 決定内容 | 理由 |
|------|----------|------|
| `date_range` の配置 | `DatetimeSearchContext` 内に統合 | UI が常に一緒に指定、引数削減 |
| `new()` API | 削除、`create()` のみ | API の統一、二重定義の解消 |
| スループット計算 | TypeScript 側で計算 | CPU Worker との一貫性、WASM バインディング簡素化 |
| 結果への組み合わせ情報付与 | `combinations[current_combo_idx]` を使用して `SeedOrigin` に付与 | 既存の `pipeline.condition()` と同等の動作 |
| `time_range` フィルタ | シェーダー側で実装済み（`SearchConstants` に時刻範囲を渡す） | 追加実装不要 |
| `MtseedDatetimeSearchParams` | 公開 API として維持 | CPU 経路の Main→Worker 間通信で必要 |
| 進捗報告粒度 | 全体進捗のみ | UI 側の要件として十分 |
| キャンセル後の再開 | 非サポート（キャンセル = 破棄） | リランは新規検索として実行 |

## 4. 実装仕様

### 4.1 GpuDatetimeSearchIterator 構造体

```rust
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct GpuDatetimeSearchIterator {
    /// GPU デバイスコンテキスト
    gpu_ctx: GpuDeviceContext,
    
    /// 検索制限
    limits: SearchJobLimits,
    
    /// 共通パラメータ
    target_seeds: Vec<MtSeed>,
    ds: DsConfig,
    time_range: TimeRangeParams,
    search_range: SearchRangeParams,  // context.date_range から変換
    
    /// 組み合わせ管理
    combinations: Vec<StartupCondition>,
    current_combo_idx: usize,
    
    /// 現在の Pipeline (組み合わせごとに再作成)
    pipeline: Option<SearchPipeline>,
    pipeline_offset: u32,
    
    /// 進捗管理
    total_count: u64,
    processed_count: u64,
}
```

### 4.2 create() 実装

```rust
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(js_name = "create"))]
pub async fn create(
    context: DatetimeSearchContext,
    target_seeds: Vec<MtSeed>,
) -> Result<GpuDatetimeSearchIterator, String> {
    if target_seeds.is_empty() {
        return Err("target_seeds is empty".into());
    }
    
    // 組み合わせ展開
    let combinations = expand_combinations(&context);
    if combinations.is_empty() {
        return Err("no valid combinations".into());
    }
    
    // GPU 初期化
    let gpu_ctx = GpuDeviceContext::new().await?;
    let limits = SearchJobLimits::from_device_limits(gpu_ctx.limits(), gpu_ctx.gpu_profile());
    
    // 検索範囲計算 (context 内の date_range を使用)
    let search_range = context.date_range.to_search_range();
    let seconds_per_combo = calculate_seconds_in_range(&search_range, &context.time_range);
    let total_count = seconds_per_combo * combinations.len() as u64;
    
    // 最初の組み合わせで Pipeline 作成
    let first_params = build_params(&context, &target_seeds, &search_range, &combinations[0]);
    let pipeline = SearchPipeline::new(&gpu_ctx, &first_params);
    
    Ok(Self {
        gpu_ctx,
        limits,
        target_seeds,
        ds: context.ds,
        time_range: context.time_range,
        search_range,
        combinations,
        current_combo_idx: 0,
        pipeline: Some(pipeline),
        pipeline_offset: 0,
        total_count,
        processed_count: 0,
    })
}
```

### 4.3 next() 実装 (組み合わせ切り替え対応)

```rust
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub async fn next(&mut self) -> Option<GpuSearchBatch> {
    loop {
        // Pipeline がない場合は完了
        let pipeline = self.pipeline.as_mut()?;
        
        // 現在の組み合わせで残り処理があるか
        let remaining = self.seconds_per_combo() - self.pipeline_offset as u64;
        if remaining == 0 {
            // 次の組み合わせへ
            self.current_combo_idx += 1;
            if self.current_combo_idx >= self.combinations.len() {
                self.pipeline = None;
                return None;
            }
            
            // 新しい Pipeline 作成
            let params = self.build_current_params();
            self.pipeline = Some(SearchPipeline::new(&self.gpu_ctx, &params));
            self.pipeline_offset = 0;
            continue;
        }
        
        // dispatch 実行
        let to_process = self.limits.max_messages_per_dispatch.min(remaining as u32);
        let (matches, processed) = pipeline.dispatch(to_process, self.pipeline_offset).await;
        
        self.pipeline_offset += processed;
        self.processed_count += u64::from(processed);
        
        return Some(self.build_batch_result(matches));
    }
}
```

### 4.4 TypeScript 側変更

**タスク型定義 (`workers/types.ts`)**:

```typescript
export type GpuMtseedSearchTask = {
  kind: 'gpu-mtseed';
  context: DatetimeSearchContext;
  targetSeeds: MtSeed[];
};

export type SearchTask =
  | MtseedDatetimeSearchTask
  | EggDatetimeSearchTask
  | GpuMtseedSearchTask;  // GPU 用タスク追加
```

**GPU Worker (`gpu.worker.ts`)**:

```typescript
async function runGpuSearch(task: GpuMtseedSearchTask): Promise<void> {
  cancelRequested = false;
  const startTime = Date.now();
  let processedCount = 0;
  
  try {
    // create() は context と targetSeeds の 2 引数のみ
    currentIterator = await GpuDatetimeSearchIterator.create(
      task.context,
      task.targetSeeds
    );
    
    while (!cancelRequested && !currentIterator.is_done) {
      const batch = await currentIterator.next();
      processedCount = currentIterator.processed_count;
      
      // スループットは TypeScript 側で計算
      const elapsedMs = Date.now() - startTime;
      const throughput = elapsedMs > 0 ? (processedCount / elapsedMs) * 1000 : 0;
      
      postResponse({ 
        type: 'progress', 
        processed: processedCount,
        total: currentIterator.total_count,
        throughput 
      });
      
      // 結果処理...
    }
    
    postResponse({ type: 'done' });
  } catch (err) {
    postResponse({ type: 'error', message: String(err) });
  } finally {
    currentIterator?.free();
    currentIterator = null;
  }
}
```
```

## 5. テスト方針

### 5.1 ユニットテスト (Rust)

| テスト | 検証内容 |
|--------|----------|
| `test_create_with_date_range_in_context` | `DatetimeSearchContext.date_range` から正常に作成できること |
| `test_multiple_combinations` | 複数組み合わせが順次処理されること |
| `test_progress_across_combinations` | 全組み合わせにわたる進捗が正しく計算されること |
| `test_empty_target_seeds_rejected` | 空の `target_seeds` でエラーになること |

### 5.2 統合テスト (TypeScript)

| テスト | 検証内容 |
|--------|----------|
| `should create iterator with DatetimeSearchContext` | 新 API でイテレータ作成が動作すること |
| `should report progress with processed_count and total_count` | 進捗情報が正しく報告されること |
| `should handle GpuMtseedSearchTask type` | GPU 用タスク型が正しく処理されること |

## 6. 実装チェックリスト

### 6.1 Rust 側

- [x] `GpuDatetimeSearchIterator` 構造体に組み合わせ管理フィールド追加
- [x] `create()` のシグネチャ変更 (`DatetimeSearchContext` ベース)
- [x] `create()` 内で `expand_combinations()` 呼び出し
- [x] `next()` で組み合わせ切り替えロジック実装
- [x] `build_current_params()` ヘルパー関数追加
- [x] 進捗計算を全組み合わせ対応に修正
- [x] `combinations[current_combo_idx]` を使用した結果への条件付与
- [x] Rust ユニットテスト追加

### 6.2 TypeScript 側

- [x] `gpu.worker.ts` を新 API に対応
- [x] `workers/types.ts` に GPU 用タスク型追加
- [x] TypeScript 統合テスト更新
- [x] 既存テストの互換性確認
