/**
 * GPU 検索 Worker
 *
 * WebGPU を使用した WASM を実行する Worker。
 * WebGPU リソースの排他制御のため、単一インスタンスで運用する。
 */

import initWasm, { GpuDatetimeSearchIterator } from '../wasm/wasm_pkg.js';
import type { WorkerRequest, WorkerResponse, GpuMtseedSearchTask } from './types';
import type { GpuSearchBatch } from '../wasm/wasm_pkg.js';

// WASM バイナリの絶対パス（public/wasm/ から配信）
const WASM_URL = '/wasm/wasm_pkg_bg.wasm';

// =============================================================================
// State
// =============================================================================

let initialized = false;
let cancelRequested = false;
let currentIterator: GpuDatetimeSearchIterator | undefined;

// =============================================================================
// Message Handler
// =============================================================================

globalThis.addEventListener('message', async (e: MessageEvent<WorkerRequest>) => {
  const { data } = e;

  switch (data.type) {
    case 'init': {
      await handleInit();
      break;
    }

    case 'start': {
      if (!initialized) {
        postResponse({
          type: 'error',
          taskId: data.taskId,
          message: 'WASM not initialized',
        });
        return;
      }

      // GPU Worker は gpu-mtseed のみサポート
      if (data.task.kind === 'gpu-mtseed') {
        await runGpuSearch(data.taskId, data.task);
      } else {
        postResponse({
          type: 'error',
          taskId: data.taskId,
          message: `GPU Worker only supports gpu-mtseed, got: ${data.task.kind}`,
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

// =============================================================================
// Init Handler
// =============================================================================

async function handleInit(): Promise<void> {
  try {
    // Worker 内で独立して WASM を初期化
    await initWasm({ module_or_path: WASM_URL });
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
 * GPU 検索実行
 *
 * GpuDatetimeSearchIterator を使用して AsyncIterator パターンで検索を実行。
 * 各バッチ完了時に進捗を報告し、結果を収集して返却する。
 */
async function runGpuSearch(taskId: string, task: GpuMtseedSearchTask): Promise<void> {
  cancelRequested = false;

  try {
    currentIterator = await GpuDatetimeSearchIterator.create(task.context, task.targetSeeds);

    await executeSearchLoop(taskId);
  } catch (error) {
    postResponse({
      type: 'error',
      taskId,
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    // リソースを確実に解放
    if (currentIterator) {
      currentIterator.free();
      currentIterator = undefined;
    }
  }
}

/**
 * 検索ループ実行 (共通処理)
 */
async function executeSearchLoop(taskId: string): Promise<void> {
  if (!currentIterator) {
    return;
  }

  let batch: GpuSearchBatch | undefined;
  const startTime = performance.now();

  while (!cancelRequested && !currentIterator.is_done) {
    batch = await currentIterator.next();

    if (!batch) {
      break;
    }

    const now = performance.now();
    const elapsedMs = now - startTime;
    const processedCount = Number(batch.processed_count);

    // スループット計算 (items/sec)
    const throughput = elapsedMs > 0 ? (processedCount / elapsedMs) * 1000 : 0;

    // 進捗報告
    postResponse({
      type: 'progress',
      taskId,
      progress: {
        processed: processedCount,
        total: Number(batch.total_count),
        percentage: batch.progress * 100,
        elapsedMs,
        estimatedRemainingMs:
          batch.progress > 0 ? elapsedMs * ((1 - batch.progress) / batch.progress) : 0,
        throughput,
      },
    });

    // 中間結果を報告
    if (batch.results.length > 0) {
      postResponse({
        type: 'result',
        taskId,
        resultType: 'seed-origin',
        results: batch.results,
      });
    }
  }

  // 完了
  postResponse({
    type: 'done',
    taskId,
  });
}

function postResponse(response: WorkerResponse): void {
  globalThis.postMessage(response);
}
