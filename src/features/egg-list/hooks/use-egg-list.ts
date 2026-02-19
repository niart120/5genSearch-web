/**
 * タマゴ個体生成フック
 *
 * Seed + 孵化パラメータからタマゴ個体を一括生成する。
 * 結果は Feature Store に同期し、Feature 切替後も保持される。
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { createEggListTask } from '@/services/search-tasks';
import { flattenBatchResults, isGeneratedEggData } from '@/services/batch-utils';
import { resolve_egg_data_batch } from '@/wasm/wasm_pkg.js';
import { useEggListStore } from '../store';
import type {
  SeedOrigin,
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
  GeneratedEggData,
  UiEggData,
} from '@/wasm/wasm_pkg.js';
import type { AggregatedProgress } from '@/services/progress';
import type { SupportedLocale } from '@/i18n';

interface UseEggListReturn {
  isLoading: boolean;
  isInitialized: boolean;
  progress: AggregatedProgress | undefined;
  rawResults: GeneratedEggData[];
  uiResults: UiEggData[];
  error: Error | undefined;
  generate: (
    origins: SeedOrigin[],
    params: EggGenerationParams,
    config: GenerationConfig,
    filter: EggFilter | undefined
  ) => void;
  cancel: () => void;
}

export function useEggList(
  locale: SupportedLocale,
  speciesId: number | undefined
): UseEggListReturn {
  const config = useSearchConfig(false);
  const { results, isLoading, isInitialized, progress, error, start, cancel } = useSearch(config);

  // Store actions
  const setStoreResults = useEggListStore((s) => s.setResults);
  const clearStoreResults = useEggListStore((s) => s.clearResults);
  const storedResults = useEggListStore((s) => s.results);

  // mount 直後の空配列で Store 上書きを防止
  const searchActiveRef = useRef(false);

  // バッチ結果の flat 化
  const rawResults = useMemo(
    () => flattenBatchResults<GeneratedEggData>(results, isGeneratedEggData),
    [results]
  );

  const uiResults = useMemo(() => {
    if (rawResults.length === 0) return [];
    return resolve_egg_data_batch(rawResults, locale, speciesId);
  }, [rawResults, locale, speciesId]);

  // 結果同期 — UI 変換済みデータを Store に書き込み
  useEffect(() => {
    if (!searchActiveRef.current) return;
    setStoreResults(uiResults);
  }, [uiResults, setStoreResults]);

  // 検索完了時にフラグリセット
  useEffect(() => {
    if (searchActiveRef.current && !isLoading) {
      searchActiveRef.current = false;
    }
  }, [isLoading]);

  const generate = useCallback(
    (
      origins: SeedOrigin[],
      params: EggGenerationParams,
      genConfig: GenerationConfig,
      filter: EggFilter | undefined
    ) => {
      searchActiveRef.current = true;
      clearStoreResults();
      const task = createEggListTask(origins, params, genConfig, filter);
      start([task]);
    },
    [start, clearStoreResults]
  );

  return {
    isLoading,
    isInitialized,
    progress,
    rawResults,
    uiResults: storedResults,
    error,
    generate,
    cancel,
  };
}
