/**
 * 検索結果件数の事前見積もりモジュールのユニットテスト
 */

import { describe, it, expect } from 'vitest';
import {
  countDays,
  countValidSeconds,
  countKeyCombinations,
  calculateDatetimeSearchSpace,
  estimateIvFilterHitRate,
  estimateCoreDataFilterHitRate,
  estimateTrainerInfoFilterHitRate,
  estimateEggFilterHitRate,
  estimatePokemonFilterHitRate,
  estimateDatetimeSearchResults,
  estimateMtseedSearchResults,
  estimateEggSearchResults,
  estimateTidAdjustResults,
  estimatePokemonListResults,
  estimateEggListResults,
  DEFAULT_RESULT_WARNING_THRESHOLD,
} from '@/services/search-estimation';
import type {
  DateRangeParams,
  TimeRangeParams,
  Timer0VCountRange,
  KeySpec,
  IvFilter,
  CoreDataFilter,
  TrainerInfoFilter,
  EggFilter,
  PokemonFilter,
} from '@/wasm/wasm_pkg.js';

// ---------------------------------------------------------------------------
// countDays
// ---------------------------------------------------------------------------

describe('countDays', () => {
  it('同一日 → 1', () => {
    const range: DateRangeParams = {
      start_year: 2000,
      start_month: 1,
      start_day: 1,
      end_year: 2000,
      end_month: 1,
      end_day: 1,
    };
    expect(countDays(range)).toBe(1);
  });

  it('2 日間', () => {
    const range: DateRangeParams = {
      start_year: 2000,
      start_month: 1,
      start_day: 1,
      end_year: 2000,
      end_month: 1,
      end_day: 2,
    };
    expect(countDays(range)).toBe(2);
  });

  it('年跨ぎ (2000/12/31 → 2001/1/1)', () => {
    const range: DateRangeParams = {
      start_year: 2000,
      start_month: 12,
      start_day: 31,
      end_year: 2001,
      end_month: 1,
      end_day: 1,
    };
    expect(countDays(range)).toBe(2);
  });

  it('閏年 2 月 (2000/2/1 → 2000/2/29 = 29 日)', () => {
    const range: DateRangeParams = {
      start_year: 2000,
      start_month: 2,
      start_day: 1,
      end_year: 2000,
      end_month: 2,
      end_day: 29,
    };
    expect(countDays(range)).toBe(29);
  });

  it('1 年間 (2000/1/1 → 2000/12/31 = 366 日, 閏年)', () => {
    const range: DateRangeParams = {
      start_year: 2000,
      start_month: 1,
      start_day: 1,
      end_year: 2000,
      end_month: 12,
      end_day: 31,
    };
    expect(countDays(range)).toBe(366);
  });
});

// ---------------------------------------------------------------------------
// countValidSeconds
// ---------------------------------------------------------------------------

describe('countValidSeconds', () => {
  it('全範囲 (0-23, 0-59, 0-59) → 86400', () => {
    const range: TimeRangeParams = {
      hour_start: 0,
      hour_end: 23,
      minute_start: 0,
      minute_end: 59,
      second_start: 0,
      second_end: 59,
    };
    expect(countValidSeconds(range)).toBe(86_400);
  });

  it('単一秒 (12:30:45 → 12:30:45) → 1', () => {
    const range: TimeRangeParams = {
      hour_start: 12,
      hour_end: 12,
      minute_start: 30,
      minute_end: 30,
      second_start: 45,
      second_end: 45,
    };
    expect(countValidSeconds(range)).toBe(1);
  });

  it('1 時間 × 全分 × 全秒 → 3600', () => {
    const range: TimeRangeParams = {
      hour_start: 10,
      hour_end: 10,
      minute_start: 0,
      minute_end: 59,
      second_start: 0,
      second_end: 59,
    };
    expect(countValidSeconds(range)).toBe(3600);
  });
});

// ---------------------------------------------------------------------------
// countKeyCombinations
// ---------------------------------------------------------------------------

describe('countKeyCombinations', () => {
  it('ボタン 0 個 → 1 (空集合のみ)', () => {
    const spec: KeySpec = { available_buttons: [] };
    expect(countKeyCombinations(spec)).toBe(1);
  });

  it('ボタン 1 個 (A) → 2 (空集合 + A)', () => {
    const spec: KeySpec = { available_buttons: ['A'] };
    expect(countKeyCombinations(spec)).toBe(2);
  });

  it('ボタン 2 個 (A, B) → 4 (空, A, B, A+B)', () => {
    const spec: KeySpec = { available_buttons: ['A', 'B'] };
    expect(countKeyCombinations(spec)).toBe(4);
  });

  it('Up + Down → 3 (空, Up, Down; Up+Down を除外)', () => {
    const spec: KeySpec = { available_buttons: ['Up', 'Down'] };
    expect(countKeyCombinations(spec)).toBe(3);
  });

  it('Left + Right → 3 (空, Left, Right; Left+Right を除外)', () => {
    const spec: KeySpec = { available_buttons: ['Left', 'Right'] };
    expect(countKeyCombinations(spec)).toBe(3);
  });

  it('L + R + Start + Select → 15 (2^4=16 から ソフトリセット 1 つを除外)', () => {
    const spec: KeySpec = { available_buttons: ['L', 'R', 'Start', 'Select'] };
    expect(countKeyCombinations(spec)).toBe(15);
  });

  it('全 12 ボタン → 有限値 (2^12=4096 から無効パターンを除外)', () => {
    const spec: KeySpec = {
      available_buttons: [
        'A',
        'B',
        'X',
        'Y',
        'L',
        'R',
        'Start',
        'Select',
        'Up',
        'Down',
        'Left',
        'Right',
      ],
    };
    const result = countKeyCombinations(spec);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(4096);
  });
});

// ---------------------------------------------------------------------------
// estimateIvFilterHitRate
// ---------------------------------------------------------------------------

describe('estimateIvFilterHitRate', () => {
  it('全範囲 (0-31) → 1.0', () => {
    const filter: IvFilter = {
      hp: [0, 31],
      atk: [0, 31],
      def: [0, 31],
      spa: [0, 31],
      spd: [0, 31],
      spe: [0, 31],
    };
    expect(estimateIvFilterHitRate(filter)).toBeCloseTo(1);
  });

  it('単一値 6V (31-31) → (1/32)^6', () => {
    const filter: IvFilter = {
      hp: [31, 31],
      atk: [31, 31],
      def: [31, 31],
      spa: [31, 31],
      spd: [31, 31],
      spe: [31, 31],
    };
    expect(estimateIvFilterHitRate(filter)).toBeCloseTo((1 / 32) ** 6);
  });

  it('めざパタイプ 1 種指定 → IV rate × 1/16', () => {
    const filter: IvFilter = {
      hp: [0, 31],
      atk: [0, 31],
      def: [0, 31],
      spa: [0, 31],
      spd: [0, 31],
      spe: [0, 31],
      hidden_power_types: ['Fire'],
    };
    expect(estimateIvFilterHitRate(filter)).toBeCloseTo(1 / 16);
  });

  it('めざパ最低威力 70 → IV rate × 1/41', () => {
    const filter: IvFilter = {
      hp: [0, 31],
      atk: [0, 31],
      def: [0, 31],
      spa: [0, 31],
      spd: [0, 31],
      spe: [0, 31],
      hidden_power_min_power: 70,
    };
    expect(estimateIvFilterHitRate(filter)).toBeCloseTo(1 / 41);
  });
});

// ---------------------------------------------------------------------------
// estimateCoreDataFilterHitRate
// ---------------------------------------------------------------------------

describe('estimateCoreDataFilterHitRate', () => {
  it('undefined → 1.0', () => {
    expect(estimateCoreDataFilterHitRate()).toBe(1);
  });

  it('色違い Star → 7/65536', () => {
    const filter: CoreDataFilter = {
      iv: undefined,
      natures: undefined,
      gender: undefined,
      ability_slot: undefined,
      shiny: 'Star',
      stats: undefined,
    };
    expect(estimateCoreDataFilterHitRate(filter)).toBeCloseTo(7 / 65_536);
  });

  it('色違い Square → 1/65536', () => {
    const filter: CoreDataFilter = {
      iv: undefined,
      natures: undefined,
      gender: undefined,
      ability_slot: undefined,
      shiny: 'Square',
      stats: undefined,
    };
    expect(estimateCoreDataFilterHitRate(filter)).toBeCloseTo(1 / 65_536);
  });

  it('性格 5 種指定 → 5/25', () => {
    const filter: CoreDataFilter = {
      iv: undefined,
      natures: ['Adamant', 'Jolly', 'Modest', 'Timid', 'Bold'],
      gender: undefined,
      ability_slot: undefined,
      shiny: undefined,
      stats: undefined,
    };
    expect(estimateCoreDataFilterHitRate(filter)).toBeCloseTo(5 / 25);
  });

  it('性別指定 → 0.5', () => {
    const filter: CoreDataFilter = {
      iv: undefined,
      natures: undefined,
      gender: 'Male',
      ability_slot: undefined,
      shiny: undefined,
      stats: undefined,
    };
    expect(estimateCoreDataFilterHitRate(filter)).toBeCloseTo(0.5);
  });

  it('特性スロット指定 → 0.5', () => {
    const filter: CoreDataFilter = {
      iv: undefined,
      natures: undefined,
      gender: undefined,
      ability_slot: 'First',
      shiny: undefined,
      stats: undefined,
    };
    expect(estimateCoreDataFilterHitRate(filter)).toBeCloseTo(0.5);
  });
});

// ---------------------------------------------------------------------------
// estimateTrainerInfoFilterHitRate
// ---------------------------------------------------------------------------

describe('estimateTrainerInfoFilterHitRate', () => {
  it('全未指定 → 1.0', () => {
    const filter: TrainerInfoFilter = {
      tid: undefined,
      sid: undefined,
      shiny_pid: undefined,
    };
    expect(estimateTrainerInfoFilterHitRate(filter)).toBe(1);
  });

  it('TID のみ → 1/65536', () => {
    const filter: TrainerInfoFilter = {
      tid: 12_345,
      sid: undefined,
      shiny_pid: undefined,
    };
    expect(estimateTrainerInfoFilterHitRate(filter)).toBeCloseTo(1 / 65_536);
  });

  it('TID + SID → 1/65536^2', () => {
    const filter: TrainerInfoFilter = {
      tid: 12_345,
      sid: 54_321,
      shiny_pid: undefined,
    };
    expect(estimateTrainerInfoFilterHitRate(filter)).toBeCloseTo(1 / 65_536 ** 2);
  });

  it('TID + shiny_pid → 1/65536 × 8/65536', () => {
    const filter: TrainerInfoFilter = {
      tid: 12_345,
      sid: undefined,
      shiny_pid: 0xab_cd_12_34,
    };
    expect(estimateTrainerInfoFilterHitRate(filter)).toBeCloseTo((1 / 65_536) * (8 / 65_536));
  });
});

// ---------------------------------------------------------------------------
// estimateEggFilterHitRate
// ---------------------------------------------------------------------------

describe('estimateEggFilterHitRate', () => {
  it('undefined → 1.0', () => {
    expect(estimateEggFilterHitRate(false)).toBe(1);
  });

  it('masuda=true + Shiny → 48/65536 適用', () => {
    const filter: EggFilter = {
      iv: undefined,
      natures: undefined,
      gender: undefined,
      ability_slot: undefined,
      shiny: 'Shiny',
      stats: undefined,
      min_margin_frames: undefined,
    };
    expect(estimateEggFilterHitRate(true, filter)).toBeCloseTo(48 / 65_536);
  });

  it('masuda=false + Shiny → 8/65536', () => {
    const filter: EggFilter = {
      iv: undefined,
      natures: undefined,
      gender: undefined,
      ability_slot: undefined,
      shiny: 'Shiny',
      stats: undefined,
      min_margin_frames: undefined,
    };
    expect(estimateEggFilterHitRate(false, filter)).toBeCloseTo(8 / 65_536);
  });
});

// ---------------------------------------------------------------------------
// estimatePokemonFilterHitRate
// ---------------------------------------------------------------------------

describe('estimatePokemonFilterHitRate', () => {
  it('undefined → 1.0', () => {
    expect(estimatePokemonFilterHitRate()).toBe(1);
  });

  it('CoreDataFilter 部分の概算 (性格 1 種 + 性別)', () => {
    const filter: PokemonFilter = {
      iv: undefined,
      natures: ['Adamant'],
      gender: 'Male',
      ability_slot: undefined,
      shiny: undefined,
      stats: undefined,
      species_ids: [25], // 概算対象外
      level_range: [5, 10], // 概算対象外
    };
    expect(estimatePokemonFilterHitRate(filter)).toBeCloseTo((1 / 25) * 0.5);
  });
});

// ---------------------------------------------------------------------------
// calculateDatetimeSearchSpace
// ---------------------------------------------------------------------------

describe('calculateDatetimeSearchSpace', () => {
  it('複数 Timer0VCountRange の合算', () => {
    const dateRange: DateRangeParams = {
      start_year: 2000,
      start_month: 1,
      start_day: 1,
      end_year: 2000,
      end_month: 1,
      end_day: 1,
    };
    const timeRange: TimeRangeParams = {
      hour_start: 0,
      hour_end: 0,
      minute_start: 0,
      minute_end: 0,
      second_start: 0,
      second_end: 0,
    };
    const ranges: Timer0VCountRange[] = [
      { timer0_min: 0x6_00, timer0_max: 0x6_02, vcount_min: 0x50, vcount_max: 0x51 },
      { timer0_min: 0x7_00, timer0_max: 0x7_00, vcount_min: 0x60, vcount_max: 0x60 },
    ];
    // days=1, seconds=1, t0vc=(3*2 + 1*1)=7, keys=1
    expect(calculateDatetimeSearchSpace(dateRange, timeRange, ranges, 1)).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// estimateMtseedSearchResults (統合)
// ---------------------------------------------------------------------------

describe('estimateMtseedSearchResults', () => {
  it('6V → (2^32) × (1/32)^6', () => {
    const filter: IvFilter = {
      hp: [31, 31],
      atk: [31, 31],
      def: [31, 31],
      spa: [31, 31],
      spd: [31, 31],
      spe: [31, 31],
    };
    const result = estimateMtseedSearchResults(filter);
    expect(result.searchSpaceSize).toBe(2 ** 32);
    expect(result.estimatedCount).toBeCloseTo(2 ** 32 * (1 / 32) ** 6, -1);
    // (1/32)^6 ≈ 9.31e-10, 2^32 * 9.31e-10 ≈ 4
    expect(result.exceedsThreshold).toBe(false);
  });

  it('全範囲 IV → 閾値超過', () => {
    const filter: IvFilter = {
      hp: [0, 31],
      atk: [0, 31],
      def: [0, 31],
      spa: [0, 31],
      spd: [0, 31],
      spe: [0, 31],
    };
    const result = estimateMtseedSearchResults(filter);
    expect(result.estimatedCount).toBe(2 ** 32);
    expect(result.exceedsThreshold).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// estimateTidAdjustResults (統合)
// ---------------------------------------------------------------------------

describe('estimateTidAdjustResults', () => {
  it('検索空間 × ヒット率 = 推定件数、閾値超過判定', () => {
    const dateRange: DateRangeParams = {
      start_year: 2000,
      start_month: 1,
      start_day: 1,
      end_year: 2000,
      end_month: 12,
      end_day: 31,
    };
    const timeRange: TimeRangeParams = {
      hour_start: 0,
      hour_end: 23,
      minute_start: 0,
      minute_end: 59,
      second_start: 0,
      second_end: 59,
    };
    const ranges: Timer0VCountRange[] = [
      { timer0_min: 0x6_00, timer0_max: 0x6_01, vcount_min: 0x50, vcount_max: 0x50 },
    ];
    // 全未指定フィルタ → hitRate=1.0
    const filter: TrainerInfoFilter = {
      tid: undefined,
      sid: undefined,
      shiny_pid: undefined,
    };
    const result = estimateTidAdjustResults(dateRange, timeRange, ranges, 1, filter);
    // days=366, seconds=86400, t0vc=2, keys=1
    const expectedSpace = 366 * 86_400 * 2 * 1;
    expect(result.searchSpaceSize).toBe(expectedSpace);
    expect(result.estimatedCount).toBe(expectedSpace);
    expect(result.exceedsThreshold).toBe(true);
  });

  it('TID 指定 → ヒット率 1/65536', () => {
    const dateRange: DateRangeParams = {
      start_year: 2000,
      start_month: 1,
      start_day: 1,
      end_year: 2000,
      end_month: 1,
      end_day: 1,
    };
    const timeRange: TimeRangeParams = {
      hour_start: 0,
      hour_end: 23,
      minute_start: 0,
      minute_end: 59,
      second_start: 0,
      second_end: 59,
    };
    const ranges: Timer0VCountRange[] = [
      { timer0_min: 0x6_00, timer0_max: 0x6_00, vcount_min: 0x50, vcount_max: 0x50 },
    ];
    const filter: TrainerInfoFilter = {
      tid: 12_345,
      sid: undefined,
      shiny_pid: undefined,
    };
    const result = estimateTidAdjustResults(dateRange, timeRange, ranges, 1, filter);
    expect(result.hitRate).toBeCloseTo(1 / 65_536);
  });
});

// ---------------------------------------------------------------------------
// estimatePokemonListResults
// ---------------------------------------------------------------------------

describe('estimatePokemonListResults', () => {
  it('seeds=100, advance=1000, offset=0, filter=none → 100,000 件、閾値超過', () => {
    const result = estimatePokemonListResults(100, 1000, 0);
    expect(result.searchSpaceSize).toBe(100_000);
    expect(result.hitRate).toBe(1);
    expect(result.estimatedCount).toBe(100_000);
    expect(result.exceedsThreshold).toBe(true);
  });

  it('フィルタ付き → ヒット率が適用される', () => {
    const filter: PokemonFilter = {
      iv: undefined,
      natures: ['Adamant'],
      gender: undefined,
      ability_slot: undefined,
      shiny: undefined,
      stats: undefined,
      species_ids: undefined,
      level_range: undefined,
    };
    const result = estimatePokemonListResults(100, 1000, 0, filter);
    expect(result.hitRate).toBeCloseTo(1 / 25);
    expect(result.estimatedCount).toBeCloseTo(100_000 / 25);
  });
});

// ---------------------------------------------------------------------------
// estimateEggListResults
// ---------------------------------------------------------------------------

describe('estimateEggListResults', () => {
  it('masuda=true + Shiny → ヒット率にマスダメソッド確率適用', () => {
    const filter: EggFilter = {
      iv: undefined,
      natures: undefined,
      gender: undefined,
      ability_slot: undefined,
      shiny: 'Shiny',
      stats: undefined,
      min_margin_frames: undefined,
    };
    const result = estimateEggListResults(10, 1000, 0, filter, true);
    expect(result.hitRate).toBeCloseTo(48 / 65_536);
    expect(result.searchSpaceSize).toBe(10_000);
  });

  it('フィルタ未指定 → hitRate=1.0', () => {
    const result = estimateEggListResults(10, 100, 0, undefined, false);
    expect(result.hitRate).toBe(1);
    expect(result.estimatedCount).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// estimateDatetimeSearchResults
// ---------------------------------------------------------------------------

describe('estimateDatetimeSearchResults', () => {
  it('targetSeeds=10 で推定', () => {
    const dateRange: DateRangeParams = {
      start_year: 2000,
      start_month: 1,
      start_day: 1,
      end_year: 2000,
      end_month: 1,
      end_day: 1,
    };
    const timeRange: TimeRangeParams = {
      hour_start: 0,
      hour_end: 23,
      minute_start: 0,
      minute_end: 59,
      second_start: 0,
      second_end: 59,
    };
    const ranges: Timer0VCountRange[] = [
      { timer0_min: 0x6_00, timer0_max: 0x6_01, vcount_min: 0x50, vcount_max: 0x50 },
    ];
    const result = estimateDatetimeSearchResults(dateRange, timeRange, ranges, 1, 10);
    // space = 1 * 86400 * 2 * 1 = 172800
    // hitRate = 10 / 2^32
    expect(result.searchSpaceSize).toBe(172_800);
    expect(result.hitRate).toBeCloseTo(10 / 2 ** 32);
    expect(result.exceedsThreshold).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// estimateEggSearchResults
// ---------------------------------------------------------------------------

describe('estimateEggSearchResults', () => {
  it('フィルタ未指定 → hitRate=1.0', () => {
    const dateRange: DateRangeParams = {
      start_year: 2000,
      start_month: 1,
      start_day: 1,
      end_year: 2000,
      end_month: 1,
      end_day: 1,
    };
    const timeRange: TimeRangeParams = {
      hour_start: 0,
      hour_end: 0,
      minute_start: 0,
      minute_end: 0,
      second_start: 0,
      second_end: 0,
    };
    const ranges: Timer0VCountRange[] = [
      { timer0_min: 0x6_00, timer0_max: 0x6_00, vcount_min: 0x50, vcount_max: 0x50 },
    ];
    const result = estimateEggSearchResults(dateRange, timeRange, ranges, 1, undefined, false);
    expect(result.hitRate).toBe(1);
    expect(result.searchSpaceSize).toBe(1); // 1*1*1*1
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_RESULT_WARNING_THRESHOLD
// ---------------------------------------------------------------------------

describe('DEFAULT_RESULT_WARNING_THRESHOLD', () => {
  it('50,000', () => {
    expect(DEFAULT_RESULT_WARNING_THRESHOLD).toBe(50_000);
  });
});
