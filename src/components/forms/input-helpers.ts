import type React from 'react';

/** 数値入力の blur 時バリデーション。空欄・NaN はデフォルト値、範囲外はクランプ */
function clampOrDefault(
  raw: string,
  options: {
    defaultValue: number;
    min: number;
    max: number;
  }
): number {
  const trimmed = raw.trim();
  if (trimmed === '') return options.defaultValue;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) return options.defaultValue;
  return Math.min(Math.max(Math.round(parsed), options.min), options.max);
}

/** フォーカスイン時のテキスト全選択 */
function handleFocusSelectAll(e: React.FocusEvent<HTMLInputElement>): void {
  e.target.select();
}

export { clampOrDefault, handleFocusSelectAll };
