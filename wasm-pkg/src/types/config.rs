//! 設定型
//!
//! DS本体設定、起動条件、探索パラメータを定義。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use super::seeds::LcgSeed;

// ===== Newtype Structs =====

/// IV の 30bit 圧縮表現
///
/// 配置: `[HP:5bit][Atk:5bit][Def:5bit][SpA:5bit][SpD:5bit][Spe:5bit]`
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct IvCode(pub u32);

impl IvCode {
    /// 新しい `IvCode` を作成
    pub const fn new(value: u32) -> Self {
        Self(value)
    }

    /// 内部値を取得
    pub const fn value(self) -> u32 {
        self.0
    }

    /// IV セットからエンコード
    pub fn encode(ivs: &[u8; 6]) -> Self {
        Self(
            (u32::from(ivs[0]) << 25)
                | (u32::from(ivs[1]) << 20)
                | (u32::from(ivs[2]) << 15)
                | (u32::from(ivs[3]) << 10)
                | (u32::from(ivs[4]) << 5)
                | u32::from(ivs[5]),
        )
    }

    /// IV セットにデコード
    pub fn decode(self) -> [u8; 6] {
        [
            ((self.0 >> 25) & 0x1F) as u8,
            ((self.0 >> 20) & 0x1F) as u8,
            ((self.0 >> 15) & 0x1F) as u8,
            ((self.0 >> 10) & 0x1F) as u8,
            ((self.0 >> 5) & 0x1F) as u8,
            (self.0 & 0x1F) as u8,
        ]
    }

    /// 徘徊ポケモン用順序変換 (HABCDS → HABDSC)
    #[must_use]
    pub fn reorder_for_roamer(self) -> Self {
        let hp = (self.0 >> 25) & 0x1F;
        let atk = (self.0 >> 20) & 0x1F;
        let def = (self.0 >> 15) & 0x1F;
        let spa = (self.0 >> 10) & 0x1F;
        let spd = (self.0 >> 5) & 0x1F;
        let spe = self.0 & 0x1F;
        Self((hp << 25) | (atk << 20) | (def << 15) | (spd << 10) | (spe << 5) | spa)
    }
}

/// キー入力コード (SHA-1 計算用)
///
/// `KeyMask` を XOR `0x2FFF` で変換した値。
/// ゲーム内部の SHA-1 メッセージ生成で使用される。
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct KeyCode(pub u32);

impl KeyCode {
    /// キー入力なしの値
    pub const NONE: Self = Self(0x2FFF);

    /// 新しい `KeyCode` を作成
    pub const fn new(value: u32) -> Self {
        Self(value)
    }

    /// 内部値を取得
    pub const fn value(self) -> u32 {
        self.0
    }

    /// `KeyMask` から変換
    pub const fn from_mask(mask: KeyMask) -> Self {
        Self(mask.0 ^ 0x2FFF)
    }

    /// `KeyMask` に変換
    pub const fn to_mask(self) -> KeyMask {
        KeyMask(self.0 ^ 0x2FFF)
    }
}

/// キー入力マスク (UI 入力用)
///
/// ユーザーが押したキーのビットマスク。
/// `KeyCode` との関係: `key_code = key_mask XOR 0x2FFF`
///
/// ビット割り当て:
/// - bit0=A, bit1=B, bit2=Select, bit3=Start
/// - bit4=→, bit5=←, bit6=↑, bit7=↓
/// - bit8=R, bit9=L, bit10=X, bit11=Y
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct KeyMask(pub u32);

impl KeyMask {
    /// キー入力なしの値
    pub const NONE: Self = Self(0x0000);

    /// 新しい `KeyMask` を作成
    pub const fn new(value: u32) -> Self {
        Self(value)
    }

    /// 内部値を取得
    pub const fn value(self) -> u32 {
        self.0
    }

    /// `KeyCode` から変換
    pub const fn from_code(code: KeyCode) -> Self {
        Self(code.0 ^ 0x2FFF)
    }

    /// `KeyCode` に変換
    pub const fn to_code(self) -> KeyCode {
        KeyCode(self.0 ^ 0x2FFF)
    }
}

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
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SearchSegment {
    pub timer0: u16,
    pub vcount: u8,
    /// キー入力コード
    pub key_code: KeyCode,
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
        key_code: KeyCode,
    },
}
