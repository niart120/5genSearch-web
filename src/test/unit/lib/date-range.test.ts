/**
 * getTodayDateRange ユニットテスト
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { getTodayDateRange } from '@/lib/date-range';

describe('getTodayDateRange', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('返却値が現在日付と一致する', () => {
    const fixed = new Date(2026, 1, 19); // 2026-02-19
    vi.setSystemTime(fixed);

    const result = getTodayDateRange();

    expect(result.start_year).toBe(2026);
    expect(result.start_month).toBe(2);
    expect(result.start_day).toBe(19);
    expect(result.end_year).toBe(2026);
    expect(result.end_month).toBe(2);
    expect(result.end_day).toBe(19);
  });

  it('start と end が同一日付になる', () => {
    vi.setSystemTime(new Date(2033, 11, 31)); // 2033-12-31

    const result = getTodayDateRange();

    expect(result.start_year).toBe(result.end_year);
    expect(result.start_month).toBe(result.end_month);
    expect(result.start_day).toBe(result.end_day);
  });
});
