import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createDefaultSeedInputState,
  type SeedInputMode,
  type SeedInputState,
  type SeedInputStateAction,
} from '@/components/forms/seed-input-state';
import type { GeneratedWonderCardData, SeedOrigin } from '@/wasm/wasm_pkg.js';
import {
  getWonderCardInitialFormState,
  type WonderCardFormState,
  type WonderCardSelection,
  type WonderCardListRequest,
} from './types';

interface WonderCardListState {
  inputs: WonderCardFormState;
  seedInputMode: SeedInputMode;
  seedInput: SeedInputState;
  seedOrigins: SeedOrigin[];
  selection: WonderCardSelection | undefined;
  results: GeneratedWonderCardData[];
  resultRequest: WonderCardListRequest | undefined;
  formRevision: number;
  setInputs: (partial: Partial<WonderCardFormState>) => void;
  setSeedInputMode: (seedInputMode: SeedInputMode) => void;
  setSeedInput: (action: SeedInputStateAction) => void;
  setSeedOrigins: (seedOrigins: SeedOrigin[]) => void;
  setSelection: (selection: WonderCardSelection | undefined) => void;
  startResults: (request: WonderCardListRequest) => void;
  appendResults: (results: GeneratedWonderCardData[]) => void;
  resetForm: () => void;
}

export function getWonderCardListInitialState() {
  return {
    inputs: getWonderCardInitialFormState(),
    seedInputMode: 'manual-startup' as SeedInputMode,
    seedInput: createDefaultSeedInputState(),
    seedOrigins: [] as SeedOrigin[],
    selection: undefined as WonderCardSelection | undefined,
    results: [] as GeneratedWonderCardData[],
    resultRequest: undefined as WonderCardListRequest | undefined,
    formRevision: 0,
  };
}

export const useWonderCardListStore = create<WonderCardListState>()(
  persist(
    (set) => ({
      ...getWonderCardListInitialState(),
      setInputs: (partial) => set((s) => ({ inputs: { ...s.inputs, ...partial } })),
      setSeedInputMode: (seedInputMode) => set({ seedInputMode }),
      setSeedInput: (action) =>
        set((s) => ({ seedInput: typeof action === 'function' ? action(s.seedInput) : action })),
      setSeedOrigins: (seedOrigins) => set({ seedOrigins }),
      setSelection: (selection) => set({ selection }),
      startResults: (resultRequest) =>
        set({ results: [], resultRequest: structuredClone(resultRequest) }),
      appendResults: (results) => set((s) => ({ results: [...s.results, ...results] })),
      resetForm: () =>
        set((s) => ({
          inputs: getWonderCardInitialFormState(),
          seedInputMode: 'manual-startup',
          seedInput: createDefaultSeedInputState(),
          seedOrigins: [],
          selection: undefined,
          formRevision: s.formRevision + 1,
        })),
    }),
    {
      name: 'feature:wondercard-list',
      version: 1,
      partialize: ({ inputs, seedInputMode, seedInput }) => ({ inputs, seedInputMode, seedInput }),
    }
  )
);
