/**
 * 針読み Feature Store
 *
 * フォーム入力 (永続化) + 検索結果 (非永続化) を管理する。
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_DATETIME } from '@/components/ui/datetime-input';
import type { Datetime, KeyInput, NeedleSearchResult } from '@/wasm/wasm_pkg.js';
import type { SeedMode } from './types';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

/** 永続化対象: フォーム入力 */
interface NeedleFormState {
  seedMode: SeedMode;
  datetime: Datetime;
  keyInput: KeyInput;
  seedHex: string;
  patternRaw: string;
  userOffset: number;
  maxAdvance: number;
  autoSearch: boolean;
}

/** 非永続化: 検索結果 */
interface NeedleResultState {
  results: NeedleSearchResult[];
}

type NeedleState = NeedleFormState & NeedleResultState;

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface NeedleActions {
  setSeedMode: (seedMode: SeedMode) => void;
  setDatetime: (datetime: Datetime) => void;
  setKeyInput: (keyInput: KeyInput) => void;
  setSeedHex: (seedHex: string) => void;
  setPatternRaw: (patternRaw: string) => void;
  setUserOffset: (userOffset: number) => void;
  setMaxAdvance: (maxAdvance: number) => void;
  setAutoSearch: (autoSearch: boolean) => void;

  setResults: (results: NeedleSearchResult[]) => void;
  clearResults: () => void;

  resetForm: () => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_FORM_STATE: NeedleFormState = {
  seedMode: 'datetime',
  datetime: DEFAULT_DATETIME,
  keyInput: { buttons: [] },
  seedHex: '',
  patternRaw: '',
  userOffset: 0,
  maxAdvance: 30,
  autoSearch: true,
};

const DEFAULT_RESULT_STATE: NeedleResultState = {
  results: [],
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useNeedleStore = create<NeedleState & NeedleActions>()(
  persist(
    (set) => ({
      ...DEFAULT_FORM_STATE,
      ...DEFAULT_RESULT_STATE,

      setSeedMode: (seedMode) => set({ seedMode }),
      setDatetime: (datetime) => set({ datetime }),
      setKeyInput: (keyInput) => set({ keyInput }),
      setSeedHex: (seedHex) => set({ seedHex }),
      setPatternRaw: (patternRaw) => set({ patternRaw }),
      setUserOffset: (userOffset) => set({ userOffset }),
      setMaxAdvance: (maxAdvance) => set({ maxAdvance }),
      setAutoSearch: (autoSearch) => set({ autoSearch }),

      setResults: (results) => set({ results }),
      clearResults: () => set({ results: [] }),

      resetForm: () => set(DEFAULT_FORM_STATE),
    }),
    {
      name: 'feature:needle',
      version: 1,
      partialize: (state) => ({
        seedMode: state.seedMode,
        datetime: state.datetime,
        keyInput: state.keyInput,
        seedHex: state.seedHex,
        patternRaw: state.patternRaw,
        userOffset: state.userOffset,
        maxAdvance: state.maxAdvance,
        autoSearch: state.autoSearch,
      }),
    }
  )
);

/** テスト用: 初期状態取得 */
export const getNeedleInitialState = (): NeedleState => ({
  ...DEFAULT_FORM_STATE,
  ...DEFAULT_RESULT_STATE,
});
