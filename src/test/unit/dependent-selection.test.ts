import { describe, expect, it } from 'vitest';
import { retainAvailableSelections } from '@/lib/dependent-selection';
import {
  normalizePokemonSearchFilter,
  reconcilePokemonSpeciesFilter,
} from '@/lib/search-filter-context';
import type { PokemonFilterContext } from '@/lib/search-filter-context';

const context: PokemonFilterContext = {
  encounterType: 'Normal',
  slots: [
    {
      species_id: 525,
      level_min: 10,
      level_max: 20,
      gender_ratio: 'F1M1',
      shiny_locked: false,
      has_held_item: false,
    },
  ],
};

describe('候補依存の選択', () => {
  it('共通する選択の順序を保ち、全件残るなら同じ参照を返す', () => {
    const selected = [3, 1];
    expect(retainAvailableSelections(selected, [1, 2, 3])).toBe(selected);
  });
  it('候補から消えた選択だけを解除する', () => {
    expect(retainAvailableSelections([3, 9, 1], [1, 2, 3])).toEqual([3, 1]);
  });
  it('全件消失は指定なしにする', () => {
    expect(retainAvailableSelections([9], [])).toBeUndefined();
  });
  it('候補確定前は種族入力を保持する', () => {
    const input = { species_ids: [299] };
    expect(reconcilePokemonSpeciesFilter(input, context, false)).toBe(input);
  });
  it('確定候補外の種族だけを解除し、結果のないレベル指定は保持する', () => {
    const input = { species_ids: [299, 525], level_range: [30, 40] as [number, number] };
    expect(reconcilePokemonSpeciesFilter(input, context, true)).toEqual({
      ...input,
      species_ids: [525],
    });
  });
  it('項目が適用不可なら入力を保持する', () => {
    const input = { species_ids: [299] };
    expect(
      reconcilePokemonSpeciesFilter(input, { ...context, encounterType: 'StaticSymbol' }, true)
    ).toBe(input);
  });
  it('ItemOnly では保持し、フィルター全体が無効でも適用可能な種族は照合する', () => {
    const input = { species_ids: [299], encounter_result_filter: 'ItemOnly' as const };
    expect(
      reconcilePokemonSpeciesFilter(input, { ...context, encounterType: 'DustCloud' }, true)
    ).toBe(input);
    expect(
      reconcilePokemonSpeciesFilter({ species_ids: [299], enabled: false }, context, true)
        .species_ids
    ).toBeUndefined();
  });
  it('実行用条件でも候補を照合し、入力を変更しない', () => {
    const input = { species_ids: [299, 525] };
    expect(normalizePokemonSearchFilter(input, context).species_ids).toEqual([525]);
    expect(input.species_ids).toEqual([299, 525]);
  });
});
