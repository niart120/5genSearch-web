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

/** pendingDetailOrigin の消費先 feature */
export type DetailOriginConsumer = 'pokemon-list' | 'egg-list' | 'needle';

const DETAIL_ORIGIN_CONSUMERS: readonly DetailOriginConsumer[] = [
  'pokemon-list',
  'egg-list',
  'needle',
] as const;

interface SearchResultsState {
  results: SearchResult[];
  lastUpdatedAt: number | undefined;
  pendingTargetSeeds: MtSeed[];
  pendingSeedOrigins: SeedOrigin[];
  /** 各消費先ページごとの pending detail origin */
  pendingDetailOrigins: Partial<Record<DetailOriginConsumer, SeedOrigin>>;
}

interface SearchResultsActions {
  addResult: (result: SearchResult) => void;
  clearResults: () => void;
  setPendingTargetSeeds: (seeds: MtSeed[]) => void;
  clearPendingTargetSeeds: () => void;
  setPendingSeedOrigins: (origins: SeedOrigin[]) => void;
  clearPendingSeedOrigins: () => void;
  /** 全消費先ページに pending detail origin をセット */
  setPendingDetailOrigin: (origin: SeedOrigin) => void;
  /** 指定ページの pending detail origin をクリア (ワンショット消費) */
  clearPendingDetailOrigin: (consumer: DetailOriginConsumer) => void;
  /** pendingDetailOrigin を消費 (読み取り + クリア) */
  consumePendingDetailOrigin: (consumer: DetailOriginConsumer) => SeedOrigin | undefined;
  /** pendingSeedOrigins を消費 (読み取り + クリア) */
  consumePendingSeedOrigins: () => SeedOrigin[];
}

const DEFAULT_STATE: SearchResultsState = {
  results: [],
  lastUpdatedAt: undefined,
  pendingTargetSeeds: [],
  pendingSeedOrigins: [],
  pendingDetailOrigins: {},
};

export const useSearchResultsStore = create<SearchResultsState & SearchResultsActions>()(
  (set, get) => ({
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
    setPendingDetailOrigin: (origin) =>
      set({
        pendingDetailOrigins: Object.fromEntries(
          DETAIL_ORIGIN_CONSUMERS.map((c) => [c, origin])
        ) as Record<DetailOriginConsumer, SeedOrigin>,
      }),
    clearPendingDetailOrigin: (consumer) =>
      set((state) => {
        const next = { ...state.pendingDetailOrigins };
        delete next[consumer];
        return { pendingDetailOrigins: next };
      }),
    consumePendingDetailOrigin: (consumer) => {
      const current = get().pendingDetailOrigins[consumer];
      if (current !== undefined) {
        set((state) => {
          const next = { ...state.pendingDetailOrigins };
          delete next[consumer];
          return { pendingDetailOrigins: next };
        });
      }
      return current;
    },
    consumePendingSeedOrigins: () => {
      const current = get().pendingSeedOrigins;
      if (current.length > 0) {
        set({ pendingSeedOrigins: [] });
      }
      return current;
    },
  })
);

export const getSearchResultsInitialState = (): SearchResultsState => DEFAULT_STATE;
