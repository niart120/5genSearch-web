/**
 * 針検索フック — メインスレッド同期実行
 *
 * search_needle_pattern は軽量 API のため Worker を使用せず
 * メインスレッドで直接実行する。
 * 結果は Feature Store に同期し、Feature 切替後も保持される。
 */

import { useState, useCallback, useMemo } from 'react';
import { search_needle_pattern } from '@/wasm/wasm_pkg.js';
import { useNeedleStore } from '../store';
import type {
  SeedOrigin,
  NeedleSearchResult,
  GenerationConfig,
  NeedleDirection,
} from '@/wasm/wasm_pkg.js';

interface UseNeedleSearchReturn {
  results: NeedleSearchResult[];
  error: string | undefined;
  search: (origins: SeedOrigin[], pattern: NeedleDirection[], config: GenerationConfig) => void;
  clear: () => void;
}

export function useNeedleSearch(): UseNeedleSearchReturn {
  const setResults = useNeedleStore((s) => s.setResults);
  const clearResults = useNeedleStore((s) => s.clearResults);
  const storedResults = useNeedleStore((s) => s.results);
  const [error, setError] = useState<string | undefined>();

  const search = useCallback(
    (origins: SeedOrigin[], pattern: NeedleDirection[], config: GenerationConfig) => {
      setError(undefined);
      try {
        const found = search_needle_pattern(origins, pattern, config);
        setResults(found);
      } catch (error_: unknown) {
        setError(error_ instanceof Error ? error_.message : String(error_));
        clearResults();
      }
    },
    [setResults, clearResults]
  );

  const clear = useCallback(() => {
    clearResults();
    setError(undefined);
  }, [clearResults]);

  return useMemo(
    () => ({ results: storedResults, error, search, clear }),
    [storedResults, error, search, clear]
  );
}
