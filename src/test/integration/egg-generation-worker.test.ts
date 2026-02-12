/**
 * タマゴ個体生成 Worker 統合テスト
 *
 * Worker 経由でタマゴ個体生成タスクを実行し、正常に結果が返ることを検証する。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { WorkerPool } from '@/services/worker-pool';
import type { EggGenerationTask } from '@/workers/types';
import type { SeedOrigin, EggGenerationParams, GenerationConfig } from '@/wasm/wasm_pkg.js';

describe('Egg Generation Worker Integration', () => {
  let pool: WorkerPool;

  beforeAll(async () => {
    // Browser mode で実行されるため、Worker は利用可能
    pool = new WorkerPool({ maxWorkers: 1, useGpu: false });
    await pool.init();
  });

  it('should generate eggs via worker', async () => {
    const origins: SeedOrigin[] = [
      { type: 'Seed', seed: { base_seed: 0x0123456789ABCDEFn, mt_seed: 0xFEDCBA9876543210n } },
    ];

    const params: EggGenerationParams = {
      parent_male: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      parent_female: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      female_ability_slot: 'Slot1',
      everstone_plan: 'None',
      gender_ratio: 'Equal',
      uses_ditto: false,
      nidoran_flag: false,
      masuda_method: false,
      consider_npc: false,
    };

    const config: GenerationConfig = {
      user_offset: 0,
      max_advance: 10,
      sync_nature: 'None',
      search_type: 'All',
    };

    const task: EggGenerationTask = {
      kind: 'egg-generation',
      origins,
      params,
      config,
      filter: undefined,
    };

    const results = await pool.execute([task]);
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);

    const batch = results[0];
    expect(Array.isArray(batch)).toBe(true);
    if (Array.isArray(batch) && batch.length > 0) {
      const first = batch[0];
      expect(first).toHaveProperty('core');
      expect(first).toHaveProperty('advance');
    }
  }, 10000);
});
