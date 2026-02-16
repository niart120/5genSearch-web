import { describe, it, expect } from 'vitest';
import { getStandardContexts, getEggContexts, formatIvSpread } from '@/lib/iv-tooltip';
import type { Ivs } from '@/wasm/wasm_pkg.js';

describe('getStandardContexts', () => {
  it('BW 版: 2 コンテキスト (消費0, 消費1)', () => {
    const contexts = getStandardContexts('Black');
    expect(contexts).toHaveLength(2);
    expect(contexts[0]).toEqual({ labelKey: 'bw-wild', mtOffset: 0, isRoamer: false });
    expect(contexts[1]).toEqual({ labelKey: 'bw-roamer', mtOffset: 1, isRoamer: true });
  });

  it('White 版: Black と同一', () => {
    const contexts = getStandardContexts('White');
    expect(contexts).toHaveLength(2);
    expect(contexts[0].labelKey).toBe('bw-wild');
    expect(contexts[1].labelKey).toBe('bw-roamer');
  });

  it('BW2 版: 1 コンテキスト (消費2)', () => {
    const contexts = getStandardContexts('Black2');
    expect(contexts).toHaveLength(1);
    expect(contexts[0]).toEqual({ labelKey: 'bw2-wild', mtOffset: 2, isRoamer: false });
  });

  it('White2 版: Black2 と同一', () => {
    const contexts = getStandardContexts('White2');
    expect(contexts).toHaveLength(1);
    expect(contexts[0].labelKey).toBe('bw2-wild');
  });
});

describe('getEggContexts', () => {
  it('BW 版: 3 コンテキスト (消費0, 消費1, 消費7)', () => {
    const contexts = getEggContexts('Black');
    expect(contexts).toHaveLength(3);
    expect(contexts[0].labelKey).toBe('bw-wild');
    expect(contexts[1].labelKey).toBe('bw-roamer');
    expect(contexts[2]).toEqual({ labelKey: 'egg', mtOffset: 7, isRoamer: false });
  });

  it('BW2 版: 2 コンテキスト (消費2, 消費7)', () => {
    const contexts = getEggContexts('Black2');
    expect(contexts).toHaveLength(2);
    expect(contexts[0].labelKey).toBe('bw2-wild');
    expect(contexts[1]).toEqual({ labelKey: 'egg', mtOffset: 7, isRoamer: false });
  });
});

describe('formatIvSpread', () => {
  const ivs: Ivs = { hp: 31, atk: 0, def: 15, spa: 30, spd: 1, spe: 31 };

  it('日本語ロケール', () => {
    const result = formatIvSpread(ivs, 'ja');
    expect(result).toBe('H:31 A:0 B:15 C:30 D:1 S:31');
  });

  it('英語ロケール', () => {
    const result = formatIvSpread(ivs, 'en');
    expect(result).toBe('HP:31 Atk:0 Def:15 SpA:30 SpD:1 Spe:31');
  });

  it('全 31 のケース', () => {
    const all31: Ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    expect(formatIvSpread(all31, 'ja')).toBe('H:31 A:31 B:31 C:31 D:31 S:31');
  });
});
