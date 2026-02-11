/**
 * validateEggSearchForm のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import { validateEggSearchForm, type EggSearchFormState } from '@/features/egg-search/types';
import type { Ivs } from '@/wasm/wasm_pkg.js';

const DEFAULT_IVS: Ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

function createDefaultForm(overrides?: Partial<EggSearchFormState>): EggSearchFormState {
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
    eggParams: {
      trainer: { tid: 0, sid: 0 },
      everstone: 'None',
      female_has_hidden: false,
      uses_ditto: false,
      gender_ratio: 'F1M1',
      nidoran_flag: false,
      masuda_method: false,
      parent_male: { ...DEFAULT_IVS },
      parent_female: { ...DEFAULT_IVS },
      consider_npc: false,
      species_id: undefined,
    },
    genConfig: {
      user_offset: 0,
      max_advance: 100,
    },
    filter: undefined,
    ...overrides,
  };
}

describe('validateEggSearchForm', () => {
  it('正常なフォームは valid を返す', () => {
    const result = validateEggSearchForm(createDefaultForm());
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
    const result = validateEggSearchForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('DATE_RANGE_INVALID');
  });

  it('開始日と終了日が同じ場合は valid を返す', () => {
    const result = validateEggSearchForm(createDefaultForm());
    expect(result.isValid).toBe(true);
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
    const result = validateEggSearchForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('TIME_RANGE_INVALID');
  });

  it('user_offset が負の場合はエラーを返す', () => {
    const form = createDefaultForm({
      genConfig: { user_offset: -1, max_advance: 100 },
    });
    const result = validateEggSearchForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('OFFSET_NEGATIVE');
  });

  it('max_advance < user_offset の場合はエラーを返す', () => {
    const form = createDefaultForm({
      genConfig: { user_offset: 50, max_advance: 10 },
    });
    const result = validateEggSearchForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('ADVANCE_RANGE_INVALID');
  });

  it('max_advance === user_offset の場合は valid を返す', () => {
    const form = createDefaultForm({
      genConfig: { user_offset: 50, max_advance: 50 },
    });
    const result = validateEggSearchForm(form);
    expect(result.isValid).toBe(true);
  });

  it('親個体値が 32 (Unknown) の場合は valid を返す', () => {
    const form = createDefaultForm();
    form.eggParams.parent_male = { hp: 32, atk: 32, def: 32, spa: 32, spd: 32, spe: 32 };
    const result = validateEggSearchForm(form);
    expect(result.isValid).toBe(true);
  });

  it('親個体値が 33 以上の場合はエラーを返す', () => {
    const form = createDefaultForm();
    form.eggParams.parent_male = { hp: 33, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    const result = validateEggSearchForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('IV_OUT_OF_RANGE');
  });

  it('メス親の個体値が範囲外の場合もエラーを返す', () => {
    const form = createDefaultForm();
    form.eggParams.parent_female = { hp: 0, atk: -1, def: 0, spa: 0, spd: 0, spe: 0 };
    const result = validateEggSearchForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('IV_OUT_OF_RANGE');
  });

  it('個体値が全て 31 の場合は valid を返す', () => {
    const form = createDefaultForm();
    form.eggParams.parent_male = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    form.eggParams.parent_female = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    const result = validateEggSearchForm(form);
    expect(result.isValid).toBe(true);
  });

  it('複数のエラーが同時に発生する場合は全て返す', () => {
    const form = createDefaultForm({
      dateRange: {
        start_year: 2025,
        start_month: 12,
        start_day: 1,
        end_year: 2025,
        end_month: 1,
        end_day: 1,
      },
      genConfig: { user_offset: -1, max_advance: -2 },
    });
    const result = validateEggSearchForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('DATE_RANGE_INVALID');
    expect(result.errors).toContain('OFFSET_NEGATIVE');
    expect(result.errors).toContain('ADVANCE_RANGE_INVALID');
  });
});
