import { describe, it, expect } from 'vitest';
import { parseHexByte, parseHexWord, toHex } from '@/lib/hex';

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

describe('toHex', () => {
  it('2 桁大文字 hex 文字列を返す', () => {
    expect(toHex(0, 2)).toBe('00');
    expect(toHex(0x5e, 2)).toBe('5E');
    expect(toHex(255, 2)).toBe('FF');
  });

  it('4 桁大文字 hex 文字列を返す', () => {
    expect(toHex(0x0c_79, 4)).toBe('0C79');
    expect(toHex(0x1a_2b, 4)).toBe('1A2B');
  });

  it('0 を指定桁数でパディングする', () => {
    expect(toHex(0, 2)).toBe('00');
    expect(toHex(0, 4)).toBe('0000');
  });

  it('0xFFFF を 4 桁で "FFFF" に変換する', () => {
    expect(toHex(0xff_ff, 4)).toBe('FFFF');
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
