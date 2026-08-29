/**
 * タマゴ個体生成フック
 *
 * Seed + 孵化パラメータからタマゴ個体を一括生成する。
 * 結果は Feature Store に同期し、Feature 切替後も保持される。
 */

import { useCallback, useEffect, useRef } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { useResultViews } from '@/hooks/use-result-views';
import { createEggListTasks } from '@/services/search-tasks';
import { flattenBatchResults, isGeneratedEggData } from '@/services/batch-utils';
import { resolve_egg_data_batch } from '@/wasm/wasm_pkg.js';
import { useEggListStore } from '../store';
import type {
  SeedOrigin,
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
  GeneratedEggData,
} from '@/wasm/wasm_pkg.js';
import type { AggregatedProgress } from '@/services/progress';
import type { SupportedLocale } from '@/i18n';
import type { EggListResultView } from '@/lib/result-view';

interface UseEggListReturn {
  isLoading: boolean;
  isInitialized: boolean;
  progress: AggregatedProgress | undefined;
  results: EggListResultView[];
  error: Error | undefined;
  generate: (
    origins: SeedOrigin[],
    params: EggGenerationParams,
    config: GenerationConfig,
    filter: EggFilter | undefined
  ) => void;
  cancel: () => void;
}

export function useEggList(locale: SupportedLocale): UseEggListReturn {
  const config = useSearchConfig(false);
  const { results, isLoading, isInitialized, progress, error, workerCount, start, cancel } =
    useSearch(config);

  // Store actions
  const appendResults = useEggListStore((s) => s.appendResults);
  const clearStoreResults = useEggListStore((s) => s.clearResults);
  const storedRawResults = useEggListStore((s) => s.results);

  // mount 直後の空配列で Store 上書きを防止
  const searchActiveRef = useRef(false);
  // 差分同期: 処理済みバッチ数を追跡
  const prevLengthRef = useRef(0);

  // 差分同期 — 新しいバッチのみ処理して Store に追記
  useEffect(() => {
    if (!searchActiveRef.current) return;
    const prev = prevLengthRef.current;
    const current = results.length;
    if (prev >= current) return;
    const newBatches = results.slice(prev);
    prevLengthRef.current = current;
    const newItems = flattenBatchResults<GeneratedEggData>(newBatches, isGeneratedEggData);
    if (newItems.length > 0) {
      appendResults(newItems);
    }
  }, [results, appendResults]);

  const resolveBatch = useCallback(
    (rawResults: GeneratedEggData[]) => resolve_egg_data_batch(rawResults, locale),
    [locale]
  );
  const resultViews = useResultViews({
    rawResults: storedRawResults,
    resolutionKey: locale,
    resolveBatch,
  });

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
      prevLengthRef.current = 0;
      clearStoreResults();
      const tasks = createEggListTasks(origins, params, genConfig, filter, workerCount);
      start(tasks);
    },
    [start, clearStoreResults, workerCount]
  );

  return {
    isLoading,
    isInitialized,
    progress,
    results: resultViews,
    error,
    generate,
    cancel,
  };
}
