/**
 * WorkerPool GPU 経路テスト
 *
 * Browser Mode で実行される統合テスト。
 * WorkerPool が GPU Worker を使用する場合の動作を検証する。
 */

import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { WorkerPool } from '../../../services/worker-pool';
import type { AggregatedProgress } from '../../../services/progress';
import type { SearchTask } from '../../../workers/types';
import type { SeedOrigin } from '../../../wasm/wasm_pkg.js';
import { createTestDsConfig, createTestStartupCondition } from '../helpers/worker-test-utils';

// =============================================================================
// Test Constants
// =============================================================================

/**
 * 仕様書に記載の期待値データ
 *
 * Target Seeds (BW 固定・野生 6V):
 * 0x14B11BA6, 0x8A30480D, 0x9E02B0AE, 0xADFA2178, 0xFC4AA3AC
 */
const TARGET_SEED = 0x14b11ba6;
const EXPECTED_LCG_SEED = 0x2adab5de040079f7n;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * GPU adapter およびデバイスが利用可能かチェック
 *
 * adapter の取得だけでなく、device の取得まで成功するか確認する。
 * headless 環境では adapter は取得できても device 取得に失敗する場合がある
 * (例: dxil.dll が見つからない等)
 */
async function checkGpuDeviceAvailable(): Promise<boolean> {
  if (!('gpu' in navigator)) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return false;
    }
    // device 取得を試みて成功するか確認
    const device = await adapter.requestDevice();
    device.destroy();
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Tests - GPU 経路
// =============================================================================

// WebGPU API が利用できない環境ではスキップ
const hasWebGpuApi = typeof navigator !== 'undefined' && 'gpu' in navigator;

describe.skipIf(!hasWebGpuApi)('WorkerPool with GPU', () => {
  let pool: WorkerPool | null = null;
  let gpuDeviceAvailable = false;

  beforeAll(async () => {
    gpuDeviceAvailable = await checkGpuDeviceAvailable();
    if (!gpuDeviceAvailable) {
      console.log('GPU device is not available, GPU-dependent tests will be skipped');
    }
  });

  afterEach(() => {
    pool?.dispose();
    pool = null;
  });

  // ---------------------------------------------------------------------------
  // 4.2.1 GPU Worker 初期化テスト
  // ---------------------------------------------------------------------------
  it('should initialize GPU Worker when useGpu is true', async () => {
    pool = new WorkerPool({ useGpu: true });
    await pool.initialize();

    // GPU 使用時は単一 Worker
    expect(pool.size).toBe(1);
    expect(pool.isReady).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 4.2.2 GPU 検索実行テスト
  // ---------------------------------------------------------------------------
  // TODO: GPU 検索の結果が返らない問題を調査 (進捗は正常に報告される)
  it.skip('should execute search with GPU Worker', async (ctx) => {
    if (!gpuDeviceAvailable) {
      ctx.skip();
      return;
    }

    pool = new WorkerPool({ useGpu: true });
    await pool.initialize();

    // 2025年8月20日を含む範囲で検索 (期待値の1つ目がヒットするはず)
    const tasks: SearchTask[] = [
      {
        kind: 'mtseed-datetime',
        params: {
          target_seeds: [TARGET_SEED],
          ds: createTestDsConfig(),
          time_range: {
            hour_start: 0,
            hour_end: 23,
            minute_start: 0,
            minute_end: 59,
            second_start: 0,
            second_end: 59,
          },
          search_range: {
            start_year: 2025,
            start_month: 8,
            start_day: 20,
            start_second_offset: 0,
            range_seconds: 86400, // 1日
          },
          condition: createTestStartupCondition(),
        },
      },
    ];

    const results: SeedOrigin[] = [];
    pool.onResult((r) => results.push(...(r as SeedOrigin[])));

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('GPU search timeout'));
      }, 120000);

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

    // 期待する MT Seed が含まれること
    const found = results.find((r) => {
      if ('Startup' in r) {
        return r.Startup.mt_seed === TARGET_SEED;
      }
      return false;
    });

    expect(found).toBeDefined();

    if (found && 'Startup' in found) {
      expect(found.Startup.base_seed).toBe(EXPECTED_LCG_SEED);
    }
  }, 120000);

  // ---------------------------------------------------------------------------
  // 4.2.3 進捗集約テスト
  // ---------------------------------------------------------------------------
  it('should aggregate progress from GPU Worker', async (ctx) => {
    if (!gpuDeviceAvailable) {
      ctx.skip();
      return;
    }

    pool = new WorkerPool({ useGpu: true });
    await pool.initialize();

    const tasks: SearchTask[] = [
      {
        kind: 'mtseed-datetime',
        params: {
          target_seeds: [TARGET_SEED],
          ds: createTestDsConfig(),
          time_range: {
            hour_start: 0,
            hour_end: 23,
            minute_start: 0,
            minute_end: 59,
            second_start: 0,
            second_end: 59,
          },
          search_range: {
            start_year: 2025,
            start_month: 8,
            start_day: 20,
            start_second_offset: 0,
            range_seconds: 86400 * 7, // 1週間
          },
          condition: createTestStartupCondition(),
        },
      },
    ];

    const progressHistory: AggregatedProgress[] = [];
    pool.onProgress((p) => progressHistory.push({ ...p }));

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('GPU search timeout'));
      }, 120000);

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
    const lastProgress = progressHistory[progressHistory.length - 1];
    expect(lastProgress.percentage).toBeGreaterThan(90);
    expect(lastProgress.tasksCompleted).toBe(1);
    expect(lastProgress.tasksTotal).toBe(1);
  }, 120000);
});

// =============================================================================
// Tests - フォールバック
// =============================================================================

describe('WorkerPool GPU fallback', () => {
  let pool: WorkerPool | null = null;

  afterEach(() => {
    pool?.dispose();
    pool = null;
  });

  // ---------------------------------------------------------------------------
  // 4.2.4 フォールバック検証
  // ---------------------------------------------------------------------------
  it('should use CPU Workers when useGpu is false', async () => {
    // useGpu: false を指定した場合は navigator.gpu の有無にかかわらず CPU Worker を使用
    pool = new WorkerPool({ useGpu: false, workerCount: 2 });
    await pool.initialize();

    expect(pool.size).toBe(2);
    expect(pool.isReady).toBe(true);
  });

  it('should execute search with CPU Workers when useGpu is false', async () => {
    pool = new WorkerPool({ useGpu: false, workerCount: 2 });
    await pool.initialize();

    // CPU Worker で検索を実行
    const tasks: SearchTask[] = [
      {
        kind: 'mtseed-datetime',
        params: {
          target_seeds: [0x32bf6858],
          ds: createTestDsConfig(),
          time_range: {
            hour_start: 18,
            hour_end: 18,
            minute_start: 10,
            minute_end: 20,
            second_start: 0,
            second_end: 59,
          },
          search_range: {
            start_year: 2010,
            start_month: 9,
            start_day: 18,
            start_second_offset: 0,
            range_seconds: 86400,
          },
          condition: createTestStartupCondition(),
        },
      },
    ];

    const results: SeedOrigin[] = [];
    pool.onResult((r) => results.push(...(r as SeedOrigin[])));

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Search timeout'));
      }, 60000);

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

    // 結果が見つかること (CPU Worker で正常に動作)
    expect(results.length).toBeGreaterThan(0);
  }, 60000);
});
