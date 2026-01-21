//! 64bit 線形合同法乱数生成器 (LCG)
//!
//! Gen5 の性格値・エンカウント判定等に使用される PRNG。

use crate::types::{LcgSeed, MtSeed, NeedleDirection};

/// 乗数
pub const LCG_MULTIPLIER: u64 = 0x5D58_8B65_6C07_8965;

/// 加算定数
pub const LCG_INCREMENT: u64 = 0x0026_9EC3;

/// 64bit LCG 乱数生成器
///
/// Iterator trait を実装しており、`next()` で 32bit 乱数を取得可能。
#[derive(Debug, Clone)]
pub struct Lcg64 {
    seed: LcgSeed,
}

impl Lcg64 {
    /// 新しい LCG インスタンスを作成
    #[inline]
    pub const fn new(seed: LcgSeed) -> Self {
        Self { seed }
    }

    /// u64 から直接作成
    #[inline]
    pub const fn from_raw(seed: u64) -> Self {
        Self {
            seed: LcgSeed::new(seed),
        }
    }

    /// 次の 32bit 乱数値を取得 (上位 32bit) - 内部実装
    #[inline]
    fn gen_next_value(&mut self) -> u32 {
        let raw = self
            .seed
            .value()
            .wrapping_mul(LCG_MULTIPLIER)
            .wrapping_add(LCG_INCREMENT);
        self.seed = LcgSeed::new(raw);
        (raw >> 32) as u32
    }

    /// 次の Seed を取得
    #[inline]
    pub fn next_seed(&mut self) -> LcgSeed {
        let raw = self
            .seed
            .value()
            .wrapping_mul(LCG_MULTIPLIER)
            .wrapping_add(LCG_INCREMENT);
        self.seed = LcgSeed::new(raw);
        self.seed
    }

    /// 現在の Seed 値を取得
    #[inline]
    pub const fn current_seed(&self) -> LcgSeed {
        self.seed
    }

    /// Seed 値を設定
    #[inline]
    pub fn set_seed(&mut self, seed: LcgSeed) {
        self.seed = seed;
    }

    /// 指定回数だけ乱数を進める
    pub fn advance(&mut self, advances: u32) {
        for _ in 0..advances {
            self.gen_next_value();
        }
    }

    /// 高速スキップ O(log n)
    pub fn jump(&mut self, steps: u64) {
        let (mul, add) = Self::affine_for_steps(steps);
        let raw = Self::apply_raw(self.seed.value(), mul, add);
        self.seed = LcgSeed::new(raw);
    }

    /// Seed をリセット
    #[inline]
    pub fn reset(&mut self, seed: LcgSeed) {
        self.seed = seed;
    }
}

// ===== Iterator trait 実装 =====

impl Iterator for Lcg64 {
    type Item = u32;

    /// 次の 32bit 乱数値を取得
    #[inline]
    fn next(&mut self) -> Option<Self::Item> {
        Some(self.gen_next_value())
    }
}

// ===== 純関数 =====

impl Lcg64 {
    /// 1 ステップ進めた Seed を計算 (純関数)
    #[inline]
    pub fn compute_next(seed: LcgSeed) -> LcgSeed {
        let raw = seed
            .value()
            .wrapping_mul(LCG_MULTIPLIER)
            .wrapping_add(LCG_INCREMENT);
        LcgSeed::new(raw)
    }

    /// n ステップ進めた Seed を計算 (純関数)
    pub fn compute_advance(seed: LcgSeed, steps: u64) -> LcgSeed {
        let (mul, add) = Self::affine_for_steps(steps);
        LcgSeed::new(Self::apply_raw(seed.value(), mul, add))
    }

    /// n ステップ分のアフィン変換係数を計算
    pub fn affine_for_steps(steps: u64) -> (u64, u64) {
        let (mut mul, mut add) = (1u64, 0u64);
        let (mut cur_mul, mut cur_add) = (LCG_MULTIPLIER, LCG_INCREMENT);
        let mut k = steps;

        while k > 0 {
            if (k & 1) == 1 {
                add = add.wrapping_mul(cur_mul).wrapping_add(cur_add);
                mul = mul.wrapping_mul(cur_mul);
            }
            cur_add = cur_add.wrapping_mul(cur_mul).wrapping_add(cur_add);
            cur_mul = cur_mul.wrapping_mul(cur_mul);
            k >>= 1;
        }

        (mul, add)
    }

    /// アフィン変換を適用
    #[inline]
    fn apply_raw(seed: u64, mul: u64, add: u64) -> u64 {
        seed.wrapping_mul(mul).wrapping_add(add)
    }

    /// LCG Seed から針方向を計算
    #[inline]
    pub fn calc_needle_direction(seed: LcgSeed) -> NeedleDirection {
        let next = seed
            .value()
            .wrapping_mul(LCG_MULTIPLIER)
            .wrapping_add(LCG_INCREMENT);
        let dir = ((next >> 32).wrapping_mul(8)) >> 32;
        NeedleDirection::from_value((dir & 7) as u8)
    }

    /// n 分率を計算: (rand * n) >> 32
    #[inline]
    pub const fn calc_ratio(rand: u32, n: u32) -> u32 {
        ((rand as u64 * n as u64) >> 32) as u32
    }
}

// ===== LcgSeed に derive_mt_seed を実装 =====

impl LcgSeed {
    /// MT Seed を導出
    #[inline]
    pub fn derive_mt_seed(&self) -> MtSeed {
        let next = self
            .0
            .wrapping_mul(LCG_MULTIPLIER)
            .wrapping_add(LCG_INCREMENT);
        MtSeed::new((next >> 32) as u32)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lcg_basic() {
        let mut lcg = Lcg64::new(LcgSeed::new(0));
        assert_eq!(lcg.next().unwrap(), 0);
        assert_eq!(lcg.current_seed().value(), LCG_INCREMENT);
    }

    #[test]
    fn test_lcg_known_sequence() {
        let mut lcg = Lcg64::new(LcgSeed::new(1));
        let expected_seed = 1u64
            .wrapping_mul(LCG_MULTIPLIER)
            .wrapping_add(LCG_INCREMENT);
        let expected_value = (expected_seed >> 32) as u32;

        assert_eq!(lcg.next().unwrap(), expected_value);
        assert_eq!(lcg.current_seed().value(), expected_seed);
    }

    #[test]
    fn test_advance_equals_skip() {
        let seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let steps = 1000u64;

        let mut lcg1 = Lcg64::new(seed);
        let mut lcg2 = Lcg64::new(seed);

        for _ in 0..steps {
            lcg1.next();
        }
        lcg2.jump(steps);

        assert_eq!(lcg1.current_seed(), lcg2.current_seed());
    }

    #[test]
    fn test_needle_direction_range() {
        for i in 0..100 {
            let seed = LcgSeed::new(0x1234_5678_9ABC_DEF0u64.wrapping_add(i));
            let dir = Lcg64::calc_needle_direction(seed);
            assert!(dir.value() < 8);
        }
    }

    #[test]
    fn test_derive_mt_seed() {
        let lcg_seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
        let mt_seed = lcg_seed.derive_mt_seed();
        // 期待値を計算
        let next = lcg_seed
            .value()
            .wrapping_mul(LCG_MULTIPLIER)
            .wrapping_add(LCG_INCREMENT);
        let expected = (next >> 32) as u32;
        assert_eq!(mt_seed.value(), expected);
    }
}
