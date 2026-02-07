import type React from 'react';

/** 数値入力の blur 時バリデーション */
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

/** 16 進数文字列の blur 時バリデーション */
function parseHexByte(raw: string, defaultValue: number = 0): number {
  const trimmed = raw.trim();
  if (trimmed === '') return defaultValue;
  if (!/^[0-9a-fA-F]{1,2}$/.test(trimmed)) return defaultValue;
  return parseInt(trimmed, 16);
}

/** 数値を 16 進数 2 桁文字列に変換 */
function toHexString(value: number): string {
  return value.toString(16).padStart(2, '0').toUpperCase();
}

/** MAC アドレス文字列をパースして 6 バイト配列を返す */
function parseMacAddress(input: string): [number, number, number, number, number, number] | null {
  const cleaned = input.replace(/[-:]/g, '');
  if (!/^[0-9a-fA-F]{12}$/.test(cleaned)) return null;
  return [
    parseInt(cleaned.slice(0, 2), 16),
    parseInt(cleaned.slice(2, 4), 16),
    parseInt(cleaned.slice(4, 6), 16),
    parseInt(cleaned.slice(6, 8), 16),
    parseInt(cleaned.slice(8, 10), 16),
    parseInt(cleaned.slice(10, 12), 16),
  ];
}

export { clampOrDefault, handleFocusSelectAll, parseHexByte, toHexString, parseMacAddress };
