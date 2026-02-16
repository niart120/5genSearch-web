/**
 * Seed テンプレートデータ定義
 *
 * 起動時刻検索 (datetime-search) で使用する定義済み MT Seed テンプレート。
 * GPU 全探索 (GpuMtseedSearchIterator) により導出済みの Seed 値を保持する。
 */

import type { SupportedLocale } from '@/i18n';
import type { RomVersion } from '@/wasm/wasm_pkg';

/** テンプレート対応バージョン */
type TemplateVersion = 'BW' | 'BW2';

/** テンプレート種別 */
type TemplateCategory = 'stationary' | 'roamer';

/** カテゴリフィルタ (UI 用、'all' を含む) */
type TemplateCategoryFilter = 'all' | TemplateCategory;

/** Seed テンプレート定義 */
interface SeedTemplate {
  /** 一意識別子 (例: 'bw-stationary-6v') */
  readonly id: string;
  /** テンプレート表示名 (ロケール別) */
  readonly name: Record<SupportedLocale, string>;
  /** テンプレート説明 (ロケール別) */
  readonly description: Record<SupportedLocale, string>;
  /** 対応バージョン */
  readonly version: TemplateVersion;
  /** 種別 */
  readonly category: TemplateCategory;
  /** MT Seed 値の配列 (32bit 整数) */
  readonly seeds: readonly number[];
}

/**
 * RomVersion → TemplateVersion 変換
 */
function toTemplateVersion(version: RomVersion): TemplateVersion {
  switch (version) {
    case 'Black':
    case 'White': {
      return 'BW';
    }
    case 'Black2':
    case 'White2': {
      return 'BW2';
    }
  }
}

/**
 * カテゴリフィルタのラベル (ロケール別)
 */
const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategoryFilter, Record<SupportedLocale, string>> = {
  all: { ja: 'すべて', en: 'All' },
  stationary: { ja: '固定・野生', en: 'Stationary/Wild' },
  roamer: { ja: '徘徊', en: 'Roamer' },
};

/* ------------------------------------------------------------------ */
/*  BW 固定・野生 (mt_offset=0, is_roamer=false)                      */
/* ------------------------------------------------------------------ */

const BW_STATIONARY_TEMPLATES: readonly SeedTemplate[] = [
  {
    id: 'bw-stationary-6v',
    name: { ja: 'BW 固定・野生 6V', en: 'BW Stationary/Wild 6V' },
    description: { ja: '31-31-31-31-31-31', en: '31-31-31-31-31-31' },
    version: 'BW',
    category: 'stationary',
    seeds: [0x14_b1_1b_a6, 0x8a_30_48_0d, 0x9e_02_b0_ae, 0xad_fa_21_78, 0xfc_4a_a3_ac],
  },
  {
    id: 'bw-stationary-5va0',
    name: { ja: 'BW 固定・野生 5VA0', en: 'BW Stationary/Wild 5VA0' },
    description: { ja: '31-0-31-31-31-31', en: '31-0-31-31-31-31' },
    version: 'BW',
    category: 'stationary',
    seeds: [0x4b_d2_6f_c3, 0xc5_9a_44_1a, 0xdf_e7_eb_f2],
  },
  {
    id: 'bw-stationary-5vs0',
    name: { ja: 'BW 固定・野生 5VS0', en: 'BW Stationary/Wild 5VS0' },
    description: { ja: '31-31-31-31-31-0', en: '31-31-31-31-31-0' },
    version: 'BW',
    category: 'stationary',
    seeds: [0x47_f4_e4_dd, 0x9f_97_b2_96, 0xa4_68_64_20, 0xd5_67_8c_32],
  },
  {
    id: 'bw-stationary-v0vvv0',
    name: { ja: 'BW 固定・野生 V0VVV0', en: 'BW Stationary/Wild V0VVV0' },
    description: { ja: '31-0-31-31-31-0', en: '31-0-31-31-31-0' },
    version: 'BW',
    category: 'stationary',
    seeds: [0x0b_5a_81_f0, 0x5d_6f_6d_1d],
  },
  {
    id: 'bw-stationary-hp-ice',
    name: { ja: 'BW 固定・野生 めざ氷', en: 'BW Stationary/Wild Hidden Power Ice' },
    description: { ja: '31-2-30-31-31-31', en: '31-2-30-31-31-31' },
    version: 'BW',
    category: 'stationary',
    seeds: [
      0x01_11_78_91, 0x22_77_22_8b, 0xa3_8f_ba_af, 0xa4_9f_dc_53, 0xaf_3f_fb_bf, 0xf0_ee_8f_20,
      0xf6_26_67_ee,
    ],
  },
  {
    id: 'bw-stationary-hp-fire',
    name: { ja: 'BW 固定・野生 めざ炎', en: 'BW Stationary/Wild Hidden Power Fire' },
    description: { ja: '31-2-31-30-31-30', en: '31-2-31-30-31-30' },
    version: 'BW',
    category: 'stationary',
    seeds: [0xb6_59_4b_3f, 0xe5_ae_32_0c, 0xed_81_e1_2c],
  },
  {
    id: 'bw-stationary-hp-ground',
    name: { ja: 'BW 固定・野生 めざ地', en: 'BW Stationary/Wild Hidden Power Ground' },
    description: { ja: '31-2-31-30-30-31', en: '31-2-31-30-30-31' },
    version: 'BW',
    category: 'stationary',
    seeds: [0xe6_12_ed_e1, 0xfe_84_1e_b2],
  },
  {
    id: 'bw-stationary-hp-grass',
    name: { ja: 'BW 固定・野生 めざ草', en: 'BW Stationary/Wild Hidden Power Grass' },
    description: { ja: '31-2-31-30-31-31', en: '31-2-31-30-31-31' },
    version: 'BW',
    category: 'stationary',
    seeds: [0x85_51_6c_9e, 0xa5_7d_d3_c3, 0xa9_a0_4e_44],
  },
];

/* ------------------------------------------------------------------ */
/*  BW 徘徊 (mt_offset=1, is_roamer=true)                             */
/* ------------------------------------------------------------------ */

const BW_ROAMER_TEMPLATES: readonly SeedTemplate[] = [
  {
    id: 'bw-roamer-6v',
    name: { ja: 'BW 徘徊 6V', en: 'BW Roamer 6V' },
    description: { ja: '31-31-31-31-31-31', en: '31-31-31-31-31-31' },
    version: 'BW',
    category: 'roamer',
    seeds: [0x35_65_2a_5f, 0x47_07_f4_49, 0x75_41_aa_d0, 0xbe_e5_98_a7, 0xea_a2_7a_05],
  },
  {
    id: 'bw-roamer-hp-ice',
    name: { ja: 'BW 徘徊 めざ氷', en: 'BW Roamer Hidden Power Ice' },
    description: { ja: '31-2-30-31-31-31', en: '31-2-30-31-31-31' },
    version: 'BW',
    category: 'roamer',
    seeds: [
      0x5f_3d_e7_ef, 0x7f_19_83_d4, 0xb8_50_07_99, 0xc1_8a_a3_84, 0xc8_99_e6_6e, 0xd8_bf_c6_37,
    ],
  },
  {
    id: 'bw-roamer-hp-flying',
    name: { ja: 'BW 徘徊 めざ飛', en: 'BW Roamer Hidden Power Flying' },
    description: { ja: '30-2-30-30-30-31', en: '30-2-30-30-30-31' },
    version: 'BW',
    category: 'roamer',
    seeds: [0x4a_28_cb_e0, 0x5b_41_c5_30, 0xa3_59_c9_30, 0xc8_17_5b_8b, 0xda_fa_85_40],
  },
];

/* ------------------------------------------------------------------ */
/*  BW2 固定・野生 (mt_offset=2, is_roamer=false)                     */
/* ------------------------------------------------------------------ */

const BW2_STATIONARY_TEMPLATES: readonly SeedTemplate[] = [
  {
    id: 'bw2-stationary-6v',
    name: { ja: 'BW2 固定・野生 6V', en: 'BW2 Stationary/Wild 6V' },
    description: { ja: '31-31-31-31-31-31', en: '31-31-31-31-31-31' },
    version: 'BW2',
    category: 'stationary',
    seeds: [
      0x31_c2_6d_e4, 0x51_9a_0c_07, 0xc2_8a_88_2e, 0xdf_e7_eb_f2, 0xe3_43_72_ae, 0xed_01_c9_c2,
    ],
  },
  {
    id: 'bw2-stationary-5va0',
    name: { ja: 'BW2 固定・野生 5VA0', en: 'BW2 Stationary/Wild 5VA0' },
    description: { ja: '31-0-31-31-31-31', en: '31-0-31-31-31-31' },
    version: 'BW2',
    category: 'stationary',
    seeds: [
      0x14_71_99_22, 0x63_4c_c2_b0, 0x71_af_c8_96, 0x88_ef_de_c2, 0xaa_33_38_35, 0xab_d9_3e_44,
      0xad_d8_77_c4, 0xb3_2b_6b_02, 0xc3_1d_de_f7, 0xd2_86_65_3c,
    ],
  },
  {
    id: 'bw2-stationary-5vs0',
    name: { ja: 'BW2 固定・野生 5VS0', en: 'BW2 Stationary/Wild 5VS0' },
    description: { ja: '31-31-31-31-31-0', en: '31-31-31-31-31-0' },
    version: 'BW2',
    category: 'stationary',
    seeds: [0x6c_cb_f9_2d, 0x88_ff_24_15, 0xaa_20_29_bd, 0xc3_1a_4d_ea],
  },
  {
    id: 'bw2-stationary-v0vvv0',
    name: { ja: 'BW2 固定・野生 V0VVV0', en: 'BW2 Stationary/Wild V0VVV0' },
    description: { ja: '31-0-31-31-31-0', en: '31-0-31-31-31-0' },
    version: 'BW2',
    category: 'stationary',
    seeds: [0x54_f3_9e_0f, 0x63_38_dd_ed, 0x7b_f8_cd_77, 0xf9_c4_32_eb],
  },
  {
    id: 'bw2-stationary-hp-ice',
    name: { ja: 'BW2 固定・野生 めざ氷', en: 'BW2 Stationary/Wild Hidden Power Ice' },
    description: { ja: '31-2-30-31-31-31', en: '31-2-30-31-31-31' },
    version: 'BW2',
    category: 'stationary',
    seeds: [
      0x03_73_0f_34, 0x2c_9d_32_bf, 0x3f_37_a9_b9, 0x44_0c_b3_17, 0x67_28_fd_bf, 0x72_40_a4_ae,
      0x9b_fb_3d_33, 0xff_1d_f7_dc,
    ],
  },
  {
    id: 'bw2-stationary-hp-fire',
    name: { ja: 'BW2 固定・野生 めざ炎', en: 'BW2 Stationary/Wild Hidden Power Fire' },
    description: { ja: '31-2-31-30-31-30', en: '31-2-31-30-31-30' },
    version: 'BW2',
    category: 'stationary',
    seeds: [0x06_fc_78_d5, 0x0c_e3_e9_d3, 0xaa_7a_e0_44],
  },
  {
    id: 'bw2-stationary-hp-ground',
    name: { ja: 'BW2 固定・野生 めざ地', en: 'BW2 Stationary/Wild Hidden Power Ground' },
    description: { ja: '31-2-31-30-30-31', en: '31-2-31-30-30-31' },
    version: 'BW2',
    category: 'stationary',
    seeds: [0x2f_dc_73_a4, 0x95_49_52_e5, 0xd0_3b_53_25],
  },
  {
    id: 'bw2-stationary-hp-grass',
    name: { ja: 'BW2 固定・野生 めざ草', en: 'BW2 Stationary/Wild Hidden Power Grass' },
    description: { ja: '31-2-31-30-31-31', en: '31-2-31-30-31-31' },
    version: 'BW2',
    category: 'stationary',
    seeds: [0x83_ca_a3_d2, 0x8b_16_c9_92, 0xa7_cb_e4_0f, 0xc7_51_62_1a],
  },
];

/* ------------------------------------------------------------------ */
/*  全テンプレート統合                                                  */
/* ------------------------------------------------------------------ */

const SEED_TEMPLATES: readonly SeedTemplate[] = [
  ...BW_STATIONARY_TEMPLATES,
  ...BW_ROAMER_TEMPLATES,
  ...BW2_STATIONARY_TEMPLATES,
];

export { SEED_TEMPLATES, TEMPLATE_CATEGORY_LABELS, toTemplateVersion };

export type { TemplateVersion, TemplateCategory, TemplateCategoryFilter, SeedTemplate };
