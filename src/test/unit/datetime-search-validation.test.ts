/**
 * validateMtseedSearchForm のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import {
  validateMtseedSearchForm,
  type MtseedSearchFormState,
  type ParsedTargetSeeds,
} from '@/features/datetime-search/types';

function createDefaultForm(overrides?: Partial<MtseedSearchFormState>): MtseedSearchFormState {
  return {
    dateRange: {
      start_year: 2025,
      start_month: 1,
      start_day: 1,
      end_year: 2025,
      end_month: 1,
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
    targetSeedsRaw: '12345678',
    ...overrides,
  };
}

function createDefaultParsed(overrides?: Partial<ParsedTargetSeeds>): ParsedTargetSeeds {
  return {
    seeds: [0x12_34_56_78],
    errors: [],
    ...overrides,
  };
}

describe('validateMtseedSearchForm', () => {
  it('正常なフォームは valid を返す', () => {
    const result = validateMtseedSearchForm(createDefaultForm(), createDefaultParsed());
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('日付範囲が逆転している場合はエラーを返す', () => {
    const form = createDefaultForm({
      dateRange: {
        start_year: 2025,
        start_month: 6,
        start_day: 1,
        end_year: 2025,
        end_month: 1,
        end_day: 1,
      },
    });
    const result = validateMtseedSearchForm(form, createDefaultParsed());
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('開始日は終了日以前を指定してください');
  });

  it('開始日と終了日が同じ場合は valid を返す', () => {
    const result = validateMtseedSearchForm(createDefaultForm(), createDefaultParsed());
    expect(result.isValid).toBe(true);
  });

  it('Target Seeds が空の場合はエラーを返す', () => {
    const form = createDefaultForm({ targetSeedsRaw: '' });
    const parsed = createDefaultParsed({ seeds: [] });
    const result = validateMtseedSearchForm(form, parsed);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('MT Seed を 1 つ以上入力してください');
  });

  it('Target Seeds にパースエラーがある場合はエラーを返す', () => {
    const parsed = createDefaultParsed({
      errors: [{ line: 1, value: 'invalid', message: 'parse error' }],
    });
    const result = validateMtseedSearchForm(createDefaultForm(), parsed);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('MT Seed は 0〜FFFFFFFF の範囲で指定してください');
  });

  it('時刻範囲が無効な場合はエラーを返す', () => {
    const form = createDefaultForm({
      timeRange: {
        hour_start: -1,
        hour_end: 23,
        minute_start: 0,
        minute_end: 59,
        second_start: 0,
        second_end: 59,
      },
    });
    const result = validateMtseedSearchForm(form, createDefaultParsed());
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('時刻の範囲が無効です');
  });

  it('複数のエラーを同時に報告する', () => {
    const form = createDefaultForm({
      dateRange: {
        start_year: 2025,
        start_month: 12,
        start_day: 31,
        end_year: 2025,
        end_month: 1,
        end_day: 1,
      },
      targetSeedsRaw: '',
    });
    const parsed = createDefaultParsed({ seeds: [] });
    const result = validateMtseedSearchForm(form, parsed);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
