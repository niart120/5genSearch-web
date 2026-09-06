import { beforeEach, describe, expect, it } from 'vitest';
import { usePokemonListStore } from '@/features/pokemon-list/store';
import { usePokemonSearchStore } from '@/features/pokemon-search/store';
import { useEggListStore } from '@/features/egg-list/store';
import { useEggSearchStore } from '@/features/egg-search/store';

describe('inclusive advance range persistence', () => {
  beforeEach(() => localStorage.clear());
  it('pokemon-list restores v2 values without shifting the upper endpoint', async () => {
    const range = { user_offset: 100, max_advance: 200 };
    localStorage.setItem(
      'feature:pokemon-list',
      JSON.stringify({
        version: 2,
        state: {
          encounterParams: { ...usePokemonListStore.getState().encounterParams, genConfig: range },
        },
      })
    );
    await usePokemonListStore.persist.rehydrate();
    expect(usePokemonListStore.getState().encounterParams.genConfig).toEqual(range);
    expect(usePokemonListStore.persist.getOptions().version).toBe(3);
  });
  it('pokemon-search restores v2 values without shifting the upper endpoint', async () => {
    const range = { user_offset: 100, max_advance: 200 };
    localStorage.setItem(
      'feature:pokemon-search',
      JSON.stringify({
        version: 2,
        state: {
          encounterParams: {
            ...usePokemonSearchStore.getState().encounterParams,
            genConfig: range,
          },
        },
      })
    );
    await usePokemonSearchStore.persist.rehydrate();
    expect(usePokemonSearchStore.getState().encounterParams.genConfig).toEqual(range);
    expect(usePokemonSearchStore.persist.getOptions().version).toBe(3);
  });
  it('egg-list restores v2 values without shifting the upper endpoint', async () => {
    const range = { user_offset: 100, max_advance: 200 };
    localStorage.setItem(
      'feature:egg-list',
      JSON.stringify({ version: 2, state: { genConfig: range } })
    );
    await useEggListStore.persist.rehydrate();
    expect(useEggListStore.getState().genConfig).toEqual(range);
    expect(useEggListStore.persist.getOptions().version).toBe(3);
  });
  it('egg-search restores v2 values without shifting the upper endpoint', async () => {
    const range = { user_offset: 100, max_advance: 200 };
    localStorage.setItem(
      'feature:egg-search',
      JSON.stringify({ version: 2, state: { genConfig: range } })
    );
    await useEggSearchStore.persist.rehydrate();
    expect(useEggSearchStore.getState().genConfig).toEqual(range);
    expect(useEggSearchStore.persist.getOptions().version).toBe(3);
  });
});
