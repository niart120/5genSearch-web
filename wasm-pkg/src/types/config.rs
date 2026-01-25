//! 設定型
//!
//! DS本体設定、起動条件、探索パラメータを定義。

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use super::seeds::LcgSeed;

// ===== DS Button =====

/// DS ボタン
///
/// DS 本体のボタンを表す列挙型。
/// 各ボタンは SHA-1 計算で使用されるビットマスクを持つ。
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum DsButton {
    A,
    B,
    X,
    Y,
    L,
    R,
    Start,
    Select,
    Up,
    Down,
    Left,
    Right,
}

impl DsButton {
    /// ビットマスク値を取得
    pub const fn bit_mask(self) -> u32 {
        match self {
            Self::A => 0x0001,
            Self::B => 0x0002,
            Self::Select => 0x0004,
            Self::Start => 0x0008,
            Self::Right => 0x0010,
            Self::Left => 0x0020,
            Self::Up => 0x0040,
            Self::Down => 0x0080,
            Self::R => 0x0100,
            Self::L => 0x0200,
            Self::X => 0x0400,
            Self::Y => 0x0800,
        }
    }
}

// ===== Newtype Structs =====

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

// ===== KeyInput / KeySpec =====

/// キー入力 (Generator 用)
///
/// 固定のボタン組み合わせを指定し、単一の `KeyCode` を生成。
/// Generator 系 API で使用する。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct KeyInput {
    pub buttons: Vec<DsButton>,
}

impl KeyInput {
    /// 新しい `KeyInput` を作成 (ボタンなし)
    pub fn new() -> Self {
        Self {
            buttons: Vec::new(),
        }
    }

    /// ボタンリストから作成
    pub fn from_buttons(buttons: Vec<DsButton>) -> Self {
        Self { buttons }
    }

    /// ボタンを追加
    pub fn add_button(&mut self, button: DsButton) {
        if !self.buttons.contains(&button) {
            self.buttons.push(button);
        }
    }

    /// `KeyCode` に変換
    pub fn to_key_code(&self) -> KeyCode {
        let mask = self.buttons.iter().fold(0u32, |acc, b| acc | b.bit_mask());
        KeyCode::from_mask(KeyMask::new(mask))
    }
}

/// キー入力仕様 (Searcher 用)
///
/// 利用可能なボタンを指定し、全組み合わせを探索。
/// Searcher 系 API で使用する。
#[wasm_bindgen]
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[allow(clippy::unsafe_derive_deserialize)] // wasm_bindgen によるunsafe fn あり
pub struct KeySpec {
    available_buttons: Vec<DsButton>,
}

#[wasm_bindgen]
impl KeySpec {
    /// 新しい `KeySpec` を作成 (ボタンなし)
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            available_buttons: Vec::new(),
        }
    }

    /// 利用可能なボタンを追加
    #[wasm_bindgen(js_name = addAvailableButton)]
    pub fn add_available_button(&mut self, button: DsButton) {
        if !self.available_buttons.contains(&button) {
            self.available_buttons.push(button);
        }
    }

    /// 組み合わせ総数を取得
    #[wasm_bindgen(getter)]
    pub fn combination_count(&self) -> u32 {
        1 << self.available_buttons.len()
    }
}

impl KeySpec {
    /// 利用可能ボタンリストから作成 (Rust 内部用)
    pub fn from_buttons(available_buttons: Vec<DsButton>) -> Self {
        Self { available_buttons }
    }

    /// 利用可能ボタンリストを取得 (Rust 内部用)
    pub fn available_buttons(&self) -> &[DsButton] {
        &self.available_buttons
    }

    /// 全組み合わせの `KeyCode` を生成
    pub fn combinations(&self) -> Vec<KeyCode> {
        let n = self.available_buttons.len();
        let mut result = Vec::with_capacity(1 << n);

        for bits in 0..(1u32 << n) {
            let mask = self
                .available_buttons
                .iter()
                .enumerate()
                .filter(|(i, _)| bits & (1 << i) != 0)
                .fold(0u32, |acc, (_, b)| acc | b.bit_mask());
            result.push(KeyCode::from_mask(KeyMask::new(mask)));
        }
        result
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

/// 起動日時 (Generator 専用)
///
/// 固定の起動時刻を指定。Searcher は `DateRange` / `TimeRange` を使用。
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
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

// ===== Generator 入力ソース =====

/// Generator 入力ソース (Generator 専用)
///
/// Generator 系 API 用の入力ソース型。
/// Seed 直接指定、複数 Seed 指定、起動条件指定をサポート。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(tag = "type")]
pub enum GeneratorSource {
    /// 単一の LCG Seed を直接指定
    Seed {
        /// 初期 LCG Seed
        initial_seed: LcgSeed,
    },

    /// 複数の LCG Seed を指定
    Seeds {
        /// LCG Seed のリスト
        seeds: Vec<LcgSeed>,
    },

    /// 起動条件から Seed を導出
    Startup {
        /// DS 設定
        ds: DsConfig,
        /// 起動日時
        datetime: Datetime,
        /// Timer0/VCount 範囲 (複数指定可能)
        ranges: Vec<Timer0VCountRange>,
        /// キー入力
        key_input: KeyInput,
    },
}
