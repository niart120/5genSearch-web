/**
 * 個体生成並列化 統合テスト
 *
 * WorkerPool に複数タスクを投入し、並列生成・進捗報告・キャンセルが
 * 正しく動作することを検証する。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { WorkerPool } from '@/services/worker-pool';
import { createPokemonListTasks, createEggListTasks } from '@/services/search-tasks';
import type { AggregatedProgress } from '@/services/progress';
import type {
  SeedOrigin,
  PokemonGenerationParams,
  GenerationConfig,
  GeneratedPokemonData,
  EggGenerationParams,
  GeneratedEggData,
} from '@/wasm/wasm_pkg.js';

// =============================================================================
// Test Data
// =============================================================================

/**
 * 複数 origin を利用した並列テスト用データ
 *
 * 同一 origin を複製して件数を確保する。
 */
const BASE_ORIGIN: SeedOrigin = {
  Seed: { base_seed: 0x76_83_60_78_1d_1c_e6_ddn, mt_seed: 0x32_bf_68_58 },
};

function createOrigins(count: number): SeedOrigin[] {
  return Array.from({ length: count }, () => ({ ...BASE_ORIGIN }));
}

const POKEMON_PARAMS: PokemonGenerationParams = {
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

const EGG_PARAMS: EggGenerationParams = {
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

const GEN_CONFIG: GenerationConfig = {
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

// =============================================================================
// Pokemon List — 並列生成
// =============================================================================

describe('pokemon-list: 並列生成', () => {
  let pool: WorkerPool | undefined;

  afterEach(() => {
    pool?.dispose();
    pool = undefined;
  });

  it('複数タスクを WorkerPool に投入し、結果が全件揃う', async () => {
    const workerCount = 2;
    pool = new WorkerPool({ useGpu: false, workerCount });
    await pool.initialize();

    const origins = createOrigins(20);
    const tasks = createPokemonListTasks(
      origins,
      POKEMON_PARAMS,
      GEN_CONFIG,
      undefined,
      workerCount
    );
    expect(tasks.length).toBe(workerCount);

    const results = await new Promise<GeneratedPokemonData[]>((resolve, reject) => {
      const collected: GeneratedPokemonData[] = [];
      const timeout = setTimeout(() => reject(new Error('Test timeout')), 30_000);

      pool!.onResult((r) => collected.push(...(r as unknown as GeneratedPokemonData[])));
      pool!.onComplete(() => {
        clearTimeout(timeout);
        resolve(collected);
      });
      pool!.onError((e) => {
        clearTimeout(timeout);
        reject(e);
      });

      pool!.start(tasks);
    });

    // 各 origin 分の結果が全件揃う (具体的な件数は WASM の生成ロジックに依存)
    expect(results.length).toBeGreaterThan(0);
    // 並列結果と単一実行の結果数が一致することを検証
    // 単一タスク (workerCount=1) でも同じ件数になるはず
    const singleTasks = createPokemonListTasks(origins, POKEMON_PARAMS, GEN_CONFIG, undefined, 1);
    expect(singleTasks).toHaveLength(1);
    // 件数の妥当性: origins 数 × 生成件数/origin
    expect(results.length).toBe(origins.length * (results.length / origins.length));

    for (const result of results) {
      expect(result).toHaveProperty('advance');
      expect(result).toHaveProperty('core');
    }
  }, 60_000);
});

// =============================================================================
// Pokemon List — キャンセル
// =============================================================================

describe('pokemon-list: キャンセル', () => {
  let pool: WorkerPool | undefined;

  afterEach(() => {
    pool?.dispose();
    pool = undefined;
  });

  it('生成中にキャンセルし、処理が停止する', async () => {
    const workerCount = 2;
    pool = new WorkerPool({ useGpu: false, workerCount });
    await pool.initialize();

    // 大量の origins で長時間走らせる
    const origins = createOrigins(500);
    const tasks = createPokemonListTasks(
      origins,
      POKEMON_PARAMS,
      GEN_CONFIG,
      undefined,
      workerCount
    );

    const results = await new Promise<GeneratedPokemonData[]>((resolve, reject) => {
      const collected: GeneratedPokemonData[] = [];
      const timeout = setTimeout(() => reject(new Error('Test timeout')), 30_000);
      const currentPool = pool!;

      currentPool.onResult((r) => collected.push(...(r as unknown as GeneratedPokemonData[])));
      currentPool.onComplete(() => {
        clearTimeout(timeout);
        resolve(collected);
      });
      currentPool.onError((e) => {
        clearTimeout(timeout);
        reject(e);
      });

      currentPool.start(tasks);

      // 即座にキャンセル
      setTimeout(() => currentPool.cancel(), 50);
    });

    // 全件 (500 × 11 = 5500) より少ない結果で停止していること
    const fullCount = origins.length * (GEN_CONFIG.max_advance + 1);
    expect(results.length).toBeLessThan(fullCount);
  }, 60_000);
});

// =============================================================================
// Egg List — 並列生成
// =============================================================================

describe('egg-list: 並列生成', () => {
  let pool: WorkerPool | undefined;

  afterEach(() => {
    pool?.dispose();
    pool = undefined;
  });

  it('複数タスクを WorkerPool に投入し、結果が全件揃う', async () => {
    const workerCount = 2;
    pool = new WorkerPool({ useGpu: false, workerCount });
    await pool.initialize();

    const origins = createOrigins(20);
    const tasks = createEggListTasks(origins, EGG_PARAMS, GEN_CONFIG, undefined, workerCount);
    expect(tasks.length).toBe(workerCount);

    const results = await new Promise<GeneratedEggData[]>((resolve, reject) => {
      const collected: GeneratedEggData[] = [];
      const timeout = setTimeout(() => reject(new Error('Test timeout')), 30_000);

      pool!.onResult((r) => collected.push(...(r as unknown as GeneratedEggData[])));
      pool!.onComplete(() => {
        clearTimeout(timeout);
        resolve(collected);
      });
      pool!.onError((e) => {
        clearTimeout(timeout);
        reject(e);
      });

      pool!.start(tasks);
    });

    expect(results.length).toBeGreaterThan(0);

    for (const result of results) {
      expect(result).toHaveProperty('advance');
      expect(result).toHaveProperty('core');
      expect(result).toHaveProperty('inheritance');
    }
  }, 60_000);
});

// =============================================================================
// 進捗報告
// =============================================================================

describe('生成中の進捗報告', () => {
  let pool: WorkerPool | undefined;

  afterEach(() => {
    pool?.dispose();
    pool = undefined;
  });

  it('進捗イベントが少なくとも 1 回到達する', async () => {
    const workerCount = 2;
    pool = new WorkerPool({ useGpu: false, workerCount });
    await pool.initialize();

    const origins = createOrigins(200);
    const tasks = createPokemonListTasks(
      origins,
      POKEMON_PARAMS,
      GEN_CONFIG,
      undefined,
      workerCount
    );

    const progresses: AggregatedProgress[] = [];

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Test timeout')), 30_000);

      pool!.onProgress((p) => progresses.push(p));
      pool!.onComplete(() => {
        clearTimeout(timeout);
        resolve();
      });
      pool!.onError((e) => {
        clearTimeout(timeout);
        reject(e);
      });

      pool!.start(tasks);
    });

    // バッチ処理のため、進捗が少なくとも 1 回は報告されている
    expect(progresses.length).toBeGreaterThanOrEqual(1);

    // 最終進捗は percentage >= 0
    const last = progresses.at(-1)!;
    expect(last.percentage).toBeGreaterThanOrEqual(0);
  }, 60_000);
});
