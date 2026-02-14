/**
 * batch-utils — 型ガードのユニットテスト
 */

import { describe, it, expect } from 'vitest';
import {
  isGeneratedPokemonData,
  isGeneratedEggData,
  isMtseedResult,
  isTrainerInfoResult,
} from '@/services/batch-utils';

describe('isTrainerInfoResult', () => {
  it('trainer + seed_origin を持つオブジェクトは true を返す', () => {
    const value = {
      trainer: { tid: 12_345, sid: 54_321 },
      seed_origin: { Startup: {} },
      shiny_type: undefined,
    };
    expect(isTrainerInfoResult(value)).toBe(true);
  });

  it('trainer のみのオブジェクトは false を返す', () => {
    const value = { trainer: { tid: 0, sid: 0 } };
    expect(isTrainerInfoResult(value)).toBe(false);
  });

  it('seed_origin のみのオブジェクトは false を返す', () => {
    const value = { seed_origin: {} };
    expect(isTrainerInfoResult(value)).toBe(false);
  });

  it('undefined は false を返す', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(isTrainerInfoResult(undefined)).toBe(false);
  });

  it('MtseedResult 形式のオブジェクトは false を返す', () => {
    const value = { seed: 0x12_34_56_78, ivs: {} };
    expect(isTrainerInfoResult(value)).toBe(false);
  });
});

describe('isMtseedResult', () => {
  it('seed + ivs を持つオブジェクトは true を返す', () => {
    const value = { seed: 0x12_34_56_78, ivs: { hp: 31 } };
    expect(isMtseedResult(value)).toBe(true);
  });

  it('TrainerInfoSearchResult 形式は false を返す', () => {
    const value = { trainer: { tid: 0, sid: 0 }, seed_origin: {} };
    expect(isMtseedResult(value)).toBe(false);
  });
});

describe('isGeneratedPokemonData', () => {
  it('core + advance を持つオブジェクトは true を返す', () => {
    const value = { core: {}, advance: 0 };
    expect(isGeneratedPokemonData(value)).toBe(true);
  });
});

describe('isGeneratedEggData', () => {
  it('core + advance + inheritance を持つオブジェクトは true を返す', () => {
    const value = { core: {}, advance: 0, inheritance: {} };
    expect(isGeneratedEggData(value)).toBe(true);
  });

  it('inheritance がないオブジェクトは false を返す', () => {
    const value = { core: {}, advance: 0 };
    expect(isGeneratedEggData(value)).toBe(false);
  });
});
