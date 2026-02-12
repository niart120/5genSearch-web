/**
 * フォームバリデーション共通ヘルパー
 *
 * 各 feature の validate 関数で共通する検証ロジックを集約する。
 */

import { IV_VALUE_UNKNOWN } from '@/lib/game-data-names';

/** offset / max_advance の共通バリデーションエラーコード */
export type GenConfigValidationErrorCode = 'OFFSET_NEGATIVE' | 'ADVANCE_RANGE_INVALID';

/**
 * GenerationConfig (user_offset / max_advance) の共通バリデーション
 *
 * - offset < 0 → `OFFSET_NEGATIVE`
 * - max_advance < offset → `ADVANCE_RANGE_INVALID`
 */
export function validateGenConfig(config: {
  user_offset: number;
  max_advance: number;
}): GenConfigValidationErrorCode[] {
  const errors: GenConfigValidationErrorCode[] = [];
  if (config.user_offset < 0) {
    errors.push('OFFSET_NEGATIVE');
  }
  if (config.max_advance < config.user_offset) {
    errors.push('ADVANCE_RANGE_INVALID');
  }
  return errors;
}

/**
 * IV 値が有効範囲内か判定 (0–31 または IV_VALUE_UNKNOWN)
 */
export function isIvValid(value: number): boolean {
  return (value >= 0 && value <= 31) || value === IV_VALUE_UNKNOWN;
}
