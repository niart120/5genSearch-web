/**
 * 針読み (Needle Search) — 型定義 + バリデーション + パターンパーサー
 */

import type { NeedleDirection } from '../../wasm/wasm_pkg.js';

/** Seed 入力モード */
export type SeedMode = 'datetime' | 'seed';

/** バリデーションエラーコード */
export type NeedleValidationErrorCode =
  | 'SEED_EMPTY'
  | 'PATTERN_EMPTY'
  | 'PATTERN_INVALID'
  | 'ADVANCE_RANGE_INVALID'
  | 'OFFSET_NEGATIVE';

/** 針読みフォーム状態 */
export interface NeedleFormState {
  seedMode: SeedMode;
  seedOrigin: unknown;
  patternRaw: string;
  userOffset: number;
  maxAdvance: number;
  autoSearch: boolean;
}

/** バリデーション結果 */
export interface NeedleValidationResult {
  errors: NeedleValidationErrorCode[];
  isValid: boolean;
}

/** 方向名 → NeedleDirection マップ (index 0-7) */
const DIRECTION_NAMES: readonly NeedleDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** 数字列パターン判定 (0-7 のみで構成) */
const NEEDLE_DIGIT_RE = /^[0-7]+$/;

/**
 * 数字列 → NeedleDirection[] にパース
 *
 * 入力形式: `"24267"` → 各桁を 0-7 として解釈
 *
 * @returns パース成功時は NeedleDirection[]、失敗時は undefined
 */
export function parseNeedlePattern(input: string): NeedleDirection[] | undefined {
  const trimmed = input.trim();
  if (trimmed.length === 0) return undefined;
  if (!NEEDLE_DIGIT_RE.test(trimmed)) return undefined;
  return [...trimmed].map((ch) => DIRECTION_NAMES[Number(ch)]);
}

/** NeedleDirection → 矢印マップ */
const ARROW_MAP: Record<NeedleDirection, string> = {
  N: '↑',
  NE: '↗',
  E: '→',
  SE: '↘',
  S: '↓',
  SW: '↙',
  W: '←',
  NW: '↖',
};

/**
 * NeedleDirection[] → カンマ区切り矢印表示文字列に変換
 *
 * read-only 欄の表示用。例: `['E', 'S', 'E']` → `"→,↓,→"`
 */
export function directionsToArrows(dirs: NeedleDirection[]): string {
  return dirs.map((d) => ARROW_MAP[d]).join(',');
}

/**
 * バリデーション
 */
export function validateNeedleForm(
  form: Pick<NeedleFormState, 'seedOrigin' | 'patternRaw' | 'userOffset' | 'maxAdvance'>
): NeedleValidationResult {
  const errors: NeedleValidationErrorCode[] = [];

  if (form.seedOrigin === undefined) {
    errors.push('SEED_EMPTY');
  }

  const parsed = parseNeedlePattern(form.patternRaw);
  if (form.patternRaw.trim().length === 0) {
    errors.push('PATTERN_EMPTY');
  } else if (!parsed) {
    errors.push('PATTERN_INVALID');
  }

  if (form.userOffset < 0) {
    errors.push('OFFSET_NEGATIVE');
  }
  if (form.maxAdvance < form.userOffset) {
    errors.push('ADVANCE_RANGE_INVALID');
  }

  return { errors, isValid: errors.length === 0 };
}
