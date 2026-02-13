/**
 * タマゴ個体生成 Worker 統合テスト
 *
 * Worker 経由でタマゴ個体生成タスクを実行し、正常に結果が返ることを検証する。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { WorkerPool } from '@/services/worker-pool';
import { resolve_egg_data_batch } from '@/wasm/wasm_pkg.js';
import type { EggListTask } from '@/workers/types';
import type {
  SeedOrigin,
  EggGenerationParams,
  GenerationConfig,
  GeneratedEggData,
} from '@/wasm/wasm_pkg.js';

const TEST_ORIGINS: SeedOrigin[] = [
  { Seed: { base_seed: 0x01_23_45_67_89_ab_cd_efn, mt_seed: 0x12_34_56_78 } },
];

const TEST_PARAMS: EggGenerationParams = {
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

/**
 * WorkerPool でタスクを実行し、結果を Promise で返すヘルパー
 */
function executeTask(pool: WorkerPool, task: EggListTask): Promise<GeneratedEggData[]> {
  return new Promise((resolve, reject) => {
    const results: GeneratedEggData[] = [];
    const timeout = setTimeout(() => reject(new Error('Test timeout')), 10_000);

    pool.onResult((r) => results.push(...(r as unknown as GeneratedEggData[])));
    pool.onComplete(() => {
      clearTimeout(timeout);
      resolve(results);
    });
    pool.onError((e) => {
      clearTimeout(timeout);
      reject(e);
    });

    pool.start([task]);
  });
}

describe('Egg List Worker Integration', () => {
  let pool: WorkerPool | undefined;

  afterEach(() => {
    pool?.dispose();
    pool = undefined;
  });

  it('should generate eggs via worker with correct structure', async () => {
    pool = new WorkerPool({ useGpu: false, workerCount: 1 });
    await pool.initialize();

    const task: EggListTask = {
      kind: 'egg-list',
      origins: TEST_ORIGINS,
      params: TEST_PARAMS,
      config: TEST_CONFIG,
      filter: undefined,
    };

    const results = await executeTask(pool, task);
    expect(results.length).toBeGreaterThan(0);

    const first = results[0];
    expect(first).toHaveProperty('core');
    expect(first).toHaveProperty('advance');
    expect(first).toHaveProperty('inheritance');
    expect(first.advance).toBeTypeOf('number');
    expect(first.inheritance).toHaveLength(3);
  }, 15_000);

  it('should resolve species_name when species_id is specified', async () => {
    pool = new WorkerPool({ useGpu: false, workerCount: 1 });
    await pool.initialize();

    const task: EggListTask = {
      kind: 'egg-list',
      origins: TEST_ORIGINS,
      params: TEST_PARAMS,
      config: { ...TEST_CONFIG, max_advance: 2 },
      filter: undefined,
    };

    const results = await executeTask(pool, task);
    expect(results.length).toBeGreaterThan(0);

    // species_id=25 (ピカチュウ) を指定して解決
    const resolved = resolve_egg_data_batch(results, 'ja', 25);
    expect(resolved.length).toBe(results.length);
    expect(resolved[0].species_name).toBe('ピカチュウ');
  }, 15_000);

  it('should have numeric stats when species_id is specified', async () => {
    pool = new WorkerPool({ useGpu: false, workerCount: 1 });
    await pool.initialize();

    const task: EggListTask = {
      kind: 'egg-list',
      origins: TEST_ORIGINS,
      params: { ...TEST_PARAMS, species_id: 25 },
      config: { ...TEST_CONFIG, max_advance: 2 },
      filter: undefined,
    };

    const results = await executeTask(pool, task);
    const resolved = resolve_egg_data_batch(results, 'ja', 25);
    const stats = resolved[0].stats;
    // species_id 指定時は全て数値文字列 (stats は from_raw で事前計算済み)
    for (const s of stats) {
      expect(Number.isNaN(Number(s))).toBe(false);
    }
  }, 15_000);

  it('should have "?" stats when species_id is not specified', async () => {
    pool = new WorkerPool({ useGpu: false, workerCount: 1 });
    await pool.initialize();

    const task: EggListTask = {
      kind: 'egg-list',
      origins: TEST_ORIGINS,
      params: TEST_PARAMS,
      config: { ...TEST_CONFIG, max_advance: 2 },
      filter: undefined,
    };

    const results = await executeTask(pool, task);
    // species_id 未指定
    const resolved = resolve_egg_data_batch(results, 'ja');
    const stats = resolved[0].stats;
    // 全て "?" であること
    for (const s of stats) {
      expect(s).toBe('?');
    }
  }, 15_000);
});
