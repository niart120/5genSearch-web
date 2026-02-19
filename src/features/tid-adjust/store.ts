/**
 * ID 調整 Feature Store
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
  TrainerInfoSearchResult,
} from '@/wasm/wasm_pkg.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

/** セーブ状態 (BW: 2 値, BW2: 3 値) */
export type SaveMode = 'NoSave' | 'WithSave' | 'WithSaveMemoryLink';

/** 永続化対象: フォーム入力 */
interface TidAdjustFormState {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
  tid: string;
  sid: string;
  shinyPidRaw: string;
  saveMode: SaveMode;
}

/** 非永続化: 検索結果 */
interface TidAdjustResultState {
  results: TrainerInfoSearchResult[];
}

type TidAdjustState = TidAdjustFormState & TidAdjustResultState;

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface TidAdjustActions {
  setDateRange: (dateRange: DateRangeParams) => void;
  setTimeRange: (timeRange: TimeRangeParams) => void;
  setKeySpec: (keySpec: KeySpec) => void;
  setTid: (tid: string) => void;
  setSid: (sid: string) => void;
  setShinyPidRaw: (shinyPidRaw: string) => void;
  setSaveMode: (saveMode: SaveMode) => void;

  setResults: (results: TrainerInfoSearchResult[]) => void;
  clearResults: () => void;

  resetForm: () => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_TIME_RANGE: TimeRangeParams = {
  hour_start: 0,
  hour_end: 23,
  minute_start: 0,
  minute_end: 59,
  second_start: 0,
  second_end: 59,
};

const DEFAULT_KEY_SPEC: KeySpec = { available_buttons: [] };

const createDefaultFormState = (): TidAdjustFormState => ({
  dateRange: getTodayDateRange(),
  timeRange: DEFAULT_TIME_RANGE,
  keySpec: DEFAULT_KEY_SPEC,
  tid: '',
  sid: '',
  shinyPidRaw: '',
  saveMode: 'NoSave',
});

const DEFAULT_RESULT_STATE: TidAdjustResultState = {
  results: [],
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useTidAdjustStore = create<TidAdjustState & TidAdjustActions>()(
  persist(
    (set) => ({
      ...createDefaultFormState(),
      ...DEFAULT_RESULT_STATE,

      setDateRange: (dateRange) => set({ dateRange }),
      setTimeRange: (timeRange) => set({ timeRange }),
      setKeySpec: (keySpec) => set({ keySpec }),
      setTid: (tid) => set({ tid }),
      setSid: (sid) => set({ sid }),
      setShinyPidRaw: (shinyPidRaw) => set({ shinyPidRaw }),
      setSaveMode: (saveMode) => set({ saveMode }),

      setResults: (results) => set({ results }),
      clearResults: () => set({ results: [] }),

      resetForm: () => set(createDefaultFormState()),
    }),
    {
      name: 'feature:tid-adjust',
      version: 1,
      partialize: (state) => ({
        dateRange: state.dateRange,
        timeRange: state.timeRange,
        keySpec: state.keySpec,
        tid: state.tid,
        sid: state.sid,
        shinyPidRaw: state.shinyPidRaw,
        saveMode: state.saveMode,
      }),
    }
  )
);

/** テスト用: 初期状態取得 */
export const getTidAdjustInitialState = (): TidAdjustState => ({
  ...createDefaultFormState(),
  ...DEFAULT_RESULT_STATE,
});
