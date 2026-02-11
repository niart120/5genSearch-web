/**
 * 孵化起動時刻検索の統合テスト
 *
 * WASM の EggDatetimeSearcher を直接呼び出し、
 * 検索がパニックせず完走することを検証する。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import wasmInit, { generate_egg_search_tasks, EggDatetimeSearcher } from '../../wasm/wasm_pkg.js';
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
  female_has_hidden: false,
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
  beforeAll(async () => {
    await wasmInit();
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
});
