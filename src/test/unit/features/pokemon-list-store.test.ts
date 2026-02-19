import { beforeEach, describe, expect, it } from 'vitest';
import { usePokemonListStore, getPokemonListInitialState } from '@/features/pokemon-list/store';
import { DEFAULT_ENCOUNTER_PARAMS } from '@/features/pokemon-list/types';

const resetStore = () => {
  localStorage.clear();
  usePokemonListStore.setState(getPokemonListInitialState());
};

describe('pokemon-list store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should initialize with default values', () => {
    const state = usePokemonListStore.getState();
    expect(state.seedInputMode).toBe('manual-startup');
    expect(state.encounterParams).toEqual(DEFAULT_ENCOUNTER_PARAMS);
    expect(state.filter).toBeUndefined();
    expect(state.statsFilter).toBeUndefined();
    expect(state.statMode).toBe('stats');
    expect(state.results).toEqual([]);
  });

  it('should update seedInputMode', () => {
    usePokemonListStore.getState().setSeedInputMode('import');
    expect(usePokemonListStore.getState().seedInputMode).toBe('import');
  });

  it('should update encounterParams', () => {
    const newParams = { ...DEFAULT_ENCOUNTER_PARAMS, encounterType: 'Surfing' as const };
    usePokemonListStore.getState().setEncounterParams(newParams);
    expect(usePokemonListStore.getState().encounterParams.encounterType).toBe('Surfing');
  });

  it('should update statMode', () => {
    usePokemonListStore.getState().setStatMode('ivs');
    expect(usePokemonListStore.getState().statMode).toBe('ivs');
  });

  it('should set and clear results', () => {
    const mockResults = [{ advance: 0, species_name: 'Bulbasaur' }] as never[];
    usePokemonListStore.getState().setResults(mockResults);
    expect(usePokemonListStore.getState().results).toEqual(mockResults);

    usePokemonListStore.getState().clearResults();
    expect(usePokemonListStore.getState().results).toEqual([]);
  });

  it('should preserve results on resetForm', () => {
    const mockResults = [{ advance: 0 }] as never[];
    usePokemonListStore.getState().setResults(mockResults);
    usePokemonListStore.getState().setStatMode('ivs');

    usePokemonListStore.getState().resetForm();

    expect(usePokemonListStore.getState().results).toEqual(mockResults);
    expect(usePokemonListStore.getState().statMode).toBe('stats');
  });

  it('should exclude results from partialize', () => {
    const persist = (
      usePokemonListStore as unknown as {
        persist: {
          getOptions: () => {
            partialize?: (state: Record<string, unknown>) => Record<string, unknown>;
          };
        };
      }
    ).persist;
    const options = persist.getOptions();
    const state = usePokemonListStore.getState();
    const partialized = options.partialize?.(state as unknown as Record<string, unknown>) as
      | Record<string, unknown>
      | undefined;

    expect(partialized).toBeDefined();
    expect(partialized).not.toHaveProperty('results');
    expect(partialized).toHaveProperty('seedInputMode');
    expect(partialized).toHaveProperty('encounterParams');
  });
});
