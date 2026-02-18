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
  pendingSeedOrigins: SeedOrigin[];
  pendingDetailOrigin: SeedOrigin | undefined;
}

interface SearchResultsActions {
  addResult: (result: SearchResult) => void;
  clearResults: () => void;
  setPendingTargetSeeds: (seeds: MtSeed[]) => void;
  clearPendingTargetSeeds: () => void;
  setPendingSeedOrigins: (origins: SeedOrigin[]) => void;
  clearPendingSeedOrigins: () => void;
  setPendingDetailOrigin: (origin: SeedOrigin) => void;
  clearPendingDetailOrigin: () => void;
}

const DEFAULT_STATE: SearchResultsState = {
  results: [],
  lastUpdatedAt: undefined,
  pendingTargetSeeds: [],
  pendingSeedOrigins: [],
  pendingDetailOrigin: undefined,
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
  setPendingSeedOrigins: (origins) => set({ pendingSeedOrigins: origins }),
  clearPendingSeedOrigins: () => set({ pendingSeedOrigins: [] }),
  setPendingDetailOrigin: (origin) => set({ pendingDetailOrigin: origin }),
  clearPendingDetailOrigin: () => set({ pendingDetailOrigin: undefined }),
}));

export const getSearchResultsInitialState = (): SearchResultsState => DEFAULT_STATE;
