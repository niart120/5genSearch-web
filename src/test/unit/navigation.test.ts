import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  getCategoryByFeature,
  getCategoryDef,
  getDefaultFeature,
} from '@/lib/navigation';

describe('navigation', () => {
  describe('CATEGORIES', () => {
    it('3 カテゴリが定義されている', () => {
      expect(CATEGORIES).toHaveLength(3);
    });

    it('各カテゴリに features と defaultFeature が存在する', () => {
      for (const cat of CATEGORIES) {
        expect(cat.features.length).toBeGreaterThanOrEqual(1);
        expect(cat.features).toContain(cat.defaultFeature);
      }
    });
  });

  describe('getCategoryDef', () => {
    it('search カテゴリの定義を返す', () => {
      const def = getCategoryDef('search');
      expect(def.id).toBe('search');
      expect(def.features).toContain('datetime-search');
      expect(def.defaultFeature).toBe('datetime-search');
    });

    it('generation カテゴリの定義を返す', () => {
      const def = getCategoryDef('generation');
      expect(def.id).toBe('generation');
      expect(def.features).toContain('generation-list');
    });

    it('tools カテゴリの定義を返す', () => {
      const def = getCategoryDef('tools');
      expect(def.id).toBe('tools');
      expect(def.features).toContain('mtseed-search');
    });

    it('不正な ID でエラーを投げる', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => getCategoryDef('invalid' as any)).toThrow('Unknown category: invalid');
    });
  });

  describe('getCategoryByFeature', () => {
    it('datetime-search は search カテゴリに属する', () => {
      expect(getCategoryByFeature('datetime-search')).toBe('search');
    });

    it('egg-search は search カテゴリに属する', () => {
      expect(getCategoryByFeature('egg-search')).toBe('search');
    });

    it('generation-list は generation カテゴリに属する', () => {
      expect(getCategoryByFeature('generation-list')).toBe('generation');
    });

    it('mtseed-search は tools カテゴリに属する', () => {
      expect(getCategoryByFeature('mtseed-search')).toBe('tools');
    });

    it('needle は tools カテゴリに属する', () => {
      expect(getCategoryByFeature('needle')).toBe('tools');
    });

    it('不正な FeatureId でエラーを投げる', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => getCategoryByFeature('invalid' as any)).toThrow('Unknown feature: invalid');
    });
  });

  describe('getDefaultFeature', () => {
    it('search のデフォルトは datetime-search', () => {
      expect(getDefaultFeature('search')).toBe('datetime-search');
    });

    it('generation のデフォルトは generation-list', () => {
      expect(getDefaultFeature('generation')).toBe('generation-list');
    });

    it('tools のデフォルトは mtseed-search', () => {
      expect(getDefaultFeature('tools')).toBe('mtseed-search');
    });
  });
});
