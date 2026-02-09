import type { Hardware, RomVersion, RomRegion, Timer0VCountRange } from '../wasm/wasm_pkg.js';

/** ハードウェア群。DS/DSLite と DSi/3DS で Timer0/VCount 範囲が異なる */
type HardwareGroup = 'DsLite' | 'Dsi';

type DefaultRangeKey = `${HardwareGroup}_${RomVersion}_${RomRegion}`;

function toHardwareGroup(hardware: Hardware): HardwareGroup {
  return hardware === 'Dsi' || hardware === 'Dsi3ds' ? 'Dsi' : 'DsLite';
}

// Partial — 未収集エントリは存在しない (undefined)
const DEFAULT_RANGE_TABLE: Partial<Record<DefaultRangeKey, Timer0VCountRange[]>> = {
  // === DS/DSLite 群: 28 パターン全確定 ===

  // -- Black (DS/DSLite) --
  DsLite_Black_Jpn: [
    { timer0_min: 0x0c_79, timer0_max: 0x0c_7a, vcount_min: 0x60, vcount_max: 0x60 },
  ],
  DsLite_Black_Kor: [
    { timer0_min: 0x0c_84, timer0_max: 0x0c_85, vcount_min: 0x60, vcount_max: 0x60 },
  ],
  DsLite_Black_Usa: [
    { timer0_min: 0x0c_7b, timer0_max: 0x0c_7c, vcount_min: 0x60, vcount_max: 0x60 },
  ],
  DsLite_Black_Ger: [
    { timer0_min: 0x0c_77, timer0_max: 0x0c_78, vcount_min: 0x5f, vcount_max: 0x5f },
  ],
  DsLite_Black_Fra: [
    { timer0_min: 0x0c_73, timer0_max: 0x0c_74, vcount_min: 0x5f, vcount_max: 0x5f },
  ],
  DsLite_Black_Spa: [
    { timer0_min: 0x0c_86, timer0_max: 0x0c_87, vcount_min: 0x60, vcount_max: 0x60 },
  ],
  DsLite_Black_Ita: [
    { timer0_min: 0x0c_6a, timer0_max: 0x0c_6b, vcount_min: 0x5f, vcount_max: 0x5f },
  ],

  // -- White (DS/DSLite) --
  DsLite_White_Jpn: [
    { timer0_min: 0x0c_67, timer0_max: 0x0c_69, vcount_min: 0x5f, vcount_max: 0x5f },
  ],
  DsLite_White_Kor: [
    { timer0_min: 0x0c_7b, timer0_max: 0x0c_7c, vcount_min: 0x60, vcount_max: 0x60 },
  ],
  DsLite_White_Usa: [
    { timer0_min: 0x0c_7e, timer0_max: 0x0c_80, vcount_min: 0x60, vcount_max: 0x60 },
  ],
  DsLite_White_Ger: [
    { timer0_min: 0x0c_7a, timer0_max: 0x0c_7b, vcount_min: 0x60, vcount_max: 0x60 },
  ],
  DsLite_White_Fra: [
    { timer0_min: 0x0c_6e, timer0_max: 0x0c_6f, vcount_min: 0x5f, vcount_max: 0x5f },
  ],
  DsLite_White_Spa: [
    { timer0_min: 0x0c_70, timer0_max: 0x0c_71, vcount_min: 0x5f, vcount_max: 0x5f },
  ],
  DsLite_White_Ita: [
    { timer0_min: 0x0c_7b, timer0_max: 0x0c_7c, vcount_min: 0x60, vcount_max: 0x60 },
  ],

  // -- Black2 (DS/DSLite) --
  DsLite_Black2_Jpn: [
    { timer0_min: 0x11_02, timer0_max: 0x11_08, vcount_min: 0x82, vcount_max: 0x82 },
  ],
  DsLite_Black2_Kor: [
    { timer0_min: 0x10_ef, timer0_max: 0x10_f4, vcount_min: 0x82, vcount_max: 0x82 },
  ],
  DsLite_Black2_Usa: [
    { timer0_min: 0x11_02, timer0_max: 0x11_08, vcount_min: 0x82, vcount_max: 0x82 },
  ],
  DsLite_Black2_Ger: [
    { timer0_min: 0x10_e5, timer0_max: 0x10_e8, vcount_min: 0x81, vcount_max: 0x81 },
    { timer0_min: 0x10_e9, timer0_max: 0x10_ec, vcount_min: 0x82, vcount_max: 0x82 },
  ],
  DsLite_Black2_Fra: [
    { timer0_min: 0x10_f4, timer0_max: 0x10_f8, vcount_min: 0x82, vcount_max: 0x82 },
  ],
  DsLite_Black2_Spa: [
    { timer0_min: 0x11_01, timer0_max: 0x11_06, vcount_min: 0x82, vcount_max: 0x82 },
  ],
  DsLite_Black2_Ita: [
    { timer0_min: 0x11_07, timer0_max: 0x11_09, vcount_min: 0x82, vcount_max: 0x82 },
    { timer0_min: 0x11_09, timer0_max: 0x11_0d, vcount_min: 0x83, vcount_max: 0x83 },
  ],

  // -- White2 (DS/DSLite) --
  DsLite_White2_Jpn: [
    { timer0_min: 0x10_f5, timer0_max: 0x10_fb, vcount_min: 0x82, vcount_max: 0x82 },
  ],
  DsLite_White2_Kor: [
    { timer0_min: 0x10_e4, timer0_max: 0x10_e9, vcount_min: 0x81, vcount_max: 0x81 },
  ],
  DsLite_White2_Usa: [
    { timer0_min: 0x10_f2, timer0_max: 0x10_f6, vcount_min: 0x82, vcount_max: 0x82 },
  ],
  DsLite_White2_Ger: [
    { timer0_min: 0x10_e5, timer0_max: 0x10_ed, vcount_min: 0x82, vcount_max: 0x82 },
  ],
  DsLite_White2_Fra: [
    { timer0_min: 0x10_ec, timer0_max: 0x10_f0, vcount_min: 0x82, vcount_max: 0x82 },
  ],
  DsLite_White2_Spa: [
    { timer0_min: 0x10_ef, timer0_max: 0x10_f4, vcount_min: 0x82, vcount_max: 0x82 },
  ],
  DsLite_White2_Ita: [
    { timer0_min: 0x10_ff, timer0_max: 0x11_04, vcount_min: 0x82, vcount_max: 0x82 },
  ],

  // === DSi/3DS 群: JPN 4 パターン確定 ===
  Dsi_Black_Jpn: [{ timer0_min: 0x12_37, timer0_max: 0x12_38, vcount_min: 0x8c, vcount_max: 0x8c }],
  Dsi_White_Jpn: [{ timer0_min: 0x12_32, timer0_max: 0x12_34, vcount_min: 0x8c, vcount_max: 0x8c }],
  Dsi_Black2_Jpn: [
    { timer0_min: 0x15_0d, timer0_max: 0x15_14, vcount_min: 0xa2, vcount_max: 0xa2 },
  ],
  Dsi_White2_Jpn: [
    { timer0_min: 0x18_af, timer0_max: 0x18_b3, vcount_min: 0xbe, vcount_max: 0xbe },
  ],
  // DSi/3DS JPN 以外: 未収集 (エントリなし → undefined)
};

/**
 * ハードウェア群 × ROM バージョン × リージョンに対応するデフォルト Timer0/VCount 範囲を返す。
 * データが未収集の場合は undefined を返す。
 */
function lookupDefaultRanges(
  hardware: Hardware,
  version: RomVersion,
  region: RomRegion
): Timer0VCountRange[] | undefined {
  const key: DefaultRangeKey = `${toHardwareGroup(hardware)}_${version}_${region}`;
  return DEFAULT_RANGE_TABLE[key];
}

export { lookupDefaultRanges, toHardwareGroup };
export type { HardwareGroup, DefaultRangeKey };
