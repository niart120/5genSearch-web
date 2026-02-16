import { describe, it, expect } from 'vitest';
import { compute_iv_spread, lcg_seed_to_mt_seed } from '../../wasm/wasm_pkg.js';

/**
 * seed-templates.ts の GPU 全探索導出済みデータを期待値として使用する。
 * 各テンプレートは (mt_seed, mt_offset, is_roamer) → IV の決定的対応を保証する。
 */
describe('compute_iv_spread', () => {
  it('BW 固定・野生 6V (offset 0) — seed-templates 検証', () => {
    // bw-stationary-6v: mt_offset=0, is_roamer=false → 31-31-31-31-31-31
    const ivs = compute_iv_spread(0x14_b1_1b_a6, 0, false);
    expect(ivs).toEqual({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 });
  });

  it('BW 固定・野生 めざ炎 (offset 0) — seed-templates 検証', () => {
    // bw-stationary-hp-fire: mt_offset=0, is_roamer=false → 31-2-31-30-31-30
    const ivs = compute_iv_spread(0xb6_59_4b_3f, 0, false);
    expect(ivs).toEqual({ hp: 31, atk: 2, def: 31, spa: 30, spd: 31, spe: 30 });
  });

  it('BW 徘徊 6V (offset 1, roamer) — seed-templates 検証', () => {
    // bw-roamer-6v: mt_offset=1, is_roamer=true → 31-31-31-31-31-31
    const ivs = compute_iv_spread(0x35_65_2a_5f, 1, true);
    expect(ivs).toEqual({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 });
  });

  it('BW2 固定・野生 6V (offset 2) — seed-templates 検証', () => {
    // bw2-stationary-6v: mt_offset=2, is_roamer=false → 31-31-31-31-31-31
    const ivs = compute_iv_spread(0x31_c2_6d_e4, 2, false);
    expect(ivs).toEqual({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 });
  });

  it('BW2 固定・野生 めざ氷 (offset 2) — seed-templates 検証', () => {
    // bw2-stationary-hp-ice: mt_offset=2, is_roamer=false → 31-2-30-31-31-31
    const ivs = compute_iv_spread(0x03_73_0f_34, 2, false);
    expect(ivs).toEqual({ hp: 31, atk: 2, def: 30, spa: 31, spd: 31, spe: 31 });
  });

  it('roamer の reorder 検証 — 通常順と並び替え順の関係', () => {
    // 同一 seed/offset で normal と roamer を比較し reorder_for_roamer の動作を検証
    const normal = compute_iv_spread(0xab_cd_ef_01, 1, false);
    const roamer = compute_iv_spread(0xab_cd_ef_01, 1, true);
    // reorder_for_roamer: HABDSC (生成順) → HABCDS (標準順)
    // spa ← spd, spd ← spe, spe ← spa
    expect(roamer.hp).toBe(normal.hp);
    expect(roamer.atk).toBe(normal.atk);
    expect(roamer.def).toBe(normal.def);
    expect(roamer.spa).toBe(normal.spd);
    expect(roamer.spd).toBe(normal.spe);
    expect(roamer.spe).toBe(normal.spa);
  });

  it('同一入力 → 決定的な出力', () => {
    const ivs1 = compute_iv_spread(0x14_b1_1b_a6, 0, false);
    const ivs2 = compute_iv_spread(0x14_b1_1b_a6, 0, false);
    expect(ivs1).toEqual(ivs2);
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
