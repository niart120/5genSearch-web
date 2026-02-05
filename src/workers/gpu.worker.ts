/**
 * GPU 検索 Worker
 *
 * WebGPU を使用した WASM を実行する Worker。
 * WebGPU リソースの排他制御のため、単一インスタンスで運用する。
 */

import initWasm, { GpuDatetimeSearchIterator } from '../wasm/wasm_pkg.js';
import type { WorkerRequest, WorkerResponse } from './types';
import type {
  MtseedDatetimeSearchParams,
  GpuSearchBatch,
  DatetimeSearchContext,
  DateRangeParams,
  MtSeed,
} from '../wasm/wasm_pkg.js';

// WASM バイナリの絶対パス（public/wasm/ から配信）
const WASM_URL = '/wasm/wasm_pkg_bg.wasm';

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
      await handleInit();
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

      // GPU Worker は mtseed-datetime または gpu-mtseed-datetime のみサポート
      if (data.task.kind === 'gpu-mtseed-datetime') {
        // 新 API: DatetimeSearchContext ベース
        await runGpuSearchWithContext(
          data.taskId,
          data.task.context,
          data.task.targetSeeds,
          data.task.dateRange
        );
      } else if (data.task.kind === 'mtseed-datetime') {
        // 旧 API: MtseedDatetimeSearchParams ベース (互換性維持)
        await runGpuSearch(data.taskId, data.task.params);
      } else {
        postResponse({
          type: 'error',
          taskId: data.taskId,
          message: `GPU Worker only supports mtseed-datetime or gpu-mtseed-datetime, got: ${data.task.kind}`,
        });
        return;
      }
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

async function handleInit(): Promise<void> {
  try {
    // Worker 内で独立して WASM を初期化
    await initWasm(WASM_URL);
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
 * GPU 検索実行 (新 API)
 *
 * DatetimeSearchContext ベースの API を使用。
 * 複数の組み合わせ (Timer0 × VCount × KeyCode) を GPU 側で順次処理する。
 */
async function runGpuSearchWithContext(
  taskId: string,
  context: DatetimeSearchContext,
  targetSeeds: MtSeed[],
  dateRange: DateRangeParams
): Promise<void> {
  cancelRequested = false;

  try {
    // GpuDatetimeSearchIterator.create() は新 API
    currentIterator = await GpuDatetimeSearchIterator.create(context, targetSeeds, dateRange);

    await executeSearchLoop(taskId);
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

/**
 * GPU 検索実行 (旧 API - 互換性維持)
 *
 * GpuDatetimeSearchIterator を使用して AsyncIterator パターンで検索を実行。
 * 各バッチ完了時に進捗を報告し、結果を収集して返却する。
 */
async function runGpuSearch(taskId: string, params: MtseedDatetimeSearchParams): Promise<void> {
  cancelRequested = false;

  try {
    // 旧 API: MtseedDatetimeSearchParams を直接渡す
    // wasm_bindgen の create(params) は JS からは引数1つで呼ばれる (旧シグネチャ)
    // Note: Rust 側では new() として定義されているが、wasm_bindgen は create として export している
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new() は TypeScript 型定義に含まれていない後方互換 API
    currentIterator = await (GpuDatetimeSearchIterator as any).new(params);

    await executeSearchLoop(taskId);
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

/**
 * 検索ループ実行 (共通処理)
 */
async function executeSearchLoop(taskId: string): Promise<void> {
  if (!currentIterator) {
    return;
  }

  let batch: GpuSearchBatch | undefined;
  const startTime = performance.now();
  let lastProgressTime = startTime;

  while (!cancelRequested && !currentIterator.is_done) {
    batch = await currentIterator.next();

    if (!batch) {
      break;
    }

    const now = performance.now();
    const elapsedMs = now - startTime;

    // 進捗報告
    postResponse({
      type: 'progress',
      taskId,
      progress: {
        processed: Number(batch.processed_count),
        total: Number(batch.total_count),
        percentage: batch.progress * 100,
        elapsedMs,
        estimatedRemainingMs:
          batch.progress > 0 ? elapsedMs * ((1 - batch.progress) / batch.progress) : 0,
        throughput: batch.throughput,
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

    lastProgressTime = now;
  }

  // キャンセルされた場合もエラーではなく完了として扱う
  // (void to suppress unused variable warning)
  void lastProgressTime;

  // 完了
  postResponse({
    type: 'done',
    taskId,
  });
}

function postResponse(response: WorkerResponse): void {
  self.postMessage(response);
}
