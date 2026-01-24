//! 共通型定義
//!
//! tsify による TypeScript 型の自動生成を行う。
//! サブモジュールに分割された型を re-export する。

mod config;
mod generation;
mod needle;
mod pokemon;
mod seeds;

// ===== Re-exports =====

pub use config::{
    DatetimeParams, DsConfig, Hardware, IvCode, KeyCode, KeyMask, RomRegion, RomVersion,
    SearchSegment, SeedSource, VCountTimer0Range,
};
pub use generation::{
    EncounterMethod, EncounterResult, EncounterType, GameStartConfig, GeneratedEggData,
    GeneratedPokemonData, GenerationSource, ItemContent, MovingEncounterInfo,
    MovingEncounterLikelihood, SaveState, SpecialEncounterDirection, SpecialEncounterInfo,
    StartMode,
};
pub use needle::{NeedleDirection, NeedlePattern};
pub use pokemon::{
    AbilitySlot, Gender, GenderRatio, HeldItemSlot, IV_VALUE_UNKNOWN, IvSet, Ivs,
    LeadAbilityEffect, Nature, ShinyType,
};
pub use seeds::{LcgSeed, MtSeed};
