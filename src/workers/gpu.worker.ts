/**
 * GPU 検索 Worker
 *
 * WebGPU を使用した WASM を実行する Worker。
 * WebGPU リソースの排他制御のため、単一インスタンスで運用する。
 */

import {
  GpuDatetimeSearchIterator,
  GpuMtseedSearchIterator,
  health_check,
} from '../wasm/wasm_pkg.js';
import type {
  WorkerRequest,
  WorkerResponse,
  GpuMtseedSearchTask,
  GpuMtseedIvSearchTask,
  ProgressInfo,
} from './types';
import type { GpuSearchBatch, GpuMtseedSearchBatch } from '../wasm/wasm_pkg.js';

// =============================================================================
// Constants
// =============================================================================

/** 進捗 postMessage 送信間隔 (ms) — CPU Worker と同一 */
const PROGRESS_INTERVAL_MS = 500;

// =============================================================================
// Batch Adapter
// =============================================================================

/** GPU バッチ型の差異を吸収するアダプタ */
interface GpuBatchAdapter<TBatch> {
  /** バッチから結果を取り出し、WorkerResponse として postMessage する */
  reportResults: (taskId: string, batch: TBatch) => void;
  /** バッチから進捗情報を構築する */
  toProgress: (batch: TBatch, startTime: number, now: number) => ProgressInfo;
}

const datetimeSearchAdapter: GpuBatchAdapter<GpuSearchBatch> = {
  reportResults(taskId, batch) {
    if (batch.results.length > 0) {
      postResponse({
        type: 'result',
        taskId,
        resultType: 'seed-origin',
        results: batch.results,
      });
    }
  },
  toProgress(batch, startTime, now) {
    return buildProgressInfo(
      Number(batch.processed_count),
      Number(batch.total_count),
      batch.progress,
      startTime,
      now
    );
  },
};

const mtseedIvSearchAdapter: GpuBatchAdapter<GpuMtseedSearchBatch> = {
  reportResults(taskId, batch) {
    if (batch.candidates.length > 0) {
      postResponse({
        type: 'result',
        taskId,
        resultType: 'mtseed',
        results: batch.candidates,
      });
    }
  },
  toProgress(batch, startTime, now) {
    return buildProgressInfo(
      Number(batch.processed),
      Number(batch.total),
      batch.progress,
      startTime,
      now
    );
  },
};

// =============================================================================
// State
// =============================================================================

let initialized = false;
let cancelRequested = false;
let currentIterator: GpuDatetimeSearchIterator | GpuMtseedSearchIterator | undefined;

// =============================================================================
// Message Handler
// =============================================================================

globalThis.addEventListener('message', async (e: MessageEvent<WorkerRequest>) => {
  const { data } = e;

  switch (data.type) {
    case 'init': {
      handleInit();
      break;
    }

    case 'start': {
      // auto-init パターンでは到達しない防御的ガード
      if (!initialized) {
        postResponse({
          type: 'error',
          taskId: data.taskId,
          message: 'WASM not initialized',
        });
        return;
      }

      // GPU Worker は gpu-mtseed / gpu-mtseed-iv をサポート
      if (data.task.kind === 'gpu-mtseed') {
        await runGpuSearch(data.taskId, data.task);
      } else if (data.task.kind === 'gpu-mtseed-iv') {
        await runGpuMtseedIvSearch(data.taskId, data.task);
      } else {
        postResponse({
          type: 'error',
          taskId: data.taskId,
          message: `GPU Worker only supports gpu-mtseed/gpu-mtseed-iv, got: ${data.task.kind}`,
        });
        return;
      }
      break;
    }

    case 'cancel': {
      cancelRequested = true;
      // イテレータを破棄してリソースを解放
      if (currentIterator) {
        currentIterator.free();
        currentIterator = undefined;
      }
      break;
    }
  }
});

// bundler target では WASM はモジュール読み込み時に自動初期化される。
// module Worker の top-level await 中に postMessage が消失する問題を回避するため、
// message listener 登録後に自動で初期化を実行する。
handleInit();

// =============================================================================
// Init Handler
// =============================================================================

function handleInit(): void {
  if (initialized) return;

  try {
    const healthResult = health_check();
    if (healthResult !== 'wasm-pkg is ready') {
      throw new Error(`Health check failed: ${healthResult}`);
    }

    initialized = true;
    postResponse({ type: 'ready' });
  } catch (error) {
    postResponse({
      type: 'error',
      taskId: '',
      message: `WASM init failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// =============================================================================
// GPU Search Execution
// =============================================================================

/**
 * GPU datetime 検索実行
 */
async function runGpuSearch(taskId: string, task: GpuMtseedSearchTask): Promise<void> {
  await cacheGpuAdapterInfo();
  const iterator = await GpuDatetimeSearchIterator.create(task.context, task.targetSeeds);
  currentIterator = iterator;
  await runGpuSearchLoop(taskId, iterator, datetimeSearchAdapter);
}

/**
 * GPU MT Seed IV 全探索実行
 */
async function runGpuMtseedIvSearch(taskId: string, task: GpuMtseedIvSearchTask): Promise<void> {
  await cacheGpuAdapterInfo();
  const iterator = await GpuMtseedSearchIterator.create(task.context);
  currentIterator = iterator;
  await runGpuSearchLoop(taskId, iterator, mtseedIvSearchAdapter);
}

/**
 * GPU 検索ループ (共通)
 *
 * 進捗報告は PROGRESS_INTERVAL_MS で間引き、
 * 毎ディスパッチの postMessage オーバーヘッドを抑制する。
 * 結果 (マッチ) は即時報告する。
 */
async function runGpuSearchLoop<
  TBatch,
  TIterator extends { is_done: boolean; next(): Promise<TBatch | undefined>; free(): void },
>(taskId: string, iterator: TIterator, adapter: GpuBatchAdapter<TBatch>): Promise<void> {
  cancelRequested = false;

  try {
    const startTime = performance.now();
    let lastProgressTime = startTime;
    let lastBatch: TBatch | undefined;

    while (!cancelRequested && !iterator.is_done) {
      const batch = await iterator.next();

      if (!batch) {
        break;
      }

      lastBatch = batch;

      // 中間結果は即時報告 (マッチ件数は通常極少)
      adapter.reportResults(taskId, batch);

      // 進捗スロットリング
      const now = performance.now();
      if (now - lastProgressTime >= PROGRESS_INTERVAL_MS) {
        postResponse({
          type: 'progress',
          taskId,
          progress: adapter.toProgress(batch, startTime, now),
        });
        lastProgressTime = now;
      }
    }

    // 最終進捗: 完了時の正確な数値をメインスレッドに通知
    if (lastBatch) {
      const now = performance.now();
      postResponse({
        type: 'progress',
        taskId,
        progress: adapter.toProgress(lastBatch, startTime, now),
      });
    }

    postResponse({
      type: 'done',
      taskId,
    });
  } catch (error) {
    postResponse({
      type: 'error',
      taskId,
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (currentIterator) {
      currentIterator.free();
      currentIterator = undefined;
    }
  }
}

/** 進捗オブジェクト構築 (共通) */
function buildProgressInfo(
  processed: number,
  total: number,
  progressRatio: number,
  startTime: number,
  now: number
): ProgressInfo {
  const elapsedMs = now - startTime;
  const throughput = elapsedMs > 0 ? (processed / elapsedMs) * 1000 : 0;

  return {
    processed,
    total,
    percentage: progressRatio * 100,
    elapsedMs,
    estimatedRemainingMs: progressRatio > 0 ? elapsedMs * ((1 - progressRatio) / progressRatio) : 0,
    throughput,
  };
}

/**
 * ブラウザの GPUAdapterInfo 拡張プロパティ
 *
 * @webgpu/types v0.1.69 では `type` / `driver` が未定義。
 * Chrome 131+ で追加されたプロパティを補完する。
 * @see https://developer.mozilla.org/en-US/docs/Web/API/GPUAdapterInfo
 */
interface GPUAdapterInfoExtended extends GPUAdapterInfo {
  readonly type?: string;
  readonly driver?: string;
}

/**
 * ブラウザの GPUAdapterInfo を globalThis に保存
 *
 * wgpu v24 の WebGPU バックエンドは AdapterInfo のフィールドを
 * 空/デフォルト値で返すため、WASM 側の GpuProfile::detect() が
 * globalThis.__wgpu_browser_adapter_info を参照して GPU 種別を判定する。
 */
async function cacheGpuAdapterInfo(): Promise<void> {
  try {
    const gpu = navigator.gpu;
    if (!gpu) return;

    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter?.info) return;

    const info = adapter.info as GPUAdapterInfoExtended;
    (globalThis as Record<string, unknown>).__wgpu_browser_adapter_info = {
      type: info.type ?? '',
      description: info.description ?? '',
      vendor: info.vendor ?? '',
      driver: info.driver ?? '',
    };
  } catch {
    // WebGPU 未対応環境では無視
  }
}

function postResponse(response: WorkerResponse): void {
  globalThis.postMessage(response);
}
