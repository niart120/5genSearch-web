/**
 * エンカウントカテゴリ定義
 *
 * pokemon-params-form.tsx で使用するカテゴリ分類ロジック。
 * エンカウントタイプの表示名は game-data-names.ts に集約。
 */

import type { SupportedLocale } from '@/i18n';
import type { EncounterMethodKey, StaticEncounterTypeKey } from '@/data/encounters/schema';

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------

/** エンカウントタイプのカテゴリ定義 */
export interface EncounterCategory {
  labelKey: string;
  labels: Record<SupportedLocale, string>;
  types: (EncounterMethodKey | StaticEncounterTypeKey)[];
}

export const ENCOUNTER_CATEGORIES: EncounterCategory[] = [
  {
    labelKey: 'wild',
    labels: { ja: '野生', en: 'Wild' },
    types: [
      'Normal',
      'ShakingGrass',
      'DustCloud',
      'PokemonShadow',
      'Surfing',
      'SurfingBubble',
      'Fishing',
      'FishingBubble',
    ],
  },
  {
    labelKey: 'legendary',
    labels: { ja: '伝説・準伝説', en: 'Legendary / Mythical' },
    types: ['StaticSymbol', 'StaticEvent'],
  },
  {
    labelKey: 'roamer',
    labels: { ja: '徘徊', en: 'Roamer' },
    types: ['Roamer'],
  },
  {
    labelKey: 'starter',
    labels: { ja: '御三家', en: 'Starter' },
    types: ['StaticStarter'],
  },
  {
    labelKey: 'fossil',
    labels: { ja: '化石', en: 'Fossil' },
    types: ['StaticFossil'],
  },
  {
    labelKey: 'hidden-grotto',
    labels: { ja: 'かくしあな', en: 'Hidden Grotto' },
    types: ['HiddenGrotto'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 指定された EncounterType が所属するカテゴリの labelKey を返す */
export function findCategoryForType(type: string): string | undefined {
  for (const cat of ENCOUNTER_CATEGORIES) {
    if (cat.types.includes(type as EncounterMethodKey | StaticEncounterTypeKey)) {
      return cat.labelKey;
    }
  }
  return undefined;
}
