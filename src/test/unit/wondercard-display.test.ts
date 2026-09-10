import { describe, expect, it, vi } from 'vitest';
import { getWonderCardDisplays } from '@/data/wondercards/display';
import type { WonderCardEntry } from '@/data/wondercards/schema';

// WASMの名前データ自体はブラウザ統合テストで照合する。
vi.mock('@/wasm/wasm_pkg.js', () => ({
  get_species_name: (id: number, locale: string) => `${locale}-species-${id}`,
}));

function card(id: string, tid?: number): WonderCardEntry {
  const common: Omit<WonderCardEntry, 'kind' | 'trainer'> = {
    id,
    language: 'en',
    cardTitle: 'Original Title!',
    speciesId: 25,
    level: 1,
    versions: ['Black'],
    fixedIvs: {},
    shinyPolicy: 'Never',
  };
  return tid === undefined
    ? { ...common, kind: 'egg' }
    : { ...common, kind: 'pokemon', trainer: { tid, sid: 0 } };
}

describe('wondercard display candidates', () => {
  it('通常配布とタマゴの基本表示を共通化しタイトルを変換しない', () => {
    for (const kind of [card('egg'), card('pokemon', 3013)]) {
      expect(getWonderCardDisplays([kind], 'ja')).toEqual([
        { id: kind.id, label: 'ja-species-25（Original Title!）' },
      ]);
      expect(getWonderCardDisplays([kind], 'en')[0].label).toBe('en-species-25（Original Title!）');
    }
  });
  it('同タイトルの通常配布は5桁TIDで区別する', () => {
    const displays = getWonderCardDisplays([card('one', 0), card('two', 3013)], 'ja');
    expect(displays.map((display) => display.trainerLabel)).toEqual(['TID: 00000', 'TID: 03013']);
    expect(displays.every((display) => display.disambiguationId === undefined)).toBe(true);
  });
  it('同TID・異SIDや同条件の配布は内部IDも返す', () => {
    const sameTid: WonderCardEntry = {
      ...card('two'),
      kind: 'pokemon',
      trainer: { tid: 3013, sid: 7 },
    };
    const displays = getWonderCardDisplays([card('one', 3013), sameTid, card('three', 9999)], 'ja');
    expect(displays.map((display) => display.disambiguationId)).toEqual(['one', 'two', undefined]);
  });
  it('重複タマゴは受取人情報を使わず内部IDで区別する', () => {
    const cards = [card('egg-one'), card('egg-two')];
    const before = structuredClone(cards);
    const displays = getWonderCardDisplays(cards, 'ja');
    expect(displays.map((display) => display.disambiguationId)).toEqual(['egg-one', 'egg-two']);
    expect(displays.every((display) => display.trainerLabel === undefined)).toBe(true);
    expect(cards).toEqual(before);
  });
  it('通常配布とタマゴが同名なら配布区分に従って補助情報を返す', () => {
    expect(getWonderCardDisplays([card('pokemon', 1), card('egg')], 'ja')).toEqual([
      { id: 'pokemon', label: 'ja-species-25（Original Title!）', trainerLabel: 'TID: 00001' },
      { id: 'egg', label: 'ja-species-25（Original Title!）', disambiguationId: 'egg' },
    ]);
  });
  it('空配列・同タイトル別種族・絞り込み後の候補を処理する', () => {
    expect(getWonderCardDisplays([], 'ja')).toEqual([]);
    const cards = [card('one', 0), { ...card('two', 0), speciesId: 26 }];
    expect(
      getWonderCardDisplays(cards, 'ja').every((display) => display.trainerLabel === undefined)
    ).toBe(true);
    expect(getWonderCardDisplays([card('one', 3013)], 'ja')[0].trainerLabel).toBeUndefined();
  });
});
