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

// Re-export SHA-1 wasm-bindgen functions
pub use core::sha1::{hash_to_lcg_seed, hash_to_mt_seed, sha1_hash_batch, sha1_hash_single};

// Re-export datetime_search types
pub use datetime_search::{
    MtseedDatetimeResult, MtseedDatetimeSearchBatch, MtseedDatetimeSearchParams,
    MtseedDatetimeSearcher, SearchRangeParams, TimeRangeParams,
};

// Re-export common types
pub use types::{DatetimeParams, DsConfig, GenerationSource, SearchSegment, VCountTimer0Range};

// Re-export generation algorithm types
pub use types::{
    EncounterType, GameStartConfig, GenderRatio, IV_VALUE_UNKNOWN, Ivs, LeadAbilityEffect,
    SaveState, StartMode,
};

// Re-export generation algorithm functions
pub use generation::algorithm::{
    EncounterResult, EverstonePlan, HeldItemSlot, InheritanceSlot, ItemContent, ParentRole,
    apply_game_offset, calc_report_needle_direction, calculate_game_offset,
    calculate_needle_direction,
};

// Re-export misc module
pub use misc::{
    IvCode, IvFilter, MtseedResult, MtseedSearchBatch, MtseedSearchParams, MtseedSearcher,
    NeedlePattern, NeedleSearchBatch, NeedleSearchInput, NeedleSearchParams, NeedleSearchResult,
    NeedleSearcher, decode_iv_code, encode_iv_code, get_needle_pattern, needle_direction_arrow,
    reorder_iv_code_for_roamer,
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
