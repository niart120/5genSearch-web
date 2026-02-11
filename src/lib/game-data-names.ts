import type {
  Nature,
  HiddenPowerType,
  RomVersion,
  RomRegion,
  Hardware,
  StartMode,
  SavePresence,
  MemoryLinkState,
  ShinyCharmState,
  AbilitySlot,
  GenderRatio,
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
// SavePresence
// ---------------------------------------------------------------------------

const SAVE_PRESENCE_ORDER: SavePresence[] = ['NoSave', 'WithSave'];

const SAVE_PRESENCE_NAMES: Record<SavePresence, Record<SupportedLocale, string>> = {
  NoSave: { ja: 'セーブなし', en: 'No save' },
  WithSave: { ja: 'セーブあり', en: 'With save' },
};

function getSavePresenceName(state: SavePresence, locale: SupportedLocale): string {
  return SAVE_PRESENCE_NAMES[state][locale];
}

// ---------------------------------------------------------------------------
// MemoryLinkState
// ---------------------------------------------------------------------------

const MEMORY_LINK_STATE_ORDER: MemoryLinkState[] = ['Disabled', 'Enabled'];

const MEMORY_LINK_STATE_NAMES: Record<MemoryLinkState, Record<SupportedLocale, string>> = {
  Disabled: { ja: '思い出リンクなし', en: 'Without Memory Link' },
  Enabled: { ja: '思い出リンクあり', en: 'With Memory Link' },
};

function getMemoryLinkStateName(state: MemoryLinkState, locale: SupportedLocale): string {
  return MEMORY_LINK_STATE_NAMES[state][locale];
}

// ---------------------------------------------------------------------------
// ShinyCharmState
// ---------------------------------------------------------------------------

const SHINY_CHARM_STATE_ORDER: ShinyCharmState[] = ['NotObtained', 'Obtained'];

const SHINY_CHARM_STATE_NAMES: Record<ShinyCharmState, Record<SupportedLocale, string>> = {
  NotObtained: { ja: '未所持', en: 'Not obtained' },
  Obtained: { ja: '所持', en: 'Obtained' },
};

function getShinyCharmStateName(state: ShinyCharmState, locale: SupportedLocale): string {
  return SHINY_CHARM_STATE_NAMES[state][locale];
}

// ---------------------------------------------------------------------------
// AbilitySlot
// ---------------------------------------------------------------------------

const ABILITY_SLOT_ORDER: AbilitySlot[] = ['First', 'Second', 'Hidden'];

const ABILITY_SLOT_NAMES: Record<AbilitySlot, Record<SupportedLocale, string>> = {
  First: { ja: '特性1', en: 'Ability 1' },
  Second: { ja: '特性2', en: 'Ability 2' },
  Hidden: { ja: '隠れ特性', en: 'Hidden Ability' },
};

function getAbilitySlotName(slot: AbilitySlot, locale: SupportedLocale): string {
  return ABILITY_SLOT_NAMES[slot][locale];
}

// ---------------------------------------------------------------------------
// GenderRatio
// ---------------------------------------------------------------------------

const GENDER_RATIO_ORDER: GenderRatio[] = [
  'F1M1',
  'F1M3',
  'F3M1',
  'F1M7',
  'MaleOnly',
  'FemaleOnly',
  'Genderless',
];

const GENDER_RATIO_NAMES: Record<GenderRatio, Record<SupportedLocale, string>> = {
  Genderless: { ja: '性別不明', en: 'Genderless' },
  MaleOnly: { ja: '♂のみ', en: 'Male only' },
  FemaleOnly: { ja: '♀のみ', en: 'Female only' },
  F1M7: { ja: '♀1:♂7', en: '♀1:♂7' },
  F1M3: { ja: '♀1:♂3', en: '♀1:♂3' },
  F1M1: { ja: '♀1:♂1', en: '♀1:♂1' },
  F3M1: { ja: '♀3:♂1', en: '♀3:♂1' },
};

function getGenderRatioName(ratio: GenderRatio, locale: SupportedLocale): string {
  return GENDER_RATIO_NAMES[ratio][locale];
}

// ---------------------------------------------------------------------------
// Encounter Method (scraper method keys)
// ---------------------------------------------------------------------------

const ENCOUNTER_METHOD_NAMES: Record<string, Record<SupportedLocale, string>> = {
  Normal: { ja: '草むら・洞窟', en: 'Grass / Cave' },
  ShakingGrass: { ja: '揺れる草むら', en: 'Shaking Grass' },
  DustCloud: { ja: '土煙', en: 'Dust Cloud' },
  Surfing: { ja: 'なみのり', en: 'Surf' },
  SurfingBubble: { ja: 'なみのり(泡)', en: 'Rippling Surf' },
  Fishing: { ja: 'つり', en: 'Fishing' },
  FishingBubble: { ja: 'つり(泡)', en: 'Rippling Fishing' },
};

function getEncounterMethodName(method: string, locale: SupportedLocale): string {
  return ENCOUNTER_METHOD_NAMES[method]?.[locale] ?? method;
}

// ---------------------------------------------------------------------------
// Encounter Location (normalized displayNameKey -> localized name)
// ---------------------------------------------------------------------------

const ENCOUNTER_LOCATION_NAMES: Record<string, Record<SupportedLocale, string>> = {
  '1番道路': { ja: '1番道路', en: 'Route 1' },
  '2番道路': { ja: '2番道路', en: 'Route 2' },
  '3番道路': { ja: '3番道路', en: 'Route 3' },
  '4番道路': { ja: '4番道路', en: 'Route 4' },
  '5番道路': { ja: '5番道路', en: 'Route 5' },
  '6番道路(春)': { ja: '6番道路(春)', en: 'Route 6 (Spring)' },
  '6番道路(夏)': { ja: '6番道路(夏)', en: 'Route 6 (Summer)' },
  '6番道路(秋)': { ja: '6番道路(秋)', en: 'Route 6 (Autumn)' },
  '6番道路(冬)': { ja: '6番道路(冬)', en: 'Route 6 (Winter)' },
  '7番道路(春)': { ja: '7番道路(春)', en: 'Route 7 (Spring)' },
  '7番道路(夏)': { ja: '7番道路(夏)', en: 'Route 7 (Summer)' },
  '7番道路(秋)': { ja: '7番道路(秋)', en: 'Route 7 (Autumn)' },
  '7番道路(冬)': { ja: '7番道路(冬)', en: 'Route 7 (Winter)' },
  '8番道路(春)': { ja: '8番道路(春)', en: 'Route 8 (Spring)' },
  '8番道路(夏)': { ja: '8番道路(夏)', en: 'Route 8 (Summer)' },
  '8番道路(秋)': { ja: '8番道路(秋)', en: 'Route 8 (Autumn)' },
  '8番道路(冬)': { ja: '8番道路(冬)', en: 'Route 8 (Winter)' },
  '9番道路': { ja: '9番道路', en: 'Route 9' },
  '10番道路': { ja: '10番道路', en: 'Route 10' },
  '11番道路': { ja: '11番道路', en: 'Route 11' },
  '12番道路': { ja: '12番道路', en: 'Route 12' },
  '13番道路': { ja: '13番道路', en: 'Route 13' },
  '14番道路': { ja: '14番道路', en: 'Route 14' },
  '15番道路': { ja: '15番道路', en: 'Route 15' },
  '16番道路': { ja: '16番道路', en: 'Route 16' },
  '17番水道': { ja: '17番水道', en: 'Route 17' },
  '18番道路': { ja: '18番道路', en: 'Route 18' },
  '19番道路': { ja: '19番道路', en: 'Route 19' },
  '20番道路(春)': { ja: '20番道路(春)', en: 'Route 20 (Spring)' },
  '20番道路(夏)': { ja: '20番道路(夏)', en: 'Route 20 (Summer)' },
  '20番道路(秋)': { ja: '20番道路(秋)', en: 'Route 20 (Autumn)' },
  '20番道路(冬)': { ja: '20番道路(冬)', en: 'Route 20 (Winter)' },
  '21番水道': { ja: '21番水道', en: 'Route 21' },
  '22番道路': { ja: '22番道路', en: 'Route 22' },
  '23番道路': { ja: '23番道路', en: 'Route 23' },
  P2ラボ: { ja: 'P2ラボ', en: 'P2 Laboratory' },
  サザナミタウン: { ja: 'サザナミタウン', en: 'Undella Town' },
  'サザナミ湾(春)': { ja: 'サザナミ湾(春)', en: 'Undella Bay (Spring)' },
  'サザナミ湾(夏)': { ja: 'サザナミ湾(夏)', en: 'Undella Bay (Summer)' },
  'サザナミ湾(秋)': { ja: 'サザナミ湾(秋)', en: 'Undella Bay (Autumn)' },
  'サザナミ湾(冬)': { ja: 'サザナミ湾(冬)', en: 'Undella Bay (Winter)' },
  サンギ牧場: { ja: 'サンギ牧場', en: 'Floccesy Ranch' },
  サンヨウシティ: { ja: 'サンヨウシティ', en: 'Striaton City' },
  ジャイアントホール: { ja: 'ジャイアントホール', en: 'Giant Chasm' },
  'ストレンジャーハウス入口,B1F': {
    ja: 'ストレンジャーハウス 入口, B1F',
    en: 'Strange House Entrance, B1F',
  },
  ストレンジャーハウス小部屋: { ja: 'ストレンジャーハウス 小部屋', en: 'Strange House Small Room' },
  セイガイハシティ: { ja: 'セイガイハシティ', en: 'Humilau City' },
  'セッカシティ(春)': { ja: 'セッカシティ(春)', en: 'Icirrus City (Spring)' },
  'セッカシティ(夏)': { ja: 'セッカシティ(夏)', en: 'Icirrus City (Summer)' },
  'セッカシティ(秋)': { ja: 'セッカシティ(秋)', en: 'Icirrus City (Autumn)' },
  'セッカシティ(冬)': { ja: 'セッカシティ(冬)', en: 'Icirrus City (Winter)' },
  'セッカの湿原(春)': { ja: 'セッカの湿原(春)', en: 'Moor of Icirrus (Spring)' },
  'セッカの湿原(夏)': { ja: 'セッカの湿原(夏)', en: 'Moor of Icirrus (Summer)' },
  'セッカの湿原(秋)': { ja: 'セッカの湿原(秋)', en: 'Moor of Icirrus (Autumn)' },
  'セッカの湿原(冬)': { ja: 'セッカの湿原(冬)', en: 'Moor of Icirrus (Winter)' },
  タチワキコンビナート: { ja: 'タチワキコンビナート', en: 'Virbank Complex' },
  タチワキシティ: { ja: 'タチワキシティ', en: 'Virbank City' },
  タワーオブヘブン: { ja: 'タワーオブヘブン', en: 'Celestial Tower' },
  タワーオブヘブン2F: { ja: 'タワーオブヘブン 2F', en: 'Celestial Tower 2F' },
  タワーオブヘブン3F: { ja: 'タワーオブヘブン 3F', en: 'Celestial Tower 3F' },
  タワーオブヘブン4F: { ja: 'タワーオブヘブン 4F', en: 'Celestial Tower 4F' },
  タワーオブヘブン5F: { ja: 'タワーオブヘブン 5F', en: 'Celestial Tower 5F' },
  チャンピオンロード: { ja: 'チャンピオンロード', en: 'Victory Road' },
  チャンピオンロード1F: { ja: 'チャンピオンロード 1F', en: 'Victory Road 1F' },
  チャンピオンロード2F: { ja: 'チャンピオンロード 2F', en: 'Victory Road 2F' },
  'チャンピオンロード3F,4F,5F': {
    ja: 'チャンピオンロード 3F, 4F, 5F',
    en: 'Victory Road 3F, 4F, 5F',
  },
  'チャンピオンロード6F,7F': { ja: 'チャンピオンロード 6F, 7F', en: 'Victory Road 6F, 7F' },
  'ネジ山(春)': { ja: 'ネジ山(春)', en: 'Twist Mountain (Spring)' },
  'ネジ山(夏)': { ja: 'ネジ山(夏)', en: 'Twist Mountain (Summer)' },
  'ネジ山(秋)': { ja: 'ネジ山(秋)', en: 'Twist Mountain (Autumn)' },
  'ネジ山(冬)': { ja: 'ネジ山(冬)', en: 'Twist Mountain (Winter)' },
  ヒウンシティ: { ja: 'ヒウンシティ', en: 'Castelia City' },
  ヒウン下水道: { ja: 'ヒウン下水道', en: 'Castelia Sewers' },
  ヒオウギシティ: { ja: 'ヒオウギシティ', en: 'Aspertia City' },
  ビレッジブリッジ: { ja: 'ビレッジブリッジ', en: 'Village Bridge' },
  フキヨセの洞穴: { ja: 'フキヨセの洞穴', en: 'Mistralton Cave' },
  ほうじょうの社: { ja: 'ほうじょうの社', en: 'Abundant Shrine' },
  ホドモエシティ: { ja: 'ホドモエシティ', en: 'Driftveil City' },
  ホドモエの跳ね橋: { ja: 'ホドモエの跳ね橋', en: 'Driftveil Drawbridge' },
  ヤーコンロード: { ja: 'ヤーコンロード', en: 'Clay Tunnel' },
  ヤグルマの森: { ja: 'ヤグルマの森', en: 'Pinwheel Forest' },
  ヤグルマの森外部: { ja: 'ヤグルマの森 外部', en: 'Pinwheel Forest Exterior' },
  ヤグルマの森内部: { ja: 'ヤグルマの森 内部', en: 'Pinwheel Forest Interior' },
  リゾートデザート外部: { ja: 'リゾートデザート 外部', en: 'Desert Resort Exterior' },
  リゾートデザート内部: { ja: 'リゾートデザート 内部', en: 'Desert Resort Interior' },
  リバースマウンテン: { ja: 'リバースマウンテン', en: 'Reversal Mountain' },
  'リュウラセンの塔(春)': { ja: 'リュウラセンの塔(春)', en: 'Dragonspiral Tower (Spring)' },
  'リュウラセンの塔(春)外部(南)': {
    ja: 'リュウラセンの塔(春) 外部(南)',
    en: 'Dragonspiral Tower (Spring) Exterior South',
  },
  'リュウラセンの塔(春)外部(北東)': {
    ja: 'リュウラセンの塔(春) 外部(北東)',
    en: 'Dragonspiral Tower (Spring) Exterior Northeast',
  },
  'リュウラセンの塔(夏)': { ja: 'リュウラセンの塔(夏)', en: 'Dragonspiral Tower (Summer)' },
  'リュウラセンの塔(夏)外部(南)': {
    ja: 'リュウラセンの塔(夏) 外部(南)',
    en: 'Dragonspiral Tower (Summer) Exterior South',
  },
  'リュウラセンの塔(夏)外部(北東)': {
    ja: 'リュウラセンの塔(夏) 外部(北東)',
    en: 'Dragonspiral Tower (Summer) Exterior Northeast',
  },
  'リュウラセンの塔(秋)': { ja: 'リュウラセンの塔(秋)', en: 'Dragonspiral Tower (Autumn)' },
  'リュウラセンの塔(秋)外部(南)': {
    ja: 'リュウラセンの塔(秋) 外部(南)',
    en: 'Dragonspiral Tower (Autumn) Exterior South',
  },
  'リュウラセンの塔(秋)外部(北東)': {
    ja: 'リュウラセンの塔(秋) 外部(北東)',
    en: 'Dragonspiral Tower (Autumn) Exterior Northeast',
  },
  'リュウラセンの塔(冬)': { ja: 'リュウラセンの塔(冬)', en: 'Dragonspiral Tower (Winter)' },
  'リュウラセンの塔(冬)外部(南)': {
    ja: 'リュウラセンの塔(冬) 外部(南)',
    en: 'Dragonspiral Tower (Winter) Exterior South',
  },
  'リュウラセンの塔(冬)外部(北東)': {
    ja: 'リュウラセンの塔(冬) 外部(北東)',
    en: 'Dragonspiral Tower (Winter) Exterior Northeast',
  },
  リュウラセンの塔1F: { ja: 'リュウラセンの塔 1F', en: 'Dragonspiral Tower 1F' },
  リュウラセンの塔2F: { ja: 'リュウラセンの塔 2F', en: 'Dragonspiral Tower 2F' },
  ワンダーブリッジ: { ja: 'ワンダーブリッジ', en: 'Marvelous Bridge' },
  海辺の洞穴: { ja: '海辺の洞穴', en: 'Seaside Cave' },
  海辺の洞穴1F: { ja: '海辺の洞穴 1F', en: 'Seaside Cave 1F' },
  海辺の洞穴B1F: { ja: '海辺の洞穴 B1F', en: 'Seaside Cave B1F' },
  岩山の間: { ja: '岩山の間', en: 'Rocky Mountain Chamber' },
  '古代の城1F,B1F': { ja: '古代の城 1F, B1F', en: 'Relic Castle 1F, B1F' },
  古代の城B2FB6F: { ja: '古代の城 B2F-B6F', en: 'Relic Castle B2F-B6F' },
  古代の城最下層: { ja: '古代の城 最下層', en: 'Relic Castle Lowest Floor' },
  古代の城小部屋: { ja: '古代の城 小部屋', en: 'Relic Castle Small Room' },
  古代の抜け道: { ja: '古代の抜け道', en: 'Relic Passage' },
  古代の抜け道中央部: { ja: '古代の抜け道 中央部', en: 'Relic Passage Central' },
  古代の抜け道南部: { ja: '古代の抜け道 南部', en: 'Relic Passage South' },
  古代の抜け道北部: { ja: '古代の抜け道 北部', en: 'Relic Passage North' },
  試練の室: { ja: '試練の室', en: 'Trial Chamber' },
  自然保護区: { ja: '自然保護区', en: 'Nature Preserve' },
  修行の岩屋: { ja: '修行の岩屋', en: "Challenger's Cave" },
  地下水脈の穴: { ja: '地下水脈の穴', en: 'Wellspring Cave' },
  地底遺跡: { ja: '地底遺跡', en: 'Underground Ruins' },
  鉄の間: { ja: '鉄の間', en: 'Iron Chamber' },
  電気石の洞穴1F: { ja: '電気石の洞穴 1F', en: 'Chargestone Cave 1F' },
  電気石の洞穴B1F: { ja: '電気石の洞穴 B1F', en: 'Chargestone Cave B1F' },
  電気石の洞穴B2F: { ja: '電気石の洞穴 B2F', en: 'Chargestone Cave B2F' },
  導の間: { ja: '導の間', en: 'Guidance Chamber' },
  氷山の間: { ja: '氷山の間', en: 'Iceberg Chamber' },
  夢の跡地: { ja: '夢の跡地', en: 'Dreamyard' },
  迷いの森: { ja: '迷いの森', en: 'Lostlorn Forest' },
  冷凍コンテナ: { ja: '冷凍コンテナ', en: 'Cold Storage' },
};

/**
 * Resolve a normalized location key to a localized display name.
 * Falls back to the raw key when a translation is not found.
 */
function getEncounterLocationName(key: string, locale: SupportedLocale): string {
  return ENCOUNTER_LOCATION_NAMES[key]?.[locale] ?? key;
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
  SAVE_PRESENCE_ORDER,
  getSavePresenceName,
  MEMORY_LINK_STATE_ORDER,
  getMemoryLinkStateName,
  SHINY_CHARM_STATE_ORDER,
  getShinyCharmStateName,
  ABILITY_SLOT_ORDER,
  getAbilitySlotName,
  GENDER_RATIO_ORDER,
  getGenderRatioName,
  ENCOUNTER_METHOD_NAMES,
  getEncounterMethodName,
  ENCOUNTER_LOCATION_NAMES,
  getEncounterLocationName,
};
