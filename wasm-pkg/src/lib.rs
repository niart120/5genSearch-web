#![feature(portable_simd)]
#![deny(clippy::all)]
#![warn(clippy::pedantic)]
#![allow(clippy::module_name_repetitions)]
#![allow(clippy::must_use_candidate)]

use wasm_bindgen::prelude::*;

pub mod core;
pub mod datetime_search;
pub mod generation;
pub mod misc;
pub mod types;

#[cfg(feature = "gpu")]
pub mod gpu;

// Re-export datetime_search types
pub use datetime_search::{
    EggDatetimeSearchBatch, EggDatetimeSearchParams, EggDatetimeSearchResult, EggDatetimeSearcher,
    MtseedDatetimeSearchBatch, MtseedDatetimeSearchParams, MtseedDatetimeSearcher,
    TrainerInfoSearchBatch, TrainerInfoSearchParams, TrainerInfoSearchResult, TrainerInfoSearcher,
    generate_egg_search_tasks, generate_mtseed_search_tasks, generate_trainer_info_search_tasks,
    split_search_range,
};

// Re-export common types
pub use types::{
    AbilitySlot, CoreDataFilter, CorePokemonData, Datetime, DatetimeSearchContext, DsButton,
    DsConfig, EggFilter, EggGenerationParams, EncounterMethod, EncounterResult,
    EncounterSlotConfig, EncounterType, EverstonePlan, GameStartConfig, GenderRatio,
    GeneratedEggData, GeneratedPokemonData, GenerationConfig, HeldItemSlot, HiddenPowerType,
    IV_VALUE_UNKNOWN, ItemContent, IvFilter, Ivs, KeyCode, KeyInput, KeySpec, LcgSeed,
    LeadAbilityEffect, MovingEncounterInfo, MovingEncounterLikelihood, MtSeed, NeedleDirection,
    NeedlePattern, Pid, PokemonFilter, PokemonGenerationParams, SaveState, SearchRangeParams,
    SeedInput, SeedOrigin, ShinyFilter, SpecialEncounterDirection, SpecialEncounterInfo, StartMode,
    TimeRangeParams, Timer0VCountRange, TrainerInfo, TrainerInfoFilter,
};

// Re-export core functions
pub use core::needle::{calc_report_needle_direction, calculate_needle_direction};
pub use core::seed_resolver::resolve_seeds;

// Re-export generation public API
pub use generation::{generate_egg_list, generate_pokemon_list};

// Re-export misc module
pub use misc::{
    MtseedResult, MtseedSearchBatch, MtseedSearchParams, MtseedSearcher, get_needle_pattern_at,
    search_needle_pattern,
};

// Re-export needle search types
pub use types::NeedleSearchResult;

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_check() {
        assert_eq!(health_check(), "wasm-pkg is ready");
    }
}
