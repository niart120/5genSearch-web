/**
 * フォーマッタのユニットテスト
 */

import { describe, it, expect } from 'vitest';
import {
  formatElapsedTime,
  formatRemainingTime,
  formatThroughput,
  formatProgress,
  toBigintHex,
  formatResultCount,
  remToPx,
} from '@/lib/format';

describe('formatElapsedTime', () => {
  it('0ms を "00:00" に変換する', () => {
    expect(formatElapsedTime(0)).toBe('00:00');
  });

  it('61000ms を "01:01" に変換する', () => {
    expect(formatElapsedTime(61_000)).toBe('01:01');
  });

  it('3661000ms を "01:01:01" に変換する', () => {
    expect(formatElapsedTime(3_661_000)).toBe('01:01:01');
  });

  it('59999ms を "00:59" に変換する', () => {
    expect(formatElapsedTime(59_999)).toBe('00:59');
  });

  it('3600000ms を "01:00:00" に変換する', () => {
    expect(formatElapsedTime(3_600_000)).toBe('01:00:00');
  });
});

describe('formatRemainingTime', () => {
  it('should format seconds', () => {
    expect(formatRemainingTime(30_000)).toBe('30s');
  });

  it('should format minutes and seconds', () => {
    expect(formatRemainingTime(90_000)).toBe('1m 30s');
  });

  it('should format hours and minutes', () => {
    expect(formatRemainingTime(3_700_000)).toBe('1h 1m');
  });

  it('should handle zero', () => {
    expect(formatRemainingTime(0)).toBe('0s');
  });

  it('should handle negative values', () => {
    expect(formatRemainingTime(-1000)).toBe('0s');
  });
});

describe('formatThroughput', () => {
  it('should format small values', () => {
    expect(formatThroughput(500)).toBe('500/s');
  });

  it('should format thousands', () => {
    expect(formatThroughput(5000)).toBe('5.0K/s');
  });

  it('should format millions', () => {
    expect(formatThroughput(2_500_000)).toBe('2.50M/s');
  });
});

describe('formatProgress', () => {
  it('should format progress string correctly', () => {
    const progress = {
      totalProcessed: 5000,
      totalCount: 10_000,
      percentage: 50,
      elapsedMs: 1000,
      estimatedRemainingMs: 1000,
      throughput: 5000,
      tasksCompleted: 1,
      tasksTotal: 2,
    };

    const formatted = formatProgress(progress);

    expect(formatted).toContain('50.0%');
    expect(formatted).toContain('5.0K/s');
    expect(formatted).toContain('1s');
    expect(formatted).toContain('1/2');
  });
});

describe('toBigintHex', () => {
  it('16 桁パディングで変換する', () => {
    expect(toBigintHex(0n, 16)).toBe('0000000000000000');
  });

  it('bigint を大文字 hex に変換する', () => {
    expect(toBigintHex(0x1a_2b_3c_4d_5e_6f_78_90n, 16)).toBe('1A2B3C4D5E6F7890');
  });

  it('指定桁数未満の値をパディングする', () => {
    expect(toBigintHex(255n, 4)).toBe('00FF');
  });
});

describe('formatResultCount', () => {
  it('日本語ロケールで件数をフォーマットする', () => {
    expect(formatResultCount(1234, 'ja')).toBe('1,234 件');
  });

  it('英語ロケールで件数をフォーマットする', () => {
    expect(formatResultCount(1234, 'en')).toBe('1,234 results');
  });

  it('0 件を正しくフォーマットする', () => {
    expect(formatResultCount(0, 'ja')).toBe('0 件');
    expect(formatResultCount(0, 'en')).toBe('0 results');
  });
});

describe('remToPx', () => {
  it('テスト環境 (document なし相当) では 16px ベースで計算する', () => {
    // jsdom 環境では getComputedStyle のフォールバックが動作する
    // デフォルト font-size は 16px
    const result = remToPx(2);
    expect(result).toBeGreaterThan(0);
    expect(typeof result).toBe('number');
  });
});
