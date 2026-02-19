import { beforeEach, describe, expect, it } from 'vitest';
import { useEggListStore, getEggListInitialState } from '@/features/egg-list/store';
import { getPartializedState } from '@/test/helpers/store';

const resetStore = () => {
  localStorage.clear();
  useEggListStore.setState(getEggListInitialState());
};

describe('egg-list store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should initialize with default values', () => {
    const state = useEggListStore.getState();
    expect(state.seedInputMode).toBe('manual-startup');
    expect(state.eggParams.everstone).toBe('None');
    expect(state.eggParams.parent_male.hp).toBe(31);
    expect(state.genConfig.user_offset).toBe(0);
    expect(state.genConfig.max_advance).toBe(30);
    expect(state.speciesId).toBeUndefined();
    expect(state.filter).toBeUndefined();
    expect(state.statsFilter).toBeUndefined();
    expect(state.statMode).toBe('stats');
    expect(state.results).toEqual([]);
  });

  it('should update seedInputMode', () => {
    useEggListStore.getState().setSeedInputMode('import');
    expect(useEggListStore.getState().seedInputMode).toBe('import');
  });

  it('should update eggParams', () => {
    const current = useEggListStore.getState().eggParams;
    useEggListStore.getState().setEggParams({ ...current, masuda_method: true });
    expect(useEggListStore.getState().eggParams.masuda_method).toBe(true);
  });

  it('should update genConfig', () => {
    useEggListStore.getState().setGenConfig({ user_offset: 5, max_advance: 100 });
    expect(useEggListStore.getState().genConfig.user_offset).toBe(5);
    expect(useEggListStore.getState().genConfig.max_advance).toBe(100);
  });

  it('should update speciesId', () => {
    useEggListStore.getState().setSpeciesId(25);
    expect(useEggListStore.getState().speciesId).toBe(25);
  });

  it('should update statMode', () => {
    useEggListStore.getState().setStatMode('ivs');
    expect(useEggListStore.getState().statMode).toBe('ivs');
  });

  it('should set and clear results', () => {
    const mockResults = [{ advance: 0, egg: {} }] as never[];
    useEggListStore.getState().setResults(mockResults);
    expect(useEggListStore.getState().results).toEqual(mockResults);

    useEggListStore.getState().clearResults();
    expect(useEggListStore.getState().results).toEqual([]);
  });

  it('should append results incrementally', () => {
    const batch1 = [{ advance: 0, egg: {} }] as never[];
    const batch2 = [{ advance: 1, egg: {} }] as never[];
    useEggListStore.getState().appendResults(batch1);
    expect(useEggListStore.getState().results).toEqual(batch1);

    useEggListStore.getState().appendResults(batch2);
    expect(useEggListStore.getState().results).toEqual([...batch1, ...batch2]);
  });

  it('should preserve results on resetForm', () => {
    const mockResults = [{ advance: 0, egg: {} }] as never[];
    useEggListStore.getState().setResults(mockResults);
    useEggListStore.getState().setSpeciesId(150);

    useEggListStore.getState().resetForm();

    expect(useEggListStore.getState().results).toEqual(mockResults);
    expect(useEggListStore.getState().speciesId).toBeUndefined();
  });

  it('should exclude results from partialize', () => {
    const partialized = getPartializedState(useEggListStore);
    expect(partialized).not.toHaveProperty('results');
    expect(partialized).toHaveProperty('eggParams');
    expect(partialized).toHaveProperty('speciesId');
  });
});
