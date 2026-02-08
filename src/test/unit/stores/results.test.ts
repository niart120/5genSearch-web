import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SeedOrigin } from '../../../wasm/wasm_pkg.js';
import {
  getSearchResultsInitialState,
  useSearchResultsStore,
} from '../../../stores/search/results';

const resetStore = () => {
  useSearchResultsStore.setState(getSearchResultsInitialState());
};

describe('search results store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should have empty initial results', () => {
    const { results, lastUpdatedAt } = useSearchResultsStore.getState();
    expect(results).toEqual([]);
    expect(lastUpdatedAt).toBeNull();
  });

  it('should add results and update timestamp', () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const result: SeedOrigin[] = [];
    useSearchResultsStore.getState().addResult(result);

    const { results, lastUpdatedAt } = useSearchResultsStore.getState();
    expect(results.length).toBe(1);
    expect(lastUpdatedAt).toBe(now);

    vi.restoreAllMocks();
  });

  it('should accumulate results', () => {
    const first: SeedOrigin[] = [];
    const second: SeedOrigin[] = [];
    useSearchResultsStore.getState().addResult(first);
    useSearchResultsStore.getState().addResult(second);

    const { results } = useSearchResultsStore.getState();
    expect(results.length).toBe(2);
  });

  it('should clear results', () => {
    const result: SeedOrigin[] = [];
    useSearchResultsStore.getState().addResult(result);
    useSearchResultsStore.getState().clearResults();

    const { results, lastUpdatedAt } = useSearchResultsStore.getState();
    expect(results).toEqual([]);
    expect(lastUpdatedAt).toBeNull();
  });
});
