/**
 * WorkerPool 統合テスト
 *
 * Browser Mode で実行される統合テスト。
 * WorkerPool の初期化・検索実行・キャンセル・進捗集約を検証する。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { WorkerPool } from '../../../services/worker-pool';
import type { AggregatedProgress } from '../../../services/progress';
import type { SearchTask } from '../../../workers/types';
import {
  createTestDsConfig,
  createTestTimeRange,
  createTestSearchRange,
  createTestStartupCondition,
} from '../helpers/worker-test-utils';

describe('WorkerPool', () => {
  let pool: WorkerPool | undefined;

  afterEach(() => {
    pool?.dispose();
  });

  it('should initialize all workers', async () => {
    pool = new WorkerPool({ useGpu: false, workerCount: 2 });
    await pool.initialize();

    expect(pool.size).toBe(2);
    expect(pool.isReady).toBe(true);
  });

  it('should use navigator.hardwareConcurrency by default', async () => {
    pool = new WorkerPool({ useGpu: false });
    await pool.initialize();

    const expectedCount = navigator.hardwareConcurrency ?? 4;
    expect(pool.size).toBe(expectedCount);
  });

  it('should execute search tasks and collect results', async () => {
    pool = new WorkerPool({ useGpu: false, workerCount: 2 });
    await pool.initialize();

    // MtseedDatetime タスクを作成
    const tasks: SearchTask[] = [
      {
        kind: 'mtseed-datetime',
        params: {
          target_seeds: [0x32_bf_68_58],
          ds: createTestDsConfig(),
          time_range: {
            hour_start: 18,
            hour_end: 18,
            minute_start: 10,
            minute_end: 20,
            second_start: 0,
            second_end: 59,
          },
          search_range: createTestSearchRange(2010, 9, 18, 86_400),
          condition: createTestStartupCondition(),
        },
      },
    ];

    const results: unknown[] = [];
    pool.onResult((r) => results.push(...r));

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Test timeout'));
      }, 60_000);

      pool!.onComplete(() => {
        clearTimeout(timeout);
        resolve();
      });

      pool!.onError((e) => {
        clearTimeout(timeout);
        reject(e);
      });

      pool!.start(tasks);
    });

    // 結果が見つかること
    expect(results.length).toBeGreaterThan(0);
  });

  it('should aggregate progress from multiple workers', async () => {
    pool = new WorkerPool({ useGpu: false, workerCount: 2 });
    await pool.initialize();

    // 2つのタスクを作成
    const tasks: SearchTask[] = [
      {
        kind: 'mtseed-datetime',
        params: {
          target_seeds: [0x32_bf_68_58],
          ds: createTestDsConfig(),
          time_range: createTestTimeRange(0, 1),
          search_range: createTestSearchRange(2010, 9, 18, 3600),
          condition: createTestStartupCondition(),
        },
      },
      {
        kind: 'mtseed-datetime',
        params: {
          target_seeds: [0x32_bf_68_58],
          ds: createTestDsConfig(),
          time_range: createTestTimeRange(2, 3),
          search_range: createTestSearchRange(2010, 9, 18, 3600),
          condition: createTestStartupCondition(),
        },
      },
    ];

    const progressHistory: AggregatedProgress[] = [];
    pool.onProgress((p) => progressHistory.push({ ...p }));

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Test timeout'));
      }, 60_000);

      pool!.onComplete(() => {
        clearTimeout(timeout);
        resolve();
      });

      pool!.onError((e) => {
        clearTimeout(timeout);
        reject(e);
      });

      pool!.start(tasks);
    });

    // 進捗が報告されること
    expect(progressHistory.length).toBeGreaterThan(0);

    // 最終進捗が高い値であること
    const lastProgress = progressHistory.at(-1)!;
    expect(lastProgress.percentage).toBeGreaterThan(90);
    expect(lastProgress.tasksCompleted).toBe(2);
    expect(lastProgress.tasksTotal).toBe(2);
  });

  it('should cancel ongoing search', async () => {
    pool = new WorkerPool({ useGpu: false, workerCount: 2 });
    await pool.initialize();

    // 長時間かかるタスク
    const tasks: SearchTask[] = [
      {
        kind: 'mtseed-datetime',
        params: {
          target_seeds: [0x12_34_56_78],
          ds: createTestDsConfig(),
          time_range: createTestTimeRange(),
          search_range: createTestSearchRange(2010, 1, 1, 86_400 * 30), // 30日分
          condition: createTestStartupCondition(),
        },
      },
    ];

    let progressCount = 0;
    pool.onProgress(() => {
      progressCount++;
      if (progressCount >= 3) {
        pool!.cancel();
      }
    });

    await new Promise<void>((resolve) => {
      pool!.onComplete(() => resolve());
      pool!.start(tasks);

      // キャンセル後、タイムアウトで解決
      setTimeout(resolve, 5000);
    });

    // キャンセルにより早期終了
    expect(progressCount).toBeGreaterThanOrEqual(3);
  });

  it('should handle errors gracefully', async () => {
    pool = new WorkerPool({ useGpu: false, workerCount: 1 });
    await pool.initialize();

    // 不正なパラメータ (target_seeds が空)
    const tasks: SearchTask[] = [
      {
        kind: 'mtseed-datetime',
        params: {
          target_seeds: [], // エラーになるはず
          ds: createTestDsConfig(),
          time_range: createTestTimeRange(),
          search_range: createTestSearchRange(2010, 9, 18, 86_400),
          condition: createTestStartupCondition(),
        },
      },
    ];

    const errorPromise = new Promise<Error>((resolve) => {
      pool!.onError(resolve);
    });

    pool.start(tasks);

    const error = await errorPromise;
    expect(error).toBeInstanceOf(Error);
  });

  it('should dispose workers correctly', async () => {
    pool = new WorkerPool({ useGpu: false, workerCount: 2 });
    await pool.initialize();

    expect(pool.size).toBe(2);

    pool.dispose();

    expect(pool.size).toBe(0);
    expect(pool.isReady).toBe(false);
  });
});
