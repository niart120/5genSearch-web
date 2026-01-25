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

// Re-export datetime_search types
pub use datetime_search::{
    MtseedDatetimeResult, MtseedDatetimeSearchBatch, MtseedDatetimeSearchParams,
    MtseedDatetimeSearcher, SearchRangeParams, TimeRangeParams,
};

// Re-export common types
pub use types::{
    Datetime, DsButton, DsConfig, EggGeneratorParams, EncounterMethod, EncounterResult,
    EncounterSlotConfig, EncounterType, EverstonePlan, GameStartConfig, GenderRatio,
    GeneratedEggData, GeneratedPokemonData, HeldItemSlot, HiddenPowerType, IV_VALUE_UNKNOWN,
    ItemContent, IvFilter, Ivs, KeyCode, KeyInput, KeyMask, KeySpec, LcgSeed, LeadAbilityEffect,
    MovingEncounterInfo, MovingEncounterLikelihood, MtSeed, NeedleDirection, NeedlePattern,
    PokemonGeneratorParams, SaveState, SeedContext, SeedInput, SeedOrigin,
    SpecialEncounterDirection, SpecialEncounterInfo, StartMode, Timer0VCountRange, TrainerInfo,
};

// Re-export core needle functions (外部公開必要)
pub use core::needle::{calc_report_needle_direction, calculate_needle_direction};

// Re-export generation public API
pub use generation::{generate_egg_list, generate_pokemon_list};

// Re-export misc module
pub use misc::{
    MtseedResult, MtseedSearchBatch, MtseedSearchParams, MtseedSearcher, get_needle_pattern_at,
    search_needle_pattern,
};

// Re-export needle search types
pub use types::{NeedleSearchParams, NeedleSearchResult};

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_check() {
        assert_eq!(health_check(), "wasm-pkg is ready");
    }
}
