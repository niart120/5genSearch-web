import { beforeEach, describe, expect, it } from 'vitest';
import {
  useDatetimeSearchStore,
  getDatetimeSearchInitialState,
} from '@/features/datetime-search/store';

const resetStore = () => {
  localStorage.clear();
  useDatetimeSearchStore.setState(getDatetimeSearchInitialState());
};

describe('datetime-search store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should initialize with default values', () => {
    const state = useDatetimeSearchStore.getState();
    expect(state.dateRange.start_year).toBe(2000);
    expect(state.dateRange.end_year).toBe(2099);
    expect(state.timeRange.hour_start).toBe(0);
    expect(state.timeRange.hour_end).toBe(23);
    expect(state.keySpec.available_buttons).toEqual([]);
    expect(state.useGpu).toBe(true);
    expect(state.results).toEqual([]);
  });

  it('should update dateRange', () => {
    const newRange = {
      start_year: 2025,
      start_month: 6,
      start_day: 1,
      end_year: 2025,
      end_month: 12,
      end_day: 31,
    };
    useDatetimeSearchStore.getState().setDateRange(newRange);
    expect(useDatetimeSearchStore.getState().dateRange).toEqual(newRange);
  });

  it('should update timeRange', () => {
    const newRange = {
      hour_start: 8,
      hour_end: 20,
      minute_start: 0,
      minute_end: 59,
      second_start: 0,
      second_end: 59,
    };
    useDatetimeSearchStore.getState().setTimeRange(newRange);
    expect(useDatetimeSearchStore.getState().timeRange).toEqual(newRange);
  });

  it('should update targetSeedsRaw', () => {
    useDatetimeSearchStore.getState().setTargetSeedsRaw('AABBCCDD\n11223344');
    expect(useDatetimeSearchStore.getState().targetSeedsRaw).toBe('AABBCCDD\n11223344');
  });

  it('should update useGpu', () => {
    useDatetimeSearchStore.getState().setUseGpu(false);
    expect(useDatetimeSearchStore.getState().useGpu).toBe(false);
  });

  it('should set and clear results', () => {
    const mockResults = [{ Seed: { base_seed: 0n, mt_seed: 0 } }] as never[];
    useDatetimeSearchStore.getState().setResults(mockResults);
    expect(useDatetimeSearchStore.getState().results).toEqual(mockResults);

    useDatetimeSearchStore.getState().clearResults();
    expect(useDatetimeSearchStore.getState().results).toEqual([]);
  });

  it('should append results incrementally', () => {
    const batch1 = [{ Seed: { base_seed: 1n, mt_seed: 1 } }] as never[];
    const batch2 = [{ Seed: { base_seed: 2n, mt_seed: 2 } }] as never[];
    useDatetimeSearchStore.getState().appendResults(batch1);
    expect(useDatetimeSearchStore.getState().results).toEqual(batch1);

    useDatetimeSearchStore.getState().appendResults(batch2);
    expect(useDatetimeSearchStore.getState().results).toEqual([...batch1, ...batch2]);
  });

  it('should preserve results on resetForm', () => {
    const mockResults = [{ Seed: { base_seed: 0n, mt_seed: 0 } }] as never[];
    useDatetimeSearchStore.getState().setResults(mockResults);
    useDatetimeSearchStore.getState().setUseGpu(false);

    useDatetimeSearchStore.getState().resetForm();

    expect(useDatetimeSearchStore.getState().results).toEqual(mockResults);
    expect(useDatetimeSearchStore.getState().useGpu).toBe(true);
  });

  it('should exclude results from partialize', () => {
    const persist = (
      useDatetimeSearchStore as unknown as {
        persist: {
          getOptions: () => {
            partialize?: (state: Record<string, unknown>) => Record<string, unknown>;
          };
        };
      }
    ).persist;
    const options = persist.getOptions();
    const state = useDatetimeSearchStore.getState();
    const partialized = options.partialize?.(state as unknown as Record<string, unknown>) as
      | Record<string, unknown>
      | undefined;

    expect(partialized).toBeDefined();
    expect(partialized).not.toHaveProperty('results');
    expect(partialized).toHaveProperty('dateRange');
    expect(partialized).toHaveProperty('useGpu');
  });
});
