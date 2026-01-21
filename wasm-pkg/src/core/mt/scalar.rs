//! MT19937 スカラー実装

use super::{INIT_MULTIPLIER, LOWER_MASK, M, MATRIX_A, N, UPPER_MASK};
use crate::types::MtSeed;

/// MT19937 乱数生成器 (スカラー版)
#[derive(Clone)]
pub struct Mt19937 {
    state: [u32; N],
    index: usize,
}

impl Mt19937 {
    /// 新しい MT19937 インスタンスを作成
    #[allow(clippy::cast_possible_truncation)]
    pub fn new(seed: MtSeed) -> Self {
        let seed_val = seed.value();
        let mut state = [0u32; N];
        state[0] = seed_val;

        for i in 1..N {
            let prev = state[i - 1];
            state[i] = INIT_MULTIPLIER
                .wrapping_mul(prev ^ (prev >> 30))
                .wrapping_add(i as u32);
        }

        Self { state, index: N }
    }

    /// u32 から直接作成
    pub fn from_raw(seed: u32) -> Self {
        Self::new(MtSeed::new(seed))
    }

    /// 次の 32bit 乱数値を取得
    pub fn next_u32(&mut self) -> u32 {
        if self.index >= N {
            self.twist();
        }

        let mut y = self.state[self.index];
        self.index += 1;

        // Tempering
        y ^= y >> 11;
        y ^= (y << 7) & 0x9D2C_5680;
        y ^= (y << 15) & 0xEFC6_0000;
        y ^= y >> 18;

        y
    }

    /// 状態配列を更新 (twist)
    fn twist(&mut self) {
        for i in 0..N {
            let x = (self.state[i] & UPPER_MASK) | (self.state[(i + 1) % N] & LOWER_MASK);
            let mut x_a = x >> 1;
            if (x & 1) != 0 {
                x_a ^= MATRIX_A;
            }
            self.state[i] = self.state[(i + M) % N] ^ x_a;
        }
        self.index = 0;
    }

    /// 指定回数だけ乱数を消費
    pub fn discard(&mut self, count: u32) {
        for _ in 0..count {
            self.next_u32();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mt19937_reference_sequence() {
        // 標準テストベクタ (seed = 5489)
        let mut mt = Mt19937::new(MtSeed::new(5489));
        let expected = [
            3_499_211_612,
            581_869_302,
            3_890_346_734,
            3_586_334_585,
            545_404_204,
            4_161_255_391,
            3_922_919_429,
            949_333_985,
            2_715_962_298,
            1_323_567_403,
        ];

        for &value in &expected {
            assert_eq!(mt.next_u32(), value);
        }
    }

    #[test]
    fn test_discard() {
        let mut mt1 = Mt19937::new(MtSeed::new(12345));
        let mut mt2 = Mt19937::new(MtSeed::new(12345));

        mt1.discard(100);
        for _ in 0..100 {
            mt2.next_u32();
        }

        assert_eq!(mt1.next_u32(), mt2.next_u32());
    }
}
