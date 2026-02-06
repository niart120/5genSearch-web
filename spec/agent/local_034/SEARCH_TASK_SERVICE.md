# 検索タスク生成サービス 仕様書

## 1. 概要

### 1.1 目的

WASM の `generate_*_search_tasks` 関数を呼び出し、`SearchTask[]` を返すオーケストレーション層を TS 側に実装する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| SearchTask | Worker に配信する検索タスクの型 (`kind` + `params`) |
| タスク生成関数 | WASM 側の `generate_*_search_tasks` 関数群 |
| オーケストレーション層 | WASM タスク生成関数を呼び出し、タスク配列を構築するサービス |

### 1.3 背景・問題

Rust/WASM 側で以下が実装済み:
- `MtseedSearchParams` に `start_seed` / `end_seed` フィールド追加
- `MtseedSearcher` が範囲を尊重
- `generate_mtseed_iv_search_tasks(base_params, worker_count)` 関数

TS 側のインフラ (`WorkerPool`, `useSearch`, Worker) は複数タスクの分配・集約に対応済みだが、
WASM のタスク生成関数を呼び出してタスク配列を作るオーケストレーション層が存在しない。

### 1.4 期待効果

| 指標 | 内容 |
|------|------|
| タスク生成の一元化 | 全 Searcher のタスク生成を `search-tasks.ts` に集約 |
| テストの整理 | WASM バインディングテストと Worker 統合テストの責務を分離 |

### 1.5 着手条件

- WASM 側の `generate_*_search_tasks` 関数群が実装済みであること
- `WorkerPool`, `useSearch`, Worker のインフラが複数タスク分配に対応済みであること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|----------|----------|
| `src/services/search-tasks.ts` | 新規作成 | WASM タスク生成関数のラッパー |
| `src/test/integration/workers/searcher.test.ts` | 修正 | WASM 直接テスト移動 + 整理 |
| `src/test/integration/wasm-binding.test.ts` | 修正 | 分割ロジックテスト追加 |
| `src/test/integration/services/search-tasks.test.ts` | 新規作成 | search-tasks.ts の統合テスト |

## 3. 設計方針

- 各関数は WASM の `generate_*` を呼び出し、返されたパラメータ配列を `SearchTask[]` にマッピングする
- `services/` 配下に置き、`features/` → `services/` の依存方向を維持
- class は使わず関数として実装（コーディング規約: 関数型プログラミング推奨）
- WASM 型は `@wasm` から直接 import
- WASM 初期化済みのコンテキストで呼ばれる前提（初期化責務は持たない）

## 4. 実装仕様

### 4.1 `src/services/search-tasks.ts`

```typescript
import {
  generate_mtseed_iv_search_tasks,
  generate_mtseed_search_tasks,
  generate_egg_search_tasks,
  generate_trainer_info_search_tasks,
} from '../wasm/wasm_pkg.js';
import type { SearchTask } from '../workers/types';

/**
 * MT Seed IV 検索タスクを生成
 */
export function createMtseedIvSearchTasks(
  baseParams: MtseedSearchParams,
  workerCount: number,
): MtseedSearchTask[] {
  const paramsList = generate_mtseed_iv_search_tasks(baseParams, workerCount);
  return paramsList.map((params) => ({ kind: 'mtseed' as const, params }));
}

/**
 * MT Seed 起動時刻検索タスクを生成
 */
export function createMtseedDatetimeSearchTasks(
  context: DatetimeSearchContext,
  targetSeeds: MtSeed[],
  workerCount: number,
): MtseedDatetimeSearchTask[] {
  const paramsList = generate_mtseed_search_tasks(context, targetSeeds, workerCount);
  return paramsList.map((params) => ({ kind: 'mtseed-datetime' as const, params }));
}

/**
 * 卵検索タスクを生成
 */
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

/**
 * トレーナー情報検索タスクを生成
 */
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

### 4.2 WASM メインスレッド初期化

`search-tasks.ts` の関数は WASM 関数を直接呼ぶため、メインスレッドで WASM が初期化済みである必要がある。
仕様書 (`worker-design.md` セクション 2.3) に「`generate_*_search_tasks` はメインスレッドで実行」と明記されている。
`search-tasks.ts` は「WASM 初期化済みのコンテキストで呼ばれる」前提で実装する（初期化責務は持たない）。

## 5. テスト方針

### 5.1 テスト整理

| テスト | 移動先 | 理由 |
|--------|--------|------|
| `should split search range correctly` | `wasm-binding.test.ts` | WASM バインディングテスト |
| `should find results in parallel` | `searcher.test.ts`（残留） | Worker 並列実行テスト |

- `MtseedSearcher` describe の `beforeAll(init())` を削除し、並列テスト内のローカル初期化に移行

### 5.2 統合テスト

`src/test/integration/services/search-tasks.test.ts`:
- WASM を初期化して `createMtseedIvSearchTasks` を呼び出し、正しいタスク配列が返ることを検証
- 他の `create*SearchTasks` 関数も同様にテスト
- 結果を `runSearchInWorker` に渡して Worker 経由で実行可能なことを確認

## 6. 実装チェックリスト

- [ ] `src/services/search-tasks.ts` 新規作成
- [ ] `searcher.test.ts` から WASM 直接テストを `wasm-binding.test.ts` へ移動
- [ ] `searcher.test.ts` の `beforeAll(init())` 整理
- [ ] `src/test/integration/services/search-tasks.test.ts` 新規作成
- [ ] 全テスト通過確認
