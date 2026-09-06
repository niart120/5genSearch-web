/**
 * Pokemon List Worker 統合テスト
 *
 * Browser Mode で実行される統合テスト。
 * Worker 経由で pokemon-list タスクを実行し、GeneratedPokemonData[] が返ることを検証する。
 */

import { describe, it, expect } from 'vitest';
import { runSearchInWorker } from './helpers/worker-test-utils';
import type { PokemonListTask } from '../../workers/types';
import { generate_pokemon_list } from '../../wasm/wasm_pkg.js';
import type { SeedOrigin, PokemonGenerationParams, GenerationConfig } from '../../wasm/wasm_pkg.js';
import { normalizePokemonFilter } from '@/lib/search-filter-context';

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
  it.each([
    [2, 1],
    [0, 0xff_ff_ff_ff],
    [0xff_ff_ff_fe, 0xff_ff_ff_fe],
  ])('WASM rejects invalid range or offset overflow %i..%i', (min, max) => {
    expect(() =>
      generate_pokemon_list([TEST_ORIGIN], TEST_PARAMS, {
        ...TEST_CONFIG,
        user_offset: min,
        max_advance: max,
      })
    ).toThrow();
  });
  it.each([
    [100, 102],
    [100, 100],
    [0, 0],
  ])('Worker generates the inclusive range %i..%i', async (min, max) => {
    const results = await runSearchInWorker({
      kind: 'pokemon-list',
      origins: [TEST_ORIGIN],
      params: TEST_PARAMS,
      config: { ...TEST_CONFIG, user_offset: min, max_advance: max },
      filter: undefined,
    });
    expect(results.map((row) => row.advance)).toEqual(
      Array.from({ length: max - min + 1 }, (_, index) => min + index)
    );
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
  it('非表示の固定対象属性・持ち物・個体値を除外した要求が未指定の要求と一致する', async () => {
    const params = {
      ...TEST_PARAMS,
      slots: TEST_PARAMS.slots.map((slot) => ({ ...slot, shiny_locked: true })),
    };
    const filter = normalizePokemonFilter(
      {
        species_ids: [1],
        level_range: [90, 100],
        gender: 'Male',
        shiny: 'Shiny',
        ability_slot: 'Hidden',
        held_item_slots: ['VeryRare'],
        iv: {
          hp: [31, 31],
          atk: [31, 31],
          def: [31, 31],
          spa: [31, 31],
          spd: [31, 31],
          spe: [31, 31],
        },
      },
      undefined,
      { encounterType: params.encounter_type, slots: params.slots },
      'stats'
    );
    const results = await runSearchInWorker({
      kind: 'pokemon-list',
      origins: [TEST_ORIGIN],
      params,
      config: TEST_CONFIG,
      filter,
    });
    const expected = generate_pokemon_list([TEST_ORIGIN], params, TEST_CONFIG);
    expect(expected.length).toBeGreaterThan(0);
    expect(results).toEqual(expected);
  });
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
