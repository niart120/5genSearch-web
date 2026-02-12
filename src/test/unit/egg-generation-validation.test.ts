/**
 * タマゴ個体生成機能のバリデーションテスト
 */

import { describe, it, expect } from 'vitest';
import { validateEggGenerationForm } from '@/features/egg-generation/types';
import type { EggGenerationFormState } from '@/features/egg-generation/types';

describe('validateEggGenerationForm', () => {
  const baseForm: EggGenerationFormState = {
    seedInputMode: 'manual-seeds',
    seedOrigins: [{ Seed: { base_seed: 0n, mt_seed: 0n } }],
    eggParams: {
      parent_male: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      parent_female: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      female_ability_slot: 'Slot1',
      everstone_plan: 'None',
      gender_ratio: 'Equal',
      uses_ditto: false,
      nidoran_flag: false,
      masuda_method: false,
      consider_npc: false,
    },
    genConfig: { user_offset: 0, max_advance: 100 },
    filter: undefined,
    statsFilter: undefined,
    speciesId: undefined,
  };

  it('should pass validation for valid form', () => {
    const result = validateEggGenerationForm(baseForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when seeds are empty', () => {
    const form = { ...baseForm, seedOrigins: [] };
    const result = validateEggGenerationForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('SEEDS_EMPTY');
  });

  it('should fail when user_offset is negative', () => {
    const form = { ...baseForm, genConfig: { user_offset: -1, max_advance: 100 } };
    const result = validateEggGenerationForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('OFFSET_NEGATIVE');
  });

  it('should fail when max_advance < user_offset', () => {
    const form = { ...baseForm, genConfig: { user_offset: 50, max_advance: 30 } };
    const result = validateEggGenerationForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('ADVANCE_RANGE_INVALID');
  });

  it('should fail when IV is out of range', () => {
    const form = {
      ...baseForm,
      eggParams: {
        ...baseForm.eggParams,
        parent_male: { hp: 35, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      },
    };
    const result = validateEggGenerationForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('IV_OUT_OF_RANGE');
  });

  it('should accept Unknown IV (32)', () => {
    const form = {
      ...baseForm,
      eggParams: {
        ...baseForm.eggParams,
        parent_male: { hp: 32, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      },
    };
    const result = validateEggGenerationForm(form);
    expect(result.isValid).toBe(true);
  });

  it('should fail when female parent IV is out of range', () => {
    const form = {
      ...baseForm,
      eggParams: {
        ...baseForm.eggParams,
        parent_female: { hp: 31, atk: 33, def: 31, spa: 31, spd: 31, spe: 31 },
      },
    };
    const result = validateEggGenerationForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('IV_OUT_OF_RANGE');
  });

  it('should fail when IV is negative', () => {
    const form = {
      ...baseForm,
      eggParams: {
        ...baseForm.eggParams,
        parent_male: { hp: -1, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      },
    };
    const result = validateEggGenerationForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('IV_OUT_OF_RANGE');
  });

  it('should pass when max_advance equals user_offset', () => {
    const form = { ...baseForm, genConfig: { user_offset: 50, max_advance: 50 } };
    const result = validateEggGenerationForm(form);
    expect(result.isValid).toBe(true);
  });

  it('should accumulate multiple errors', () => {
    const form = {
      ...baseForm,
      seedOrigins: [],
      eggParams: {
        ...baseForm.eggParams,
        parent_male: { hp: 35, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      },
      genConfig: { user_offset: -1, max_advance: 100 },
    };
    const result = validateEggGenerationForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('SEEDS_EMPTY');
    expect(result.errors).toContain('OFFSET_NEGATIVE');
    expect(result.errors).toContain('IV_OUT_OF_RANGE');
    expect(result.errors.length).toBe(3);
  });
});
