//! レポート針関連型
//!
//! 針方向と針パターンを定義。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

/// レポート針方向 (0-7)
///
/// 8 方向の針位置を表す。計算結果やパターン指定に使用。
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
    /// 数値から変換 (下位 3bit のみ使用)
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

    /// 矢印文字に変換
    pub const fn arrow(self) -> &'static str {
        match self {
            Self::N => "↑",
            Self::NE => "↗",
            Self::E => "→",
            Self::SE => "↘",
            Self::S => "↓",
            Self::SW => "↙",
            Self::W => "←",
            Self::NW => "↖",
        }
    }
}

/// レポート針パターン
///
/// `Vec<NeedleDirection>` のラッパー。型レベルで 0-7 範囲を保証。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedlePattern(pub Vec<NeedleDirection>);

impl NeedlePattern {
    /// 新しいパターンを作成
    pub fn new(directions: Vec<NeedleDirection>) -> Self {
        Self(directions)
    }

    /// u8 スライスから変換 (各値は & 7 でマスク)
    pub fn from_values(values: &[u8]) -> Self {
        Self(
            values
                .iter()
                .map(|&v| NeedleDirection::from_value(v))
                .collect(),
        )
    }

    /// 内部の方向リストへの参照を取得
    pub fn directions(&self) -> &[NeedleDirection] {
        &self.0
    }

    /// 内部 Vec を取得
    pub fn into_inner(self) -> Vec<NeedleDirection> {
        self.0
    }

    /// パターン長を取得
    pub fn len(&self) -> usize {
        self.0.len()
    }

    /// パターンが空かどうか
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    /// イテレータを取得
    pub fn iter(&self) -> impl Iterator<Item = &NeedleDirection> {
        self.0.iter()
    }

    /// 矢印文字列に変換
    pub fn to_arrows(&self) -> String {
        self.0.iter().map(|d| d.arrow()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_needle_direction_from_value() {
        assert_eq!(NeedleDirection::from_value(0), NeedleDirection::N);
        assert_eq!(NeedleDirection::from_value(4), NeedleDirection::S);
        assert_eq!(NeedleDirection::from_value(7), NeedleDirection::NW);
        // マスク動作確認
        assert_eq!(NeedleDirection::from_value(8), NeedleDirection::N);
        assert_eq!(NeedleDirection::from_value(15), NeedleDirection::NW);
    }

    #[test]
    fn test_needle_direction_arrow() {
        assert_eq!(NeedleDirection::N.arrow(), "↑");
        assert_eq!(NeedleDirection::NE.arrow(), "↗");
        assert_eq!(NeedleDirection::S.arrow(), "↓");
        assert_eq!(NeedleDirection::NW.arrow(), "↖");
    }

    #[test]
    fn test_needle_pattern_from_values() {
        let pattern = NeedlePattern::from_values(&[0, 1, 4, 7]);
        assert_eq!(pattern.len(), 4);
        assert_eq!(
            pattern.directions(),
            &[
                NeedleDirection::N,
                NeedleDirection::NE,
                NeedleDirection::S,
                NeedleDirection::NW
            ]
        );
    }

    #[test]
    fn test_needle_pattern_to_arrows() {
        let pattern = NeedlePattern::from_values(&[0, 2, 4, 6]);
        assert_eq!(pattern.to_arrows(), "↑→↓←");
    }
}
