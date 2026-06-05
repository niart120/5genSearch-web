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
export type SeedOriginTransferTarget = DetailOriginConsumer;

const DETAIL_ORIGIN_CONSUMERS: readonly DetailOriginConsumer[] = [
  'pokemon-list',
  'egg-list',
  'needle',
] as const;

interface SearchResultsState {
  results: SearchResult[];
  lastUpdatedAt: number | undefined;
  pendingTargetSeeds: MtSeed[];
  pendingSeedOrigins: Partial<Record<SeedOriginTransferTarget, SeedOrigin[]>>;
  /** 各消費先ページごとの pending detail origin */
  pendingDetailOrigins: Partial<Record<DetailOriginConsumer, SeedOrigin>>;
}

interface SearchResultsActions {
  addResult: (result: SearchResult) => void;
  clearResults: () => void;
  setPendingTargetSeeds: (seeds: MtSeed[]) => void;
  clearPendingTargetSeeds: () => void;
  /** pendingTargetSeeds を消費 (読み取り + クリア) */
  consumePendingTargetSeeds: () => MtSeed[];
  setPendingSeedOrigins: (origins: SeedOrigin[], target: SeedOriginTransferTarget) => void;
  clearPendingSeedOrigins: (target: SeedOriginTransferTarget) => void;
  /** 全消費先ページに pending detail origin をセット */
  setPendingDetailOrigin: (origin: SeedOrigin) => void;
  /** 指定ページの pending detail origin をクリア (ワンショット消費) */
  clearPendingDetailOrigin: (consumer: DetailOriginConsumer) => void;
  /** pendingDetailOrigin を消費 (読み取り + クリア) */
  consumePendingDetailOrigin: (consumer: DetailOriginConsumer) => SeedOrigin | undefined;
  /** pendingSeedOrigins を消費 (読み取り + クリア) */
  consumePendingSeedOrigins: (target: SeedOriginTransferTarget) => SeedOrigin[];
}

const DEFAULT_STATE: SearchResultsState = {
  results: [],
  lastUpdatedAt: undefined,
  pendingTargetSeeds: [],
  pendingSeedOrigins: {},
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
    consumePendingTargetSeeds: () => {
      const current = get().pendingTargetSeeds;
      if (current.length > 0) {
        set({ pendingTargetSeeds: [] });
      }
      return current;
    },
    setPendingSeedOrigins: (origins, target) =>
      set((state) => ({
        pendingSeedOrigins: { ...state.pendingSeedOrigins, [target]: origins },
      })),
    clearPendingSeedOrigins: (target) =>
      set((state) => {
        const next = { ...state.pendingSeedOrigins };
        delete next[target];
        return { pendingSeedOrigins: next };
      }),
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
    consumePendingSeedOrigins: (target) => {
      const current = get().pendingSeedOrigins[target] ?? [];
      if (current.length > 0) {
        set((state) => {
          const next = { ...state.pendingSeedOrigins };
          delete next[target];
          return { pendingSeedOrigins: next };
        });
      }
      return current;
    },
  })
);

export const getSearchResultsInitialState = (): SearchResultsState => DEFAULT_STATE;
