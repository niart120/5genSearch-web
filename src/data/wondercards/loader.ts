import type { RomRegion, RomVersion } from '@/wasm/wasm_pkg.js';
import { WONDER_CARD_LANGUAGES } from './schema';
import type { WonderCardCatalogJson, WonderCardEntry, WonderCardLanguage } from './schema';

const modules = import.meta.glob<WonderCardCatalogJson>('./generated/v1/**/*.json', {
  import: 'default',
});
const versions = new Set<RomVersion>(['Black', 'White', 'Black2', 'White2']);
const regionLanguages: Record<RomRegion, WonderCardLanguage> = {
  Jpn: 'ja',
  Usa: 'en',
  Fra: 'fr',
  Ger: 'de',
  Ita: 'it',
  Spa: 'es',
  Kor: 'ko',
};

/** アプリの表示言語ではなく、受取側ROMのリージョンから選ぶ。 */
export function getWonderCardLanguage(region: RomRegion): WonderCardLanguage {
  return regionLanguages[region];
}

function catalogLanguage(path: string): WonderCardLanguage {
  const match = /^\.\/generated\/v1\/([^/]+)\/[^/]+\.json$/.exec(path);
  const language = WONDER_CARD_LANGUAGES.find((value) => value === match?.[1]);
  if (!language) throw new Error(`Invalid wondercard language folder: ${path}`);
  return language;
}

/** メタデータと配布区分を検証する。乱数条件の値域・整合性は Rust が検証する。 */
export function normalizeWonderCardCatalogs(
  catalogs: { path: string; catalog: WonderCardCatalogJson }[]
): WonderCardEntry[] {
  const ids = new Set<string>();
  return catalogs.map(({ path, catalog }) => {
    const language = catalogLanguage(path);
    if (!Array.isArray(catalog.entries) || catalog.entries.length !== 1) {
      throw new Error(`Expected one wondercard entry: ${path}`);
    }
    const card = catalog.entries[0];
    if (typeof card.id !== 'string' || !card.id.trim() || ids.has(card.id)) {
      throw new Error(`Duplicate or missing wondercard ID: ${card.id}`);
    }
    ids.add(card.id);
    if (typeof card.cardTitle !== 'string' || !card.cardTitle.trim()) {
      throw new Error(`Missing wondercard card title: ${card.id}`);
    }
    if (
      !Array.isArray(card.versions) ||
      card.versions.length === 0 ||
      card.versions.some((version) => !versions.has(version)) ||
      new Set(card.versions).size !== card.versions.length
    ) {
      throw new Error(`Invalid wondercard versions: ${card.id}`);
    }
    if (
      (card.kind !== 'pokemon' && card.kind !== 'egg') ||
      (card.kind === 'pokemon' &&
        (typeof card.trainer?.tid !== 'number' || typeof card.trainer?.sid !== 'number')) ||
      (card.kind === 'egg' && 'trainer' in card)
    ) {
      throw new Error(`Invalid wondercard trainer: ${card.id}`);
    }
    if (!card.fixedIvs || typeof card.fixedIvs !== 'object' || Array.isArray(card.fixedIvs)) {
      throw new Error(`Invalid wondercard fixed IVs: ${card.id}`);
    }
    const common = {
      id: card.id,
      language,
      cardTitle: card.cardTitle,
      versions: [...card.versions],
      speciesId: card.speciesId,
      level: card.level,
      shinyPolicy: card.shinyPolicy,
      fixedIvs: {
        hp: card.fixedIvs.hp ?? undefined,
        atk: card.fixedIvs.atk ?? undefined,
        def: card.fixedIvs.def ?? undefined,
        spa: card.fixedIvs.spa ?? undefined,
        spd: card.fixedIvs.spd ?? undefined,
        spe: card.fixedIvs.spe ?? undefined,
      },
      fixedNature: card.fixedNature ?? undefined,
      fixedGender: card.fixedGender ?? undefined,
      fixedAbilitySlot: card.fixedAbilitySlot ?? undefined,
    };
    return card.kind === 'pokemon'
      ? { ...common, kind: 'pokemon', trainer: { ...card.trainer } }
      : { ...common, kind: 'egg' };
  });
}

const sources = Object.entries(modules).map(([path, load]) => ({
  path,
  load,
  language: catalogLanguage(path),
}));
const catalogs = new Map<WonderCardLanguage, Promise<WonderCardEntry[]>>();

/** 言語ごとに初回だけ読み込み、呼び出し側の編集がキャッシュへ波及しないよう複製する。 */
export async function loadWonderCards(
  language: WonderCardLanguage,
  version?: RomVersion
): Promise<WonderCardEntry[]> {
  if (!WONDER_CARD_LANGUAGES.includes(language))
    throw new Error(`Invalid wondercard language: ${language}`);
  let promise = catalogs.get(language);
  if (!promise) {
    promise = Promise.all(
      sources
        .filter((source) => source.language === language)
        .map(async ({ path, load }) => ({ path, catalog: await load() }))
    )
      .then(normalizeWonderCardCatalogs)
      .catch((error: Error) => {
        catalogs.delete(language);
        throw error;
      });
    catalogs.set(language, promise);
  }
  const cards = await promise;
  return structuredClone(version ? cards.filter((card) => card.versions.includes(version)) : cards);
}

/** 消えたカード、言語不一致、対象外ROMを別のカードへ置換しない。 */
export async function getWonderCard(
  id: string,
  language: WonderCardLanguage,
  version: RomVersion
): Promise<WonderCardEntry> {
  const cards = await loadWonderCards(language, version);
  const card = cards.find((entry) => entry.id === id);
  if (!card) throw new Error(`Wondercard unavailable for ${language}/${version}: ${id}`);
  return card;
}
