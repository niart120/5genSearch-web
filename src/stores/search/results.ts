import { create } from 'zustand';
import type {
  EggDatetimeSearchResult,
  GeneratedPokemonData,
  MtSeed,
  MtseedResult,
  SeedOrigin,
  TrainerInfoSearchResult,
} from '../../wasm/wasm_pkg.js';

export type SearchResult =
  | SeedOrigin[]
  | MtseedResult[]
  | EggDatetimeSearchResult[]
  | TrainerInfoSearchResult[]
  | GeneratedPokemonData[];

interface SearchResultsState {
  results: SearchResult[];
  lastUpdatedAt: number | undefined;
  pendingTargetSeeds: MtSeed[];
}

interface SearchResultsActions {
  addResult: (result: SearchResult) => void;
  clearResults: () => void;
  setPendingTargetSeeds: (seeds: MtSeed[]) => void;
  clearPendingTargetSeeds: () => void;
}

const DEFAULT_STATE: SearchResultsState = {
  results: [],
  lastUpdatedAt: undefined,
  pendingTargetSeeds: [],
};

export const useSearchResultsStore = create<SearchResultsState & SearchResultsActions>()((set) => ({
  ...DEFAULT_STATE,
  addResult: (result) =>
    set((state) => ({
      results: [...state.results, result],
      lastUpdatedAt: Date.now(),
    })),
  clearResults: () => set(DEFAULT_STATE),
  setPendingTargetSeeds: (seeds) => set({ pendingTargetSeeds: seeds }),
  clearPendingTargetSeeds: () => set({ pendingTargetSeeds: [] }),
}));

export const getSearchResultsInitialState = (): SearchResultsState => DEFAULT_STATE;
