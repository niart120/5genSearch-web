/**
 * ポケモンリスト Feature Store
 *
 * フォーム入力 (永続化) + 検索結果 (非永続化) を管理する。
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_ENCOUNTER_PARAMS, type EncounterParamsOutput } from './types';
import type { PokemonFilter, StatsFilter, GeneratedPokemonData } from '@/wasm/wasm_pkg.js';
import type { SeedInputMode } from '@/components/forms/seed-input-section';
import type { StatDisplayMode } from '@/lib/game-data-names';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

/** 永続化対象: フォーム入力 */
interface PokemonListFormState {
  seedInputMode: SeedInputMode;
  encounterParams: EncounterParamsOutput;
  filter: PokemonFilter | undefined;
  statsFilter: StatsFilter | undefined;
  statMode: StatDisplayMode;
}

/** 非永続化: 検索結果 (raw データ; UI 変換は Hook 側で行う) */
interface PokemonListResultState {
  results: GeneratedPokemonData[];
}

type PokemonListState = PokemonListFormState & PokemonListResultState;

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface PokemonListActions {
  setSeedInputMode: (mode: SeedInputMode) => void;
  setEncounterParams: (
    action: EncounterParamsOutput | ((prev: EncounterParamsOutput) => EncounterParamsOutput)
  ) => void;
  setFilter: (filter: PokemonFilter | undefined) => void;
  setStatsFilter: (statsFilter: StatsFilter | undefined) => void;
  setStatMode: (statMode: StatDisplayMode) => void;

  setResults: (results: GeneratedPokemonData[]) => void;
  appendResults: (newItems: GeneratedPokemonData[]) => void;
  clearResults: () => void;

  resetForm: () => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_FORM_STATE: PokemonListFormState = {
  seedInputMode: 'manual-startup',
  encounterParams: DEFAULT_ENCOUNTER_PARAMS,
  filter: undefined,
  statsFilter: undefined,
  statMode: 'stats',
};

const DEFAULT_RESULT_STATE: PokemonListResultState = {
  results: [],
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const usePokemonListStore = create<PokemonListState & PokemonListActions>()(
  persist(
    (set) => ({
      ...DEFAULT_FORM_STATE,
      ...DEFAULT_RESULT_STATE,

      setSeedInputMode: (seedInputMode) => set({ seedInputMode }),
      setEncounterParams: (action) =>
        set((state) => ({
          encounterParams: typeof action === 'function' ? action(state.encounterParams) : action,
        })),
      setFilter: (filter) => set({ filter }),
      setStatsFilter: (statsFilter) => set({ statsFilter }),
      setStatMode: (statMode) => set({ statMode }),

      setResults: (results) => set({ results }),
      appendResults: (newItems) => set((state) => ({ results: [...state.results, ...newItems] })),
      clearResults: () => set({ results: [] }),

      resetForm: () => set(DEFAULT_FORM_STATE),
    }),
    {
      name: 'feature:pokemon-list',
      version: 1,
      partialize: (state) => ({
        seedInputMode: state.seedInputMode,
        encounterParams: state.encounterParams,
        filter: state.filter,
        statsFilter: state.statsFilter,
        statMode: state.statMode,
      }),
    }
  )
);

/** テスト用: 初期状態取得 */
export const getPokemonListInitialState = (): PokemonListFormState & PokemonListResultState => ({
  ...DEFAULT_FORM_STATE,
  ...DEFAULT_RESULT_STATE,
});
