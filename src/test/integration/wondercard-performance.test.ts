import { expect, it } from 'vitest';
import { WonderCardDatetimeSearcher } from '@/wasm/wasm_pkg.js';
import type {
  CoreDataFilter,
  WonderCardBatchLimits,
  WonderCardDatetimeSearchParams,
} from '@/wasm/wasm_pkg.js';
import {
  createTestDsConfig,
  createTestSearchSpace,
  createTestStartupCondition,
} from './helpers/worker-test-utils';
import type {
  BatchBenchmarkRequest,
  BatchBenchmarkResponse,
} from './helpers/batch-performance.worker';

const BASELINE_LIMITS: WonderCardBatchLimits = { max_candidates: 1024, max_results: 256 };

const noMatchFilter: CoreDataFilter = {
  iv: {
    hp: [31, 31],
    atk: [31, 31],
    def: [31, 31],
    spa: [31, 31],
    spd: [31, 31],
    spe: [31, 31],
  },
  natures: undefined,
  gender: undefined,
  ability_slot: undefined,
  shiny: undefined,
  stats: undefined,
};

const practicalFilter: CoreDataFilter = {
  iv: {
    hp: [20, 31],
    atk: [20, 31],
    def: [20, 31],
    spa: [0, 31],
    spd: [20, 31],
    spe: [20, 31],
  },
  natures: undefined,
  gender: undefined,
  ability_slot: undefined,
  shiny: undefined,
  stats: undefined,
};

function params(
  filter: CoreDataFilter | undefined,
  rangeSeconds: number,
  maxAdvance = 31
): WonderCardDatetimeSearchParams {
  return {
    ds: createTestDsConfig(),
    search_space: createTestSearchSpace(2010, 9, 18, rangeSeconds),
    condition: createTestStartupCondition(),
    wondercard_params: {
      trainer: { tid: 12_345, sid: 54_321 },
      species_id: 25,
      level: 50,
      fixed_ivs: [undefined, undefined, undefined, undefined, undefined, undefined],
      fixed_nature: undefined,
      fixed_gender: undefined,
      fixed_ability_slot: undefined,
      shiny_policy: 'Random',
    },
    gen_config: {
      version: 'Black',
      game_start: {
        start_mode: 'Continue',
        save: 'WithSave',
        memory_link: 'Disabled',
        shiny_charm: 'NotObtained',
      },
      user_offset: 0,
      max_advance: maxAdvance,
    },
    filter,
  };
}

interface Measurement {
  elapsedMs: number;
  maxBatchMs: number;
  p95BatchMs: number;
  batchCount: number;
  processed: number;
  matches: number;
}

function percentile95(values: number[]): number {
  return values.toSorted((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1] ?? 0;
}

function measureDirect(
  searchParams: WonderCardDatetimeSearchParams,
  limits: WonderCardBatchLimits
) {
  const searcher = new WonderCardDatetimeSearcher(searchParams);
  const batchTimes: number[] = [];
  let matches = 0;
  let processed = 0;
  const start = performance.now();
  try {
    while (!searcher.is_done) {
      const batchStart = performance.now();
      const batch = searcher.next_batch(limits);
      batchTimes.push(performance.now() - batchStart);
      matches += batch.results.length;
      processed = Number(batch.processed_count);
    }
  } finally {
    searcher.free();
  }
  const elapsedMs = performance.now() - start;
  return {
    elapsedMs,
    maxBatchMs: Math.max(...batchTimes),
    p95BatchMs: percentile95(batchTimes),
    batchCount: batchTimes.length,
    processed,
    matches,
  } satisfies Measurement;
}

async function measureWorker(
  searchParams: WonderCardDatetimeSearchParams,
  limits: WonderCardBatchLimits
): Promise<Measurement> {
  const worker = new Worker(new URL('helpers/batch-performance.worker.ts', import.meta.url), {
    type: 'module',
  });
  const start = performance.now();
  return new Promise((resolve, reject) => {
    let matches = 0;
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Wonder Card benchmark Worker timed out'));
    }, 30_000);
    const cleanup = () => {
      clearTimeout(timeout);
      worker.terminate();
    };
    worker.addEventListener('error', (event) => {
      cleanup();
      reject(new Error(event.message));
    });
    worker.addEventListener('message', (event: MessageEvent<BatchBenchmarkResponse>) => {
      const response = event.data;
      if (response.type === 'ready') {
        worker.postMessage({
          kind: 'wondercard',
          params: searchParams,
          limits,
        } satisfies BatchBenchmarkRequest);
      } else if (response.type === 'result') {
        matches += response.results.length;
      } else if (response.type === 'error') {
        cleanup();
        reject(new Error(response.message));
      } else if (response.type === 'done') {
        const elapsedMs = performance.now() - start;
        cleanup();
        resolve({
          elapsedMs,
          maxBatchMs: response.maxBatchMs,
          p95BatchMs: response.p95BatchMs,
          batchCount: response.batchCount,
          processed: response.processed,
          matches,
        });
      }
    });
  });
}

// 本番 WASM をビルドし、明示的に有効化して単独実行する。
// $env:VITE_WONDERCARD_BENCH = '1'
// pnpm exec vitest run --project integration src/test/integration/wondercard-performance.test.ts
it.skipIf(import.meta.env.VITE_WONDERCARD_BENCH !== '1')(
  'compares Wonder Card WASM batch limits in Chromium',
  async () => {
    const sparseParams = params(noMatchFilter, 8192);
    const denseParams = params(undefined, 2048);
    const practicalParams = params(practicalFilter, 86_400, 30);
    const requestedLimits = { max_candidates: 262_144, max_results: 8192 } as const;
    const cases = [
      { scenario: 'requested-sparse', params: sparseParams, limits: requestedLimits },
      { scenario: 'requested-dense', params: denseParams, limits: requestedLimits },
      { scenario: 'practical-requested', params: practicalParams, limits: requestedLimits },
      {
        scenario: 'practical-balanced',
        params: practicalParams,
        limits: { max_candidates: 65_536, max_results: 8192 },
      },
      ...[1024, 4096, 16_384, 65_536, 262_144].map((maxCandidates) => ({
        scenario: 'sparse',
        params: sparseParams,
        limits: { max_candidates: maxCandidates, max_results: 65_536 },
      })),
      ...[256, 1024, 4096, 8192, 16_384].map((maxResults) => ({
        scenario: 'dense',
        params: denseParams,
        limits: { max_candidates: 65_536, max_results: maxResults },
      })),
    ] as const;

    for (const benchmark of cases) {
      // 初回のコンパイル・キャッシュ効果を計測から外す。
      measureDirect(benchmark.params, benchmark.limits);
      const result = measureDirect(benchmark.params, benchmark.limits);
      expect(result.processed).toBeGreaterThan(0);
      console.log(
        JSON.stringify({
          runner: 'direct-wasm',
          scenario: benchmark.scenario,
          limits: benchmark.limits,
          candidatesPerSecond: (result.processed / result.elapsedMs) * 1000,
          ...result,
        })
      );
    }

    const workerCases = [
      { scenario: 'sparse-baseline', params: sparseParams, limits: BASELINE_LIMITS },
      { scenario: 'dense-baseline', params: denseParams, limits: BASELINE_LIMITS },
      { scenario: 'practical-baseline', params: practicalParams, limits: BASELINE_LIMITS },
      ...cases,
    ] as const;
    for (const benchmark of workerCases) {
      const direct = measureDirect(benchmark.params, benchmark.limits);
      const worker = await measureWorker(benchmark.params, benchmark.limits);
      expect(worker.matches).toBe(direct.matches);
      console.log(
        JSON.stringify({
          runner: 'benchmark-worker',
          scenario: benchmark.scenario,
          limits: benchmark.limits,
          candidatesPerSecond: (worker.processed / worker.elapsedMs) * 1000,
          ...worker,
        })
      );
    }
  },
  120_000
);
