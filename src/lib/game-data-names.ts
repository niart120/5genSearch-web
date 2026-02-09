import type {
  Nature,
  HiddenPowerType,
  RomVersion,
  RomRegion,
  Hardware,
  StartMode,
  SaveState,
} from '@/wasm/wasm_pkg';
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

// ---------------------------------------------------------------------------
// ROM Version
// ---------------------------------------------------------------------------

const VERSION_ORDER: RomVersion[] = ['Black', 'White', 'Black2', 'White2'];

const VERSION_NAMES: Record<RomVersion, Record<SupportedLocale, string>> = {
  Black: { ja: 'ブラック', en: 'Black' },
  White: { ja: 'ホワイト', en: 'White' },
  Black2: { ja: 'ブラック2', en: 'Black 2' },
  White2: { ja: 'ホワイト2', en: 'White 2' },
};

function getVersionName(version: RomVersion, locale: SupportedLocale): string {
  return VERSION_NAMES[version][locale];
}

// ---------------------------------------------------------------------------
// ROM Region
// ---------------------------------------------------------------------------

const REGION_ORDER: RomRegion[] = ['Jpn', 'Kor', 'Usa', 'Ger', 'Fra', 'Spa', 'Ita'];

const REGION_NAMES: Record<RomRegion, Record<SupportedLocale, string>> = {
  Jpn: { ja: '日本', en: 'Japan' },
  Kor: { ja: '韓国', en: 'Korea' },
  Usa: { ja: '北米', en: 'USA' },
  Ger: { ja: 'ドイツ', en: 'Germany' },
  Fra: { ja: 'フランス', en: 'France' },
  Spa: { ja: 'スペイン', en: 'Spain' },
  Ita: { ja: 'イタリア', en: 'Italy' },
};

function getRegionName(region: RomRegion, locale: SupportedLocale): string {
  return REGION_NAMES[region][locale];
}

// ---------------------------------------------------------------------------
// Hardware
// ---------------------------------------------------------------------------

const HARDWARE_ORDER: Hardware[] = ['Ds', 'DsLite', 'Dsi', 'Dsi3ds'];

const HARDWARE_NAMES: Record<Hardware, Record<SupportedLocale, string>> = {
  Ds: { ja: 'DS', en: 'DS' },
  DsLite: { ja: 'DS Lite', en: 'DS Lite' },
  Dsi: { ja: 'DSi', en: 'DSi' },
  Dsi3ds: { ja: '3DS', en: '3DS' },
};

function getHardwareName(hardware: Hardware, locale: SupportedLocale): string {
  return HARDWARE_NAMES[hardware][locale];
}

// ---------------------------------------------------------------------------
// StartMode
// ---------------------------------------------------------------------------

const START_MODE_ORDER: StartMode[] = ['Continue', 'NewGame'];

const START_MODE_NAMES: Record<StartMode, Record<SupportedLocale, string>> = {
  Continue: { ja: 'つづきから', en: 'Continue' },
  NewGame: { ja: 'はじめから', en: 'New game' },
};

function getStartModeName(mode: StartMode, locale: SupportedLocale): string {
  return START_MODE_NAMES[mode][locale];
}

// ---------------------------------------------------------------------------
// SaveState
// ---------------------------------------------------------------------------

const SAVE_STATE_ORDER: SaveState[] = ['NoSave', 'WithSave', 'WithMemoryLink'];

const SAVE_STATE_NAMES: Record<SaveState, Record<SupportedLocale, string>> = {
  NoSave: { ja: 'セーブなし', en: 'No save' },
  WithSave: { ja: 'セーブあり', en: 'With save' },
  WithMemoryLink: { ja: '思い出リンクあり', en: 'With Memory Link' },
};

function getSaveStateName(state: SaveState, locale: SupportedLocale): string {
  return SAVE_STATE_NAMES[state][locale];
}

export type { IvStatKey };
export {
  IV_STAT_KEYS,
  getStatLabel,
  NATURE_ORDER,
  getNatureName,
  HIDDEN_POWER_ORDER,
  getHiddenPowerName,
  VERSION_ORDER,
  getVersionName,
  REGION_ORDER,
  getRegionName,
  HARDWARE_ORDER,
  getHardwareName,
  START_MODE_ORDER,
  getStartModeName,
  SAVE_STATE_ORDER,
  getSaveStateName,
};
