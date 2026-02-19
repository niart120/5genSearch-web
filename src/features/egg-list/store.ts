/**
 * タマゴリスト Feature Store
 *
 * フォーム入力 (永続化) + 検索結果 (非永続化) を管理する。
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
  StatsFilter,
  UiEggData,
  Ivs,
} from '@/wasm/wasm_pkg.js';
import type { SeedInputMode } from '@/components/forms/seed-input-section';
import type { StatDisplayMode } from '@/lib/game-data-names';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

/** 永続化対象: フォーム入力 */
interface EggListFormState {
  seedInputMode: SeedInputMode;
  eggParams: EggGenerationParams;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  speciesId: number | undefined;
  filter: EggFilter | undefined;
  statsFilter: StatsFilter | undefined;
  statMode: StatDisplayMode;
}

/** 非永続化: 検索結果 */
interface EggListResultState {
  results: UiEggData[];
}

type EggListState = EggListFormState & EggListResultState;

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface EggListActions {
  setSeedInputMode: (mode: SeedInputMode) => void;
  setEggParams: (
    action: EggGenerationParams | ((prev: EggGenerationParams) => EggGenerationParams)
  ) => void;
  setGenConfig: (
    action:
      | Pick<GenerationConfig, 'user_offset' | 'max_advance'>
      | ((
          prev: Pick<GenerationConfig, 'user_offset' | 'max_advance'>
        ) => Pick<GenerationConfig, 'user_offset' | 'max_advance'>)
  ) => void;
  setSpeciesId: (speciesId: number | undefined) => void;
  setFilter: (filter: EggFilter | undefined) => void;
  setStatsFilter: (statsFilter: StatsFilter | undefined) => void;
  setStatMode: (statMode: StatDisplayMode) => void;

  setResults: (results: UiEggData[]) => void;
  clearResults: () => void;

  resetForm: () => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_IVS: Ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

const DEFAULT_EGG_PARAMS: EggGenerationParams = {
  trainer: { tid: 0, sid: 0 },
  everstone: 'None',
  female_ability_slot: 'First',
  uses_ditto: false,
  gender_ratio: 'F1M1',
  nidoran_flag: false,
  masuda_method: false,
  parent_male: { ...DEFAULT_IVS },
  parent_female: { ...DEFAULT_IVS },
  consider_npc: false,
  species_id: undefined,
};

const DEFAULT_GEN_CONFIG: Pick<GenerationConfig, 'user_offset' | 'max_advance'> = {
  user_offset: 0,
  max_advance: 30,
};

const DEFAULT_FORM_STATE: EggListFormState = {
  seedInputMode: 'manual-startup',
  eggParams: DEFAULT_EGG_PARAMS,
  genConfig: DEFAULT_GEN_CONFIG,
  speciesId: undefined,
  filter: undefined,
  statsFilter: undefined,
  statMode: 'stats',
};

const DEFAULT_RESULT_STATE: EggListResultState = {
  results: [],
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useEggListStore = create<EggListState & EggListActions>()(
  persist(
    (set) => ({
      ...DEFAULT_FORM_STATE,
      ...DEFAULT_RESULT_STATE,

      setSeedInputMode: (seedInputMode) => set({ seedInputMode }),
      setEggParams: (action) =>
        set((state) => ({
          eggParams: typeof action === 'function' ? action(state.eggParams) : action,
        })),
      setGenConfig: (action) =>
        set((state) => ({
          genConfig: typeof action === 'function' ? action(state.genConfig) : action,
        })),
      setSpeciesId: (speciesId) => set({ speciesId }),
      setFilter: (filter) => set({ filter }),
      setStatsFilter: (statsFilter) => set({ statsFilter }),
      setStatMode: (statMode) => set({ statMode }),

      setResults: (results) => set({ results }),
      clearResults: () => set({ results: [] }),

      resetForm: () => set(DEFAULT_FORM_STATE),
    }),
    {
      name: 'feature:egg-list',
      version: 1,
      partialize: (state) => ({
        seedInputMode: state.seedInputMode,
        eggParams: state.eggParams,
        genConfig: state.genConfig,
        speciesId: state.speciesId,
        filter: state.filter,
        statsFilter: state.statsFilter,
        statMode: state.statMode,
      }),
    }
  )
);

/** テスト用: 初期状態取得 */
export const getEggListInitialState = (): EggListState => ({
  ...DEFAULT_FORM_STATE,
  ...DEFAULT_RESULT_STATE,
});
