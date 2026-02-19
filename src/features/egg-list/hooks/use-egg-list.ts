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

  // UI 変換は Store の raw データ + locale/speciesId から導出
  const uiResults = useMemo(() => {
    if (storedRawResults.length === 0) return [];
    return resolve_egg_data_batch(storedRawResults, locale, speciesId);
  }, [storedRawResults, locale, speciesId]);

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
      const task = createEggListTask(origins, params, genConfig, filter);
      start([task]);
    },
    [start, clearStoreResults]
  );

  return {
    isLoading,
    isInitialized,
    progress,
    rawResults: storedRawResults,
    uiResults,
    error,
    generate,
    cancel,
  };
}
