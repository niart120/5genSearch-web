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
    pub(crate) const fn from_mask(mask: KeyMask) -> Self {
        Self(mask.0 ^ 0x2FFF)
    }
}

/// キー入力マスク (内部使用)
///
/// ユーザーが押したキーのビットマスク。
/// `KeyCode` との関係: `key_code = key_mask XOR 0x2FFF`
///
/// ビット割り当て:
/// - bit0=A, bit1=B, bit2=Select, bit3=Start
/// - bit4=→, bit5=←, bit6=↑, bit7=↓
/// - bit8=R, bit9=L, bit10=X, bit11=Y
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub(crate) struct KeyMask(pub u32);

impl KeyMask {
    /// 新しい `KeyMask` を作成
    pub(crate) const fn new(value: u32) -> Self {
        Self(value)
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
///
/// 組み合わせ生成時に以下の無効パターンは自動除外:
/// - 上下同時押し (Up + Down)
/// - 左右同時押し (Left + Right)
/// - L+R+Start+Select 同時押し (ソフトリセットコマンド)
#[derive(Tsify, Clone, Debug, Default, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct KeySpec {
    pub available_buttons: Vec<DsButton>,
}

/// マスク値が無効な組み合わせかを判定
///
/// 無効パターン:
/// - 上下同時押し
/// - 左右同時押し
/// - L+R+Start+Select 同時押し
fn is_invalid_button_combination(mask: u32) -> bool {
    let up = DsButton::Up.bit_mask();
    let down = DsButton::Down.bit_mask();
    let left = DsButton::Left.bit_mask();
    let right = DsButton::Right.bit_mask();
    let l = DsButton::L.bit_mask();
    let r = DsButton::R.bit_mask();
    let start = DsButton::Start.bit_mask();
    let select = DsButton::Select.bit_mask();

    // 上下同時押し
    let has_up_down = (mask & up != 0) && (mask & down != 0);
    // 左右同時押し
    let has_left_right = (mask & left != 0) && (mask & right != 0);
    // L+R+Start+Select (ソフトリセット)
    let soft_reset_mask = l | r | start | select;
    let has_soft_reset = (mask & soft_reset_mask) == soft_reset_mask;

    has_up_down || has_left_right || has_soft_reset
}

impl KeySpec {
    /// ボタンリストから作成
    pub fn from_buttons(available_buttons: Vec<DsButton>) -> Self {
        Self { available_buttons }
    }

    /// 有効な組み合わせ総数を取得
    ///
    /// 無効パターン (上下/左右同時押し、ソフトリセット) を除外した数
    #[allow(clippy::cast_possible_truncation)]
    pub fn combination_count(&self) -> u32 {
        // ボタン数は最大 12 なので u32 に収まる
        self.combinations().len() as u32
    }

    /// 有効な全組み合わせの `KeyCode` を生成 (crate 内部用)
    ///
    /// 無効パターン (上下/左右同時押し、ソフトリセット) は除外される
    pub(crate) fn combinations(&self) -> Vec<KeyCode> {
        generate_key_combinations(&self.available_buttons)
    }
}

/// ボタンリストから有効な全組み合わせの `KeyCode` を生成
///
/// 無効パターン (上下/左右同時押し、ソフトリセット) は除外される
fn generate_key_combinations(buttons: &[DsButton]) -> Vec<KeyCode> {
    let n = buttons.len();
    let mut result = Vec::with_capacity(1 << n);

    for bits in 0..(1u32 << n) {
        let mask = buttons
            .iter()
            .enumerate()
            .filter(|(i, _)| bits & (1 << i) != 0)
            .fold(0u32, |acc, (_, b)| acc | b.bit_mask());

        if !is_invalid_button_combination(mask) {
            result.push(KeyCode::from_mask(KeyMask::new(mask)));
        }
    }
    result
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

// ===== Seed 入力 =====

/// Seed 入力
///
/// Generator 系 API 用の入力ソース型。
/// 複数 Seed 指定、または起動条件指定をサポート。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(tag = "type")]
pub enum SeedInput {
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
        /// `Timer0` / `VCount` 範囲 (複数指定可能)
        ranges: Vec<Timer0VCountRange>,
        /// キー入力
        key_input: KeyInput,
    },
}

// ===== 起動時刻検索パラメータ =====

/// 1日内の時刻範囲
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TimeRangeParams {
    pub hour_start: u8,
    pub hour_end: u8,
    pub minute_start: u8,
    pub minute_end: u8,
    pub second_start: u8,
    pub second_end: u8,
}

impl TimeRangeParams {
    /// バリデーション
    ///
    /// # Errors
    ///
    /// 時間・分・秒の範囲が不正な場合
    pub fn validate(&self) -> Result<(), String> {
        if self.hour_end > 23 || self.hour_start > self.hour_end {
            return Err("Invalid hour range".into());
        }
        if self.minute_end > 59 || self.minute_start > self.minute_end {
            return Err("Invalid minute range".into());
        }
        if self.second_end > 59 || self.second_start > self.second_end {
            return Err("Invalid second range".into());
        }
        Ok(())
    }

    /// 有効な秒数をカウント
    pub fn count_valid_seconds(&self) -> u32 {
        let start = u32::from(self.hour_start) * 3600
            + u32::from(self.minute_start) * 60
            + u32::from(self.second_start);
        let end = u32::from(self.hour_end) * 3600
            + u32::from(self.minute_end) * 60
            + u32::from(self.second_end);
        end - start + 1
    }
}

/// 検索範囲
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SearchRangeParams {
    pub start_year: u16,
    pub start_month: u8,
    pub start_day: u8,
    /// 開始日内のオフセット秒 (0-86399)
    pub start_second_offset: u32,
    /// 検索範囲秒数
    pub range_seconds: u32,
}

/// 起動時刻検索の共通コンテキスト
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DatetimeSearchContext {
    /// DS 設定
    pub ds: DsConfig,
    /// 1日内の時刻範囲
    pub time_range: TimeRangeParams,
    /// Timer0/VCount 範囲 (複数指定可能)
    pub ranges: Vec<Timer0VCountRange>,
    /// キー入力仕様 (全組み合わせを探索)
    pub key_spec: KeySpec,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_invalid_button_combination_up_down() {
        let up_down = DsButton::Up.bit_mask() | DsButton::Down.bit_mask();
        assert!(is_invalid_button_combination(up_down));

        let up_only = DsButton::Up.bit_mask();
        assert!(!is_invalid_button_combination(up_only));

        let down_only = DsButton::Down.bit_mask();
        assert!(!is_invalid_button_combination(down_only));
    }

    #[test]
    fn is_invalid_button_combination_left_right() {
        let left_right = DsButton::Left.bit_mask() | DsButton::Right.bit_mask();
        assert!(is_invalid_button_combination(left_right));

        let left_only = DsButton::Left.bit_mask();
        assert!(!is_invalid_button_combination(left_only));

        let right_only = DsButton::Right.bit_mask();
        assert!(!is_invalid_button_combination(right_only));
    }

    #[test]
    fn is_invalid_button_combination_soft_reset() {
        let soft_reset = DsButton::L.bit_mask()
            | DsButton::R.bit_mask()
            | DsButton::Start.bit_mask()
            | DsButton::Select.bit_mask();
        assert!(is_invalid_button_combination(soft_reset));

        // L+R+Start (Select がない) は有効
        let partial = DsButton::L.bit_mask() | DsButton::R.bit_mask() | DsButton::Start.bit_mask();
        assert!(!is_invalid_button_combination(partial));
    }

    #[test]
    fn is_invalid_button_combination_soft_reset_with_others() {
        // ソフトリセット + 他のボタンも無効
        let soft_reset_plus_a = DsButton::L.bit_mask()
            | DsButton::R.bit_mask()
            | DsButton::Start.bit_mask()
            | DsButton::Select.bit_mask()
            | DsButton::A.bit_mask();
        assert!(is_invalid_button_combination(soft_reset_plus_a));
    }

    #[test]
    fn key_spec_combinations_filters_up_down() {
        let spec = KeySpec::from_buttons(vec![DsButton::Up, DsButton::Down, DsButton::A]);
        let combos = spec.combinations();

        // 2^3 = 8 から上下同時押しを除外
        // 上下同時押し: {Up, Down}, {Up, Down, A} の2パターン
        assert_eq!(combos.len(), 6);

        // 上下同時押しが含まれていないことを確認
        let up_down_mask = DsButton::Up.bit_mask() | DsButton::Down.bit_mask();
        for code in &combos {
            let mask = code.0 ^ 0x2FFF;
            assert!(
                (mask & up_down_mask) != up_down_mask,
                "上下同時押しが含まれている: {mask:#06X}"
            );
        }
    }

    #[test]
    fn key_spec_combinations_filters_left_right() {
        let spec = KeySpec::from_buttons(vec![DsButton::Left, DsButton::Right]);
        let combos = spec.combinations();

        // 2^2 = 4 から左右同時押しを除外
        // 除外: {Left, Right} の1パターン
        assert_eq!(combos.len(), 3);
    }

    #[test]
    fn key_spec_combinations_filters_soft_reset() {
        let spec = KeySpec::from_buttons(vec![
            DsButton::L,
            DsButton::R,
            DsButton::Start,
            DsButton::Select,
        ]);
        let combos = spec.combinations();

        // 2^4 = 16 からソフトリセットを除外
        // 除外: {L, R, Start, Select} の1パターン
        assert_eq!(combos.len(), 15);
    }

    #[test]
    #[allow(clippy::cast_possible_truncation)]
    fn key_spec_combination_count_matches_combinations_len() {
        let spec = KeySpec::from_buttons(vec![
            DsButton::Up,
            DsButton::Down,
            DsButton::L,
            DsButton::R,
            DsButton::Start,
            DsButton::Select,
        ]);
        assert_eq!(spec.combination_count(), spec.combinations().len() as u32);
    }

    #[test]
    fn key_spec_empty_buttons() {
        let spec = KeySpec::from_buttons(vec![]);
        let combos = spec.combinations();

        // 空のボタンリスト → キー入力なしの1パターンのみ
        assert_eq!(combos.len(), 1);
        assert_eq!(combos[0], KeyCode::NONE);
    }
}
