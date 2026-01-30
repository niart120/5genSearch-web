//! ポケモン生成機能

pub mod algorithm;
pub mod flows;

// algorithm: needle 計算関数のみ公開
pub use algorithm::{calc_report_needle_direction, calculate_needle_direction};

// flows: 生成フロー関連
pub use flows::{
    EggGenerator, EncounterMethod, EncounterSlotConfig, GeneratedEggData, GeneratedPokemonData,
    GenerationError, MovingEncounterInfo, MovingEncounterLikelihood, PokemonGenerator, RawEggData,
    RawPokemonData, SpecialEncounterDirection, SpecialEncounterInfo, generate_egg,
    generate_egg_list, generate_hidden_grotto_pokemon, generate_pokemon_list,
    generate_static_pokemon, generate_wild_pokemon,
};
