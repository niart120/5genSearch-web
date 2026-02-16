/**
 * IV ツールチップのコンテキスト定義・フォーマット関数
 */

import { IV_STAT_KEYS, getStatLabel } from '@/lib/game-data-names';
import type { RomVersion, Ivs } from '@/wasm/wasm_pkg.js';
import type { SupportedLocale } from '@/i18n';

/** IV ツールチップの表示コンテキスト */
interface IvTooltipContext {
  /** i18n メッセージ ID に対応するキー */
  labelKey: IvTooltipLabelKey;
  /** MT19937 消費数 */
  mtOffset: number;
  /** 徘徊ポケモンの IV 読み取り順を使うか */
  isRoamer: boolean;
}

type IvTooltipLabelKey = 'bw-wild' | 'bw-roamer' | 'bw2-wild' | 'egg';

/** バージョン系統判定 */
function isBw(version: RomVersion): boolean {
  return version === 'Black' || version === 'White';
}

/** 通常機能 (ポケモンリスト/検索) 向けコンテキスト */
function getStandardContexts(version: RomVersion): IvTooltipContext[] {
  if (isBw(version)) {
    return [
      { labelKey: 'bw-wild', mtOffset: 0, isRoamer: false },
      { labelKey: 'bw-roamer', mtOffset: 1, isRoamer: true },
    ];
  }
  return [{ labelKey: 'bw2-wild', mtOffset: 2, isRoamer: false }];
}

/** タマゴ機能向けコンテキスト (通常 + 消費7) */
function getEggContexts(version: RomVersion): IvTooltipContext[] {
  return [...getStandardContexts(version), { labelKey: 'egg', mtOffset: 7, isRoamer: false }];
}

/**
 * IV Spread のラベル付き形式 (i18n 対応)
 *
 * "H:31 A:31 B:31 C:31 D:31 S:31" (ja) / "HP:31 Atk:31 ..." (en) を返す。
 */
function formatIvSpread(ivs: Ivs, locale: SupportedLocale): string {
  return IV_STAT_KEYS.map((key) => `${getStatLabel(key, locale)}:${ivs[key]}`).join(' ');
}

export { getStandardContexts, getEggContexts, formatIvSpread };
export type { IvTooltipContext, IvTooltipLabelKey };
