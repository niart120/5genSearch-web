import type { PokemonSearchFilterInput as PokemonDatetimeSearchFilter } from '@/lib/search-filter-context';
import { reconcilePokemonSpeciesFilter } from '@/lib/search-filter-context';
import { hasCurrentSpeciesCandidates } from '@/lib/encounter-slot-context';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_ENCOUNTER_PARAMS,
  clearEncounterCandidates,
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
        set((state) => {
          const encounterParams =
            typeof action === 'function' ? action(state.encounterParams) : action;
          const filter = reconcilePokemonSpeciesFilter(
            state.filter,
            encounterParams,
            hasCurrentSpeciesCandidates(encounterParams, useDsConfigStore.getState().config.version)
          );
          return encounterParams === state.encounterParams && filter === state.filter
            ? state
            : { encounterParams, filter };
        }),
      setFilter: (filter) =>
        set((state) => ({
          filter: reconcilePokemonSpeciesFilter(
            filter,
            state.encounterParams,
            hasCurrentSpeciesCandidates(
              state.encounterParams,
              useDsConfigStore.getState().config.version
            )
          ),
        })),
      setStatMode: (statMode) => set({ statMode }),
      startResults: (resultRequest) =>
        set({ results: [], resultRequest: structuredClone(resultRequest) }),
      appendResults: (results) => set((state) => ({ results: [...state.results, ...results] })),
    }),
    {
      name: 'feature:pokemon-search',
      version: 3,
      migrate: (state) => state as ReturnType<typeof getPokemonSearchInitialState>,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PokemonSearchState>;
        return {
          ...current,
          ...saved,
          encounterParams: clearEncounterCandidates(
            saved.encounterParams ?? current.encounterParams
          ),
        };
      },
      partialize: ({ mode, statMode, dateRange, timeRange, keySpec, encounterParams, filter }) => ({
        mode,
        statMode,
        dateRange,
        timeRange,
        keySpec,
        encounterParams: clearEncounterCandidates(encounterParams),
        filter,
      }),
    }
  )
);
