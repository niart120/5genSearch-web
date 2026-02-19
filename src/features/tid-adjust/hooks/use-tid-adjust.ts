/**
 * ID 調整検索フック
 *
 * WASM タスク生成 → WorkerPool 実行 → 結果収集を統合する。
 * 結果は Feature Store に同期し、Feature 切替後も保持される。
 */

import { useCallback, useEffect, useRef } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { createTrainerInfoSearchTasks } from '@/services/search-tasks';
import { flattenBatchResults, isTrainerInfoResult } from '@/services/batch-utils';
import { useTidAdjustStore } from '../store';
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

  // Store actions
  const setResults = useTidAdjustStore((s) => s.setResults);
  const clearResults = useTidAdjustStore((s) => s.clearResults);
  const storedResults = useTidAdjustStore((s) => s.results);

  // mount 直後の空配列で Store 上書きを防止
  const searchActiveRef = useRef(false);

  const startSearch = useCallback(
    (context: DatetimeSearchContext, filter: TrainerInfoFilter, gameStart: GameStartConfig) => {
      searchActiveRef.current = true;
      clearResults();
      const workerCount = config.workerCount ?? navigator.hardwareConcurrency ?? 4;
      const tasks = createTrainerInfoSearchTasks(context, filter, gameStart, workerCount);
      search.start(tasks);
    },
    [config.workerCount, search, clearResults]
  );

  // 結果同期
  useEffect(() => {
    if (!searchActiveRef.current) return;
    const flat = flattenBatchResults<TrainerInfoSearchResult>(search.results, isTrainerInfoResult);
    setResults(flat);
  }, [search.results, setResults]);

  // 検索完了時にフラグリセット
  useEffect(() => {
    if (searchActiveRef.current && !search.isLoading) {
      searchActiveRef.current = false;
    }
  }, [search.isLoading]);

  return {
    isLoading: search.isLoading,
    isInitialized: search.isInitialized,
    progress: search.progress,
    results: storedResults,
    error: search.error,
    startSearch,
    cancel: search.cancel,
  };
}
