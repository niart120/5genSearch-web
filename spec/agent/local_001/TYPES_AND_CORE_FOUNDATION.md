# 型定義・コア基盤 仕様書

## 1. 概要

### 1.1 目的

WASM API の基盤となる型定義と基本的な PRNG 実装を行う。mig_002 仕様書の Phase 1 (基礎層) に対応。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| LCG | Linear Congruential Generator (64bit 線形合同法) |
| MT19937 | Mersenne Twister 乱数生成器 (32bit) |
| BCD | Binary-Coded Decimal (10進各桁を4bitで表現) |
| LcgSeed | LCG の初期シード値 (64bit、NewType) |
| MtSeed | MT19937 の初期シード値 (32bit、NewType) |
| NeedleDirection | レポート針方向 (0-7 の8方向) |
| Portable SIMD | Rust の `std::simd` による SIMD 抽象化 |

### 1.3 背景・問題

- 既存の `wasm-pkg/src/lib.rs` は `health_check()` のみ実装されたスケルトン状態
- 計算コアの型定義と PRNG 実装が未着手
- TypeScript との型共有基盤が未構築

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 型安全性 | NewType パターンにより LcgSeed/MtSeed の混同を防止 |
| 型共有 | tsify による TypeScript 型の自動生成 |
| 計算基盤 | LCG/MT19937 の純粋な実装を提供 |
| テスト容易性 | 依存関係が少なく単体テスト可能 |

### 1.5 着手条件

- `wasm-pkg/Cargo.toml` が適切に設定済み
- Rust nightly ツールチェイン利用可能

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/lib.rs` | 変更 | モジュール宣言追加 |
| `wasm-pkg/src/types/mod.rs` | 新規 | 共通型定義 |
| `wasm-pkg/src/core/mod.rs` | 新規 | core モジュール宣言 |
| `wasm-pkg/src/core/bcd.rs` | 新規 | BCD 変換関数 |
| `wasm-pkg/src/core/lcg.rs` | 新規 | 64bit LCG 実装 |
| `wasm-pkg/src/core/mt/mod.rs` | 新規 | MT19937 共通インターフェース |
| `wasm-pkg/src/core/mt/scalar.rs` | 新規 | MT19937 スカラー実装 |
| `wasm-pkg/src/core/mt/simd.rs` | 新規 | MT19937 SIMD 実装 (4並列) |

## 3. 設計方針

### 3.1 モジュール構成

```
wasm-pkg/src/
├── lib.rs              # エントリポイント + モジュール宣言
├── types/
│   └── mod.rs          # 共通型定義 (tsify による TS 型生成)
└── core/
    ├── mod.rs          # core モジュール宣言 + re-export
    ├── bcd.rs          # BCD 変換
    ├── lcg.rs          # 64bit LCG
    └── mt/
        ├── mod.rs      # 共通インターフェース
        ├── scalar.rs   # スカラー実装
        └── simd.rs     # SIMD 実装 (Portable SIMD)
```

### 3.2 依存関係

```
types/
  ↑
core/bcd.rs (依存なし)
core/lcg.rs ← types/ (LcgSeed, MtSeed, NeedleDirection)
core/mt/    ← types/ (MtSeed)
```

### 3.3 SIMD 戦略

- `#![feature(portable_simd)]` により `std::simd` を使用
- `u32x4` 型で4系統並列処理
- アーキテクチャ非依存 (WASM → SIMD128、x86 → SSE/AVX、ARM → NEON)

### 3.4 wasm-bindgen エクスポート方針

- `types/` は `tsify` による型定義のみ (関数エクスポートなし)
- `core/lcg.rs` は `Lcg64Wasm` ラッパー + スタティック関数をエクスポート
- `core/mt/` は最小限のエクスポート (`Mt19937Wasm`)

## 4. 実装仕様

### 4.1 types/mod.rs

参照: [mig_002/common/types.md](../mig_002/common/types.md)

```rust
//! 共通型定義
//!
//! tsify による TypeScript 型の自動生成を行う。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

// ===== 基本列挙型 =====

/// DS ハードウェア種別
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum Hardware {
    Ds,
    DsLite,
    Dsi,
    Dsi3ds,
}

/// ROM バージョン
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum RomVersion {
    Black,
    White,
    Black2,
    White2,
}

/// ROM リージョン
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum RomRegion {
    Jpn,
    Kor,
    Usa,
    Ger,
    Fra,
    Spa,
    Ita,
}

/// 性格
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[repr(u8)]
pub enum Nature {
    Hardy = 0,
    Lonely = 1,
    Brave = 2,
    Adamant = 3,
    Naughty = 4,
    Bold = 5,
    Docile = 6,
    Relaxed = 7,
    Impish = 8,
    Lax = 9,
    Timid = 10,
    Hasty = 11,
    Serious = 12,
    Jolly = 13,
    Naive = 14,
    Modest = 15,
    Mild = 16,
    Quiet = 17,
    Bashful = 18,
    Rash = 19,
    Calm = 20,
    Gentle = 21,
    Sassy = 22,
    Careful = 23,
    Quirky = 24,
}

/// 性別
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum Gender {
    Male,
    Female,
    Genderless,
}

/// 特性スロット
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum AbilitySlot {
    First,
    Second,
    Hidden,
}

/// 色違い種別
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ShinyType {
    None,
    Star,
    Square,
}

// ===== Seed 型 (NewType パターン) =====

/// LCG Seed (64bit)
///
/// SHA-1 ハッシュから導出される初期シード。
/// large_number_types_as_bigints により TypeScript では bigint として扱われる。
#[derive(Tsify, Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi, large_number_types_as_bigints)]
#[serde(transparent)]
#[repr(transparent)]
pub struct LcgSeed(pub u64);

impl LcgSeed {
    #[inline]
    pub const fn new(value: u64) -> Self {
        Self(value)
    }

    #[inline]
    pub const fn value(self) -> u64 {
        self.0
    }
}

impl From<u64> for LcgSeed {
    fn from(value: u64) -> Self {
        Self(value)
    }
}

impl From<LcgSeed> for u64 {
    fn from(seed: LcgSeed) -> Self {
        seed.0
    }
}

/// MT Seed (32bit)
///
/// LCG から導出される MT19937 初期シード。
/// u32 は JavaScript の safe integer 範囲内のため number として扱われる。
#[derive(Tsify, Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(transparent)]
#[repr(transparent)]
pub struct MtSeed(pub u32);

impl MtSeed {
    #[inline]
    pub const fn new(value: u32) -> Self {
        Self(value)
    }

    #[inline]
    pub const fn value(self) -> u32 {
        self.0
    }
}

impl From<u32> for MtSeed {
    fn from(value: u32) -> Self {
        Self(value)
    }
}

impl From<MtSeed> for u32 {
    fn from(seed: MtSeed) -> Self {
        seed.0
    }
}

/// レポート針方向 (0-7)
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[repr(u8)]
pub enum NeedleDirection {
    N = 0,
    NE = 1,
    E = 2,
    SE = 3,
    S = 4,
    SW = 5,
    W = 6,
    NW = 7,
}

impl NeedleDirection {
    /// 数値から変換
    #[inline]
    pub const fn from_value(v: u8) -> Self {
        match v & 7 {
            0 => Self::N,
            1 => Self::NE,
            2 => Self::E,
            3 => Self::SE,
            4 => Self::S,
            5 => Self::SW,
            6 => Self::W,
            _ => Self::NW,
        }
    }

    /// 数値へ変換
    #[inline]
    pub const fn value(self) -> u8 {
        self as u8
    }
}

// ===== 個体値 =====

/// 個体値セット [HP, Atk, Def, SpA, SpD, Spe]
pub type IvSet = [u8; 6];
```

### 4.2 core/bcd.rs

参照: [mig_002/core/sha1.md](../mig_002/core/sha1.md) のBCDセクション

```rust
//! BCD (Binary-Coded Decimal) 変換

/// 数値を BCD に変換 (0-99)
#[inline]
pub const fn to_bcd(value: u8) -> u8 {
    ((value / 10) << 4) | (value % 10)
}

/// BCD を数値に変換
#[inline]
pub const fn from_bcd(bcd: u8) -> u8 {
    ((bcd >> 4) * 10) + (bcd & 0x0F)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_to_bcd() {
        assert_eq!(to_bcd(0), 0x00);
        assert_eq!(to_bcd(9), 0x09);
        assert_eq!(to_bcd(10), 0x10);
        assert_eq!(to_bcd(23), 0x23);
        assert_eq!(to_bcd(59), 0x59);
        assert_eq!(to_bcd(99), 0x99);
    }

    #[test]
    fn test_from_bcd() {
        assert_eq!(from_bcd(0x00), 0);
        assert_eq!(from_bcd(0x09), 9);
        assert_eq!(from_bcd(0x10), 10);
        assert_eq!(from_bcd(0x23), 23);
        assert_eq!(from_bcd(0x59), 59);
        assert_eq!(from_bcd(0x99), 99);
    }

    #[test]
    fn test_roundtrip() {
        for i in 0..=99 {
            assert_eq!(from_bcd(to_bcd(i)), i);
        }
    }
}
```

### 4.3 core/lcg.rs

参照: [mig_002/core/lcg.md](../mig_002/core/lcg.md)

```rust
//! 64bit 線形合同法乱数生成器 (LCG)
//!
//! Gen5 の性格値・エンカウント判定等に使用される PRNG。

use crate::types::{LcgSeed, MtSeed, NeedleDirection};
use wasm_bindgen::prelude::*;

/// 乗数
pub const LCG_MULTIPLIER: u64 = 0x5D58_8B65_6C07_8965;

/// 加算定数
pub const LCG_INCREMENT: u64 = 0x0026_9EC3;

/// 64bit LCG 乱数生成器
#[derive(Debug, Clone, Copy)]
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

    /// 次の 32bit 乱数値を取得 (上位 32bit)
    #[inline]
    pub fn next(&mut self) -> u32 {
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
            self.next();
        }
    }

    /// 高速スキップ O(log n)
    pub fn skip(&mut self, steps: u64) {
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

// ===== スタティック関数 =====

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

// ===== wasm-bindgen エクスポート =====

/// WASM 用 LCG ラッパー
#[wasm_bindgen]
pub struct Lcg64Wasm {
    inner: Lcg64,
}

#[wasm_bindgen]
impl Lcg64Wasm {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u64) -> Self {
        Self {
            inner: Lcg64::new(LcgSeed::new(seed)),
        }
    }

    pub fn next(&mut self) -> u32 {
        self.inner.next()
    }

    pub fn next_seed(&mut self) -> u64 {
        self.inner.next_seed().value()
    }

    #[wasm_bindgen(getter)]
    pub fn current_seed(&self) -> u64 {
        self.inner.current_seed().value()
    }

    pub fn advance(&mut self, advances: u32) {
        self.inner.advance(advances);
    }

    pub fn skip(&mut self, steps: u64) {
        self.inner.skip(steps);
    }

    pub fn reset(&mut self, seed: u64) {
        self.inner.reset(LcgSeed::new(seed));
    }
}

/// LCG: 1ステップ進める (スタティック関数)
#[wasm_bindgen]
pub fn lcg_compute_next(seed: u64) -> u64 {
    Lcg64::compute_next(LcgSeed::new(seed)).value()
}

/// LCG: nステップ進める (スタティック関数)
#[wasm_bindgen]
pub fn lcg_compute_advance(seed: u64, steps: u64) -> u64 {
    Lcg64::compute_advance(LcgSeed::new(seed), steps).value()
}

/// LCG: 針方向を計算
#[wasm_bindgen]
pub fn lcg_calc_needle_direction(seed: u64) -> u8 {
    Lcg64::calc_needle_direction(LcgSeed::new(seed)).value()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lcg_basic() {
        let mut lcg = Lcg64::new(LcgSeed::new(0));
        assert_eq!(lcg.next(), 0);
        assert_eq!(lcg.current_seed().value(), LCG_INCREMENT);
    }

    #[test]
    fn test_lcg_known_sequence() {
        let mut lcg = Lcg64::new(LcgSeed::new(1));
        let expected_seed = 1u64
            .wrapping_mul(LCG_MULTIPLIER)
            .wrapping_add(LCG_INCREMENT);
        let expected_value = (expected_seed >> 32) as u32;

        assert_eq!(lcg.next(), expected_value);
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
        lcg2.skip(steps);

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
```

### 4.4 core/mt/mod.rs

```rust
//! MT19937 (Mersenne Twister) 乱数生成器

mod scalar;
mod simd;

pub use scalar::Mt19937;
pub use simd::Mt19937x4;

use wasm_bindgen::prelude::*;
use crate::types::MtSeed;

// ===== 共通定数 =====

/// 状態配列サイズ
pub const N: usize = 624;

/// Twist オフセット
pub const M: usize = 397;

/// Twist マスク
pub const MATRIX_A: u32 = 0x9908_B0DF;

/// 上位ビットマスク
pub const UPPER_MASK: u32 = 0x8000_0000;

/// 下位ビットマスク
pub const LOWER_MASK: u32 = 0x7FFF_FFFF;

/// 初期化乗数
pub const INIT_MULTIPLIER: u32 = 1_812_433_253;

// ===== wasm-bindgen エクスポート =====

/// WASM 用 MT19937 ラッパー
#[wasm_bindgen]
pub struct Mt19937Wasm {
    inner: Mt19937,
}

#[wasm_bindgen]
impl Mt19937Wasm {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32) -> Self {
        Self {
            inner: Mt19937::new(MtSeed::new(seed)),
        }
    }

    pub fn next_u32(&mut self) -> u32 {
        self.inner.next_u32()
    }

    pub fn discard(&mut self, count: u32) {
        self.inner.discard(count);
    }
}
```

### 4.5 core/mt/scalar.rs

参照: [mig_002/core/mt.md](../mig_002/core/mt.md)

```rust
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
```

### 4.6 core/mt/simd.rs

```rust
//! MT19937 SIMD 実装 (4系統並列)

use std::simd::{num::SimdUint, u32x4};

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
```

### 4.7 core/mod.rs

```rust
//! 計算コア
//!
//! PRNG、ハッシュ等の計算基盤を提供。

pub mod bcd;
pub mod lcg;
pub mod mt;

// Re-export commonly used items
pub use bcd::{from_bcd, to_bcd};
pub use lcg::{Lcg64, LCG_INCREMENT, LCG_MULTIPLIER};
pub use mt::{Mt19937, Mt19937x4};
```

### 4.8 lib.rs の更新

```rust
#![feature(portable_simd)]
#![deny(clippy::all)]
#![warn(clippy::pedantic)]
#![allow(clippy::module_name_repetitions)]
#![allow(clippy::must_use_candidate)]

use wasm_bindgen::prelude::*;

pub mod core;
pub mod types;

// Re-export for wasm-bindgen
pub use core::lcg::{lcg_calc_needle_direction, lcg_compute_advance, lcg_compute_next, Lcg64Wasm};
pub use core::mt::Mt19937Wasm;

#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Health check function to verify WASM module is loaded correctly
#[wasm_bindgen]
pub fn health_check() -> String {
    "wasm-pkg is ready".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_check() {
        assert_eq!(health_check(), "wasm-pkg is ready");
    }
}
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | テスト内容 |
|-----------|-----------|
| `core/bcd.rs` | BCD変換の往復テスト、境界値テスト |
| `core/lcg.rs` | 既知シーケンス検証、skip/advance一致、針方向範囲 |
| `core/mt/scalar.rs` | 標準テストベクタ (seed=5489) 検証 |
| `core/mt/simd.rs` | スカラー版との結果一致検証 |

### 5.2 統合テスト

| テスト | 検証内容 |
|--------|----------|
| types エクスポート | tsify による型生成確認 |
| LcgSeed → MtSeed | derive_mt_seed() の計算正確性 |

### 5.3 コマンド

```powershell
# ユニットテスト実行
cd wasm-pkg
cargo test

# WASM ビルド確認
wasm-pack build --target web
```

## 6. 実装チェックリスト

- [ ] `wasm-pkg/src/types/mod.rs` 作成
  - [ ] 基本列挙型 (Hardware, RomVersion, RomRegion, Nature, Gender, AbilitySlot, ShinyType)
  - [ ] Seed 型 (LcgSeed, MtSeed)
  - [ ] NeedleDirection
  - [ ] IvSet type alias
- [ ] `wasm-pkg/src/core/mod.rs` 作成
- [ ] `wasm-pkg/src/core/bcd.rs` 作成
  - [ ] to_bcd, from_bcd 関数
  - [ ] ユニットテスト
- [ ] `wasm-pkg/src/core/lcg.rs` 作成
  - [ ] Lcg64 構造体
  - [ ] スタティック関数 (compute_next, compute_advance, calc_needle_direction)
  - [ ] LcgSeed::derive_mt_seed() 実装
  - [ ] wasm-bindgen エクスポート (Lcg64Wasm)
  - [ ] ユニットテスト
- [ ] `wasm-pkg/src/core/mt/mod.rs` 作成
  - [ ] 共通定数
  - [ ] Mt19937Wasm エクスポート
- [ ] `wasm-pkg/src/core/mt/scalar.rs` 作成
  - [ ] Mt19937 構造体
  - [ ] 標準テストベクタによるテスト
- [ ] `wasm-pkg/src/core/mt/simd.rs` 作成
  - [ ] Mt19937x4 構造体
  - [ ] スカラー版との一致テスト
- [ ] `wasm-pkg/src/lib.rs` 更新
  - [ ] モジュール宣言追加
  - [ ] re-export 追加
- [ ] `cargo test` パス確認
- [ ] `wasm-pack build --target web` 成功確認
