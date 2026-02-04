#![feature(portable_simd)]
#![deny(clippy::all)]
#![warn(clippy::pedantic)]
#![allow(clippy::module_name_repetitions)]
#![allow(clippy::must_use_candidate)]

use wasm_bindgen::prelude::*;

pub mod core;
pub mod data;
pub mod datetime_search;
pub mod generation;
pub mod misc;
pub mod resolve;
pub mod types;

#[cfg(feature = "gpu")]
pub mod gpu;

// Re-export datetime_search (Searcher と関数のみ)
pub use datetime_search::{
    EggDatetimeSearcher, MtseedDatetimeSearcher, TrainerInfoSearcher, generate_egg_search_tasks,
    generate_mtseed_search_tasks, generate_trainer_info_search_tasks, split_search_range,
};

// Re-export common types
pub use types::{
    AbilitySlot, CoreDataFilter, CorePokemonData, DateRangeParams, Datetime, DatetimeSearchContext,
    DsButton, DsConfig, EggDatetimeSearchBatch, EggDatetimeSearchParams, EggDatetimeSearchResult,
    EggFilter, EggGenerationParams, EncounterMethod, EncounterResult, EncounterSlotConfig,
    EncounterType, EverstonePlan, GameStartConfig, GenderRatio, GeneratedEggData,
    GeneratedPokemonData, GenerationConfig, HeldItemSlot, HiddenPowerType, IV_VALUE_UNKNOWN,
    ItemContent, IvFilter, Ivs, KeyCode, KeyInput, KeySpec, LcgSeed, LeadAbilityEffect,
    MovingEncounterInfo, MovingEncounterLikelihood, MtSeed, MtseedDatetimeSearchBatch,
    MtseedDatetimeSearchParams, MtseedResult, MtseedSearchBatch, MtseedSearchParams,
    NeedleDirection, NeedlePattern, Pid, PokemonFilter, PokemonGenerationParams, RomVersion,
    SaveState, SearchRangeParams, SeedOrigin, SeedSpec, ShinyFilter, SpecialEncounterDirection,
    SpecialEncounterInfo, StartMode, TimeRangeParams, Timer0VCountRange, TrainerInfo,
    TrainerInfoFilter, TrainerInfoSearchBatch, TrainerInfoSearchParams, TrainerInfoSearchResult,
    UiEggData, UiPokemonData,
};

// Re-export core functions
pub use core::needle::{calc_report_needle_direction, calculate_needle_direction};
pub use core::seed_resolver::resolve_seeds;

// Re-export misc module (Searcher のみ)
pub use misc::{MtseedSearcher, get_needle_pattern_at, search_needle_pattern};

// Re-export needle search types
pub use types::NeedleSearchResult;

// Re-export resolve module
pub use resolve::{resolve_egg_data, resolve_pokemon_data};

// Re-export GPU module (when enabled)
#[cfg(feature = "gpu")]
pub use gpu::{
    GpuDatetimeSearchIterator, GpuDeviceContext, GpuKind, GpuProfile, GpuSearchBatch,
    SearchJobLimits,
};

#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Health check function to verify WASM module is loaded correctly
#[wasm_bindgen]
pub fn health_check() -> String {
    "wasm-pkg is ready".to_string()
}

/// `KeySpec` から有効なキー組み合わせ総数を取得
///
/// 無効パターン (上下/左右同時押し、ソフトリセット) を除外した数を返す。
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)] // wasm_bindgen API は値渡しが必要
pub fn get_key_combination_count(key_spec: KeySpec) -> u32 {
    key_spec.combination_count()
}

/// ポケモンデータをバッチ解決
///
/// # Arguments
/// * `data` - 生成されたポケモンデータの配列
/// * `version` - ROMバージョン
/// * `locale` - ロケール (`"ja"` または `"en"`)
///
/// # Returns
/// 解決済み表示用ポケモンデータの配列
#[wasm_bindgen]
pub fn resolve_pokemon_data_batch(
    data: Vec<GeneratedPokemonData>,
    version: RomVersion,
    locale: &str,
) -> Vec<UiPokemonData> {
    data.into_iter()
        .map(|d| resolve_pokemon_data(d, version, locale))
        .collect()
}

/// 卵データをバッチ解決
///
/// # Arguments
/// * `data` - 生成された卵データの配列
/// * `locale` - ロケール (`"ja"` または `"en"`)
/// * `species_id` - 種族ID (任意。指定時は種族名や特性名を解決)
///
/// # Returns
/// 解決済み表示用卵データの配列
#[wasm_bindgen]
pub fn resolve_egg_data_batch(
    data: Vec<GeneratedEggData>,
    locale: &str,
    species_id: Option<u16>,
) -> Vec<UiEggData> {
    data.into_iter()
        .map(|d| resolve_egg_data(d, locale, species_id))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_check() {
        assert_eq!(health_check(), "wasm-pkg is ready");
    }
}
