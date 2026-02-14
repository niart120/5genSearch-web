/**
 * ID 調整 (TrainerInfo) 検索の統合テスト
 *
 * WASM の TrainerInfoSearcher を直接呼び出し、
 * 既知の DS 設定 + フィルタで検索が完走することを検証する。
 */

import { describe, it, expect } from 'vitest';
import { generate_trainer_info_search_tasks, TrainerInfoSearcher } from '../../wasm/wasm_pkg.js';
import type {
  DatetimeSearchContext,
  TrainerInfoFilter,
  GameStartConfig,
  TrainerInfoSearchResult,
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

const testGameStart: GameStartConfig = {
  start_mode: 'NewGame',
  save: 'NoSave',
  memory_link: 'Disabled',
  shiny_charm: 'NotObtained',
};

describe('TrainerInfoSearch Integration', () => {
  it('タスク生成で複数タスクに分割される', () => {
    const filter: TrainerInfoFilter = {
      tid: 12_345,
      sid: undefined,
      shiny_pid: undefined,
    };
    const tasks = generate_trainer_info_search_tasks(testContext, filter, testGameStart, 4);
    expect(tasks.length).toBeGreaterThanOrEqual(1);
  });

  it('TID フィルタで検索が完走し結果が TrainerInfoSearchResult 型である', () => {
    const filter: TrainerInfoFilter = {
      tid: 0,
      sid: undefined,
      shiny_pid: undefined,
    };
    const tasks = generate_trainer_info_search_tasks(testContext, filter, testGameStart, 1);

    const allResults: TrainerInfoSearchResult[] = [];
    for (const params of tasks) {
      const searcher = new TrainerInfoSearcher(params);
      while (!searcher.is_done) {
        const batch = searcher.next_batch(1000);
        if (batch.results.length > 0) {
          allResults.push(...batch.results);
        }
      }
      searcher.free();
    }

    // 結果があれば型を検証
    for (const result of allResults) {
      expect(result).toHaveProperty('trainer');
      expect(result).toHaveProperty('seed_origin');
      expect(result.trainer).toHaveProperty('tid');
      expect(result.trainer).toHaveProperty('sid');
      expect('Startup' in result.seed_origin).toBe(true);
    }
  }, 60_000);

  it('フィルタ未指定で検索が完走する', () => {
    const filter: TrainerInfoFilter = {
      tid: undefined,
      sid: undefined,
      shiny_pid: undefined,
    };
    // 狭い範囲で検索 (結果件数が膨大にならないよう)
    const narrowContext: DatetimeSearchContext = {
      ...testContext,
      time_range: {
        hour_start: 0,
        hour_end: 0,
        minute_start: 0,
        minute_end: 0,
        second_start: 0,
        second_end: 0,
      },
    };
    const tasks = generate_trainer_info_search_tasks(narrowContext, filter, testGameStart, 1);

    let totalProcessed = 0n;
    for (const params of tasks) {
      const searcher = new TrainerInfoSearcher(params);
      while (!searcher.is_done) {
        const batch = searcher.next_batch(1000);
        totalProcessed = batch.processed_count;
      }
      searcher.free();
    }

    expect(totalProcessed).toBeGreaterThan(0n);
  }, 30_000);
});
