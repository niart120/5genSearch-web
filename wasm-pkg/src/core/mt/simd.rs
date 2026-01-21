//! MT19937 SIMD 実装 (4系統並列)

use std::simd::{cmp::SimdPartialEq, u32x4};

use super::{INIT_MULTIPLIER, LOWER_MASK, M, MATRIX_A, N, UPPER_MASK};
use crate::types::MtSeed;

/// SIMD 版 MT19937 (4系統並列)
pub struct Mt19937x4 {
    state: [u32x4; N],
    index: usize,
}

impl Mt19937x4 {
    /// 4つの異なるシードから初期化
    pub fn new(seeds: [MtSeed; 4]) -> Self {
        let mut state = [u32x4::splat(0); N];

        state[0] = u32x4::from_array([
            seeds[0].value(),
            seeds[1].value(),
            seeds[2].value(),
            seeds[3].value(),
        ]);

        for i in 1..N {
            let prev = state[i - 1];
            let shifted = prev >> 30;
            let xored = prev ^ shifted;
            let multiplied = xored * u32x4::splat(INIT_MULTIPLIER);
            state[i] = multiplied + u32x4::splat(i as u32);
        }

        Self { state, index: N }
    }

    /// u32 配列から直接作成
    pub fn from_raw(seeds: [u32; 4]) -> Self {
        Self::new(seeds.map(MtSeed::new))
    }

    /// 4系統同時に次の乱数を取得
    pub fn next_u32x4(&mut self) -> [u32; 4] {
        if self.index >= N {
            self.twist();
        }

        let mut y = self.state[self.index];
        self.index += 1;

        // Tempering
        y ^= y >> 11;
        y ^= (y << 7) & u32x4::splat(0x9D2C_5680);
        y ^= (y << 15) & u32x4::splat(0xEFC6_0000);
        y ^= y >> 18;

        y.to_array()
    }

    /// Twist (SIMD版)
    fn twist(&mut self) {
        let upper = u32x4::splat(UPPER_MASK);
        let lower = u32x4::splat(LOWER_MASK);
        let matrix_a = u32x4::splat(MATRIX_A);

        for i in 0..N {
            let x = (self.state[i] & upper) | (self.state[(i + 1) % N] & lower);
            let x_a_base = x >> 1;
            // 条件付き XOR: 最下位ビットが1の場合のみ MATRIX_A を XOR
            // (x & 1) != 0 の場合は MATRIX_A、そうでなければ 0
            let mask = (x & u32x4::splat(1)).simd_eq(u32x4::splat(1));
            let x_a = x_a_base ^ (mask.select(matrix_a, u32x4::splat(0)));
            self.state[i] = self.state[(i + M) % N] ^ x_a;
        }
        self.index = 0;
    }

    /// 指定回数だけ乱数を消費
    pub fn discard(&mut self, count: u32) {
        for _ in 0..count {
            self.next_u32x4();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::mt::Mt19937;

    #[test]
    fn test_simd_matches_scalar() {
        let seeds = [100, 200, 300, 400].map(MtSeed::new);
        let mut simd = Mt19937x4::new(seeds);
        let mut scalars: [Mt19937; 4] = seeds.map(Mt19937::new);

        for _ in 0..100 {
            let simd_results = simd.next_u32x4();
            for i in 0..4 {
                assert_eq!(simd_results[i], scalars[i].next_u32());
            }
        }
    }

    #[test]
    fn test_simd_after_twist() {
        // twist 後も一致することを確認 (N=624 を超える)
        let seeds = [1, 2, 3, 4].map(MtSeed::new);
        let mut simd = Mt19937x4::new(seeds);
        let mut scalars: [Mt19937; 4] = seeds.map(Mt19937::new);

        for _ in 0..700 {
            let simd_results = simd.next_u32x4();
            for i in 0..4 {
                assert_eq!(simd_results[i], scalars[i].next_u32());
            }
        }
    }
}
