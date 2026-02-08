/**
 * データ表示用フォーマッタ
 *
 * 表示用のフォーマット関数を集約する。
 * services/progress.ts から移動したフォーマッタを含む。
 */

import type { SupportedLocale } from '@/i18n';
import type { AggregatedProgress } from '@/services/progress';

/**
 * rem 値をピクセル値に変換する。
 * ブラウザの root font-size を参照するため、ユーザーの文字サイズ設定に追従する。
 * @tanstack/react-virtual の estimateSize 等、px を要求する API 向け。
 */
function remToPx(rem: number): number {
  if (typeof document === 'undefined') {
    return rem * 16; // SSR / テスト環境フォールバック
  }
  const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  if (Number.isNaN(rootFontSize) || rootFontSize === 0) {
    return rem * 16; // jsdom 等でフォントサイズが取得できない場合のフォールバック
  }
  return rem * rootFontSize;
}

const pad = (n: number) => n.toString().padStart(2, '0');

/**
 * 経過時間をフォーマットする (mm:ss または hh:mm:ss)
 */
function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * bigint を 16 進数文字列に変換する (大文字、prefix なし)
 */
function toBigintHex(value: bigint, digits: number): string {
  return value.toString(16).toUpperCase().padStart(digits, '0');
}

/**
 * 件数をフォーマットする (例: "1,234 件" / "1,234 results")
 */
function formatResultCount(count: number, locale: SupportedLocale): string {
  const bcp47 = locale === 'ja' ? 'ja-JP' : 'en-US';
  const formatted = new Intl.NumberFormat(bcp47).format(count);
  return locale === 'ja' ? `${formatted} 件` : `${formatted} results`;
}

// --- 以下、services/progress.ts から移動 ---

/**
 * 進捗情報をフォーマット
 * (元: services/progress.ts)
 */
function formatProgress(progress: AggregatedProgress): string {
  const { percentage, throughput, estimatedRemainingMs, tasksCompleted, tasksTotal } = progress;

  const remainingSeconds = Math.ceil(estimatedRemainingMs / 1000);
  const throughputStr =
    throughput >= 1000 ? `${(throughput / 1000).toFixed(1)}K/s` : `${Math.round(throughput)}/s`;

  return `${percentage.toFixed(1)}% | ${throughputStr} | 残り ${remainingSeconds}s | タスク ${tasksCompleted}/${tasksTotal}`;
}

/**
 * 推定残り時間を人間が読みやすい形式にフォーマット
 * (元: services/progress.ts)
 */
function formatRemainingTime(ms: number): string {
  if (ms <= 0) return '0s';

  const seconds = Math.ceil(ms / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * スループットを人間が読みやすい形式にフォーマット
 * (元: services/progress.ts)
 */
function formatThroughput(throughput: number): string {
  if (throughput >= 1_000_000) {
    return `${(throughput / 1_000_000).toFixed(2)}M/s`;
  }
  if (throughput >= 1000) {
    return `${(throughput / 1000).toFixed(1)}K/s`;
  }
  return `${Math.round(throughput)}/s`;
}

export {
  remToPx,
  formatElapsedTime,
  toBigintHex,
  formatResultCount,
  formatProgress,
  formatRemainingTime,
  formatThroughput,
};
