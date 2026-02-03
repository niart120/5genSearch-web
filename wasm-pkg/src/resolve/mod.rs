//! 解決モジュール
//!
//! 生成データから表示用データへの変換 (解決) を行う。

pub mod egg;
pub mod pokemon;

pub use egg::resolve_egg_data;
pub use pokemon::resolve_pokemon_data;

use crate::types::HiddenPowerType;

/// めざパタイプを表示用文字列に変換
pub(crate) fn format_hidden_power_type(hp_type: HiddenPowerType, locale: &str) -> String {
    match locale {
        "ja" => match hp_type {
            HiddenPowerType::Fighting => "かくとう",
            HiddenPowerType::Flying => "ひこう",
            HiddenPowerType::Poison => "どく",
            HiddenPowerType::Ground => "じめん",
            HiddenPowerType::Rock => "いわ",
            HiddenPowerType::Bug => "むし",
            HiddenPowerType::Ghost => "ゴースト",
            HiddenPowerType::Steel => "はがね",
            HiddenPowerType::Fire => "ほのお",
            HiddenPowerType::Water => "みず",
            HiddenPowerType::Grass => "くさ",
            HiddenPowerType::Electric => "でんき",
            HiddenPowerType::Psychic => "エスパー",
            HiddenPowerType::Ice => "こおり",
            HiddenPowerType::Dragon => "ドラゴン",
            HiddenPowerType::Dark => "あく",
        },
        _ => match hp_type {
            HiddenPowerType::Fighting => "Fighting",
            HiddenPowerType::Flying => "Flying",
            HiddenPowerType::Poison => "Poison",
            HiddenPowerType::Ground => "Ground",
            HiddenPowerType::Rock => "Rock",
            HiddenPowerType::Bug => "Bug",
            HiddenPowerType::Ghost => "Ghost",
            HiddenPowerType::Steel => "Steel",
            HiddenPowerType::Fire => "Fire",
            HiddenPowerType::Water => "Water",
            HiddenPowerType::Grass => "Grass",
            HiddenPowerType::Electric => "Electric",
            HiddenPowerType::Psychic => "Psychic",
            HiddenPowerType::Ice => "Ice",
            HiddenPowerType::Dragon => "Dragon",
            HiddenPowerType::Dark => "Dark",
        },
    }
    .to_string()
}
