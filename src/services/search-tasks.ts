/**
 * 検索タスク生成サービス
 *
 * WASM の generate_*_search_tasks 関数を呼び出し、
 * WorkerPool に渡す SearchTask[] を生成する。
 *
 * メインスレッドで実行される前提 (WASM 初期化済み)。
 */

import {
  generate_mtseed_iv_search_tasks,
  generate_mtseed_search_tasks,
  generate_egg_search_tasks,
  generate_trainer_info_search_tasks,
} from '../wasm/wasm_pkg.js';
import type {
  MtseedSearchContext,
  DatetimeSearchContext,
  MtSeed,
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
  TrainerInfoFilter,
  GameStartConfig,
} from '../wasm/wasm_pkg.js';
import type {
  MtseedSearchTask,
  MtseedDatetimeSearchTask,
  EggDatetimeSearchTask,
  TrainerInfoSearchTask,
} from '../workers/types';

/**
 * MT Seed IV 検索タスクを生成
 *
 * 全 Seed 空間 (0〜0xFFFF_FFFF) を workerCount 個に分割し、
 * 各 Worker に割り当てるタスクを返す。
 */
export function createMtseedIvSearchTasks(
  context: MtseedSearchContext,
  workerCount: number
): MtseedSearchTask[] {
  const paramsList = generate_mtseed_iv_search_tasks(context, workerCount);
  return paramsList.map((params) => ({ kind: 'mtseed' as const, params }));
}

/**
 * MT Seed 起動時刻検索タスクを生成
 *
 * 組み合わせ × 時間チャンク でタスクを分割する。
 */
export function createMtseedDatetimeSearchTasks(
  context: DatetimeSearchContext,
  targetSeeds: MtSeed[],
  workerCount: number
): MtseedDatetimeSearchTask[] {
  const paramsList = generate_mtseed_search_tasks(context, targetSeeds, workerCount);
  return paramsList.map((params) => ({ kind: 'mtseed-datetime' as const, params }));
}

/**
 * 卵検索タスクを生成
 *
 * 組み合わせ × 時間チャンク でタスクを分割する。
 */
export function createEggSearchTasks(
  context: DatetimeSearchContext,
  eggParams: EggGenerationParams,
  genConfig: GenerationConfig,
  filter: EggFilter | null,
  workerCount: number
): EggDatetimeSearchTask[] {
  const paramsList = generate_egg_search_tasks(context, eggParams, genConfig, filter, workerCount);
  return paramsList.map((params) => ({ kind: 'egg-datetime' as const, params }));
}

/**
 * トレーナー情報検索タスクを生成
 *
 * 組み合わせ × 時間チャンク でタスクを分割する。
 */
export function createTrainerInfoSearchTasks(
  context: DatetimeSearchContext,
  filter: TrainerInfoFilter,
  gameStart: GameStartConfig,
  workerCount: number
): TrainerInfoSearchTask[] {
  const paramsList = generate_trainer_info_search_tasks(context, filter, gameStart, workerCount);
  return paramsList.map((params) => ({ kind: 'trainer-info' as const, params }));
}
