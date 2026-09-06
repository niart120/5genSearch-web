import type { IvFilterInput as IvFilter } from '@/lib/search-filter-context';
/**
 * MT Seed 検索 Feature Store
 *
 * フォーム入力 (永続化) + 検索結果 (非永続化) を管理する。
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MtseedResult } from '@/wasm/wasm_pkg.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

/** 永続化対象: フォーム入力 */
interface MtseedSearchFormState {
  ivFilter: IvFilter;
  mtOffset: number;
  isRoamer: boolean;
  useGpu: boolean;
}

/** 非永続化: 検索結果 */
interface MtseedSearchResultState {
  results: MtseedResult[];
}

type MtseedSearchState = MtseedSearchFormState & MtseedSearchResultState;

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface MtseedSearchActions {
  setIvFilter: (ivFilter: IvFilter) => void;
  setMtOffset: (mtOffset: number) => void;
  setIsRoamer: (isRoamer: boolean) => void;
  setUseGpu: (useGpu: boolean) => void;

  setResults: (results: MtseedResult[]) => void;
  appendResults: (newItems: MtseedResult[]) => void;
  clearResults: () => void;

  resetForm: () => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_IV_FILTER: IvFilter = {
  hp: [0, 31],
  atk: [0, 31],
  def: [0, 31],
  spa: [0, 31],
  spd: [0, 31],
  spe: [0, 31],
};

const DEFAULT_FORM_STATE: MtseedSearchFormState = {
  ivFilter: DEFAULT_IV_FILTER,
  mtOffset: 0,
  isRoamer: false,
  useGpu: true,
};

const DEFAULT_RESULT_STATE: MtseedSearchResultState = {
  results: [],
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useMtseedSearchStore = create<MtseedSearchState & MtseedSearchActions>()(
  persist(
    (set) => ({
      ...DEFAULT_FORM_STATE,
      ...DEFAULT_RESULT_STATE,

      setIvFilter: (ivFilter) => set({ ivFilter }),
      setMtOffset: (mtOffset) => set({ mtOffset }),
      setIsRoamer: (isRoamer) => set({ isRoamer }),
      setUseGpu: (useGpu) => set({ useGpu }),

      setResults: (results) => set({ results }),
      appendResults: (newItems) => set((state) => ({ results: [...state.results, ...newItems] })),
      clearResults: () => set({ results: [] }),

      resetForm: () => set(DEFAULT_FORM_STATE),
    }),
    {
      name: 'feature:mtseed-search',
      version: 2,
      migrate: (state) => state as ReturnType<typeof getMtseedSearchInitialState>,
      partialize: (state) => ({
        ivFilter: state.ivFilter,
        mtOffset: state.mtOffset,
        isRoamer: state.isRoamer,
        useGpu: state.useGpu,
      }),
    }
  )
);

/** テスト用: 初期状態取得 */
export const getMtseedSearchInitialState = (): MtseedSearchState => ({
  ...DEFAULT_FORM_STATE,
  ...DEFAULT_RESULT_STATE,
});

export { DEFAULT_IV_FILTER };
