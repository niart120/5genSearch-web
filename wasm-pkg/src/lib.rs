#![feature(portable_simd)]
#![deny(clippy::all)]
#![warn(clippy::pedantic)]
#![allow(clippy::module_name_repetitions)]
#![allow(clippy::must_use_candidate)]

use wasm_bindgen::prelude::*;

pub mod core;
pub mod datetime_search;
pub mod types;

// Re-export SHA-1 wasm-bindgen functions
pub use core::sha1::{hash_to_lcg_seed, hash_to_mt_seed, sha1_hash_batch, sha1_hash_single};

// Re-export datetime_search types
pub use datetime_search::{
    MtseedDatetimeResult, MtseedDatetimeSearchBatch, MtseedDatetimeSearchParams,
    MtseedDatetimeSearcher, SearchRangeParams, TimeRangeParams,
};

// Re-export common types
pub use types::{DsConfig, SearchSegment, VCountTimer0Range};

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
