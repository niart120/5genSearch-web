import { describe, expect, it } from 'vitest';
import {
  getDateRangeErrors,
  isDateRangeValid,
  isIntegerRangeValid,
  isIvFilterRangeValid,
  isTimeRangeValid,
} from '@/lib/range-validation';
import { validateMtseedSearchForm } from '@/features/datetime-search/types';
import { validateEggSearchForm } from '@/features/egg-search/types';
import { validateTidAdjustForm } from '@/features/tid-adjust/types';
import { validatePokemonSearchForm } from '@/features/pokemon-search/types';
import { validateWonderCardSearchRange } from '@/features/wondercard-search/types';
import { validatePokemonListForm } from '@/features/pokemon-list/types';
import { validateEggListForm } from '@/features/egg-list/types';
import {
  validateWonderCardForm,
  getWonderCardInitialFormState,
} from '@/features/wondercard-list/types';
import { validateMtseedIvSearchForm } from '@/features/mtseed-search/types';
import { getDatetimeSearchInitialState } from '@/features/datetime-search/store';
import { getEggSearchInitialState } from '@/features/egg-search/store';
import { getEggListInitialState } from '@/features/egg-list/store';
import { getTidAdjustInitialState } from '@/features/tid-adjust/store';
import { getPokemonSearchInitialState } from '@/features/pokemon-search/store';
import { getPokemonListInitialState } from '@/features/pokemon-list/store';
import { getDsConfigInitialState } from '@/stores/settings/ds-config';
import {
  DEFAULT_IV_RANGES,
  normalizeIvFilter,
  normalizeEggFilter,
  normalizePokemonFilter,
  normalizeWonderCardFilter,
  type IvFilterInput,
} from '@/lib/search-filter-context';
import { UI_CARD, UI_ORIGIN } from '@/test/fixtures/wondercards/ui';

function searchRange() {
  return {
    dateRange: {
      start_year: 2026,
      start_month: 2,
      start_day: 1,
      end_year: 2026,
      end_month: 2,
      end_day: 1,
    },
    timeRange: {
      hour_start: 0,
      hour_end: 23,
      minute_start: 0,
      minute_end: 59,
      second_start: 0,
      second_end: 59,
    },
    keySpec: { available_buttons: [] },
  };
}

function validateEveryDatetimeScreen(
  range: ReturnType<typeof searchRange>,
  ranges = getDsConfigInitialState().ranges
) {
  return [
    validateMtseedSearchForm(
      { ...getDatetimeSearchInitialState(), ...range },
      { seeds: [0], errors: [] },
      ranges
    ).errors,
    validateEggSearchForm({ ...getEggSearchInitialState(), ...range }, ranges).errors,
    validateTidAdjustForm({ ...getTidAdjustInitialState(), ...range }, ranges).errors,
    validatePokemonSearchForm({ ...getPokemonSearchInitialState(), ...range }, {}, ranges),
    validateWonderCardSearchRange(range, ranges),
  ];
}

describe('共通範囲検証', () => {
  it.each([
    {
      startDay: 29,
      endDay: 28,
      expected: { startInvalid: true, endInvalid: false, reversed: false },
    },
    {
      startDay: 28,
      endDay: 29,
      expected: { startInvalid: false, endInvalid: true, reversed: false },
    },
    {
      startDay: 30,
      endDay: 29,
      expected: { startInvalid: true, endInvalid: true, reversed: false },
    },
    {
      startDay: 28,
      endDay: 27,
      expected: { startInvalid: false, endInvalid: false, reversed: true },
    },
    {
      startDay: 28,
      endDay: 28,
      expected: { startInvalid: false, endInvalid: false, reversed: false },
    },
  ])(
    '2月 $startDay 日～$endDay 日の理由と全画面の検索可否が一致する',
    ({ startDay, endDay, expected }) => {
      const range = searchRange();
      range.dateRange.start_day = startDay;
      range.dateRange.end_day = endDay;
      expect(getDateRangeErrors(range.dateRange)).toEqual(expected);
      const invalid = expected.startInvalid || expected.endInvalid || expected.reversed;
      expect(isDateRangeValid(range.dateRange)).toBe(!invalid);
      expect(
        validateEveryDatetimeScreen(range).map((errors) => errors.includes('DATE_RANGE_INVALID'))
      ).toEqual(Array.from({ length: 5 }, () => invalid));
    }
  );

  it.each(['date', 'hour', 'minute', 'second'] as const)(
    '%s: 全日時検索画面で不正な範囲を拒否する',
    (field) => {
      const range = searchRange();
      if (field === 'date') {
        range.dateRange.start_day = 31;
        range.dateRange.end_day = 31;
      } else {
        range.timeRange[`${field}_start`] = 1;
        range.timeRange[`${field}_end`] = 0;
      }
      const code = field === 'date' ? 'DATE_RANGE_INVALID' : 'TIME_RANGE_INVALID';
      expect(validateEveryDatetimeScreen(range).map((errors) => errors.includes(code))).toEqual([
        true,
        true,
        true,
        true,
        true,
      ]);
    }
  );

  it.each(['timer0', 'vcount'] as const)('%s: 全日時検索画面で逆転を拒否する', (field) => {
    const ranges = [
      { timer0_min: 1, timer0_max: 1, vcount_min: 1, vcount_max: 1, [`${field}_min`]: 2 },
    ];
    expect(
      validateEveryDatetimeScreen(searchRange(), ranges).map((errors) =>
        errors.includes('STARTUP_RANGE_INVALID')
      )
    ).toEqual([true, true, true, true, true]);
  });

  it('同値の両端と閏日を受け入れ、非閏日の2月29日を拒否する', () => {
    const date = {
      start_year: 2024,
      start_month: 2,
      start_day: 29,
      end_year: 2024,
      end_month: 2,
      end_day: 29,
    };
    expect(isDateRangeValid(date)).toBe(true);
    expect(isDateRangeValid({ ...date, start_year: 2025, end_year: 2025 })).toBe(false);
    expect(isIntegerRangeValid(31, 31, 0, 31)).toBe(true);
    expect(
      isTimeRangeValid({
        hour_start: 0,
        hour_end: 0,
        minute_start: 0,
        minute_end: 0,
        second_start: 0,
        second_end: 0,
      })
    ).toBe(true);
  });

  it.each([
    [31, 0],
    [-1, 31],
    [0, 32],
    [0.5, 31],
    [Number.NaN, 31],
  ])('個体値 %s～%s は無効', (min, max) => {
    expect(isIvFilterRangeValid({ ...DEFAULT_IV_RANGES, hp: [min, max] })).toBe(false);
  });
});

describe('適用するフィルターだけを検証する', () => {
  it.each(['enabled', 'any', 'off', 'stats'] as const)(
    '%s: 各個体値フィルター画面の検証結果が一致する',
    (mode) => {
      const iv: IvFilterInput = {
        ...DEFAULT_IV_RANGES,
        spe: [31, 0],
        enabledStats: { spe: mode !== 'any' },
      };
      const input = {
        iv,
        enabled: mode !== 'off',
        natures: undefined,
        stats: undefined,
        shiny: undefined,
        gender: undefined,
        ability_slot: undefined,
      };
      const display = mode === 'stats' ? 'stats' : 'ivs';
      const egg = getEggSearchInitialState();
      const eggFilter = normalizeEggFilter(input, undefined, egg.eggParams, display);
      const pokemon = getPokemonListInitialState();
      const pokemonFilter = normalizePokemonFilter(
        input,
        undefined,
        pokemon.encounterParams,
        display
      );
      const wonder = normalizeWonderCardFilter(
        input,
        undefined,
        { card: UI_CARD, genderRatio: 'F1M1' },
        display
      );
      const expected = mode === 'enabled';
      expect([
        validatePokemonListForm(
          {
            ...pokemon,
            ...pokemon.encounterParams,
            seedOrigins: [UI_ORIGIN],
            filter: pokemonFilter,
          },
          true
        ).errors.includes('IV_RANGE_INVALID'),
        validateEggListForm({
          ...getEggListInitialState(),
          seedOrigins: [UI_ORIGIN],
          filter: eggFilter,
        }).errors.includes('IV_RANGE_INVALID'),
        validateEggSearchForm({ ...egg, filter: eggFilter }).errors.includes('IV_RANGE_INVALID'),
        validateWonderCardForm(getWonderCardInitialFormState(), wonder).includes(
          'IV_RANGE_INVALID'
        ),
      ]).toEqual([expected, expected, expected, expected]);
      if (mode === 'enabled' || mode === 'any') {
        expect(
          validateMtseedIvSearchForm({
            ivFilter: normalizeIvFilter(iv) ?? DEFAULT_IV_RANGES,
            mtOffset: 0,
            isRoamer: false,
          }).errors.includes('IV_RANGE_INVALID')
        ).toBe(expected);
      }
    }
  );

  it.each(['enabled', 'off', 'hidden'] as const)(
    'レベル %s: ポケモン個体生成と検索で同じ検証をする',
    (mode) => {
      const pokemon = getPokemonSearchInitialState();
      const context = {
        ...pokemon.encounterParams,
        encounterType: mode === 'hidden' ? ('StaticSymbol' as const) : ('Normal' as const),
      };
      const filter = {
        ...pokemon.filter,
        level_range: [100, 1] as [number, number],
        levelEnabled: mode !== 'off',
      };
      expect(
        validatePokemonSearchForm(
          { ...pokemon, encounterParams: context, filter },
          {},
          getDsConfigInitialState().ranges
        ).includes('LEVEL_RANGE_INVALID')
      ).toBe(mode === 'enabled');
      expect(
        validatePokemonListForm(
          {
            seedInputMode: 'import',
            seedOrigins: [UI_ORIGIN],
            ...context,
            filter: normalizePokemonFilter(filter, undefined, context, 'ivs'),
          },
          true
        ).errors.includes('LEVEL_RANGE_INVALID')
      ).toBe(mode === 'enabled');
    }
  );
});
