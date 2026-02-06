import { create } from 'zustand';
import type {
  EggDatetimeSearchResult,
  MtseedResult,
  SeedOrigin,
  TrainerInfoSearchResult,
} from '../../wasm/wasm_pkg.js';

export type SearchResult =
  | SeedOrigin[]
  | MtseedResult[]
  | EggDatetimeSearchResult[]
  | TrainerInfoSearchResult[];

interface SearchResultsState {
  results: SearchResult[];
  lastUpdatedAt: number | null;
}

interface SearchResultsActions {
  addResult: (result: SearchResult) => void;
  clearResults: () => void;
}

const DEFAULT_STATE: SearchResultsState = {
  results: [],
  lastUpdatedAt: null,
};

export const useSearchResultsStore = create<SearchResultsState & SearchResultsActions>()((set) => ({
  ...DEFAULT_STATE,
  addResult: (result) =>
    set((state) => ({
      results: [...state.results, result],
      lastUpdatedAt: Date.now(),
    })),
  clearResults: () => set(DEFAULT_STATE),
}));

export const getSearchResultsInitialState = (): SearchResultsState => DEFAULT_STATE;
