//! 針方向計算アルゴリズム

use crate::types::{LcgSeed, NeedleDirection};

/// LCG Seed から針方向を計算
///
/// Seed の上位 32bit のうち、さらに上位 3bit (bit 61-63) を取得して 0-7 に変換。
pub fn calculate_needle_direction(seed: LcgSeed) -> NeedleDirection {
    let value = seed.value();
    let upper32 = (value >> 32) as u32;
    let direction = (upper32 >> 29) as u8;
    NeedleDirection::from_value(direction)
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
}
