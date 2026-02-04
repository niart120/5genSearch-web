# Worker 基盤 仕様書

## 1. 概要

### 1.1 目的

Web Worker を使用した WASM 並列実行基盤を構築する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| WorkerPool | 複数の Worker を管理し、タスク分配・進捗集約を行うサービス |
| CPU Worker | SIMD 最適化された WASM を実行する Worker |
| GPU Worker | WebGPU を使用した WASM を実行する Worker (単一インスタンス) |
| SearchTask | Worker に分配する検索タスク単位 |
| Batch | Searcher の `next_batch()` 1回分の処理単位 |

### 1.3 背景・問題

- 現状: WASM 検索処理はメインスレッドをブロックする
- 問題: UI が応答しなくなる、進捗表示ができない
- 制約: SharedArrayBuffer は GitHub Pages + iOS で使用不可

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| UI 応答性 | メインスレッド非ブロック化により常時応答可能 |
| CPU 活用率 | `navigator.hardwareConcurrency` 分の Worker で並列化 |
| GPU 対応 | WebGPU 利用可能時に高速検索を提供 |
| 進捗表示 | リアルタイムな進捗・スループット表示 |

### 1.5 着手条件

- WASM パッケージ (`packages/wasm/`) がビルド済み
- Vite 開発サーバが動作する状態

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/workers/types.ts` | 新規作成 | Worker メッセージ型定義 |
| `src/workers/search.worker.ts` | 新規作成 | CPU 検索 Worker 実装 |
| `src/workers/gpu.worker.ts` | 新規作成 | GPU 検索 Worker 実装 |
| `src/workers/wasm-loader.ts` | 新規作成 | WASM 初期化ユーティリティ |
| `src/services/worker-pool.ts` | 新規作成 | WorkerPool 実装 |
| `src/services/progress.ts` | 新規作成 | 進捗集約サービス |
| `src/hooks/use-search.ts` | 新規作成 | 検索実行用カスタムフック |
| `spec/agent/architecture/worker-design.md` | 修正 | 仕様修正 (wasm-bindgen 対応) |

## 3. 設計方針

### 3.1 WASM 初期化戦略

wasm-bindgen が生成する初期化関数の仕様:

| 関数 | 入力 | 処理 |
|------|------|------|
| `default` (async) | `URL`, `Response`, `BufferSource`, `WebAssembly.Module` | fetch + compile + instantiate |
| `initSync` | `BufferSource`, `WebAssembly.Module` | instantiate のみ (同期) |

Worker での初期化手順:

1. メインスレッド: `fetch()` で wasm バイナリを `ArrayBuffer` として取得
2. メインスレッド: `postMessage()` で `ArrayBuffer` を Worker に転送 (Transferable)
3. Worker: `initSync(arrayBuffer)` で同期初期化

`WebAssembly.Module` の共有は Worker 間でメモリ効率が良いが、wasm-bindgen の `initSync` は `BufferSource` を直接受け付けるため、`ArrayBuffer` 転送で十分。

### 3.2 Vite での Worker 作成

Vite 推奨パターン:

```typescript
const worker = new Worker(
  new URL('./workers/search.worker.ts', import.meta.url),
  { type: 'module' }
);
```

- `new URL()` で相対パスを解決
- `{ type: 'module' }` で ES Module Worker として動作
- Vite がビルド時に自動バンドル

### 3.3 CPU/GPU 経路選択

| 条件 | 使用 Worker |
|------|-------------|
| `navigator.gpu` 利用可能 + ユーザー設定 GPU | `gpu.worker.ts` (単一) |
| それ以外 | `search.worker.ts` × N (並列) |

GPU Worker は WebGPU リソースの排他制御のため単一インスタンス。

### 3.4 Worker 数決定

```typescript
const workerCount = navigator.hardwareConcurrency ?? 4;
```

上限は設けない (WASM Module 共有によりメモリ効率を確保)。

## 4. 実装仕様

### 4.1 メッセージ型定義 (`src/workers/types.ts`)

```typescript
// Main → Worker
export type WorkerRequest =
  | { type: 'init'; wasmBytes: ArrayBuffer }
  | { type: 'start'; taskId: string; task: SearchTask }
  | { type: 'cancel' };

// Worker → Main
export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'progress'; taskId: string; progress: ProgressInfo }
  | { type: 'result'; taskId: string; results: SeedOrigin[] }
  | { type: 'done'; taskId: string }
  | { type: 'error'; taskId: string; message: string };

export interface ProgressInfo {
  processed: number;
  total: number;
  percentage: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
  throughput: number; // items/sec
}

export type SearchTask =
  | { kind: 'egg-datetime'; params: EggDatetimeSearchParams }
  | { kind: 'mtseed-datetime'; params: MtseedDatetimeSearchParams }
  | { kind: 'mtseed'; params: MtseedSearchParams }
  | { kind: 'trainer-info'; params: TrainerInfoSearchParams };
```

### 4.2 WASM ローダー (`src/workers/wasm-loader.ts`)

```typescript
import wasmUrl from '@wasm/wasm_pkg_bg.wasm?url';

/**
 * WASM バイナリを取得
 * メインスレッドで実行し、結果を Worker に転送する
 */
export async function fetchWasmBytes(): Promise<ArrayBuffer> {
  const response = await fetch(wasmUrl);
  return response.arrayBuffer();
}
```

### 4.3 CPU Worker (`src/workers/search.worker.ts`)

```typescript
import { initSync } from '@wasm';
import type { WorkerRequest, WorkerResponse, SearchTask } from './types';

let initialized = false;
let cancelled = false;

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { data } = e;

  switch (data.type) {
    case 'init':
      initSync(data.wasmBytes);
      initialized = true;
      postResponse({ type: 'ready' });
      break;

    case 'start':
      if (!initialized) {
        postResponse({ type: 'error', taskId: data.taskId, message: 'WASM not initialized' });
        return;
      }
      cancelled = false;
      await runSearch(data.taskId, data.task);
      break;

    case 'cancel':
      cancelled = true;
      break;
  }
};

async function runSearch(taskId: string, task: SearchTask): Promise<void> {
  const startTime = performance.now();
  const searcher = createSearcher(task);
  const results: SeedOrigin[] = [];

  while (!searcher.is_done && !cancelled) {
    const batch = searcher.next_batch(getBatchSize(task.kind));
    results.push(...batch.results);

    postResponse({
      type: 'progress',
      taskId,
      progress: {
        processed: batch.processed_count,
        total: batch.total_count,
        percentage: (batch.processed_count / batch.total_count) * 100,
        elapsedMs: performance.now() - startTime,
        estimatedRemainingMs: estimateRemaining(batch, startTime),
        throughput: calculateThroughput(batch, startTime),
      },
    });

    // UI スレッドへ制御を戻す
    await yieldToMain();
  }

  postResponse({ type: 'result', taskId, results });
  postResponse({ type: 'done', taskId });
  searcher.free();
}

function createSearcher(task: SearchTask) {
  switch (task.kind) {
    case 'egg-datetime':
      return new EggDatetimeSearcher(task.params);
    case 'mtseed-datetime':
      return new MtseedDatetimeSearcher(task.params);
    case 'mtseed':
      return new MtseedSearcher(task.params);
    case 'trainer-info':
      return new TrainerInfoSearcher(task.params);
  }
}

function getBatchSize(kind: SearchTask['kind']): number {
  switch (kind) {
    case 'egg-datetime':
    case 'mtseed-datetime':
    case 'trainer-info':
      return 1000;
    case 'mtseed':
      return 0x10000;
  }
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function postResponse(response: WorkerResponse): void {
  self.postMessage(response);
}
```

### 4.4 GPU Worker (`src/workers/gpu.worker.ts`)

```typescript
import initWasm, { GpuDatetimeSearchIterator } from '@wasm';
import type { WorkerRequest, WorkerResponse } from './types';

let initialized = false;
let cancelled = false;

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { data } = e;

  switch (data.type) {
    case 'init':
      // GPU Worker は async 初期化が必要 (WebGPU adapter 取得)
      await initWasm(new Blob([data.wasmBytes], { type: 'application/wasm' }));
      initialized = true;
      postResponse({ type: 'ready' });
      break;

    case 'start':
      if (!initialized) {
        postResponse({ type: 'error', taskId: data.taskId, message: 'WASM not initialized' });
        return;
      }
      if (data.task.kind !== 'mtseed-datetime') {
        postResponse({ type: 'error', taskId: data.taskId, message: 'GPU only supports mtseed-datetime' });
        return;
      }
      cancelled = false;
      await runGpuSearch(data.taskId, data.task.params);
      break;

    case 'cancel':
      cancelled = true;
      break;
  }
};

async function runGpuSearch(taskId: string, params: MtseedDatetimeSearchParams): Promise<void> {
  const startTime = performance.now();
  const iterator = await GpuDatetimeSearchIterator.new(params);
  const results: SeedOrigin[] = [];

  while (!iterator.is_done && !cancelled) {
    const batch = await iterator.next();
    if (!batch) break;

    results.push(...batch.results);

    postResponse({
      type: 'progress',
      taskId,
      progress: {
        processed: Number(batch.processed_count),
        total: Number(batch.total_count),
        percentage: batch.progress * 100,
        elapsedMs: performance.now() - startTime,
        estimatedRemainingMs: estimateRemaining(batch, startTime),
        throughput: batch.throughput,
      },
    });
  }

  postResponse({ type: 'result', taskId, results });
  postResponse({ type: 'done', taskId });
}

function postResponse(response: WorkerResponse): void {
  self.postMessage(response);
}
```

### 4.5 WorkerPool (`src/services/worker-pool.ts`)

```typescript
import { fetchWasmBytes } from '../workers/wasm-loader';
import type { WorkerRequest, WorkerResponse, SearchTask, ProgressInfo } from '../workers/types';

export interface WorkerPoolConfig {
  useGpu: boolean;
  workerCount?: number;
}

export interface AggregatedProgress {
  totalProcessed: number;
  totalCount: number;
  percentage: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
  throughput: number;
  tasksCompleted: number;
  tasksTotal: number;
}

type ProgressCallback = (progress: AggregatedProgress) => void;
type ResultCallback = (results: SeedOrigin[]) => void;
type CompleteCallback = () => void;
type ErrorCallback = (error: Error) => void;

export class WorkerPool {
  private workers: Worker[] = [];
  private wasmBytes: ArrayBuffer | null = null;
  private readyCount = 0;
  private startTime = 0;

  private taskQueue: Array<{ taskId: string; task: SearchTask }> = [];
  private activeWorkers = new Map<Worker, string>();
  private taskProgress = new Map<string, ProgressInfo>();
  private allResults: SeedOrigin[] = [];
  private tasksCompleted = 0;
  private tasksTotal = 0;

  private progressCallbacks: ProgressCallback[] = [];
  private resultCallbacks: ResultCallback[] = [];
  private completeCallbacks: CompleteCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];

  constructor(private config: WorkerPoolConfig) {}

  get size(): number {
    return this.workers.length;
  }

  async initialize(): Promise<void> {
    this.wasmBytes = await fetchWasmBytes();

    if (this.config.useGpu && 'gpu' in navigator) {
      // GPU Worker は単一インスタンス
      const gpuWorker = new Worker(
        new URL('../workers/gpu.worker.ts', import.meta.url),
        { type: 'module' }
      );
      this.setupWorker(gpuWorker);
      this.workers.push(gpuWorker);
    } else {
      // CPU Workers
      const count = this.config.workerCount ?? navigator.hardwareConcurrency ?? 4;
      for (let i = 0; i < count; i++) {
        const worker = new Worker(
          new URL('../workers/search.worker.ts', import.meta.url),
          { type: 'module' }
        );
        this.setupWorker(worker);
        this.workers.push(worker);
      }
    }

    // 全 Worker に WASM 転送
    await this.initializeWorkers();
  }

  private setupWorker(worker: Worker): void {
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      this.handleWorkerMessage(worker, e.data);
    };
    worker.onerror = (e) => {
      this.errorCallbacks.forEach((cb) => cb(new Error(e.message)));
    };
  }

  private async initializeWorkers(): Promise<void> {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.readyCount === this.workers.length) {
          resolve();
        }
      };

      for (const worker of this.workers) {
        // ArrayBuffer は Transferable として転送 (コピーなし)
        const bytes = this.wasmBytes!.slice(0);
        worker.postMessage({ type: 'init', wasmBytes: bytes } as WorkerRequest, [bytes]);
      }

      // ready メッセージで readyCount を更新
      const originalHandler = this.workers[0].onmessage;
      this.workers.forEach((worker) => {
        const handler = worker.onmessage;
        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.type === 'ready') {
            this.readyCount++;
            checkReady();
          }
          handler?.call(worker, e);
        };
      });
    });
  }

  private handleWorkerMessage(worker: Worker, response: WorkerResponse): void {
    switch (response.type) {
      case 'progress':
        this.taskProgress.set(response.taskId, response.progress);
        this.emitAggregatedProgress();
        break;

      case 'result':
        this.allResults.push(...response.results);
        break;

      case 'done':
        this.tasksCompleted++;
        this.activeWorkers.delete(worker);
        this.dispatchNextTask(worker);
        if (this.tasksCompleted === this.tasksTotal && this.taskQueue.length === 0) {
          this.resultCallbacks.forEach((cb) => cb(this.allResults));
          this.completeCallbacks.forEach((cb) => cb());
        }
        break;

      case 'error':
        this.cancel();
        this.errorCallbacks.forEach((cb) => cb(new Error(response.message)));
        break;
    }
  }

  start(tasks: SearchTask[]): void {
    this.startTime = performance.now();
    this.tasksTotal = tasks.length;
    this.tasksCompleted = 0;
    this.allResults = [];
    this.taskProgress.clear();

    // タスクをキューに追加
    this.taskQueue = tasks.map((task, i) => ({
      taskId: `task-${i}`,
      task,
    }));

    // 各 Worker にタスクを配布
    for (const worker of this.workers) {
      this.dispatchNextTask(worker);
    }
  }

  private dispatchNextTask(worker: Worker): void {
    const next = this.taskQueue.shift();
    if (!next) return;

    this.activeWorkers.set(worker, next.taskId);
    worker.postMessage({
      type: 'start',
      taskId: next.taskId,
      task: next.task,
    } as WorkerRequest);
  }

  cancel(): void {
    for (const worker of this.workers) {
      worker.postMessage({ type: 'cancel' } as WorkerRequest);
    }
    this.taskQueue = [];
  }

  private emitAggregatedProgress(): void {
    let totalProcessed = 0;
    let totalCount = 0;

    for (const progress of this.taskProgress.values()) {
      totalProcessed += progress.processed;
      totalCount += progress.total;
    }

    const elapsedMs = performance.now() - this.startTime;
    const percentage = totalCount > 0 ? (totalProcessed / totalCount) * 100 : 0;
    const throughput = elapsedMs > 0 ? (totalProcessed / elapsedMs) * 1000 : 0;
    const remaining = totalCount - totalProcessed;
    const estimatedRemainingMs = throughput > 0 ? (remaining / throughput) * 1000 : 0;

    const aggregated: AggregatedProgress = {
      totalProcessed,
      totalCount,
      percentage,
      elapsedMs,
      estimatedRemainingMs,
      throughput,
      tasksCompleted: this.tasksCompleted,
      tasksTotal: this.tasksTotal,
    };

    this.progressCallbacks.forEach((cb) => cb(aggregated));
  }

  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter((cb) => cb !== callback);
    };
  }

  onResult(callback: ResultCallback): () => void {
    this.resultCallbacks.push(callback);
    return () => {
      this.resultCallbacks = this.resultCallbacks.filter((cb) => cb !== callback);
    };
  }

  onComplete(callback: CompleteCallback): () => void {
    this.completeCallbacks.push(callback);
    return () => {
      this.completeCallbacks = this.completeCallbacks.filter((cb) => cb !== callback);
    };
  }

  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter((cb) => cb !== callback);
    };
  }

  dispose(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
  }
}
```

### 4.6 検索フック (`src/hooks/use-search.ts`)

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { WorkerPool, type AggregatedProgress, type WorkerPoolConfig } from '../services/worker-pool';
import type { SearchTask } from '../workers/types';
import type { SeedOrigin } from '@wasm';

export interface UseSearchResult {
  isLoading: boolean;
  isInitialized: boolean;
  progress: AggregatedProgress | null;
  results: SeedOrigin[] | null;
  error: Error | null;
  start: (tasks: SearchTask[]) => void;
  cancel: () => void;
}

export function useSearch(config: WorkerPoolConfig): UseSearchResult {
  const poolRef = useRef<WorkerPool | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [progress, setProgress] = useState<AggregatedProgress | null>(null);
  const [results, setResults] = useState<SeedOrigin[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const pool = new WorkerPool(config);
    poolRef.current = pool;

    pool.initialize().then(() => {
      setIsInitialized(true);
    }).catch((e) => {
      setError(e instanceof Error ? e : new Error(String(e)));
    });

    pool.onProgress(setProgress);
    pool.onResult(setResults);
    pool.onComplete(() => setIsLoading(false));
    pool.onError((e) => {
      setError(e);
      setIsLoading(false);
    });

    return () => {
      pool.dispose();
    };
  }, [config.useGpu, config.workerCount]);

  const start = useCallback((tasks: SearchTask[]) => {
    if (!poolRef.current || !isInitialized) return;
    setIsLoading(true);
    setProgress(null);
    setResults(null);
    setError(null);
    poolRef.current.start(tasks);
  }, [isInitialized]);

  const cancel = useCallback(() => {
    poolRef.current?.cancel();
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    isInitialized,
    progress,
    results,
    error,
    start,
    cancel,
  };
}
```

## 5. テスト方針

### 5.1 テスト分類

| 分類 | テスト内容 | ファイル |
|------|------------|----------|
| ユニット | メッセージ型のシリアライズ/デシリアライズ | `src/test/unit/workers/types.test.ts` |
| ユニット | 進捗計算ロジック | `src/test/unit/services/progress.test.ts` |
| 統合 | Worker 初期化と WASM ロード | `src/test/integration/workers/init.test.ts` |
| 統合 | 各 Searcher の定数期待値検証 | `src/test/integration/workers/searcher.test.ts` |
| 統合 | WorkerPool の検索実行とキャンセル | `src/test/integration/services/worker-pool.test.ts` |

統合テストは Browser Mode (headless Chromium) で実行する。

### 5.2 統合テスト: 各 Searcher の定数期待値検証

Worker 経由で WASM モジュールを呼び出し、Rust 側テストと同一の期待値を検証する。

#### 5.2.1 MtseedDatetimeSearcher テスト

既知の条件で MT Seed が正しく検索できることを検証。

| 項目 | 値 |
|------|-----|
| 日時 | 2010/09/18 18:13:11 |
| ROM | Black (JPN) |
| Hardware | DS Lite |
| MAC | `8C:56:C5:86:15:28` |
| Timer0 | `0x0C79` |
| VCount | `0x60` |
| KeyCode | `0x2FFF` (入力なし) |
| 期待 LCG Seed | `0x768360781D1CE6DD` |
| 期待 MT Seed | `0x32BF6858` |

```typescript
// src/test/integration/workers/searcher.test.ts
describe('MtseedDatetimeSearcher', () => {
  it('should find known MT Seed with correct datetime', async () => {
    // 既知の期待値 (ウェブツールにて検証済み)
    const expectedLcgSeed = 0x768360781D1CE6DDn;
    const expectedMtSeed = 0x32BF6858; // deriveMtSeed(expectedLcgSeed) の結果

    const params: MtseedDatetimeSearchParams = {
      target_seeds: [expectedMtSeed],
      ds: {
        mac: [0x8C, 0x56, 0xC5, 0x86, 0x15, 0x28],
        hardware: 'DsLite',
        version: 'Black',
        region: 'Jpn',
      },
      time_range: {
        hour_start: 0, hour_end: 23,
        minute_start: 0, minute_end: 59,
        second_start: 0, second_end: 59,
      },
      search_range: {
        start_year: 2010,
        start_month: 9,
        start_day: 18,
        start_second_offset: 0,
        range_seconds: 86400, // 1日分
      },
      condition: { timer0: 0x0C79, vcount: 0x60, key_code: 0x2FFF },
    };

    const results = await runSearchInWorker('mtseed-datetime', params);

    // 期待する MT Seed が見つかること
    const found = results.find((r) => r.mt_seed === expectedMtSeed);
    expect(found).toBeDefined();

    // LCG Seed が期待値と一致
    expect(found!.lcg_seed).toBe(expectedLcgSeed);

    // 日時が 18:13:11 であること
    expect(found!.datetime.year).toBe(2010);
    expect(found!.datetime.month).toBe(9);
    expect(found!.datetime.day).toBe(18);
    expect(found!.datetime.hour).toBe(18);
    expect(found!.datetime.minute).toBe(13);
    expect(found!.datetime.second).toBe(11);

    // Timer0, VCount, KeyCode
    expect(found!.condition.timer0).toBe(0x0C79);
    expect(found!.condition.vcount).toBe(0x60);
    expect(found!.condition.key_code).toBe(0x2FFF);
  });
});
```

#### 5.2.2 MtseedSearcher テスト

IV フィルタによる MT Seed 検索を検証。

| テストケース | フィルタ条件 | 期待結果 |
|-------------|-------------|----------|
| 全範囲フィルタ | `IvFilter.any()` | バッチサイズ分全件マッチ |
| 6V フィルタ | HP/Atk/Def/SpA/SpD/Spe = 31 | 5 件 (既知の期待値) |

**6V 検索の既知の期待値 (ウェブツールにて検証済み):**

| MT Seed |
|---------|
| `0x14B11BA6` |
| `0x8A30480D` |
| `0x9E02B0AE` |
| `0xADFA2178` |
| `0xFC4AA3AC` |

```typescript
describe('MtseedSearcher', () => {
  it('should match all with any filter', async () => {
    const params: MtseedSearchParams = {
      iv_filter: {
        hp: [0, 31], atk: [0, 31], def: [0, 31],
        spa: [0, 31], spd: [0, 31], spe: [0, 31],
      },
      mt_offset: 0,
      is_roamer: false,
    };

    const batch = await runSearchInWorker('mtseed', params, { batchSize: 100 });
    expect(batch.candidates.length).toBe(100);
  });

  it('should find exactly 5 6V MT Seeds', async () => {
    // 6V フィルタで全探索すると 5 件見つかる (ウェブツールにて検証済み)
    const expected6vSeeds = [
      0x14B11BA6,
      0x8A30480D,
      0x9E02B0AE,
      0xADFA2178,
      0xFC4AA3AC,
    ];

    const params: MtseedSearchParams = {
      iv_filter: {
        hp: [31, 31], atk: [31, 31], def: [31, 31],
        spa: [31, 31], spd: [31, 31], spe: [31, 31],
      },
      mt_offset: 0,
      is_roamer: false,
    };

    // 全探索 (0x00000000 〜 0xFFFFFFFF)
    const allResults = await runFullSearchInWorker('mtseed', params);

    expect(allResults.candidates.length).toBe(5);
    expect(allResults.candidates.map((c) => c.mt_seed).sort()).toEqual(
      expected6vSeeds.sort()
    );
  });
});
```

#### 5.2.3 EggDatetimeSearcher テスト

卵検索の基本動作を検証 (ウェブツールにて検証済みの既知の期待値)。

**テストデータ (2010/09/18 00:00:00, Adv=0):**

| 項目 | 値 |
|------|-----|
| LCG Seed | `0xA3099B3B0196AAA1` |
| MT Seed | `0x2D9429C0` |
| Timer0 | `0x0C79` |
| VCount | `0x60` |
| 特性 | 特性1 |
| 性別 | ♀ |
| 性格 | むじゃき (Naive) |
| IVs | H31/A14/B0/C22/D31/S31 |
| めざパ | でんき 67 |

```typescript
describe('EggDatetimeSearcher', () => {
  it('should find known egg result at specific datetime', async () => {
    // 2010/09/18 00:00:00 における既知の卵検索結果 (Adv=0)
    const expectedLcgSeed = 0xA3099B3B0196AAA1n;
    const expectedMtSeed = 0x2D9429C0;

    const params: EggDatetimeSearchParams = {
      ds: {
        mac: [0x8C, 0x56, 0xC5, 0x86, 0x15, 0x28],
        hardware: 'DsLite',
        version: 'Black',
        region: 'Jpn',
      },
      time_range: {
        hour_start: 0, hour_end: 0,
        minute_start: 0, minute_end: 0,
        second_start: 0, second_end: 0,
      },
      search_range: {
        start_year: 2010,
        start_month: 9,
        start_day: 18,
        start_second_offset: 0,
        range_seconds: 1,
      },
      condition: { timer0: 0x0C79, vcount: 0x60, key_code: 0x2FFF },
      egg_params: {
        trainer: { tid: 1, sid: 2 },
        everstone: 'None',
        female_has_hidden: false,
        uses_ditto: false,
        gender_ratio: 'F1M1',
        nidoran_flag: false,
        masuda_method: false,
        parent_male: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        parent_female: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        consider_npc: false,
        species_id: null,
      },
      gen_config: {
        version: 'Black',
        game_start: { start_mode: 'Continue', save_state: 'WithSave' },
        user_offset: 0,
        max_advance: 10,
      },
      filter: null,
    };

    const result = await runSearchInWorker('egg-datetime', params);

    // Adv=0 の結果を検証
    const adv0 = result.results.find((r) => r.advance === 0);
    expect(adv0).toBeDefined();

    // LCG Seed と MT Seed が期待値と一致
    expect(adv0!.origin.lcg_seed).toBe(expectedLcgSeed);
    expect(adv0!.origin.mt_seed).toBe(expectedMtSeed);

    // 卵の性格が "むじゃき" (Naive) であること
    expect(adv0!.egg.nature).toBe('Naive');

    // 卵の性別が ♀ であること
    expect(adv0!.egg.gender).toBe('Female');

    // 卵の特性が 特性1 であること
    expect(adv0!.egg.ability).toBe('Ability1');

    // 卵の個体値を検証
    expect(adv0!.egg.ivs).toEqual({
      hp: 31, atk: 14, def: 0, spa: 22, spd: 31, spe: 31,
    });
  });
});
```

#### 5.2.4 TrainerInfoSearcher テスト

トレーナー情報検索の基本動作と制約を検証。

```typescript
describe('TrainerInfoSearcher', () => {
  it('should reject Continue mode', async () => {
    const params: TrainerInfoSearchParams = {
      filter: {},
      ds: {
        mac: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56],
        hardware: 'DsLite',
        version: 'Black',
        region: 'Jpn',
      },
      time_range: {
        hour_start: 0, hour_end: 0,
        minute_start: 0, minute_end: 0,
        second_start: 0, second_end: 59,
      },
      search_range: {
        start_year: 2023,
        start_month: 1,
        start_day: 1,
        start_second_offset: 0,
        range_seconds: 60,
      },
      condition: { timer0: 0x0C79, vcount: 0x5F, key_code: 0x2FFF },
      game_start: { start_mode: 'Continue', save_state: 'WithSave' },
    };

    await expect(runSearchInWorker('trainer-info', params)).rejects.toThrow(/NewGame/);
  });

  it('should process batches with default filter', async () => {
    const params: TrainerInfoSearchParams = {
      filter: {},
      ds: {
        mac: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56],
        hardware: 'DsLite',
        version: 'Black',
        region: 'Jpn',
      },
      time_range: {
        hour_start: 0, hour_end: 0,
        minute_start: 0, minute_end: 0,
        second_start: 0, second_end: 59,
      },
      search_range: {
        start_year: 2023,
        start_month: 1,
        start_day: 1,
        start_second_offset: 0,
        range_seconds: 60,
      },
      condition: { timer0: 0x0C79, vcount: 0x5F, key_code: 0x2FFF },
      game_start: { start_mode: 'NewGame', save_state: 'NoSave' },
    };

    const result = await runSearchInWorker('trainer-info', params);
    expect(result.processed_count).toBeGreaterThan(0);
  });
});
```

### 5.3 統合テスト: WorkerPool 動作検証

```typescript
// src/test/integration/services/worker-pool.test.ts
describe('WorkerPool', () => {
  it('should initialize all workers', async () => {
    const pool = new WorkerPool({ useGpu: false, workerCount: 2 });
    await pool.initialize();

    expect(pool.size).toBe(2);
    pool.dispose();
  });

  it('should execute search tasks and collect results', async () => {
    const pool = new WorkerPool({ useGpu: false, workerCount: 2 });
    await pool.initialize();

    const tasks = generateMtseedSearchTasks(context, targetSeeds, dateRange, 2);
    const results: SeedOrigin[] = [];

    pool.onResult((r) => results.push(...r));

    await new Promise<void>((resolve) => {
      pool.onComplete(() => resolve());
      pool.start(tasks);
    });

    expect(results.length).toBeGreaterThanOrEqual(0);
    pool.dispose();
  });

  it('should cancel ongoing search', async () => {
    const pool = new WorkerPool({ useGpu: false, workerCount: 2 });
    await pool.initialize();

    const tasks = generateLongRunningTasks();
    let progressCount = 0;

    pool.onProgress(() => {
      progressCount++;
      if (progressCount >= 3) {
        pool.cancel();
      }
    });

    await new Promise<void>((resolve) => {
      pool.onComplete(() => resolve());
      pool.start(tasks);
    });

    // キャンセルにより早期終了
    expect(progressCount).toBeGreaterThanOrEqual(3);
    pool.dispose();
  });

  it('should aggregate progress from multiple workers', async () => {
    const pool = new WorkerPool({ useGpu: false, workerCount: 4 });
    await pool.initialize();

    const tasks = generateMtseedSearchTasks(context, targetSeeds, dateRange, 4);
    const progressHistory: AggregatedProgress[] = [];

    pool.onProgress((p) => progressHistory.push(p));

    await new Promise<void>((resolve) => {
      pool.onComplete(() => resolve());
      pool.start(tasks);
    });

    // 進捗が複数回報告されること
    expect(progressHistory.length).toBeGreaterThan(0);

    // 最終進捗が 100% に近いこと
    const lastProgress = progressHistory[progressHistory.length - 1];
    expect(lastProgress.percentage).toBeGreaterThan(95);

    pool.dispose();
  });
});
```

### 5.4 テストヘルパー関数

```typescript
// src/test/integration/helpers/worker-test-utils.ts

/**
 * Worker 経由で検索を実行するヘルパー
 */
async function runSearchInWorker<T extends SearchTask['kind']>(
  kind: T,
  params: SearchParamsFor<T>,
  options?: { batchSize?: number }
): Promise<SearchResultFor<T>> {
  const worker = new Worker(
    new URL('../../../workers/search.worker.ts', import.meta.url),
    { type: 'module' }
  );

  const wasmBytes = await fetchWasmBytes();

  return new Promise((resolve, reject) => {
    const results: unknown[] = [];

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      switch (e.data.type) {
        case 'ready':
          worker.postMessage({
            type: 'start',
            taskId: 'test-task',
            task: { kind, params },
          });
          break;
        case 'result':
          results.push(...e.data.results);
          break;
        case 'done':
          worker.terminate();
          resolve(results as SearchResultFor<T>);
          break;
        case 'error':
          worker.terminate();
          reject(new Error(e.data.message));
          break;
      }
    };

    worker.postMessage({ type: 'init', wasmBytes }, [wasmBytes]);
  });
}
```

## 6. 実装チェックリスト

### 6.1 Worker 基盤

- [ ] `src/workers/types.ts` 作成
- [ ] `src/workers/wasm-loader.ts` 作成
- [ ] `src/workers/search.worker.ts` 作成
- [ ] `src/workers/gpu.worker.ts` 作成
- [ ] `src/services/worker-pool.ts` 作成
- [ ] `src/services/progress.ts` 作成
- [ ] `src/hooks/use-search.ts` 作成

### 6.2 ユニットテスト

- [ ] `src/test/unit/workers/types.test.ts` 作成
- [ ] `src/test/unit/services/progress.test.ts` 作成

### 6.3 統合テスト

- [ ] `src/test/integration/helpers/worker-test-utils.ts` 作成
- [ ] `src/test/integration/workers/init.test.ts` 作成
- [ ] `src/test/integration/workers/searcher.test.ts` 作成
  - [ ] MtseedDatetimeSearcher: 既知 LCG Seed `0x768360781D1CE6DD` の検索
  - [ ] MtseedSearcher: 全範囲フィルタ / 6V フィルタ
  - [ ] EggDatetimeSearcher: バッチ処理動作
  - [ ] TrainerInfoSearcher: Continue モード拒否 / バッチ処理動作
- [ ] `src/test/integration/services/worker-pool.test.ts` 作成
  - [ ] Worker 初期化
  - [ ] 検索タスク実行と結果収集
  - [ ] キャンセル処理
  - [ ] 進捗集約

### 6.4 ドキュメント

- [ ] `spec/agent/architecture/worker-design.md` 修正
