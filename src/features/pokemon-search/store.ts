import type { PokemonSearchFilterInput as PokemonDatetimeSearchFilter } from '@/lib/search-filter-context';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_ENCOUNTER_PARAMS,
  type EncounterParamsOutput,
} from '@/features/pokemon-list/types';
import { getDatetimeSearchInitialState } from '@/features/datetime-search/store';
import type { GeneratedPokemonData } from '@/wasm/wasm_pkg.js';
import type { StatDisplayMode } from '@/lib/game-data-names';
import {
  EMPTY_POKEMON_SEARCH_FILTER,
  type PokemonSearchForm,
  type PokemonSearchRequest,
} from './types';

interface PokemonSearchState extends PokemonSearchForm {
  mode: 'iv' | 'pokemon';
  statMode: StatDisplayMode;
  results: GeneratedPokemonData[];
  resultRequest: PokemonSearchRequest | undefined;
  modeFocusRequested: boolean;
  setMode: (mode: 'iv' | 'pokemon') => void;
  setModeFromTab: (mode: 'iv' | 'pokemon') => void;
  setDateRange: (value: PokemonSearchForm['dateRange']) => void;
  setTimeRange: (value: PokemonSearchForm['timeRange']) => void;
  setKeySpec: (value: PokemonSearchForm['keySpec']) => void;
  setEncounterParams: (
    action: EncounterParamsOutput | ((prev: EncounterParamsOutput) => EncounterParamsOutput)
  ) => void;
  setFilter: (filter: PokemonDatetimeSearchFilter) => void;
  setStatMode: (mode: StatDisplayMode) => void;
  startResults: (request: PokemonSearchRequest) => void;
  appendResults: (results: GeneratedPokemonData[]) => void;
}

export function getPokemonSearchInitialState() {
  const dates = getDatetimeSearchInitialState();
  return {
    mode: 'iv' as const,
    statMode: 'stats' as const,
    dateRange: structuredClone(dates.dateRange),
    timeRange: structuredClone(dates.timeRange),
    keySpec: structuredClone(dates.keySpec),
    encounterParams: structuredClone(DEFAULT_ENCOUNTER_PARAMS),
    filter: { ...EMPTY_POKEMON_SEARCH_FILTER },
    results: [] as GeneratedPokemonData[],
    resultRequest: undefined as PokemonSearchRequest | undefined,
    modeFocusRequested: false,
  };
}

export const usePokemonSearchStore = create<PokemonSearchState>()(
  persist(
    (set) => ({
      ...getPokemonSearchInitialState(),
      setMode: (mode) => set({ mode }),
      setModeFromTab: (mode) => set({ mode, modeFocusRequested: true }),
      setDateRange: (dateRange) => set({ dateRange }),
      setTimeRange: (timeRange) => set({ timeRange }),
      setKeySpec: (keySpec) => set({ keySpec }),
      setEncounterParams: (action) =>
        set((state) => ({
          encounterParams: typeof action === 'function' ? action(state.encounterParams) : action,
        })),
      setFilter: (filter) => set({ filter }),
      setStatMode: (statMode) => set({ statMode }),
      startResults: (resultRequest) =>
        set({ results: [], resultRequest: structuredClone(resultRequest) }),
      appendResults: (results) => set((state) => ({ results: [...state.results, ...results] })),
    }),
    {
      name: 'feature:pokemon-search',
      version: 3,
      migrate: (state) => state as ReturnType<typeof getPokemonSearchInitialState>,
      partialize: ({ mode, statMode, dateRange, timeRange, keySpec, encounterParams, filter }) => ({
        mode,
        statMode,
        dateRange,
        timeRange,
        keySpec,
        encounterParams,
        filter,
      }),
    }
  )
);
