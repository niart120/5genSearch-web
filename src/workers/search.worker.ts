/**
 * CPU 検索 Worker
 *
 * SIMD 最適化された WASM を使用して検索を実行する。
 * 各 Worker インスタンスは独立した WASM インスタンスを持つ。
 */

import { initSync } from '@wasm';
import {
  EggDatetimeSearcher,
  MtseedDatetimeSearcher,
  MtseedSearcher,
  TrainerInfoSearcher,
} from '@wasm';
import type {
  EggDatetimeSearchParams,
  MtseedDatetimeSearchParams,
  MtseedSearchParams,
  TrainerInfoSearchParams,
} from '@wasm';
import type { WorkerRequest, WorkerResponse, SearchTask, ProgressInfo } from './types';

// =============================================================================
// State
// =============================================================================

let initialized = false;
let cancelled = false;

// =============================================================================
// Message Handler
// =============================================================================

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { data } = e;

  switch (data.type) {
    case 'init':
      handleInit(data.wasmBytes);
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
      cancelled = false;
      void runSearch(data.taskId, data.task);
      break;

    case 'cancel':
      cancelled = true;
      break;
  }
};

// =============================================================================
// Init Handler
// =============================================================================

function handleInit(wasmBytes: ArrayBuffer): void {
  try {
    initSync(wasmBytes);
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
// Search Execution
// =============================================================================

async function runSearch(taskId: string, task: SearchTask): Promise<void> {
  const startTime = performance.now();

  try {
    switch (task.kind) {
      case 'egg-datetime':
        await runEggDatetimeSearch(taskId, task.params, startTime);
        break;
      case 'mtseed-datetime':
        await runMtseedDatetimeSearch(taskId, task.params, startTime);
        break;
      case 'mtseed':
        await runMtseedSearch(taskId, task.params, startTime);
        break;
      case 'trainer-info':
        await runTrainerInfoSearch(taskId, task.params, startTime);
        break;
    }
  } catch (err) {
    postResponse({
      type: 'error',
      taskId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// =============================================================================
// Egg Datetime Search
// =============================================================================

async function runEggDatetimeSearch(
  taskId: string,
  params: EggDatetimeSearchParams,
  startTime: number
): Promise<void> {
  const searcher = new EggDatetimeSearcher(params);

  try {
    while (!searcher.is_done && !cancelled) {
      const batch = searcher.next_batch(1000);

      if (batch.results.length > 0) {
        postResponse({
          type: 'result',
          taskId,
          resultType: 'egg',
          results: batch.results,
        });
      }

      postResponse({
        type: 'progress',
        taskId,
        progress: calculateProgress(batch.processed_count, batch.total_count, startTime),
      });

      await yieldToMain();
    }

    postResponse({ type: 'done', taskId });
  } finally {
    searcher.free();
  }
}

// =============================================================================
// Mtseed Datetime Search
// =============================================================================

async function runMtseedDatetimeSearch(
  taskId: string,
  params: MtseedDatetimeSearchParams,
  startTime: number
): Promise<void> {
  const searcher = new MtseedDatetimeSearcher(params);

  try {
    while (!searcher.is_done && !cancelled) {
      const batch = searcher.next_batch(1000);

      if (batch.results.length > 0) {
        postResponse({
          type: 'result',
          taskId,
          resultType: 'seed-origin',
          results: batch.results,
        });
      }

      postResponse({
        type: 'progress',
        taskId,
        progress: calculateProgress(batch.processed_count, batch.total_count, startTime),
      });

      await yieldToMain();
    }

    postResponse({ type: 'done', taskId });
  } finally {
    searcher.free();
  }
}

// =============================================================================
// Mtseed Search (IV Filter)
// =============================================================================

async function runMtseedSearch(
  taskId: string,
  params: MtseedSearchParams,
  startTime: number
): Promise<void> {
  const searcher = new MtseedSearcher(params);

  try {
    while (!searcher.is_done && !cancelled) {
      const batch = searcher.next_batch(0x10000);

      if (batch.candidates.length > 0) {
        postResponse({
          type: 'result',
          taskId,
          resultType: 'mtseed',
          results: batch.candidates,
        });
      }

      postResponse({
        type: 'progress',
        taskId,
        progress: calculateProgress(Number(batch.processed), Number(batch.total), startTime),
      });

      await yieldToMain();
    }

    postResponse({ type: 'done', taskId });
  } finally {
    searcher.free();
  }
}

// =============================================================================
// TrainerInfo Search
// =============================================================================

async function runTrainerInfoSearch(
  taskId: string,
  params: TrainerInfoSearchParams,
  startTime: number
): Promise<void> {
  const searcher = new TrainerInfoSearcher(params);

  try {
    while (!searcher.is_done && !cancelled) {
      const batch = searcher.next_batch(1000);

      if (batch.results.length > 0) {
        postResponse({
          type: 'result',
          taskId,
          resultType: 'trainer-info',
          results: batch.results,
        });
      }

      postResponse({
        type: 'progress',
        taskId,
        progress: calculateProgress(batch.processed_count, batch.total_count, startTime),
      });

      await yieldToMain();
    }

    postResponse({ type: 'done', taskId });
  } finally {
    searcher.free();
  }
}

// =============================================================================
// Utilities
// =============================================================================

function calculateProgress(processed: number, total: number, startTime: number): ProgressInfo {
  const elapsedMs = performance.now() - startTime;
  const percentage = total > 0 ? (processed / total) * 100 : 0;
  const throughput = elapsedMs > 0 ? (processed / elapsedMs) * 1000 : 0;
  const remaining = total - processed;
  const estimatedRemainingMs = throughput > 0 ? (remaining / throughput) * 1000 : 0;

  return {
    processed,
    total,
    percentage,
    elapsedMs,
    estimatedRemainingMs,
    throughput,
  };
}

/**
 * メインスレッドへ制御を戻す
 *
 * 長時間の同期処理を分割し、キャンセル処理やメッセージ受信を可能にする。
 */
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function postResponse(response: WorkerResponse): void {
  self.postMessage(response);
}
