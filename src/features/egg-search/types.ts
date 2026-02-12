/**
 * 孵化起動時刻検索 — 型定義 + バリデーション
 */

import type {
  DateRangeParams,
  TimeRangeParams,
  KeySpec,
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
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
  | 'ADVANCE_RANGE_INVALID'
  | 'OFFSET_NEGATIVE'
  | 'IV_OUT_OF_RANGE';

/** バリデーション結果 */
export interface ValidationResult {
  errors: EggValidationErrorCode[];
  isValid: boolean;
}

/**
 * 日付値の先後比較 (start ≤ end)
 */
function isDateRangeValid(range: DateRangeParams): boolean {
  const start = range.start_year * 10_000 + range.start_month * 100 + range.start_day;
  const end = range.end_year * 10_000 + range.end_month * 100 + range.end_day;
  return start <= end;
}

/**
 * 時刻範囲の各フィールドが範囲内か検証
 */
function isTimeRangeValid(range: TimeRangeParams): boolean {
  return (
    range.hour_start >= 0 &&
    range.hour_start <= 23 &&
    range.hour_end >= 0 &&
    range.hour_end <= 23 &&
    range.minute_start >= 0 &&
    range.minute_start <= 59 &&
    range.minute_end >= 0 &&
    range.minute_end <= 59 &&
    range.second_start >= 0 &&
    range.second_start <= 59 &&
    range.second_end >= 0 &&
    range.second_end <= 59
  );
}

/**
 * 孵化検索フォームのバリデーション
 */
export function validateEggSearchForm(form: EggSearchFormState): ValidationResult {
  const errors: EggValidationErrorCode[] = [];

  if (!isDateRangeValid(form.dateRange)) {
    errors.push('DATE_RANGE_INVALID');
  }

  if (!isTimeRangeValid(form.timeRange)) {
    errors.push('TIME_RANGE_INVALID');
  }

  errors.push(...validateGenConfig(form.genConfig));

  // 親個体値の範囲チェック
  const maleIvs = Object.values(form.eggParams.parent_male);
  const femaleIvs = Object.values(form.eggParams.parent_female);
  if (!maleIvs.every((v) => isIvValid(v)) || !femaleIvs.every((v) => isIvValid(v))) {
    errors.push('IV_OUT_OF_RANGE');
  }

  return { errors, isValid: errors.length === 0 };
}
