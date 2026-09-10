import type { RomVersion } from '@/wasm/wasm_pkg.js';
import type { WonderCardCatalogJson, WonderCardEntry } from './schema';

const modules = import.meta.glob<WonderCardCatalogJson>('./data/v1/*.json', { import: 'default' });
const versions = new Set<RomVersion>(['Black', 'White', 'Black2', 'White2']);

/** メタデータと配布区分を検証する。乱数条件の値域・整合性は Rust が検証する。 */
export function normalizeWonderCardCatalogs(catalogs: WonderCardCatalogJson[]): WonderCardEntry[] {
  const ids = new Set<string>();
  return catalogs.flatMap((catalog) => {
    if (
      !catalog.source?.name?.trim() ||
      !URL.canParse(catalog.source.url) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(catalog.source.retrievedAt)
    ) {
      throw new Error('Invalid wondercard source');
    }
    return catalog.entries.map((card): WonderCardEntry => {
      if (!card.id?.trim() || ids.has(card.id))
        throw new Error(`Duplicate or missing wondercard ID: ${card.id}`);
      ids.add(card.id);
      if (!card.displayName?.ja?.trim() || !card.displayName.en?.trim())
        throw new Error(`Missing wondercard display name: ${card.id}`);
      if (
        !card.versions?.length ||
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
      const common = {
        id: card.id,
        displayName: { ...card.displayName },
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
  });
}

let catalogPromise: Promise<WonderCardEntry[]> | undefined;

/** 初回だけ読み込み、呼び出し側の編集がカタログへ波及しないよう複製を返す。 */
export async function loadWonderCards(version?: RomVersion): Promise<WonderCardEntry[]> {
  catalogPromise ??= Promise.all(Object.values(modules).map((load) => load()))
    .then(normalizeWonderCardCatalogs)
    .catch((error: Error) => {
      catalogPromise = undefined;
      throw error;
    });
  const cards = await catalogPromise;
  return structuredClone(version ? cards.filter((card) => card.versions.includes(version)) : cards);
}

/** 消えたカードや対象外 ROM を別のカードへ置換しない。 */
export async function getWonderCard(id: string, version: RomVersion): Promise<WonderCardEntry> {
  const cards = await loadWonderCards(version);
  const card = cards.find((entry) => entry.id === id);
  if (!card) throw new Error(`Wondercard unavailable for ${version}: ${id}`);
  return card;
}
