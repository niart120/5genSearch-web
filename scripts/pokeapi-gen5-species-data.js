import { mkdir, readFile, writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import { dirname, join } from 'path';
import { tmpdir } from 'os';

export const SPECIES_COUNT = 649;
export const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
export const TARGET_GENERATION_NUMBER = 5;
export const VERSION_KEYS = ['black', 'white', 'black-2', 'white-2'];

export const GENERATION_NUMBER = {
  'generation-i': 1,
  'generation-ii': 2,
  'generation-iii': 3,
  'generation-iv': 4,
  'generation-v': 5,
  'generation-vi': 6,
  'generation-vii': 7,
  'generation-viii': 8,
  'generation-ix': 9,
};

const STAT_KEY_BY_POKEAPI_NAME = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
};

const VERSION_KEY_SET = new Set(VERSION_KEYS);

function cacheFilePath(cacheDir, path) {
  const hash = createHash('sha256').update(path).digest('hex');
  return join(cacheDir, `${hash}.json`);
}

async function readJsonFile(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJsonFile(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, undefined, 2), 'utf8');
}

export function createPokeApiClient({
  baseUrl = POKEAPI_BASE_URL,
  cacheDir = process.env.POKEAPI_CACHE_DIR ?? join(tmpdir(), '5gensearch-pokeapi-cache'),
} = {}) {
  const memoryCache = new Map();
  const pendingRequests = new Map();

  async function get(path) {
    if (memoryCache.has(path)) {
      return memoryCache.get(path);
    }

    if (pendingRequests.has(path)) {
      return pendingRequests.get(path);
    }

    const request = (async () => {
      const cachePath = cacheFilePath(cacheDir, path);
      try {
        const cached = await readJsonFile(cachePath);
        memoryCache.set(path, cached);
        return cached;
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      const url = `${baseUrl}/${path}`;
      const response = await fetch(url, {
        headers: {
          'user-agent': '5genSearch-web data generator',
        },
      });
      if (!response.ok) {
        throw new Error(`PokeAPI request failed: ${response.status} ${response.statusText} ${url}`);
      }
      const body = await response.json();
      await writeJsonFile(cachePath, body);
      memoryCache.set(path, body);
      return body;
    })();

    pendingRequests.set(path, request);
    try {
      return await request;
    } finally {
      pendingRequests.delete(path);
    }
  }

  return {
    cacheDir,
    get,
  };
}

function generationNumber(generation) {
  const value = GENERATION_NUMBER[generation?.name ?? generation];
  if (value === undefined) {
    throw new Error(`Unsupported PokeAPI generation: ${JSON.stringify(generation)}`);
  }
  return value;
}

function localizedNames(resource, fallbackKey) {
  const byLanguage = new Map(
    (resource.names ?? []).map((entry) => [entry.language.name, entry.name])
  );
  return {
    en: byLanguage.get('en') ?? fallbackEnglishName(fallbackKey),
    ja: byLanguage.get('ja-Hrkt') ?? byLanguage.get('ja') ?? byLanguage.get('en') ?? fallbackKey,
  };
}

function fallbackEnglishName(key) {
  return String(key)
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function mapGender(genderRate) {
  if (genderRate === -1) {
    return { type: 'genderless' };
  }
  if (genderRate === 0) {
    return { type: 'fixed', fixed: 'male' };
  }
  if (genderRate === 8) {
    return { type: 'fixed', fixed: 'female' };
  }
  return {
    type: 'ratio',
    femaleThreshold: genderRate * 32,
  };
}

function abilitySlotKey(abilityEntry) {
  if (abilityEntry.is_hidden) {
    return 'hidden';
  }
  if (abilityEntry.slot === 1) {
    return 'ability1';
  }
  if (abilityEntry.slot === 2) {
    return 'ability2';
  }
  throw new Error(`Unsupported PokeAPI ability slot: ${JSON.stringify(abilityEntry)}`);
}

function restoreGen5AbilityRefs(pokemon) {
  const refs = {
    ability1: null,
    ability2: null,
    hidden: null,
  };

  for (const abilityEntry of pokemon.abilities ?? []) {
    refs[abilitySlotKey(abilityEntry)] = abilityEntry.ability;
  }

  const candidates = new Map();
  for (const pastAbilityGroup of pokemon.past_abilities ?? []) {
    const number = generationNumber(pastAbilityGroup.generation);
    if (number < TARGET_GENERATION_NUMBER) {
      continue;
    }

    for (const abilityEntry of pastAbilityGroup.abilities ?? []) {
      const slot = abilitySlotKey(abilityEntry);
      const current = candidates.get(slot);
      if (!current || number < current.generation) {
        candidates.set(slot, {
          generation: number,
          ability: abilityEntry.ability,
        });
      }
    }
  }

  for (const [slot, candidate] of candidates.entries()) {
    refs[slot] = candidate.ability;
  }

  return refs;
}

async function abilitySnapshot(abilityRef, client) {
  if (!abilityRef) {
    return null;
  }
  const ability = await client.get(`ability/${abilityRef.name}`);
  return {
    key: ability.name,
    names: localizedNames(ability, ability.name),
  };
}

async function restoreGen5Abilities(pokemon, client) {
  const refs = restoreGen5AbilityRefs(pokemon);
  const [ability1, ability2, hidden] = await Promise.all([
    abilitySnapshot(refs.ability1, client),
    abilitySnapshot(refs.ability2, client),
    abilitySnapshot(refs.hidden, client),
  ]);
  return { ability1, ability2, hidden };
}

function restoreGen5BaseStats(pokemon) {
  const values = new Map();
  for (const statEntry of pokemon.stats ?? []) {
    if (STAT_KEY_BY_POKEAPI_NAME[statEntry.stat.name]) {
      values.set(statEntry.stat.name, statEntry.base_stat);
    }
  }

  const candidates = new Map();
  for (const pastStatGroup of pokemon.past_stats ?? []) {
    const number = generationNumber(pastStatGroup.generation);
    if (number < TARGET_GENERATION_NUMBER) {
      continue;
    }

    for (const pastStat of pastStatGroup.stats ?? []) {
      const statName = pastStat.stat.name;
      if (statName === 'special' || !STAT_KEY_BY_POKEAPI_NAME[statName]) {
        continue;
      }

      const current = candidates.get(statName);
      if (!current || number < current.generation) {
        candidates.set(statName, {
          generation: number,
          value: pastStat.base_stat,
        });
      }
    }
  }

  for (const [statName, candidate] of candidates.entries()) {
    values.set(statName, candidate.value);
  }

  return {
    hp: requiredStat(values, 'hp'),
    attack: requiredStat(values, 'attack'),
    defense: requiredStat(values, 'defense'),
    specialAttack: requiredStat(values, 'special-attack'),
    specialDefense: requiredStat(values, 'special-defense'),
    speed: requiredStat(values, 'speed'),
  };
}

function requiredStat(values, key) {
  const value = values.get(key);
  if (value === undefined) {
    throw new Error(`Missing PokeAPI stat: ${key}`);
  }
  return value;
}

async function itemSnapshot(itemRef, client) {
  const item = await client.get(`item/${itemRef.name}`);
  return {
    key: item.name,
    names: localizedNames(item, item.name),
  };
}

async function restoreGen5HeldItems(pokemon, client) {
  const heldItems = Object.fromEntries(VERSION_KEYS.map((version) => [version, []]));

  for (const heldItem of pokemon.held_items ?? []) {
    const details = (heldItem.version_details ?? []).filter((detail) =>
      VERSION_KEY_SET.has(detail.version.name)
    );
    if (details.length === 0) {
      continue;
    }

    const item = await itemSnapshot(heldItem.item, client);
    for (const detail of details) {
      heldItems[detail.version.name].push({
        key: item.key,
        names: item.names,
        rarity: detail.rarity,
      });
    }
  }

  return heldItems;
}

export async function buildGen5SpeciesSnapshot(speciesId, client) {
  const [pokemon, pokemonSpecies] = await Promise.all([
    client.get(`pokemon/${speciesId}`),
    client.get(`pokemon-species/${speciesId}`),
  ]);

  const [abilities, heldItems] = await Promise.all([
    restoreGen5Abilities(pokemon, client),
    restoreGen5HeldItems(pokemon, client),
  ]);

  return {
    nationalDex: speciesId,
    names: localizedNames(pokemonSpecies, pokemonSpecies.name),
    gender: mapGender(pokemonSpecies.gender_rate),
    baseStats: restoreGen5BaseStats(pokemon),
    abilities,
    heldItems,
  };
}

export async function buildGen5SpeciesData({
  client = createPokeApiClient(),
  concurrency = Number(process.env.POKEAPI_CONCURRENCY ?? 6),
  onProgress,
} = {}) {
  const speciesIds = Array.from({ length: SPECIES_COUNT }, (_, index) => index + 1);
  const results = await mapLimit(speciesIds, concurrency, async (speciesId) => {
    const snapshot = await buildGen5SpeciesSnapshot(speciesId, client);
    onProgress?.(speciesId);
    return [String(speciesId), snapshot];
  });

  results.sort((a, b) => Number(a[0]) - Number(b[0]));

  return Object.fromEntries(results);
}

async function mapLimit(items, concurrency, mapper) {
  const results = Array.from({ length: items.length });
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export function formatSpeciesDataJson(data) {
  return `${JSON.stringify(data, undefined, 2)}\n`;
}

function abilityKey(ability) {
  return ability?.key ?? null;
}

function abilityLabel(ability) {
  if (!ability) {
    return '`null`';
  }
  return `\`${ability.key}\` / ${ability.names.ja}`;
}

export function collectGen5SpeciesDataDiffs(actualData, expectedData) {
  const abilityDiffs = [];
  const statDiffs = [];
  const heldItemDiffs = [];

  for (let speciesId = 1; speciesId <= SPECIES_COUNT; speciesId += 1) {
    const key = String(speciesId);
    const actual = actualData[key];
    const expected = expectedData[key];

    if (!actual) {
      abilityDiffs.push({
        speciesId,
        speciesName: expected.names,
        slot: 'species',
        actual: '`missing`',
        expected: '`present`',
      });
      continue;
    }

    for (const slot of ['ability1', 'ability2', 'hidden']) {
      const actualAbility = actual.abilities?.[slot] ?? null;
      const expectedAbility = expected.abilities?.[slot] ?? null;
      if (abilityKey(actualAbility) !== abilityKey(expectedAbility)) {
        abilityDiffs.push({
          speciesId,
          speciesName: expected.names,
          slot,
          actual: abilityLabel(actualAbility),
          expected: abilityLabel(expectedAbility),
        });
      }
    }

    for (const stat of Object.values(STAT_KEY_BY_POKEAPI_NAME)) {
      const actualValue = actual.baseStats?.[stat];
      const expectedValue = expected.baseStats[stat];
      if (actualValue !== expectedValue) {
        statDiffs.push({
          speciesId,
          speciesName: expected.names,
          stat,
          actual: actualValue,
          expected: expectedValue,
        });
      }
    }

    for (const version of VERSION_KEYS) {
      const actualItems = normalizeHeldItems(actual.heldItems?.[version] ?? []);
      const expectedItems = normalizeHeldItems(expected.heldItems?.[version] ?? []);
      if (actualItems.key !== expectedItems.key) {
        heldItemDiffs.push({
          speciesId,
          speciesName: expected.names,
          version,
          actual: actualItems.label,
          expected: expectedItems.label,
        });
      }
    }
  }

  return { abilityDiffs, statDiffs, heldItemDiffs };
}

export function formatDiffsAsMarkdown({ abilityDiffs, statDiffs, heldItemDiffs }) {
  const lines = [];

  if (abilityDiffs.length > 0) {
    lines.push(`## 特性差分 (${abilityDiffs.length}件)`, '');
    lines.push('| 全国図鑑番号 | 種族 | スロット | 現行値 | 第5世代値 |');
    lines.push('|--------------|------|----------|--------|-----------|');
    for (const diff of abilityDiffs) {
      lines.push(
        `| ${diff.speciesId} | ${diff.speciesName.ja} / ${diff.speciesName.en} | ${diff.slot} | ${diff.actual} | ${diff.expected} |`
      );
    }
    lines.push('');
  }

  if (statDiffs.length > 0) {
    lines.push(`## 種族値差分 (${statDiffs.length}件)`, '');
    lines.push('| 全国図鑑番号 | 種族 | 種族値 | 現行値 | 第5世代値 |');
    lines.push('|--------------|------|--------|--------|-----------|');
    for (const diff of statDiffs) {
      lines.push(
        `| ${diff.speciesId} | ${diff.speciesName.ja} / ${diff.speciesName.en} | \`${diff.stat}\` | ${diff.actual} | ${diff.expected} |`
      );
    }
    lines.push('');
  }

  if (heldItemDiffs.length > 0) {
    lines.push(`## 所持アイテム差分 (${heldItemDiffs.length}件)`, '');
    lines.push('| 全国図鑑番号 | 種族 | バージョン | 現行値 | 第5世代値 |');
    lines.push('|--------------|------|------------|--------|-----------|');
    for (const diff of heldItemDiffs) {
      lines.push(
        `| ${diff.speciesId} | ${diff.speciesName.ja} / ${diff.speciesName.en} | ${diff.version} | ${diff.actual} | ${diff.expected} |`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

function normalizeHeldItems(items) {
  const normalized = items
    .map((item) => ({
      key: item.key,
      rarity: item.rarity,
      label: `\`${item.key}\`:${item.rarity}`,
    }))
    .sort((a, b) => b.rarity - a.rarity || a.key.localeCompare(b.key));

  return {
    key: normalized.map((item) => `${item.key}:${item.rarity}`).join(','),
    label: normalized.length === 0 ? '`none`' : normalized.map((item) => item.label).join(', '),
  };
}
