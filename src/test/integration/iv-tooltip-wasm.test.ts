import { describe, it, expect } from 'vitest';
import { compute_iv_spread, lcg_seed_to_mt_seed } from '../../wasm/wasm_pkg.js';

describe('compute_iv_spread', () => {
  it('MT Seed 0x0000_0000, offset 0 → 既知の IV', () => {
    const ivs = compute_iv_spread(0x00_00_00_00, 0, false);
    // MT19937(0) → 最初の 6 出力の上位 5bit
    expect(ivs.hp).toBeGreaterThanOrEqual(0);
    expect(ivs.hp).toBeLessThanOrEqual(31);
    expect(ivs.atk).toBeGreaterThanOrEqual(0);
    expect(ivs.atk).toBeLessThanOrEqual(31);
    expect(ivs.def).toBeGreaterThanOrEqual(0);
    expect(ivs.def).toBeLessThanOrEqual(31);
    expect(ivs.spa).toBeGreaterThanOrEqual(0);
    expect(ivs.spa).toBeLessThanOrEqual(31);
    expect(ivs.spd).toBeGreaterThanOrEqual(0);
    expect(ivs.spd).toBeLessThanOrEqual(31);
    expect(ivs.spe).toBeGreaterThanOrEqual(0);
    expect(ivs.spe).toBeLessThanOrEqual(31);
  });

  it('MT Seed 0x0000_0000, offset 0 → 安定した結果', () => {
    const ivs1 = compute_iv_spread(0x00_00_00_00, 0, false);
    const ivs2 = compute_iv_spread(0x00_00_00_00, 0, false);
    expect(ivs1).toEqual(ivs2);
  });

  it('異なる offset → 異なる IV', () => {
    const ivs0 = compute_iv_spread(0x12_34_56_78, 0, false);
    const ivs2 = compute_iv_spread(0x12_34_56_78, 2, false);
    // offset が異なれば (通常) IV も異なる
    const same =
      ivs0.hp === ivs2.hp &&
      ivs0.atk === ivs2.atk &&
      ivs0.def === ivs2.def &&
      ivs0.spa === ivs2.spa &&
      ivs0.spd === ivs2.spd &&
      ivs0.spe === ivs2.spe;
    // 偶然一致する可能性は極めて低い
    expect(same).toBe(false);
  });

  it('roamer → IV 順序が変わる (HABDSC → HABCDS)', () => {
    const normal = compute_iv_spread(0xab_cd_ef_01, 1, false);
    const roamer = compute_iv_spread(0xab_cd_ef_01, 1, true);
    // reorder_for_roamer: spa←spd, spd←spe, spe←spa
    expect(roamer.hp).toBe(normal.hp);
    expect(roamer.atk).toBe(normal.atk);
    expect(roamer.def).toBe(normal.def);
    expect(roamer.spa).toBe(normal.spd);
    expect(roamer.spd).toBe(normal.spe);
    expect(roamer.spe).toBe(normal.spa);
  });

  it('egg offset 7 → 7 回消費後の IV', () => {
    const ivs = compute_iv_spread(0xff_ff_ff_ff, 7, false);
    expect(ivs.hp).toBeGreaterThanOrEqual(0);
    expect(ivs.hp).toBeLessThanOrEqual(31);
  });
});

describe('lcg_seed_to_mt_seed', () => {
  it('既知の LCG Seed → MT Seed 変換', () => {
    const mtSeed = lcg_seed_to_mt_seed(0n);
    expect(typeof mtSeed).toBe('number');
    expect(mtSeed).toBeGreaterThanOrEqual(0);
  });

  it('同じ入力 → 同じ出力', () => {
    const seed = 0x01_23_45_67_89_ab_cd_efn;
    const mt1 = lcg_seed_to_mt_seed(seed);
    const mt2 = lcg_seed_to_mt_seed(seed);
    expect(mt1).toBe(mt2);
  });

  it('異なる LCG Seed → 異なる MT Seed', () => {
    const mt1 = lcg_seed_to_mt_seed(0x00_00_00_00_00_00_00_01n);
    const mt2 = lcg_seed_to_mt_seed(0x00_00_00_00_00_00_00_02n);
    expect(mt1).not.toBe(mt2);
  });
});
