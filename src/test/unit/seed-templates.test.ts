/**
 * seed-templates データ整合性テスト
 */

import { describe, it, expect } from 'vitest';
import {
  SEED_TEMPLATES,
  TEMPLATE_CATEGORY_LABELS,
  toTemplateVersion,
  type SeedTemplate,
} from '@/data/seed-templates';
import { SUPPORTED_LOCALES } from '@/i18n';
import type { RomVersion } from '@/wasm/wasm_pkg';

describe('SEED_TEMPLATES', () => {
  it('テンプレート ID が一意である', () => {
    const ids = SEED_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(SEED_TEMPLATES.map((t) => [t.id, t] as const))(
    '%s: seeds 配列が空でない',
    (_id, tpl: SeedTemplate) => {
      expect(tpl.seeds.length).toBeGreaterThan(0);
    }
  );

  it.each(SEED_TEMPLATES.map((t) => [t.id, t] as const))(
    '%s: 全 Seed が 0 ≤ seed ≤ 0xFFFFFFFF',
    (_id, tpl: SeedTemplate) => {
      for (const seed of tpl.seeds) {
        expect(seed).toBeGreaterThanOrEqual(0);
        expect(seed).toBeLessThanOrEqual(0xff_ff_ff_ff);
      }
    }
  );

  it.each(SEED_TEMPLATES.map((t) => [t.id, t] as const))(
    '%s: name が全ロケールで定義済み',
    (_id, tpl: SeedTemplate) => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(tpl.name[locale]).toBeDefined();
        expect(tpl.name[locale].length).toBeGreaterThan(0);
      }
    }
  );

  it.each(SEED_TEMPLATES.map((t) => [t.id, t] as const))(
    '%s: description が全ロケールで定義済み',
    (_id, tpl: SeedTemplate) => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(tpl.description[locale]).toBeDefined();
        expect(tpl.description[locale].length).toBeGreaterThan(0);
      }
    }
  );

  it.each(SEED_TEMPLATES.map((t) => [t.id, t] as const))(
    '%s: version が BW または BW2',
    (_id, tpl: SeedTemplate) => {
      expect(['BW', 'BW2']).toContain(tpl.version);
    }
  );

  it.each(SEED_TEMPLATES.map((t) => [t.id, t] as const))(
    '%s: category が stationary または roamer',
    (_id, tpl: SeedTemplate) => {
      expect(['stationary', 'roamer']).toContain(tpl.category);
    }
  );

  it('BW2 に roamer テンプレートが含まれない', () => {
    const bw2Roamers = SEED_TEMPLATES.filter((t) => t.version === 'BW2' && t.category === 'roamer');
    expect(bw2Roamers).toHaveLength(0);
  });
});

describe('toTemplateVersion', () => {
  it.each<[RomVersion, 'BW' | 'BW2']>([
    ['Black', 'BW'],
    ['White', 'BW'],
    ['Black2', 'BW2'],
    ['White2', 'BW2'],
  ])('%s → %s', (rom, expected) => {
    expect(toTemplateVersion(rom)).toBe(expected);
  });
});

describe('TEMPLATE_CATEGORY_LABELS', () => {
  it('全カテゴリが全ロケールのラベルを持つ', () => {
    for (const key of Object.keys(TEMPLATE_CATEGORY_LABELS)) {
      for (const locale of SUPPORTED_LOCALES) {
        const label =
          TEMPLATE_CATEGORY_LABELS[key as keyof typeof TEMPLATE_CATEGORY_LABELS][locale];
        expect(label).toBeDefined();
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });
});
