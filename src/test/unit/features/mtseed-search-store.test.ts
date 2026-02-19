import { beforeEach, describe, expect, it } from 'vitest';
import {
  useMtseedSearchStore,
  getMtseedSearchInitialState,
  DEFAULT_IV_FILTER,
} from '@/features/mtseed-search/store';

const resetStore = () => {
  localStorage.clear();
  useMtseedSearchStore.setState(getMtseedSearchInitialState());
};

describe('mtseed-search store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should initialize with default values', () => {
    const state = useMtseedSearchStore.getState();
    expect(state.ivFilter.hp).toEqual([31, 31]);
    expect(state.ivFilter.atk).toEqual([31, 31]);
    expect(state.mtOffset).toBe(0);
    expect(state.isRoamer).toBe(false);
    expect(state.useGpu).toBe(true);
    expect(state.results).toEqual([]);
  });

  it('should update ivFilter', () => {
    useMtseedSearchStore.getState().setIvFilter({
      ...DEFAULT_IV_FILTER,
      hp: [0, 31],
    });
    expect(useMtseedSearchStore.getState().ivFilter.hp).toEqual([0, 31]);
    expect(useMtseedSearchStore.getState().ivFilter.atk).toEqual([31, 31]);
  });

  it('should update mtOffset', () => {
    useMtseedSearchStore.getState().setMtOffset(2);
    expect(useMtseedSearchStore.getState().mtOffset).toBe(2);
  });

  it('should update isRoamer', () => {
    useMtseedSearchStore.getState().setIsRoamer(true);
    expect(useMtseedSearchStore.getState().isRoamer).toBe(true);
  });

  it('should update useGpu', () => {
    useMtseedSearchStore.getState().setUseGpu(false);
    expect(useMtseedSearchStore.getState().useGpu).toBe(false);
  });

  it('should set and clear results', () => {
    const mockResults = [
      { seed: 12_345, iv: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } },
    ] as never[];
    useMtseedSearchStore.getState().setResults(mockResults);
    expect(useMtseedSearchStore.getState().results).toEqual(mockResults);

    useMtseedSearchStore.getState().clearResults();
    expect(useMtseedSearchStore.getState().results).toEqual([]);
  });

  it('should preserve results on resetForm', () => {
    const mockResults = [{ seed: 99_999 }] as never[];
    useMtseedSearchStore.getState().setResults(mockResults);
    useMtseedSearchStore.getState().setMtOffset(5);

    useMtseedSearchStore.getState().resetForm();

    expect(useMtseedSearchStore.getState().results).toEqual(mockResults);
    expect(useMtseedSearchStore.getState().mtOffset).toBe(0);
    expect(useMtseedSearchStore.getState().ivFilter).toEqual(DEFAULT_IV_FILTER);
  });

  it('should exclude results from partialize', () => {
    const persist = (
      useMtseedSearchStore as unknown as {
        persist: {
          getOptions: () => {
            partialize?: (state: Record<string, unknown>) => Record<string, unknown>;
          };
        };
      }
    ).persist;
    const options = persist.getOptions();
    const state = useMtseedSearchStore.getState();
    const partialized = options.partialize?.(state as unknown as Record<string, unknown>) as
      | Record<string, unknown>
      | undefined;

    expect(partialized).toBeDefined();
    expect(partialized).not.toHaveProperty('results');
    expect(partialized).toHaveProperty('ivFilter');
    expect(partialized).toHaveProperty('mtOffset');
  });
});
