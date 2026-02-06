//! Nazo 値テーブル
//!
//! ROM バージョン・リージョン・ハードウェア毎の固定値。
//! 参照: <https://blog.bzl-web.com/entry/2020/09/18/235128>

use crate::types::{DsConfig, Hardware, RomRegion, RomVersion};

/// Nazo 値 (5つの32bit定数)
#[derive(Debug, Clone, Copy)]
pub struct NazoValues {
    pub values: [u32; 5],
}

impl NazoValues {
    pub const fn new(values: [u32; 5]) -> Self {
        Self { values }
    }
}

/// Nazo 値を取得
///
/// DS 設定 (`DsConfig`) に対応する Nazo 値を返す。
/// ハードウェアが DS/DS Lite の場合は DS 用テーブル、
/// `DSi`/3DS の場合は `DSi` 用テーブルを使用する。
pub const fn get_nazo_values(ds: &DsConfig) -> NazoValues {
    match ds.hardware {
        Hardware::Ds | Hardware::DsLite => get_nazo_values_ds(ds.version, ds.region),
        Hardware::Dsi | Hardware::Dsi3ds => get_nazo_values_dsi(ds.version, ds.region),
    }
}

/// DS / DS Lite 用 Nazo 値テーブル
#[allow(clippy::too_many_lines, clippy::match_same_arms)]
const fn get_nazo_values_ds(version: RomVersion, region: RomRegion) -> NazoValues {
    match (version, region) {
        // ===== Black =====
        (RomVersion::Black, RomRegion::Jpn) => NazoValues::new([
            0x0221_5F10,
            0x0221_600C,
            0x0221_600C,
            0x0221_6058,
            0x0221_6058,
        ]),
        (RomVersion::Black, RomRegion::Kor) => NazoValues::new([
            0x0221_67B0,
            0x0221_68AC,
            0x0221_68AC,
            0x0221_68F8,
            0x0221_68F8,
        ]),
        (RomVersion::Black, RomRegion::Usa) => NazoValues::new([
            0x0221_60B0,
            0x0221_61AC,
            0x0221_61AC,
            0x0221_61F8,
            0x0221_61F8,
        ]),
        (RomVersion::Black, RomRegion::Ger) => NazoValues::new([
            0x0221_5FF0,
            0x0221_60EC,
            0x0221_60EC,
            0x0221_6138,
            0x0221_6138,
        ]),
        (RomVersion::Black, RomRegion::Fra) => NazoValues::new([
            0x0221_6030,
            0x0221_612C,
            0x0221_612C,
            0x0221_6178,
            0x0221_6178,
        ]),
        (RomVersion::Black, RomRegion::Spa) => NazoValues::new([
            0x0221_6070,
            0x0221_616C,
            0x0221_616C,
            0x0221_61B8,
            0x0221_61B8,
        ]),
        (RomVersion::Black, RomRegion::Ita) => NazoValues::new([
            0x0221_5FB0,
            0x0221_60AC,
            0x0221_60AC,
            0x0221_60F8,
            0x0221_60F8,
        ]),
        // ===== White =====
        (RomVersion::White, RomRegion::Jpn) => NazoValues::new([
            0x0221_5F30,
            0x0221_602C,
            0x0221_602C,
            0x0221_6078,
            0x0221_6078,
        ]),
        (RomVersion::White, RomRegion::Kor) => NazoValues::new([
            0x0221_67B0,
            0x0221_68AC,
            0x0221_68AC,
            0x0221_68F8,
            0x0221_68F8,
        ]),
        (RomVersion::White, RomRegion::Usa) => NazoValues::new([
            0x0221_60D0,
            0x0221_61CC,
            0x0221_61CC,
            0x0221_6218,
            0x0221_6218,
        ]),
        (RomVersion::White, RomRegion::Ger) => NazoValues::new([
            0x0221_6010,
            0x0221_610C,
            0x0221_610C,
            0x0221_6158,
            0x0221_6158,
        ]),
        (RomVersion::White, RomRegion::Fra) => NazoValues::new([
            0x0221_6050,
            0x0221_614C,
            0x0221_614C,
            0x0221_6198,
            0x0221_6198,
        ]),
        (RomVersion::White, RomRegion::Spa) => NazoValues::new([
            0x0221_6070,
            0x0221_616C,
            0x0221_616C,
            0x0221_61B8,
            0x0221_61B8,
        ]),
        (RomVersion::White, RomRegion::Ita) => NazoValues::new([
            0x0221_5FD0,
            0x0221_60CC,
            0x0221_60CC,
            0x0221_6118,
            0x0221_6118,
        ]),
        // ===== Black2 =====
        (RomVersion::Black2, RomRegion::Jpn) => NazoValues::new([
            0x0209_A8DC,
            0x0203_9AC9,
            0x021F_F9B0,
            0x021F_FA04,
            0x021F_FA04,
        ]),
        (RomVersion::Black2, RomRegion::Kor) => NazoValues::new([
            0x0209_B60C,
            0x0203_A4D5,
            0x0220_0750,
            0x0220_07A4,
            0x0220_07A4,
        ]),
        (RomVersion::Black2, RomRegion::Usa) => NazoValues::new([
            0x0209_AEE8,
            0x0203_9DE9,
            0x0220_0010,
            0x0220_0064,
            0x0220_0064,
        ]),
        (RomVersion::Black2, RomRegion::Ger) => NazoValues::new([
            0x0209_AE28,
            0x0203_9D69,
            0x021F_FF50,
            0x021F_FFA4,
            0x021F_FFA4,
        ]),
        (RomVersion::Black2, RomRegion::Fra) => NazoValues::new([
            0x0209_AF08,
            0x0203_9DF9,
            0x0220_0030,
            0x0220_0084,
            0x0220_0084,
        ]),
        (RomVersion::Black2, RomRegion::Spa) => NazoValues::new([
            0x0209_AEA8,
            0x0203_9DB9,
            0x021F_FFD0,
            0x0220_0024,
            0x0220_0024,
        ]),
        (RomVersion::Black2, RomRegion::Ita) => NazoValues::new([
            0x0209_ADE8,
            0x0203_9D69,
            0x021F_FF10,
            0x021F_FF64,
            0x021F_FF64,
        ]),
        // ===== White2 =====
        (RomVersion::White2, RomRegion::Jpn) => NazoValues::new([
            0x0209_A8FC,
            0x0203_9AF5,
            0x021F_F9D0,
            0x021F_FA24,
            0x021F_FA24,
        ]),
        (RomVersion::White2, RomRegion::Kor) => NazoValues::new([
            0x0209_B62C,
            0x0203_A501,
            0x0220_0770,
            0x0220_07C4,
            0x0220_07C4,
        ]),
        (RomVersion::White2, RomRegion::Usa) => NazoValues::new([
            0x0209_AF28,
            0x0203_9E15,
            0x0220_0050,
            0x0220_00A4,
            0x0220_00A4,
        ]),
        (RomVersion::White2, RomRegion::Ger) => NazoValues::new([
            0x0209_AE48,
            0x0203_9D95,
            0x021F_FF70,
            0x021F_FFC4,
            0x021F_FFC4,
        ]),
        (RomVersion::White2, RomRegion::Fra) => NazoValues::new([
            0x0209_AF28,
            0x0203_9E25,
            0x0220_0050,
            0x0220_00A4,
            0x0220_00A4,
        ]),
        (RomVersion::White2, RomRegion::Spa) => NazoValues::new([
            0x0209_AEC8,
            0x0203_9DE5,
            0x021F_FFF0,
            0x0220_0044,
            0x0220_0044,
        ]),
        (RomVersion::White2, RomRegion::Ita) => NazoValues::new([
            0x0209_AE28,
            0x0203_9D95,
            0x021F_FF50,
            0x021F_FFA4,
            0x021F_FFA4,
        ]),
    }
}

/// `DSi` / 3DS 用 Nazo 値テーブル
#[allow(clippy::too_many_lines, clippy::match_same_arms)]
const fn get_nazo_values_dsi(version: RomVersion, region: RomRegion) -> NazoValues {
    match (version, region) {
        // ===== Black (DSi/3DS) =====
        (RomVersion::Black, RomRegion::Jpn) => NazoValues::new([
            0x0276_1150,
            0x0276_124C,
            0x0276_124C,
            0x0276_1298,
            0x0276_1298,
        ]),
        (RomVersion::Black, RomRegion::Usa) => NazoValues::new([
            0x0276_0190,
            0x0276_028C,
            0x0276_028C,
            0x0276_02D8,
            0x0276_02D8,
        ]),
        (RomVersion::Black, RomRegion::Kor) => NazoValues::new([
            0x0276_1150,
            0x0276_124C,
            0x0276_124C,
            0x0276_1298,
            0x0276_1298,
        ]),
        (RomVersion::Black, RomRegion::Ger) => NazoValues::new([
            0x0276_02F0,
            0x0276_03EC,
            0x0276_03EC,
            0x0276_0438,
            0x0276_0438,
        ]),
        (RomVersion::Black, RomRegion::Fra) => NazoValues::new([
            0x0276_0230,
            0x0276_032C,
            0x0276_032C,
            0x0276_0378,
            0x0276_0378,
        ]),
        (RomVersion::Black, RomRegion::Spa) => NazoValues::new([
            0x0276_01F0,
            0x0276_02EC,
            0x0276_02EC,
            0x0276_0338,
            0x0276_0338,
        ]),
        (RomVersion::Black, RomRegion::Ita) => NazoValues::new([
            0x0276_01D0,
            0x0276_02CC,
            0x0276_02CC,
            0x0276_0318,
            0x0276_0318,
        ]),
        // ===== White (DSi/3DS) =====
        (RomVersion::White, RomRegion::Jpn) => NazoValues::new([
            0x0276_1150,
            0x0276_124C,
            0x0276_124C,
            0x0276_1298,
            0x0276_1298,
        ]),
        (RomVersion::White, RomRegion::Usa) => NazoValues::new([
            0x0276_01B0,
            0x0276_02AC,
            0x0276_02AC,
            0x0276_02F8,
            0x0276_02F8,
        ]),
        (RomVersion::White, RomRegion::Kor) => NazoValues::new([
            0x0276_1150,
            0x0276_124C,
            0x0276_124C,
            0x0276_1298,
            0x0276_1298,
        ]),
        (RomVersion::White, RomRegion::Ger) => NazoValues::new([
            0x0276_02F0,
            0x0276_03EC,
            0x0276_03EC,
            0x0276_0438,
            0x0276_0438,
        ]),
        (RomVersion::White, RomRegion::Fra) => NazoValues::new([
            0x0276_0250,
            0x0276_034C,
            0x0276_034C,
            0x0276_0398,
            0x0276_0398,
        ]),
        (RomVersion::White, RomRegion::Spa) => NazoValues::new([
            0x0276_01F0,
            0x0276_02EC,
            0x0276_02EC,
            0x0276_0338,
            0x0276_0338,
        ]),
        (RomVersion::White, RomRegion::Ita) => NazoValues::new([
            0x0276_01D0,
            0x0276_02CC,
            0x0276_02CC,
            0x0276_0318,
            0x0276_0318,
        ]),
        // ===== Black2 (DSi/3DS) =====
        (RomVersion::Black2, RomRegion::Jpn) => NazoValues::new([
            0x0209_A8DC,
            0x0203_9AC9,
            0x027A_A730,
            0x027A_A784,
            0x027A_A784,
        ]),
        (RomVersion::Black2, RomRegion::Usa) => NazoValues::new([
            0x0209_AEE8,
            0x0203_9DE9,
            0x027A_5F70,
            0x027A_5FC4,
            0x027A_5FC4,
        ]),
        (RomVersion::Black2, RomRegion::Kor) => NazoValues::new([
            0x0209_B60C,
            0x0203_A4D5,
            0x0220_0770,
            0x0220_07C4,
            0x0220_07C4,
        ]),
        (RomVersion::Black2, RomRegion::Ger) => NazoValues::new([
            0x0209_AE28,
            0x0203_9D69,
            0x027A_6110,
            0x027A_6164,
            0x027A_6164,
        ]),
        (RomVersion::Black2, RomRegion::Fra) => NazoValues::new([
            0x0209_AF08,
            0x0203_9DF9,
            0x027A_5F90,
            0x027A_5FE4,
            0x027A_5FE4,
        ]),
        (RomVersion::Black2, RomRegion::Spa) => NazoValues::new([
            0x0209_AEA8,
            0x0203_9DB9,
            0x027A_6070,
            0x027A_60C4,
            0x027A_60C4,
        ]),
        (RomVersion::Black2, RomRegion::Ita) => NazoValues::new([
            0x0209_ADE8,
            0x0203_9D69,
            0x027A_5F70,
            0x027A_5FC4,
            0x027A_5FC4,
        ]),
        // ===== White2 (DSi/3DS) =====
        (RomVersion::White2, RomRegion::Jpn) => NazoValues::new([
            0x0209_A8FC,
            0x0203_9AF5,
            0x027A_A5F0,
            0x027A_A644,
            0x027A_A644,
        ]),
        (RomVersion::White2, RomRegion::Usa) => NazoValues::new([
            0x0209_AF28,
            0x0203_9E15,
            0x027A_5E90,
            0x027A_5EE4,
            0x027A_5EE4,
        ]),
        (RomVersion::White2, RomRegion::Kor) => NazoValues::new([
            0x0209_B62C,
            0x0203_A501,
            0x027A_57B0,
            0x027A_8704,
            0x027A_8704,
        ]),
        (RomVersion::White2, RomRegion::Ger) => NazoValues::new([
            0x0209_AE48,
            0x0203_9D95,
            0x027A_6010,
            0x027A_6064,
            0x027A_6064,
        ]),
        (RomVersion::White2, RomRegion::Fra) => NazoValues::new([
            0x0209_AF28,
            0x0203_9E25,
            0x027A_5EF0,
            0x027A_5F44,
            0x027A_5F44,
        ]),
        (RomVersion::White2, RomRegion::Spa) => NazoValues::new([
            0x0209_AEC8,
            0x0203_9DE5,
            0x027A_5FB0,
            0x027A_6004,
            0x027A_6004,
        ]),
        (RomVersion::White2, RomRegion::Ita) => NazoValues::new([
            0x0209_AE28,
            0x0203_9D95,
            0x027A_5ED0,
            0x027A_5F24,
            0x027A_5F24,
        ]),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// テスト用ヘルパー: `DsConfig` を生成
    const fn ds_config(hardware: Hardware, version: RomVersion, region: RomRegion) -> DsConfig {
        DsConfig {
            mac: [0; 6],
            hardware,
            version,
            region,
        }
    }

    // ===== DS 用 回帰テスト =====

    #[test]
    fn test_ds_black_jpn() {
        let ds = ds_config(Hardware::DsLite, RomVersion::Black, RomRegion::Jpn);
        let nazo = get_nazo_values(&ds);
        assert_eq!(nazo.values[0], 0x0221_5F10);
        assert_eq!(nazo.values[1], 0x0221_600C);
    }

    #[test]
    fn test_ds_white_jpn() {
        let ds = ds_config(Hardware::DsLite, RomVersion::White, RomRegion::Jpn);
        let nazo = get_nazo_values(&ds);
        assert_eq!(nazo.values[0], 0x0221_5F30);
        assert_eq!(nazo.values[1], 0x0221_602C);
    }

    #[test]
    fn test_ds_black2_jpn() {
        let ds = ds_config(Hardware::DsLite, RomVersion::Black2, RomRegion::Jpn);
        let nazo = get_nazo_values(&ds);
        assert_eq!(nazo.values[0], 0x0209_A8DC);
        assert_eq!(nazo.values[1], 0x0203_9AC9);
        assert_eq!(nazo.values[2], 0x021F_F9B0);
    }

    #[test]
    fn test_ds_white2_jpn() {
        let ds = ds_config(Hardware::DsLite, RomVersion::White2, RomRegion::Jpn);
        let nazo = get_nazo_values(&ds);
        assert_eq!(nazo.values[0], 0x0209_A8FC);
        assert_eq!(nazo.values[1], 0x0203_9AF5);
    }

    #[test]
    fn test_ds_different_regions() {
        let jpn = ds_config(Hardware::DsLite, RomVersion::Black, RomRegion::Jpn);
        let usa = ds_config(Hardware::DsLite, RomVersion::Black, RomRegion::Usa);
        assert_ne!(
            get_nazo_values(&jpn).values[0],
            get_nazo_values(&usa).values[0]
        );
    }

    #[test]
    fn test_ds_black2_usa() {
        let ds = ds_config(Hardware::DsLite, RomVersion::Black2, RomRegion::Usa);
        let nazo = get_nazo_values(&ds);
        assert_eq!(nazo.values[0], 0x0209_AEE8);
        assert_eq!(nazo.values[1], 0x0203_9DE9);
    }

    #[test]
    fn test_ds_and_dslite_return_same_values() {
        let ds = ds_config(Hardware::Ds, RomVersion::Black, RomRegion::Jpn);
        let dslite = ds_config(Hardware::DsLite, RomVersion::Black, RomRegion::Jpn);
        assert_eq!(get_nazo_values(&ds).values, get_nazo_values(&dslite).values);
    }

    // ===== DSi/3DS 用テスト =====

    #[test]
    fn test_dsi_black_jpn() {
        let ds = ds_config(Hardware::Dsi, RomVersion::Black, RomRegion::Jpn);
        let nazo = get_nazo_values(&ds);
        assert_eq!(nazo.values[0], 0x0276_1150);
        assert_eq!(nazo.values[1], 0x0276_124C);
        assert_eq!(nazo.values[2], 0x0276_124C);
        assert_eq!(nazo.values[3], 0x0276_1298);
        assert_eq!(nazo.values[4], 0x0276_1298);
    }

    #[test]
    fn test_dsi_white_usa() {
        let ds = ds_config(Hardware::Dsi, RomVersion::White, RomRegion::Usa);
        let nazo = get_nazo_values(&ds);
        assert_eq!(nazo.values[0], 0x0276_01B0);
        assert_eq!(nazo.values[1], 0x0276_02AC);
    }

    #[test]
    fn test_dsi_black2_jpn() {
        let ds = ds_config(Hardware::Dsi, RomVersion::Black2, RomRegion::Jpn);
        let nazo = get_nazo_values(&ds);
        assert_eq!(nazo.values[0], 0x0209_A8DC);
        assert_eq!(nazo.values[1], 0x0203_9AC9);
        assert_eq!(nazo.values[2], 0x027A_A730);
        assert_eq!(nazo.values[3], 0x027A_A784);
        assert_eq!(nazo.values[4], 0x027A_A784);
    }

    #[test]
    fn test_dsi_white2_kor() {
        let ds = ds_config(Hardware::Dsi, RomVersion::White2, RomRegion::Kor);
        let nazo = get_nazo_values(&ds);
        assert_eq!(nazo.values[0], 0x0209_B62C);
        assert_eq!(nazo.values[1], 0x0203_A501);
        assert_eq!(nazo.values[2], 0x027A_57B0);
        assert_eq!(nazo.values[3], 0x027A_8704);
    }

    #[test]
    fn test_dsi_and_3ds_return_same_values() {
        let dsi = ds_config(Hardware::Dsi, RomVersion::Black2, RomRegion::Usa);
        let three_ds = ds_config(Hardware::Dsi3ds, RomVersion::Black2, RomRegion::Usa);
        assert_eq!(
            get_nazo_values(&dsi).values,
            get_nazo_values(&three_ds).values
        );
    }

    #[test]
    fn test_ds_and_dsi_differ_for_bw() {
        let ds = ds_config(Hardware::DsLite, RomVersion::Black, RomRegion::Jpn);
        let dsi = ds_config(Hardware::Dsi, RomVersion::Black, RomRegion::Jpn);
        assert_ne!(
            get_nazo_values(&ds).values[0],
            get_nazo_values(&dsi).values[0]
        );
    }

    #[test]
    fn test_ds_and_dsi_differ_for_bw2() {
        let ds = ds_config(Hardware::DsLite, RomVersion::Black2, RomRegion::Jpn);
        let dsi = ds_config(Hardware::Dsi, RomVersion::Black2, RomRegion::Jpn);
        // BW2 では NAZO[0] と NAZO[1] は同じだが NAZO[2] 以降が異なる
        assert_eq!(
            get_nazo_values(&ds).values[0],
            get_nazo_values(&dsi).values[0]
        );
        assert_ne!(
            get_nazo_values(&ds).values[2],
            get_nazo_values(&dsi).values[2]
        );
    }
}
