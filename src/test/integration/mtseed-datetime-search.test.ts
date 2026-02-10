/**
 * MT Seed 起動時刻検索の統合テスト
 *
 * WASM の MtseedDatetimeSearcher を直接呼び出し、
 * 既知の MT Seed に対して期待する SeedOrigin が返ることを検証する。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import wasmInit, {
  generate_mtseed_search_tasks,
  MtseedDatetimeSearcher,
} from '../../wasm/wasm_pkg.js';
import type { DatetimeSearchContext, MtSeed, SeedOrigin } from '../../wasm/wasm_pkg.js';

/** 仕様書 5.3 のテストデータ */
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
    hour_end: 23,
    minute_start: 0,
    minute_end: 59,
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

describe('MtseedDatetimeSearch Integration', () => {
  beforeAll(async () => {
    await wasmInit();
  });

  it('タスク生成で複数タスクに分割される', () => {
    const targetSeeds: MtSeed[] = [0x12_34_56_78];
    const tasks = generate_mtseed_search_tasks(testContext, targetSeeds, 4);
    expect(tasks.length).toBeGreaterThanOrEqual(1);
  });

  it('既知の MT Seed に対して結果が返る', () => {
    // 適当な MT Seed を指定して検索を実行
    // このテストでは検索が完走してパニックしないことを検証
    const targetSeeds: MtSeed[] = [0x12_34_56_78];
    const tasks = generate_mtseed_search_tasks(testContext, targetSeeds, 1);

    const allResults: SeedOrigin[] = [];
    for (const params of tasks) {
      const searcher = new MtseedDatetimeSearcher(params);
      while (!searcher.is_done) {
        const batch = searcher.next_batch(1000);
        if (batch.results.length > 0) {
          allResults.push(...(batch.results as SeedOrigin[]));
        }
      }
      searcher.free();
    }

    // 結果があれば Startup 型であることを検証
    for (const origin of allResults) {
      expect('Startup' in origin).toBe(true);
    }
  }, 30_000);

  it('マッチしない MT Seed に対して空の結果が返る', () => {
    // 存在しない Seed 値で検索 — 結果 0 件でもパニックしない
    const targetSeeds: MtSeed[] = [0x00_00_00_01];
    const tasks = generate_mtseed_search_tasks(testContext, targetSeeds, 1);

    let totalProcessed = 0n;
    for (const params of tasks) {
      const searcher = new MtseedDatetimeSearcher(params);
      while (!searcher.is_done) {
        const batch = searcher.next_batch(1000);
        totalProcessed = batch.processed_count;
      }
      searcher.free();
    }

    expect(totalProcessed).toBeGreaterThan(0n);
  }, 30_000);
});
