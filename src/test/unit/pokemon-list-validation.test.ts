/**
 * validatePokemonListForm のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import { validatePokemonListForm, type PokemonListFormState } from '@/features/pokemon-list/types';

function createDefaultForm(overrides?: Partial<PokemonListFormState>): PokemonListFormState {
  return {
    seedInputMode: 'manual-seeds',
    seedOrigins: [
      {
        Startup: {
          base_seed: 0x12_34_56_78_90_ab_cd_efn,
          mt_seed: 0x12_34_56_78,
          datetime: {
            year: 2025,
            month: 1,
            day: 1,
            hour: 0,
            minute: 0,
            second: 0,
          },
          condition: {
            timer0: 0x0c_79,
            vcount: 0x60,
            key_code: 0x2f_ff,
          },
        },
      },
    ],
    encounterType: 'GrassDouble',
    encounterMethod: 'Stationary',
    genConfig: {
      user_offset: 0,
      max_advance: 100,
    },
    filter: undefined,
    ...overrides,
  };
}

describe('validatePokemonListForm', () => {
  it('正常なフォームは valid を返す', () => {
    const result = validatePokemonListForm(createDefaultForm(), true);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('seedOrigins が空の場合は SEEDS_EMPTY エラーを返す', () => {
    const form = createDefaultForm({ seedOrigins: [] });
    const result = validatePokemonListForm(form, true);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('SEEDS_EMPTY');
  });

  it('スロットなしの場合は ENCOUNTER_SLOTS_EMPTY エラーを返す', () => {
    const form = createDefaultForm();
    const result = validatePokemonListForm(form, false);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('ENCOUNTER_SLOTS_EMPTY');
  });

  it('user_offset が負の場合は OFFSET_NEGATIVE エラーを返す', () => {
    const form = createDefaultForm({
      genConfig: { user_offset: -1, max_advance: 100 },
    });
    const result = validatePokemonListForm(form, true);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('OFFSET_NEGATIVE');
  });

  it('max_advance < user_offset の場合は ADVANCE_RANGE_INVALID エラーを返す', () => {
    const form = createDefaultForm({
      genConfig: { user_offset: 50, max_advance: 10 },
    });
    const result = validatePokemonListForm(form, true);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('ADVANCE_RANGE_INVALID');
  });

  it('max_advance === user_offset の場合は valid を返す', () => {
    const form = createDefaultForm({
      genConfig: { user_offset: 50, max_advance: 50 },
    });
    const result = validatePokemonListForm(form, true);
    expect(result.isValid).toBe(true);
  });

  it('user_offset === 0 の場合は valid を返す', () => {
    const form = createDefaultForm({
      genConfig: { user_offset: 0, max_advance: 0 },
    });
    const result = validatePokemonListForm(form, true);
    expect(result.isValid).toBe(true);
  });

  it('複数エラーが同時に発生する場合は全てのエラーを返す', () => {
    const form = createDefaultForm({
      seedOrigins: [],
      genConfig: { user_offset: -1, max_advance: -5 },
    });
    const result = validatePokemonListForm(form, false);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('SEEDS_EMPTY');
    expect(result.errors).toContain('ENCOUNTER_SLOTS_EMPTY');
    expect(result.errors).toContain('OFFSET_NEGATIVE');
    expect(result.errors).toContain('ADVANCE_RANGE_INVALID');
    expect(result.errors).toHaveLength(4);
  });
});
