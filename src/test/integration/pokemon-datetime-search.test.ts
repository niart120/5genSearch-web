import { afterEach, describe, expect, it } from 'vitest';
import {
  PokemonDatetimeSearcher,
  generate_pokemon_list,
  generate_pokemon_search_tasks,
} from '@/wasm/wasm_pkg.js';
import type { GeneratedPokemonData, PokemonDatetimeSearchParams } from '@/wasm/wasm_pkg.js';
import { WorkerPool } from '@/services/worker-pool';
import { flattenBatchResults, isGeneratedPokemonData } from '@/services/batch-utils';
import {
  runSearchInWorker,
  createTestDsConfig,
  createTestTimeRange,
  createTestSearchRange,
  createTestStartupCondition,
} from './helpers/worker-test-utils';

export function pokemonSearchParams(): PokemonDatetimeSearchParams {
  return {
    ds: createTestDsConfig(),
    time_range: createTestTimeRange(),
    search_range: createTestSearchRange(2010, 9, 18, 7),
    condition: createTestStartupCondition(),
    pokemon_params: {
      trainer: { tid: 0, sid: 0 },
      encounter_type: 'StaticSymbol',
      encounter_method: 'Stationary',
      lead_ability: 'None',
      slots: [
        {
          species_id: 638,
          level_min: 42,
          level_max: 42,
          gender_ratio: 'Genderless',
          has_held_item: false,
          shiny_locked: false,
        },
      ],
    },
    gen_config: {
      version: 'Black',
      game_start: {
        start_mode: 'Continue',
        save: 'WithSave',
        memory_link: 'Disabled',
        shiny_charm: 'NotObtained',
      },
      user_offset: 6,
      max_advance: 30,
    },
    filter: {
      shiny: undefined,
      natures: undefined,
      species_ids: undefined,
      gender: undefined,
      ability_slot: undefined,
      level_range: undefined,
    },
  };
}

describe('Pokemon datetime search', () => {
  let pool: WorkerPool | undefined;
  afterEach(() => pool?.dispose());

  it('returns completed Pokemon with startup data across one-result batches', () => {
    const params = pokemonSearchParams();
    const searcher = new PokemonDatetimeSearcher(params);
    const results: GeneratedPokemonData[] = [];
    try {
      while (!searcher.is_done) {
        const batch = searcher.next_batch({ max_candidates: 4, max_results: 1 });
        expect(batch.total_count).toBe(168n);
        results.push(...batch.results);
      }
    } finally {
      searcher.free();
    }
    expect(results).toHaveLength(168);
    const first = results[0];
    expect(first.source).toHaveProperty('Startup');
    expect(
      generate_pokemon_list([first.source], params.pokemon_params, params.gen_config)[0]
    ).toEqual(first);
  });

  it('runs through Worker without an MT Seed target', async () => {
    const results = await runSearchInWorker({
      kind: 'pokemon-datetime',
      params: pokemonSearchParams(),
    });
    expect(results).toHaveLength(168);
  });

  it('rejects invalid input through Worker', async () => {
    const params = pokemonSearchParams();
    params.filter.level_range = [50, 40];
    await expect(runSearchInWorker({ kind: 'pokemon-datetime', params })).rejects.toThrow(
      'Level range'
    );
  });

  it('splits multiple startup conditions without duplicating datetime boundaries', () => {
    const params = pokemonSearchParams();
    const tasks = generate_pokemon_search_tasks(
      {
        ds: params.ds,
        date_range: {
          start_year: 2010,
          start_month: 9,
          start_day: 18,
          end_year: 2010,
          end_month: 9,
          end_day: 18,
        },
        time_range: { ...params.time_range, hour_end: 0, minute_end: 0, second_end: 6 },
        ranges: [{ timer0_min: 0x0c_79, timer0_max: 0x0c_7a, vcount_min: 0x60, vcount_max: 0x60 }],
        key_spec: { available_buttons: ['A'] },
      },
      params.pokemon_params,
      params.gen_config,
      params.filter,
      7
    );
    let total = 0n;
    for (const task of tasks) {
      const searcher = new PokemonDatetimeSearcher(task);
      try {
        const batch = searcher.next_batch({ max_candidates: 1024, max_results: 256 });
        total += batch.total_count;
      } finally {
        searcher.free();
      }
    }
    expect(total).toBe(672n);
  });

  it('cancel and restart exclude responses from the previous search', async () => {
    pool = new WorkerPool({ useGpu: false, workerCount: 1 });
    await pool.initialize();
    const activePool = pool;
    const long = pokemonSearchParams();
    long.gen_config.max_advance = 1_000_000;
    const short = pokemonSearchParams();
    short.gen_config.max_advance = 7;
    const results: GeneratedPokemonData[] = [];
    let restarted = false;
    activePool.onResult((batch) => {
      if (restarted) {
        results.push(...flattenBatchResults<GeneratedPokemonData>([batch], isGeneratedPokemonData));
      } else {
        restarted = true;
        activePool.cancel();
        results.length = 0;
        activePool.start([{ kind: 'pokemon-datetime', params: short }]);
      }
    });
    await new Promise<void>((resolve, reject) => {
      activePool.onComplete(resolve);
      activePool.onError(reject);
      activePool.start([{ kind: 'pokemon-datetime', params: long }]);
    });
    expect(results).toHaveLength(7);
    expect(results.every((data) => data.advance === 6)).toBe(true);
  });

  it('completes zero-position tasks and reports zero progress counts', async () => {
    pool = new WorkerPool({ useGpu: false, workerCount: 1 });
    await pool.initialize();
    const params = pokemonSearchParams();
    params.gen_config.max_advance = 6;
    const activePool = pool;
    let processed: number | undefined;
    activePool.onProgress((progress) => {
      processed = progress.totalProcessed;
    });
    await new Promise<void>((resolve, reject) => {
      activePool.onComplete(resolve);
      activePool.onError(reject);
      activePool.start([{ kind: 'pokemon-datetime', params }]);
    });
    expect(processed).toBe(0);
  });
});
