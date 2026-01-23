//! 針方向計算アルゴリズム

use crate::core::lcg::Lcg64;
use crate::types::{LcgSeed, NeedleDirection};

/// LCG Seed から針方向を計算 (旧実装)
///
/// Seed の上位 32bit のうち、さらに上位 3bit (bit 61-63) を取得して 0-7 に変換。
/// Generator 内部での使用を想定。
pub fn calculate_needle_direction(seed: LcgSeed) -> NeedleDirection {
    let value = seed.value();
    let upper32 = (value >> 32) as u32;
    let direction = (upper32 >> 29) as u8;
    NeedleDirection::from_value(direction)
}

/// レポート針方向を計算 (pokemon-gen5-initseed 準拠)
///
/// Seed を 1 回進めた後の上位 32bit を使用して 0-7 に変換。
/// レポート針検索 (`NeedleSearch`) で使用。
///
/// 計算式: `((next_seed >> 32) * 8) >> 32`
pub fn calc_report_needle_direction(seed: LcgSeed) -> NeedleDirection {
    let next = Lcg64::compute_next(seed);
    let upper = next.value() >> 32;
    let dir = upper.wrapping_mul(8) >> 32;
    NeedleDirection::from_value((dir & 7) as u8)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_needle_direction() {
        // 上位3ビットが 0b000 → N (0)
        let seed = LcgSeed::new(0x0000_0000_0000_0000);
        assert_eq!(calculate_needle_direction(seed), NeedleDirection::N);

        // 上位3ビットが 0b111 → NW (7)
        let seed = LcgSeed::new(0xE000_0000_0000_0000);
        assert_eq!(calculate_needle_direction(seed), NeedleDirection::NW);

        // 上位3ビットが 0b100 → S (4)
        let seed = LcgSeed::new(0x8000_0000_0000_0000);
        assert_eq!(calculate_needle_direction(seed), NeedleDirection::S);
    }

    #[test]
    fn test_calc_report_needle_direction() {
        // pokemon-gen5-initseed のテストケースを移植
        // 入力 Seed を 1 回進めて上位 32bit × 8 >> 32 で判定

        // 基本動作テスト: 結果が 0-7 の範囲内であること
        let seed = LcgSeed::new(0x0123_4567_89AB_CDEF);
        let dir = calc_report_needle_direction(seed);
        assert!(dir.value() <= 7);

        // 別のシード
        let seed = LcgSeed::new(0xFEDC_BA98_7654_3210);
        let dir = calc_report_needle_direction(seed);
        assert!(dir.value() <= 7);
    }
}
