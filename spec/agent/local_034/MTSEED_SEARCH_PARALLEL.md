# MtseedSearcher 並列化対応 仕様書

## 1. 概要

### 1.1 目的

`MtseedSearcher`（IV フィルタによる MT Seed 全探索）を Worker による並列実行に対応させる。
合わせて、WASM の `generate_*_search_tasks` 関数を呼び出し `SearchTask[]` を返す TS 側オーケストレーション層を実装する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| MT Seed | MT19937 乱数生成器の初期シード (32bit, 0〜0xFFFFFFFF) |
| MtseedSearcher | 指定 IV フィルタを満たす MT Seed を全探索する Searcher |
| IV フィルタ | 個体値 (HP/攻撃/防御/特攻/特防/素早さ) の範囲条件 |
| タスク分割 | 検索範囲を複数タスクに分割し、Worker で並列実行する仕組み |
| SearchTask | Worker に配信する検索タスクの型 (`kind` + `params`) |
| タスク生成関数 | WASM 側の `generate_*_search_tasks` 関数群 |
| オーケストレーション層 | WASM タスク生成関数を呼び出し、タスク配列を構築する TS サービス |

### 1.3 背景・問題

現状の `MtseedSearcher` は以下の設計になっている:

```rust
pub struct MtseedSearcher {
    iv_filter: IvFilter,
    mt_offset: u32,
    is_roamer: bool,
    current_seed: u64,  // 常に 0 からスタート
}
```

**問題点**:
- `current_seed` が常に 0 から開始されるため、検索範囲を指定できない
- 複数 Worker で実行しても、全 Worker が同じ範囲 (0〜2^32) を重複して探索する
- 他の Searcher (`MtseedDatetimeSearcher`, `EggDatetimeSearcher`, `TrainerInfoSearcher`) には `generate_*_tasks` 関数があるが、`MtseedSearcher` にはない

**他 Searcher との比較**:

| Searcher | タスク分割関数 | 並列化 |
|----------|----------------|--------|
| `MtseedDatetimeSearcher` | `generate_mtseed_search_tasks` | ✅ |
| `EggDatetimeSearcher` | `generate_egg_search_tasks` | ✅ |
| `TrainerInfoSearcher` | `generate_trainer_info_search_tasks` | ✅ |
| `MtseedSearcher` | なし | ❌ |

### 1.4 期待効果

| 指標 | 現状 | 改善後 |
|------|------|--------|
| 4 Worker での探索時間 | 単一 Worker と同等 | 約 1/4 |
| Worker 活用率 | 1 Worker のみ稼働 | 全 Worker 稼働 |

### 1.5 着手条件

- `local_033` (Worker 基盤) が完了していること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/search.rs` | 修正 | `MtseedSearchParams` に `start_seed`, `end_seed` 追加 |
| `wasm-pkg/src/misc/mtseed_search.rs` | 修正 | 範囲指定に対応、`generate_mtseed_iv_search_tasks` 追加 |
| `wasm-pkg/src/lib.rs` | 修正 | `generate_mtseed_iv_search_tasks` をエクスポート |
| `src/workers/types.ts` | 確認 | TypeScript 型定義の自動更新確認 |
| `src/test/integration/workers/searcher.test.ts` | 修正 | 並列化テスト追加 |
| `src/services/search-tasks.ts` | 新規作成 | WASM タスク生成関数のラッパー |
| `src/test/integration/wasm-binding.test.ts` | 修正 | 分割ロジックテスト追加 |
| `src/test/integration/services/search-tasks.test.ts` | 新規作成 | search-tasks.ts の統合テスト |

## 3. 設計方針

### 3.1 検索範囲の指定

`MtseedSearchParams` に検索範囲を追加:

```rust
pub struct MtseedSearchParams {
    pub iv_filter: IvFilter,
    pub mt_offset: u32,
    pub is_roamer: bool,
    pub start_seed: u32,  // 追加: 検索開始 Seed (inclusive)
    pub end_seed: u32,    // 追加: 検索終了 Seed (inclusive)
}
```

**閉区間を採用する理由**:
- 半開区間 `[start, end)` では `end = 0x1_0000_0000` が `u32` に収まらない
- 閉区間 `[start, end]` なら `end = 0xFFFF_FFFF` で全範囲を表現可能

### 3.2 タスク分割関数

```rust
/// MT Seed IV 検索タスクを生成
///
/// 0〜2^32 の範囲を `worker_count` 個のタスクに分割する。
///
/// # Arguments
/// - `base_params`: 基本パラメータ (iv_filter, mt_offset, is_roamer)
/// - `worker_count`: Worker 数
///
/// # Returns
/// 分割されたタスクのリスト
#[wasm_bindgen]
pub fn generate_mtseed_iv_search_tasks(
    base_params: MtseedSearchParams,
    worker_count: u32,
) -> Vec<MtseedSearchParams>;
```

### 3.3 分割アルゴリズム

閉区間 `[start_seed, end_seed]` を使用:

```
total_seeds = 0x1_0000_0000 (2^32)
chunk_size = total_seeds / worker_count
remainder = total_seeds % worker_count

Task 0: [0, chunk_size - 1 + (0 < remainder ? 1 : 0)]
Task 1: [end of Task 0 + 1, ...]
...
Task N-1: [..., 0xFFFF_FFFF]
```

### 3.4 デフォルト値

- `start_seed = 0`, `end_seed = 0xFFFF_FFFF` をデフォルト値とする
- 既存のテストは変更なしで動作する

## 4. 実装仕様

### 4.1 MtseedSearchParams (Rust)

```rust
/// MT Seed 検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedSearchParams {
    /// IV フィルタ条件
    pub iv_filter: IvFilter,
    /// MT オフセット (IV 生成開始位置、通常 7)
    pub mt_offset: u32,
    /// 徘徊ポケモンモード
    pub is_roamer: bool,
    /// 検索開始 Seed (inclusive, デフォルト 0)
    #[serde(default)]
    pub start_seed: u32,
    /// 検索終了 Seed (inclusive, デフォルト 0xFFFF_FFFF)
    #[serde(default = "default_end_seed")]
    pub end_seed: u32,
}

fn default_end_seed() -> u32 {
    0xFFFF_FFFF  // 全範囲 (閉区間)
}
```

### 4.2 MtseedSearcher 修正

```rust
impl MtseedSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new(params: MtseedSearchParams) -> MtseedSearcher {
        // 閉区間 [start_seed, end_seed] を使用
        // total = end_seed - start_seed + 1
        Self {
            iv_filter: params.iv_filter,
            mt_offset: params.mt_offset,
            is_roamer: params.is_roamer,
            current_seed: u64::from(params.start_seed),
            end_seed: u64::from(params.end_seed) + 1,  // 内部では半開区間として処理
        }
    }
    
    // total は self.end_seed - start_seed (内部の end_seed は +1 済み)
}
```

**注**: 内部実装では `end_seed + 1` を保持して半開区間として処理し、オーバーフローを回避。

### 4.3 generate_mtseed_iv_search_tasks

```rust
#[wasm_bindgen]
pub fn generate_mtseed_iv_search_tasks(
    base_params: MtseedSearchParams,
    worker_count: u32,
) -> Vec<MtseedSearchParams> {
    let start = u64::from(base_params.start_seed);
    let end = u64::from(base_params.end_seed);
    let total = end - start + 1;  // 閉区間
    let chunk_size = total / u64::from(worker_count);
    let remainder = total % u64::from(worker_count);
    
    let mut tasks = Vec::with_capacity(worker_count as usize);
    let mut current = start;
    
    for i in 0..worker_count {
        let extra = if u64::from(i) < remainder { 1 } else { 0 };
        let size = chunk_size + extra;
        
        if size == 0 {
            break;  // worker_count > total の場合
        }
        
        let task_end = current + size - 1;  // 閉区間の終端
        
        tasks.push(MtseedSearchParams {
            iv_filter: base_params.iv_filter.clone(),
            mt_offset: base_params.mt_offset,
            is_roamer: base_params.is_roamer,
            start_seed: current as u32,
            end_seed: task_end as u32,  // 閉区間
        });
        
        current = task_end + 1;
    }
    
    tasks
}
```

### 4.4 TypeScript 型 (自動生成)

```typescript
export interface MtseedSearchParams {
  iv_filter: IvFilter;
  mt_offset: number;
  is_roamer: boolean;
  start_seed?: number;  // optional (default: 0, inclusive)
  end_seed?: number;    // optional (default: 0xFFFF_FFFF, inclusive)
}
```

### 4.5 TS オーケストレーション層 (`src/services/search-tasks.ts`)

設計方針:
- 各関数は WASM の `generate_*` を呼び出し、返されたパラメータ配列を `SearchTask[]` にマッピングする
- `services/` 配下に置き、`features/` → `services/` の依存方向を維持
- class は使わず関数として実装（コーディング規約: 関数型プログラミング推奨）
- WASM 型は `@wasm` から直接 import
- WASM 初期化済みのコンテキストで呼ばれる前提（初期化責務は持たない）

```typescript
import {
  generate_mtseed_iv_search_tasks,
  generate_mtseed_search_tasks,
  generate_egg_search_tasks,
  generate_trainer_info_search_tasks,
} from '../wasm/wasm_pkg.js';
import type { SearchTask } from '../workers/types';

export function createMtseedIvSearchTasks(
  baseParams: MtseedSearchParams,
  workerCount: number,
): MtseedSearchTask[] {
  const paramsList = generate_mtseed_iv_search_tasks(baseParams, workerCount);
  return paramsList.map((params) => ({ kind: 'mtseed' as const, params }));
}

export function createMtseedDatetimeSearchTasks(
  context: DatetimeSearchContext,
  targetSeeds: MtSeed[],
  workerCount: number,
): MtseedDatetimeSearchTask[] {
  const paramsList = generate_mtseed_search_tasks(context, targetSeeds, workerCount);
  return paramsList.map((params) => ({ kind: 'mtseed-datetime' as const, params }));
}

export function createEggSearchTasks(
  context: DatetimeSearchContext,
  eggParams: EggGenerationParams,
  genConfig: GenerationConfig,
  filter: EggFilter | null,
  workerCount: number,
): EggDatetimeSearchTask[] {
  const paramsList = generate_egg_search_tasks(context, eggParams, genConfig, filter, workerCount);
  return paramsList.map((params) => ({ kind: 'egg-datetime' as const, params }));
}

export function createTrainerInfoSearchTasks(
  context: DatetimeSearchContext,
  filter: TrainerInfoFilter,
  gameStart: GameStartConfig,
  workerCount: number,
): TrainerInfoSearchTask[] {
  const paramsList = generate_trainer_info_search_tasks(context, filter, gameStart, workerCount);
  return paramsList.map((params) => ({ kind: 'trainer-info' as const, params }));
}
```

### 4.6 WASM メインスレッド初期化

`search-tasks.ts` の関数は WASM 関数を直接呼ぶため、メインスレッドで WASM が初期化済みである必要がある。
仕様書 (`worker-design.md` セクション 2.3) に「`generate_*_search_tasks` はメインスレッドで実行」と明記されている。
`search-tasks.ts` は「WASM 初期化済みのコンテキストで呼ばれる」前提で実装する（初期化責務は持たない）。

## 5. テスト方針

### 5.1 Rust ユニットテスト

| テスト | 検証内容 |
|--------|----------|
| `test_mtseed_searcher_with_range` | 指定範囲のみ探索することを確認 |
| `test_generate_mtseed_iv_search_tasks` | Worker 数に応じて正しく分割されることを確認 |
| `test_generate_mtseed_iv_search_tasks_coverage` | 全タスクの範囲が 0〜2^32 を重複なくカバーすることを確認 |

### 5.2 統合テスト

| テスト | 検証内容 |
|--------|----------|
| `should split search range correctly` | タスク分割後の範囲が正しいことを確認 |
| `should find results in parallel` | 複数 Worker で並列実行し、結果が正しく集約されることを確認 |

### 5.3 テスト整理

| テスト | 移動先 | 理由 |
|--------|--------|------|
| `should split search range correctly` | `wasm-binding.test.ts` | WASM バインディングテスト |
| `should find results in parallel` | `searcher.test.ts`（残留） | Worker 並列実行テスト |

- `MtseedSearcher` describe の `beforeAll(init())` を削除し、並列テスト内のローカル初期化に移行

### 5.4 search-tasks.ts 統合テスト

`src/test/integration/services/search-tasks.test.ts`:
- WASM を初期化して `createMtseedIvSearchTasks` を呼び出し、正しいタスク配列が返ることを検証
- 他の `create*SearchTasks` 関数も同様にテスト
- 結果を `runSearchInWorker` に渡して Worker 経由で実行可能なことを確認

## 6. 実装チェックリスト

- [ ] `MtseedSearchParams` に `start_seed`, `end_seed` フィールド追加
- [ ] `MtseedSearcher::new` で範囲指定に対応
- [ ] `MtseedSearcher::next_batch` で `end_seed` を考慮
- [ ] `MtseedSearcher::is_done` で `end_seed` を考慮
- [ ] `generate_mtseed_iv_search_tasks` 関数実装
- [ ] `lib.rs` でエクスポート
- [ ] Rust ユニットテスト追加
- [ ] WASM リビルド・TypeScript 型確認
- [ ] 統合テスト追加
- [ ] 既存テスト (`should match all with any filter`) が動作することを確認
- [ ] `src/services/search-tasks.ts` 新規作成
- [ ] `searcher.test.ts` から WASM 直接テストを `wasm-binding.test.ts` へ移動
- [ ] `searcher.test.ts` の `beforeAll(init())` 整理
- [ ] `src/test/integration/services/search-tasks.test.ts` 新規作成
- [ ] 全テスト通過確認
