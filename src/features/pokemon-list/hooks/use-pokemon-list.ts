import { useCallback, useMemo } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { createPokemonListTask } from '@/services/search-tasks';
import { flattenBatchResults, isGeneratedPokemonData } from '@/services/batch-utils';
import { resolve_pokemon_data_batch } from '@/wasm/wasm_pkg.js';
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

  const rawResults = useMemo(
    () => flattenBatchResults<GeneratedPokemonData>(results, isGeneratedPokemonData),
    [results]
  );

  const uiResults = useMemo(() => {
    if (rawResults.length === 0) return [];
    return resolve_pokemon_data_batch(rawResults, version, locale);
  }, [rawResults, version, locale]);

  const generate = useCallback(
    (
      origins: SeedOrigin[],
      params: PokemonGenerationParams,
      genConfig: GenerationConfig,
      filter: PokemonFilter | undefined
    ) => {
      const task = createPokemonListTask(origins, params, genConfig, filter);
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
