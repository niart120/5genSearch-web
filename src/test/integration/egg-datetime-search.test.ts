/**
 * 孵化起動時刻検索の統合テスト
 *
 * WASM の EggDatetimeSearcher を直接呼び出し、
 * 検索がパニックせず完走することを検証する。
 */

import { describe, it, expect } from 'vitest';
import { normalizeEggFilter } from '@/lib/search-filter-context';
import {
  generate_egg_search_tasks,
  generate_egg_list,
  resolve_seeds,
  resolve_egg_data_batch,
  EggDatetimeSearcher,
} from '../../wasm/wasm_pkg.js';
import type {
  DatetimeSearchContext,
  EggGenerationParams,
  GenerationConfig,
  EggDatetimeSearchResult,
} from '../../wasm/wasm_pkg.js';

const testContext: DatetimeSearchContext = {
  ds: {
    mac: [0x00, 0x09, 0xbf, 0x0e, 0x54, 0x53] as [number, number, number, number, number, number],
    hardware: 'DsLite',
    version: 'Black',
    region: 'Jpn',
  },
  date_range: {
    start_year: 2025,
    start_month: 1,
    start_day: 1,
    end_year: 2025,
    end_month: 1,
    end_day: 1,
  },
  time_range: {
    hour_start: 0,
    hour_end: 0,
    minute_start: 0,
    minute_end: 0,
    second_start: 0,
    second_end: 59,
  },
  ranges: [
    {
      timer0_min: 0x0c_79,
      timer0_max: 0x0c_7a,
      vcount_min: 0x60,
      vcount_max: 0x60,
    },
  ],
  key_spec: { available_buttons: [] },
};

const eggParams: EggGenerationParams = {
  trainer: { tid: 0, sid: 0 },
  everstone: 'None',
  female_ability_slot: 'First',
  uses_ditto: false,
  gender_ratio: 'F1M1',
  nidoran_flag: false,
  masuda_method: false,
  parent_male: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  parent_female: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  consider_npc: false,
  species_id: undefined,
};

const genConfig: GenerationConfig = {
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

describe('EggDatetimeSearch Integration', () => {
  it.each([
    [100, 102],
    [100, 100],
    [0, 0],
  ])('searches the inclusive range %i..%i', (min, max) => {
    const context = structuredClone(testContext);
    context.time_range.second_end = 0;
    context.ranges[0].timer0_max = context.ranges[0].timer0_min;
    const config = { ...genConfig, user_offset: min, max_advance: max };
    const tasks = generate_egg_search_tasks(context, eggParams, config, undefined, 1);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].gen_config).toEqual(config);
    const searcher = new EggDatetimeSearcher(tasks[0]);
    try {
      const batch = searcher.next_batch(1);
      expect(batch.results.map((row) => row.egg.advance)).toEqual(
        Array.from({ length: max - min + 1 }, (_, index) => min + index)
      );
      expect(searcher.is_done).toBe(true);
    } finally {
      searcher.free();
    }
  });
  it.each([
    [2, 1],
    [0, 0xff_ff_ff_ff],
  ])('rejects invalid range %i..%i at the WASM boundary', (min, max) => {
    expect(() =>
      generate_egg_search_tasks(
        testContext,
        eggParams,
        { ...genConfig, user_offset: min, max_advance: max },
        undefined,
        1
      )
    ).toThrow();
  });
  it.each([
    [2, 1],
    [0, 0xff_ff_ff_ff],
    [0xff_ff_ff_fe, 0xff_ff_ff_fe],
  ])('egg list rejects invalid ranges and offset overflow %i..%i', (min, max) => {
    const origins = resolve_seeds({ type: 'Seeds', seeds: [0x12_34_56_78_9a_bc_de_f0n] });
    expect(() =>
      generate_egg_list(origins, eggParams, { ...genConfig, user_offset: min, max_advance: max })
    ).toThrow();
  });
  it('不適用の孵化条件を除外してから日時検索タスクを生成する', () => {
    const applied = normalizeEggFilter(
      { ability_slot: 'Hidden', min_margin_frames: 0 },
      undefined,
      eggParams
    );
    const filtered = generate_egg_search_tasks(testContext, eggParams, genConfig, applied, 1);
    const baseline = generate_egg_search_tasks(testContext, eggParams, genConfig, undefined, 1);
    expect(filtered).toEqual(baseline);
    const searcher = new EggDatetimeSearcher(filtered[0]);
    try {
      expect(searcher.next_batch(1000).results.length).toBeGreaterThan(0);
    } finally {
      searcher.free();
    }
  });
  it('タスク生成で複数タスクに分割される', () => {
    const tasks = generate_egg_search_tasks(testContext, eggParams, genConfig, undefined, 4);
    expect(tasks.length).toBeGreaterThanOrEqual(1);
  });

  it('検索がパニックせず完走する', () => {
    const tasks = generate_egg_search_tasks(testContext, eggParams, genConfig, undefined, 1);

    const allResults: EggDatetimeSearchResult[] = [];
    for (const params of tasks) {
      const searcher = new EggDatetimeSearcher(params);
      while (!searcher.is_done) {
        const batch = searcher.next_batch(1000);
        if (batch.results.length > 0) {
          allResults.push(...(batch.results as EggDatetimeSearchResult[]));
        }
      }
      searcher.free();
    }

    // 結果があれば egg.core フィールドを持つことを検証
    for (const result of allResults) {
      expect(result).toHaveProperty('egg');
      expect(result.egg).toHaveProperty('core');
      expect(result.egg.core).toHaveProperty('nature');
      expect(result.egg.core).toHaveProperty('ivs');
    }
  }, 30_000);

  it('フィルター付き検索が完走する', () => {
    const tasks = generate_egg_search_tasks(
      testContext,
      eggParams,
      genConfig,
      {
        iv: undefined,
        natures: undefined,
        gender: undefined,
        ability_slot: undefined,
        shiny: undefined,
        min_margin_frames: undefined,
        stats: undefined,
      },
      1
    );

    let totalProcessed = 0n;
    for (const params of tasks) {
      const searcher = new EggDatetimeSearcher(params);
      while (!searcher.is_done) {
        const batch = searcher.next_batch(1000);
        totalProcessed = batch.processed_count;
      }
      searcher.free();
    }

    expect(totalProcessed).toBeGreaterThan(0n);
  }, 30_000);

  it('不明な親個体値を生値32で生成し表示値?へ解決する', () => {
    const unknownIvs = { hp: 32, atk: 32, def: 32, spa: 32, spd: 32, spe: 32 };
    const tasks = generate_egg_search_tasks(
      testContext,
      {
        ...eggParams,
        parent_male: unknownIvs,
        parent_female: unknownIvs,
      },
      genConfig,
      undefined,
      1
    );

    const allResults: EggDatetimeSearchResult[] = [];
    for (const params of tasks) {
      const searcher = new EggDatetimeSearcher(params);
      while (!searcher.is_done) {
        const batch = searcher.next_batch(1000);
        allResults.push(...(batch.results as EggDatetimeSearchResult[]));
      }
      searcher.free();
    }

    expect(allResults.length).toBeGreaterThan(0);
    const rawEggs = allResults.map((result) => result.egg);
    const resolvedEggs = resolve_egg_data_batch(rawEggs, 'ja');
    const inheritedUnknownIndex = rawEggs.findIndex((egg) =>
      Object.values(egg.core.ivs).includes(32)
    );

    expect(inheritedUnknownIndex).toBeGreaterThanOrEqual(0);
    expect(resolvedEggs[inheritedUnknownIndex]?.ivs).toContain('?');
    expect(resolvedEggs[inheritedUnknownIndex]?.ivs).not.toContain('32');
  }, 30_000);
});
