import type { Nature, HiddenPowerType } from '@/wasm/wasm_pkg';
import type { SupportedLocale } from '@/i18n';

type IvStatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';

const IV_STAT_KEYS: IvStatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

const STAT_LABELS: Record<IvStatKey, Record<SupportedLocale, string>> = {
  hp: { ja: 'H', en: 'HP' },
  atk: { ja: 'A', en: 'Atk' },
  def: { ja: 'B', en: 'Def' },
  spa: { ja: 'C', en: 'SpA' },
  spd: { ja: 'D', en: 'SpD' },
  spe: { ja: 'S', en: 'Spe' },
};

function getStatLabel(stat: IvStatKey, locale: SupportedLocale): string {
  return STAT_LABELS[stat][locale];
}

const NATURE_ORDER: Nature[] = [
  'Hardy',
  'Lonely',
  'Brave',
  'Adamant',
  'Naughty',
  'Bold',
  'Docile',
  'Relaxed',
  'Impish',
  'Lax',
  'Timid',
  'Hasty',
  'Serious',
  'Jolly',
  'Naive',
  'Modest',
  'Mild',
  'Quiet',
  'Bashful',
  'Rash',
  'Calm',
  'Gentle',
  'Sassy',
  'Careful',
  'Quirky',
];

const NATURE_NAMES_JA: Record<Nature, string> = {
  Hardy: 'がんばりや',
  Lonely: 'さみしがり',
  Brave: 'ゆうかん',
  Adamant: 'いじっぱり',
  Naughty: 'やんちゃ',
  Bold: 'ずぶとい',
  Docile: 'すなお',
  Relaxed: 'のんき',
  Impish: 'わんぱく',
  Lax: 'のうてんき',
  Timid: 'おくびょう',
  Hasty: 'せっかち',
  Serious: 'まじめ',
  Jolly: 'ようき',
  Naive: 'むじゃき',
  Modest: 'ひかえめ',
  Mild: 'おっとり',
  Quiet: 'れいせい',
  Bashful: 'てれや',
  Rash: 'うっかりや',
  Calm: 'おだやか',
  Gentle: 'おとなしい',
  Sassy: 'なまいき',
  Careful: 'しんちょう',
  Quirky: 'きまぐれ',
};

const NATURE_NAMES_EN: Record<Nature, string> = {
  Hardy: 'Hardy',
  Lonely: 'Lonely',
  Brave: 'Brave',
  Adamant: 'Adamant',
  Naughty: 'Naughty',
  Bold: 'Bold',
  Docile: 'Docile',
  Relaxed: 'Relaxed',
  Impish: 'Impish',
  Lax: 'Lax',
  Timid: 'Timid',
  Hasty: 'Hasty',
  Serious: 'Serious',
  Jolly: 'Jolly',
  Naive: 'Naive',
  Modest: 'Modest',
  Mild: 'Mild',
  Quiet: 'Quiet',
  Bashful: 'Bashful',
  Rash: 'Rash',
  Calm: 'Calm',
  Gentle: 'Gentle',
  Sassy: 'Sassy',
  Careful: 'Careful',
  Quirky: 'Quirky',
};

function getNatureName(nature: Nature, locale: SupportedLocale): string {
  return locale === 'ja' ? NATURE_NAMES_JA[nature] : NATURE_NAMES_EN[nature];
}

const HIDDEN_POWER_ORDER: HiddenPowerType[] = [
  'Fighting',
  'Flying',
  'Poison',
  'Ground',
  'Rock',
  'Bug',
  'Ghost',
  'Steel',
  'Fire',
  'Water',
  'Grass',
  'Electric',
  'Psychic',
  'Ice',
  'Dragon',
  'Dark',
];

const HIDDEN_POWER_NAMES_JA: Record<HiddenPowerType, string> = {
  Fighting: 'かくとう',
  Flying: 'ひこう',
  Poison: 'どく',
  Ground: 'じめん',
  Rock: 'いわ',
  Bug: 'むし',
  Ghost: 'ゴースト',
  Steel: 'はがね',
  Fire: 'ほのお',
  Water: 'みず',
  Grass: 'くさ',
  Electric: 'でんき',
  Psychic: 'エスパー',
  Ice: 'こおり',
  Dragon: 'ドラゴン',
  Dark: 'あく',
};

const HIDDEN_POWER_NAMES_EN: Record<HiddenPowerType, string> = {
  Fighting: 'Fighting',
  Flying: 'Flying',
  Poison: 'Poison',
  Ground: 'Ground',
  Rock: 'Rock',
  Bug: 'Bug',
  Ghost: 'Ghost',
  Steel: 'Steel',
  Fire: 'Fire',
  Water: 'Water',
  Grass: 'Grass',
  Electric: 'Electric',
  Psychic: 'Psychic',
  Ice: 'Ice',
  Dragon: 'Dragon',
  Dark: 'Dark',
};

function getHiddenPowerName(type: HiddenPowerType, locale: SupportedLocale): string {
  return locale === 'ja' ? HIDDEN_POWER_NAMES_JA[type] : HIDDEN_POWER_NAMES_EN[type];
}

export type { IvStatKey };
export {
  IV_STAT_KEYS,
  getStatLabel,
  NATURE_ORDER,
  getNatureName,
  HIDDEN_POWER_ORDER,
  getHiddenPowerName,
};
