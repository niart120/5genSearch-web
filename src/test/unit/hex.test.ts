import { describe, it, expect } from 'vitest';
import { parseHexByte, toHexString, parseHexWord, toHexWordString } from '@/lib/hex';

describe('parseHexByte', () => {
  it('有効な 1–2 桁 hex を正しくパースする', () => {
    expect(parseHexByte('5E')).toBe(0x5e);
    expect(parseHexByte('0')).toBe(0);
    expect(parseHexByte('FF')).toBe(255);
    expect(parseHexByte('a')).toBe(10);
  });

  it('空文字列でデフォルト値を返す', () => {
    expect(parseHexByte('')).toBe(0);
    expect(parseHexByte('', 42)).toBe(42);
  });

  it('不正文字列でデフォルト値を返す', () => {
    expect(parseHexByte('GG')).toBe(0);
    expect(parseHexByte('xyz', 10)).toBe(10);
  });
});

describe('toHexString', () => {
  it('2 桁大文字 hex 文字列を返す', () => {
    expect(toHexString(0)).toBe('00');
    expect(toHexString(0x5e)).toBe('5E');
    expect(toHexString(255)).toBe('FF');
  });
});

describe('parseHexWord', () => {
  it('有効な 1–4 桁 hex を正しくパースする', () => {
    expect(parseHexWord('0C79')).toBe(0x0c_79);
    expect(parseHexWord('0')).toBe(0);
    expect(parseHexWord('FFFF')).toBe(0xff_ff);
    expect(parseHexWord('1A')).toBe(0x1a);
    expect(parseHexWord('abc')).toBe(0xa_bc);
  });

  it('空文字列でデフォルト値を返す', () => {
    expect(parseHexWord('')).toBe(0);
    expect(parseHexWord('', 100)).toBe(100);
  });

  it('不正文字列でデフォルト値を返す', () => {
    expect(parseHexWord('ZZZZ')).toBe(0);
    expect(parseHexWord('hello', 50)).toBe(50);
  });

  it('5 桁以上でデフォルト値を返す', () => {
    expect(parseHexWord('12345')).toBe(0);
    expect(parseHexWord('ABCDE', 99)).toBe(99);
  });
});

describe('toHexWordString', () => {
  it('4 桁大文字 hex 文字列を返す', () => {
    expect(toHexWordString(0x0c_79)).toBe('0C79');
    expect(toHexWordString(0x1a_2b)).toBe('1A2B');
  });

  it('0 を "0000" に変換する', () => {
    expect(toHexWordString(0)).toBe('0000');
  });

  it('0xFFFF を "FFFF" に変換する', () => {
    expect(toHexWordString(0xff_ff)).toBe('FFFF');
  });
});
