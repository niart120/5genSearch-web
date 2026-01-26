//! 乱数シード型
//!
//! LCG/MT シード値と生成元情報を定義。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use super::config::{Datetime, StartupCondition};

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
#[derive(
    Tsify, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize,
)]
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

// ===== 生成元情報 =====

/// 生成元情報
///
/// 生成結果のソース情報。各エントリがどの条件から生成されたかを示す。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum SeedOrigin {
    /// Seed 値から直接生成
    Seed {
        /// `BaseSeed` (LCG 初期値)
        base_seed: LcgSeed,
        /// MT Seed (LCG から導出)
        mt_seed: MtSeed,
    },
    /// 起動条件から生成
    Startup {
        /// `BaseSeed` (SHA-1 から導出)
        base_seed: LcgSeed,
        /// MT Seed (LCG から導出)
        mt_seed: MtSeed,
        /// 起動日時
        datetime: Datetime,
        /// 起動条件 (`Timer0` / `VCount` / `KeyCode`)
        condition: StartupCondition,
    },
}

impl SeedOrigin {
    /// Seed ソースを作成 (`MtSeed` は `LcgSeed` から導出)
    pub fn seed(base_seed: LcgSeed) -> Self {
        Self::Seed {
            base_seed,
            mt_seed: base_seed.derive_mt_seed(),
        }
    }

    /// Startup ソースを作成 (`MtSeed` は `LcgSeed` から導出)
    pub fn startup(base_seed: LcgSeed, datetime: Datetime, condition: StartupCondition) -> Self {
        Self::Startup {
            base_seed,
            mt_seed: base_seed.derive_mt_seed(),
            datetime,
            condition,
        }
    }

    /// `BaseSeed` を取得
    pub const fn base_seed(&self) -> LcgSeed {
        match self {
            Self::Seed { base_seed, .. } | Self::Startup { base_seed, .. } => *base_seed,
        }
    }

    /// `MtSeed` を取得
    pub const fn mt_seed(&self) -> MtSeed {
        match self {
            Self::Seed { mt_seed, .. } | Self::Startup { mt_seed, .. } => *mt_seed,
        }
    }
}
