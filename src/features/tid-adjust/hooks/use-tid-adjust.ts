/**
 * ID 調整検索フック
 *
 * WASM タスク生成 → WorkerPool 実行 → 結果収集を統合する。
 */

import { useCallback, useMemo } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { createTrainerInfoSearchTasks } from '@/services/search-tasks';
import { flattenBatchResults, isTrainerInfoResult } from '@/services/batch-utils';
import type {
  DatetimeSearchContext,
  TrainerInfoFilter,
  GameStartConfig,
  TrainerInfoSearchResult,
} from '@/wasm/wasm_pkg.js';
import type { AggregatedProgress } from '@/services/progress';

interface UseTidAdjustReturn {
  isLoading: boolean;
  isInitialized: boolean;
  progress: AggregatedProgress | undefined;
  results: TrainerInfoSearchResult[];
  error: Error | undefined;
  startSearch: (
    context: DatetimeSearchContext,
    filter: TrainerInfoFilter,
    gameStart: GameStartConfig
  ) => void;
  cancel: () => void;
}

/**
 * ID 調整検索を実行するカスタムフック (CPU 専用)
 */
export function useTidAdjust(): UseTidAdjustReturn {
  const config = useSearchConfig(false);
  const search = useSearch(config);

  const startSearch = useCallback(
    (context: DatetimeSearchContext, filter: TrainerInfoFilter, gameStart: GameStartConfig) => {
      const workerCount = config.workerCount ?? navigator.hardwareConcurrency ?? 4;
      const tasks = createTrainerInfoSearchTasks(context, filter, gameStart, workerCount);
      search.start(tasks);
    },
    [config.workerCount, search]
  );

  const results = useMemo(
    () => flattenBatchResults<TrainerInfoSearchResult>(search.results, isTrainerInfoResult),
    [search.results]
  );

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
