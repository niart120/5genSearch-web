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
    expect(lastUpdatedAt).toBeUndefined();
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
    expect(lastUpdatedAt).toBeUndefined();
  });

  describe('pendingDetailOrigins (per-page)', () => {
    it('should have empty object as initial value', () => {
      expect(useSearchResultsStore.getState().pendingDetailOrigins).toEqual({});
    });

    it('should set Startup origin for all consumers', () => {
      const origin: SeedOrigin = {
        Startup: {
          base_seed: 0x01_23_45_67_89_ab_cd_efn,
          mt_seed: 0x89_ab_cd_ef,
          datetime: { year: 2025, month: 6, day: 1, hour: 12, minute: 0, second: 0 },
          condition: { timer0: 0x06_00, vcount: 0x5e, key_code: 0x2f_ff },
        },
      };
      useSearchResultsStore.getState().setPendingDetailOrigin(origin);
      const { pendingDetailOrigins } = useSearchResultsStore.getState();
      expect(pendingDetailOrigins['pokemon-list']).toEqual(origin);
      expect(pendingDetailOrigins['egg-list']).toEqual(origin);
      expect(pendingDetailOrigins['needle']).toEqual(origin);
    });

    it('should clear only the specified consumer', () => {
      const origin: SeedOrigin = {
        Seed: {
          base_seed: 0xab_cd_ef_01_23_45_67_89n,
          mt_seed: 0x23_45_67_89,
        },
      };
      useSearchResultsStore.getState().setPendingDetailOrigin(origin);
      useSearchResultsStore.getState().clearPendingDetailOrigin('pokemon-list');

      const { pendingDetailOrigins } = useSearchResultsStore.getState();
      expect(pendingDetailOrigins['pokemon-list']).toBeUndefined();
      expect(pendingDetailOrigins['egg-list']).toEqual(origin);
      expect(pendingDetailOrigins['needle']).toEqual(origin);
    });

    it('should be cleared on clearResults', () => {
      const origin: SeedOrigin = {
        Seed: { base_seed: 1n, mt_seed: 1 },
      };
      useSearchResultsStore.getState().setPendingDetailOrigin(origin);
      useSearchResultsStore.getState().clearResults();
      expect(useSearchResultsStore.getState().pendingDetailOrigins).toEqual({});
    });
  });

  describe('pendingSeedOrigins', () => {
    it('should have empty array as initial value', () => {
      expect(useSearchResultsStore.getState().pendingSeedOrigins).toEqual([]);
    });

    it('should set and clear', () => {
      const origins: SeedOrigin[] = [{ Seed: { base_seed: 1n, mt_seed: 1 } }];
      useSearchResultsStore.getState().setPendingSeedOrigins(origins);
      expect(useSearchResultsStore.getState().pendingSeedOrigins).toEqual(origins);

      useSearchResultsStore.getState().clearPendingSeedOrigins();
      expect(useSearchResultsStore.getState().pendingSeedOrigins).toEqual([]);
    });
  });
});
