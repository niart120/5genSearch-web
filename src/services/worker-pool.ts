/**
 * WorkerPool
 *
 * 複数の Worker を管理し、タスク分配・進捗集約を行うサービス。
 */

import { ProgressAggregator, type AggregatedProgress } from './progress';
import type { WorkerRequest, WorkerResponse, SearchTask } from '../workers/types';
import type {
  SeedOrigin,
  MtseedResult,
  EggDatetimeSearchResult,
  TrainerInfoSearchResult,
} from '../wasm/wasm_pkg.js';

// =============================================================================
// Types
// =============================================================================

/**
 * WorkerPool 設定
 */
export interface WorkerPoolConfig {
  /** GPU Worker を使用するか */
  useGpu: boolean;
  /** CPU Worker 数 (未指定時は navigator.hardwareConcurrency) */
  workerCount?: number;
}

/**
 * 検索結果の型 (すべての結果型の Union)
 */
export type SearchResult =
  | SeedOrigin[]
  | MtseedResult[]
  | EggDatetimeSearchResult[]
  | TrainerInfoSearchResult[];

/**
 * コールバック型定義
 */
type ProgressCallback = (progress: AggregatedProgress) => void;
type ResultCallback = (results: SearchResult) => void;
type CompleteCallback = () => void;
type ErrorCallback = (error: Error) => void;

// =============================================================================
// WorkerPool
// =============================================================================

/**
 * Worker プール
 *
 * 複数の Worker を管理し、検索タスクを分配・実行する。
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private readyCount = 0;
  private initPromise: Promise<void> | undefined = undefined;

  private taskQueue: Array<{ taskId: string; task: SearchTask }> = [];
  private activeWorkers = new Map<Worker, string>();
  private progressAggregator = new ProgressAggregator();

  private progressCallbacks: ProgressCallback[] = [];
  private resultCallbacks: ResultCallback[] = [];
  private completeCallbacks: CompleteCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];

  private config: WorkerPoolConfig;

  constructor(config: WorkerPoolConfig) {
    this.config = config;
  }

  /**
   * Worker 数を取得
   */
  get size(): number {
    return this.workers.length;
  }

  /**
   * 初期化済みかどうか
   */
  get isReady(): boolean {
    return this.readyCount === this.workers.length && this.workers.length > 0;
  }

  /**
   * WorkerPool を初期化
   *
   * WASM バイナリを取得し、Worker を作成・初期化する。
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    // Worker を作成
    if (this.config.useGpu && 'gpu' in navigator) {
      // GPU Worker は単一インスタンス
      const gpuWorker = new Worker(new URL('../workers/gpu.worker.ts', import.meta.url), {
        type: 'module',
      });
      this.setupWorker(gpuWorker);
      this.workers.push(gpuWorker);
    } else {
      // CPU Workers
      const count = this.config.workerCount ?? navigator.hardwareConcurrency ?? 4;
      for (let i = 0; i < count; i++) {
        const worker = new Worker(new URL('../workers/search.worker.ts', import.meta.url), {
          type: 'module',
        });
        this.setupWorker(worker);
        this.workers.push(worker);
      }
    }

    // 全 Worker に WASM 初期化を指示
    await this.initializeWorkers();
  }

  private setupWorker(worker: Worker): void {
    worker.addEventListener('message', (e: MessageEvent<WorkerResponse>) => {
      this.handleWorkerMessage(worker, e.data);
    });
    worker.addEventListener('error', (e) => {
      for (const cb of this.errorCallbacks) cb(new Error(e.message));
    });
  }

  private async initializeWorkers(): Promise<void> {
    return new Promise<void>((resolve) => {
      for (const worker of this.workers) {
        // Worker に初期化を指示 (Worker が独自に WASM を fetch する)
        const request: WorkerRequest = { type: 'init' };
        worker.postMessage(request);
      }

      // ready イベントのハンドリングは handleWorkerMessage で行う
      // ここでは checkReady を呼び出すためのフックを設定
      const checkReadyInterval = setInterval(() => {
        if (this.readyCount === this.workers.length) {
          clearInterval(checkReadyInterval);
          resolve();
        }
      }, 10);

      // タイムアウト (10秒)
      setTimeout(() => {
        clearInterval(checkReadyInterval);
        if (this.readyCount !== this.workers.length) {
          for (const cb of this.errorCallbacks)
            cb(
              new Error(
                `Worker initialization timeout: ${this.readyCount}/${this.workers.length} ready`
              )
            );
        }
      }, 10_000);
    });
  }

  private handleWorkerMessage(worker: Worker, response: WorkerResponse): void {
    switch (response.type) {
      case 'ready': {
        this.readyCount++;
        break;
      }

      case 'progress': {
        this.progressAggregator.updateProgress(response.taskId, response.progress);
        this.emitAggregatedProgress();
        break;
      }

      case 'result': {
        // 結果タイプに応じて適切なコールバックを呼び出す
        for (const cb of this.resultCallbacks) cb(response.results as SearchResult);
        break;
      }

      case 'done': {
        this.progressAggregator.markCompleted(response.taskId);
        this.emitAggregatedProgress(); // 完了時に進捗を通知
        this.activeWorkers.delete(worker);
        this.dispatchNextTask(worker);

        if (this.progressAggregator.isComplete() && this.taskQueue.length === 0) {
          for (const cb of this.completeCallbacks) cb();
        }
        break;
      }

      case 'error': {
        this.cancel();
        for (const cb of this.errorCallbacks) cb(new Error(response.message));
        break;
      }
    }
  }

  /**
   * 検索を開始
   *
   * @param tasks 検索タスクの配列
   */
  start(tasks: SearchTask[]): void {
    this.progressAggregator.start(tasks.length);

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
    const request: WorkerRequest = {
      type: 'start',
      taskId: next.taskId,
      task: next.task,
    };
    worker.postMessage(request);
  }

  /**
   * 検索をキャンセル
   */
  cancel(): void {
    for (const worker of this.workers) {
      const request: WorkerRequest = { type: 'cancel' };
      worker.postMessage(request);
    }
    this.taskQueue = [];
  }

  private emitAggregatedProgress(): void {
    const aggregated = this.progressAggregator.getAggregatedProgress();
    for (const cb of this.progressCallbacks) cb(aggregated);
  }

  /**
   * 進捗コールバックを登録
   *
   * @param callback コールバック関数
   * @returns 登録解除関数
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * 結果コールバックを登録
   *
   * @param callback コールバック関数
   * @returns 登録解除関数
   */
  onResult(callback: ResultCallback): () => void {
    this.resultCallbacks.push(callback);
    return () => {
      this.resultCallbacks = this.resultCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * 完了コールバックを登録
   *
   * @param callback コールバック関数
   * @returns 登録解除関数
   */
  onComplete(callback: CompleteCallback): () => void {
    this.completeCallbacks.push(callback);
    return () => {
      this.completeCallbacks = this.completeCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * エラーコールバックを登録
   *
   * @param callback コールバック関数
   * @returns 登録解除関数
   */
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * WorkerPool を破棄
   *
   * すべての Worker を終了する。
   */
  dispose(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.readyCount = 0;
    this.initPromise = undefined;
    this.progressAggregator.reset();
    this.progressCallbacks = [];
    this.resultCallbacks = [];
    this.completeCallbacks = [];
    this.errorCallbacks = [];
  }
}
