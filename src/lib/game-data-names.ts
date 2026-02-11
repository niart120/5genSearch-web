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
  route_1: { ja: '1番道路', en: 'Route 1' },
  route_2: { ja: '2番道路', en: 'Route 2' },
  route_3: { ja: '3番道路', en: 'Route 3' },
  route_4: { ja: '4番道路', en: 'Route 4' },
  route_5: { ja: '5番道路', en: 'Route 5' },
  route_6_spring: { ja: '6番道路(春)', en: 'Route 6 (Spring)' },
  route_6_summer: { ja: '6番道路(夏)', en: 'Route 6 (Summer)' },
  route_6_autumn: { ja: '6番道路(秋)', en: 'Route 6 (Autumn)' },
  route_6_winter: { ja: '6番道路(冬)', en: 'Route 6 (Winter)' },
  route_7_spring: { ja: '7番道路(春)', en: 'Route 7 (Spring)' },
  route_7_summer: { ja: '7番道路(夏)', en: 'Route 7 (Summer)' },
  route_7_autumn: { ja: '7番道路(秋)', en: 'Route 7 (Autumn)' },
  route_7_winter: { ja: '7番道路(冬)', en: 'Route 7 (Winter)' },
  route_8_spring: { ja: '8番道路(春)', en: 'Route 8 (Spring)' },
  route_8_summer: { ja: '8番道路(夏)', en: 'Route 8 (Summer)' },
  route_8_autumn: { ja: '8番道路(秋)', en: 'Route 8 (Autumn)' },
  route_8_winter: { ja: '8番道路(冬)', en: 'Route 8 (Winter)' },
  route_9: { ja: '9番道路', en: 'Route 9' },
  route_10: { ja: '10番道路', en: 'Route 10' },
  route_11: { ja: '11番道路', en: 'Route 11' },
  route_12: { ja: '12番道路', en: 'Route 12' },
  route_13: { ja: '13番道路', en: 'Route 13' },
  route_14: { ja: '14番道路', en: 'Route 14' },
  route_15: { ja: '15番道路', en: 'Route 15' },
  route_16: { ja: '16番道路', en: 'Route 16' },
  route_17: { ja: '17番水道', en: 'Route 17' },
  route_18: { ja: '18番道路', en: 'Route 18' },
  route_19: { ja: '19番道路', en: 'Route 19' },
  route_20_spring: { ja: '20番道路(春)', en: 'Route 20 (Spring)' },
  route_20_summer: { ja: '20番道路(夏)', en: 'Route 20 (Summer)' },
  route_20_autumn: { ja: '20番道路(秋)', en: 'Route 20 (Autumn)' },
  route_20_winter: { ja: '20番道路(冬)', en: 'Route 20 (Winter)' },
  route_21: { ja: '21番水道', en: 'Route 21' },
  route_22: { ja: '22番道路', en: 'Route 22' },
  route_23: { ja: '23番道路', en: 'Route 23' },
  p2_laboratory: { ja: 'P2ラボ', en: 'P2 Laboratory' },
  undella_town: { ja: 'サザナミタウン', en: 'Undella Town' },
  undella_bay_spring: { ja: 'サザナミ湾(春)', en: 'Undella Bay (Spring)' },
  undella_bay_summer: { ja: 'サザナミ湾(夏)', en: 'Undella Bay (Summer)' },
  undella_bay_autumn: { ja: 'サザナミ湾(秋)', en: 'Undella Bay (Autumn)' },
  undella_bay_winter: { ja: 'サザナミ湾(冬)', en: 'Undella Bay (Winter)' },
  floccesy_ranch: { ja: 'サンギ牧場', en: 'Floccesy Ranch' },
  striaton_city: { ja: 'サンヨウシティ', en: 'Striaton City' },
  giant_chasm: { ja: 'ジャイアントホール', en: 'Giant Chasm' },
  strange_house_entrance_b1f: {
    ja: 'ストレンジャーハウス 入口, B1F',
    en: 'Strange House Entrance, B1F',
  },
  strange_house_small_room: { ja: 'ストレンジャーハウス 小部屋', en: 'Strange House Small Room' },
  humilau_city: { ja: 'セイガイハシティ', en: 'Humilau City' },
  icirrus_city_spring: { ja: 'セッカシティ(春)', en: 'Icirrus City (Spring)' },
  icirrus_city_summer: { ja: 'セッカシティ(夏)', en: 'Icirrus City (Summer)' },
  icirrus_city_autumn: { ja: 'セッカシティ(秋)', en: 'Icirrus City (Autumn)' },
  icirrus_city_winter: { ja: 'セッカシティ(冬)', en: 'Icirrus City (Winter)' },
  moor_of_icirrus_spring: { ja: 'セッカの湿原(春)', en: 'Moor of Icirrus (Spring)' },
  moor_of_icirrus_summer: { ja: 'セッカの湿原(夏)', en: 'Moor of Icirrus (Summer)' },
  moor_of_icirrus_autumn: { ja: 'セッカの湿原(秋)', en: 'Moor of Icirrus (Autumn)' },
  moor_of_icirrus_winter: { ja: 'セッカの湿原(冬)', en: 'Moor of Icirrus (Winter)' },
  virbank_complex: { ja: 'タチワキコンビナート', en: 'Virbank Complex' },
  virbank_city: { ja: 'タチワキシティ', en: 'Virbank City' },
  celestial_tower: { ja: 'タワーオブヘブン', en: 'Celestial Tower' },
  celestial_tower_2f: { ja: 'タワーオブヘブン 2F', en: 'Celestial Tower 2F' },
  celestial_tower_3f: { ja: 'タワーオブヘブン 3F', en: 'Celestial Tower 3F' },
  celestial_tower_4f: { ja: 'タワーオブヘブン 4F', en: 'Celestial Tower 4F' },
  celestial_tower_5f: { ja: 'タワーオブヘブン 5F', en: 'Celestial Tower 5F' },
  victory_road: { ja: 'チャンピオンロード', en: 'Victory Road' },
  victory_road_1f: { ja: 'チャンピオンロード 1F', en: 'Victory Road 1F' },
  victory_road_2f: { ja: 'チャンピオンロード 2F', en: 'Victory Road 2F' },
  victory_road_3f_4f_5f: { ja: 'チャンピオンロード 3F, 4F, 5F', en: 'Victory Road 3F, 4F, 5F' },
  victory_road_6f_7f: { ja: 'チャンピオンロード 6F, 7F', en: 'Victory Road 6F, 7F' },
  twist_mountain_spring: { ja: 'ネジ山(春)', en: 'Twist Mountain (Spring)' },
  twist_mountain_summer: { ja: 'ネジ山(夏)', en: 'Twist Mountain (Summer)' },
  twist_mountain_autumn: { ja: 'ネジ山(秋)', en: 'Twist Mountain (Autumn)' },
  twist_mountain_winter: { ja: 'ネジ山(冬)', en: 'Twist Mountain (Winter)' },
  castelia_city: { ja: 'ヒウンシティ', en: 'Castelia City' },
  castelia_sewers: { ja: 'ヒウン下水道', en: 'Castelia Sewers' },
  aspertia_city: { ja: 'ヒオウギシティ', en: 'Aspertia City' },
  village_bridge: { ja: 'ビレッジブリッジ', en: 'Village Bridge' },
  mistralton_cave: { ja: 'フキヨセの洞穴', en: 'Mistralton Cave' },
  abundant_shrine: { ja: 'ほうじょうの社', en: 'Abundant Shrine' },
  driftveil_city: { ja: 'ホドモエシティ', en: 'Driftveil City' },
  driftveil_drawbridge: { ja: 'ホドモエの跳ね橋', en: 'Driftveil Drawbridge' },
  clay_tunnel: { ja: 'ヤーコンロード', en: 'Clay Tunnel' },
  pinwheel_forest: { ja: 'ヤグルマの森', en: 'Pinwheel Forest' },
  pinwheel_forest_exterior: { ja: 'ヤグルマの森 外部', en: 'Pinwheel Forest Exterior' },
  pinwheel_forest_interior: { ja: 'ヤグルマの森 内部', en: 'Pinwheel Forest Interior' },
  desert_resort_exterior: { ja: 'リゾートデザート 外部', en: 'Desert Resort Exterior' },
  desert_resort_interior: { ja: 'リゾートデザート 内部', en: 'Desert Resort Interior' },
  reversal_mountain: { ja: 'リバースマウンテン', en: 'Reversal Mountain' },
  dragonspiral_tower_spring: { ja: 'リュウラセンの塔(春)', en: 'Dragonspiral Tower (Spring)' },
  dragonspiral_tower_spring_exterior_south: {
    ja: 'リュウラセンの塔(春) 外部(南)',
    en: 'Dragonspiral Tower (Spring) Exterior South',
  },
  dragonspiral_tower_spring_exterior_northeast: {
    ja: 'リュウラセンの塔(春) 外部(北東)',
    en: 'Dragonspiral Tower (Spring) Exterior Northeast',
  },
  dragonspiral_tower_summer: { ja: 'リュウラセンの塔(夏)', en: 'Dragonspiral Tower (Summer)' },
  dragonspiral_tower_summer_exterior_south: {
    ja: 'リュウラセンの塔(夏) 外部(南)',
    en: 'Dragonspiral Tower (Summer) Exterior South',
  },
  dragonspiral_tower_summer_exterior_northeast: {
    ja: 'リュウラセンの塔(夏) 外部(北東)',
    en: 'Dragonspiral Tower (Summer) Exterior Northeast',
  },
  dragonspiral_tower_autumn: { ja: 'リュウラセンの塔(秋)', en: 'Dragonspiral Tower (Autumn)' },
  dragonspiral_tower_autumn_exterior_south: {
    ja: 'リュウラセンの塔(秋) 外部(南)',
    en: 'Dragonspiral Tower (Autumn) Exterior South',
  },
  dragonspiral_tower_autumn_exterior_northeast: {
    ja: 'リュウラセンの塔(秋) 外部(北東)',
    en: 'Dragonspiral Tower (Autumn) Exterior Northeast',
  },
  dragonspiral_tower_winter: { ja: 'リュウラセンの塔(冬)', en: 'Dragonspiral Tower (Winter)' },
  dragonspiral_tower_winter_exterior_south: {
    ja: 'リュウラセンの塔(冬) 外部(南)',
    en: 'Dragonspiral Tower (Winter) Exterior South',
  },
  dragonspiral_tower_winter_exterior_northeast: {
    ja: 'リュウラセンの塔(冬) 外部(北東)',
    en: 'Dragonspiral Tower (Winter) Exterior Northeast',
  },
  dragonspiral_tower_1f: { ja: 'リュウラセンの塔 1F', en: 'Dragonspiral Tower 1F' },
  dragonspiral_tower_2f: { ja: 'リュウラセンの塔 2F', en: 'Dragonspiral Tower 2F' },
  marvelous_bridge: { ja: 'ワンダーブリッジ', en: 'Marvelous Bridge' },
  seaside_cave: { ja: '海辺の洞穴', en: 'Seaside Cave' },
  seaside_cave_1f: { ja: '海辺の洞穴 1F', en: 'Seaside Cave 1F' },
  seaside_cave_b1f: { ja: '海辺の洞穴 B1F', en: 'Seaside Cave B1F' },
  rocky_mountain_chamber: { ja: '岩山の間', en: 'Rocky Mountain Chamber' },
  relic_castle_1f_b1f: { ja: '古代の城 1F, B1F', en: 'Relic Castle 1F, B1F' },
  relic_castle_b2f_b6f: { ja: '古代の城 B2F-B6F', en: 'Relic Castle B2F-B6F' },
  relic_castle_lowest_floor: { ja: '古代の城 最下層', en: 'Relic Castle Lowest Floor' },
  relic_castle_small_room: { ja: '古代の城 小部屋', en: 'Relic Castle Small Room' },
  relic_passage: { ja: '古代の抜け道', en: 'Relic Passage' },
  relic_passage_central: { ja: '古代の抜け道 中央部', en: 'Relic Passage Central' },
  relic_passage_south: { ja: '古代の抜け道 南部', en: 'Relic Passage South' },
  relic_passage_north: { ja: '古代の抜け道 北部', en: 'Relic Passage North' },
  trial_chamber: { ja: '試練の室', en: 'Trial Chamber' },
  nature_preserve: { ja: '自然保護区', en: 'Nature Preserve' },
  challengers_cave: { ja: '修行の岩屋', en: "Challenger's Cave" },
  wellspring_cave: { ja: '地下水脈の穴', en: 'Wellspring Cave' },
  underground_ruins: { ja: '地底遺跡', en: 'Underground Ruins' },
  iron_chamber: { ja: '鉄の間', en: 'Iron Chamber' },
  chargestone_cave_1f: { ja: '電気石の洞穴 1F', en: 'Chargestone Cave 1F' },
  chargestone_cave_b1f: { ja: '電気石の洞穴 B1F', en: 'Chargestone Cave B1F' },
  chargestone_cave_b2f: { ja: '電気石の洞穴 B2F', en: 'Chargestone Cave B2F' },
  guidance_chamber: { ja: '導の間', en: 'Guidance Chamber' },
  iceberg_chamber: { ja: '氷山の間', en: 'Iceberg Chamber' },
  dreamyard: { ja: '夢の跡地', en: 'Dreamyard' },
  lostlorn_forest: { ja: '迷いの森', en: 'Lostlorn Forest' },
  cold_storage: { ja: '冷凍コンテナ', en: 'Cold Storage' },
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
