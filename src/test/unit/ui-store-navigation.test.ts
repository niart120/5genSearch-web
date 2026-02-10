import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore, getUiInitialState } from '@/stores/settings/ui';

const resetStore = () => {
  localStorage.clear();
  useUiStore.setState(getUiInitialState());
};

describe('ui store navigation', () => {
  beforeEach(() => {
    resetStore();
  });

  it('デフォルト状態が正しい', () => {
    const { activeCategory, activeFeature, featureMemory } = useUiStore.getState();
    expect(activeCategory).toBe('search');
    expect(activeFeature).toBe('datetime-search');
    expect(featureMemory).toEqual({});
  });

  describe('setActiveCategory', () => {
    it('カテゴリを切り替えるとデフォルト機能が選択される', () => {
      useUiStore.getState().setActiveCategory('generation');
      const { activeCategory, activeFeature } = useUiStore.getState();
      expect(activeCategory).toBe('generation');
      expect(activeFeature).toBe('pokemon-list');
    });

    it('tools カテゴリに切り替えるとデフォルト機能が選択される', () => {
      useUiStore.getState().setActiveCategory('tools');
      const { activeCategory, activeFeature } = useUiStore.getState();
      expect(activeCategory).toBe('tools');
      expect(activeFeature).toBe('mtseed-search');
    });

    it('featureMemory がある場合は記憶した機能に復帰する', () => {
      // egg-search を選択して記憶
      useUiStore.getState().setActiveFeature('egg-search');
      expect(useUiStore.getState().featureMemory).toEqual({ search: 'egg-search' });

      // generation に切り替え
      useUiStore.getState().setActiveCategory('generation');
      expect(useUiStore.getState().activeFeature).toBe('pokemon-list');

      // search に戻ると egg-search に復帰
      useUiStore.getState().setActiveCategory('search');
      expect(useUiStore.getState().activeFeature).toBe('egg-search');
    });
  });

  describe('setActiveFeature', () => {
    it('機能を切り替える', () => {
      useUiStore.getState().setActiveFeature('egg-search');
      expect(useUiStore.getState().activeFeature).toBe('egg-search');
    });

    it('featureMemory に現在カテゴリの選択を記録する', () => {
      useUiStore.getState().setActiveFeature('egg-search');
      expect(useUiStore.getState().featureMemory).toEqual({ search: 'egg-search' });
    });

    it('異なるカテゴリの featureMemory は独立している', () => {
      // search で egg-search を選択
      useUiStore.getState().setActiveFeature('egg-search');

      // generation に切り替え、egg-list を選択
      useUiStore.getState().setActiveCategory('generation');
      useUiStore.getState().setActiveFeature('egg-list');

      expect(useUiStore.getState().featureMemory).toEqual({
        search: 'egg-search',
        generation: 'egg-list',
      });
    });
  });

  describe('reset', () => {
    it('リセットでナビゲーション状態も初期化される', () => {
      useUiStore.getState().setActiveCategory('tools');
      useUiStore.getState().setActiveFeature('tid-adjust');
      useUiStore.getState().reset();

      const { activeCategory, activeFeature, featureMemory } = useUiStore.getState();
      expect(activeCategory).toBe('search');
      expect(activeFeature).toBe('datetime-search');
      expect(featureMemory).toEqual({});
    });
  });
});
