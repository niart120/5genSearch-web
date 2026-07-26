/**
 * ポケモンリスト Feature Store
 *
 * フォーム入力 (永続化) + 検索結果 (非永続化) を管理する。
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_ENCOUNTER_PARAMS, type EncounterParamsOutput } from './types';
import type {
  PokemonFilter,
  StatsFilter,
  GeneratedPokemonData,
  EncounterType,
  SeedOrigin,
} from '@/wasm/wasm_pkg.js';
import {
  createDefaultSeedInputState,
  type SeedInputMode,
  type SeedInputState,
  type SeedInputStateAction,
} from '@/components/forms/seed-input-state';
import type { StatDisplayMode } from '@/lib/game-data-names';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

/** 永続化対象: フォーム入力 */
interface PokemonListFormState {
  seedInputMode: SeedInputMode;
  seedInput: SeedInputState;
  encounterParams: EncounterParamsOutput;
  filter: PokemonFilter | undefined;
  statsFilter: StatsFilter | undefined;
  statMode: StatDisplayMode;
  formRevision: number;
}

/** 非永続化: 検索結果 (raw データ; UI 変換は Hook 側で行う) */
interface PokemonListResultState {
  seedOrigins: SeedOrigin[];
  results: GeneratedPokemonData[];
  resultEncounterType: EncounterType | undefined;
}

type PokemonListState = PokemonListFormState & PokemonListResultState;

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface PokemonListActions {
  setSeedInputMode: (mode: SeedInputMode) => void;
  setSeedInput: (action: SeedInputStateAction) => void;
  setSeedOrigins: (seedOrigins: SeedOrigin[]) => void;
  setEncounterParams: (
    action: EncounterParamsOutput | ((prev: EncounterParamsOutput) => EncounterParamsOutput)
  ) => void;
  setFilter: (filter: PokemonFilter | undefined) => void;
  setStatsFilter: (statsFilter: StatsFilter | undefined) => void;
  setStatMode: (statMode: StatDisplayMode) => void;

  setResults: (results: GeneratedPokemonData[]) => void;
  appendResults: (newItems: GeneratedPokemonData[]) => void;
  startResults: (encounterType: EncounterType) => void;
  clearResults: () => void;

  resetForm: () => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_FORM_STATE: PokemonListFormState = {
  seedInputMode: 'manual-startup',
  seedInput: createDefaultSeedInputState(),
  encounterParams: DEFAULT_ENCOUNTER_PARAMS,
  filter: undefined,
  statsFilter: undefined,
  statMode: 'stats',
  formRevision: 0,
};

const DEFAULT_RESULT_STATE: PokemonListResultState = {
  seedOrigins: [],
  results: [],
  resultEncounterType: undefined,
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
      setSeedInput: (action) =>
        set((state) => ({
          seedInput: typeof action === 'function' ? action(state.seedInput) : action,
        })),
      setSeedOrigins: (seedOrigins) => set({ seedOrigins }),
      setEncounterParams: (action) =>
        set((state) => ({
          encounterParams: typeof action === 'function' ? action(state.encounterParams) : action,
        })),
      setFilter: (filter) => set({ filter }),
      setStatsFilter: (statsFilter) => set({ statsFilter }),
      setStatMode: (statMode) => set({ statMode }),

      setResults: (results) => set({ results }),
      appendResults: (newItems) => set((state) => ({ results: [...state.results, ...newItems] })),
      startResults: (resultEncounterType) => set({ results: [], resultEncounterType }),
      clearResults: () => set(DEFAULT_RESULT_STATE),

      resetForm: () =>
        set((state) => ({
          ...DEFAULT_FORM_STATE,
          seedInput: createDefaultSeedInputState(),
          seedOrigins: [],
          formRevision: state.formRevision + 1,
        })),
    }),
    {
      name: 'feature:pokemon-list',
      version: 1,
      partialize: (state) => ({
        seedInputMode: state.seedInputMode,
        seedInput: state.seedInput,
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
