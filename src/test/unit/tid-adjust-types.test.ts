/**
 * ID 調整 — PID パーサー + バリデーションのユニットテスト
 */

import { describe, it, expect } from 'vitest';
import {
  parseShinyPid,
  validateTidAdjustForm,
  toTrainerInfoFilter,
  type TidAdjustFormState,
} from '@/features/tid-adjust/types';
import type { DateRangeParams, TimeRangeParams, KeySpec } from '@/wasm/wasm_pkg.js';

const DEFAULT_DATE_RANGE: DateRangeParams = {
  start_year: 2000,
  start_month: 1,
  start_day: 1,
  end_year: 2000,
  end_month: 1,
  end_day: 1,
};

const DEFAULT_TIME_RANGE: TimeRangeParams = {
  hour_start: 0,
  hour_end: 23,
  minute_start: 0,
  minute_end: 59,
  second_start: 0,
  second_end: 59,
};

const DEFAULT_KEY_SPEC: KeySpec = { available_buttons: [] };

function createDefaultForm(overrides?: Partial<TidAdjustFormState>): TidAdjustFormState {
  return {
    dateRange: DEFAULT_DATE_RANGE,
    timeRange: DEFAULT_TIME_RANGE,
    keySpec: DEFAULT_KEY_SPEC,
    tid: '',
    sid: '',
    shinyPidRaw: '',
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  parseShinyPid                                                      */
/* ------------------------------------------------------------------ */

describe('parseShinyPid', () => {
  it('空文字列は未指定として valid を返す', () => {
    const result = parseShinyPid('');
    expect(result.isValid).toBe(true);
    expect(result.pid).toBeUndefined();
  });

  it('空白のみは未指定として valid を返す', () => {
    const result = parseShinyPid('   ');
    expect(result.isValid).toBe(true);
    expect(result.pid).toBeUndefined();
  });

  it('0x プレフィックス付きの正常な 16 進数をパースできる', () => {
    const result = parseShinyPid('0xABCD1234');
    expect(result.isValid).toBe(true);
    expect(result.pid).toBe(0xab_cd_12_34);
  });

  it('0X プレフィックス付き (大文字X) でもパースできる', () => {
    const result = parseShinyPid('0XABCD1234');
    expect(result.isValid).toBe(true);
    expect(result.pid).toBe(0xab_cd_12_34);
  });

  it('プレフィックスなしの 16 進数をパースできる', () => {
    const result = parseShinyPid('abcd1234');
    expect(result.isValid).toBe(true);
    expect(result.pid).toBe(0xab_cd_12_34);
  });

  it('0x00000000 をパースできる', () => {
    const result = parseShinyPid('0x00000000');
    expect(result.isValid).toBe(true);
    expect(result.pid).toBe(0);
  });

  it('0xFFFFFFFF をパースできる', () => {
    const result = parseShinyPid('0xFFFFFFFF');
    expect(result.isValid).toBe(true);
    expect(result.pid).toBe(0xff_ff_ff_ff);
  });

  it('16 進数以外の文字を含む場合は invalid', () => {
    const result = parseShinyPid('xyz');
    expect(result.isValid).toBe(false);
    expect(result.pid).toBeUndefined();
  });

  it('範囲外 (9 桁以上) は invalid', () => {
    const result = parseShinyPid('1FFFFFFFF');
    expect(result.isValid).toBe(false);
    expect(result.pid).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  validateTidAdjustForm                                              */
/* ------------------------------------------------------------------ */

describe('validateTidAdjustForm', () => {
  it('全フィルタ空は valid を返す', () => {
    const result = validateTidAdjustForm(createDefaultForm());
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('正常な TID/SID/PID で valid を返す', () => {
    const form = createDefaultForm({
      tid: '12345',
      sid: '54321',
      shinyPidRaw: '0xABCD1234',
    });
    const result = validateTidAdjustForm(form);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('TID が範囲外の場合は TID_OUT_OF_RANGE を返す', () => {
    const form = createDefaultForm({ tid: '99999' });
    const result = validateTidAdjustForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('TID_OUT_OF_RANGE');
  });

  it('TID が負値の場合は TID_OUT_OF_RANGE を返す', () => {
    const form = createDefaultForm({ tid: '-1' });
    const result = validateTidAdjustForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('TID_OUT_OF_RANGE');
  });

  it('SID が範囲外の場合は SID_OUT_OF_RANGE を返す', () => {
    const form = createDefaultForm({ sid: '70000' });
    const result = validateTidAdjustForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('SID_OUT_OF_RANGE');
  });

  it('Shiny PID が不正な場合は SHINY_PID_INVALID を返す', () => {
    const form = createDefaultForm({ shinyPidRaw: 'not-hex' });
    const result = validateTidAdjustForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('SHINY_PID_INVALID');
  });

  it('日付範囲が逆転している場合は DATE_RANGE_INVALID を返す', () => {
    const form = createDefaultForm({
      dateRange: {
        start_year: 2025,
        start_month: 6,
        start_day: 15,
        end_year: 2025,
        end_month: 1,
        end_day: 1,
      },
    });
    const result = validateTidAdjustForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('DATE_RANGE_INVALID');
  });

  it('複数のエラーを同時に返す', () => {
    const form = createDefaultForm({
      tid: '99999',
      sid: '99999',
      shinyPidRaw: 'not-hex',
    });
    const result = validateTidAdjustForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('TID_OUT_OF_RANGE');
    expect(result.errors).toContain('SID_OUT_OF_RANGE');
    expect(result.errors).toContain('SHINY_PID_INVALID');
    expect(result.errors).toHaveLength(3);
  });

  it('TID=0、SID=0 は valid', () => {
    const form = createDefaultForm({ tid: '0', sid: '0' });
    const result = validateTidAdjustForm(form);
    expect(result.isValid).toBe(true);
  });

  it('TID=65535、SID=65535 は valid', () => {
    const form = createDefaultForm({ tid: '65535', sid: '65535' });
    const result = validateTidAdjustForm(form);
    expect(result.isValid).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  toTrainerInfoFilter                                                */
/* ------------------------------------------------------------------ */

describe('toTrainerInfoFilter', () => {
  it('全フィールド空の場合は全て undefined を返す', () => {
    const filter = toTrainerInfoFilter(createDefaultForm());
    expect(filter.tid).toBeUndefined();
    expect(filter.sid).toBeUndefined();
    expect(filter.shiny_pid).toBeUndefined();
  });

  it('TID/SID を数値に変換する', () => {
    const filter = toTrainerInfoFilter(createDefaultForm({ tid: '100', sid: '200' }));
    expect(filter.tid).toBe(100);
    expect(filter.sid).toBe(200);
  });

  it('Shiny PID を Pid にパースする', () => {
    const filter = toTrainerInfoFilter(createDefaultForm({ shinyPidRaw: '0xDEADBEEF' }));
    expect(filter.shiny_pid).toBe(0xde_ad_be_ef);
  });
});
