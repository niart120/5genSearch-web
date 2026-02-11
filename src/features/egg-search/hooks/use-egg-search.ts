/**
 * 孵化起動時刻検索フック
 *
 * WASM タスク生成 → WorkerPool 実行 → 結果収集を統合する。
 * GPU 未対応のため CPU のみで検索する。
 */

import { useCallback, useMemo } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { initMainThreadWasm } from '@/services/wasm-init';
import { createEggSearchTasks } from '@/services/search-tasks';
import type {
  DatetimeSearchContext,
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
  EggDatetimeSearchResult,
} from '@/wasm/wasm_pkg.js';
import type { AggregatedProgress } from '@/services/progress';

interface UseEggSearchReturn {
  isLoading: boolean;
  isInitialized: boolean;
  progress: AggregatedProgress | undefined;
  results: EggDatetimeSearchResult[];
  error: Error | undefined;
  startSearch: (
    context: DatetimeSearchContext,
    eggParams: EggGenerationParams,
    genConfig: GenerationConfig,
    filter: EggFilter | undefined
  ) => void;
  cancel: () => void;
}

/**
 * 孵化起動時刻検索を実行するカスタムフック
 */
export function useEggSearch(): UseEggSearchReturn {
  const config = useSearchConfig(false);
  const search = useSearch(config);

  const startSearch = useCallback(
    (
      context: DatetimeSearchContext,
      eggParams: EggGenerationParams,
      genConfig: GenerationConfig,
      filter: EggFilter | undefined
    ) => {
      const workerCount = config.workerCount ?? navigator.hardwareConcurrency ?? 4;
      void initMainThreadWasm().then(() => {
        const tasks = createEggSearchTasks(context, eggParams, genConfig, filter, workerCount);
        search.start(tasks);
      });
    },
    [config.workerCount, search]
  );

  // 検索結果を EggDatetimeSearchResult[] にフラット化
  const results = useMemo(() => {
    const flat: EggDatetimeSearchResult[] = [];
    for (const batch of search.results) {
      if (Array.isArray(batch) && batch.length > 0) {
        const first = batch[0];
        if (first && 'egg' in first) {
          flat.push(...(batch as EggDatetimeSearchResult[]));
        }
      }
    }
    return flat;
  }, [search.results]);

  return {
    isLoading: search.isLoading,
    isInitialized: search.isInitialized,
    progress: search.progress,
    results,
    error: search.error,
    startSearch,
    cancel: search.cancel,
  };
}
