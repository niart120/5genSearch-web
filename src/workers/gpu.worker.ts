/**
 * GPU 検索 Worker
 *
 * WebGPU を使用した WASM を実行する Worker。
 * WebGPU リソースの排他制御のため、単一インスタンスで運用する。
 */

import initWasm, { GpuDatetimeSearchIterator } from '@wasm';
import type { WorkerRequest, WorkerResponse } from './types';
import type { MtseedDatetimeSearchParams, GpuSearchBatch } from '@wasm';

// =============================================================================
// State
// =============================================================================

let initialized = false;
let cancelRequested = false;
let currentIterator: GpuDatetimeSearchIterator | null = null;

// =============================================================================
// Message Handler
// =============================================================================

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { data } = e;

  switch (data.type) {
    case 'init':
      await handleInit(data.wasmBytes);
      break;

    case 'start':
      if (!initialized) {
        postResponse({
          type: 'error',
          taskId: data.taskId,
          message: 'WASM not initialized',
        });
        return;
      }

      // GPU Worker は mtseed-datetime のみサポート
      if (data.task.kind !== 'mtseed-datetime') {
        postResponse({
          type: 'error',
          taskId: data.taskId,
          message: `GPU Worker only supports mtseed-datetime, got: ${data.task.kind}`,
        });
        return;
      }

      await runGpuSearch(data.taskId, data.task.params);
      break;

    case 'cancel':
      cancelRequested = true;
      // イテレータを破棄してリソースを解放
      if (currentIterator) {
        currentIterator.free();
        currentIterator = null;
      }
      break;
  }
};

// =============================================================================
// Init Handler
// =============================================================================

async function handleInit(wasmBytes: ArrayBuffer): Promise<void> {
  try {
    // GPU Worker は async 初期化が必要 (WebGPU adapter 取得)
    // Blob を経由して wasm を読み込む
    const blob = new Blob([wasmBytes], { type: 'application/wasm' });
    await initWasm(blob);
    initialized = true;
    postResponse({ type: 'ready' });
  } catch (err) {
    postResponse({
      type: 'error',
      taskId: '',
      message: `WASM init failed: ${err instanceof Error ? err.message : String(err)}`,
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
async function runGpuSearch(taskId: string, params: MtseedDatetimeSearchParams): Promise<void> {
  cancelRequested = false;

  try {
    // GpuDatetimeSearchIterator は async constructor
    currentIterator = await new GpuDatetimeSearchIterator(params);

    // 結果を収集
    let batch: GpuSearchBatch | undefined;

    while (!cancelRequested && !currentIterator.is_done) {
      batch = await currentIterator.next();

      if (!batch) {
        break;
      }

      // 進捗報告
      postResponse({
        type: 'progress',
        taskId,
        progress: batch.progress,
        currentResults: batch.results,
      });
    }

    if (cancelRequested) {
      postResponse({
        type: 'cancelled',
        taskId,
      });
      return;
    }

    // 完了
    postResponse({
      type: 'done',
      taskId,
    });
  } catch (err) {
    postResponse({
      type: 'error',
      taskId,
      message: err instanceof Error ? err.message : String(err),
    });
  } finally {
    // リソースを確実に解放
    if (currentIterator) {
      currentIterator.free();
      currentIterator = null;
    }
  }
}

function postResponse(response: WorkerResponse): void {
  self.postMessage(response);
}
