import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDatetimeSearchInitialState } from '@/features/datetime-search/store';
import {
  getWonderCardInitialFormState,
  type WonderCardFormState,
  type WonderCardSelection,
} from '@/features/wondercard-list/types';
import type { GeneratedWonderCardData } from '@/wasm/wasm_pkg.js';
import type { WonderCardSearchRange, WonderCardSearchRequest } from './types';

interface WonderCardSearchState extends WonderCardSearchRange {
  inputs: WonderCardFormState;
  selection: WonderCardSelection | undefined;
  results: GeneratedWonderCardData[];
  resultRequest: WonderCardSearchRequest | undefined;
  formRevision: number;
  setInputs: (partial: Partial<WonderCardFormState>) => void;
  setDateRange: (dateRange: WonderCardSearchRange['dateRange']) => void;
  setTimeRange: (timeRange: WonderCardSearchRange['timeRange']) => void;
  setKeySpec: (keySpec: WonderCardSearchRange['keySpec']) => void;
  setSelection: (selection: WonderCardSelection | undefined) => void;
  startResults: (request: WonderCardSearchRequest) => void;
  appendResults: (results: GeneratedWonderCardData[]) => void;
  resetForm: () => void;
}

function getInitialRange(): WonderCardSearchRange {
  const { dateRange, timeRange, keySpec } = getDatetimeSearchInitialState();
  return structuredClone({ dateRange, timeRange, keySpec });
}

export function getWonderCardSearchInitialState() {
  return {
    ...getInitialRange(),
    inputs: getWonderCardInitialFormState(),
    formRevision: 0,
    selection: undefined as WonderCardSelection | undefined,
    results: [] as GeneratedWonderCardData[],
    resultRequest: undefined as WonderCardSearchRequest | undefined,
  };
}

export const useWonderCardSearchStore = create<WonderCardSearchState>()(
  persist(
    (set) => ({
      ...getWonderCardSearchInitialState(),
      setInputs: (partial) => set((s) => ({ inputs: { ...s.inputs, ...partial } })),
      setDateRange: (dateRange) => set({ dateRange }),
      setTimeRange: (timeRange) => set({ timeRange }),
      setKeySpec: (keySpec) => set({ keySpec }),
      setSelection: (selection) => set({ selection }),
      startResults: (resultRequest) =>
        set({ results: [], resultRequest: structuredClone(resultRequest) }),
      appendResults: (results) => set((s) => ({ results: [...s.results, ...results] })),
      resetForm: () =>
        set((s) => ({
          ...getInitialRange(),
          inputs: getWonderCardInitialFormState(),
          selection: undefined,
          formRevision: s.formRevision + 1,
        })),
    }),
    {
      name: 'feature:wondercard-search',
      version: 1,
      partialize: ({ inputs, dateRange, timeRange, keySpec }) => ({
        inputs,
        dateRange,
        timeRange,
        keySpec,
      }),
    }
  )
);
