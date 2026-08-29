import { beforeEach, describe, expect, it } from 'vitest';
import { usePokemonListStore, getPokemonListInitialState } from '@/features/pokemon-list/store';
import { DEFAULT_ENCOUNTER_PARAMS } from '@/features/pokemon-list/types';
import { getPartializedState } from '@/test/helpers/store';

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
    expect(state.encounterParams.locationKey).toBe('');
    expect(state.encounterParams.staticEntryId).toBe('');
    expect(state.encounterParams).toEqual(DEFAULT_ENCOUNTER_PARAMS);
    expect(state.filter).toBeUndefined();
    expect(state.statsFilter).toBeUndefined();
    expect(state.statMode).toBe('stats');
    expect(state.formRevision).toBe(0);
    expect(state.results).toEqual([]);
    expect(state.resultEncounterType).toBeUndefined();
    expect(state.resultVersion).toBeUndefined();
  });

  it('should update seedInputMode', () => {
    usePokemonListStore.getState().setSeedInputMode('import');
    expect(usePokemonListStore.getState().seedInputMode).toBe('import');
  });

  it('should update persisted seed input sources', () => {
    usePokemonListStore.getState().setSeedInput((current) => ({
      ...current,
      seedText: '0123456789ABCDEF',
    }));

    expect(usePokemonListStore.getState().seedInput.seedText).toBe('0123456789ABCDEF');
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
    usePokemonListStore.getState().startResults('StaticSymbol', 'Black');
    usePokemonListStore.getState().appendResults(mockResults);
    expect(usePokemonListStore.getState().results).toEqual(mockResults);

    usePokemonListStore.getState().clearResults();
    expect(usePokemonListStore.getState().results).toEqual([]);
    expect(usePokemonListStore.getState().resultEncounterType).toBeUndefined();
    expect(usePokemonListStore.getState().resultVersion).toBeUndefined();
  });

  it('should replace results and record result context when starting a search', () => {
    const mockResults = [{ advance: 0 }] as never[];
    usePokemonListStore.getState().startResults('StaticSymbol', 'Black');
    usePokemonListStore.getState().appendResults(mockResults);

    usePokemonListStore.getState().startResults('DustCloud', 'Black2');

    const state = usePokemonListStore.getState();
    expect(state.results).toEqual([]);
    expect(state.resultEncounterType).toBe('DustCloud');
    expect(state.resultVersion).toBe('Black2');
  });

  it('should append results incrementally', () => {
    const batch1 = [{ advance: 0 }] as never[];
    const batch2 = [{ advance: 1 }] as never[];
    usePokemonListStore.getState().startResults('StaticSymbol', 'Black');
    usePokemonListStore.getState().appendResults(batch1);
    expect(usePokemonListStore.getState().results).toEqual(batch1);

    usePokemonListStore.getState().appendResults(batch2);
    expect(usePokemonListStore.getState().results).toEqual([...batch1, ...batch2]);
  });

  it('should preserve results on resetForm', () => {
    const mockResults = [{ advance: 0 }] as never[];
    usePokemonListStore.getState().startResults('DustCloud', 'White2');
    usePokemonListStore.getState().appendResults(mockResults);
    usePokemonListStore.getState().setEncounterParams({
      ...DEFAULT_ENCOUNTER_PARAMS,
      encounterType: 'Normal',
    });
    usePokemonListStore.getState().setStatMode('ivs');

    usePokemonListStore.getState().resetForm();

    expect(usePokemonListStore.getState().results).toEqual(mockResults);
    expect(usePokemonListStore.getState().resultEncounterType).toBe('DustCloud');
    expect(usePokemonListStore.getState().resultVersion).toBe('White2');
    expect(usePokemonListStore.getState().statMode).toBe('stats');
    expect(usePokemonListStore.getState().formRevision).toBe(1);
  });

  it('should reject non-empty results without result context', () => {
    const mockResults = [{ advance: 0 }] as never[];

    expect(() => usePokemonListStore.getState().appendResults(mockResults)).toThrow(
      'Pokemon results require encounter type and ROM version context'
    );
    expect(usePokemonListStore.getState().results).toEqual([]);
  });

  it('should exclude results from partialize', () => {
    const partialized = getPartializedState(usePokemonListStore);
    expect(partialized).not.toHaveProperty('results');
    expect(partialized).not.toHaveProperty('resultEncounterType');
    expect(partialized).not.toHaveProperty('resultVersion');
    expect(partialized).not.toHaveProperty('seedOrigins');
    expect(partialized).toHaveProperty('seedInputMode');
    expect(partialized).toHaveProperty('seedInput');
    expect(partialized).toHaveProperty('encounterParams');
    expect(partialized).not.toHaveProperty('formRevision');
  });
});
