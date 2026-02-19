import { beforeEach, describe, expect, it } from 'vitest';
import { useNeedleStore, getNeedleInitialState } from '@/features/needle/store';

const resetStore = () => {
  localStorage.clear();
  useNeedleStore.setState(getNeedleInitialState());
};

describe('needle store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should initialize with default values', () => {
    const state = useNeedleStore.getState();
    expect(state.seedMode).toBe('datetime');
    expect(state.seedHex).toBe('');
    expect(state.patternRaw).toBe('');
    expect(state.userOffset).toBe(0);
    expect(state.maxAdvance).toBe(30);
    expect(state.autoSearch).toBe(true);
    expect(state.keyInput.buttons).toEqual([]);
    expect(state.results).toEqual([]);
  });

  it('should update seedMode', () => {
    useNeedleStore.getState().setSeedMode('seed');
    expect(useNeedleStore.getState().seedMode).toBe('seed');
  });

  it('should update seedHex', () => {
    useNeedleStore.getState().setSeedHex('AABBCCDD11223344');
    expect(useNeedleStore.getState().seedHex).toBe('AABBCCDD11223344');
  });

  it('should update patternRaw', () => {
    useNeedleStore.getState().setPatternRaw('24267');
    expect(useNeedleStore.getState().patternRaw).toBe('24267');
  });

  it('should update userOffset', () => {
    useNeedleStore.getState().setUserOffset(10);
    expect(useNeedleStore.getState().userOffset).toBe(10);
  });

  it('should update maxAdvance', () => {
    useNeedleStore.getState().setMaxAdvance(100);
    expect(useNeedleStore.getState().maxAdvance).toBe(100);
  });

  it('should update autoSearch', () => {
    useNeedleStore.getState().setAutoSearch(false);
    expect(useNeedleStore.getState().autoSearch).toBe(false);
  });

  it('should set and clear results', () => {
    const mockResults = [{ advance: 5, direction: 'N' }] as never[];
    useNeedleStore.getState().setResults(mockResults);
    expect(useNeedleStore.getState().results).toEqual(mockResults);

    useNeedleStore.getState().clearResults();
    expect(useNeedleStore.getState().results).toEqual([]);
  });

  it('should preserve results on resetForm', () => {
    const mockResults = [{ advance: 5, direction: 'N' }] as never[];
    useNeedleStore.getState().setResults(mockResults);
    useNeedleStore.getState().setSeedHex('1234');

    useNeedleStore.getState().resetForm();

    expect(useNeedleStore.getState().results).toEqual(mockResults);
    expect(useNeedleStore.getState().seedHex).toBe('');
  });

  it('should exclude results from partialize', () => {
    const persist = (
      useNeedleStore as unknown as {
        persist: {
          getOptions: () => {
            partialize?: (state: Record<string, unknown>) => Record<string, unknown>;
          };
        };
      }
    ).persist;
    const options = persist.getOptions();
    const state = useNeedleStore.getState();
    const partialized = options.partialize?.(state as unknown as Record<string, unknown>) as
      | Record<string, unknown>
      | undefined;

    expect(partialized).toBeDefined();
    expect(partialized).not.toHaveProperty('results');
    expect(partialized).toHaveProperty('seedMode');
    expect(partialized).toHaveProperty('patternRaw');
  });
});
