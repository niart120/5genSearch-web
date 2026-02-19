/**
 * DS の日付範囲パラメータに関するユーティリティ
 */

import type { DateRangeParams } from '@/wasm/wasm_pkg.js';

/**
 * 現在日付の 1 日範囲を返す。
 * DS の年範囲 (2000-2099) 内であることが前提 (2026 年現在、バリデーション上常に有効)。
 */
export function getTodayDateRange(): DateRangeParams {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return {
    start_year: year,
    start_month: month,
    start_day: day,
    end_year: year,
    end_month: month,
    end_day: day,
  };
}
