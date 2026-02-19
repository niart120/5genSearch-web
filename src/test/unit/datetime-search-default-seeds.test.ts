/**
 * getDefaultTargetSeeds ユニットテスト
 */

import { describe, it, expect } from 'vitest';
import { getDefaultTargetSeeds } from '@/features/datetime-search/default-seeds';
import { SEED_TEMPLATES } from '@/data/seed-templates';

describe('getDefaultTargetSeeds', () => {
  it('BW 6V テンプレートの Seed 5 件が改行区切りの hex 文字列で返る', () => {
    const result = getDefaultTargetSeeds();
    const lines = result.split('\n');

    const bw6v = SEED_TEMPLATES.find((t) => t.id === 'bw-stationary-6v');
    expect(bw6v).toBeDefined();
    expect(lines).toHaveLength(bw6v!.seeds.length);
  });

  it('各行が 8 桁の大文字 hex 文字列である', () => {
    const result = getDefaultTargetSeeds();
    const lines = result.split('\n');

    for (const line of lines) {
      expect(line).toMatch(/^[0-9A-F]{8}$/);
    }
  });

  it('各 hex 値が BW 6V テンプレートの Seed と一致する', () => {
    const result = getDefaultTargetSeeds();
    const lines = result.split('\n');

    const bw6v = SEED_TEMPLATES.find((t) => t.id === 'bw-stationary-6v');
    expect(bw6v).toBeDefined();

    const expected = bw6v!.seeds.map((s) => s.toString(16).padStart(8, '0').toUpperCase());
    expect(lines).toEqual(expected);
  });
});
