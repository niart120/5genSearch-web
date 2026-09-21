import type { EggFilterInput as EggFilter } from '@/lib/search-filter-context';
import {
  isDateRangeValid,
  isTimeRangeValid,
  areTimer0VCountRangesValid,
  isIvFilterRangeValid,
} from '@/lib/range-validation';
import type { Timer0VCountRange } from '@/wasm/wasm_pkg';
/**
 * 孵化起動時刻検索 — 型定義 + バリデーション
 */

import type {
  DateRangeParams,
  TimeRangeParams,
  KeySpec,
  EggGenerationParams,
  GenerationConfig,
} from '../../wasm/wasm_pkg.js';
import { validateGenConfig, isIvValid } from '@/lib/validation';

/** 孵化検索フォーム状態 */
export interface EggSearchFormState {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
  eggParams: EggGenerationParams;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  filter: EggFilter | undefined;
}

/** バリデーションエラーコード */
export type EggValidationErrorCode =
  | 'DATE_RANGE_INVALID'
  | 'TIME_RANGE_INVALID'
  | 'STARTUP_RANGE_INVALID'
  | 'IV_RANGE_INVALID'
  | 'ADVANCE_RANGE_INVALID'
  | 'OFFSET_NEGATIVE'
  | 'IV_OUT_OF_RANGE';

/** バリデーション結果 */
export interface ValidationResult {
  errors: EggValidationErrorCode[];
  isValid: boolean;
}

/**
 * 孵化検索フォームのバリデーション
 */
export function validateEggSearchForm(
  form: EggSearchFormState,
  ranges?: Timer0VCountRange[]
): ValidationResult {
  const errors: EggValidationErrorCode[] = [];

  if (!isDateRangeValid(form.dateRange)) {
    errors.push('DATE_RANGE_INVALID');
  }

  if (!isTimeRangeValid(form.timeRange)) {
    errors.push('TIME_RANGE_INVALID');
  }

  errors.push(...validateGenConfig(form.genConfig));
  if (!isIvFilterRangeValid(form.filter?.iv)) errors.push('IV_RANGE_INVALID');
  if (ranges && !areTimer0VCountRangesValid(ranges)) errors.push('STARTUP_RANGE_INVALID');

  // 親個体値の範囲チェック
  const maleIvs = Object.values(form.eggParams.parent_male);
  const femaleIvs = Object.values(form.eggParams.parent_female);
  if (!maleIvs.every((v) => isIvValid(v)) || !femaleIvs.every((v) => isIvValid(v))) {
    errors.push('IV_OUT_OF_RANGE');
  }

  return { errors, isValid: errors.length === 0 };
}
