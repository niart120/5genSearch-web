//! 乱数シード型
//!
//! LCG/MT シード値と針方向を定義。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

// ===== Seed 型 (NewType パターン) =====

/// LCG Seed (64bit)
///
/// SHA-1 ハッシュから導出される初期シード。
/// `large_number_types_as_bigints` により TypeScript では bigint として扱われる。
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
