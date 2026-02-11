# Worker 設計

Web Worker による並列処理の設計を定義する。

## 1. 設計目標

1. **CPU コア活用**: 利用可能な全コアを使用
2. **GPU 経路対応**: WebGPU 利用可能時は GPU Worker で処理
3. **進捗表示**: 一貫した進捗 UI (割合/件数/残り時間/スループット)
4. **キャンセル対応**: ユーザー操作による中断
5. **WASM 独立インスタンス**: 各 Worker で独立した WASM を初期化

## 2. WASM 実行モデル

### 2.1 Module と Instance

```
┌─────────────────┐      compile       ┌─────────────────┐
│  .wasm バイナリ  │  ───────────────►  │ WebAssembly.Module │
│   (静的ファイル)  │                    │  (コンパイル済み)   │
└─────────────────┘                    └─────────────────┘
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
                 ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
                 │  Instance   │      │  Instance   │      │  Instance   │
                 │  (Main)     │      │  (Worker 1) │      │  (Worker N) │
                 └─────────────┘      └─────────────┘      └─────────────┘
```

- **Module**: コンパイル済みコード (共有可能、ステートレス)
- **Instance**: 実行環境 (メモリ空間を持つ、ステートフル)

WASM の Memory はスレッドセーフではないため、Worker ごとに独立した Instance が必要。

### 2.2 wasm-bindgen の初期化関数

| 関数 | 入力 | 処理 | 用途 |
|-----|------|------|------|
| `default` (async) | `URL`, `Response`, `BufferSource`, `WebAssembly.Module` | fetch + compile + instantiate | メインスレッド/GPU Worker |
| `initSync` | `BufferSource`, `WebAssembly.Module` | compile + instantiate (同期) | CPU Worker |

wasm-bindgen 生成コードはモジュールスコープに Instance を保持するため、
`default()` / `initSync()` を1回呼べば以降の関数呼び出しは追加コストなし。

**注意**: `initSync` は wasm-bindgen が生成する内部インポート (`__wbg_get_imports()`) を自動的に使用する。
外部から `imports` を注入することはできない。

### 2.3 実行場所の使い分け

| 関数 | 実行場所 | 理由 |
|-----|---------|------|
| `search_needle_pattern` | メインスレッド | 軽量・同期的 |
| `resolve_pokemon_data_batch` | メインスレッド | 軽量・同期的 |
| `resolve_egg_data_batch` | メインスレッド | 軽量・同期的 |
| `resolve_seeds` | メインスレッド | 軽量・同期的 |
| `get_needle_pattern_at` | メインスレッド | 軽量・同期的 |
| `generate_*_search_tasks` | メインスレッド | タスク生成のみ |
| `EggDatetimeSearcher` | Worker | 重い計算 |
| `MtseedDatetimeSearcher` | Worker | 重い計算 |
| `MtseedSearcher` | Worker | 重い計算 |
| `TrainerInfoSearcher` | Worker | 重い計算 |
| `generate_pokemon_list` | Worker | 大量 Seed × advance 時の blocking 回避 |

**原則**: Searcher クラスは Worker、それ以外はメインスレッド。
`generate_pokemon_list` は Searcher ではないが、入力規模により数百 ms かかる可能性があるため例外的に Worker で実行する。

## 3. アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                       Main Thread                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   UI/React  │  │   Stores    │  │   WorkerPool        │  │
│  │             │←─│             │←─│   - spawn workers   │  │
│  │             │  │ - progress  │  │   - dispatch tasks  │  │
│  │             │  │ - results   │  │   - collect results │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  WASM Instance (Main)                                    ││
│  │  - search_needle_pattern, resolve_*, generate_*_tasks   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ CPU Worker #1   │ │ CPU Worker #N   │ │   GPU Worker    │
│  ┌───────────┐  │ │  ┌───────────┐  │ │  ┌───────────┐  │
│  │   WASM    │  │ │  │   WASM    │  │ │  │   WASM    │  │
│  │  (SIMD)   │  │ │  │  (SIMD)   │  │ │  │  (wgpu)   │  │
│  └───────────┘  │ │  └───────────┘  │ │  └───────────┘  │
│  Searcher 実行  │ │  Searcher 実行  │ │  Searcher 実行  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 3.1 CPU/GPU 経路の選択

| 条件 | 使用 Worker |
|-----|------------|
| WebGPU 利用可能 + ユーザー選択 GPU | `gpu.worker.ts` (単一) |
| それ以外 | `search.worker.ts` × N (並列) |

GPU Worker は単一インスタンスで動作 (GPU リソースの排他制御のため)。

## 4. Worker 数決定

```typescript
const workerCount = navigator.hardwareConcurrency ?? 4;
```

- `navigator.hardwareConcurrency` で論理コア数を取得
- 取得不可の場合はフォールバック (4)
- 上限は設けない (モジュール共有によりメモリ効率を確保)

## 5. WASM 初期化戦略

### 5.1 採用方式: Worker 独自初期化

各 Worker が独立して WASM を fetch/初期化する方式を採用。

```typescript
// Worker 内部 (workers/search.worker.ts)
import initWasm from '../wasm/wasm_pkg.js';

// WASM バイナリの絶対パス (public/wasm/ から配信)
const WASM_URL = '/wasm/wasm_pkg_bg.wasm';

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  if (e.data.type === 'init') {
    // Worker が独自に WASM を fetch/初期化
    await initWasm(WASM_URL);
    postMessage({ type: 'ready' });
  }
  // ...
};
```

**利点**:
- Worker のコードがシンプル
- Vite のビルド時最適化が効く
- ArrayBuffer の複製・転送が不要

**Vite 環境での注意点**:
- Worker 作成時は `new URL('./worker.ts', import.meta.url)` でパスを解決
- `{ type: 'module' }` オプションで ES Module Worker として動作
- Vite がビルド時に Worker を自動バンドル

### 5.2 初期化フロー

```
┌─────────────────┐                    ┌─────────────────┐
│   WorkerPool    │                    │     Worker      │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │  { type: 'init' }                    │
         ├──────────────────────────────────────►
         │                                      │
         │                          fetch(wasmUrl)
         │                          initWasm()
         │                                      │
         │  { type: 'ready' }                   │
         ◄──────────────────────────────────────┤
         │                                      │
```

## 6. メッセージプロトコル

### 6.1 メッセージ型定義

```typescript
// Main → Worker
type WorkerRequest =
  | { type: 'init' }  // Worker が独自に WASM を fetch/初期化
  | { type: 'start'; taskId: string; task: SearchTask }
  | { type: 'cancel' };

// Worker → Main (結果タイプ別)
type WorkerResponse =
  | { type: 'ready' }
  | { type: 'progress'; taskId: string; progress: ProgressInfo }
  | { type: 'result'; taskId: string; resultType: 'seed-origin'; results: SeedOrigin[] }
  | { type: 'result'; taskId: string; resultType: 'mtseed'; results: MtseedResult[] }
  | { type: 'result'; taskId: string; resultType: 'egg'; results: EggDatetimeSearchResult[] }
  | { type: 'result'; taskId: string; resultType: 'trainer-info'; results: TrainerInfoSearchResult[] }
  | { type: 'result'; taskId: string; resultType: 'pokemon-list'; results: GeneratedPokemonData[] }
  | { type: 'done'; taskId: string }
  | { type: 'error'; taskId: string; message: string };

interface ProgressInfo {
  processed: number;
  total: number;
  percentage: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
  throughput: number;  // items/sec
}
```

### 6.2 タスク型

```typescript
type SearchTask =
  | { kind: 'egg-datetime'; params: EggDatetimeSearchParams }
  | { kind: 'mtseed-datetime'; params: MtseedDatetimeSearchParams }
  | { kind: 'gpu-mtseed'; context: DatetimeSearchContext; targetSeeds: MtSeed[] }
  | { kind: 'mtseed'; params: MtseedSearchParams }
  | { kind: 'trainer-info'; params: TrainerInfoSearchParams }
  | { kind: 'pokemon-list'; origins: SeedOrigin[]; params: PokemonGenerationParams; config: GenerationConfig; filter: PokemonFilter | undefined };
```

## 7. WorkerPool 実装

### 7.1 責務

- Worker の生成・破棄
- タスクのディスパッチ
- 進捗の集約
- 結果の収集
- キャンセル制御

### 7.2 インターフェース

```typescript
interface WorkerPool {
  /** Worker 数 */
  readonly size: number;

  /** 検索を開始 */
  start(tasks: SearchTask[]): void;

  /** 検索をキャンセル */
  cancel(): void;

  /** 進捗を購読 */
  onProgress(callback: (progress: AggregatedProgress) => void): () => void;

  /** 結果を購読 (完了時に一括通知) */
  onResult(callback: (results: SearchResult[]) => void): () => void;

  /** 完了を購読 */
  onComplete(callback: () => void): () => void;

  /** エラーを購読 */
  onError(callback: (error: Error) => void): () => void;

  /** リソース解放 */
  dispose(): void;
}

interface AggregatedProgress {
  /** 全タスクの処理済み件数 */
  totalProcessed: number;
  /** 全タスクの総件数 */
  totalCount: number;
  /** 全体進捗率 (0-100) */
  percentage: number;
  /** 経過時間 (ms) */
  elapsedMs: number;
  /** 残り時間推定 (ms) */
  estimatedRemainingMs: number;
  /** スループット (items/sec) */
  throughput: number;
  /** 完了タスク数 / 総タスク数 */
  tasksCompleted: number;
  tasksTotal: number;
}
```

## 8. Worker 内部実装

### 8.1 ライフサイクル

```
[Created] → init → [Ready] → start → [Running] → done → [Ready]
                                   ↓
                               cancel → [Ready]
```

### 8.2 バッチ処理

```typescript
// Worker 内部
import initWasm, { EggDatetimeSearcher, MtseedSearcher } from '../wasm/wasm_pkg.js';
import type { SearchTask } from './types';

async function handleInit(): Promise<void> {
  await initWasm('/wasm/wasm_pkg_bg.wasm');
  postMessage({ type: 'ready' });
}

async function runSearch(taskId: string, task: SearchTask) {
  const startTime = performance.now();
  const searcher = createSearcher(task);
  
  while (!searcher.is_done && !cancelled) {
    const batch = searcher.next_batch(getBatchSize(task.kind));
    
    // 中間結果を即時送信
    if (batch.results.length > 0) {
      postMessage({
        type: 'result',
        taskId,
        resultType: getResultType(task.kind),
        results: batch.results,
      });
    }
    
    // 進捗報告
    postMessage({
      type: 'progress',
      taskId,
      progress: calculateProgress(batch, startTime),
    });
    
    // UI スレッドへ制御を戻す
    await yieldToMain();
  }
  
  postMessage({ type: 'done', taskId });
  searcher.free(); // WASM リソース解放
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
```

### 8.3 バッチサイズ

| 検索種別 | バッチサイズ | 備考 |
|---------|-------------|------|
| `EggDatetimeSearcher` | 1000 | 日時ごとの探索 |
| `MtseedDatetimeSearcher` | 1000 | 日時ごとの探索 |
| `MtseedSearcher` | 0x10000 | Seed 空間探索 |
| `TrainerInfoSearcher` | 1000 | 日時ごとの探索 |

## 9. タスク分割

WASM 側で提供される `generate_*_search_tasks()` 関数を使用：

```typescript
import { generate_egg_search_tasks } from '../wasm/wasm_pkg.js';

const tasks = generate_egg_search_tasks(
  context,
  dateRange,
  eggParams,
  genConfig,
  filter,
  workerCount,
);
```

- 組み合わせ × 時間チャンクでタスクを生成
- Worker 数を考慮した分割

## 10. 進捗表示仕様

### 10.1 表示項目

| 項目 | 表示例 | 計算方法 |
|-----|-------|---------|
| 進捗率 | `45.2%` | `(totalProcessed / totalCount) * 100` |
| 処理済み | `1,234,567 / 2,500,000` | 集約値 |
| 経過時間 | `00:01:23` | `Date.now() - startTime` |
| 残り時間 | `約 00:01:45` | `(total - processed) / throughput` |
| スループット | `18,500 件/秒` | `processed / elapsedSec` |

### 10.2 更新頻度

- 進捗報告: バッチ処理ごと
- UI 更新: 最大 10 回/秒 (100ms throttle)

## 11. キャンセル処理

### 11.1 フロー

1. ユーザーがキャンセルボタン押下
2. `WorkerPool.cancel()` 呼び出し
3. 各 Worker に `{ type: 'cancel' }` 送信
4. Worker は次のバッチ処理前にフラグをチェック
5. キャンセル時は途中結果を送信してループ終了

### 11.2 注意点

- WASM 処理中は即時停止不可 (バッチ単位)
- キャンセル後も途中結果は保持・表示

## 12. エラー処理

### 12.1 方針

- リトライは行わない
- エラー発生時は即座に失敗通知
- 途中結果があれば表示

### 12.2 フロー

1. Worker 内でエラー発生 (WASM パニック等)
2. `{ type: 'error', taskId, message }` を送信
3. WorkerPool は他の Worker をキャンセル
4. `onError` コールバックを呼び出し
5. 途中結果を `onResult` で通知

## 13. 初期化タイミング

### 13.1 方針

**事前初期化**を採用：

- アプリ起動時に WorkerPool を生成
- WASM モジュールをコンパイルし、全 Worker に配布
- 全 Worker が `ready` を返すまで待機

### 13.2 理由

- 検索開始時のレイテンシを最小化
- ユーザーは設定入力後すぐに検索を期待する
- 初期化コスト (~数秒) はアプリ起動時に吸収
