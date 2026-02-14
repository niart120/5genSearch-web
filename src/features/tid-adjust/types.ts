/**
 * ID 調整 — 型定義 + バリデーション + PID パーサー
 */

import type { DateRangeParams, TimeRangeParams, KeySpec, Pid } from '../../wasm/wasm_pkg.js';

/** 16 進数パース用正規表現 — module-level にホイストして毎回の再生成を回避 */
const HEX_PREFIX_RE = /^0[xX]/;
const HEX_DIGITS_RE = /^[\da-fA-F]+$/;

/** バリデーションエラーコード */
export type TidAdjustValidationErrorCode =
  | 'DATE_RANGE_INVALID'
  | 'TIME_RANGE_INVALID'
  | 'TID_OUT_OF_RANGE'
  | 'SID_OUT_OF_RANGE'
  | 'SHINY_PID_INVALID';

/** ID 調整フォーム状態 */
export interface TidAdjustFormState {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
  tid: string;
  sid: string;
  shinyPidRaw: string;
}

/** バリデーション結果 */
export interface TidAdjustValidationResult {
  errors: TidAdjustValidationErrorCode[];
  isValid: boolean;
}

/** PID パース結果 */
export interface ParsedPid {
  pid: Pid | undefined;
  isValid: boolean;
}

/**
 * 16 進数文字列を PID (u32) にパースする。
 * `0x` / `0X` プレフィックスは任意。空文字列は「未指定」として valid 扱い。
 */
export function parseShinyPid(raw: string): ParsedPid {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { pid: undefined, isValid: true };
  }

  const hex = trimmed.replace(HEX_PREFIX_RE, '');
  if (!HEX_DIGITS_RE.test(hex)) {
    return { pid: undefined, isValid: false };
  }

  const value = Number.parseInt(hex, 16);
  if (!Number.isFinite(value) || value < 0 || value > 0xff_ff_ff_ff) {
    return { pid: undefined, isValid: false };
  }

  return { pid: value as Pid, isValid: true };
}

/**
 * ID 文字列を数値にパースする (0–65535)。
 * 空文字列は「未指定」として `undefined` を返す。
 * 範囲外は `NaN` を返す (バリデーションで検出)。
 */
function parseIdField(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const value = Number(trimmed);
  if (!Number.isInteger(value)) return Number.NaN;
  return value;
}

/**
 * 日付範囲の妥当性チェック (start ≤ end)
 */
function isDateRangeValid(range: DateRangeParams): boolean {
  const start = range.start_year * 10_000 + range.start_month * 100 + range.start_day;
  const end = range.end_year * 10_000 + range.end_month * 100 + range.end_day;
  return start <= end;
}

/**
 * 時刻範囲の妥当性チェック
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
 * ID 調整フォームのバリデーション
 */
export function validateTidAdjustForm(form: TidAdjustFormState): TidAdjustValidationResult {
  const errors: TidAdjustValidationErrorCode[] = [];

  if (!isDateRangeValid(form.dateRange)) {
    errors.push('DATE_RANGE_INVALID');
  }

  if (!isTimeRangeValid(form.timeRange)) {
    errors.push('TIME_RANGE_INVALID');
  }

  const tid = parseIdField(form.tid);
  if (tid !== undefined && (Number.isNaN(tid) || tid < 0 || tid > 65_535)) {
    errors.push('TID_OUT_OF_RANGE');
  }

  const sid = parseIdField(form.sid);
  if (sid !== undefined && (Number.isNaN(sid) || sid < 0 || sid > 65_535)) {
    errors.push('SID_OUT_OF_RANGE');
  }

  const parsed = parseShinyPid(form.shinyPidRaw);
  if (!parsed.isValid) {
    errors.push('SHINY_PID_INVALID');
  }

  return { errors, isValid: errors.length === 0 };
}

/**
 * フォーム状態から TrainerInfoFilter を構築する
 */
export function toTrainerInfoFilter(form: TidAdjustFormState) {
  const tid = parseIdField(form.tid);
  const sid = parseIdField(form.sid);
  const parsed = parseShinyPid(form.shinyPidRaw);

  return {
    tid: tid !== undefined && !Number.isNaN(tid) ? tid : undefined,
    sid: sid !== undefined && !Number.isNaN(sid) ? sid : undefined,
    shiny_pid: parsed.pid,
  };
}
