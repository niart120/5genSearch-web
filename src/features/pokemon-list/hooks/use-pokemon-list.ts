import { useCallback, useMemo } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { initMainThreadWasm } from '@/services/wasm-init';
import { createPokemonListTask } from '@/services/search-tasks';
import { resolve_pokemon_data_batch, resolve_seeds } from '@/wasm/wasm_pkg.js';
import type {
  SeedOrigin,
  SeedSpec,
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

  const rawResults = useMemo(() => {
    const flat: GeneratedPokemonData[] = [];
    for (const batch of results) {
      if (Array.isArray(batch) && batch.length > 0) {
        const first = batch[0];
        if (first && typeof first === 'object' && 'core' in first && 'advance' in first) {
          flat.push(...(batch as unknown as GeneratedPokemonData[]));
        }
      }
    }
    return flat;
  }, [results]);

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

/**
 * SeedSpec を SeedOrigin[] に変換するヘルパー
 *
 * メインスレッドの WASM 初期化が必要。
 */
export async function resolveSeedOrigins(spec: SeedSpec): Promise<SeedOrigin[]> {
  await initMainThreadWasm();
  return resolve_seeds(spec);
}
