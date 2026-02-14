/**
 * 針検索フック — メインスレッド同期実行
 *
 * search_needle_pattern は軽量 API のため Worker を使用せず
 * メインスレッドで直接実行する。
 */

import { useState, useCallback, useMemo } from 'react';
import { search_needle_pattern } from '@/wasm/wasm_pkg.js';
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
  const [results, setResults] = useState<NeedleSearchResult[]>([]);
  const [error, setError] = useState<string | undefined>();

  const search = useCallback(
    (origins: SeedOrigin[], pattern: NeedleDirection[], config: GenerationConfig) => {
      setError(undefined);
      try {
        const found = search_needle_pattern(origins, pattern, config);
        setResults(found);
      } catch (error_: unknown) {
        setError(error_ instanceof Error ? error_.message : String(error_));
        setResults([]);
      }
    },
    []
  );

  const clear = useCallback(() => {
    setResults([]);
    setError(undefined);
  }, []);

  return useMemo(() => ({ results, error, search, clear }), [results, error, search, clear]);
}
