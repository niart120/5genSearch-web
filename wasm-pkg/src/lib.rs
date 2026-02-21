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
    MemoryLinkState, MovingEncounterInfo, MovingEncounterLikelihood, MtSeed,
    MtseedDatetimeSearchBatch, MtseedDatetimeSearchParams, MtseedResult, MtseedSearchBatch,
    MtseedSearchContext, MtseedSearchParams, NeedleDirection, NeedlePattern, Pid, PokemonFilter,
    PokemonGenerationParams, RomVersion, SavePresence, SearchRangeParams, SeedOrigin, SeedSpec,
    ShinyCharmState, ShinyFilter, SpecialEncounterDirection, SpecialEncounterInfo, StartMode,
    Stats, StatsFilter, TimeRangeParams, Timer0VCountRange, TrainerInfo, TrainerInfoFilter,
    TrainerInfoSearchBatch, TrainerInfoSearchParams, TrainerInfoSearchResult, UiEggData,
    UiPokemonData,
};

// Re-export core functions
pub use core::needle::{calc_report_needle_direction, calculate_needle_direction};
pub use core::seed_resolver::resolve_seeds;

// Re-export misc module (Searcher と関数)
pub use misc::{
    MtseedSearcher, generate_mtseed_iv_search_tasks, get_needle_pattern_at, search_needle_pattern,
};

// Re-export needle search types
pub use types::NeedleSearchResult;

// Re-export resolve module
pub use resolve::{resolve_egg_data, resolve_pokemon_data};

/// 種族名を取得
///
/// # Arguments
/// * `species_id` - 全国図鑑番号 (1-649)
/// * `locale` - ロケール (`"ja"` または `"en"`)
///
/// # Returns
/// 種族名。範囲外の場合は `"???"` を返す。
#[wasm_bindgen]
pub fn get_species_name(species_id: u16, locale: &str) -> String {
    data::get_species_name(species_id, locale).to_string()
}

/// 種族の性別比を取得
///
/// # Arguments
/// * `species_id` - 全国図鑑番号 (1-649)
///
/// # Returns
/// 性別比。範囲外の場合はインデックス0 (フシギダネ) の値。
#[wasm_bindgen]
pub fn get_species_gender_ratio(species_id: u16) -> types::GenderRatio {
    data::species::get_species_entry(species_id).gender_ratio
}

// Re-export GPU module (when enabled)
#[cfg(feature = "gpu")]
pub use gpu::{
    GpuDatetimeSearchIterator, GpuDeviceContext, GpuKind, GpuMtseedSearchBatch,
    GpuMtseedSearchIterator, GpuProfile, GpuSearchBatch, SearchJobLimits,
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

/// MT Seed と消費数から IV スプレッドを計算する。
///
/// 既存内部関数 `generate_rng_ivs_with_offset` の wasm-bindgen エクスポート。
///
/// # Arguments
/// * `mt_seed` - MT19937 初期化シード
/// * `mt_offset` - IV 生成開始までの消費数 (0, 1, 2, 7)
/// * `is_roamer` - true の場合 IV 読み取り順が H/A/B/S/C/D になる (BW 徘徊)
#[wasm_bindgen]
pub fn compute_iv_spread(mt_seed: MtSeed, mt_offset: u32, is_roamer: bool) -> Ivs {
    generation::algorithm::generate_rng_ivs_with_offset(mt_seed, mt_offset, is_roamer)
}

/// LCG Seed から MT Seed を導出する。
///
/// 既存メソッド `LcgSeed::derive_mt_seed()` の wasm-bindgen エクスポート。
#[wasm_bindgen]
pub fn lcg_seed_to_mt_seed(seed: LcgSeed) -> MtSeed {
    seed.derive_mt_seed()
}

/// GPU プロファイルを検出する。
///
/// WebGPU アダプターから GPU デバイス情報を取得し、
/// `GpuProfile` を返す。
///
/// # Errors
///
/// GPU アダプターが見つからない場合。
#[cfg(feature = "gpu")]
#[wasm_bindgen]
pub async fn detect_gpu_profile() -> Result<GpuProfile, String> {
    let ctx = gpu::GpuDeviceContext::new().await?;
    Ok(ctx.gpu_profile().clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_check() {
        assert_eq!(health_check(), "wasm-pkg is ready");
    }
}
