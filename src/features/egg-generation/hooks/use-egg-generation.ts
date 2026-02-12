/**
 * タマゴ個体生成フック
 *
 * Seed + 孵化パラメータからタマゴ個体を一括生成する。
 */

import { useCallback, useMemo } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { createEggGenerationTask } from '@/services/search-tasks';
import { flattenBatchResults, isGeneratedEggData } from '@/services/batch-utils';
import { resolve_egg_data_batch } from '@/wasm/wasm_pkg.js';
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

interface UseEggGenerationReturn {
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

export function useEggGeneration(
  locale: SupportedLocale,
  speciesId: number | undefined
): UseEggGenerationReturn {
  const config = useSearchConfig(false);
  const { results, isLoading, isInitialized, progress, error, start, cancel } = useSearch(config);

  // バッチ結果の flat 化
  const rawResults = useMemo(
    () => flattenBatchResults<GeneratedEggData>(results, isGeneratedEggData),
    [results]
  );

  const uiResults = useMemo(() => {
    if (rawResults.length === 0) return [];
    return resolve_egg_data_batch(rawResults, locale, speciesId ?? null);
  }, [rawResults, locale, speciesId]);

  const generate = useCallback(
    (
      origins: SeedOrigin[],
      params: EggGenerationParams,
      genConfig: GenerationConfig,
      filter: EggFilter | undefined
    ) => {
      const task = createEggGenerationTask(origins, params, genConfig, filter);
      start([task]);
    },
    [start]
  );

  return {
    isLoading,
    isInitialized,
    progress,
    rawResults,
    uiResults,
    error,
    generate,
    cancel,
  };
}
