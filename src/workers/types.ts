/**
 * Worker メッセージ型定義
 *
 * Main ↔ Worker 間の通信で使用する型を定義。
 * WASM パッケージの型を再エクスポートし、Worker 固有の型を追加。
 */

import type {
  DatetimeSearchContext,
  EggDatetimeSearchParams,
  MtseedDatetimeSearchParams,
  MtseedSearchParams,
  TrainerInfoSearchParams,
  SeedOrigin,
  MtSeed,
  MtseedResult,
  EggDatetimeSearchResult,
  TrainerInfoSearchResult,
  PokemonGenerationParams,
  GenerationConfig,
  PokemonFilter,
  GeneratedPokemonData,
  EggGenerationParams,
  EggFilter,
  GeneratedEggData,
} from '../wasm/wasm_pkg.js';

// =============================================================================
// Worker Request (Main → Worker)
// =============================================================================

/**
 * WASM 初期化リクエスト
 *
 * Worker に WASM 初期化を指示する。
 * Worker は内部で wasmUrl を使って独自に WASM を fetch/初期化する。
 */
export interface InitRequest {
  type: 'init';
}

/**
 * 検索開始リクエスト
 */
export interface StartRequest {
  type: 'start';
  taskId: string;
  task: SearchTask;
}

/**
 * 検索キャンセルリクエスト
 */
export interface CancelRequest {
  type: 'cancel';
}

/**
 * Main → Worker メッセージ
 */
export type WorkerRequest = InitRequest | StartRequest | CancelRequest;

// =============================================================================
// Worker Response (Worker → Main)
// =============================================================================

/**
 * WASM 初期化完了レスポンス
 */
export interface ReadyResponse {
  type: 'ready';
}

/**
 * 進捗報告レスポンス
 */
export interface ProgressResponse {
  type: 'progress';
  taskId: string;
  progress: ProgressInfo;
}

/**
 * 検索結果レスポンス (MtseedDatetime / TrainerInfo)
 */
export interface SeedOriginResultResponse {
  type: 'result';
  taskId: string;
  resultType: 'seed-origin';
  results: SeedOrigin[];
}

/**
 * 検索結果レスポンス (MtseedSearch)
 */
export interface MtseedResultResponse {
  type: 'result';
  taskId: string;
  resultType: 'mtseed';
  results: MtseedResult[];
}

/**
 * 検索結果レスポンス (EggDatetime)
 */
export interface EggResultResponse {
  type: 'result';
  taskId: string;
  resultType: 'egg';
  results: EggDatetimeSearchResult[];
}

/**
 * 検索結果レスポンス (TrainerInfo)
 */
export interface TrainerInfoResultResponse {
  type: 'result';
  taskId: string;
  resultType: 'trainer-info';
  results: TrainerInfoSearchResult[];
}

/**
 * 検索完了レスポンス
 */
export interface DoneResponse {
  type: 'done';
  taskId: string;
}

/**
 * エラーレスポンス
 */
export interface ErrorResponse {
  type: 'error';
  taskId: string;
  message: string;
}

/**
 * Worker → Main メッセージ
 */
/**
 * 検索結果レスポンス (PokemonList)
 */
export interface PokemonListResultResponse {
  type: 'result';
  taskId: string;
  resultType: 'pokemon-list';
  results: GeneratedPokemonData[];
}

/**
 * 検索結果レスポンス (EggList)
 */
export interface EggListResultResponse {
  type: 'result';
  taskId: string;
  resultType: 'egg-list';
  results: GeneratedEggData[];
}

export type WorkerResponse =
  | ReadyResponse
  | ProgressResponse
  | SeedOriginResultResponse
  | MtseedResultResponse
  | EggResultResponse
  | TrainerInfoResultResponse
  | PokemonListResultResponse
  | EggListResultResponse
  | DoneResponse
  | ErrorResponse;

// =============================================================================
// Progress Info
// =============================================================================

/**
 * 進捗情報
 */
export interface ProgressInfo {
  /** 処理済み件数 */
  processed: number;
  /** 総件数 */
  total: number;
  /** 進捗率 (0-100) */
  percentage: number;
  /** 経過時間 (ms) */
  elapsedMs: number;
  /** 推定残り時間 (ms) */
  estimatedRemainingMs: number;
  /** スループット (items/sec) */
  throughput: number;
}

// =============================================================================
// Search Task
// =============================================================================

/**
 * Egg 起動時刻検索タスク
 */
export interface EggDatetimeSearchTask {
  kind: 'egg-datetime';
  params: EggDatetimeSearchParams;
}

/**
 * MT Seed 起動時刻検索タスク
 */
export interface MtseedDatetimeSearchTask {
  kind: 'mtseed-datetime';
  params: MtseedDatetimeSearchParams;
}

/**
 * GPU MT Seed 起動時刻検索タスク
 *
 * GPU Worker で使用する。DatetimeSearchContext と target_seeds を直接受け取る。
 */
export interface GpuMtseedSearchTask {
  kind: 'gpu-mtseed';
  context: DatetimeSearchContext;
  targetSeeds: MtSeed[];
}

/**
 * MT Seed 検索タスク (IV フィルタ)
 */
export interface MtseedSearchTask {
  kind: 'mtseed';
  params: MtseedSearchParams;
}

/**
 * TrainerInfo 検索タスク
 */
export interface TrainerInfoSearchTask {
  kind: 'trainer-info';
  params: TrainerInfoSearchParams;
}

/**
 * ポケモンリスト生成タスク
 */
export interface PokemonListTask {
  kind: 'pokemon-list';
  origins: SeedOrigin[];
  params: PokemonGenerationParams;
  config: GenerationConfig;
  filter: PokemonFilter | undefined;
}

/**
 * タマゴ個体生成タスク
 */
export interface EggListTask {
  kind: 'egg-list';
  origins: SeedOrigin[];
  params: EggGenerationParams;
  config: GenerationConfig;
  filter: EggFilter | undefined;
}

/**
 * 検索タスク (Union)
 */
export type SearchTask =
  | EggDatetimeSearchTask
  | MtseedDatetimeSearchTask
  | GpuMtseedSearchTask
  | MtseedSearchTask
  | TrainerInfoSearchTask
  | PokemonListTask
  | EggListTask;

// =============================================================================
// Search Result Type Mapping
// =============================================================================

/**
 * 検索タスク種別から結果型へのマッピング
 */
export type SearchResultType<T extends SearchTask['kind']> = T extends 'egg-datetime'
  ? EggDatetimeSearchResult[]
  : T extends 'mtseed-datetime'
    ? SeedOrigin[]
    : T extends 'gpu-mtseed'
      ? SeedOrigin[]
      : T extends 'mtseed'
        ? MtseedResult[]
        : T extends 'trainer-info'
          ? TrainerInfoSearchResult[]
          : T extends 'pokemon-list'
            ? GeneratedPokemonData[]
            : T extends 'egg-list'
              ? GeneratedEggData[]
              : never;
