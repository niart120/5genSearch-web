# 個体生成並列化 仕様書

## 1. 概要

### 1.1 目的

`pokemon-list` および `egg-list` の個体生成処理を複数 Worker に分散し、大量 Seed 時の生成速度を改善する。また、検索系機能と同様の進捗表示・キャンセル機能を追加する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| 個体生成 | `SeedOrigin[]` と生成パラメータから `GeneratedPokemonData[]` / `GeneratedEggData[]` を計算する処理 |
| origins 分割 | `SeedOrigin[]` を Worker 数に応じたチャンクに分割し、各 Worker に部分配列を渡す方式 |
| バッチループ | Worker 内で小チャンク単位に WASM API を繰り返し呼び出し、進捗報告・キャンセルチェックを挟む方式 |

### 1.3 背景・問題

現状の個体生成は以下の制約を持つ:

- **単一 Worker 実行**: `createPokemonListTask` / `createEggListTask` は単一タスクを生成し、1 Worker で全 origins を同期処理する
- **進捗報告なし**: Worker 内で `generate_pokemon_list` / `generate_egg_list` を一括呼び出しし、中間進捗を返さない
- **キャンセル不可**: 同期一括実行のため、処理開始後にキャンセルできない

大量の `SeedOrigin` (数百件以上) を処理する場合、これらの制約により UI がブロック感を与える。

### 1.4 期待効果

| 指標 | 現状 | 改善後 |
|------|------|--------|
| Worker 利用数 | 1 | `navigator.hardwareConcurrency` (通常 4-16) |
| 進捗表示 | なし | 進捗バー + 推定残り時間 |
| キャンセル | 不可 | Worker 間停止対応 |

### 1.5 着手条件

- 既存の検索系並列化基盤 (`WorkerPool`, `ProgressAggregator`, `runSearchLoop`) が安定動作していること
- `pokemon-list` / `egg-list` Feature Store の結果差分同期パターンが確立済みであること (現在実装済み)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|--------|---------|---------|
| `src/services/search-tasks.ts` | 変更 | 複数タスク生成関数の追加 |
| `src/workers/search.worker.ts` | 変更 | 生成系のバッチループ化 |
| `src/workers/types.ts` | 変更 | 生成タスク型にチャンク情報を追加 |
| `src/features/pokemon-list/hooks/use-pokemon-list.ts` | 変更 | 複数タスク生成・開始に対応 |
| `src/features/egg-list/hooks/use-egg-list.ts` | 変更 | 複数タスク生成・開始に対応 |
| `src/test/unit/search-tasks.test.ts` | 新規 | タスク分割ロジックのユニットテスト |
| `src/test/integration/generation-parallel.test.ts` | 新規 | Worker 分散実行の統合テスト |

## 3. 設計方針

### 3.1 全体アプローチ

Rust/WASM 側は変更せず、TS 側のみで並列化を実現する。既存の並列化基盤を最大限再利用し、新規コードをタスク分割とアダプタに限定する。

| レイヤー | 既存基盤 | 本仕様で追加するもの |
|---------|---------|-------------------|
| タスク分割 | — | `splitOrigins`, `createPokemonListTasks`, `createEggListTasks` |
| Worker 配布・進捗集約 | `WorkerPool`, `ProgressAggregator` | 変更なし (そのまま利用) |
| Worker 内バッチループ | `runSearchLoop` (cancel / progress / yield 内蔵) | `OriginChunkIterator` アダプタのみ |
| Hook → UI | `useSearch`, `flattenBatchResults`, Store 差分同期 | `workerCount` 公開のみ |

1. **タスク分割層** (`search-tasks.ts`): `SeedOrigin[]` を `workerCount` 個に分割し、`PokemonListTask[]` / `EggListTask[]` を生成
2. **Worker 内バッチループ** (`search.worker.ts`): 既存 `runSearchLoop` に `OriginChunkIterator` アダプタを渡す。cancel / progress / yield は `runSearchLoop` に委譲
3. **Hook 層** (`use-pokemon-list.ts` / `use-egg-list.ts`): 複数タスクを `start(tasks)` で開始

```
origins (N件)
    │
    ├─ search-tasks.ts: N/workerCount ずつ分割 → Task[]
    │
    ├─ WorkerPool: 各 Worker にタスクを配布
    │
    └─ Worker 内: チャンク単位で generate_*_list() 呼び出し
        ├─ progress 報告
        ├─ cancel チェック
        └─ yieldToMain()
```

### 3.2 タスク分割

`SeedOrigin[]` を `workerCount` 個に均等分割する。端数は先頭チャンクに寄せる。

```typescript
function splitOrigins(origins: SeedOrigin[], workerCount: number): SeedOrigin[][] {
  const chunkSize = Math.ceil(origins.length / workerCount);
  const chunks: SeedOrigin[][] = [];
  for (let i = 0; i < origins.length; i += chunkSize) {
    chunks.push(origins.slice(i, i + chunkSize));
  }
  return chunks;
}
```

### 3.3 Worker 内バッチループ — `runSearchLoop` の再利用

既存の `runSearchLoop` は、`{ is_done: boolean; free(): void }` インターフェースを満たすオブジェクトに対してキャンセルチェック・進捗スロットリング・`yieldToMain()` を提供する汎用ループである。

個体生成でもこのループを再利用する。`generate_pokemon_list` / `generate_egg_list` は stateless な一括呼び出しだが、origins をチャンク単位で逐次処理するアダプタオブジェクトを作成し `runSearchLoop` に渡す。

**配置**: `OriginChunkIterator` は `search.worker.ts` 内にファイルローカルで定義する。`runSearchLoop` 自体が同ファイル内のプライベート関数であり、Worker 外から参照する必要がないため。

```typescript
const BATCH_SIZE = {
  // ...既存...
  /** 個体生成: origin 数ベース (~数ms/origin, 50 origins/batch) */
  generation: 50,
} as const;

/**
 * origins チャンク反復アダプタ
 *
 * runSearchLoop が要求する { is_done, free() } インターフェースを満たし、
 * origins 配列をチャンク単位で消費する。
 */
class OriginChunkIterator {
  private offset = 0;
  constructor(private readonly origins: SeedOrigin[]) {}

  get is_done(): boolean {
    return this.offset >= this.origins.length;
  }

  /** 次のチャンクを切り出し、offset を進める */
  nextChunk(batchSize: number): SeedOrigin[] {
    const chunk = this.origins.slice(this.offset, this.offset + batchSize);
    this.offset += chunk.length;
    return chunk;
  }

  get processed(): number {
    return this.offset;
  }

  get total(): number {
    return this.origins.length;
  }

  free(): void {
    // stateless — 解放不要
  }
}
```

使用側は検索系と同じ `runSearchLoop` + `processBatch` コールバックのパターンに乗る:

```typescript
async function runPokemonListGeneration(taskId: string, task: PokemonListTask): Promise<void> {
  const iter = new OriginChunkIterator(task.origins);
  const startTime = performance.now();

  await runSearchLoop(taskId, iter, startTime, (it) => {
    const chunk = it.nextChunk(BATCH_SIZE.generation);
    const results = generate_pokemon_list(chunk, task.params, task.config, task.filter);
    if (results.length > 0) {
      postResponse({ type: 'result', taskId, resultType: 'pokemon-list', results });
    }
    return { processed: it.processed, total: it.total };
  });
}
```

`runEggList` も同一パターン (`generate_egg_list` に差し替え)。

これにより、キャンセル・進捗スロットリング・yield のロジックを一切複製せず、既存の `runSearchLoop` にそのまま委譲できる。

### 3.4 結果順序

Worker からの結果は到着順で結合する。元順序の保証は行わない。既存の差分同期パターン (`flattenBatchResults` + Store `appendResults`) はそのまま利用可能。

### 3.5 少量 origins 時の最適化

origins 数が少ない場合 (例: 1件)、分割オーバーヘッドが無意味になる。タスク生成関数で origins 数が `workerCount` 以下の場合は単一タスクにフォールバックする。

```typescript
export function createPokemonListTasks(
  origins: SeedOrigin[],
  params: PokemonGenerationParams,
  config: GenerationConfig,
  filter: PokemonFilter | undefined,
  workerCount: number
): PokemonListTask[] {
  if (origins.length <= workerCount) {
    // 分割不要: 単一タスク
    return [{ kind: 'pokemon-list', origins, params, config, filter }];
  }

  return splitOrigins(origins, workerCount).map((chunk) => ({
    kind: 'pokemon-list' as const,
    origins: chunk,
    params,
    config,
    filter,
  }));
}
```

## 4. 実装仕様

### 4.1 search-tasks.ts: 新規タスク生成関数

既存の `createPokemonListTask` / `createEggListTask` (単数形) は互換性のため残し、複数形の関数を追加する。

```typescript
/**
 * ポケモンリスト生成タスクを生成 (並列)
 *
 * origins を workerCount 個に分割し、複数タスクを返す。
 */
export function createPokemonListTasks(
  origins: SeedOrigin[],
  params: PokemonGenerationParams,
  config: GenerationConfig,
  filter: PokemonFilter | undefined,
  workerCount: number
): PokemonListTask[] { /* ... */ }

/**
 * タマゴリスト生成タスクを生成 (並列)
 */
export function createEggListTasks(
  origins: SeedOrigin[],
  params: EggGenerationParams,
  config: GenerationConfig,
  filter: EggFilter | undefined,
  workerCount: number
): EggListTask[] { /* ... */ }

/**
 * SeedOrigin 配列を指定数に均等分割する
 */
function splitOrigins(origins: SeedOrigin[], count: number): SeedOrigin[][] { /* ... */ }
```

### 4.2 search.worker.ts: `runSearchLoop` アダプタ化

`runPokemonListGeneration` / `runEggList` を同期一括呼び出しから `runSearchLoop` + `OriginChunkIterator` パターンに変更する。

変更前:

```typescript
function runPokemonListGeneration(taskId: string, task: PokemonListTask): void {
  const results = generate_pokemon_list(task.origins, task.params, task.config, task.filter);
  postResponse({ type: 'result', taskId, resultType: 'pokemon-list', results });
  postResponse({ type: 'done', taskId });
}
```

変更後:

```typescript
async function runPokemonListGeneration(taskId: string, task: PokemonListTask): Promise<void> {
  const iter = new OriginChunkIterator(task.origins);
  const startTime = performance.now();
  await runSearchLoop(taskId, iter, startTime, (it) => {
    const chunk = it.nextChunk(BATCH_SIZE.generation);
    const results = generate_pokemon_list(chunk, task.params, task.config, task.filter);
    if (results.length > 0) {
      postResponse({ type: 'result', taskId, resultType: 'pokemon-list', results });
    }
    return { processed: it.processed, total: it.total };
  });
}
```

追加:

- `OriginChunkIterator` クラス (3.3 節参照)
- `BATCH_SIZE` オブジェクトに `generation` キー

### 4.3 use-pokemon-list.ts / use-egg-list.ts: 複数タスク対応

```typescript
// 変更前
const task = createPokemonListTask(origins, params, genConfig, filter);
start([task]);

// 変更後
const tasks = createPokemonListTasks(origins, params, genConfig, filter, poolSize);
start(tasks);
```

Hook から `WorkerPool.size` を参照するため、`useSearch` の戻り値に `workerCount` を追加する。

### 4.4 useSearch: workerCount の公開

```typescript
export interface UseSearchResult {
  // ...既存...
  /** Worker 数 */
  workerCount: number;
}
```

`WorkerPool.size` を `useSearch` 内で state として管理し、初期化完了時に設定する。

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/search-tasks.test.ts`)

| テストケース | 検証内容 |
|------------|---------|
| `splitOrigins: 均等分割` | 10 origins / 4 workers → [3, 3, 2, 2] |
| `splitOrigins: origins < workers` | 2 origins / 8 workers → [2] (単一チャンク) |
| `splitOrigins: 空配列` | 0 origins → [] |
| `createPokemonListTasks: 分割` | origins.length > workerCount で複数タスク生成 |
| `createPokemonListTasks: フォールバック` | origins.length <= workerCount で単一タスク |
| `createEggListTasks: 同上` | 上記と同一パターン |

### 5.2 統合テスト (`src/test/integration/generation-parallel.test.ts`)

| テストケース | 検証内容 |
|------------|---------|
| `pokemon-list: 並列生成` | 複数タスクを WorkerPool に投入し、結果が全件揃うこと |
| `pokemon-list: キャンセル` | 生成中にキャンセルし、処理が停止すること |
| `egg-list: 並列生成` | 上記と同一パターン (egg) |
| `進捗報告` | 生成中に progress イベントが到達すること |

## 6. 実装チェックリスト

- [ ] `splitOrigins` ユーティリティ関数の実装
- [ ] `createPokemonListTasks` の実装
- [ ] `createEggListTasks` の実装
- [ ] `search.worker.ts`: `OriginChunkIterator` アダプタクラスの実装
- [ ] `search.worker.ts`: `runPokemonListGeneration` を `runSearchLoop` + アダプタに変更
- [ ] `search.worker.ts`: `runEggList` を `runSearchLoop` + アダプタに変更
- [ ] `search.worker.ts`: `BATCH_SIZE.generation` の追加
- [ ] `useSearch`: `workerCount` の公開
- [ ] `use-pokemon-list.ts`: 複数タスク生成に対応
- [ ] `use-egg-list.ts`: 複数タスク生成に対応
- [ ] ユニットテスト: `splitOrigins` / タスク生成
- [ ] 統合テスト: 並列生成 / キャンセル / 進捗
- [ ] 手動検証: 大量 Seed での体感速度確認
