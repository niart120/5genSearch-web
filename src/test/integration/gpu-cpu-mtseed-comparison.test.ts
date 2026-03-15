/**
 * GPU vs CPU MtseedDatetimeSearch 100年全範囲比較テスト
 *
 * 同一条件下で GPU / CPU の mtseed-datetime 検索を実行し、
 * 結果の一致を検証する。
 *
 * 条件:
 * - Version: Black, Region: Jpn, Hardware: DsLite
 * - MAC: 8C:56:C5:86:15:28
 * - Timer0: 0x0C79, VCount: 0x60
 * - キー入力なし (KeyCode: 0x2FFF)
 * - 日付範囲: 2000-01-01 〜 2099-12-31
 * - 時間範囲: 00:00:00 〜 23:59:59
 * - Target Seeds: BW 固定・野生 6V (5件)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generate_mtseed_search_tasks } from '../../wasm/wasm_pkg.js';
import type { DatetimeSearchContext, MtSeed, SeedOrigin } from '../../wasm/wasm_pkg.js';
import type { WorkerRequest, WorkerResponse, MtseedDatetimeSearchTask } from '../../workers/types';
import { runSearchInWorker, createTestDsConfig } from './helpers/worker-test-utils';

// =============================================================================
// Constants
// =============================================================================

/** BW 固定・野生 6V の既知 MT Seed */
const TARGET_SEEDS_6V: MtSeed[] = [
  0x14_b1_1b_a6, 0x8a_30_48_0d, 0x9e_02_b0_ae, 0xad_fa_21_78, 0xfc_4a_a3_ac,
];

/**
 * 100年全探索で期待される結果 (外部ツールにて検証済み)
 */
const EXPECTED_RESULTS = [
  {
    mtSeed: 0x14_b1_1b_a6,
    baseSeed: 0x2a_da_b5_de_04_00_79_f7n,
    year: 2025,
    month: 8,
    day: 20,
    hour: 6,
    minute: 41,
    second: 1,
  },
  {
    mtSeed: 0xfc_4a_a3_ac,
    baseSeed: 0x6c_53_13_39_9f_21_20_06n,
    year: 2039,
    month: 4,
    day: 21,
    hour: 17,
    minute: 45,
    second: 41,
  },
  {
    mtSeed: 0x8a_30_48_0d,
    baseSeed: 0xe8_87_8c_0c_da_e4_5c_d6n,
    year: 2093,
    month: 9,
    day: 7,
    hour: 11,
    minute: 46,
    second: 58,
  },
];

/** 検索コンテキスト (GPU / CPU 共通) */
const SEARCH_CONTEXT: DatetimeSearchContext = {
  ds: createTestDsConfig(),
  date_range: {
    start_year: 2000,
    start_month: 1,
    start_day: 1,
    end_year: 2099,
    end_month: 12,
    end_day: 31,
  },
  time_range: {
    hour_start: 0,
    hour_end: 23,
    minute_start: 0,
    minute_end: 59,
    second_start: 0,
    second_end: 59,
  },
  ranges: [
    {
      timer0_min: 0x0c_79,
      timer0_max: 0x0c_79,
      vcount_min: 0x60,
      vcount_max: 0x60,
    },
  ],
  key_spec: { available_buttons: [] },
};

/** テストタイムアウト: 10分 */
const TEST_TIMEOUT = 600_000;

// =============================================================================
// Helpers
// =============================================================================

interface NormalizedResult {
  mtSeed: number;
  baseSeed: bigint;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  timer0: number;
  vcount: number;
}

/** SeedOrigin から比較用の正規化オブジェクトを生成 */
function normalizeSeedOrigin(origin: SeedOrigin): NormalizedResult {
  if (!('Startup' in origin)) {
    throw new Error(`Expected Startup variant, got: ${JSON.stringify(origin)}`);
  }
  const { mt_seed, base_seed, datetime, condition } = origin.Startup;
  return {
    mtSeed: mt_seed,
    baseSeed: base_seed,
    year: datetime.year,
    month: datetime.month,
    day: datetime.day,
    hour: datetime.hour,
    minute: datetime.minute,
    second: datetime.second,
    timer0: condition.timer0,
    vcount: condition.vcount,
  };
}

/** 結果を MT Seed → baseSeed の順でソート */
function sortResults(results: NormalizedResult[]): NormalizedResult[] {
  return results.toSorted((a, b) => {
    if (a.mtSeed !== b.mtSeed) return a.mtSeed - b.mtSeed;
    if (a.baseSeed < b.baseSeed) return -1;
    if (a.baseSeed > b.baseSeed) return 1;
    return 0;
  });
}

/** 結果を人間が読める文字列にフォーマット */
function formatResult(r: NormalizedResult): string {
  const date = `${r.year}/${String(r.month).padStart(2, '0')}/${String(r.day).padStart(2, '0')}`;
  const time = `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}:${String(r.second).padStart(2, '0')}`;
  return `MT:0x${r.mtSeed.toString(16).toUpperCase().padStart(8, '0')} LCG:0x${r.baseSeed.toString(16).toUpperCase().padStart(16, '0')} ${date} ${time} T0:0x${r.timer0.toString(16).toUpperCase()} VC:0x${r.vcount.toString(16).toUpperCase()}`;
}

// =============================================================================
// CPU Search Runner
// =============================================================================

async function runCpu100YearSearch(): Promise<SeedOrigin[]> {
  const NUM_WORKERS = 4;
  const tasks = generate_mtseed_search_tasks(SEARCH_CONTEXT, TARGET_SEEDS_6V, NUM_WORKERS);

  const searchPromises = tasks.map((params) => {
    const task: MtseedDatetimeSearchTask = { kind: 'mtseed-datetime', params };
    return runSearchInWorker(task, { timeout: TEST_TIMEOUT });
  });

  const results = await Promise.all(searchPromises);
  return results.flat();
}

// =============================================================================
// GPU Search Runner
// =============================================================================

function createGpuWorker(): Worker {
  return new Worker(new URL('../../workers/gpu.worker.ts', import.meta.url), {
    type: 'module',
  });
}

async function initGpuWorker(worker: Worker, timeout = 10_000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('GPU Worker initialization timeout'));
    }, timeout);

    const handler = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.type === 'ready') {
        clearTimeout(timeoutId);
        worker.removeEventListener('message', handler);
        resolve();
      } else if (e.data.type === 'error') {
        clearTimeout(timeoutId);
        worker.removeEventListener('message', handler);
        reject(new Error(e.data.message));
      }
    };

    worker.addEventListener('message', handler);
    worker.postMessage({ type: 'init' } as WorkerRequest);
  });
}

async function runGpu100YearSearch(): Promise<SeedOrigin[]> {
  const worker = createGpuWorker();
  await initGpuWorker(worker);

  return new Promise<SeedOrigin[]>((resolve, reject) => {
    const results: SeedOrigin[] = [];
    const timeoutId = setTimeout(() => {
      worker.postMessage({ type: 'cancel' } as WorkerRequest);
      worker.terminate();
      reject(new Error('GPU search timeout'));
    }, TEST_TIMEOUT);

    worker.addEventListener('message', (e: MessageEvent<WorkerResponse>) => {
      switch (e.data.type) {
        case 'result': {
          if (e.data.resultType === 'seed-origin') {
            results.push(...e.data.results);
          }
          break;
        }
        case 'done': {
          clearTimeout(timeoutId);
          worker.terminate();
          resolve(results);
          break;
        }
        case 'error': {
          clearTimeout(timeoutId);
          worker.terminate();
          reject(new Error(e.data.message));
          break;
        }
      }
    });

    worker.postMessage({
      type: 'start',
      taskId: 'gpu-100year',
      task: {
        kind: 'gpu-mtseed',
        context: SEARCH_CONTEXT,
        targetSeeds: TARGET_SEEDS_6V,
      },
    } as WorkerRequest);
  });
}

/** GPU device が実際に利用可能か確認 */
async function checkGpuDeviceAvailable(): Promise<boolean> {
  if (!('gpu' in navigator)) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return false;
    const device = await adapter.requestDevice();
    device.destroy();
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Tests
// =============================================================================

const hasWebGpuApi = typeof navigator !== 'undefined' && 'gpu' in navigator;

// CI 環境または重いテストを明示的に有効化していない場合はスキップ。
// ローカルで実行する場合は環境変数 RUN_HEAVY_TESTS=1 を設定する:
//   RUN_HEAVY_TESTS=1 pnpm test:run -- gpu-cpu-mtseed-comparison
const isHeavyTestEnabled = import.meta.env['RUN_HEAVY_TESTS'] === '1';

describe.skipIf(!isHeavyTestEnabled)('MtseedDatetimeSearch: GPU vs CPU 100年全探索比較', () => {
  let gpuDeviceAvailable = false;
  let cpuResults: NormalizedResult[] | undefined;
  let gpuResults: NormalizedResult[] | undefined;

  beforeAll(async () => {
    if (hasWebGpuApi) {
      gpuDeviceAvailable = await checkGpuDeviceAvailable();
    }
    if (!gpuDeviceAvailable) {
      console.log('[gpu-cpu comparison] GPU device unavailable — GPU tests will be skipped');
    }
  });

  // ---------------------------------------------------------------------------
  // CPU 100年全探索
  // ---------------------------------------------------------------------------
  it(
    'CPU: 100年全探索で期待する3件の結果を返す',
    async () => {
      const raw = await runCpu100YearSearch();
      cpuResults = sortResults(raw.map((origin) => normalizeSeedOrigin(origin)));

      console.log(`[CPU] ${cpuResults.length} results found:`);
      for (const r of cpuResults) {
        console.log(`  ${formatResult(r)}`);
      }

      expect(cpuResults).toHaveLength(EXPECTED_RESULTS.length);

      for (const expected of EXPECTED_RESULTS) {
        const found = cpuResults.find((r) => r.mtSeed === expected.mtSeed);
        expect(found, `MT Seed 0x${expected.mtSeed.toString(16)} not found`).toBeDefined();
        if (found) {
          expect(found.baseSeed).toBe(expected.baseSeed);
          expect(found.year).toBe(expected.year);
          expect(found.month).toBe(expected.month);
          expect(found.day).toBe(expected.day);
          expect(found.hour).toBe(expected.hour);
          expect(found.minute).toBe(expected.minute);
          expect(found.second).toBe(expected.second);
        }
      }
    },
    TEST_TIMEOUT
  );

  // ---------------------------------------------------------------------------
  // GPU 100年全探索
  // ---------------------------------------------------------------------------
  it.skipIf(!hasWebGpuApi)(
    'GPU: 100年全探索で期待する3件の結果を返す',
    async (ctx) => {
      if (!gpuDeviceAvailable) {
        ctx.skip();
        return;
      }

      const raw = await runGpu100YearSearch();
      gpuResults = sortResults(raw.map((origin) => normalizeSeedOrigin(origin)));

      console.log(`[GPU] ${gpuResults.length} results found:`);
      for (const r of gpuResults) {
        console.log(`  ${formatResult(r)}`);
      }

      expect(gpuResults).toHaveLength(EXPECTED_RESULTS.length);

      for (const expected of EXPECTED_RESULTS) {
        const found = gpuResults.find((r) => r.mtSeed === expected.mtSeed);
        expect(found, `MT Seed 0x${expected.mtSeed.toString(16)} not found`).toBeDefined();
        if (found) {
          expect(found.baseSeed).toBe(expected.baseSeed);
          expect(found.year).toBe(expected.year);
          expect(found.month).toBe(expected.month);
          expect(found.day).toBe(expected.day);
          expect(found.hour).toBe(expected.hour);
          expect(found.minute).toBe(expected.minute);
          expect(found.second).toBe(expected.second);
        }
      }
    },
    TEST_TIMEOUT
  );

  // ---------------------------------------------------------------------------
  // GPU vs CPU 結果比較
  // ---------------------------------------------------------------------------
  it.skipIf(!hasWebGpuApi)(
    'GPU と CPU の結果が完全に一致する',
    async (ctx) => {
      if (!gpuDeviceAvailable) {
        ctx.skip();
        return;
      }

      // 先行テストの結果がなければ再実行
      if (!cpuResults) {
        const raw = await runCpu100YearSearch();
        cpuResults = sortResults(raw.map((origin) => normalizeSeedOrigin(origin)));
      }
      if (!gpuResults) {
        const raw = await runGpu100YearSearch();
        gpuResults = sortResults(raw.map((origin) => normalizeSeedOrigin(origin)));
      }

      // 件数比較
      console.log(
        `[comparison] CPU: ${cpuResults.length} results, GPU: ${gpuResults.length} results`
      );

      if (cpuResults.length !== gpuResults.length) {
        console.log('[comparison] Result count mismatch — dumping both:');
        console.log('[CPU results]');
        for (const r of cpuResults) console.log(`  ${formatResult(r)}`);
        console.log('[GPU results]');
        for (const r of gpuResults) console.log(`  ${formatResult(r)}`);
      }

      expect(gpuResults).toHaveLength(cpuResults.length);

      // 各結果の完全一致
      for (const [i, cpu] of cpuResults.entries()) {
        const gpu = gpuResults[i];

        if (cpu.mtSeed !== gpu.mtSeed || cpu.baseSeed !== gpu.baseSeed) {
          console.log(`[comparison] Mismatch at index ${i}:`);
          console.log(`  CPU: ${formatResult(cpu)}`);
          console.log(`  GPU: ${formatResult(gpu)}`);
        }

        expect(gpu, `index ${i} mismatch`).toEqual(cpu);
      }
    },
    TEST_TIMEOUT
  );
});
