/**
 * MT Seed IV 検索 — 型定義 + バリデーション + 変換関数
 */

import type { IvFilter, MtseedSearchContext } from '../../wasm/wasm_pkg.js';
import { isIvFilterRangeValid } from '@/lib/range-validation';

/** MT Seed IV 検索フォーム状態 */
export interface MtseedIvSearchFormState {
  ivFilter: IvFilter;
  mtOffset: number;
  isRoamer: boolean;
}

/** バリデーションエラーコード */
export type MtseedIvValidationErrorCode = 'IV_RANGE_INVALID' | 'MT_OFFSET_NEGATIVE';

/** バリデーション結果 */
export interface MtseedIvValidationResult {
  errors: MtseedIvValidationErrorCode[];
  isValid: boolean;
}

/** フォーム状態 → WASM コンテキスト変換 */
export function toMtseedSearchContext(form: MtseedIvSearchFormState): MtseedSearchContext {
  return {
    iv_filter: form.ivFilter,
    mt_offset: form.mtOffset,
    is_roamer: form.isRoamer,
  };
}

/**
 * MT Seed IV 検索フォームのバリデーション
 */
export function validateMtseedIvSearchForm(
  form: MtseedIvSearchFormState
): MtseedIvValidationResult {
  const errors: MtseedIvValidationErrorCode[] = [];

  if (!isIvFilterRangeValid(form.ivFilter)) {
    errors.push('IV_RANGE_INVALID');
  }

  if (form.mtOffset < 0) {
    errors.push('MT_OFFSET_NEGATIVE');
  }

  return { errors, isValid: errors.length === 0 };
}
