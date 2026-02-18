import { useSearchResultsStore } from '../stores/search/results';
import type { SearchResult } from '../stores/search/results';
import type { SeedOrigin } from '@/wasm/wasm_pkg.js';

export function useSearchResults() {
  const results = useSearchResultsStore((s) => s.results);
  const lastUpdatedAt = useSearchResultsStore((s) => s.lastUpdatedAt);
  const addResult = useSearchResultsStore((s) => s.addResult);
  const clearResults = useSearchResultsStore((s) => s.clearResults);

  return { results, lastUpdatedAt, addResult, clearResults } as const;
}

export function useSearchResultsReadonly(): {
  results: SearchResult[];
  lastUpdatedAt: number | undefined;
} {
  const results = useSearchResultsStore((s) => s.results);
  const lastUpdatedAt = useSearchResultsStore((s) => s.lastUpdatedAt);

  return { results, lastUpdatedAt };
}

/**
 * pendingSeedOrigins を消費するフック。
 * マウント時に Store から取得し、消費後にクリアする想定。
 */
export function usePendingSeedOrigins(): SeedOrigin[] {
  return useSearchResultsStore((s) => s.pendingSeedOrigins);
}
