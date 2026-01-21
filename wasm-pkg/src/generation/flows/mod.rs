//! 生成フロー

pub mod egg;
pub mod generator;
pub mod pokemon_static;
pub mod pokemon_wild;
pub mod types;

pub use egg::generate_egg;
pub use generator::{EggGenerator, StaticPokemonGenerator, WildPokemonGenerator};
pub use pokemon_static::generate_static_pokemon;
pub use pokemon_wild::generate_wild_pokemon;
pub use types::{
    EggGenerationConfig, EncounterSlotConfig, GeneratedEggData, GeneratedPokemonData,
    GenerationError, OffsetConfig, PokemonGenerationConfig, RawEggData, RawPokemonData,
};
