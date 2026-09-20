import { expect, it } from 'vitest';
import { PokemonDatetimeSearcher } from '@/wasm/wasm_pkg.js';
import type {
  EncounterType,
  PokemonDatetimeSearchFilter,
  PokemonDatetimeSearchParams,
  PokemonSearchBatchLimits,
} from '@/wasm/wasm_pkg.js';
// WASM の依存走査は Node の解決処理を使うため、tsconfig の別名を使わない。
import { memory } from '../../wasm/wasm_pkg_bg.wasm';
import { createPokemonSearchRequest } from '@/test/helpers/pokemon-search';
import {
  runSearchInWorker,
  createTestSearchSpace,
  createTestTimeRange,
  createTestStartupCondition,
} from './helpers/worker-test-utils';
import type {
  BatchBenchmarkRequest,
  BatchBenchmarkResponse,
} from './helpers/batch-performance.worker';

interface BatchMeasurement {
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
  params: PokemonDatetimeSearchParams,
  limits: PokemonSearchBatchLimits
): BatchMeasurement {
  const searcher = new PokemonDatetimeSearcher(params);
  const batchTimes: number[] = [];
  let processed = 0;
  let matches = 0;
  const start = performance.now();
  try {
    while (!searcher.is_done) {
      const batchStart = performance.now();
      const batch = searcher.next_batch(limits);
      batchTimes.push(performance.now() - batchStart);
      processed = Number(batch.processed_count);
      matches += batch.results.length;
    }
  } finally {
    searcher.free();
  }
  return {
    elapsedMs: performance.now() - start,
    maxBatchMs: Math.max(...batchTimes),
    p95BatchMs: percentile95(batchTimes),
    batchCount: batchTimes.length,
    processed,
    matches,
  };
}

async function measureWorker(
  params: PokemonDatetimeSearchParams,
  limits: PokemonSearchBatchLimits
): Promise<BatchMeasurement> {
  const worker = new Worker(new URL('helpers/batch-performance.worker.ts', import.meta.url), {
    type: 'module',
  });
  const start = performance.now();
  return new Promise((resolve, reject) => {
    let matches = 0;
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Pokémon benchmark Worker timed out'));
    }, 60_000);
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
        worker.postMessage({ kind: 'pokemon', params, limits } satisfies BatchBenchmarkRequest);
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

function practicalParams(encounter: EncounterType): PokemonDatetimeSearchParams {
  const request = createPokemonSearchRequest();
  return {
    ds: request.context.ds,
    search_space: createTestSearchSpace(2024, 2, 29, 86_400, createTestTimeRange()),
    condition: createTestStartupCondition(),
    pokemon_params: {
      ...request.pokemonParams,
      trainer: { tid: 12_345, sid: 54_321 },
      encounter_type: encounter,
      slots: [
        {
          species_id: 25,
          level_min: 5,
          level_max: 10,
          gender_ratio: 'F1M1',
          has_held_item: true,
          shiny_locked: false,
        },
      ],
    },
    gen_config: { ...request.genConfig, user_offset: 0, max_advance: 30 },
    filter: { ...request.filter, shiny: 'Shiny' },
  };
}

it.skipIf(import.meta.env.VITE_POKEMON_BENCH !== '1')(
  'compares practical one-day Pokémon batch limits',
  async () => {
    const limits = [
      { name: 'baseline', value: { max_candidates: 1024, max_results: 256 } },
      { name: 'balanced', value: { max_candidates: 65_536, max_results: 8192 } },
      { name: 'requested', value: { max_candidates: 262_144, max_results: 8192 } },
    ] as const;
    for (const encounter of ['StaticSymbol', 'Normal'] as const) {
      const params = practicalParams(encounter);
      for (const limit of limits) {
        measureDirect(params, limit.value);
        const direct = measureDirect(params, limit.value);
        const worker = await measureWorker(params, limit.value);
        expect(worker.matches).toBe(direct.matches);
        console.log(
          JSON.stringify({
            benchmark: 'pokemon-practical-day',
            encounter,
            limit: limit.name,
            limits: limit.value,
            candidatesPerSecond: (worker.processed / worker.elapsedMs) * 1000,
            ...worker,
          })
        );
      }
    }
  },
  120_000
);

it.skipIf(import.meta.env.VITE_POKEMON_BENCH !== '1')(
  'compares dense Pokémon result limits',
  async () => {
    const params = practicalParams('StaticSymbol');
    params.search_space = createTestSearchSpace(2024, 2, 29, 2048, createTestTimeRange());
    params.filter = { ...params.filter, shiny: undefined };
    const limits = [
      { name: 'baseline', value: { max_candidates: 1024, max_results: 256 } },
      { name: 'results-4096', value: { max_candidates: 262_144, max_results: 4096 } },
      { name: 'results-8192', value: { max_candidates: 262_144, max_results: 8192 } },
      { name: 'results-16384', value: { max_candidates: 262_144, max_results: 16_384 } },
    ] as const;
    for (const limit of limits) {
      measureDirect(params, limit.value);
      const direct = measureDirect(params, limit.value);
      const worker = await measureWorker(params, limit.value);
      expect(worker.matches).toBe(direct.matches);
      console.log(
        JSON.stringify({
          benchmark: 'pokemon-dense-results',
          limit: limit.name,
          limits: limit.value,
          candidatesPerSecond: (worker.processed / worker.elapsedMs) * 1000,
          ...worker,
        })
      );
    }
  },
  120_000
);

// 本番 WASM をビルドし VITE_POKEMON_BENCH=1 を設定して単独実行する。
it.skipIf(import.meta.env.VITE_POKEMON_BENCH !== '1')(
  'measures WASM batches and Worker transfer separately',
  async () => {
    const request = createPokemonSearchRequest();
    const conditions: [string, Partial<PokemonDatetimeSearchFilter>][] = [
      ['none', { species_ids: [1] }],
      ['all', {}],
      ['shiny', { shiny: 'Shiny' }],
      ['nature', { natures: ['Jolly'] }],
      ['species', { species_ids: [25] }],
      ['gender', { gender: 'Female' }],
      ['ability', { ability_slot: 'First' }],
      ['level', { level_range: [5, 5] }],
    ];
    const encounters: EncounterType[] = ['Roamer', 'StaticSymbol', 'Normal'];
    for (const encounter of encounters) {
      for (const [condition, filter] of conditions) {
        const params: PokemonDatetimeSearchParams = {
          ds: request.context.ds,
          search_space: createTestSearchSpace(2024, 2, 29, 1000, createTestTimeRange()),
          condition: createTestStartupCondition(),
          pokemon_params: {
            ...request.pokemonParams,
            trainer: { tid: 12_345, sid: 54_321 },
            encounter_type: encounter,
            slots: [
              {
                species_id: 25,
                level_min: 5,
                level_max: 10,
                gender_ratio: 'F1M1',
                has_held_item: true,
                shiny_locked: false,
              },
            ],
          },
          gen_config: { ...request.genConfig, user_offset: 0, max_advance: 30 },
          filter: { ...request.filter, ...filter },
        };
        // Chromium 固有の診断値。GCを強制せずバッチ境界のJSヒープをサンプリングする。
        const diagnostic = performance as Performance & { memory?: { usedJSHeapSize: number } };
        const heapStart = diagnostic.memory?.usedJSHeapSize;
        let heapPeak = heapStart ?? 0;
        const start = performance.now();
        const searcher = new PokemonDatetimeSearcher(params);
        let maxBatchMs = 0;
        let matches = 0;
        try {
          while (!searcher.is_done) {
            const batchStart = performance.now();
            const batch = searcher.next_batch({ max_candidates: 1024, max_results: 256 });
            maxBatchMs = Math.max(maxBatchMs, performance.now() - batchStart);
            matches += batch.results.length;
            heapPeak = Math.max(heapPeak, diagnostic.memory?.usedJSHeapSize ?? 0);
          }
        } finally {
          searcher.free();
        }
        const directMs = performance.now() - start;
        const workerStart = performance.now();
        const results = await runSearchInWorker({ kind: 'pokemon-datetime', params });
        const workerMs = performance.now() - workerStart;
        expect(results).toHaveLength(matches);
        console.log(
          JSON.stringify({
            encounter,
            condition,
            directMs,
            maxBatchMs,
            workerMs,
            matches,
            heapStart,
            heapPeak,
            heapAfterWorker: diagnostic.memory?.usedJSHeapSize,
            wasmBytes: memory.buffer.byteLength,
          })
        );
      }
    }
  },
  120_000
);
