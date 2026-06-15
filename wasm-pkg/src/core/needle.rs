//! 針方向計算
//!
//! LCG Seed からレポート針の方向を計算する関数。

use crate::core::lcg::Lcg64;
use crate::types::{LcgSeed, NeedleDirection};

/// レポート針方向を計算
///
/// 入力は `Advance N` 時点の位置 seed。
/// その時点でレポートを書いた場合に表示される針方向を返す。
///
/// 呼び出し元の LCG cursor は進めず、関数内で 1 消費後の seed を純関数として計算する。
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
    fn test_calc_report_needle_direction_uses_next_seed() {
        let seed = LcgSeed::new(0x0123_4567_89AB_CDEF);
        let next = Lcg64::compute_next(seed);
        let upper = next.value() >> 32;
        let expected = NeedleDirection::from_value(((upper.wrapping_mul(8) >> 32) & 7) as u8);

        assert_eq!(calc_report_needle_direction(seed), expected);
    }

    #[test]
    fn test_calc_report_needle_direction_is_not_raw_seed_direction() {
        let seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let raw_direction = NeedleDirection::from_value(((seed.value() >> 61) & 7) as u8);

        assert_eq!(raw_direction, NeedleDirection::N);
        assert_eq!(calc_report_needle_direction(seed), NeedleDirection::W);
    }
}
