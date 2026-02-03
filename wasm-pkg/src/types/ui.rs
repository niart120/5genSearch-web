//! 表示用データ型
//!
//! WASM から TypeScript に返す、解決済みの表示用データ型を定義。
//! 数値や ID は全て表示用文字列に変換されている。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

/// 表示用ポケモンデータ (解決済み)
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct UiPokemonData {
    // === 列挙コンテキスト ===
    pub advance: u32,
    pub needle_direction: u8,

    // === Seed 情報 (prefix無し16進数) ===
    /// e.g., `"1234567890ABCDEF"`
    pub base_seed: String,
    /// e.g., `"12345678"`
    pub mt_seed: String,
    /// 起動条件 (`SeedOrigin::Startup` の場合のみ `Some`)
    pub datetime_iso: Option<String>,
    /// e.g., `"0C80"`
    pub timer0: Option<String>,
    /// e.g., `"5E"`
    pub vcount: Option<String>,
    pub key_input: Option<String>,

    // === 個体情報 (解決済み文字列) ===
    pub species_name: String,
    pub nature_name: String,
    pub ability_name: String,
    /// `"♂"` / `"♀"` / `"-"`
    pub gender_symbol: String,
    /// `""` / `"◇"` / `"☆"`
    pub shiny_symbol: String,

    // === 個体情報 (数値/文字列) ===
    pub level: u8,
    /// 個体値 (表示用文字列)
    ///   - 通常: `"31"`, `"0"` など
    ///   - 不明時: `"?"` (卵の遺伝未確定など)
    ///   - 順序: `[H, A, B, C, D, S]`
    pub ivs: [String; 6],
    /// ステータス (表示用文字列)
    ///   - 通常: `"187"`, `"100"` など
    ///   - 不明時: `"?"` (IV 不明または `species_id` 未指定)
    ///   - 順序: `[H, A, B, C, D, S]`
    pub stats: [String; 6],
    /// めざパタイプ (表示用文字列)
    ///   - 通常: `"ドラゴン"` / `"Dragon"` など
    ///   - 不明時: `"?"`
    pub hidden_power_type: String,
    /// めざパ威力 (表示用文字列)
    ///   - 通常: `"70"` など
    ///   - 不明時: `"?"`
    pub hidden_power_power: String,
    /// 性格値 (prefix無し16進数)
    ///   - e.g., `"12345678"`
    pub pid: String,

    // === エンカウント情報 ===
    pub sync_applied: bool,
    pub held_item_name: Option<String>,

    // === 移動/特殊エンカウント情報 ===
    /// 移動エンカウント確定状態 (表示用文字列)
    ///   - `"〇"`: 確定エンカウント (`Guaranteed`)
    ///   - `"?"`: 歩数次第 (`Possible`, BW2 のみ)
    ///   - `"×"`: エンカウント無し (`NoEncounter`)
    pub moving_encounter_guaranteed: Option<String>,
    /// 特殊エンカウント発生 (表示用文字列)
    ///   - `"〇"`: 発生する (`triggered = true`)
    ///   - `"×"`: 発生しない (`triggered = false`)
    pub special_encounter_triggered: Option<String>,
    pub special_encounter_direction: Option<String>,
    /// `"Pokemon"` / `"Item:EvolutionStone"` / etc.
    pub encounter_result: String,
}

/// 表示用卵データ (解決済み)
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct UiEggData {
    // === 列挙コンテキスト ===
    pub advance: u32,
    pub needle_direction: u8,

    // === Seed 情報 (prefix無し16進数) ===
    pub base_seed: String,
    pub mt_seed: String,
    pub datetime_iso: Option<String>,
    pub timer0: Option<String>,
    pub vcount: Option<String>,
    pub key_input: Option<String>,

    // === 個体情報 (解決済み文字列) ===
    /// 種族名 (`species_id` が指定された場合のみ)
    pub species_name: Option<String>,
    pub nature_name: String,
    /// 特性名
    ///   - `species_id` 指定時: 種族データから解決した確定特性名 (e.g., `"しぜんかいふく"`)
    ///   - `species_id` 未指定時: スロット名 (`"特性1"` / `"特性2"` / `"夢特性"`)
    pub ability_name: String,
    pub gender_symbol: String,
    pub shiny_symbol: String,

    // === 個体情報 (数値/文字列) ===
    /// 常に 1
    pub level: u8,
    /// 個体値 (表示用文字列)
    ///   - 確定時: `"31"`, `"0"` など
    ///   - 遺伝未確定時: `"?"` (`IV_VALUE_UNKNOWN` の場合)
    pub ivs: [String; 6],
    /// ステータス (表示用文字列)
    ///   - 計算可能時: `"12"`, `"8"` など (Lv.1 時点)
    ///   - 計算不可時: `"?"` (IV 不明 or `species_id` 未指定)
    pub stats: [String; 6],
    /// めざパタイプ (表示用文字列)
    pub hidden_power_type: String,
    /// めざパ威力 (表示用文字列)
    pub hidden_power_power: String,
    /// 性格値 (prefix無し16進数)
    ///   - e.g., `"12345678"`
    pub pid: String,

    // === 卵固有情報 ===
    pub margin_frames: Option<u32>,
}
