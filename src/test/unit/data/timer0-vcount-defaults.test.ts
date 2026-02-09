import { describe, expect, it } from 'vitest';
import { lookupDefaultRanges } from '@/data/timer0-vcount-defaults';
import type { Hardware, RomVersion, RomRegion } from '@/wasm/wasm_pkg';

const DS_LITE_VERSIONS: RomVersion[] = ['Black', 'White', 'Black2', 'White2'];
const REGIONS: RomRegion[] = ['Jpn', 'Kor', 'Usa', 'Ger', 'Fra', 'Spa', 'Ita'];
const DS_LITE_HARDWARE: Hardware[] = ['Ds', 'DsLite'];

describe('timer0-vcount-defaults', () => {
  describe('DS/DSLite 群: 全 28 パターンが定義されている', () => {
    for (const version of DS_LITE_VERSIONS) {
      for (const region of REGIONS) {
        it(`DsLite / ${version} / ${region}`, () => {
          const ranges = lookupDefaultRanges('DsLite', version, region);
          expect(ranges).toBeDefined();
          expect(ranges!.length).toBeGreaterThanOrEqual(1);
        });
      }
    }
  });

  describe('DS と DsLite は同一の値を返す', () => {
    for (const version of DS_LITE_VERSIONS) {
      for (const region of REGIONS) {
        it(`${version} / ${region}`, () => {
          const dsRanges = lookupDefaultRanges('Ds', version, region);
          const dsLiteRanges = lookupDefaultRanges('DsLite', version, region);
          expect(dsRanges).toEqual(dsLiteRanges);
        });
      }
    }
  });

  describe('DSi/3DS 群: JPN 4 パターンが定義されている', () => {
    for (const version of DS_LITE_VERSIONS) {
      it(`Dsi / ${version} / Jpn`, () => {
        const ranges = lookupDefaultRanges('Dsi', version, 'Jpn');
        expect(ranges).toBeDefined();
        expect(ranges!.length).toBeGreaterThanOrEqual(1);
      });
    }
  });

  describe('DSi と Dsi3ds は同一の値を返す (JPN)', () => {
    for (const version of DS_LITE_VERSIONS) {
      it(`${version} / Jpn`, () => {
        const dsiRanges = lookupDefaultRanges('Dsi', version, 'Jpn');
        const dsi3dsRanges = lookupDefaultRanges('Dsi3ds', version, 'Jpn');
        expect(dsiRanges).toEqual(dsi3dsRanges);
      });
    }
  });

  describe('DSi/3DS 群: JPN 以外は undefined を返す', () => {
    const nonJpnRegions: RomRegion[] = ['Kor', 'Usa', 'Ger', 'Fra', 'Spa', 'Ita'];
    for (const version of DS_LITE_VERSIONS) {
      for (const region of nonJpnRegions) {
        it(`Dsi / ${version} / ${region} → undefined`, () => {
          expect(lookupDefaultRanges('Dsi', version, region)).toBeUndefined();
        });
      }
    }
  });

  describe('各範囲の妥当性: min ≤ max、VCount は u8 範囲内', () => {
    for (const hw of DS_LITE_HARDWARE) {
      for (const version of DS_LITE_VERSIONS) {
        for (const region of REGIONS) {
          const ranges = lookupDefaultRanges(hw, version, region);
          if (!ranges) continue;
          for (const [i, range] of ranges.entries()) {
            it(`${hw}/${version}/${region} segment ${i}: timer0 min ≤ max`, () => {
              expect(range.timer0_min).toBeLessThanOrEqual(range.timer0_max);
            });
            it(`${hw}/${version}/${region} segment ${i}: vcount min ≤ max`, () => {
              expect(range.vcount_min).toBeLessThanOrEqual(range.vcount_max);
            });
            it(`${hw}/${version}/${region} segment ${i}: vcount in u8 range`, () => {
              expect(range.vcount_min).toBeGreaterThanOrEqual(0);
              expect(range.vcount_max).toBeLessThanOrEqual(0xff);
            });
            it(`${hw}/${version}/${region} segment ${i}: timer0 in u16 range`, () => {
              expect(range.timer0_min).toBeGreaterThanOrEqual(0);
              expect(range.timer0_max).toBeLessThanOrEqual(0xff_ff);
            });
          }
        }
      }
    }
  });

  describe('代表的な確定値の検証', () => {
    it('DsLite / Black / Jpn', () => {
      const ranges = lookupDefaultRanges('DsLite', 'Black', 'Jpn');
      expect(ranges).toEqual([
        { timer0_min: 0x0c_79, timer0_max: 0x0c_7a, vcount_min: 0x60, vcount_max: 0x60 },
      ]);
    });

    it('DsLite / Black2 / Ger (2 セグメント)', () => {
      const ranges = lookupDefaultRanges('DsLite', 'Black2', 'Ger');
      expect(ranges).toHaveLength(2);
      expect(ranges![0]).toEqual({
        timer0_min: 0x10_e5,
        timer0_max: 0x10_e8,
        vcount_min: 0x81,
        vcount_max: 0x81,
      });
      expect(ranges![1]).toEqual({
        timer0_min: 0x10_e9,
        timer0_max: 0x10_ec,
        vcount_min: 0x82,
        vcount_max: 0x82,
      });
    });

    it('DsLite / Black2 / Ita (2 セグメント)', () => {
      const ranges = lookupDefaultRanges('DsLite', 'Black2', 'Ita');
      expect(ranges).toHaveLength(2);
    });

    it('Dsi / Black / Jpn', () => {
      const ranges = lookupDefaultRanges('Dsi', 'Black', 'Jpn');
      expect(ranges).toEqual([
        { timer0_min: 0x12_37, timer0_max: 0x12_38, vcount_min: 0x8c, vcount_max: 0x8c },
      ]);
    });

    it('Dsi / White2 / Jpn', () => {
      const ranges = lookupDefaultRanges('Dsi', 'White2', 'Jpn');
      expect(ranges).toEqual([
        { timer0_min: 0x18_af, timer0_max: 0x18_b3, vcount_min: 0xbe, vcount_max: 0xbe },
      ]);
    });
  });
});
