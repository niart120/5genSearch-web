#!/usr/bin/env node
/**
 * Encounter tables scraper for BW/BW2
 *
 * Source: pokebook.jp (static HTML tables)
 * Output: src/data/encounters/generated/v1/<Version>/<Method>.json
 *
 * This script is for data acquisition in development. Do NOT fetch at runtime.
 * Always commit generated JSON for reproducible builds.
 *
 * Usage:
 *   node scripts/scrape-encounters.js
 *   node scripts/scrape-encounters.js --version=B --method=Normal
 */

import fs from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { load as loadHtml } from 'cheerio';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MISSING_SPECIES = new Set();

const METHODS = [
  'Normal',
  'ShakingGrass',
  'DustCloud',
  'PokemonShadow',
  'Surfing',
  'SurfingBubble',
  'Fishing',
  'FishingBubble',
];

const VERSIONS = ['B', 'W', 'B2', 'W2'];

const VERSION_HELD_ITEM_KEY = {
  B: 'black',
  W: 'white',
  B2: 'black-2',
  W2: 'white-2',
};

const SOURCE_MAP = {
  B: {
    Normal: 'https://pokebook.jp/data/sp5/enc_b',
    ShakingGrass: 'https://pokebook.jp/data/sp5/enc_b',
    DustCloud: 'https://pokebook.jp/data/sp5/enc_b',
    PokemonShadow: 'https://pokebook.jp/data/sp5/enc_b',
    Surfing: 'https://pokebook.jp/data/sp5/enc_b',
    SurfingBubble: 'https://pokebook.jp/data/sp5/enc_b',
    Fishing: 'https://pokebook.jp/data/sp5/enc_b',
    FishingBubble: 'https://pokebook.jp/data/sp5/enc_b',
  },
  W: {
    Normal: 'https://pokebook.jp/data/sp5/enc_w',
    ShakingGrass: 'https://pokebook.jp/data/sp5/enc_w',
    DustCloud: 'https://pokebook.jp/data/sp5/enc_w',
    PokemonShadow: 'https://pokebook.jp/data/sp5/enc_w',
    Surfing: 'https://pokebook.jp/data/sp5/enc_w',
    SurfingBubble: 'https://pokebook.jp/data/sp5/enc_w',
    Fishing: 'https://pokebook.jp/data/sp5/enc_w',
    FishingBubble: 'https://pokebook.jp/data/sp5/enc_w',
  },
  B2: {
    Normal: 'https://pokebook.jp/data/sp5/enc_b2',
    ShakingGrass: 'https://pokebook.jp/data/sp5/enc_b2',
    DustCloud: 'https://pokebook.jp/data/sp5/enc_b2',
    PokemonShadow: 'https://pokebook.jp/data/sp5/enc_b2',
    Surfing: 'https://pokebook.jp/data/sp5/enc_b2',
    SurfingBubble: 'https://pokebook.jp/data/sp5/enc_b2',
    Fishing: 'https://pokebook.jp/data/sp5/enc_b2',
    FishingBubble: 'https://pokebook.jp/data/sp5/enc_b2',
  },
  W2: {
    Normal: 'https://pokebook.jp/data/sp5/enc_w2',
    ShakingGrass: 'https://pokebook.jp/data/sp5/enc_w2',
    DustCloud: 'https://pokebook.jp/data/sp5/enc_w2',
    PokemonShadow: 'https://pokebook.jp/data/sp5/enc_w2',
    Surfing: 'https://pokebook.jp/data/sp5/enc_w2',
    SurfingBubble: 'https://pokebook.jp/data/sp5/enc_w2',
    Fishing: 'https://pokebook.jp/data/sp5/enc_w2',
    FishingBubble: 'https://pokebook.jp/data/sp5/enc_w2',
  },
};

const SLOT_RATE_PRESETS = {
  Normal: [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1],
  ShakingGrass: [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1],
  DustCloud: [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1],
  PokemonShadow: [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1],
  Surfing: [60, 30, 5, 4, 1],
  SurfingBubble: [60, 30, 5, 4, 1],
  Fishing: [60, 30, 5, 4, 1],
  FishingBubble: [60, 30, 5, 4, 1],
};

// Bridge locations where PokemonShadow (flying shadows) appear.
// These are in the "揺れる草むら, 土煙" section on pokebook.jp but use
// EncounterType::PokemonShadow in the game engine.
const POKEMON_SHADOW_LOCATIONS = new Set([
  'ホドモエの跳ね橋',
  'ワンダーブリッジ',
]);

// Locations where water tables should only keep a single unique row set
const WATER_SINGLE_ROW_LOCATIONS = new Map([
  ['チャンピオンロード', {}],
  ['ジャイアントホール', {}],
  ['地下水脈の穴', {}],
  ['ヒウン下水道', {}],
  ['サンギ牧場', {}],
  ['ヤーコンロード', {}],
  ['4番道路', {}],
]);

// Suffix rules for BW to disambiguate locations with multiple sub-areas
const DUPLICATE_SUFFIX_RULES_BW = Object.freeze({
  ヤグルマの森: ['外部', '内部'],
  リゾートデザート: ['外部', '内部'],
  古代の城: ['1F,B1F', 'B2F-B6F', '最下層', '小部屋'],
  電気石の洞穴: ['1F', 'B1F', 'B2F'],
  'ネジ山(春)': null,
  'ネジ山(夏)': null,
  'ネジ山(秋)': null,
  'ネジ山(冬)': null,
  'リュウラセンの塔(春)': ['外部(南)', '外部(北東)'],
  'リュウラセンの塔(夏)': ['外部(南)', '外部(北東)'],
  'リュウラセンの塔(秋)': ['外部(南)', '外部(北東)'],
  'リュウラセンの塔(冬)': ['外部(南)', '外部(北東)'],
  リュウラセンの塔: ['1F', '2F'],
  チャンピオンロード: ['1F', '2F', '3F,4F,5F', '6F,7F'],
  ジャイアントホール: {
    Normal: ['外部', '洞窟', '森(クレーター)', '洞窟(最深部)'],
    ShakingGrass: ['外部', '森(クレーター)'],
    DustCloud: null,
  },
  地下水脈の穴: null,
  フキヨセの洞穴: null,
  タワーオブヘブン: ['2F', '3F', '4F', '5F'],
  修行の岩屋: {
    Normal: ['1F', 'B1F', 'B2F'],
    DustCloud: null,
  },
  '10番道路': null,
});

// Suffix rules for B2W2
const DUPLICATE_SUFFIX_RULES_B2W2 = Object.freeze({
  ヤグルマの森: ['外部', '内部'],
  リゾートデザート: ['外部', '内部'],
  古代の城: ['1F,B1F', '最下層', '小部屋'],
  電気石の洞穴: ['1F', 'B1F', 'B2F'],
  'ネジ山(春)': null,
  'ネジ山(夏)': null,
  'ネジ山(秋)': null,
  'ネジ山(冬)': null,
  'リュウラセンの塔(春)': ['外部(南)', '外部(北東)'],
  'リュウラセンの塔(夏)': ['外部(南)', '外部(北東)'],
  'リュウラセンの塔(秋)': ['外部(南)', '外部(北東)'],
  'リュウラセンの塔(冬)': ['外部(南)', '外部(北東)'],
  リュウラセンの塔: ['1F', '2F'],
  チャンピオンロード: ['1F', '2F', '3F,4F,5F', '6F,7F'],
  リバースマウンテン: {
    Normal: ['外部', '内部(入口)', '内部(奥)'],
    DustCloud: null,
  },
  ストレンジャーハウス: ['入口,B1F', '小部屋'],
  古代の抜け道: ['南部', '北部', '中央部'],
  ヤーコンロード: null,
  地底遺跡: null,
  海辺の洞穴: ['1F', 'B1F'],
  '4番道路': null,
  地下水脈の穴: null,
  フキヨセの洞穴: null,
  タワーオブヘブン: ['2F', '3F', '4F', '5F'],
  ジャイアントホール: {
    Normal: ['外部', '洞窟', '森(クレーター)', '洞窟(最深部)'],
    ShakingGrass: ['外部', '森(クレーター)'],
    DustCloud: null,
  },
  ヒウン下水道: null,
  タチワキコンビナート: {
    Normal: ['外部', '内部'],
    ShakingGrass: null,
  },
});

const DUPLICATE_SUFFIX_RULES = Object.freeze({
  B: DUPLICATE_SUFFIX_RULES_BW,
  W: DUPLICATE_SUFFIX_RULES_BW,
  B2: DUPLICATE_SUFFIX_RULES_B2W2,
  W2: DUPLICATE_SUFFIX_RULES_B2W2,
});

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

// Keep in sync with src/data/encounters/loader.ts normalizeLocationKey
function normalizeLocationKey(location) {
  return location
    .trim()
    .replace(/[\u3000\s]+/g, '')
    .replace(/[‐‑‒–—−\-.]/g, '');
}

// ---------------------------------------------------------------------------
// Japanese normalized key -> ASCII key mapping
// ---------------------------------------------------------------------------

const JA_TO_ASCII_KEY = {
  '1番道路': 'route_1',
  '2番道路': 'route_2',
  '3番道路': 'route_3',
  '4番道路': 'route_4',
  '5番道路': 'route_5',
  '6番道路(春)': 'route_6_spring',
  '6番道路(夏)': 'route_6_summer',
  '6番道路(秋)': 'route_6_autumn',
  '6番道路(冬)': 'route_6_winter',
  '7番道路(春)': 'route_7_spring',
  '7番道路(夏)': 'route_7_summer',
  '7番道路(秋)': 'route_7_autumn',
  '7番道路(冬)': 'route_7_winter',
  '8番道路(春)': 'route_8_spring',
  '8番道路(夏)': 'route_8_summer',
  '8番道路(秋)': 'route_8_autumn',
  '8番道路(冬)': 'route_8_winter',
  '9番道路': 'route_9',
  '10番道路': 'route_10',
  '11番道路': 'route_11',
  '12番道路': 'route_12',
  '13番道路': 'route_13',
  '14番道路': 'route_14',
  '15番道路': 'route_15',
  '16番道路': 'route_16',
  '17番水道': 'route_17',
  '18番道路': 'route_18',
  '19番道路': 'route_19',
  '20番道路(春)': 'route_20_spring',
  '20番道路(夏)': 'route_20_summer',
  '20番道路(秋)': 'route_20_autumn',
  '20番道路(冬)': 'route_20_winter',
  '21番水道': 'route_21',
  '22番道路': 'route_22',
  '23番道路': 'route_23',
  P2ラボ: 'p2_laboratory',
  サザナミタウン: 'undella_town',
  'サザナミ湾(春)': 'undella_bay_spring',
  'サザナミ湾(夏)': 'undella_bay_summer',
  'サザナミ湾(秋)': 'undella_bay_autumn',
  'サザナミ湾(冬)': 'undella_bay_winter',
  サンギ牧場: 'floccesy_ranch',
  サンヨウシティ: 'striaton_city',
  ジャイアントホール: 'giant_chasm',
  ジャイアントホール外部: 'giant_chasm_exterior',
  ジャイアントホール洞窟: 'giant_chasm_cave',
  'ジャイアントホール森(クレーター)': 'giant_chasm_crater_forest',
  'ジャイアントホール洞窟(最深部)': 'giant_chasm_cave_depths',
  'ストレンジャーハウス入口,B1F': 'strange_house_entrance_b1f',
  ストレンジャーハウス小部屋: 'strange_house_small_room',
  セイガイハシティ: 'humilau_city',
  'セッカシティ(春)': 'icirrus_city_spring',
  'セッカシティ(夏)': 'icirrus_city_summer',
  'セッカシティ(秋)': 'icirrus_city_autumn',
  'セッカシティ(冬)': 'icirrus_city_winter',
  'セッカの湿原(春)': 'moor_of_icirrus_spring',
  'セッカの湿原(夏)': 'moor_of_icirrus_summer',
  'セッカの湿原(秋)': 'moor_of_icirrus_autumn',
  'セッカの湿原(冬)': 'moor_of_icirrus_winter',
  タチワキコンビナート: 'virbank_complex',
  タチワキコンビナート外部: 'virbank_complex_exterior',
  タチワキコンビナート内部: 'virbank_complex_interior',
  タチワキシティ: 'virbank_city',
  タワーオブヘブン: 'celestial_tower',
  タワーオブヘブン2F: 'celestial_tower_2f',
  タワーオブヘブン3F: 'celestial_tower_3f',
  タワーオブヘブン4F: 'celestial_tower_4f',
  タワーオブヘブン5F: 'celestial_tower_5f',
  チャンピオンロード: 'victory_road',
  チャンピオンロード1F: 'victory_road_1f',
  チャンピオンロード2F: 'victory_road_2f',
  'チャンピオンロード3F,4F,5F': 'victory_road_3f_4f_5f',
  'チャンピオンロード6F,7F': 'victory_road_6f_7f',
  'ネジ山(春)': 'twist_mountain_spring',
  'ネジ山(夏)': 'twist_mountain_summer',
  'ネジ山(秋)': 'twist_mountain_autumn',
  'ネジ山(冬)': 'twist_mountain_winter',
  ヒウンシティ: 'castelia_city',
  ヒウン下水道: 'castelia_sewers',
  ヒオウギシティ: 'aspertia_city',
  ビレッジブリッジ: 'village_bridge',
  フキヨセの洞穴: 'mistralton_cave',
  ほうじょうの社: 'abundant_shrine',
  ホドモエシティ: 'driftveil_city',
  ホドモエの跳ね橋: 'driftveil_drawbridge',
  ヤーコンロード: 'clay_tunnel',
  ヤグルマの森: 'pinwheel_forest',
  ヤグルマの森外部: 'pinwheel_forest_exterior',
  ヤグルマの森内部: 'pinwheel_forest_interior',
  リゾートデザート外部: 'desert_resort_exterior',
  リゾートデザート内部: 'desert_resort_interior',
  リバースマウンテン: 'reversal_mountain',
  リバースマウンテン外部: 'reversal_mountain_exterior',
  'リバースマウンテン内部(入口)': 'reversal_mountain_interior_entrance',
  'リバースマウンテン内部(奥)': 'reversal_mountain_interior_main',
  'リュウラセンの塔(春)': 'dragonspiral_tower_spring',
  'リュウラセンの塔(春)外部(南)': 'dragonspiral_tower_spring_exterior_south',
  'リュウラセンの塔(春)外部(北東)': 'dragonspiral_tower_spring_exterior_northeast',
  'リュウラセンの塔(夏)': 'dragonspiral_tower_summer',
  'リュウラセンの塔(夏)外部(南)': 'dragonspiral_tower_summer_exterior_south',
  'リュウラセンの塔(夏)外部(北東)': 'dragonspiral_tower_summer_exterior_northeast',
  'リュウラセンの塔(秋)': 'dragonspiral_tower_autumn',
  'リュウラセンの塔(秋)外部(南)': 'dragonspiral_tower_autumn_exterior_south',
  'リュウラセンの塔(秋)外部(北東)': 'dragonspiral_tower_autumn_exterior_northeast',
  'リュウラセンの塔(冬)': 'dragonspiral_tower_winter',
  'リュウラセンの塔(冬)外部(南)': 'dragonspiral_tower_winter_exterior_south',
  'リュウラセンの塔(冬)外部(北東)': 'dragonspiral_tower_winter_exterior_northeast',
  リュウラセンの塔1F: 'dragonspiral_tower_1f',
  リュウラセンの塔2F: 'dragonspiral_tower_2f',
  ワンダーブリッジ: 'marvelous_bridge',
  海辺の洞穴: 'seaside_cave',
  海辺の洞穴1F: 'seaside_cave_1f',
  海辺の洞穴B1F: 'seaside_cave_b1f',
  岩山の間: 'rocky_mountain_chamber',
  '古代の城1F,B1F': 'relic_castle_1f_b1f',
  古代の城B2FB6F: 'relic_castle_b2f_b6f',
  古代の城最下層: 'relic_castle_lowest_floor',
  古代の城小部屋: 'relic_castle_small_room',
  古代の抜け道: 'relic_passage',
  古代の抜け道中央部: 'relic_passage_central',
  古代の抜け道南部: 'relic_passage_south',
  古代の抜け道北部: 'relic_passage_north',
  試練の室: 'trial_chamber',
  自然保護区: 'nature_preserve',
  修行の岩屋: 'challengers_cave',
  修行の岩屋1F: 'challengers_cave_1f',
  修行の岩屋B1F: 'challengers_cave_b1f',
  修行の岩屋B2F: 'challengers_cave_b2f',
  地下水脈の穴: 'wellspring_cave',
  地底遺跡: 'underground_ruins',
  鉄の間: 'iron_chamber',
  電気石の洞穴1F: 'chargestone_cave_1f',
  電気石の洞穴B1F: 'chargestone_cave_b1f',
  電気石の洞穴B2F: 'chargestone_cave_b2f',
  導の間: 'guidance_chamber',
  氷山の間: 'iceberg_chamber',
  夢の跡地: 'dreamyard',
  迷いの森: 'lostlorn_forest',
  冷凍コンテナ: 'cold_storage',
};

/**
 * Convert a normalized Japanese location key to its ASCII equivalent.
 * Falls back to the input key if no mapping exists (and warns).
 */
function toAsciiLocationKey(jaKey) {
  const ascii = JA_TO_ASCII_KEY[jaKey];
  if (!ascii) {
    console.warn(`[warn] No ASCII key mapping for: ${jaKey}`);
    return jaKey;
  }
  return ascii;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function toInt(n, def = 0) {
  const x = parseInt(String(n).trim(), 10);
  return Number.isFinite(x) ? x : def;
}

function parseLevelRangeFromText(text) {
  const m = String(text).match(/(\d+)\D+(\d+)/);
  if (m) {
    const min = toInt(m[1]);
    const max = toInt(m[2]);
    if (min && max) return { min, max };
  }
  const single = String(text).match(/(\d+)/);
  if (single) {
    const v = toInt(single[1]);
    return { min: v, max: v };
  }
  return { min: 1, max: 1 };
}

function canonicalizeSpeciesName(raw) {
  const t = String(raw).trim();
  return t.replace(/\s*\([^)]*\)\s*$/, '').replace(/[\u3000\s]+/g, '');
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'encounter-scraper/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeJson(file, data) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Species data loading
// ---------------------------------------------------------------------------

const SPECIES_JSON_PATH = path.resolve('spec/agent/completed/local_029/gen5-species.json');

let speciesDataCache = null;

function loadSpeciesData() {
  if (speciesDataCache) return speciesDataCache;
  if (!existsSync(SPECIES_JSON_PATH)) {
    throw new Error(`Species data not found: ${SPECIES_JSON_PATH}`);
  }
  speciesDataCache = JSON.parse(readFileSync(SPECIES_JSON_PATH, 'utf8'));
  return speciesDataCache;
}

// Form aliases not in gen5-species.json but used on pokebook.jp
const FORM_ALIASES = {
  バスラオ赤: 550, // Basculin Red-Striped
  バスラオ青: 550, // Basculin Blue-Striped
};

/**
 * Build species alias map (Japanese name -> speciesId) in-memory.
 * No longer persists to disk; derived from gen5-species.json at scrape time.
 */
function buildSpeciesAliasJa() {
  const data = loadSpeciesData();
  const m = new Map();
  for (const [id, entry] of Object.entries(data)) {
    const jaName = entry.names?.ja;
    if (jaName) {
      m.set(jaName, parseInt(id, 10));
    }
  }
  for (const [name, id] of Object.entries(FORM_ALIASES)) {
    m.set(name, id);
  }
  return m;
}

let speciesAliasCache = null;

/**
 * Get species alias map (cached after first build).
 */
function loadSpeciesAliasJa() {
  if (!speciesAliasCache) {
    speciesAliasCache = buildSpeciesAliasJa();
  }
  return speciesAliasCache;
}

// ---------------------------------------------------------------------------
// Species metadata resolution
// ---------------------------------------------------------------------------

function resolveGenderRatio(speciesId) {
  const data = loadSpeciesData();
  const entry = data[String(speciesId)];
  if (!entry) return 'F1M1';

  const gender = entry.gender;
  if (!gender) return 'F1M1';

  if (gender.type === 'genderless') return 'Genderless';
  if (gender.type === 'male-only') return 'MaleOnly';
  if (gender.type === 'female-only') return 'FemaleOnly';
  if (gender.type === 'fixed') {
    if (gender.fixed === 'male') return 'MaleOnly';
    if (gender.fixed === 'female') return 'FemaleOnly';
  }

  const threshold = gender.femaleThreshold;
  if (threshold === 32 || threshold === 31) return 'F1M7';
  if (threshold === 64 || threshold === 63) return 'F1M3';
  if (threshold === 128 || threshold === 127) return 'F1M1';
  if (threshold === 192 || threshold === 191) return 'F3M1';

  return 'F1M1';
}

function resolveHasHeldItem(speciesId, version) {
  const data = loadSpeciesData();
  const entry = data[String(speciesId)];
  if (!entry) return false;

  const key = VERSION_HELD_ITEM_KEY[version];
  if (!key) return false;

  const items = entry.heldItems?.[key];
  return Array.isArray(items) && items.length > 0;
}

function enrichSlot(slot, version) {
  return {
    ...slot,
    genderRatio: resolveGenderRatio(slot.speciesId),
    hasHeldItem: resolveHasHeldItem(slot.speciesId, version),
  };
}

// ---------------------------------------------------------------------------
// HTML parsing - section detection
// ---------------------------------------------------------------------------

function findSectionTables($, method) {
  const headers = $('h1,h2,h3,h4,h5').toArray();
  const textOf = (el) => ($(el).text() || '').replace(/[\s\u3000]+/g, '');
  const matchers = {
    Normal: (t) => t.includes('草むら') && t.includes('洞窟') && !t.includes('濃い草むら'),
    ShakingGrass: (t) => t.includes('揺れる草むら') || t.includes('土煙'),
    DustCloud: (t) => t.includes('揺れる草むら') || t.includes('土煙'),
    PokemonShadow: (t) => t.includes('揺れる草むら') || t.includes('土煙'),
    Surfing: (t) => t.includes('なみのり') || t.includes('つり'),
    SurfingBubble: (t) => t.includes('なみのり') || t.includes('つり'),
    Fishing: (t) => t.includes('なみのり') || t.includes('つり'),
    FishingBubble: (t) => t.includes('なみのり') || t.includes('つり'),
  };
  const isHeader = (el) => /^h[1-6]$/i.test(el.tagName || el.name || '');

  let startIdx = -1;
  for (let i = 0; i < headers.length; i++) {
    const t = textOf(headers[i]);
    if (matchers[method]?.(t)) {
      if (method === 'Normal' && t.includes('濃い草むら')) continue;
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) return [];

  const tables = [];
  let node = $(headers[startIdx]).next();
  while (node && node.length) {
    const name = node[0].name || node[0].tagName || '';
    if (/^h[1-6]$/i.test(name)) break;
    if (name === 'table') tables.push(node);
    node = node.next();
  }
  return tables;
}

// ---------------------------------------------------------------------------
// Row parsers
// ---------------------------------------------------------------------------

function parseWideRowIntoSlots($, tr, method, aliasJa) {
  const tds = $(tr).find('td');
  if (tds.length < 13) return null;
  const locText = $(tds[0]).text().trim();
  const locMatch = locText.match(/^\[([^\]]+)\]\s*(.*)$/);
  const baseName = (locMatch ? locMatch[2] : locText.replace(/^\[[^\]]+\]\s*/, '')).trim();

  const rates = SLOT_RATE_PRESETS[method] || SLOT_RATE_PRESETS.Normal;
  const slots = [];
  for (let i = 1; i <= 12 && i < tds.length; i++) {
    const cell = $(tds[i]).text().trim();
    if (!cell) continue;
    const nameMatch = cell.match(/^([^()]+)\(([^)]+)\)$/);
    if (!nameMatch) continue;
    const rawName = canonicalizeSpeciesName(nameMatch[1]);
    const lvlText = nameMatch[2];
    const levelRange = parseLevelRangeFromText(lvlText);

    const speciesId = aliasJa.get(rawName);
    if (!speciesId) {
      MISSING_SPECIES.add(rawName);
      continue;
    }

    const rate = rates[i - 1] ?? 1;
    slots.push({ speciesId, rate, levelRange });
  }
  if (!slots.length) return null;
  return { baseName, slots };
}

// Species IDs for モグリュー (Drilbur) and ドリュウズ (Excadrill).
// In Gen 5, cave dust cloud encounters produce exclusively these species.
// Outdoor shaking grass encounters never include them.
const DUST_CLOUD_SPECIES = new Set([529, 530]);

function isDustCloudRow(parsedSlots) {
  return parsedSlots.some((slot) => DUST_CLOUD_SPECIES.has(slot.speciesId));
}

function parseWaterRowSlots($, tr, method, aliasJa) {
  const tds = $(tr).find('td');
  const startIdx = tds.length === 6 ? 1 : 0;
  const rates = SLOT_RATE_PRESETS[method] || SLOT_RATE_PRESETS.Surfing;
  const slots = [];
  for (let i = 0; i < 5 && startIdx + i < tds.length; i++) {
    const cell = $(tds[startIdx + i])
      .text()
      .trim();
    if (!cell) continue;
    const m = cell.match(/^([^()]+)\(([^)]+)\)$/);
    if (!m) continue;
    const rawName = canonicalizeSpeciesName(m[1]);
    const levelRange = parseLevelRangeFromText(m[2]);
    const speciesId = aliasJa.get(rawName);
    if (!speciesId) {
      MISSING_SPECIES.add(rawName);
      continue;
    }
    slots.push({ speciesId, rate: rates[i] ?? 1, levelRange });
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Signature-based deduplication
// ---------------------------------------------------------------------------

function makeSlotSignature(slot) {
  if (!slot) return '';
  const speciesId = slot.speciesId ?? 'null';
  const rate = slot.rate ?? 'null';
  const min = slot.levelRange?.min ?? 'null';
  const max = slot.levelRange?.max ?? 'null';
  return `${speciesId}:${rate}:${min}-${max}`;
}

function makeRowSignature(slots) {
  if (!slots || !slots.length) return '';
  return slots.map(makeSlotSignature).join('|');
}

function uniqueRowsBySignature(rows) {
  const seen = new Set();
  const uniques = [];
  for (const row of rows) {
    const signature = makeRowSignature(row.slots);
    if (!signature) continue;
    if (seen.has(signature)) continue;
    seen.add(signature);
    uniques.push(row);
  }
  return uniques;
}

// ---------------------------------------------------------------------------
// Location group resolution
// ---------------------------------------------------------------------------

function resolveLocationGroup(baseName, rows, { version, method, suffixRules }) {
  const uniques = uniqueRowsBySignature(rows);
  if (!uniques.length) return [];

  let plan = suffixRules ? suffixRules[baseName] : undefined;

  // Support method-specific overrides: { Normal: [...], DustCloud: null }
  if (plan !== null && plan !== undefined && typeof plan === 'object' && !Array.isArray(plan)) {
    plan = method in plan ? plan[method] : undefined;
  }

  if (plan === undefined) {
    const merged = [];
    for (const row of rows) merged.push(...row.slots);
    return merged.length ? [{ displayName: baseName, slots: merged }] : [];
  }

  if (plan === null) {
    if (uniques.length > 1) {
      console.warn(
        `[warn] Expected identical rows for ${version}/${method}/${baseName}, found ${uniques.length} variants; using first variant.`
      );
    }
    return [{ displayName: baseName, slots: uniques[0].slots }];
  }

  if (!Array.isArray(plan) || !plan.length) {
    console.warn(`[warn] No valid suffix plan for ${version}/${method}/${baseName}; merging rows.`);
    const merged = [];
    for (const row of rows) merged.push(...row.slots);
    return merged.length ? [{ displayName: baseName, slots: merged }] : [];
  }

  if (uniques.length > plan.length) {
    console.warn(
      `[warn] Insufficient suffix entries for ${version}/${method}/${baseName}: need ${uniques.length}, have ${plan.length}. Extra variants reuse last suffix.`
    );
  }

  const result = [];
  for (let i = 0; i < uniques.length; i++) {
    const suffix = plan[Math.min(i, plan.length - 1)] ?? null;
    const displayName = suffix ? `${baseName} ${suffix}` : baseName;
    result.push({ displayName, slots: uniques[i].slots });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Water encounter page helpers
// ---------------------------------------------------------------------------

function isLocationRow($, tr) {
  const td0 = $(tr).find('td').first();
  if (!td0.length) return false;
  const txt = td0.text().trim();
  return /^\[[^\]]+\]/.test(txt) || (/\S/.test(txt) && $(tr).find('td').length >= 6);
}

function extractDisplayNameFromRow($, tr) {
  const td0 = $(tr).find('td').first();
  const locText = td0.text().trim();
  return locText.replace(/^\[[^\]]+\]\s*/, '').trim();
}

// ---------------------------------------------------------------------------
// Page parsers
// ---------------------------------------------------------------------------

function parseWaterEncounterPage(html, { version, method, url, aliasJa }) {
  const $ = loadHtml(html);
  const rawLocations = new Map();
  const tables = findSectionTables($, method);
  if (!tables.length) {
    return {
      version,
      method,
      source: { name: 'Pokebook', url, retrievedAt: todayISO() },
      locations: {},
    };
  }

  for (const tbl of tables) {
    const rows = $(tbl).find('tbody tr, tr').toArray();
    for (let i = 0; i < rows.length; i++) {
      const tr = rows[i];
      if (!isLocationRow($, tr)) continue;
      const displayName = extractDisplayNameFromRow($, tr);
      const group = [tr, rows[i + 1], rows[i + 2], rows[i + 3]].filter(Boolean);
      const indexToMethod = ['Surfing', 'SurfingBubble', 'Fishing', 'FishingBubble'];

      for (let gi = 0; gi < group.length; gi++) {
        const targetMethod = indexToMethod[gi];
        if (targetMethod !== method) continue;
        const slots = parseWaterRowSlots($, group[gi], method, aliasJa);
        if (!slots.length) continue;
        if (!rawLocations.has(displayName)) rawLocations.set(displayName, []);
        rawLocations.get(displayName).push(slots);
      }
      i += Math.max(0, group.length - 1);
    }
  }

  const locations = {};
  for (const [displayName, rows] of rawLocations) {
    const seen = new Set();
    const mergedSlots = [];
    const options = WATER_SINGLE_ROW_LOCATIONS.get(displayName);
    const limitToOne = options && options.keepAll !== true;
    const enforceUnique = !options || options.keepAll !== true;

    for (const rowSlots of rows) {
      const signature = makeRowSignature(rowSlots);
      if (enforceUnique) {
        if (signature && seen.has(signature)) continue;
        if (signature) seen.add(signature);
      }
      mergedSlots.push(...rowSlots);
      if (limitToOne) break;
    }
    if (mergedSlots.length) {
      const normalizedKey = normalizeLocationKey(displayName);
      const asciiKey = toAsciiLocationKey(normalizedKey);
      locations[asciiKey] = {
        slots: mergedSlots.map((s) => enrichSlot(s, version)),
      };
    }
  }

  return {
    version,
    method,
    source: { name: 'Pokebook', url, retrievedAt: todayISO() },
    locations,
  };
}

function parseEncounterPage(html, { version, method, url, aliasJa }) {
  const waterMethods = new Set(['Surfing', 'SurfingBubble', 'Fishing', 'FishingBubble']);
  if (waterMethods.has(method)) {
    return parseWaterEncounterPage(html, { version, method, url, aliasJa });
  }

  const $ = loadHtml(html);
  const locations = {};
  const parsedRows = [];

  const tables = findSectionTables($, method);
  if (!tables.length) {
    return {
      version,
      method,
      source: { name: 'Pokebook', url, retrievedAt: todayISO() },
      locations,
    };
  }

  for (const tbl of tables) {
    $(tbl)
      .find('tbody tr, tr')
      .each((_, tr) => {
        const parsed = parseWideRowIntoSlots($, tr, method, aliasJa);
        if (!parsed) return;

        // In the "揺れる草むら, 土煙" section, rows are classified by:
        //   - DustCloud: cave/dungeon rows with モグリュー/ドリュウズ exclusively
        //   - PokemonShadow: bridge locations (ホドモエの跳ね橋, ワンダーブリッジ)
        //   - ShakingGrass: everything else
        if (method === 'ShakingGrass' || method === 'DustCloud' || method === 'PokemonShadow') {
          const isDust = isDustCloudRow(parsed.slots);
          const isBridge = POKEMON_SHADOW_LOCATIONS.has(parsed.baseName);
          if (method === 'ShakingGrass' && (isDust || isBridge)) return;
          if (method === 'DustCloud' && !isDust) return;
          if (method === 'PokemonShadow' && !isBridge) return;
        }

        parsedRows.push(parsed);
      });
  }

  const suffixRules = ['Normal', 'ShakingGrass', 'DustCloud'].includes(method)
    ? DUPLICATE_SUFFIX_RULES[version]
    : undefined;
  const grouped = new Map();
  for (const row of parsedRows) {
    const key = row.baseName;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }

  for (const [baseName, rows] of grouped) {
    const resolved = resolveLocationGroup(baseName, rows, {
      version,
      method,
      suffixRules,
    });
    for (const entry of resolved) {
      if (!entry.displayName || !entry.slots?.length) continue;
      const normalizedKey = normalizeLocationKey(entry.displayName);
      const asciiKey = toAsciiLocationKey(normalizedKey);
      locations[asciiKey] = {
        slots: entry.slots.map((s) => enrichSlot(s, version)),
      };
    }
  }

  return {
    version,
    method,
    source: { name: 'Pokebook', url, retrievedAt: todayISO() },
    locations,
  };
}

// ---------------------------------------------------------------------------
// Main execution
// ---------------------------------------------------------------------------

async function scrapeVersionMethod(version, method, overrideUrl) {
  MISSING_SPECIES.clear();
  const url = overrideUrl || SOURCE_MAP[version]?.[method];
  if (!url) {
    console.warn(`[skip] No source URL for ${version}/${method}`);
    return;
  }
  if (!METHODS.includes(method)) {
    console.warn(`[skip] Method ${method} not implemented yet`);
    return;
  }
  console.log(`[fetch] ${version}/${method} -> ${url}`);
  const html = await fetchHtml(url);
  const aliasJa = await loadSpeciesAliasJa();
  const json = parseEncounterPage(html, { version, method, url, aliasJa });
  const outPath = path.resolve('src/data/encounters/generated/v1', version, `${method}.json`);
  await writeJson(outPath, json);
  console.log(`[ok] wrote ${outPath} (${Object.keys(json.locations).length} locations)`);
  if (MISSING_SPECIES.size) {
    console.warn(
      `[warn] Unknown JP species (${MISSING_SPECIES.size}) for ${version}/${method}: ${[...MISSING_SPECIES].join(', ')}`
    );
  }
}

function parseArgs() {
  const get = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
  return {
    version: get('version'),
    method: get('method'),
    url: get('url'),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs();
  const versions = args.version ? [args.version] : VERSIONS;
  const methods = args.method ? [args.method] : METHODS;

  for (const v of versions) {
    for (const m of methods) {
      try {
        await scrapeVersionMethod(v, m, args.url);
      } catch (e) {
        console.error(`[error] ${v}/${m}:`, e.message);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
