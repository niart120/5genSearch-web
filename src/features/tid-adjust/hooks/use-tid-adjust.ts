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
  const appendResults = useTidAdjustStore((s) => s.appendResults);
  const clearResults = useTidAdjustStore((s) => s.clearResults);
  const storedResults = useTidAdjustStore((s) => s.results);

  // mount 直後の空配列で Store 上書きを防止
  const searchActiveRef = useRef(false);
  // 差分同期: 処理済みバッチ数を追跡
  const prevLengthRef = useRef(0);

  const startSearch = useCallback(
    (context: DatetimeSearchContext, filter: TrainerInfoFilter, gameStart: GameStartConfig) => {
      searchActiveRef.current = true;
      prevLengthRef.current = 0;
      clearResults();
      const workerCount = config.workerCount ?? navigator.hardwareConcurrency ?? 4;
      const tasks = createTrainerInfoSearchTasks(context, filter, gameStart, workerCount);
      search.start(tasks);
    },
    [config.workerCount, search, clearResults]
  );

  // 結果差分同期 — 新しいバッチのみ処理して Store に追記
  useEffect(() => {
    if (!searchActiveRef.current) return;
    const prev = prevLengthRef.current;
    const current = search.results.length;
    if (prev >= current) return;
    const newBatches = search.results.slice(prev);
    prevLengthRef.current = current;
    const newItems = flattenBatchResults<TrainerInfoSearchResult>(newBatches, isTrainerInfoResult);
    if (newItems.length > 0) {
      appendResults(newItems);
    }
  }, [search.results, appendResults]);

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
