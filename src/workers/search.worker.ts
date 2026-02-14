/**
 * CPU 検索 Worker
 *
 * SIMD 最適化された WASM を使用して検索を実行する。
 * 各 Worker インスタンスは独立した WASM インスタンスを持つ。
 */

import {
  EggDatetimeSearcher,
  MtseedDatetimeSearcher,
  MtseedSearcher,
  TrainerInfoSearcher,
  generate_pokemon_list,
  generate_egg_list,
  health_check,
} from '../wasm/wasm_pkg.js';
import type {
  EggDatetimeSearchParams,
  MtseedDatetimeSearchParams,
  MtseedSearchParams,
  TrainerInfoSearchParams,
} from '../wasm/wasm_pkg.js';
import type {
  WorkerRequest,
  WorkerResponse,
  SearchTask,
  PokemonListTask,
  EggListTask,
  ProgressInfo,
} from './types';

// =============================================================================
// State
// =============================================================================

let initialized = false;
let cancelled = false;

// =============================================================================
// Batch Loop Timing
// =============================================================================

/**
 * 検索ループは同期的に WASM バッチを連続実行する。
 * 2 段階のタイマーで制御を行う:
 *
 * 1. **Yield** (YIELD_INTERVAL_MS):
 *    この間隔でイベントループに制御を返し、cancel メッセージの受信を可能にする。
 *
 * 2. **Progress** (PROGRESS_INTERVAL_MS ≥ YIELD_INTERVAL_MS):
 *    yield タイミングでこの間隔も超過していれば進捗を postMessage で送信する。
 *    Worker 数が多い環境でのメインスレッド負荷を抑制する。
 */

/** イベントループへの制御返却間隔 (ms) */
const YIELD_INTERVAL_MS = 50;

/** 進捗 postMessage 送信間隔 (ms) — yield の上位間隔 */
const PROGRESS_INTERVAL_MS = 500;

// =============================================================================
// Message Handler
// =============================================================================

globalThis.addEventListener('message', (e: MessageEvent<WorkerRequest>) => {
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
      cancelled = false;
      void runSearch(data.taskId, data.task);
      break;
    }

    case 'cancel': {
      cancelled = true;
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
    // WASM が正しく初期化されたか確認
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
// Search Execution
// =============================================================================

async function runSearch(taskId: string, task: SearchTask): Promise<void> {
  const startTime = performance.now();

  try {
    switch (task.kind) {
      case 'egg-datetime': {
        await runEggDatetimeSearch(taskId, task.params, startTime);
        break;
      }
      case 'mtseed-datetime': {
        await runMtseedDatetimeSearch(taskId, task.params, startTime);
        break;
      }
      case 'mtseed': {
        await runMtseedSearch(taskId, task.params, startTime);
        break;
      }
      case 'trainer-info': {
        await runTrainerInfoSearch(taskId, task.params, startTime);
        break;
      }
      case 'pokemon-list': {
        runPokemonListGeneration(taskId, task);
        break;
      }
      case 'egg-list': {
        runEggList(taskId, task);
        break;
      }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const taskInfo = JSON.stringify(task, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
    postResponse({
      type: 'error',
      taskId,
      message: `${errMsg} | task: ${taskInfo}`,
    });
  }
}

// =============================================================================
// Batch Search Loop (共通)
// =============================================================================

/** processBatch が返す進捗情報 */
interface BatchProgress {
  processed: number | bigint;
  total: number | bigint;
}

/**
 * バッチ検索の共通ループ
 *
 * yield/progress の時間制御を一箇所に集約する。
 * 各検索関数は processBatch コールバックでバッチ実行と結果送信のみを担当する。
 */
async function runSearchLoop<T extends { readonly is_done: boolean; free(): void }>(
  taskId: string,
  searcher: T,
  startTime: number,
  processBatch: (searcher: T) => BatchProgress
): Promise<void> {
  let lastYieldTime = performance.now();
  let lastProgressTime = performance.now();
  let lastProgress: BatchProgress | undefined;

  try {
    while (!searcher.is_done && !cancelled) {
      lastProgress = processBatch(searcher);

      const now = performance.now();

      // Yield チェックポイント: キャンセル受信 + 進捗報告
      if (now - lastYieldTime >= YIELD_INTERVAL_MS) {
        if (now - lastProgressTime >= PROGRESS_INTERVAL_MS) {
          postResponse({
            type: 'progress',
            taskId,
            progress: calculateProgress(lastProgress.processed, lastProgress.total, startTime),
          });
          lastProgressTime = now;
        }

        await yieldToMain();
        lastYieldTime = performance.now();
      }
    }

    // 最終進捗: 完了時の正確な数値をメインスレッドに通知
    if (lastProgress) {
      postResponse({
        type: 'progress',
        taskId,
        progress: calculateProgress(lastProgress.processed, lastProgress.total, startTime),
      });
    }
    postResponse({ type: 'done', taskId });
  } finally {
    searcher.free();
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
  await runSearchLoop(taskId, searcher, startTime, (s) => {
    const batch = s.next_batch(1000);
    if (batch.results.length > 0) {
      postResponse({ type: 'result', taskId, resultType: 'egg', results: batch.results });
    }
    return { processed: batch.processed_count, total: batch.total_count };
  });
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
  await runSearchLoop(taskId, searcher, startTime, (s) => {
    const batch = s.next_batch(500_000);
    if (batch.results.length > 0) {
      postResponse({
        type: 'result',
        taskId,
        resultType: 'seed-origin',
        results: batch.results,
      });
    }
    return { processed: batch.processed_count, total: batch.total_count };
  });
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
  await runSearchLoop(taskId, searcher, startTime, (s) => {
    const batch = s.next_batch(1_000_000);
    if (batch.candidates.length > 0) {
      postResponse({ type: 'result', taskId, resultType: 'mtseed', results: batch.candidates });
    }
    return { processed: batch.processed, total: batch.total };
  });
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
  await runSearchLoop(taskId, searcher, startTime, (s) => {
    const batch = s.next_batch(1_000_000);
    if (batch.results.length > 0) {
      postResponse({
        type: 'result',
        taskId,
        resultType: 'trainer-info',
        results: batch.results,
      });
    }
    return { processed: batch.processed_count, total: batch.total_count };
  });
}

// =============================================================================
// Pokemon List Generation
// =============================================================================

function runPokemonListGeneration(taskId: string, task: PokemonListTask): void {
  const results = generate_pokemon_list(task.origins, task.params, task.config, task.filter);

  postResponse({
    type: 'result',
    taskId,
    resultType: 'pokemon-list',
    results,
  });

  postResponse({ type: 'done', taskId });
}

// =============================================================================
// Egg List Generation
// =============================================================================

function runEggList(taskId: string, task: EggListTask): void {
  const results = generate_egg_list(task.origins, task.params, task.config, task.filter);

  postResponse({
    type: 'result',
    taskId,
    resultType: 'egg-list',
    results,
  });

  postResponse({ type: 'done', taskId });
}

// =============================================================================
// Utilities
// =============================================================================

function calculateProgress(
  processed: number | bigint,
  total: number | bigint,
  startTime: number
): ProgressInfo {
  // bigint を number に変換 (precision loss は許容)
  const processedNum = typeof processed === 'bigint' ? Number(processed) : processed;
  const totalNum = typeof total === 'bigint' ? Number(total) : total;

  const elapsedMs = performance.now() - startTime;
  const percentage = totalNum > 0 ? (processedNum / totalNum) * 100 : 0;
  const throughput = elapsedMs > 0 ? (processedNum / elapsedMs) * 1000 : 0;
  const remaining = totalNum - processedNum;
  const estimatedRemainingMs = throughput > 0 ? (remaining / throughput) * 1000 : 0;

  return {
    processed: processedNum,
    total: totalNum,
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
  globalThis.postMessage(response);
}
