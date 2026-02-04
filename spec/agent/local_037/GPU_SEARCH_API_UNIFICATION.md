# GPU 検索 API 統一 仕様書

## 1. 概要

### 1.1 目的

GPU 検索経路を `DatetimeSearchContext` ベースの API に統一し、CPU/GPU 経路で一貫した入力インターフェースを実現する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| `DatetimeSearchContext` | UI からの検索パラメータ (DS設定、時刻範囲、Timer0/VCount範囲、KeySpec) |
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
| `wasm-pkg/src/gpu/datetime_search/iterator.rs` | 変更 | `create()` のシグネチャ変更、組み合わせ展開ロジック追加 |
| `wasm-pkg/src/gpu/datetime_search/pipeline.rs` | 変更 | 必要に応じて再初期化対応 |
| `wasm-pkg/src/types/search.rs` | 変更 | `MtseedDatetimeSearchParams` を内部用に降格 |
| `src/workers/gpu.worker.ts` | 変更 | 新 API に対応 |
| `src/workers/types.ts` | 変更 | タスク型の更新 |
| `src/test/integration/wasm-binding.test.ts` | 変更 | テスト更新 |
| `src/test/integration/workers/gpu.worker.test.ts` | 変更 | テスト更新 |

## 3. 設計方針

### 3.1 API 変更

**現在:**
```rust
impl GpuDatetimeSearchIterator {
    pub async fn create(
        params: MtseedDatetimeSearchParams
    ) -> Result<Self, String>
}
```

**変更後:**
```rust
impl GpuDatetimeSearchIterator {
    pub async fn create(
        context: DatetimeSearchContext,
        target_seeds: Vec<MtSeed>,
        date_range: DateRangeParams,
    ) -> Result<Self, String>
}
```

### 3.2 CPU/GPU 経路の統一

両経路で同じ3つの引数を取る形に統一:

| 関数 | 引数 |
|------|------|
| `generate_mtseed_search_tasks()` | `context`, `target_seeds`, `date_range`, `worker_count` |
| `GpuDatetimeSearchIterator::create()` | `context`, `target_seeds`, `date_range` |

### 3.3 内部構造

```rust
pub struct GpuDatetimeSearchIterator {
    // 共通パラメータ (保持)
    context: DatetimeSearchContext,
    target_seeds: Vec<MtSeed>,
    search_range: SearchRangeParams,
    
    // 組み合わせ管理
    combinations: Vec<StartupCondition>,
    current_combo_idx: usize,
    
    // 現在の Pipeline
    pipeline: Option<SearchPipeline>,
    gpu_ctx: GpuDeviceContext,
    limits: SearchJobLimits,
    
    // 進捗管理 (全組み合わせにわたる)
    total_count: u64,
    processed_count: u64,
}
```

### 3.4 動作フロー

```
create(context, target_seeds, date_range)
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

### 3.5 進捗計算

全組み合わせにわたる統合進捗:

```rust
// 総処理数 = 検索範囲の秒数 × 組み合わせ数
total_count = seconds_in_range * combinations.len()

// 累計処理数 = 完了した組み合わせの処理数 + 現在の Pipeline の処理数
processed_count = completed_combos * seconds_per_combo + current_pipeline.processed

// 進捗率
progress = processed_count as f64 / total_count as f64
```

## 4. 実装仕様

### 4.1 GpuDatetimeSearchIterator 構造体

```rust
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct GpuDatetimeSearchIterator {
    /// GPU デバイスコンテキスト (共有)
    gpu_ctx: GpuDeviceContext,
    
    /// 検索制限
    limits: SearchJobLimits,
    
    /// 共通パラメータ
    target_seeds: Vec<MtSeed>,
    ds: DsConfig,
    time_range: TimeRangeParams,
    search_range: SearchRangeParams,
    
    /// 組み合わせ管理
    combinations: Vec<StartupCondition>,
    current_combo_idx: usize,
    
    /// 現在の Pipeline (組み合わせごとに再作成)
    pipeline: Option<SearchPipeline>,
    pipeline_offset: u32,
    
    /// 進捗管理
    total_count: u64,
    processed_count: u64,
    last_processed: u64,
    last_time_secs: f64,
}
```

### 4.2 create() 実装

```rust
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(js_name = "create"))]
pub async fn create(
    context: DatetimeSearchContext,
    target_seeds: Vec<MtSeed>,
    date_range: DateRangeParams,
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
    
    // 検索範囲計算
    let search_range = date_range.to_search_range();
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
        last_processed: 0,
        last_time_secs: current_time_secs(),
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

```typescript
// gpu.worker.ts
async function runGpuSearch(
  taskId: string, 
  context: DatetimeSearchContext,
  targetSeeds: number[],
  dateRange: DateRangeParams
): Promise<void> {
  cancelRequested = false;
  
  try {
    currentIterator = await GpuDatetimeSearchIterator.create(
      context,
      targetSeeds,
      dateRange
    );
    
    while (!cancelRequested && !currentIterator.is_done) {
      const batch = await currentIterator.next();
      // ... 進捗報告、結果報告
    }
    
    postResponse({ type: 'done', taskId });
  } catch (err) {
    postResponse({ type: 'error', taskId, message: String(err) });
  } finally {
    currentIterator?.free();
    currentIterator = null;
  }
}
```

## 5. テスト方針

### 5.1 ユニットテスト (Rust)

| テスト | 検証内容 |
|--------|----------|
| `test_create_with_context` | `DatetimeSearchContext` から正常に作成できること |
| `test_multiple_combinations` | 複数組み合わせが順次処理されること |
| `test_progress_across_combinations` | 全組み合わせにわたる進捗が正しく計算されること |
| `test_empty_combinations_rejected` | 空の組み合わせでエラーになること |

### 5.2 統合テスト (TypeScript)

| テスト | 検証内容 |
|--------|----------|
| `should search with DatetimeSearchContext` | 新 API で検索が動作すること |
| `should handle multiple KeyCodes` | 複数 KeyCode の探索が動作すること |
| `should report progress across all combinations` | 統合進捗が正しく報告されること |

## 6. 実装チェックリスト

- [ ] `GpuDatetimeSearchIterator` 構造体に組み合わせ管理フィールド追加
- [ ] `create()` のシグネチャ変更 (`DatetimeSearchContext` ベース)
- [ ] `create()` 内で `expand_combinations()` 呼び出し
- [ ] `next()` で組み合わせ切り替えロジック実装
- [ ] 進捗計算を全組み合わせ対応に修正
- [ ] `gpu.worker.ts` を新 API に対応
- [ ] `workers/types.ts` のタスク型更新
- [ ] Rust ユニットテスト追加
- [ ] TypeScript 統合テスト更新
- [ ] 既存テストの互換性確認
