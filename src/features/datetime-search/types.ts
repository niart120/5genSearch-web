/**
 * MT Seed 起動時刻検索 — 型定義 + バリデーション + パーサー
 */

import type { DateRangeParams, TimeRangeParams, KeySpec, MtSeed } from '../../wasm/wasm_pkg.js';

/** MT Seed 検索フォーム状態 */
export interface MtseedSearchFormState {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
  targetSeedsRaw: string;
}

/** バリデーション結果 */
export interface ValidationResult {
  errors: string[];
  isValid: boolean;
}

/** Target Seeds パースエラー */
export interface ParseError {
  line: number;
  value: string;
  message: string;
}

/** Target Seeds パース結果 */
export interface ParsedTargetSeeds {
  seeds: MtSeed[];
  errors: ParseError[];
}

/**
 * 16 進数文字列を u32 に変換する。
 * `0x` / `0X` プレフィックスは任意。
 */
function parseHexU32(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;

  const hex = trimmed.replace(/^0[xX]/, '');
  if (!/^[\da-fA-F]+$/.test(hex)) return undefined;

  const value = Number.parseInt(hex, 16);
  if (!Number.isFinite(value) || value < 0 || value > 0xff_ff_ff_ff) return undefined;

  return value;
}

/**
 * 改行区切りの 16 進数テキストを MtSeed 配列にパースする
 */
export function parseTargetSeeds(input: string): ParsedTargetSeeds {
  const seeds: MtSeed[] = [];
  const errors: ParseError[] = [];

  const lines = input.split(/\r?\n/);

  for (const [i, line] of lines.entries()) {
    const raw = line.trim();
    if (raw === '') continue;

    const value = parseHexU32(raw);
    if (value === undefined) {
      errors.push({
        line: i + 1,
        value: raw,
        message: 'MT Seed は 0〜FFFFFFFF の 16 進数で指定してください',
      });
    } else {
      seeds.push(value);
    }
  }

  return { seeds, errors };
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
 * MT Seed 検索フォームのバリデーション
 */
export function validateMtseedSearchForm(
  form: MtseedSearchFormState,
  parsedSeeds: ParsedTargetSeeds
): ValidationResult {
  const errors: string[] = [];

  if (!isDateRangeValid(form.dateRange)) {
    errors.push('開始日は終了日以前を指定してください');
  }

  if (!isTimeRangeValid(form.timeRange)) {
    errors.push('時刻の範囲が無効です');
  }

  if (parsedSeeds.seeds.length === 0) {
    errors.push('MT Seed を 1 つ以上入力してください');
  }

  if (parsedSeeds.errors.length > 0) {
    errors.push('MT Seed は 0〜FFFFFFFF の範囲で指定してください');
  }

  return { errors, isValid: errors.length === 0 };
}
