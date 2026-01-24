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
    DatetimeParams, DsConfig, EncounterMethod, EncounterResult, EncounterType, GameStartConfig,
    GenderRatio, GeneratedEggData, GeneratedPokemonData, GenerationSource, HeldItemSlot,
    IV_VALUE_UNKNOWN, ItemContent, IvCode, Ivs, KeyCode, KeyMask, LcgSeed, LeadAbilityEffect,
    MovingEncounterInfo, MovingEncounterLikelihood, MtSeed, NeedleDirection, NeedlePattern,
    SaveState, SearchSegment, SeedSource, SpecialEncounterDirection, SpecialEncounterInfo,
    StartMode, VCountTimer0Range,
};

// Re-export generation needle functions (外部公開必要)
pub use generation::algorithm::{calc_report_needle_direction, calculate_needle_direction};

// Re-export misc module
pub use misc::{
    IvFilter, MtseedResult, MtseedSearchBatch, MtseedSearchParams, MtseedSearcher,
    NeedleSearchBatch, NeedleSearchParams, NeedleSearchResult, NeedleSearcher, decode_iv_code,
    encode_iv_code, get_needle_pattern, needle_direction_arrow, reorder_iv_code_for_roamer,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_check() {
        assert_eq!(health_check(), "wasm-pkg is ready");
    }
}
