//! 生成フロー

pub mod egg;
pub mod generator;
pub mod pokemon;
pub mod types;

pub use egg::generate_egg;
pub use generator::{generate_egg_list, generate_pokemon_list, EggGenerator, PokemonGenerator};
pub use pokemon::{generate_static_pokemon, generate_wild_pokemon};

// 内部型のみ再エクスポート
pub use types::{EncounterSlotConfig, GenerationError, RawEggData, RawPokemonData};

// TS 公開型は crate::types から再エクスポート
pub use crate::types::{
    EncounterMethod, GeneratedEggData, GeneratedPokemonData, MovingEncounterInfo,
    MovingEncounterLikelihood, SpecialEncounterDirection, SpecialEncounterInfo,
};
