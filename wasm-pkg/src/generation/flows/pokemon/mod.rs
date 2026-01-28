//! ポケモン生成フロー
//!
//! 固定エンカウント (static) と野生エンカウント (wild) のロジックを提供。

mod fishing;
mod normal;
mod phenomena;
pub mod static_encounter;
mod surfing;

use crate::core::lcg::Lcg64;
use crate::generation::flows::types::{GenerationError, RawPokemonData};
use crate::types::{EncounterType, PokemonGenerationParams, RomVersion};

pub use static_encounter::{generate_hidden_grotto_pokemon, generate_static_pokemon};

/// 野生ポケモン生成 (エンカウント種別に応じてディスパッチ)
///
/// # 対応エンカウント種別
/// - `Normal`, `ShakingGrass`: 通常エンカウント
/// - `DustCloud`, `PokemonShadow`: 特殊現象エンカウント
/// - `Surfing`, `SurfingBubble`: 波乗りエンカウント
/// - `Fishing`, `FishingBubble`: 釣りエンカウント
///
/// 釣り失敗時は `EncounterResult::FishingFailed` を持つ `RawPokemonData` を返す。
///
/// # Errors
///
/// - `GenerationError::UnsupportedEncounterType`: 非対応エンカウント種別
pub fn generate_wild_pokemon(
    lcg: &mut Lcg64,
    params: &PokemonGenerationParams,
    version: RomVersion,
) -> Result<RawPokemonData, GenerationError> {
    match params.encounter_type {
        EncounterType::Normal | EncounterType::ShakingGrass => {
            Ok(normal::generate_normal_pokemon(lcg, params, version))
        }

        EncounterType::DustCloud | EncounterType::PokemonShadow => {
            Ok(phenomena::generate_phenomena_pokemon(lcg, params, version))
        }

        EncounterType::Surfing | EncounterType::SurfingBubble => {
            Ok(surfing::generate_surfing_pokemon(lcg, params, version))
        }

        EncounterType::Fishing | EncounterType::FishingBubble => {
            Ok(fishing::generate_fishing_pokemon(lcg, params, version))
        }

        _ => Err(GenerationError::UnsupportedEncounterType),
    }
}
