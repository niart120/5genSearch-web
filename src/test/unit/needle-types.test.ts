/**
 * 針読み — パターンパーサー + バリデーションのユニットテスト
 */

import { describe, it, expect } from 'vitest';
import {
  parseNeedlePattern,
  directionsToArrows,
  validateNeedleForm,
} from '@/features/needle/types';
import type { NeedleDirection } from '@/wasm/wasm_pkg.js';

/* ------------------------------------------------------------------ */
/*  parseNeedlePattern                                                 */
/* ------------------------------------------------------------------ */

describe('parseNeedlePattern', () => {
  it('数字列 "24267" を NeedleDirection[] に変換する', () => {
    const result = parseNeedlePattern('24267');
    expect(result).toEqual(['E', 'S', 'E', 'W', 'NW']);
  });

  it('単一桁 "0" を [N] に変換する', () => {
    const result = parseNeedlePattern('0');
    expect(result).toEqual(['N']);
  });

  it('全方向 "01234567" を正しく変換する', () => {
    const result = parseNeedlePattern('01234567');
    expect(result).toEqual(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
  });

  it('空文字列は undefined を返す', () => {
    expect(parseNeedlePattern('')).toBeUndefined();
  });

  it('空白のみは undefined を返す', () => {
    expect(parseNeedlePattern('   ')).toBeUndefined();
  });

  it('範囲外の数字 "89" は undefined を返す', () => {
    expect(parseNeedlePattern('89')).toBeUndefined();
  });

  it('英字 "abc" は undefined を返す', () => {
    expect(parseNeedlePattern('abc')).toBeUndefined();
  });

  it('混在 "12a" は undefined を返す', () => {
    expect(parseNeedlePattern('12a')).toBeUndefined();
  });

  it('前後の空白はトリムされる', () => {
    const result = parseNeedlePattern('  24  ');
    expect(result).toEqual(['E', 'S']);
  });
});

/* ------------------------------------------------------------------ */
/*  directionsToArrows                                                 */
/* ------------------------------------------------------------------ */

describe('directionsToArrows', () => {
  it('["E", "S", "E"] を "→,↓,→" に変換する', () => {
    const dirs: NeedleDirection[] = ['E', 'S', 'E'];
    expect(directionsToArrows(dirs)).toBe('→,↓,→');
  });

  it('全 8 方向を正しく変換する', () => {
    const dirs: NeedleDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    expect(directionsToArrows(dirs)).toBe('↑,↗,→,↘,↓,↙,←,↖');
  });

  it('空配列は空文字列を返す', () => {
    expect(directionsToArrows([])).toBe('');
  });

  it('単一要素 ["N"] は "↑" を返す', () => {
    expect(directionsToArrows(['N'])).toBe('↑');
  });
});

/* ------------------------------------------------------------------ */
/*  validateNeedleForm                                                 */
/* ------------------------------------------------------------------ */

describe('validateNeedleForm', () => {
  const validForm = {
    seedOrigins: [{ Seed: { base_seed: 0n, mt_seed: 0 } }] as unknown[],
    patternRaw: '024',
    userOffset: 0,
    maxAdvance: 200,
  };

  it('正常な入力では isValid: true を返す', () => {
    const result = validateNeedleForm(validForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('seedOrigins が空配列のとき SEED_EMPTY エラー', () => {
    const result = validateNeedleForm({ ...validForm, seedOrigins: [] });
    expect(result.errors).toContain('SEED_EMPTY');
    expect(result.isValid).toBe(false);
  });

  it('パターンが空のとき PATTERN_EMPTY エラー', () => {
    const result = validateNeedleForm({ ...validForm, patternRaw: '' });
    expect(result.errors).toContain('PATTERN_EMPTY');
  });

  it('パターンが不正 (0-7 外) のとき PATTERN_INVALID エラー', () => {
    const result = validateNeedleForm({ ...validForm, patternRaw: '89' });
    expect(result.errors).toContain('PATTERN_INVALID');
  });

  it('空白のみのパターンは PATTERN_EMPTY エラー', () => {
    const result = validateNeedleForm({ ...validForm, patternRaw: '   ' });
    expect(result.errors).toContain('PATTERN_EMPTY');
  });

  it('userOffset が負のとき OFFSET_NEGATIVE エラー', () => {
    const result = validateNeedleForm({ ...validForm, userOffset: -1 });
    expect(result.errors).toContain('OFFSET_NEGATIVE');
  });

  it('maxAdvance < userOffset のとき ADVANCE_RANGE_INVALID エラー', () => {
    const result = validateNeedleForm({ ...validForm, userOffset: 100, maxAdvance: 50 });
    expect(result.errors).toContain('ADVANCE_RANGE_INVALID');
  });

  it('複数エラーが同時に検出される', () => {
    const result = validateNeedleForm({
      seedOrigins: [],
      patternRaw: '',
      userOffset: -1,
      maxAdvance: -2,
    });
    expect(result.errors).toContain('SEED_EMPTY');
    expect(result.errors).toContain('PATTERN_EMPTY');
    expect(result.errors).toContain('OFFSET_NEGATIVE');
    expect(result.errors).toContain('ADVANCE_RANGE_INVALID');
    expect(result.isValid).toBe(false);
  });
});
