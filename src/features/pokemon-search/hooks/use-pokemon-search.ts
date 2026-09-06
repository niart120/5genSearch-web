import { useCallback, useEffect, useRef } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { useResultViews } from '@/hooks/use-result-views';
import type { PokemonListResultView } from '@/lib/result-view';
import { createPokemonDatetimeSearchTasks } from '@/services/search-tasks';
import { flattenBatchResults, isGeneratedPokemonData } from '@/services/batch-utils';
import { resolve_pokemon_data_batch } from '@/wasm/wasm_pkg.js';
import { usePokemonSearchStore } from '../store';
import type {
  PokemonGenerationParams,
  GenerationConfig,
  GeneratedPokemonData,
} from '@/wasm/wasm_pkg.js';
import type { PokemonSearchRequest } from '../types';
import type { AggregatedProgress } from '@/services/progress';
import type { SupportedLocale } from '@/i18n';

interface UsePokemonSearchReturn {
  isLoading: boolean;
  isInitialized: boolean;
  progress: AggregatedProgress | undefined;
  results: PokemonListResultView[];
  resultEncounterType: PokemonGenerationParams['encounter_type'] | undefined;
  resultVersion: GenerationConfig['version'] | undefined;
  error: Error | undefined;
  startSearch: (request: PokemonSearchRequest) => void;
  cancel: () => void;
}

export function usePokemonSearch(locale: SupportedLocale): UsePokemonSearchReturn {
  const config = useSearchConfig(false);
  const { results, isLoading, isInitialized, progress, error, workerCount, start, cancel } =
    useSearch(config);

  // Store actions
  const appendResults = usePokemonSearchStore((s) => s.appendResults);
  const startStoreResults = usePokemonSearchStore((s) => s.startResults);
  const storedRawResults = usePokemonSearchStore((s) => s.results);
  const resultRequest = usePokemonSearchStore((s) => s.resultRequest);
  const resultEncounterType = resultRequest?.pokemonParams.encounter_type;
  const resultVersion = resultRequest?.genConfig.version;

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

  const resolveBatch = useCallback(
    (rawResults: GeneratedPokemonData[]) => {
      if (resultVersion === undefined) {
        throw new Error('Pokemon results are missing their ROM version context');
      }
      return resolve_pokemon_data_batch(rawResults, resultVersion, locale);
    },
    [resultVersion, locale]
  );

  // UI 変換は Store の raw データ + 生成時バージョン + locale から導出
  const resolvedResults = useResultViews({
    rawResults: storedRawResults,
    resolutionKey: `${resultVersion ?? 'undefined'}:${locale}`,
    resolveBatch,
  });

  // 検索完了時にフラグリセット
  useEffect(() => {
    if (searchActiveRef.current && !isLoading) {
      searchActiveRef.current = false;
    }
  }, [isLoading]);

  const startSearch = useCallback(
    (request: PokemonSearchRequest) => {
      const tasks = createPokemonDatetimeSearchTasks(
        request.context,
        request.pokemonParams,
        request.genConfig,
        request.filter,
        workerCount
      );
      searchActiveRef.current = true;
      prevLengthRef.current = 0;
      startStoreResults(request);
      start(tasks);
    },
    [start, startStoreResults, workerCount]
  );

  return {
    isLoading,
    isInitialized,
    progress,
    results: resolvedResults,
    resultEncounterType,
    resultVersion,
    error,
    startSearch,
    cancel,
  };
}
