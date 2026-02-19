/**
 * datetime-search デフォルト値ユーティリティ
 *
 * WASM 非依存のため unit テストから直接インポート可能。
 */

import { SEED_TEMPLATES } from '@/data/seed-templates';

/**
 * BW 固定・野生 6V テンプレートの Seed 5 件を改行区切り hex 文字列で返す。
 * datetime-search フォームの targetSeedsRaw 初期値として使用する。
 */
export function getDefaultTargetSeeds(): string {
  const bw6v = SEED_TEMPLATES.find((t) => t.id === 'bw-stationary-6v');
  if (!bw6v) return '';
  return bw6v.seeds.map((s) => s.toString(16).padStart(8, '0').toUpperCase()).join('\n');
}
