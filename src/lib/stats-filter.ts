/**
 * ステータスフィルタ共通ユーティリティ
 *
 * 実ステータス固定値によるクライアントサイド post-filter。
 */

import type { StatsFixedValues } from '@/components/forms/stats-fixed-input';

/**
 * 実ステータス固定値フィルタを適用する
 *
 * UiPokemonData / UiEggData の stats 配列に対して、StatsFixedValues の条件でフィルタする。
 * stats が "?" の場合は通過させる (種族ID 未指定時の挙動)。
 *
 * @param results - フィルタ対象の結果配列 (stats: string[] を持つオブジェクト)
 * @param filter - StatsFixedValues (undefined の場合はフィルタなし)
 * @returns フィルタ後の結果配列
 */
export function filterByStats<T extends { stats: string[] }>(
  results: T[],
  filter: StatsFixedValues | undefined
): T[] {
  if (!filter) return results;

  const keys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
  return results.filter((r) =>
    keys.every((key, i) => {
      const expected = filter[key];
      if (expected === undefined) return true; // 未指定は任意の値にマッチ
      const v = Number(r.stats[i]);
      if (Number.isNaN(v)) return true; // '?' は通過
      return v === expected;
    })
  );
}
