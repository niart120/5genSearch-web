/**
 * 孵化起動時刻検索フック
 *
 * WASM タスク生成 → WorkerPool 実行 → 結果収集を統合する。
 * GPU 未対応のため CPU のみで検索する。
 * 結果は Feature Store に同期し、Feature 切替後も保持される。
 */

import { useCallback, useEffect, useRef } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { createEggSearchTasks } from '@/services/search-tasks';
import { useEggSearchStore } from '../store';
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

/** 検索結果を EggDatetimeSearchResult[] にフラット化 */
function flattenEggResults(batches: unknown[][]): EggDatetimeSearchResult[] {
  const flat: EggDatetimeSearchResult[] = [];
  for (const batch of batches) {
    if (Array.isArray(batch) && batch.length > 0) {
      const first = batch[0];
      if (first && typeof first === 'object' && 'egg' in first) {
        flat.push(...(batch as EggDatetimeSearchResult[]));
      }
    }
  }
  return flat;
}

/**
 * 孵化起動時刻検索を実行するカスタムフック
 */
export function useEggSearch(): UseEggSearchReturn {
  const config = useSearchConfig(false);
  const search = useSearch(config);

  // Store actions
  const appendResults = useEggSearchStore((s) => s.appendResults);
  const clearResults = useEggSearchStore((s) => s.clearResults);
  const storedResults = useEggSearchStore((s) => s.results);

  // mount 直後の空配列で Store 上書きを防止
  const searchActiveRef = useRef(false);
  // 差分同期: 処理済みバッチ数を追跡
  const prevLengthRef = useRef(0);

  const startSearch = useCallback(
    (
      context: DatetimeSearchContext,
      eggParams: EggGenerationParams,
      genConfig: GenerationConfig,
      filter: EggFilter | undefined
    ) => {
      searchActiveRef.current = true;
      prevLengthRef.current = 0;
      clearResults();
      const workerCount = config.workerCount ?? navigator.hardwareConcurrency ?? 4;
      const tasks = createEggSearchTasks(context, eggParams, genConfig, filter, workerCount);
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
    const newItems = flattenEggResults(newBatches);
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
