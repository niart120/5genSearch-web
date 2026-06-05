import { useSearchResultsStore } from '../stores/search/results';
import type { SearchResult, SeedOriginTransferTarget } from '../stores/search/results';
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
 * target ごとの pending 値を購読する。
 */
export function usePendingSeedOrigins(target: SeedOriginTransferTarget): SeedOrigin[] {
  return useSearchResultsStore((s) => s.pendingSeedOrigins[target] ?? []);
}
