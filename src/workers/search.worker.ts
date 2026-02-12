/**
 * CPU 検索 Worker
 *
 * SIMD 最適化された WASM を使用して検索を実行する。
 * 各 Worker インスタンスは独立した WASM インスタンスを持つ。
 */

import initWasm, {
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

// WASM バイナリの絶対パス（public/wasm/ から配信）
const WASM_URL = '/wasm/wasm_pkg_bg.wasm';

// =============================================================================
// State
// =============================================================================

let initialized = false;
let cancelled = false;

// =============================================================================
// Message Handler
// =============================================================================

globalThis.addEventListener('message', (e: MessageEvent<WorkerRequest>) => {
  const { data } = e;

  switch (data.type) {
    case 'init': {
      void handleInit();
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

// =============================================================================
// Init Handler
// =============================================================================

async function handleInit(): Promise<void> {
  try {
    // Worker 内で独立して WASM を初期化
    // 絶対パスで public/wasm/ から WASM バイナリを取得
    await initWasm({ module_or_path: WASM_URL });

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
      const batch = searcher.next_batch(500_000);

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
      const batch = searcher.next_batch(1_000_000);

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
      const batch = searcher.next_batch(1_000_000);

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
