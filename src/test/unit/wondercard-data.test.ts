import { describe, expect, it } from 'vitest';
import {
  getWonderCard,
  loadWonderCards,
  normalizeWonderCardCatalogs,
} from '@/data/wondercards/loader';
import { toWonderCardParams } from '@/data/wondercards/converter';
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
} from '@/wasm/wasm_pkg.js';

function card(): WonderCardEntry {
  return {
    id: 'test',
    displayName: { ja: 'テスト', en: 'Test' },
    versions: ['Black'],
    kind: 'egg',
    speciesId: 25,
    level: 1,
    fixedIvs: { hp: 0, atk: 1, def: 2, spa: 3, spd: 4, spe: 5 },
    shinyPolicy: 'Never',
  };
}

function catalog(): WonderCardCatalogJson {
  return {
    source: { name: 'Test', url: 'https://example.com/card', retrievedAt: '2026-09-10' },
    entries: [card()],
  };
}

describe('wondercard catalog and conversion', () => {
  it('同梱カードの ID・表示名・対象 ROM を検証して読み込む', async () => {
    const cards = await loadWonderCards();
    expect(cards.length).toBeGreaterThan(0);
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
    const bw2Cards = await loadWonderCards('Black2');
    expect(bw2Cards.map((c) => c.id)).toEqual(['spring-2013-meloetta']);
  });

  it('消えた ID と対象外 ROM を拒否する', async () => {
    await expect(getWonderCard('missing', 'Black')).rejects.toThrow('unavailable');
    await expect(getWonderCard('secret-egg-pidove', 'Black2')).rejects.toThrow('unavailable');
  });

  it('返したカードへの変更でキャッシュを変更しない', async () => {
    const cards = await loadWonderCards();
    cards[0].displayName.ja = 'changed';
    const reloaded = await loadWonderCards();
    expect(reloaded[0].displayName.ja).not.toBe('changed');
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

  it('null は読み込み境界で undefined にし、省略をランダム条件へ変換する', () => {
    const data = catalog();
    /* eslint-disable unicorn/no-null -- JSON 境界での null 正規化を検証する。 */
    data.entries[0] = {
      ...data.entries[0],
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
    expect(data.entries[0].fixedNature).toBeNull();
  });

  it('重複 ID・空の表示名・対象 ROM を拒否する', () => {
    const data = catalog();
    expect(() => normalizeWonderCardCatalogs([data, data])).toThrow('Duplicate');
    data.entries[0].displayName.en = '';
    expect(() => normalizeWonderCardCatalogs([data])).toThrow('display name');
    data.entries[0].displayName.en = 'Test';
    data.entries[0].versions = [];
    expect(() => normalizeWonderCardCatalogs([data])).toThrow('versions');
  });

  it('JSON に不正な trainer を同梱すると検出する', () => {
    const data = catalog();
    Object.assign(data.entries[0], { trainer: { tid: 0, sid: 0 } });
    expect(() => normalizeWonderCardCatalogs([data])).toThrow('trainer');
    Object.assign(data.entries[0], { kind: 'pokemon', trainer: undefined });
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
