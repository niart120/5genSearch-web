/**
 * Pokemon List Worker 統合テスト
 *
 * Browser Mode で実行される統合テスト。
 * Worker 経由で pokemon-list タスクを実行し、GeneratedPokemonData[] が返ることを検証する。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { runSearchInWorker } from './helpers/worker-test-utils';
import type { PokemonListTask } from '../../workers/types';
import wasmInit, { generate_pokemon_list } from '../../wasm/wasm_pkg.js';
import type { SeedOrigin, PokemonGenerationParams, GenerationConfig } from '../../wasm/wasm_pkg.js';

const TEST_ORIGIN: SeedOrigin = {
  Seed: {
    base_seed: 0x76_83_60_78_1d_1c_e6_ddn,
    mt_seed: 0x32_bf_68_58,
  },
};

const TEST_PARAMS: PokemonGenerationParams = {
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
};

const TEST_CONFIG: GenerationConfig = {
  version: 'Black',
  game_start: {
    start_mode: 'Continue',
    save: 'WithSave',
    memory_link: 'Disabled',
    shiny_charm: 'NotObtained',
  },
  user_offset: 0,
  max_advance: 10,
};

describe('PokemonList Direct WASM', () => {
  beforeAll(async () => {
    await wasmInit();
  });

  it('generate_pokemon_list で結果が返る', () => {
    const results = generate_pokemon_list([TEST_ORIGIN], TEST_PARAMS, TEST_CONFIG);

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(11);

    for (const result of results) {
      expect(result).toHaveProperty('advance');
      expect(result).toHaveProperty('core');
      expect(result.core).toHaveProperty('pid');
      expect(result.core).toHaveProperty('ivs');
      expect(result.core).toHaveProperty('nature');
    }
  });
});

describe('PokemonList Worker Integration', () => {
  it('Worker 経由で pokemon-list タスクを実行し結果が返る', async () => {
    const task: PokemonListTask = {
      kind: 'pokemon-list',
      origins: [TEST_ORIGIN],
      params: TEST_PARAMS,
      config: TEST_CONFIG,
      filter: undefined,
    };

    const results = await runSearchInWorker(task, { timeout: 30_000 });

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(11);

    for (const result of results) {
      expect(result).toHaveProperty('advance');
      expect(result).toHaveProperty('core');
      expect(result.core).toHaveProperty('pid');
      expect(result.core).toHaveProperty('ivs');
      expect(result.core).toHaveProperty('nature');
    }
  }, 60_000);
});
