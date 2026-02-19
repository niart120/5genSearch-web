import { beforeEach, describe, expect, it } from 'vitest';
import { useTidAdjustStore, getTidAdjustInitialState } from '@/features/tid-adjust/store';

const resetStore = () => {
  localStorage.clear();
  useTidAdjustStore.setState(getTidAdjustInitialState());
};

describe('tid-adjust store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should initialize with default values', () => {
    const state = useTidAdjustStore.getState();
    expect(state.timeRange.hour_start).toBe(0);
    expect(state.keySpec.available_buttons).toEqual([]);
    expect(state.tid).toBe('');
    expect(state.sid).toBe('');
    expect(state.shinyPidRaw).toBe('');
    expect(state.saveMode).toBe('NoSave');
    expect(state.results).toEqual([]);
  });

  it('should update tid', () => {
    useTidAdjustStore.getState().setTid('12345');
    expect(useTidAdjustStore.getState().tid).toBe('12345');
  });

  it('should update sid', () => {
    useTidAdjustStore.getState().setSid('54321');
    expect(useTidAdjustStore.getState().sid).toBe('54321');
  });

  it('should update shinyPidRaw', () => {
    useTidAdjustStore.getState().setShinyPidRaw('AABBCCDD');
    expect(useTidAdjustStore.getState().shinyPidRaw).toBe('AABBCCDD');
  });

  it('should update saveMode', () => {
    useTidAdjustStore.getState().setSaveMode('WithSaveMemoryLink');
    expect(useTidAdjustStore.getState().saveMode).toBe('WithSaveMemoryLink');
  });

  it('should set and clear results', () => {
    const mockResults = [{ tid: 0, sid: 0 }] as never[];
    useTidAdjustStore.getState().setResults(mockResults);
    expect(useTidAdjustStore.getState().results).toEqual(mockResults);

    useTidAdjustStore.getState().clearResults();
    expect(useTidAdjustStore.getState().results).toEqual([]);
  });

  it('should preserve results on resetForm', () => {
    const mockResults = [{ tid: 0, sid: 0 }] as never[];
    useTidAdjustStore.getState().setResults(mockResults);
    useTidAdjustStore.getState().setTid('999');

    useTidAdjustStore.getState().resetForm();

    expect(useTidAdjustStore.getState().results).toEqual(mockResults);
    expect(useTidAdjustStore.getState().tid).toBe('');
  });

  it('should exclude results from partialize', () => {
    const persist = (
      useTidAdjustStore as unknown as {
        persist: {
          getOptions: () => {
            partialize?: (state: Record<string, unknown>) => Record<string, unknown>;
          };
        };
      }
    ).persist;
    const options = persist.getOptions();
    const state = useTidAdjustStore.getState();
    const partialized = options.partialize?.(state as unknown as Record<string, unknown>) as
      | Record<string, unknown>
      | undefined;

    expect(partialized).toBeDefined();
    expect(partialized).not.toHaveProperty('results');
    expect(partialized).toHaveProperty('tid');
    expect(partialized).toHaveProperty('saveMode');
  });
});
