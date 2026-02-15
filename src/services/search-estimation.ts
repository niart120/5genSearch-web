/**
 * 検索結果件数の事前見積もりモジュール
 *
 * 検索系 / リスト生成系の各 feature において、実行開始前に結果件数を概算する。
 * WASM 側には制限ロジックを持たず、TS 側で完結する。
 */

import type {
  DateRangeParams,
  TimeRangeParams,
  Timer0VCountRange,
  KeySpec,
  DsButton,
  IvFilter,
  CoreDataFilter,
  TrainerInfoFilter,
  EggFilter,
  PokemonFilter,
} from '../wasm/wasm_pkg.js';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** 警告閾値のデフォルト値 */
export const DEFAULT_RESULT_WARNING_THRESHOLD = 50_000;

/** MT Seed 全空間サイズ (2^32) */
const MT_SEED_FULL_SPACE = 2 ** 32;

// ---------------------------------------------------------------------------
// 見積もり結果
// ---------------------------------------------------------------------------

/** 見積もり結果 */
export interface EstimationResult {
  /** 検索空間サイズ (探索する組み合わせの総数) */
  searchSpaceSize: number;
  /** フィルタのヒット率概算 (0.0–1.0) */
  hitRate: number;
  /** 推定結果件数 (searchSpaceSize * hitRate) */
  estimatedCount: number;
  /** 閾値を超過しているか */
  exceedsThreshold: boolean;
}

// ---------------------------------------------------------------------------
// 日数 / 秒数計算
// ---------------------------------------------------------------------------

/**
 * DateRangeParams から暦日数を計算する。
 *
 * 開始日と終了日を含む日数を返す (同一日 → 1)。
 */
export function countDays(dateRange: DateRangeParams): number {
  const start = Date.UTC(dateRange.start_year, dateRange.start_month - 1, dateRange.start_day);
  const end = Date.UTC(dateRange.end_year, dateRange.end_month - 1, dateRange.end_day);
  const diffMs = end - start;
  return Math.max(Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1, 0);
}

/**
 * TimeRangeParams から 1 日あたりの有効秒数を計算する。
 */
export function countValidSeconds(timeRange: TimeRangeParams): number {
  const hours = timeRange.hour_end - timeRange.hour_start + 1;
  const minutes = timeRange.minute_end - timeRange.minute_start + 1;
  const seconds = timeRange.second_end - timeRange.second_start + 1;
  return Math.max(hours, 0) * Math.max(minutes, 0) * Math.max(seconds, 0);
}

// ---------------------------------------------------------------------------
// KeySpec 組み合わせ数
// ---------------------------------------------------------------------------

/** DS ボタンのビットマスク (Rust 側 DsButton::bit_mask() と同一) */
const BUTTON_BIT_MASK: Record<DsButton, number> = {
  A: 1,
  B: 2,
  Select: 4,
  Start: 8,
  Right: 16,
  Left: 32,
  Up: 64,
  Down: 128,
  R: 256,
  L: 512,
  X: 1024,
  Y: 2048,
};

/**
 * KeySpec から有効な組み合わせ数を TS 側で計算する。
 *
 * available_buttons の全部分集合 (2^n) から無効パターンを除外:
 * - Up + Down 同時押し
 * - Left + Right 同時押し
 * - L + R + Start + Select 同時押し (ソフトリセット)
 *
 * Rust 側 `KeySpec::combination_count()` と同一のロジック。
 */
export function countKeyCombinations(keySpec: KeySpec): number {
  const buttons = keySpec.available_buttons;
  const n = buttons.length;
  let count = 0;

  const upMask = BUTTON_BIT_MASK.Up;
  const downMask = BUTTON_BIT_MASK.Down;
  const leftMask = BUTTON_BIT_MASK.Left;
  const rightMask = BUTTON_BIT_MASK.Right;
  const softResetMask =
    BUTTON_BIT_MASK.L | BUTTON_BIT_MASK.R | BUTTON_BIT_MASK.Start | BUTTON_BIT_MASK.Select;

  for (let bits = 0; bits < 1 << n; bits++) {
    let mask = 0;
    for (let i = 0; i < n; i++) {
      if (bits & (1 << i)) {
        mask |= BUTTON_BIT_MASK[buttons[i]];
      }
    }

    // 上下同時押し
    const hasUpDown = (mask & upMask) !== 0 && (mask & downMask) !== 0;
    // 左右同時押し
    const hasLeftRight = (mask & leftMask) !== 0 && (mask & rightMask) !== 0;
    // L+R+Start+Select (ソフトリセット)
    const hasSoftReset = (mask & softResetMask) === softResetMask;

    if (!hasUpDown && !hasLeftRight && !hasSoftReset) {
      count++;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Timer0/VCount 空間サイズ
// ---------------------------------------------------------------------------

/**
 * Timer0VCountRange[] から組み合わせ総数を計算する。
 */
function countTimer0VCountCombinations(ranges: Timer0VCountRange[]): number {
  let total = 0;
  for (const r of ranges) {
    const t0 = r.timer0_max - r.timer0_min + 1;
    const vc = r.vcount_max - r.vcount_min + 1;
    total += Math.max(t0, 0) * Math.max(vc, 0);
  }
  return total;
}

// ---------------------------------------------------------------------------
// 検索空間サイズ計算
// ---------------------------------------------------------------------------

/**
 * DatetimeSearchContext から検索空間サイズを計算する。
 * datetime-search, egg-search, tid-adjust で共用。
 */
export function calculateDatetimeSearchSpace(
  dateRange: DateRangeParams,
  timeRange: TimeRangeParams,
  ranges: Timer0VCountRange[],
  keyCombinationCount: number
): number {
  const days = countDays(dateRange);
  const seconds = countValidSeconds(timeRange);
  const t0vc = countTimer0VCountCombinations(ranges);
  return days * seconds * t0vc * keyCombinationCount;
}

/**
 * MT Seed IV 検索の検索空間サイズ (固定: 2^32)
 */
export function calculateMtseedSearchSpace(): number {
  return MT_SEED_FULL_SPACE;
}

// ---------------------------------------------------------------------------
// ヒット率計算
// ---------------------------------------------------------------------------

/**
 * IV の各ステータスごとの通過率を計算する。
 */
function ivStatHitRate(min: number, max: number): number {
  return (max - min + 1) / 32;
}

/**
 * IvFilter からヒット率を概算する。
 */
export function estimateIvFilterHitRate(filter: IvFilter): number {
  let rate =
    ivStatHitRate(filter.hp[0], filter.hp[1]) *
    ivStatHitRate(filter.atk[0], filter.atk[1]) *
    ivStatHitRate(filter.def[0], filter.def[1]) *
    ivStatHitRate(filter.spa[0], filter.spa[1]) *
    ivStatHitRate(filter.spd[0], filter.spd[1]) *
    ivStatHitRate(filter.spe[0], filter.spe[1]);

  // めざパタイプ
  if (filter.hidden_power_types && filter.hidden_power_types.length > 0) {
    rate *= filter.hidden_power_types.length / 16;
  }

  // めざパ最低威力 (30-70 の 41 段階)
  if (filter.hidden_power_min_power !== undefined) {
    rate *= (70 - filter.hidden_power_min_power + 1) / 41;
  }

  return rate;
}

/**
 * 色違いフィルタのヒット率を返す。
 */
function shinyHitRate(shiny: 'Shiny' | 'Star' | 'Square', masudaMethod: boolean): number {
  if (masudaMethod) {
    // 国際孵化: 48/65536
    if (shiny === 'Shiny') return 48 / 65_536;
    if (shiny === 'Star') return 42 / 65_536;
    if (shiny === 'Square') return 6 / 65_536;
  }
  if (shiny === 'Shiny') return 8 / 65_536;
  if (shiny === 'Star') return 7 / 65_536;
  if (shiny === 'Square') return 1 / 65_536;
  return 1;
}

/**
 * CoreDataFilter からヒット率を概算する。
 * masudaMethod は色違い確率の補正に使用。
 */
export function estimateCoreDataFilterHitRate(
  filter?: CoreDataFilter,
  masudaMethod: boolean = false
): number {
  if (!filter) return 1;

  let rate = 1;

  // IV
  if (filter.iv) {
    rate *= estimateIvFilterHitRate(filter.iv);
  }

  // 性格
  if (filter.natures && filter.natures.length > 0) {
    rate *= filter.natures.length / 25;
  }

  // 性別 (概算 0.5)
  if (filter.gender) {
    rate *= 0.5;
  }

  // 特性スロット (概算 0.5, Hidden は概算外)
  if (filter.ability_slot) {
    rate *= 0.5;
  }

  // 色違い
  if (filter.shiny) {
    rate *= shinyHitRate(filter.shiny, masudaMethod);
  }

  // stats は概算対象外 (1.0)

  return rate;
}

/**
 * TrainerInfoFilter からヒット率を概算する。
 */
export function estimateTrainerInfoFilterHitRate(filter: TrainerInfoFilter): number {
  let rate = 1;

  if (filter.tid !== undefined) {
    rate *= 1 / 65_536;
  }
  if (filter.sid !== undefined) {
    rate *= 1 / 65_536;
  }
  if (filter.shiny_pid !== undefined) {
    rate *= 8 / 65_536;
  }

  return rate;
}

/**
 * EggFilter からヒット率を概算する。
 * masuda_method フラグで色違い確率を調整。
 */
export function estimateEggFilterHitRate(masudaMethod: boolean, filter?: EggFilter): number {
  if (!filter) return 1;
  // EggFilter extends CoreDataFilter, so use CoreDataFilter hit rate
  return estimateCoreDataFilterHitRate(filter, masudaMethod);
}

/**
 * PokemonFilter からヒット率を概算する。
 * species_ids / level_range は概算対象外 (1.0)。
 */
export function estimatePokemonFilterHitRate(filter?: PokemonFilter): number {
  if (!filter) return 1;
  return estimateCoreDataFilterHitRate(filter);
}

// ---------------------------------------------------------------------------
// feature 別の統合推定関数
// ---------------------------------------------------------------------------

/**
 * EstimationResult を構築するヘルパー。
 */
function buildEstimation(
  searchSpaceSize: number,
  hitRate: number,
  threshold: number
): EstimationResult {
  const estimatedCount = Math.round(searchSpaceSize * hitRate);
  return {
    searchSpaceSize,
    hitRate,
    estimatedCount,
    exceedsThreshold: estimatedCount > threshold,
  };
}

/**
 * datetime-search の推定結果。
 *
 * 探索空間フルスキャン + BTreeSet ルックアップ方式に基づき、
 * N_total * (targetSeedsCount / 2^32) で推定。
 */
export function estimateDatetimeSearchResults(
  dateRange: DateRangeParams,
  timeRange: TimeRangeParams,
  ranges: Timer0VCountRange[],
  keyCombinationCount: number,
  targetSeedsCount: number,
  threshold: number = DEFAULT_RESULT_WARNING_THRESHOLD
): EstimationResult {
  const searchSpaceSize = calculateDatetimeSearchSpace(
    dateRange,
    timeRange,
    ranges,
    keyCombinationCount
  );
  const hitRate = targetSeedsCount / MT_SEED_FULL_SPACE;
  return buildEstimation(searchSpaceSize, hitRate, threshold);
}

/**
 * mtseed-search の推定結果。
 */
export function estimateMtseedSearchResults(
  ivFilter: IvFilter,
  threshold: number = DEFAULT_RESULT_WARNING_THRESHOLD
): EstimationResult {
  const searchSpaceSize = calculateMtseedSearchSpace();
  const hitRate = estimateIvFilterHitRate(ivFilter);
  return buildEstimation(searchSpaceSize, hitRate, threshold);
}

/**
 * egg-search の推定結果。
 */
export function estimateEggSearchResults(
  dateRange: DateRangeParams,
  timeRange: TimeRangeParams,
  ranges: Timer0VCountRange[],
  keyCombinationCount: number,
  filter: EggFilter | undefined,
  masudaMethod: boolean,
  threshold: number = DEFAULT_RESULT_WARNING_THRESHOLD
): EstimationResult {
  const searchSpaceSize = calculateDatetimeSearchSpace(
    dateRange,
    timeRange,
    ranges,
    keyCombinationCount
  );
  const hitRate = estimateEggFilterHitRate(masudaMethod, filter);
  return buildEstimation(searchSpaceSize, hitRate, threshold);
}

/**
 * tid-adjust の推定結果。
 */
export function estimateTidAdjustResults(
  dateRange: DateRangeParams,
  timeRange: TimeRangeParams,
  ranges: Timer0VCountRange[],
  keyCombinationCount: number,
  filter: TrainerInfoFilter,
  threshold: number = DEFAULT_RESULT_WARNING_THRESHOLD
): EstimationResult {
  const searchSpaceSize = calculateDatetimeSearchSpace(
    dateRange,
    timeRange,
    ranges,
    keyCombinationCount
  );
  const hitRate = estimateTrainerInfoFilterHitRate(filter);
  return buildEstimation(searchSpaceSize, hitRate, threshold);
}

/**
 * pokemon-list の推定結果。
 */
export function estimatePokemonListResults(
  seedCount: number,
  maxAdvance: number,
  userOffset: number,
  filter?: PokemonFilter,
  threshold: number = DEFAULT_RESULT_WARNING_THRESHOLD
): EstimationResult {
  const generated = seedCount * Math.max(maxAdvance - userOffset, 0);
  const hitRate = estimatePokemonFilterHitRate(filter);
  return buildEstimation(generated, hitRate, threshold);
}

/**
 * egg-list の推定結果。
 */
export function estimateEggListResults(
  seedCount: number,
  maxAdvance: number,
  userOffset: number,
  filter: EggFilter | undefined,
  masudaMethod: boolean,
  threshold: number = DEFAULT_RESULT_WARNING_THRESHOLD
): EstimationResult {
  const generated = seedCount * Math.max(maxAdvance - userOffset, 0);
  const hitRate = estimateEggFilterHitRate(masudaMethod, filter);
  return buildEstimation(generated, hitRate, threshold);
}
