/**
 * Searcher 統合テスト
 *
 * Browser Mode で実行される統合テスト。
 * 各 Searcher が Worker 経由で正しく動作することを検証する。
 */

import { describe, it, expect } from 'vitest';
import {
  runSearchInWorker,
  createTestDsConfig,
  createTestTimeRange,
  createTestSearchRange,
  createTestStartupCondition,
} from '../helpers/worker-test-utils';
import type {
  MtseedDatetimeSearchTask,
  MtseedSearchTask,
  EggDatetimeSearchTask,
  TrainerInfoSearchTask,
} from '../../../workers/types';

describe('MtseedDatetimeSearcher', () => {
  it('should find known MT Seed with correct datetime', async () => {
    // 既知の期待値 (ウェブツールにて検証済み)
    // 日時: 2010/09/18 18:13:11
    const expectedMtSeed = 0x32bf6858;
    const expectedLcgSeed = 0x768360781d1ce6ddn;

    const task: MtseedDatetimeSearchTask = {
      kind: 'mtseed-datetime',
      params: {
        target_seeds: [expectedMtSeed],
        ds: createTestDsConfig(),
        time_range: {
          hour_start: 18,
          hour_end: 18,
          minute_start: 0,
          minute_end: 30,
          second_start: 0,
          second_end: 59,
        },
        search_range: createTestSearchRange(2010, 9, 18, 86400),
        condition: createTestStartupCondition(),
      },
    };

    const results = await runSearchInWorker(task, { timeout: 60000 });

    // 期待する MT Seed が見つかること
    const found = results.find((r) => {
      if ('Startup' in r) {
        return r.Startup.mt_seed === expectedMtSeed;
      }
      return false;
    });

    expect(found).toBeDefined();

    if (found && 'Startup' in found) {
      // LCG Seed が期待値と一致
      expect(found.Startup.base_seed).toBe(expectedLcgSeed);

      // 日時が 18:13:11 であること
      expect(found.Startup.datetime.year).toBe(2010);
      expect(found.Startup.datetime.month).toBe(9);
      expect(found.Startup.datetime.day).toBe(18);
      expect(found.Startup.datetime.hour).toBe(18);
      expect(found.Startup.datetime.minute).toBe(13);
      expect(found.Startup.datetime.second).toBe(11);

      // Timer0, VCount, KeyCode
      expect(found.Startup.condition.timer0).toBe(0x0c79);
      expect(found.Startup.condition.vcount).toBe(0x60);
      expect(found.Startup.condition.key_code).toBe(0x2fff);
    }
  });
});

describe('MtseedSearcher', () => {
  it('should match all with any filter in batch', async () => {
    const task: MtseedSearchTask = {
      kind: 'mtseed',
      params: {
        iv_filter: {
          hp: [0, 31],
          atk: [0, 31],
          def: [0, 31],
          spa: [0, 31],
          spd: [0, 31],
          spe: [0, 31],
        },
        mt_offset: 7,
        is_roamer: false,
      },
    };

    // 全探索は時間がかかるため、最初のバッチのみ確認
    // Worker は全探索を行うが、early return で最初の結果のみ取得
    const results = await runSearchInWorker(task, { timeout: 120000 });

    // any フィルタなので多数の結果が見つかるはず
    expect(results.length).toBeGreaterThan(0);
  });

  it('should find 6V seeds', async () => {
    // 6V フィルタ
    const task: MtseedSearchTask = {
      kind: 'mtseed',
      params: {
        iv_filter: {
          hp: [31, 31],
          atk: [31, 31],
          def: [31, 31],
          spa: [31, 31],
          spd: [31, 31],
          spe: [31, 31],
        },
        mt_offset: 7,
        is_roamer: false,
      },
    };

    // 全探索 (30-60秒かかる)
    const results = await runSearchInWorker(task, { timeout: 180000 });

    // 既知の 6V Seed (ウェブツールにて検証済み)
    const expected6vSeeds = [0x14b11ba6, 0x8a30480d, 0x9e02b0ae, 0xadfa2178, 0xfc4aa3ac];

    // 期待される Seed がすべて見つかること
    const foundSeeds = results.map((r) => r.seed);
    for (const expected of expected6vSeeds) {
      expect(foundSeeds).toContain(expected);
    }

    // 正確に 5 件であること
    expect(results.length).toBe(5);
  }, 180000);
});

describe('EggDatetimeSearcher', () => {
  it('should find egg result at specific datetime', async () => {
    // 2010/09/18 00:00:00 における既知の卵検索結果 (Adv=0)
    const expectedMtSeed = 0x2d9429c0;

    const task: EggDatetimeSearchTask = {
      kind: 'egg-datetime',
      params: {
        ds: createTestDsConfig(),
        time_range: {
          hour_start: 0,
          hour_end: 0,
          minute_start: 0,
          minute_end: 0,
          second_start: 0,
          second_end: 0,
        },
        search_range: createTestSearchRange(2010, 9, 18, 1),
        condition: createTestStartupCondition(),
        egg_params: {
          trainer: { tid: 1, sid: 2 },
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
        },
        gen_config: {
          version: 'Black',
          game_start: { start_mode: 'Continue', save_state: 'WithSave' },
          user_offset: 0,
          max_advance: 10,
        },
        filter: undefined,
      },
    };

    const results = await runSearchInWorker(task, { timeout: 30000 });

    // 結果が返ること
    expect(results.length).toBeGreaterThan(0);

    // Adv=0 の結果を検証
    const adv0 = results.find((r) => r.egg.advance === 0);
    expect(adv0).toBeDefined();

    if (adv0) {
      // MT Seed が期待値と一致
      if ('Startup' in adv0.egg.source) {
        expect(adv0.egg.source.Startup.mt_seed).toBe(expectedMtSeed);
      }

      // 卵の性格が "Naive" (むじゃき) であること
      expect(adv0.egg.core.nature).toBe('Naive');

      // 卵の性別が "Female" であること
      expect(adv0.egg.core.gender).toBe('Female');

      // 卵の特性スロットが "First" であること
      expect(adv0.egg.core.ability_slot).toBe('First');
    }
  });
});

describe('TrainerInfoSearcher', () => {
  it('should reject Continue mode', async () => {
    const task: TrainerInfoSearchTask = {
      kind: 'trainer-info',
      params: {
        filter: {},
        ds: createTestDsConfig(),
        time_range: createTestTimeRange(0, 0, 0, 0),
        search_range: createTestSearchRange(2023, 1, 1, 60),
        condition: createTestStartupCondition(),
        game_start: { start_mode: 'Continue', save_state: 'WithSave' },
      },
    };

    await expect(runSearchInWorker(task, { timeout: 10000 })).rejects.toThrow();
  });

  it('should process with NewGame mode', async () => {
    const task: TrainerInfoSearchTask = {
      kind: 'trainer-info',
      params: {
        filter: {},
        ds: createTestDsConfig(),
        time_range: createTestTimeRange(0, 0, 0, 0),
        search_range: createTestSearchRange(2023, 1, 1, 60),
        condition: createTestStartupCondition(),
        game_start: { start_mode: 'NewGame', save_state: 'NoSave' },
      },
    };

    const results = await runSearchInWorker(task, { timeout: 30000 });

    // 結果が返ること (フィルタなしなので複数件)
    expect(results.length).toBeGreaterThan(0);
  });
});
