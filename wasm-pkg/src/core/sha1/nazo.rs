//! Nazo 値テーブル
//!
//! ROM バージョン・リージョン毎の固定値。
//! 参照: https://blog.bzl-web.com/entry/2020/09/18/235128

use crate::types::{RomRegion, RomVersion};

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
/// ROM バージョンとリージョンに対応する Nazo 値を返す。
pub const fn get_nazo_values(version: RomVersion, region: RomRegion) -> NazoValues {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nazo_black_jpn() {
        let nazo = get_nazo_values(RomVersion::Black, RomRegion::Jpn);
        assert_eq!(nazo.values[0], 0x0221_5F10);
        assert_eq!(nazo.values[1], 0x0221_600C);
    }

    #[test]
    fn test_nazo_white_jpn() {
        let nazo = get_nazo_values(RomVersion::White, RomRegion::Jpn);
        // White JPN は Black JPN と異なる
        assert_eq!(nazo.values[0], 0x0221_5F30);
        assert_eq!(nazo.values[1], 0x0221_602C);
    }

    #[test]
    fn test_nazo_black2_jpn() {
        let nazo = get_nazo_values(RomVersion::Black2, RomRegion::Jpn);
        assert_eq!(nazo.values[0], 0x0209_A8DC);
        assert_eq!(nazo.values[1], 0x0203_9AC9);
        assert_eq!(nazo.values[2], 0x021F_F9B0);
    }

    #[test]
    fn test_nazo_white2_jpn() {
        let nazo = get_nazo_values(RomVersion::White2, RomRegion::Jpn);
        assert_eq!(nazo.values[0], 0x0209_A8FC);
        assert_eq!(nazo.values[1], 0x0203_9AF5);
    }

    #[test]
    fn test_nazo_different_regions() {
        let jpn = get_nazo_values(RomVersion::Black, RomRegion::Jpn);
        let usa = get_nazo_values(RomVersion::Black, RomRegion::Usa);
        // 日本語版とUSA版は異なる
        assert_ne!(jpn.values[0], usa.values[0]);
    }

    #[test]
    fn test_nazo_black2_usa() {
        let nazo = get_nazo_values(RomVersion::Black2, RomRegion::Usa);
        assert_eq!(nazo.values[0], 0x0209_AEE8);
        assert_eq!(nazo.values[1], 0x0203_9DE9);
    }
}
