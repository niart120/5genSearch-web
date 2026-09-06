import { beforeEach, describe, expect, it } from 'vitest';
import { usePokemonListStore, getPokemonListInitialState } from '@/features/pokemon-list/store';
import {
  usePokemonSearchStore,
  getPokemonSearchInitialState,
} from '@/features/pokemon-search/store';
import { useEggListStore, getEggListInitialState } from '@/features/egg-list/store';
import { useEggSearchStore, getEggSearchInitialState } from '@/features/egg-search/store';
import { useMtseedSearchStore, getMtseedSearchInitialState } from '@/features/mtseed-search/store';
import {
  DEFAULT_IV_RANGES,
  isIvRangeEnabled,
  normalizeIvFilter,
} from '@/lib/search-filter-context';

describe('従来の保存値から範囲条件を引き継ぐ', () => {
  beforeEach(() => {
    localStorage.clear();
    usePokemonListStore.setState(getPokemonListInitialState());
    usePokemonSearchStore.setState(getPokemonSearchInitialState());
    useEggListStore.setState(getEggListInitialState());
    useEggSearchStore.setState(getEggSearchInitialState());
    useMtseedSearchStore.setState(getMtseedSearchInitialState());
  });
  it.each(['pokemon-list', 'egg-list', 'egg-search'] as const)(
    '%s のversion 1は範囲と任意の意味を維持する',
    async (feature) => {
      const store = {
        'pokemon-list': usePokemonListStore,
        'egg-list': useEggListStore,
        'egg-search': useEggSearchStore,
      }[feature];
      const iv = { ...DEFAULT_IV_RANGES, hp: [30, 31], atk: [0, 32], hidden_power_min_power: 65 };
      localStorage.setItem(
        `feature:${feature}`,
        JSON.stringify({
          version: 1,
          state: { filter: { iv, min_margin_frames: 0, level_range: [10, 20] } },
        })
      );
      await store.persist.rehydrate();
      const restored = store.getState().filter?.iv;
      expect(restored?.hp).toEqual([30, 31]);
      expect(normalizeIvFilter(restored)?.atk).toEqual([0, 31]);
      expect(normalizeIvFilter(restored)?.hidden_power_min_power).toBe(65);
    }
  );
  it('ポケモン検索の保存済みレベル範囲を引き継ぐ', async () => {
    localStorage.setItem(
      'feature:pokemon-search',
      JSON.stringify({ version: 1, state: { filter: { level_range: [10, 20] } } })
    );
    await usePokemonSearchStore.persist.rehydrate();
    expect(usePokemonSearchStore.getState().filter.level_range).toEqual([10, 20]);
  });
  it('MT Seed検索の保存済み6Vを新しい任意の初期値で上書きしない', async () => {
    const ivFilter = {
      hp: [31, 31],
      atk: [31, 31],
      def: [31, 31],
      spa: [31, 31],
      spd: [31, 31],
      spe: [31, 31],
    };
    localStorage.setItem(
      'feature:mtseed-search',
      JSON.stringify({ version: 1, state: { ivFilter } })
    );
    await useMtseedSearchStore.persist.rehydrate();
    const restored = useMtseedSearchStore.getState().ivFilter;
    expect(restored).toEqual(ivFilter);
    expect(isIvRangeEnabled(restored, 'hp')).toBe(true);
  });
});
