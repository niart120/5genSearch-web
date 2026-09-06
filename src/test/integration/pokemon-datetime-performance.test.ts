import { expect, it } from 'vitest';
import { PokemonDatetimeSearcher } from '@/wasm/wasm_pkg.js';
import type {
  EncounterType,
  PokemonDatetimeSearchFilter,
  PokemonDatetimeSearchParams,
} from '@/wasm/wasm_pkg.js';
import { memory } from '@/wasm/wasm_pkg_bg.wasm';
import { createPokemonSearchRequest } from '@/test/helpers/pokemon-search';
import {
  runSearchInWorker,
  createTestSearchRange,
  createTestTimeRange,
  createTestStartupCondition,
} from './helpers/worker-test-utils';

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
          time_range: createTestTimeRange(),
          search_range: createTestSearchRange(2024, 2, 29, 1000),
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
