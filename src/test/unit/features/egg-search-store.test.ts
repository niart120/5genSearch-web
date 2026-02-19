import { beforeEach, describe, expect, it } from 'vitest';
import { useEggSearchStore, getEggSearchInitialState } from '@/features/egg-search/store';
import { getPartializedState } from '@/test/helpers/store';

const resetStore = () => {
  localStorage.clear();
  useEggSearchStore.setState(getEggSearchInitialState());
};

describe('egg-search store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should initialize with default values', () => {
    const state = useEggSearchStore.getState();
    expect(state.timeRange.hour_start).toBe(0);
    expect(state.timeRange.hour_end).toBe(23);
    expect(state.keySpec.available_buttons).toEqual([]);
    expect(state.eggParams.everstone).toBe('None');
    expect(state.eggParams.masuda_method).toBe(false);
    expect(state.genConfig.user_offset).toBe(0);
    expect(state.genConfig.max_advance).toBe(30);
    expect(state.filter).toBeUndefined();
    expect(state.results).toEqual([]);
  });

  it('should update eggParams', () => {
    const current = useEggSearchStore.getState().eggParams;
    useEggSearchStore.getState().setEggParams({ ...current, masuda_method: true });
    expect(useEggSearchStore.getState().eggParams.masuda_method).toBe(true);
  });

  it('should update genConfig', () => {
    useEggSearchStore.getState().setGenConfig({ user_offset: 5, max_advance: 50 });
    expect(useEggSearchStore.getState().genConfig.user_offset).toBe(5);
    expect(useEggSearchStore.getState().genConfig.max_advance).toBe(50);
  });

  it('should update filter', () => {
    useEggSearchStore.getState().setFilter({
      iv: undefined,
      natures: ['Adamant'],
      gender: undefined,
      ability_slot: undefined,
      shiny: undefined,
      min_margin_frames: undefined,
      stats: undefined,
    });
    expect(useEggSearchStore.getState().filter?.natures).toEqual(['Adamant']);
  });

  it('should set and clear results', () => {
    const mockResults = [{ egg: {} }] as never[];
    useEggSearchStore.getState().setResults(mockResults);
    expect(useEggSearchStore.getState().results).toEqual(mockResults);

    useEggSearchStore.getState().clearResults();
    expect(useEggSearchStore.getState().results).toEqual([]);
  });

  it('should append results incrementally', () => {
    const batch1 = [{ egg: { id: 1 } }] as never[];
    const batch2 = [{ egg: { id: 2 } }] as never[];
    useEggSearchStore.getState().appendResults(batch1);
    expect(useEggSearchStore.getState().results).toEqual(batch1);

    useEggSearchStore.getState().appendResults(batch2);
    expect(useEggSearchStore.getState().results).toEqual([...batch1, ...batch2]);
  });

  it('should preserve results on resetForm', () => {
    const mockResults = [{ egg: {} }] as never[];
    useEggSearchStore.getState().setResults(mockResults);
    useEggSearchStore.getState().setGenConfig({ user_offset: 10, max_advance: 100 });

    useEggSearchStore.getState().resetForm();

    expect(useEggSearchStore.getState().results).toEqual(mockResults);
    expect(useEggSearchStore.getState().genConfig.user_offset).toBe(0);
  });

  it('should exclude results from partialize', () => {
    const partialized = getPartializedState(useEggSearchStore);
    expect(partialized).not.toHaveProperty('results');
    expect(partialized).toHaveProperty('eggParams');
    expect(partialized).toHaveProperty('genConfig');
  });
});
