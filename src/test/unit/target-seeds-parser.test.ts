/**
 * parseTargetSeeds のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import { parseTargetSeeds } from '@/features/datetime-search/types';

describe('parseTargetSeeds', () => {
  it('空文字列を入力すると空の結果を返す', () => {
    const result = parseTargetSeeds('');
    expect(result.seeds).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('空白行のみの入力は空の結果を返す', () => {
    const result = parseTargetSeeds('  \n  \n  ');
    expect(result.seeds).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('16 進数文字列を正しくパースする', () => {
    const result = parseTargetSeeds('1A2B3C4D');
    expect(result.seeds).toEqual([0x1a_2b_3c_4d]);
    expect(result.errors).toEqual([]);
  });

  it('0x プレフィックス付きの値をパースする', () => {
    const result = parseTargetSeeds('0x1A2B3C4D');
    expect(result.seeds).toEqual([0x1a_2b_3c_4d]);
    expect(result.errors).toEqual([]);
  });

  it('0X プレフィックス (大文字) をパースする', () => {
    const result = parseTargetSeeds('0X1A2B3C4D');
    expect(result.seeds).toEqual([0x1a_2b_3c_4d]);
    expect(result.errors).toEqual([]);
  });

  it('複数行の値をパースする', () => {
    const result = parseTargetSeeds('12345678\n0xABCDEF01\nFFFFFFFF');
    expect(result.seeds).toEqual([0x12_34_56_78, 0xab_cd_ef_01, 0xff_ff_ff_ff]);
    expect(result.errors).toEqual([]);
  });

  it('値 0 をパースする', () => {
    const result = parseTargetSeeds('0');
    expect(result.seeds).toEqual([0]);
    expect(result.errors).toEqual([]);
  });

  it('最大値 FFFFFFFF をパースする', () => {
    const result = parseTargetSeeds('FFFFFFFF');
    expect(result.seeds).toEqual([0xff_ff_ff_ff]);
    expect(result.errors).toEqual([]);
  });

  it('不正な文字を含む行をエラーとして返す', () => {
    const result = parseTargetSeeds('GHIJK');
    expect(result.seeds).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].line).toBe(1);
    expect(result.errors[0].value).toBe('GHIJK');
  });

  it('正常な値と不正な値が混在する入力を処理する', () => {
    const result = parseTargetSeeds('12345678\ninvalid\nABCDEF01');
    expect(result.seeds).toEqual([0x12_34_56_78, 0xab_cd_ef_01]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].line).toBe(2);
    expect(result.errors[0].value).toBe('invalid');
  });

  it('前後の空白を無視する', () => {
    const result = parseTargetSeeds('  12345678  ');
    expect(result.seeds).toEqual([0x12_34_56_78]);
    expect(result.errors).toEqual([]);
  });

  it('空行を無視する', () => {
    const result = parseTargetSeeds('12345678\n\n\nABCDEF01');
    expect(result.seeds).toEqual([0x12_34_56_78, 0xab_cd_ef_01]);
    expect(result.errors).toEqual([]);
  });

  it('CRLF の改行を処理する', () => {
    const result = parseTargetSeeds('12345678\r\nABCDEF01');
    expect(result.seeds).toEqual([0x12_34_56_78, 0xab_cd_ef_01]);
    expect(result.errors).toEqual([]);
  });

  it('小文字の 16 進数をパースする', () => {
    const result = parseTargetSeeds('abcdef01');
    expect(result.seeds).toEqual([0xab_cd_ef_01]);
    expect(result.errors).toEqual([]);
  });
});
