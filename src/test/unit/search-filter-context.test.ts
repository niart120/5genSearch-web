import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IV_RANGES,
  getPokemonFilterVisibility,
  normalizePokemonFilter,
  normalizePokemonSearchFilter,
  normalizeEggFilter,
  normalizeIvFilter,
} from '@/lib/search-filter-context';
import type { EncounterSlotConfig, EncounterType } from '@/wasm/wasm_pkg.js';
import { getEggListInitialState } from '@/features/egg-list/store';

const slot: EncounterSlotConfig = {
  species_id: 494,
  level_min: 15,
  level_max: 15,
  gender_ratio: 'Genderless',
  shiny_locked: true,
  has_held_item: false,
};
const context = { encounterType: 'StaticSymbol' as const, slots: [slot] };

describe('対象に応じた適用条件', () => {
  it('ビクティニに対する隠れた種族・レベル・性別・色違い・夢特性・持ち物を除外する', () => {
    const input = {
      species_ids: [1],
      level_range: [30, 40] as [number, number],
      gender: 'Male' as const,
      shiny: 'Shiny' as const,
      ability_slot: 'Hidden' as const,
      held_item_slots: ['Rare' as const],
    };
    expect(normalizePokemonFilter(input, undefined, context, 'ivs')).toBeUndefined();
    expect(input.level_range).toEqual([30, 40]);
  });
  it.each(['Genderless', 'MaleOnly', 'FemaleOnly'] as const)(
    '固定・徘徊の %s だけ性別欄を隠す',
    (gender_ratio) => {
      expect(
        getPokemonFilterVisibility({ ...context, slots: [{ ...slot, gender_ratio }] }).gender
      ).toBe(false);
      expect(
        getPokemonFilterVisibility({ encounterType: 'Normal', slots: [{ ...slot, gender_ratio }] })
          .gender
      ).toBe(true);
    }
  );
  it('ヒードラン相当の性別と色違い条件は残す', () => {
    expect(
      normalizePokemonSearchFilter(
        { gender: 'Female', shiny: 'Shiny' },
        {
          ...context,
          slots: [{ ...slot, gender_ratio: 'F1M1', shiny_locked: false }],
        }
      )
    ).toMatchObject({ gender: 'Female', shiny: 'Shiny' });
  });
  it('野生ではスロットのブロックフラグを色違い欄の判定に使わない', () => {
    expect(getPokemonFilterVisibility({ ...context, encounterType: 'Normal' }).shiny).toBe(true);
  });
  it.each([
    'Normal',
    'ShakingGrass',
    'Surfing',
    'SurfingBubble',
    'Fishing',
    'FishingBubble',
    'DustCloud',
    'PokemonShadow',
  ] satisfies EncounterType[])('%s で持ち物を除外する', (encounterType) => {
    expect(
      normalizePokemonFilter(
        { held_item_slots: ['VeryRare'] },
        undefined,
        { ...context, encounterType },
        'ivs'
      )
    ).toBeUndefined();
  });
  it('砂煙 ItemOnly は個体条件を除外し、釣りへ変えると ItemOnly だけ不適用にする', () => {
    const input = {
      gender: 'Female' as const,
      encounter_result_filter: 'ItemOnly' as const,
      special_encounter_triggered: true,
    };
    expect(
      normalizePokemonFilter(input, undefined, { ...context, encounterType: 'DustCloud' }, 'ivs')
    ).toMatchObject({
      gender: undefined,
      encounter_result_filter: 'ItemOnly',
      special_encounter_triggered: true,
    });
    expect(
      normalizePokemonFilter(input, undefined, { ...context, encounterType: 'Fishing' }, 'ivs')
    ).toMatchObject({
      gender: 'Female',
      encounter_result_filter: undefined,
      special_encounter_triggered: undefined,
    });
  });
  it('表示モードで個体値と実数値を排他的に適用する', () => {
    const input = { iv: { ...DEFAULT_IV_RANGES, hp: [31, 31] as [number, number] } };
    const stats = {
      hp: 100,
      atk: undefined,
      def: undefined,
      spa: undefined,
      spd: undefined,
      spe: undefined,
    };
    expect(normalizePokemonFilter(input, stats, context, 'stats')).toMatchObject({
      iv: undefined,
      stats,
    });
    expect(normalizePokemonFilter(input, stats, context, 'ivs')).toMatchObject({
      iv: input.iv,
      stats: undefined,
    });
  });
  it('全体無効中は実数値を含む全条件を除外する', () => {
    expect(
      normalizePokemonFilter(
        { enabled: false },
        { hp: 100, atk: undefined, def: undefined, spa: undefined, spd: undefined, spe: undefined },
        context,
        'stats'
      )
    ).toBeUndefined();
  });
  it('タマゴの夢特性・猶予・種族未指定の実数値を除外する', () => {
    const params = getEggListInitialState().eggParams;
    const input = { ability_slot: 'Hidden' as const, min_margin_frames: 0 };
    expect(
      normalizeEggFilter(
        input,
        { hp: 100, atk: undefined, def: undefined, spa: undefined, spd: undefined, spe: undefined },
        params,
        'stats'
      )
    ).toBeUndefined();
    expect(
      normalizeEggFilter(input, undefined, {
        ...params,
        female_ability_slot: 'Hidden',
        consider_npc: true,
      })
    ).toMatchObject(input);
    expect(
      normalizeEggFilter(input, undefined, {
        ...params,
        female_ability_slot: 'Hidden',
        uses_ditto: true,
      })
    ).toBeUndefined();
  });
  it('個体値の任意と威力OFFは保持値を変えずに正規化する', () => {
    const iv = {
      ...DEFAULT_IV_RANGES,
      hp: [30, 31] as [number, number],
      atk: [0, 32] as [number, number],
      enabledStats: { hp: false },
      hidden_power_min_power: 70,
      powerEnabled: false,
    };
    expect(normalizeIvFilter(iv)).toBeUndefined();
    expect(normalizeIvFilter({ ...iv, enabledStats: { hp: true } })?.hp).toEqual([30, 31]);
    expect(iv.hp).toEqual([30, 31]);
  });
});
