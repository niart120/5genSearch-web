/**
 * 孵化起動時刻検索 Feature Store
 *
 * フォーム入力 (永続化) + 検索結果 (非永続化) を管理する。
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getTodayDateRange } from '@/lib/date-range';
import type {
  DateRangeParams,
  TimeRangeParams,
  KeySpec,
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
  EggDatetimeSearchResult,
  Ivs,
} from '@/wasm/wasm_pkg.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

/** 永続化対象: フォーム入力 */
interface EggSearchFormState {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
  eggParams: EggGenerationParams;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  filter: EggFilter | undefined;
}

/** 非永続化: 検索結果 */
interface EggSearchResultState {
  results: EggDatetimeSearchResult[];
}

type EggSearchState = EggSearchFormState & EggSearchResultState;

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface EggSearchActions {
  setDateRange: (dateRange: DateRangeParams) => void;
  setTimeRange: (timeRange: TimeRangeParams) => void;
  setKeySpec: (keySpec: KeySpec) => void;
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
  setFilter: (filter: EggFilter | undefined) => void;

  setResults: (results: EggDatetimeSearchResult[]) => void;
  clearResults: () => void;

  resetForm: () => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_IVS: Ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

const DEFAULT_TIME_RANGE: TimeRangeParams = {
  hour_start: 0,
  hour_end: 23,
  minute_start: 0,
  minute_end: 59,
  second_start: 0,
  second_end: 59,
};

const DEFAULT_KEY_SPEC: KeySpec = { available_buttons: [] };

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

const createDefaultFormState = (): EggSearchFormState => ({
  dateRange: getTodayDateRange(),
  timeRange: DEFAULT_TIME_RANGE,
  keySpec: DEFAULT_KEY_SPEC,
  eggParams: DEFAULT_EGG_PARAMS,
  genConfig: DEFAULT_GEN_CONFIG,
  filter: undefined,
});

const DEFAULT_RESULT_STATE: EggSearchResultState = {
  results: [],
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useEggSearchStore = create<EggSearchState & EggSearchActions>()(
  persist(
    (set) => ({
      ...createDefaultFormState(),
      ...DEFAULT_RESULT_STATE,

      setDateRange: (dateRange) => set({ dateRange }),
      setTimeRange: (timeRange) => set({ timeRange }),
      setKeySpec: (keySpec) => set({ keySpec }),
      setEggParams: (action) =>
        set((state) => ({
          eggParams: typeof action === 'function' ? action(state.eggParams) : action,
        })),
      setGenConfig: (action) =>
        set((state) => ({
          genConfig: typeof action === 'function' ? action(state.genConfig) : action,
        })),
      setFilter: (filter) => set({ filter }),

      setResults: (results) => set({ results }),
      clearResults: () => set({ results: [] }),

      resetForm: () => set(createDefaultFormState()),
    }),
    {
      name: 'feature:egg-search',
      version: 1,
      partialize: (state) => ({
        dateRange: state.dateRange,
        timeRange: state.timeRange,
        keySpec: state.keySpec,
        eggParams: state.eggParams,
        genConfig: state.genConfig,
        filter: state.filter,
      }),
    }
  )
);

/** テスト用: 初期状態取得 */
export const getEggSearchInitialState = (): EggSearchState => ({
  ...createDefaultFormState(),
  ...DEFAULT_RESULT_STATE,
});
