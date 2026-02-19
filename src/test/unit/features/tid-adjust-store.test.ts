import { beforeEach, describe, expect, it } from 'vitest';
import { useTidAdjustStore, getTidAdjustInitialState } from '@/features/tid-adjust/store';
import { getPartializedState } from '@/test/helpers/store';

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

  it('should append results incrementally', () => {
    const batch1 = [{ tid: 1, sid: 1 }] as never[];
    const batch2 = [{ tid: 2, sid: 2 }] as never[];
    useTidAdjustStore.getState().appendResults(batch1);
    expect(useTidAdjustStore.getState().results).toEqual(batch1);

    useTidAdjustStore.getState().appendResults(batch2);
    expect(useTidAdjustStore.getState().results).toEqual([...batch1, ...batch2]);
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
    const partialized = getPartializedState(useTidAdjustStore);
    expect(partialized).not.toHaveProperty('results');
    expect(partialized).toHaveProperty('tid');
    expect(partialized).toHaveProperty('saveMode');
  });
});
