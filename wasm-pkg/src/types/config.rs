//! DS 設定型
//!
//! DS 本体設定、起動条件を定義。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use super::keyinput::KeyCode;

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

    /// 持ち物テーブル用のバージョンインデックスを取得
    ///
    /// 0=Black, 1=White, 2=Black2, 3=White2
    #[inline]
    pub const fn held_item_index(self) -> u8 {
        match self {
            Self::Black => 0,
            Self::White => 1,
            Self::Black2 => 2,
            Self::White2 => 3,
        }
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

/// `Timer0` / `VCount` 範囲
///
/// 固定値指定は min = max で表現。
/// `VCount` ごとに異なる `Timer0` 範囲を持つ場合は、複数の Range を配列で持つ。
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct Timer0VCountRange {
    pub timer0_min: u16,
    pub timer0_max: u16,
    pub vcount_min: u8,
    pub vcount_max: u8,
}

impl Timer0VCountRange {
    /// 固定値で作成
    pub const fn fixed(timer0: u16, vcount: u8) -> Self {
        Self {
            timer0_min: timer0,
            timer0_max: timer0,
            vcount_min: vcount,
            vcount_max: vcount,
        }
    }

    /// `Timer0` 範囲で作成 (`VCount` 固定)
    pub const fn timer0_range(timer0_min: u16, timer0_max: u16, vcount: u8) -> Self {
        Self {
            timer0_min,
            timer0_max,
            vcount_min: vcount,
            vcount_max: vcount,
        }
    }

    /// フル範囲で作成
    pub const fn full_range(
        timer0_min: u16,
        timer0_max: u16,
        vcount_min: u8,
        vcount_max: u8,
    ) -> Self {
        Self {
            timer0_min,
            timer0_max,
            vcount_min,
            vcount_max,
        }
    }
}

/// 起動条件 (`Timer0` / `VCount` / `KeyCode` の組み合わせ)
///
/// 起動時刻検索結果や `SeedOrigin::Startup` で使用される共通型。
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct StartupCondition {
    pub timer0: u16,
    pub vcount: u8,
    pub key_code: KeyCode,
}

impl StartupCondition {
    pub const fn new(timer0: u16, vcount: u8, key_code: KeyCode) -> Self {
        Self {
            timer0,
            vcount,
            key_code,
        }
    }
}

/// 起動日時 (Generator 専用)
///
/// 固定の起動時刻を指定。Searcher は `DateRange` / `TimeRange` を使用。
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct Datetime {
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
}

impl Datetime {
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
