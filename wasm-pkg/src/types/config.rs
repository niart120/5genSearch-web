//! 設定型
//!
//! DS本体設定、起動条件、探索パラメータを定義。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use super::seeds::{LcgSeed, MtSeed};

// ===== ハードウェア列挙型 =====

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

impl RomVersion {
    /// BW (Black/White) かどうか
    #[inline]
    pub const fn is_bw(self) -> bool {
        matches!(self, Self::Black | Self::White)
    }

    /// BW2 (Black2/White2) かどうか
    #[inline]
    pub const fn is_bw2(self) -> bool {
        matches!(self, Self::Black2 | Self::White2)
    }
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

// ===== 設定構造体 =====

/// DS 本体設定
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DsConfig {
    pub mac: [u8; 6],
    pub hardware: Hardware,
    pub version: RomVersion,
    pub region: RomRegion,
}

/// 探索セグメント (`Timer0` × `VCount` × `KeyCode`)
///
/// # `key_code` フォーマット
///
/// `key_code = key_mask XOR 0x2FFF`
///
/// - `key_mask`: 押下キーのビットマスク (押下時 = 1)
/// - ビット割り当て: bit0=A, bit1=B, bit2=Select, bit3=Start, bit4=→, bit5=←, bit6=↑, bit7=↓, bit8=R, bit9=L, bit10=X, bit11=Y
/// - キー入力なし時は `0x2FFF`
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SearchSegment {
    pub timer0: u16,
    pub vcount: u8,
    /// キー入力値: `key_mask XOR 0x2FFF` (入力なし = `0x2FFF`)
    pub key_code: u32,
}

/// VCount/Timer0 範囲
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct VCountTimer0Range {
    pub vcount: u8,
    pub timer0_min: u16,
    pub timer0_max: u16,
}

/// 起動日時パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DatetimeParams {
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
}

impl DatetimeParams {
    pub const fn new(year: u16, month: u8, day: u8, hour: u8, minute: u8, second: u8) -> Self {
        Self {
            year,
            month,
            day,
            hour,
            minute,
            second,
        }
    }
}

// ===== 計算入力ソース =====

/// 計算入力のソース指定
///
/// Searcher / Generator 共通で使用可能な入力ソース型。
/// Seed 直接指定、起動条件指定、範囲探索など複数のモードをサポート。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(tag = "type")]
pub enum SeedSource {
    /// 既知の LCG Seed を直接指定
    Seed {
        /// 初期 LCG Seed
        initial_seed: LcgSeed,
    },

    /// 既知の MT Seed を直接指定
    MtSeed {
        /// MT Seed
        seed: MtSeed,
    },

    /// 複数の LCG Seed を指定
    MultipleSeeds {
        /// LCG Seed のリスト
        seeds: Vec<LcgSeed>,
    },

    /// 起動条件 + 固定 Segment から Seed を導出
    Startup {
        /// DS 設定
        ds: DsConfig,
        /// 起動日時
        datetime: DatetimeParams,
        /// 探索対象の Segment（Timer0/VCount/KeyCode の組み合わせ）
        segments: Vec<SearchSegment>,
    },

    /// 起動条件 + Timer0/VCount 範囲から探索
    StartupRange {
        /// DS 設定
        ds: DsConfig,
        /// 起動日時
        datetime: DatetimeParams,
        /// Timer0/VCount の範囲指定（複数指定可能）
        ranges: Vec<VCountTimer0Range>,
        /// キー入力コード
        key_code: u32,
    },
}
