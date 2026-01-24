//! 共通型定義
//!
//! tsify による TypeScript 型の自動生成を行う。
//! サブモジュールに分割された型を re-export する。

mod config;
mod generation;
mod pokemon;
mod seeds;

// ===== Re-exports =====

pub use config::{
    DatetimeParams, DsConfig, Hardware, RomRegion, RomVersion, SearchSegment, VCountTimer0Range,
};
pub use generation::{
    EncounterMethod, EncounterType, GameStartConfig, GeneratedEggData, GeneratedPokemonData,
    GenerationSource, MovingEncounterInfo, MovingEncounterLikelihood, SaveState,
    SpecialEncounterDirection, SpecialEncounterInfo, StartMode,
};
pub use pokemon::{
    AbilitySlot, Gender, GenderRatio, HeldItemSlot, IV_VALUE_UNKNOWN, IvSet, Ivs,
    LeadAbilityEffect, Nature, ShinyType,
};
pub use seeds::{LcgSeed, MtSeed, NeedleDirection};
