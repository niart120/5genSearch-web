//! キー入力型
//!
//! DS ボタン入力に関する型を定義。
//! Generator 用 (固定入力) と Searcher 用 (全組み合わせ展開) の両方をサポート。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

// ===== DsButton =====

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

// ===== KeyCode =====

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

    /// 表示用文字列に変換
    ///
    /// ボタンの順序は以下の固定順:
    /// A, B, X, Y, L, R, Start, Select, Up, Down, Left, Right
    ///
    /// # Examples
    /// - `KeyCode::NONE` (ボタンなし) → `""`
    /// - `KeyCode(0x2FFE)` (A) → `"[A]"`
    /// - `KeyCode(0x2FF6)` (A+Start) → `"[A]+[Start]"`
    pub fn to_display_string(self) -> String {
        /// ボタン定義 (表示順序)
        const BUTTONS: [(u32, &str); 12] = [
            (0x0001, "A"),
            (0x0002, "B"),
            (0x0400, "X"),
            (0x0800, "Y"),
            (0x0200, "L"),
            (0x0100, "R"),
            (0x0008, "Start"),
            (0x0004, "Select"),
            (0x0040, "Up"),
            (0x0080, "Down"),
            (0x0020, "Left"),
            (0x0010, "Right"),
        ];

        // KeyCode から KeyMask を復元: mask = key_code XOR 0x2FFF
        let mask = self.0 ^ 0x2FFF;

        let pressed: Vec<&str> = BUTTONS
            .iter()
            .filter(|(bit, _)| mask & bit != 0)
            .map(|(_, name)| *name)
            .collect();

        if pressed.is_empty() {
            String::new()
        } else {
            pressed
                .iter()
                .map(|s| format!("[{s}]"))
                .collect::<Vec<_>>()
                .join("+")
        }
    }
}

// ===== KeyMask (内部使用) =====

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

// ===== KeyInput (Generator 用) =====

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

// ===== KeySpec (Searcher 用) =====

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

// ===== 内部ヘルパー関数 =====

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

    // === KeyCode::to_display_string tests ===

    #[test]
    fn key_code_to_display_string_none() {
        // ボタンなし → 空文字列
        assert_eq!(KeyCode::NONE.to_display_string(), "");
    }

    #[test]
    fn key_code_to_display_string_single() {
        // A ボタンのみ: mask = 0x0001 → key_code = 0x2FFE
        let key_code = KeyCode::new(0x2FFF ^ 0x0001);
        assert_eq!(key_code.to_display_string(), "[A]");
    }

    #[test]
    fn key_code_to_display_string_multi() {
        // A + Start: mask = 0x0001 | 0x0008 = 0x0009 → key_code = 0x2FF6
        let key_code = KeyCode::new(0x2FFF ^ 0x0009);
        assert_eq!(key_code.to_display_string(), "[A]+[Start]");
    }

    #[test]
    fn key_code_to_display_string_all_buttons() {
        // 全ボタン押し: mask = 0x0FFF → key_code = 0x2000
        let key_code = KeyCode::new(0x2FFF ^ 0x0FFF);
        assert_eq!(
            key_code.to_display_string(),
            "[A]+[B]+[X]+[Y]+[L]+[R]+[Start]+[Select]+[Up]+[Down]+[Left]+[Right]"
        );
    }
}
