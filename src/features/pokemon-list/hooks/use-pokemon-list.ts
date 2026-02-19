import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { createPokemonListTask } from '@/services/search-tasks';
import { flattenBatchResults, isGeneratedPokemonData } from '@/services/batch-utils';
import { resolve_pokemon_data_batch } from '@/wasm/wasm_pkg.js';
import { usePokemonListStore } from '../store';
import type {
  SeedOrigin,
  PokemonGenerationParams,
  GenerationConfig,
  PokemonFilter,
  GeneratedPokemonData,
  UiPokemonData,
  RomVersion,
} from '@/wasm/wasm_pkg.js';
import type { AggregatedProgress } from '@/services/progress';
import type { SupportedLocale } from '@/i18n';

interface UsePokemonListReturn {
  isLoading: boolean;
  isInitialized: boolean;
  progress: AggregatedProgress | undefined;
  rawResults: GeneratedPokemonData[];
  uiResults: UiPokemonData[];
  error: Error | undefined;
  generate: (
    origins: SeedOrigin[],
    params: PokemonGenerationParams,
    config: GenerationConfig,
    filter: PokemonFilter | undefined
  ) => void;
  cancel: () => void;
}

export function usePokemonList(version: RomVersion, locale: SupportedLocale): UsePokemonListReturn {
  const config = useSearchConfig(false);
  const { results, isLoading, isInitialized, progress, error, start, cancel } = useSearch(config);

  // Store actions
  const appendResults = usePokemonListStore((s) => s.appendResults);
  const clearStoreResults = usePokemonListStore((s) => s.clearResults);
  const storedRawResults = usePokemonListStore((s) => s.results);

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
    const newItems = flattenBatchResults<GeneratedPokemonData>(newBatches, isGeneratedPokemonData);
    if (newItems.length > 0) {
      appendResults(newItems);
    }
  }, [results, appendResults]);

  // UI 変換は Store の raw データ + locale/version から導出
  const uiResults = useMemo(() => {
    if (storedRawResults.length === 0) return [];
    return resolve_pokemon_data_batch(storedRawResults, version, locale);
  }, [storedRawResults, version, locale]);

  // 検索完了時にフラグリセット
  useEffect(() => {
    if (searchActiveRef.current && !isLoading) {
      searchActiveRef.current = false;
    }
  }, [isLoading]);

  const generate = useCallback(
    (
      origins: SeedOrigin[],
      params: PokemonGenerationParams,
      genConfig: GenerationConfig,
      filter: PokemonFilter | undefined
    ) => {
      searchActiveRef.current = true;
      prevLengthRef.current = 0;
      clearStoreResults();
      const task = createPokemonListTask(origins, params, genConfig, filter);
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
