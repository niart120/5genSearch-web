/**
 * MT Seed IV 検索 — バリデーション / 変換のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import {
  validateMtseedIvSearchForm,
  toMtseedSearchContext,
  type MtseedIvSearchFormState,
} from '@/features/mtseed-search/types';
import type { IvFilter } from '@/wasm/wasm_pkg.js';

const DEFAULT_IV_FILTER: IvFilter = {
  hp: [31, 31],
  atk: [31, 31],
  def: [31, 31],
  spa: [31, 31],
  spd: [31, 31],
  spe: [31, 31],
};

function createDefaultForm(overrides?: Partial<MtseedIvSearchFormState>): MtseedIvSearchFormState {
  return {
    ivFilter: DEFAULT_IV_FILTER,
    mtOffset: 0,
    isRoamer: false,
    ...overrides,
  };
}

describe('validateMtseedIvSearchForm', () => {
  it('正常なフォームは valid を返す', () => {
    const result = validateMtseedIvSearchForm(createDefaultForm());
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('IV 範囲 min > max の場合は IV_RANGE_INVALID を返す', () => {
    const form = createDefaultForm({
      ivFilter: { ...DEFAULT_IV_FILTER, hp: [31, 0] },
    });
    const result = validateMtseedIvSearchForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('IV_RANGE_INVALID');
  });

  it('MT オフセットが負値の場合は MT_OFFSET_NEGATIVE を返す', () => {
    const form = createDefaultForm({ mtOffset: -1 });
    const result = validateMtseedIvSearchForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('MT_OFFSET_NEGATIVE');
  });

  it('複数のエラーを同時に返す', () => {
    const form = createDefaultForm({
      ivFilter: { ...DEFAULT_IV_FILTER, atk: [20, 10] },
      mtOffset: -5,
    });
    const result = validateMtseedIvSearchForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('IV_RANGE_INVALID');
    expect(result.errors).toContain('MT_OFFSET_NEGATIVE');
    expect(result.errors).toHaveLength(2);
  });

  it('IV 範囲 min === max は有効', () => {
    const form = createDefaultForm({
      ivFilter: {
        hp: [15, 15],
        atk: [0, 0],
        def: [31, 31],
        spa: [10, 10],
        spd: [20, 20],
        spe: [5, 5],
      },
    });
    const result = validateMtseedIvSearchForm(form);
    expect(result.isValid).toBe(true);
  });

  it('IV 範囲 0-31 (全範囲) は有効', () => {
    const form = createDefaultForm({
      ivFilter: {
        hp: [0, 31],
        atk: [0, 31],
        def: [0, 31],
        spa: [0, 31],
        spd: [0, 31],
        spe: [0, 31],
      },
    });
    const result = validateMtseedIvSearchForm(form);
    expect(result.isValid).toBe(true);
  });

  it('MT オフセット 0 は有効', () => {
    const form = createDefaultForm({ mtOffset: 0 });
    const result = validateMtseedIvSearchForm(form);
    expect(result.isValid).toBe(true);
  });
});

describe('toMtseedSearchContext', () => {
  it('フォーム状態を WASM コンテキストに変換する', () => {
    const form = createDefaultForm({
      ivFilter: { ...DEFAULT_IV_FILTER, hp: [0, 31] },
      mtOffset: 2,
      isRoamer: true,
    });
    const context = toMtseedSearchContext(form);
    expect(context.iv_filter).toEqual(form.ivFilter);
    expect(context.mt_offset).toBe(2);
    expect(context.is_roamer).toBe(true);
  });

  it('デフォルト値で変換する', () => {
    const form = createDefaultForm();
    const context = toMtseedSearchContext(form);
    expect(context.iv_filter).toEqual(DEFAULT_IV_FILTER);
    expect(context.mt_offset).toBe(0);
    expect(context.is_roamer).toBe(false);
  });
});
