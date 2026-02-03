# Worker 設計

Web Worker による並列処理の設計を定義する。

## 1. 設計目標

1. **CPU コア活用**: 利用可能な全コアを使用
2. **GPU 経路対応**: WebGPU 利用可能時は GPU Worker で処理
3. **進捗表示**: 一貫した進捗 UI (割合/件数/残り時間/スループット)
4. **キャンセル対応**: ユーザー操作による中断
5. **WASM 独立インスタンス**: 各 Worker で独立した WASM を初期化

## 2. アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                       Main Thread                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   UI/React  │  │   Stores    │  │   WorkerPool        │  │
│  │             │←─│             │←─│   - spawn workers   │  │
│  │             │  │ - progress  │  │   - dispatch tasks  │  │
│  │             │  │ - results   │  │   - collect results │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
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
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 2.1 CPU/GPU 経路の選択

| 条件 | 使用 Worker |
|-----|------------|
| WebGPU 利用可能 + ユーザー選択 GPU | `gpu.worker.ts` (単一) |
| それ以外 | `search.worker.ts` × N (並列) |

GPU Worker は単一インスタンスで動作 (GPU リソースの排他制御のため)。

## 3. Worker 数決定

```typescript
const workerCount = navigator.hardwareConcurrency ?? 4;
```

- `navigator.hardwareConcurrency` で論理コア数を取得
- 取得不可の場合はフォールバック (4)
- 上限は設けない (モジュール共有によりメモリ効率を確保)

## 4. WASM モジュール共有

### 4.1 背景

各 Worker で独立に WASM をコンパイルすると、コンパイル済みコードがメモリ上で重複する。
32 Worker の場合、数十 MB の無駄が発生する可能性がある。

### 4.2 解決策

`WebAssembly.Module` をメインスレッドで1回だけコンパイルし、各 Worker に転送する：

```typescript
// Main Thread (services/worker-pool.ts)
async function createWorkerPool(): Promise<WorkerPool> {
  // 1. WASM モジュールを1回だけコンパイル
  const wasmBytes = await fetch('/wasm_pkg_bg.wasm').then(r => r.arrayBuffer());
  const module = await WebAssembly.compile(wasmBytes);

  // 2. Worker を生成し、コンパイル済みモジュールを転送
  const workers = Array.from({ length: workerCount }, () => {
    const worker = new Worker(new URL('./search.worker.ts', import.meta.url));
    worker.postMessage({ type: 'init', module });
    return worker;
  });

  // ...
}
```

```typescript
// Worker 内部 (workers/search.worker.ts)
let wasmExports: WasmExports;

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  if (e.data.type === 'init') {
    // コンパイル済みモジュールからインスタンス化 (高速)
    const instance = await WebAssembly.instantiate(e.data.module, imports);
    wasmExports = instance.exports as WasmExports;
    postMessage({ type: 'ready' });
  }
  // ...
};
```

### 4.3 メモリ効率

| 項目 | モジュール共有なし | モジュール共有あり |
|-----|------------------|------------------|
| コンパイル済みコード | ~3 MB × N | ~3 MB (共有) |
| インスタンスメモリ | ~2 MB × N | ~2 MB × N |
| 32 Worker 合計 | ~160 MB | ~67 MB |

`WebAssembly.Module` は Structured Clone 対応のため、`postMessage` で効率的に転送される。

## 5. メッセージプロトコル

### 5.1 メッセージ型定義

```typescript
// Main → Worker
type WorkerRequest =
  | { type: 'init'; module: WebAssembly.Module }
  | { type: 'start'; taskId: string; task: SearchTask }
  | { type: 'cancel' };

// Worker → Main
type WorkerResponse =
  | { type: 'ready' }
  | { type: 'progress'; taskId: string; progress: ProgressInfo }
  | { type: 'result'; taskId: string; results: SearchResult[] }
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

### 5.2 タスク型

```typescript
type SearchTask =
  | { kind: 'egg-datetime'; params: EggDatetimeSearchParams }
  | { kind: 'mtseed-datetime'; params: MtseedDatetimeSearchParams }
  | { kind: 'mtseed'; params: MtseedSearchParams }
  | { kind: 'trainer-info'; params: TrainerInfoSearchParams };
```

## 6. WorkerPool 実装

### 6.1 責務

- Worker の生成・破棄
- タスクのディスパッチ
- 進捗の集約
- 結果の収集
- キャンセル制御

### 6.2 インターフェース

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

## 7. Worker 内部実装

### 7.1 ライフサイクル

```
[Created] → init → [Ready] → start → [Running] → done → [Ready]
                                   ↓
                               cancel → [Ready]
```

### 7.2 バッチ処理

```typescript
// Worker 内部
async function runSearch(task: SearchTask) {
  const searcher = createSearcher(task);
  const results: SearchResult[] = [];
  
  while (!searcher.is_done && !cancelled) {
    const batch = searcher.next_batch(BATCH_SIZE);
    
    // 結果を蓄積 (完了時に一括送信)
    results.push(...batch.results);
    
    // 進捗報告
    postMessage({
      type: 'progress',
      taskId,
      progress: calculateProgress(batch, startTime),
    });
    
    // UI スレッドへ制御を戻す
    await yieldToMain();
  }
  
  // 完了 or キャンセル時に結果を一括送信
  postMessage({ type: 'result', taskId, results });
  postMessage({ type: 'done', taskId });
}
```

### 7.3 バッチサイズ

| 検索種別 | バッチサイズ | 備考 |
|---------|-------------|------|
| `EggDatetimeSearcher` | 1000 | 日時ごとの探索 |
| `MtseedDatetimeSearcher` | 1000 | 日時ごとの探索 |
| `MtseedSearcher` | 0x10000 | Seed 空間探索 |
| `TrainerInfoSearcher` | 1000 | 日時ごとの探索 |

## 8. タスク分割

WASM 側で提供される `generate_*_search_tasks()` 関数を使用：

```typescript
import { generate_egg_search_tasks } from '@wasm';

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

## 9. 進捗表示仕様

### 9.1 表示項目

| 項目 | 表示例 | 計算方法 |
|-----|-------|---------|
| 進捗率 | `45.2%` | `(totalProcessed / totalCount) * 100` |
| 処理済み | `1,234,567 / 2,500,000` | 集約値 |
| 経過時間 | `00:01:23` | `Date.now() - startTime` |
| 残り時間 | `約 00:01:45` | `(total - processed) / throughput` |
| スループット | `18,500 件/秒` | `processed / elapsedSec` |

### 9.2 更新頻度

- 進捗報告: バッチ処理ごと
- UI 更新: 最大 10 回/秒 (100ms throttle)

## 10. キャンセル処理

### 10.1 フロー

1. ユーザーがキャンセルボタン押下
2. `WorkerPool.cancel()` 呼び出し
3. 各 Worker に `{ type: 'cancel' }` 送信
4. Worker は次のバッチ処理前にフラグをチェック
5. キャンセル時は途中結果を送信してループ終了

### 10.2 注意点

- WASM 処理中は即時停止不可 (バッチ単位)
- キャンセル後も途中結果は保持・表示

## 11. エラー処理

### 11.1 方針

- リトライは行わない
- エラー発生時は即座に失敗通知
- 途中結果があれば表示

### 11.2 フロー

1. Worker 内でエラー発生 (WASM パニック等)
2. `{ type: 'error', taskId, message }` を送信
3. WorkerPool は他の Worker をキャンセル
4. `onError` コールバックを呼び出し
5. 途中結果を `onResult` で通知

## 12. 初期化タイミング

### 12.1 方針

**事前初期化**を採用：

- アプリ起動時に WorkerPool を生成
- WASM モジュールをコンパイルし、全 Worker に配布
- 全 Worker が `ready` を返すまで待機

### 12.2 理由

- 検索開始時のレイテンシを最小化
- ユーザーは設定入力後すぐに検索を期待する
- 初期化コスト (~数秒) はアプリ起動時に吸収
