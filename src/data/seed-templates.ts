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
    id: 'bw-stationary-5v-any-a',
    name: { ja: 'BW 固定・野生 A抜け5V', en: 'BW Stationary/Wild 5V -Atk' },
    description: { ja: '31-x-31-31-31-31', en: '31-x-31-31-31-31' },
    version: 'BW',
    category: 'stationary',
    seeds: [
      0x01_6a_4b_08, 0x06_ef_a0_a0, 0x07_a7_b2_00, 0x0d_5d_ef_03, 0x14_b1_1b_a6, 0x18_a2_2a_b1,
      0x19_08_fb_69, 0x19_c3_cb_b0, 0x1a_45_05_68, 0x1b_97_0a_2b, 0x26_33_59_ee, 0x2e_16_9e_1d,
      0x33_2f_8c_74, 0x35_d9_9c_bb, 0x3a_38_9b_cc, 0x3b_ce_53_50, 0x3d_4f_d2_7f, 0x41_3a_b9_9e,
      0x45_36_bd_fa, 0x45_da_a4_ca, 0x47_bd_fd_af, 0x4b_0b_5d_30, 0x4b_d2_6f_c3, 0x4b_ee_f6_59,
      0x4d_3a_40_28, 0x4f_22_5b_69, 0x50_b7_40_79, 0x52_9c_bf_ff, 0x53_27_94_da, 0x56_db_5a_2b,
      0x57_c3_20_c4, 0x59_2e_5a_30, 0x5a_fa_d1_c0, 0x5b_1a_50_ff, 0x61_d5_9a_ba, 0x61_ef_cc_8a,
      0x62_45_8f_9b, 0x66_14_da_40, 0x66_16_83_80, 0x66_ac_81_ee, 0x6a_33_a6_7f, 0x6a_bd_86_94,
      0x6c_13_8f_8e, 0x6e_79_c9_17, 0x6e_f8_ab_8b, 0x72_f9_ef_3e, 0x74_08_fa_f7, 0x76_e8_ce_54,
      0x77_63_84_23, 0x77_91_72_79, 0x78_90_d4_2d, 0x79_61_af_be, 0x7a_e6_5d_88, 0x81_98_33_4a,
      0x83_fd_8b_d4, 0x84_3d_bd_6c, 0x89_da_c3_78, 0x8a_30_48_0d, 0x8c_56_91_75, 0x90_8d_a0_e8,
      0x92_b7_ee_c4, 0x94_3c_ca_d1, 0x97_32_6e_da, 0x99_18_cc_22, 0x9e_02_b0_ae, 0x9e_77_20_1d,
      0xa1_4c_1c_2f, 0xa6_6b_a9_c8, 0xa8_e5_43_cb, 0xad_fa_21_78, 0xae_7d_07_0b, 0xaf_43_86_f9,
      0xb2_50_ba_44, 0xb3_4d_10_2b, 0xb5_06_45_80, 0xb7_de_b7_c5, 0xbe_e3_25_7e, 0xc0_67_60_56,
      0xc3_3a_d4_35, 0xc4_59_16_14, 0xc4_e6_3e_b7, 0xc5_9a_44_1a, 0xc6_63_d6_8d, 0xcc_42_58_7b,
      0xce_30_34_98, 0xd7_d9_de_09, 0xd8_bd_3b_9d, 0xda_be_79_c3, 0xdd_4c_c6_89, 0xdf_e7_eb_f2,
      0xe0_ed_c7_ed, 0xe1_af_54_fe, 0xe2_01_71_46, 0xe2_94_e6_50, 0xe7_33_75_9e, 0xe7_5e_52_0a,
      0xe7_91_a5_9d, 0xe8_5b_6f_3e, 0xe9_d3_60_84, 0xeb_c8_9f_3a, 0xee_39_9d_35, 0xf1_50_bc_07,
      0xf1_cb_ee_68, 0xf4_b1_66_18, 0xf8_1a_82_7d, 0xfc_4a_a3_ac, 0xff_5c_09_df,
    ],
  },
  {
    id: 'bw-stationary-5v-any-c',
    name: { ja: 'BW 固定・野生 C抜け5V', en: 'BW Stationary/Wild 5V -SpA' },
    description: { ja: '31-31-31-x-31-31', en: '31-31-31-x-31-31' },
    version: 'BW',
    category: 'stationary',
    seeds: [
      0x02_b7_fe_42, 0x05_9d_51_dd, 0x05_cb_fd_3b, 0x07_27_37_32, 0x07_e3_8f_c5, 0x08_d7_6a_92,
      0x09_a9_36_03, 0x09_fe_d5_90, 0x0b_47_8e_0f, 0x0b_c2_cd_1c, 0x0d_ec_ef_ff, 0x0f_58_88_dd,
      0x11_2a_9e_38, 0x14_b1_1b_a6, 0x16_96_10_b4, 0x16_d2_cf_0f, 0x1a_99_56_14, 0x1d_52_bc_55,
      0x1e_a5_fd_da, 0x20_8c_b0_9d, 0x21_a3_77_ba, 0x22_4b_05_5a, 0x23_d9_0d_18, 0x25_9a_db_56,
      0x28_91_6d_4c, 0x29_44_d7_dc, 0x2c_8b_50_1b, 0x2f_0f_1e_6e, 0x31_76_a4_58, 0x32_2a_58_0a,
      0x32_e8_32_80, 0x33_66_4c_b5, 0x38_94_b8_88, 0x3a_bf_6b_a1, 0x3a_e5_14_62, 0x3b_e8_b9_42,
      0x40_1e_b8_b7, 0x43_ce_af_59, 0x46_b2_a8_d6, 0x48_f5_91_34, 0x4a_f6_1a_80, 0x4a_ea_94_72,
      0x4b_70_11_4f, 0x4c_2a_f9_36, 0x4e_88_ef_42, 0x53_2e_30_88, 0x53_f7_23_1f, 0x56_e1_4f_17,
      0x58_1e_72_70, 0x58_31_71_a4, 0x5c_39_ae_ed, 0x5e_24_14_2e, 0x61_18_b4_3a, 0x6a_87_ee_ef,
      0x6a_c0_0d_c8, 0x6b_e3_7f_df, 0x6c_e1_70_ae, 0x70_01_73_05, 0x70_01_67_af, 0x71_44_f9_94,
      0x71_6f_14_bc, 0x73_71_cd_82, 0x74_72_57_14, 0x75_83_c8_2f, 0x75_fc_9b_70, 0x76_5f_a6_93,
      0x76_c9_12_64, 0x79_cf_d7_56, 0x7b_e8_39_f2, 0x7c_7c_a0_5c, 0x7d_03_5f_c6, 0x7f_4c_e8_0b,
      0x80_10_59_a0, 0x81_59_bf_b3, 0x81_8b_a6_ff, 0x84_64_aa_16, 0x84_8b_47_7c, 0x84_a1_eb_b0,
      0x85_4f_6c_c6, 0x86_88_01_03, 0x8a_30_48_0d, 0x8a_b0_37_1f, 0x8d_91_4e_2c, 0x8d_e8_49_15,
      0x8e_66_7b_89, 0x8f_90_21_84, 0x90_0b_07_7f, 0x92_d8_d1_1d, 0x95_09_d0_5b, 0x95_35_27_0e,
      0x96_62_4f_a7, 0x98_dd_d5_b6, 0x9b_02_16_be, 0x9e_02_b0_ae, 0x9f_b6_16_d1, 0xa1_60_99_23,
      0xa3_75_8c_bd, 0xa3_85_08_11, 0xa4_53_ad_cb, 0xa7_da_95_ba, 0xa8_36_2b_6d, 0xa9_2f_61_a7,
      0xa9_3c_c5_6d, 0xac_84_47_87, 0xad_fa_21_78, 0xb5_f2_e2_09, 0xb6_c0_4b_48, 0xb7_ff_4f_5c,
      0xb8_a7_ba_99, 0xba_ad_d4_43, 0xbc_22_76_7e, 0xbc_fc_2f_6c, 0xbe_60_6c_5c, 0xbe_d0_1b_ce,
      0xbf_89_f2_58, 0xc1_7a_1e_5d, 0xc4_00_4d_0f, 0xc4_43_bb_c9, 0xc4_5d_18_7d, 0xc4_d1_9d_46,
      0xc5_35_ad_64, 0xc6_0f_b0_40, 0xc6_b1_e7_61, 0xc6_df_26_ae, 0xc8_a1_af_48, 0xc8_f0_bb_c4,
      0xca_a3_21_93, 0xcd_2a_6c_e2, 0xce_31_17_98, 0xcf_41_1c_ac, 0xcf_60_54_45, 0xd0_06_21_3a,
      0xd1_df_60_57, 0xd4_0e_dc_ef, 0xd5_40_35_95, 0xd6_75_c8_89, 0xd7_9f_43_d4, 0xd9_79_a9_b5,
      0xd9_c7_a4_82, 0xdb_9d_9b_cf, 0xdb_f0_9f_43, 0xdd_d2_e8_51, 0xdf_0a_08_58, 0xdf_77_15_f9,
      0xdf_a3_45_c0, 0xdf_a9_30_5e, 0xe0_b1_04_65, 0xe2_ed_e2_ad, 0xe3_a8_ab_c1, 0xe3_c6_28_fc,
      0xe4_c1_24_1b, 0xe5_e7_73_90, 0xe6_45_37_f5, 0xe7_94_bc_f9, 0xe9_b4_28_29, 0xf0_fd_eb_75,
      0xf1_cc_73_32, 0xf2_08_4a_c6, 0xf4_86_f7_b5, 0xf5_f0_e6_dc, 0xf8_7e_90_6c, 0xf8_ae_2d_4b,
      0xf9_56_c2_23, 0xf9_5f_d7_68, 0xfa_23_d4_33, 0xfc_4a_a3_ac, 0xfc_7d_c5_59, 0xfd_8c_b5_a2,
      0xfe_7f_04_ae, 0xff_60_47_77,
    ],
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
    id: 'bw2-stationary-5v-any-a',
    name: { ja: 'BW2 固定・野生 A抜け5V', en: 'BW2 Stationary/Wild 5V -Atk' },
    description: { ja: '31-x-31-31-31-31', en: '31-x-31-31-31-31' },
    version: 'BW2',
    category: 'stationary',
    seeds: [
      0x07_2e_d8_93, 0x08_d3_42_72, 0x09_62_73_44, 0x0b_fd_8d_25, 0x0e_3d_8c_80, 0x10_7d_dc_08,
      0x11_db_c4_43, 0x11_f8_2c_0d, 0x12_16_54_fd, 0x13_35_2d_14, 0x13_b4_d6_96, 0x14_71_99_22,
      0x15_c1_a4_44, 0x16_1e_ec_f3, 0x19_cb_2f_54, 0x1a_9a_a9_17, 0x1b_08_f9_dd, 0x1b_dc_44_b8,
      0x1d_50_ab_4a, 0x21_d0_64_38, 0x22_5a_5e_02, 0x28_48_9e_02, 0x28_c0_14_1f, 0x29_8e_5c_aa,
      0x2a_66_77_63, 0x2b_78_92_2a, 0x2b_d6_87_1c, 0x2d_97_95_9f, 0x31_c2_6d_e4, 0x35_0c_d4_35,
      0x35_ce_ea_4d, 0x3a_f1_b9_68, 0x3b_aa_92_76, 0x3c_ff_9c_44, 0x3e_da_14_a4, 0x41_af_ba_d8,
      0x43_ae_32_58, 0x44_99_0b_a7, 0x44_d2_d0_32, 0x45_8c_1f_a4, 0x45_d9_f0_f1, 0x47_46_44_b0,
      0x4a_ab_4f_80, 0x4d_08_e5_29, 0x4e_8d_e4_96, 0x51_9a_0c_07, 0x54_3a_f2_fa, 0x54_91_ef_ef,
      0x55_93_44_84, 0x57_87_b2_20, 0x5c_ff_ec_6f, 0x5e_0b_cf_71, 0x5f_50_5b_98, 0x5f_af_23_05,
      0x5f_d3_82_6c, 0x5f_ea_ce_3b, 0x63_1e_20_71, 0x63_4c_c2_b0, 0x63_f3_3c_5e, 0x64_e7_6d_d6,
      0x65_29_75_61, 0x67_76_0f_c2, 0x70_5e_33_ec, 0x71_af_c8_96, 0x73_b5_9f_57, 0x74_9d_19_17,
      0x76_aa_4f_06, 0x78_8a_2b_b6, 0x7d_12_9b_bb, 0x7e_91_ee_f3, 0x7f_93_71_31, 0x7f_ae_1d_91,
      0x82_50_c3_05, 0x83_d0_c3_d7, 0x83_ea_43_15, 0x88_ef_de_c2, 0x8b_83_c2_4b, 0x8e_ce_34_e9,
      0x91_a5_d6_74, 0x92_7d_ca_f6, 0x95_fc_ba_8f, 0x98_1f_5b_50, 0x9c_25_d4_3b, 0xa2_01_f3_d5,
      0xa4_3e_11_56, 0xa4_ec_9a_5d, 0xa7_cc_05_a8, 0xa8_44_15_cb, 0xaa_33_38_35, 0xaa_9d_d4_84,
      0xab_02_71_ea, 0xab_d9_3e_44, 0xac_c2_d3_60, 0xad_d8_77_c4, 0xb0_fe_d4_ef, 0xb3_2b_6b_02,
      0xb8_0b_77_b6, 0xb8_47_15_8d, 0xbd_24_e1_7b, 0xc2_8a_88_2e, 0xc3_1d_de_f7, 0xc3_75_c0_e8,
      0xc4_43_e0_e2, 0xc5_d7_15_42, 0xc6_8a_d2_b9, 0xc8_4f_2d_9b, 0xce_22_ba_ab, 0xd0_b6_70_04,
      0xd0_e2_99_32, 0xd1_a5_7d_d4, 0xd1_d7_ce_6f, 0xd2_86_65_3c, 0xd2_f0_55_9d, 0xd4_02_a0_97,
      0xd4_c3_b6_be, 0xd8_1b_79_35, 0xd9_1f_34_86, 0xdf_e7_eb_f2, 0xe3_43_72_ae, 0xe3_f9_04_e3,
      0xe4_66_62_40, 0xe4_68_0e_3f, 0xe6_e1_14_b5, 0xea_9b_3f_6d, 0xea_9f_e8_3a, 0xec_8d_2c_d4,
      0xed_01_c9_c2, 0xf2_2f_41_d6, 0xf2_79_c5_4c, 0xf2_f8_19_9f, 0xf4_02_31_1f, 0xfc_5c_81_81,
      0xfd_9a_7d_2b, 0xff_1e_dc_97, 0xff_93_f9_44,
    ],
  },
  {
    id: 'bw2-stationary-5v-any-c',
    name: { ja: 'BW2 固定・野生 C抜け5V', en: 'BW2 Stationary/Wild 5V -SpA' },
    description: { ja: '31-31-31-x-31-31', en: '31-31-31-x-31-31' },
    version: 'BW2',
    category: 'stationary',
    seeds: [
      0x01_5a_ca_e2, 0x04_68_8a_64, 0x05_6c_7b_9d, 0x07_27_06_25, 0x07_8f_29_15, 0x07_e9_ce_23,
      0x08_5d_a8_98, 0x08_41_44_df, 0x08_e3_59_33, 0x09_51_3e_25, 0x09_dd_ec_fe, 0x0d_90_4f_7a,
      0x0e_cb_69_d5, 0x11_e1_19_9f, 0x14_3d_66_96, 0x19_44_76_26, 0x1a_2c_64_a0, 0x1a_1f_4c_ce,
      0x1a_7c_30_a9, 0x1b_25_d8_2b, 0x1e_d3_51_f6, 0x1f_d2_36_17, 0x20_f5_e0_24, 0x23_bc_0a_84,
      0x23_d1_87_09, 0x24_88_5c_d3, 0x29_98_1d_9e, 0x30_3e_f8_82, 0x31_56_c7_b8, 0x31_75_91_95,
      0x31_c2_6d_e4, 0x32_16_11_97, 0x37_12_e0_08, 0x3c_ec_88_d9, 0x42_8c_b9_59, 0x45_2e_e0_30,
      0x46_49_4e_a1, 0x4a_cc_7a_9e, 0x4b_4c_8f_cb, 0x4d_39_10_b5, 0x4f_22_a2_6f, 0x51_9a_0c_07,
      0x51_d7_ec_eb, 0x51_e8_66_cc, 0x53_fe_e9_af, 0x54_3e_fb_6f, 0x5a_20_75_42, 0x5b_e0_be_74,
      0x5f_99_ca_3d, 0x63_5f_f4_c9, 0x63_f4_88_40, 0x64_6a_1f_a1, 0x67_f4_90_4a, 0x6a_90_1e_be,
      0x6f_b9_23_19, 0x70_8e_5f_03, 0x71_4d_be_bc, 0x71_67_35_ef, 0x73_af_97_e2, 0x74_09_cd_a3,
      0x78_33_8a_5e, 0x78_b6_4e_2f, 0x79_5d_49_1f, 0x7d_19_29_88, 0x7d_12_7c_52, 0x7d_87_72_97,
      0x7e_80_96_f0, 0x7e_c9_8f_40, 0x7f_4c_a2_9c, 0x82_1f_b2_f1, 0x85_12_db_2b, 0x85_b0_49_c4,
      0x87_ab_32_49, 0x88_76_45_b2, 0x89_c2_82_e0, 0x8a_9f_a0_a4, 0x8b_3e_8f_d8, 0x8c_07_2f_65,
      0x8d_ed_5a_ea, 0x91_08_9a_7e, 0x91_23_57_3d, 0x93_44_1b_b1, 0x93_c6_e6_63, 0x99_0a_c5_02,
      0x99_96_11_df, 0x9a_19_dd_d1, 0x9a_e6_2f_d0, 0x9f_9f_96_2c, 0xa3_d9_ec_19, 0xa7_0d_9e_01,
      0xab_0a_9a_92, 0xac_d9_69_eb, 0xad_a0_d7_9f, 0xaf_e4_44_41, 0xb1_d0_89_df, 0xb2_06_1c_2a,
      0xb6_06_03_71, 0xb9_04_bb_ca, 0xb9_5c_a7_6c, 0xba_9d_92_08, 0xba_d8_18_48, 0xbd_18_83_01,
      0xbe_33_9a_49, 0xc0_f3_8d_8e, 0xc2_83_5f_21, 0xc2_8a_88_2e, 0xc6_71_99_54, 0xc6_c5_9d_f0,
      0xc8_41_84_69, 0xcb_6c_3f_6d, 0xcd_c3_a5_7a, 0xce_14_81_60, 0xd1_83_c2_69, 0xd3_bf_c3_fa,
      0xd7_48_c5_e6, 0xd8_9f_02_ab, 0xde_3d_9b_54, 0xdf_e7_eb_f2, 0xe0_8d_c7_20, 0xe2_8c_29_b2,
      0xe3_43_72_ae, 0xe3_df_52_4e, 0xe7_54_ae_c9, 0xe7_e0_4d_24, 0xea_4a_e8_8c, 0xeb_1e_61_78,
      0xed_01_c9_c2, 0xed_bc_23_1c, 0xef_07_9f_0a, 0xf1_83_c7_55, 0xf4_75_1b_bd, 0xf4_e5_fd_8a,
      0xf5_2c_a8_2b, 0xfa_5e_c6_70,
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
