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

/** WASM 側 IV_VALUE_UNKNOWN と一致するセンチネル値 */
export const IV_VALUE_UNKNOWN = 32;

/**
 * 親個体値の範囲チェック (各値 0-31 または 32 = 不明)
 */
function isIvsValid(ivs: readonly number[]): boolean {
  return ivs.every((v) => (v >= 0 && v <= 31) || v === IV_VALUE_UNKNOWN);
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

  if (form.genConfig.user_offset < 0) {
    errors.push('OFFSET_NEGATIVE');
  }

  if (form.genConfig.max_advance < form.genConfig.user_offset) {
    errors.push('ADVANCE_RANGE_INVALID');
  }

  const maleIvs = [
    form.eggParams.parent_male.hp,
    form.eggParams.parent_male.atk,
    form.eggParams.parent_male.def,
    form.eggParams.parent_male.spa,
    form.eggParams.parent_male.spd,
    form.eggParams.parent_male.spe,
  ];
  const femaleIvs = [
    form.eggParams.parent_female.hp,
    form.eggParams.parent_female.atk,
    form.eggParams.parent_female.def,
    form.eggParams.parent_female.spa,
    form.eggParams.parent_female.spd,
    form.eggParams.parent_female.spe,
  ];
  if (!isIvsValid(maleIvs) || !isIvsValid(femaleIvs)) {
    errors.push('IV_OUT_OF_RANGE');
  }

  return { errors, isValid: errors.length === 0 };
}
