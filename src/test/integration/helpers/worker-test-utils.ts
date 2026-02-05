/**
 * Worker 統合テスト用ヘルパー
 *
 * Browser Mode で実行される統合テストで使用するユーティリティ関数。
 * Worker は独自に WASM を fetch/初期化するため、メインスレッドからの
 * ArrayBuffer 転送は不要。
 */

import type { WorkerRequest, WorkerResponse, SearchTask } from '../../../workers/types';
import type {
  SeedOrigin,
  MtseedResult,
  EggDatetimeSearchResult,
  TrainerInfoSearchResult,
} from '../../../wasm/wasm_pkg.js';

// =============================================================================
// Types
// =============================================================================

/**
 * 検索結果の型
 */
export type SearchResults<T extends SearchTask['kind']> = T extends 'egg-datetime'
  ? EggDatetimeSearchResult[]
  : T extends 'mtseed-datetime'
    ? SeedOrigin[]
    : T extends 'mtseed'
      ? MtseedResult[]
      : T extends 'trainer-info'
        ? TrainerInfoSearchResult[]
        : never;

/**
 * テスト実行オプション
 */
export interface TestSearchOptions {
  /** タイムアウト (ms) */
  timeout?: number;
  /** 最初の結果で終了するか (デフォルト: false) */
  earlyReturn?: boolean;
}

// =============================================================================
// Worker Test Runner
// =============================================================================

/**
 * Worker で検索を実行し、結果を返す
 *
 * @param task 検索タスク
 * @param options オプション
 * @returns 検索結果
 */
export async function runSearchInWorker<T extends SearchTask['kind']>(
  task: Extract<SearchTask, { kind: T }>,
  options: TestSearchOptions = {}
): Promise<SearchResults<T>> {
  const { timeout = 30000, earlyReturn = false } = options;

  const worker = new Worker(new URL('../../../workers/search.worker.ts', import.meta.url), {
    type: 'module',
  });

  return new Promise<SearchResults<T>>((resolve, reject) => {
    const results: unknown[] = [];
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      worker.terminate();
    };

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Search timeout after ${timeout}ms`));
    }, timeout);

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      switch (e.data.type) {
        case 'ready':
          worker.postMessage({
            type: 'start',
            taskId: 'test-task',
            task,
          } as WorkerRequest);
          break;

        case 'result':
          results.push(...e.data.results);
          // 早期終了オプションが有効で結果があれば終了
          if (earlyReturn && results.length > 0) {
            cleanup();
            resolve(results as SearchResults<T>);
          }
          break;

        case 'done':
          cleanup();
          resolve(results as SearchResults<T>);
          break;

        case 'error':
          cleanup();
          reject(new Error(e.data.message));
          break;
      }
    };

    worker.onerror = (e) => {
      cleanup();
      reject(new Error(e.message));
    };

    // WASM 初期化を指示 (Worker が独自に fetch)
    worker.postMessage({ type: 'init' } as WorkerRequest);
  });
}

/**
 * Worker の初期化のみをテスト
 *
 * @returns 初期化が成功したかどうか
 */
export async function testWorkerInitialization(): Promise<boolean> {
  const worker = new Worker(new URL('../../../workers/search.worker.ts', import.meta.url), {
    type: 'module',
  });

  return new Promise<boolean>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      worker.terminate();
      reject(new Error('Worker initialization timeout'));
    }, 10000);

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.type === 'ready') {
        clearTimeout(timeoutId);
        worker.terminate();
        resolve(true);
      } else if (e.data.type === 'error') {
        clearTimeout(timeoutId);
        worker.terminate();
        reject(new Error(e.data.message));
      }
    };

    worker.onerror = (e) => {
      clearTimeout(timeoutId);
      worker.terminate();
      reject(new Error(e.message));
    };

    // WASM 初期化を指示 (Worker が独自に fetch)
    worker.postMessage({ type: 'init' } as WorkerRequest);
  });
}

// =============================================================================
// Test Data Helpers
// =============================================================================

/**
 * テスト用の DS 設定を作成
 */
export function createTestDsConfig() {
  return {
    mac: [0x8c, 0x56, 0xc5, 0x86, 0x15, 0x28] as [number, number, number, number, number, number],
    hardware: 'DsLite' as const,
    version: 'Black' as const,
    region: 'Jpn' as const,
  };
}

/**
 * テスト用の時刻範囲を作成
 */
export function createTestTimeRange(hourStart = 0, hourEnd = 23, minuteStart = 0, minuteEnd = 59) {
  return {
    hour_start: hourStart,
    hour_end: hourEnd,
    minute_start: minuteStart,
    minute_end: minuteEnd,
    second_start: 0,
    second_end: 59,
  };
}

/**
 * テスト用の検索範囲を作成
 */
export function createTestSearchRange(
  year: number,
  month: number,
  day: number,
  rangeSeconds = 86400
) {
  return {
    start_year: year,
    start_month: month,
    start_day: day,
    start_second_offset: 0,
    range_seconds: rangeSeconds,
  };
}

/**
 * テスト用の起動条件を作成
 */
export function createTestStartupCondition() {
  return {
    timer0: 0x0c79,
    vcount: 0x60,
    key_code: 0x2fff,
  };
}
