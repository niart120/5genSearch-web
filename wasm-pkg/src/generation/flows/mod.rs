//! 生成フロー

pub mod egg;
pub mod generator;
pub mod pokemon_static;
pub mod pokemon_wild;
pub mod types;

pub use egg::generate_egg;
pub use generator::{EggGenerator, PokemonGenerator, generate_egg_list, generate_pokemon_list};
pub use pokemon_static::generate_static_pokemon;
pub use pokemon_wild::generate_wild_pokemon;

// 内部型のみ再エクスポート
pub use types::{EncounterSlotConfig, GenerationError, RawEggData, RawPokemonData};

// TS 公開型は crate::types から再エクスポート
pub use crate::types::{
    EncounterMethod, GeneratedEggData, GeneratedPokemonData, MovingEncounterInfo,
    MovingEncounterLikelihood, SpecialEncounterDirection, SpecialEncounterInfo,
};
