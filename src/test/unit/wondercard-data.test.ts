import { describe, expect, it } from 'vitest';
import {
  getWonderCard,
  getWonderCardLanguage,
  loadWonderCards,
  normalizeWonderCardCatalogs,
} from '@/data/wondercards/loader';
import { toWonderCardParams } from '@/data/wondercards/converter';
import { WONDER_CARD_LANGUAGES } from '@/data/wondercards/schema';
import type { WonderCardCatalogJson, WonderCardEntry } from '@/data/wondercards/schema';
import {
  isGeneratedWonderCardData,
  isGeneratedPokemonData,
  isGeneratedEggData,
  flattenBatchResults,
} from '@/services/batch-utils';
import type {
  GeneratedWonderCardData,
  GeneratedPokemonData,
  GeneratedEggData,
  RomRegion,
} from '@/wasm/wasm_pkg.js';

function card(): WonderCardEntry {
  return {
    id: 'en-test',
    cardTitle: 'Test title',
    language: 'en',
    versions: ['Black'],
    kind: 'egg',
    speciesId: 25,
    level: 1,
    fixedIvs: { hp: 0, atk: 1, def: 2, spa: 3, spd: 4, spe: 5 },
    shinyPolicy: 'Never',
  };
}
function catalog(): { path: string; catalog: WonderCardCatalogJson } {
  const { language: _language, ...entry } = card();
  return { path: './generated/v1/en/en-test.json', catalog: { entries: [entry] } };
}
const meloettaId = 'en-0129-bwb2w2-spr2013-meloetta-eng';
const pidoveId = 'en-0029-bw-trainer-pidove-egg-eng';

describe('wondercard catalog and conversion', () => {
  it('全言語の製品カタログを検証し ID の一意性を確認する', async () => {
    const languages = await Promise.all(
      WONDER_CARD_LANGUAGES.map((language) => loadWonderCards(language))
    );
    const cards = languages.flat();
    expect(cards.length).toBe(700);
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
    for (const [index, language] of WONDER_CARD_LANGUAGES.entries()) {
      expect(languages[index].length).toBeGreaterThan(0);
      expect(languages[index].every((c) => c.language === language)).toBe(true);
    }
  });
  it('対象ソフトで絞り込み、B/Wの単独配布を区別する', async () => {
    const bw2 = await loadWonderCards('en', 'Black2');
    expect(bw2.some((c) => c.id === meloettaId)).toBe(true);
    expect(bw2.some((c) => c.id === pidoveId)).toBe(false);
    const zekrom = await getWonderCard('en-0033-b-spr2012-zekrom-eng', 'en', 'Black');
    expect(zekrom.versions).toEqual(['Black']);
    await expect(getWonderCard(zekrom.id, 'en', 'White')).rejects.toThrow('unavailable');
  });
  it('消えた ID・対象外 ROM・言語不一致を拒否する', async () => {
    await expect(getWonderCard('missing', 'en', 'Black')).rejects.toThrow('unavailable');
    await expect(getWonderCard(pidoveId, 'en', 'Black2')).rejects.toThrow('unavailable');
    await expect(getWonderCard(meloettaId, 'ja', 'Black')).rejects.toThrow('unavailable');
  });
  it('ROMリージョンを対象言語へ対応させる', () => {
    const regions: RomRegion[] = ['Jpn', 'Usa', 'Fra', 'Ger', 'Ita', 'Spa', 'Kor'];
    expect(regions.map((region) => getWonderCardLanguage(region))).toEqual(WONDER_CARD_LANGUAGES);
  });
  it('返したカードの表示材料・対象ソフト・生成条件への変更をキャッシュへ波及させない', async () => {
    const before = await getWonderCard(meloettaId, 'en', 'Black');
    const changed = await getWonderCard(meloettaId, 'en', 'Black');
    changed.cardTitle = 'changed';
    changed.versions.length = 0;
    changed.fixedIvs.hp = 31;
    if (changed.kind === 'pokemon') changed.trainer.tid = 1;
    expect(await getWonderCard(meloettaId, 'en', 'Black')).toEqual(before);
  });
  it('固定値 0 と H/A/B/C/D/S 順を保持し、配布タマゴに受取人 ID を使う', () => {
    const recipient = { tid: 0, sid: 0 };
    const original = card();
    const before = structuredClone(original);
    const result = toWonderCardParams(original, recipient);
    expect(result.fixed_ivs).toEqual([0, 1, 2, 3, 4, 5]);
    expect(result.trainer).toEqual(recipient);
    result.trainer.tid = 1;
    result.fixed_ivs[0] = 31;
    expect(original).toEqual(before);
    expect(recipient).toEqual({ tid: 0, sid: 0 });
    expect(result).not.toHaveProperty('cardTitle');
    expect(result).not.toHaveProperty('language');
    expect(result).not.toHaveProperty('id');
  });
  it('通常配布では受取人が未入力でもカードの ID を使う', () => {
    const original: WonderCardEntry = { ...card(), kind: 'pokemon', trainer: { tid: 0, sid: 7 } };
    expect(toWonderCardParams(original).trainer).toEqual({ tid: 0, sid: 7 });
    expect(toWonderCardParams(original, { tid: 123, sid: 456 }).trainer).toEqual({
      tid: 0,
      sid: 7,
    });
    expect(() => toWonderCardParams(card())).toThrow('Recipient');
  });
  it('null は境界で undefined にし省略をランダム条件へ変換する', () => {
    const data = catalog();
    /* eslint-disable unicorn/no-null -- JSON 境界での null 正規化を検証する。 */
    data.catalog.entries[0] = {
      ...data.catalog.entries[0],
      fixedIvs: { hp: 0, atk: null },
      fixedNature: null,
      fixedGender: null,
      fixedAbilitySlot: null,
    };
    /* eslint-enable unicorn/no-null */
    const [normalized] = normalizeWonderCardCatalogs([data]);
    const result = toWonderCardParams(normalized, { tid: 0, sid: 0 });
    expect(result.fixed_ivs).toEqual([0, undefined, undefined, undefined, undefined, undefined]);
    expect(result.fixed_nature).toBeUndefined();
    expect(result.fixed_gender).toBeUndefined();
    expect(result.fixed_ability_slot).toBeUndefined();
    expect(data.catalog.entries[0].fixedNature).toBeNull();
  });
  it('重複 ID・空タイトル・重複または空の対象ソフトを拒否する', () => {
    const data = catalog();
    expect(() => normalizeWonderCardCatalogs([data, data])).toThrow('Duplicate');
    data.catalog.entries[0].cardTitle = '　';
    expect(() => normalizeWonderCardCatalogs([data])).toThrow('card title');
    data.catalog.entries[0].cardTitle = 'Test';
    data.catalog.entries[0].versions = [];
    expect(() => normalizeWonderCardCatalogs([data])).toThrow('versions');
    data.catalog.entries[0].versions = ['Black', 'Black'];
    expect(() => normalizeWonderCardCatalogs([data])).toThrow('versions');
  });
  it('単一 entries・言語フォルダ・必須の固定個体値オブジェクトを検証する', () => {
    for (const path of [
      './generated/v1/jp/test.json',
      './data/v1/test.json',
      './generated/v1/en/nested/test.json',
    ]) {
      expect(() => normalizeWonderCardCatalogs([{ ...catalog(), path }])).toThrow(
        'language folder'
      );
    }
    const empty = catalog();
    empty.catalog.entries.pop();
    expect(() => normalizeWonderCardCatalogs([empty])).toThrow('one wondercard');
    const multiple = catalog();
    multiple.catalog.entries.push(multiple.catalog.entries[0]);
    expect(() => normalizeWonderCardCatalogs([multiple])).toThrow('one wondercard');
    const noIvs = catalog();
    Object.assign(noIvs.catalog.entries[0], { fixedIvs: undefined });
    expect(() => normalizeWonderCardCatalogs([noIvs])).toThrow('fixed IVs');
  });
  it('JSON に不正な trainer を同梱すると検出する', () => {
    const data = catalog();
    Object.assign(data.catalog.entries[0], { trainer: { tid: 0, sid: 0 } });
    expect(() => normalizeWonderCardCatalogs([data])).toThrow('trainer');
    Object.assign(data.catalog.entries[0], { kind: 'pokemon', trainer: undefined });
    expect(() => normalizeWonderCardCatalogs([data])).toThrow('trainer');
  });
});

describe('wondercard result discrimination', () => {
  const wondercard: GeneratedWonderCardData = {
    advance: 0,
    needle_direction: 'N',
    source: { Seed: { base_seed: 0n, mt_seed: 0 } },
    core: {
      pid: 0,
      nature: 'Hardy',
      ability_slot: 'First',
      gender: 'Female',
      shiny_type: 'None',
      ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      species_id: 25,
      level: 1,
      stats: { hp: 11, attack: 5, defense: 5, special_attack: 5, special_defense: 5, speed: 6 },
    },
  };
  const pokemon: GeneratedPokemonData = {
    ...wondercard,
    sync_applied: false,
    held_item_slot: 'None',
    moving_encounter: undefined,
    special_encounter: undefined,
    encounter_result: { type: 'Pokemon' },
  };
  const egg: GeneratedEggData = {
    ...wondercard,
    inheritance: [
      { stat: 0, parent: 0 },
      { stat: 1, parent: 1 },
      { stat: 2, parent: 0 },
    ],
    margin_frames: undefined,
  };

  it('通常個体・育て屋タマゴを配達員として受け付けず、他の型ガードも配達員を除外する', () => {
    expect(isGeneratedWonderCardData(wondercard)).toBe(true);
    expect(isGeneratedWonderCardData(pokemon)).toBe(false);
    expect(isGeneratedWonderCardData(egg)).toBe(false);
    expect(isGeneratedPokemonData(wondercard)).toBe(false);
    expect(isGeneratedEggData(wondercard)).toBe(false);
    expect(
      flattenBatchResults<GeneratedWonderCardData>(
        [[pokemon], [], [egg], [wondercard]],
        isGeneratedWonderCardData
      )
    ).toEqual([wondercard]);
  });
});
