/**
 * 起動時刻検索 Feature Store
 *
 * フォーム入力 (永続化) + 検索結果 (非永続化) を管理する。
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDefaultTargetSeeds } from './default-seeds';
import type { DateRangeParams, TimeRangeParams, KeySpec, SeedOrigin } from '@/wasm/wasm_pkg.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

/** 永続化対象: フォーム入力 */
interface DatetimeSearchFormState {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
  targetSeedsRaw: string;
  useGpu: boolean;
}

/** 非永続化: 検索結果 */
interface DatetimeSearchResultState {
  results: SeedOrigin[];
}

type DatetimeSearchState = DatetimeSearchFormState & DatetimeSearchResultState;

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface DatetimeSearchActions {
  setDateRange: (dateRange: DateRangeParams) => void;
  setTimeRange: (timeRange: TimeRangeParams) => void;
  setKeySpec: (keySpec: KeySpec) => void;
  setTargetSeedsRaw: (targetSeedsRaw: string) => void;
  setUseGpu: (useGpu: boolean) => void;

  setResults: (results: SeedOrigin[]) => void;
  appendResults: (newItems: SeedOrigin[]) => void;
  clearResults: () => void;

  resetForm: () => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_DATE_RANGE: DateRangeParams = {
  start_year: 2000,
  start_month: 1,
  start_day: 1,
  end_year: 2099,
  end_month: 12,
  end_day: 31,
};

const DEFAULT_TIME_RANGE: TimeRangeParams = {
  hour_start: 0,
  hour_end: 23,
  minute_start: 0,
  minute_end: 59,
  second_start: 0,
  second_end: 59,
};

const DEFAULT_KEY_SPEC: KeySpec = { available_buttons: [] };

const DEFAULT_FORM_STATE: DatetimeSearchFormState = {
  dateRange: DEFAULT_DATE_RANGE,
  timeRange: DEFAULT_TIME_RANGE,
  keySpec: DEFAULT_KEY_SPEC,
  targetSeedsRaw: getDefaultTargetSeeds(),
  useGpu: true,
};

const DEFAULT_RESULT_STATE: DatetimeSearchResultState = {
  results: [],
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useDatetimeSearchStore = create<DatetimeSearchState & DatetimeSearchActions>()(
  persist(
    (set) => ({
      ...DEFAULT_FORM_STATE,
      ...DEFAULT_RESULT_STATE,

      setDateRange: (dateRange) => set({ dateRange }),
      setTimeRange: (timeRange) => set({ timeRange }),
      setKeySpec: (keySpec) => set({ keySpec }),
      setTargetSeedsRaw: (targetSeedsRaw) => set({ targetSeedsRaw }),
      setUseGpu: (useGpu) => set({ useGpu }),

      setResults: (results) => set({ results }),
      appendResults: (newItems) => set((state) => ({ results: [...state.results, ...newItems] })),
      clearResults: () => set({ results: [] }),

      resetForm: () => set(DEFAULT_FORM_STATE),
    }),
    {
      name: 'feature:datetime-search',
      version: 1,
      partialize: (state) => ({
        dateRange: state.dateRange,
        timeRange: state.timeRange,
        keySpec: state.keySpec,
        targetSeedsRaw: state.targetSeedsRaw,
        useGpu: state.useGpu,
      }),
    }
  )
);

/** テスト用: 初期状態取得 */
export const getDatetimeSearchInitialState = (): DatetimeSearchState => ({
  ...DEFAULT_FORM_STATE,
  ...DEFAULT_RESULT_STATE,
});
