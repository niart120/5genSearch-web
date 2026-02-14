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
 * 検索ループは next_batch() ごとにイベントループへ制御を返す。
 * バッチサイズが計算粒度の唯一の調整パラメータとなる。
 *
 * 進捗 postMessage は PROGRESS_INTERVAL_MS で間引き、
 * Worker 数が多い環境でのメインスレッド負荷を抑制する。
 */

/** 進捗 postMessage 送信間隔 (ms) */
const PROGRESS_INTERVAL_MS = 500;

/**
 * 検索種別ごとのバッチサイズ
 *
 * 1 バッチ = 1 回の next_batch() 呼び出しで処理する要素数。
 * バッチ実行後に毎回 yield するため、この値が応答性と計算効率のトレードオフを決める。
 *
 * - 大きい値: yield 頻度が下がり計算効率が上がるが、cancel 応答が遅れる
 * - 小さい値: 応答性が上がるが yield オーバーヘッドの割合が増える
 */
const BATCH_SIZE = {
  /** EggDatetime: SHA-1 + MT init/twist + GameOffset + advance×卵生成 (最重量, ~1ms/batch) */
  eggDatetime: 5000,
  /** MtseedDatetime: SHA-1 SIMD 4並列 + BTreeSet lookup (最軽量, ~5ms/batch) */
  mtseedDatetime: 500_000,
  /** Mtseed: MT init(624) + twist(624) + offset消費 + IV filter (中程度, ~65ms/batch) */
  mtseed: 500_000,
  /** TrainerInfo: SHA-1 SIMD 4並列 + LCG ~20-50消費 + filter (軽量, ~15ms/batch) */
  trainerInfo: 1_000_000,
} as const;

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
 * next_batch() ごとにイベントループへ制御を返し、cancel メッセージの受信を可能にする。
 * 進捗報告は PROGRESS_INTERVAL_MS で間引く。
 * バッチサイズが計算粒度の唯一の調整パラメータ。
 */
async function runSearchLoop<T extends { readonly is_done: boolean; free(): void }>(
  taskId: string,
  searcher: T,
  startTime: number,
  processBatch: (searcher: T) => BatchProgress
): Promise<void> {
  let lastProgressTime = performance.now();
  let lastProgress: BatchProgress | undefined;

  try {
    while (!searcher.is_done && !cancelled) {
      lastProgress = processBatch(searcher);

      // 進捗スロットリング
      const now = performance.now();
      if (now - lastProgressTime >= PROGRESS_INTERVAL_MS) {
        postResponse({
          type: 'progress',
          taskId,
          progress: calculateProgress(lastProgress.processed, lastProgress.total, startTime),
        });
        lastProgressTime = now;
      }

      // バッチごとに制御を返す (cancel メッセージ受信)
      await yieldToMain();
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
    const batch = s.next_batch(BATCH_SIZE.eggDatetime);
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
    const batch = s.next_batch(BATCH_SIZE.mtseedDatetime);
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
    const batch = s.next_batch(BATCH_SIZE.mtseed);
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
    const batch = s.next_batch(BATCH_SIZE.trainerInfo);
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
