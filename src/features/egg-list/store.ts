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
  GeneratedEggData,
  Ivs,
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
interface EggListFormState {
  seedInputMode: SeedInputMode;
  seedInput: SeedInputState;
  eggParams: EggGenerationParams;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  speciesId: number | undefined;
  filter: EggFilter | undefined;
  statsFilter: StatsFilter | undefined;
  statMode: StatDisplayMode;
  formRevision: number;
}

/** 非永続化: 検索結果 (raw データ; UI 変換は Hook 側で行う) */
interface EggListResultState {
  seedOrigins: SeedOrigin[];
  results: GeneratedEggData[];
}

type EggListState = EggListFormState & EggListResultState;

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface EggListActions {
  setSeedInputMode: (mode: SeedInputMode) => void;
  setSeedInput: (action: SeedInputStateAction) => void;
  setSeedOrigins: (seedOrigins: SeedOrigin[]) => void;
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

  setResults: (results: GeneratedEggData[]) => void;
  appendResults: (newItems: GeneratedEggData[]) => void;
  clearResults: () => void;

  resetForm: () => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

/** 理想個体: リスト生成ではデフォルトで 6V 親を想定 */
const DEFAULT_MAX_IVS: Ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

const DEFAULT_EGG_PARAMS: EggGenerationParams = {
  trainer: { tid: 0, sid: 0 },
  everstone: 'None',
  female_ability_slot: 'First',
  uses_ditto: false,
  gender_ratio: 'F1M1',
  nidoran_flag: false,
  masuda_method: false,
  parent_male: { ...DEFAULT_MAX_IVS },
  parent_female: { ...DEFAULT_MAX_IVS },
  consider_npc: false,
  species_id: undefined,
};

const DEFAULT_GEN_CONFIG: Pick<GenerationConfig, 'user_offset' | 'max_advance'> = {
  user_offset: 0,
  max_advance: 30,
};

const DEFAULT_FORM_STATE: EggListFormState = {
  seedInputMode: 'manual-startup',
  seedInput: createDefaultSeedInputState(),
  eggParams: DEFAULT_EGG_PARAMS,
  genConfig: DEFAULT_GEN_CONFIG,
  speciesId: undefined,
  filter: undefined,
  statsFilter: undefined,
  statMode: 'stats',
  formRevision: 0,
};

const DEFAULT_RESULT_STATE: EggListResultState = {
  seedOrigins: [],
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
      setSeedInput: (action) =>
        set((state) => ({
          seedInput: typeof action === 'function' ? action(state.seedInput) : action,
        })),
      setSeedOrigins: (seedOrigins) => set({ seedOrigins }),
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
      appendResults: (newItems) => set((state) => ({ results: [...state.results, ...newItems] })),
      clearResults: () => set({ results: [] }),

      resetForm: () =>
        set((state) => ({
          ...DEFAULT_FORM_STATE,
          seedInput: createDefaultSeedInputState(),
          seedOrigins: [],
          formRevision: state.formRevision + 1,
        })),
    }),
    {
      name: 'feature:egg-list',
      version: 1,
      partialize: (state) => ({
        seedInputMode: state.seedInputMode,
        seedInput: state.seedInput,
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
