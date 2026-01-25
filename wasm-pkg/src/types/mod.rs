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
    Datetime, DsButton, DsConfig, GeneratorSource, Hardware, KeyCode, KeyInput, KeyMask, KeySpec,
    RomRegion, RomVersion, SearchSegment, Timer0VCountRange,
};
pub use generation::{
    EncounterMethod, EncounterResult, EncounterType, GameStartConfig, GeneratedEggData,
    GeneratedPokemonData, GenerationSource, ItemContent, MovingEncounterInfo,
    MovingEncounterLikelihood, SaveState, SpecialEncounterDirection, SpecialEncounterInfo,
    StartMode,
};
pub use needle::{NeedleDirection, NeedlePattern};
pub use pokemon::{
    AbilitySlot, Gender, GenderRatio, HeldItemSlot, HiddenPowerType, IV_VALUE_UNKNOWN, IvFilter,
    Ivs, LeadAbilityEffect, Nature, ShinyType,
};
pub use seeds::{LcgSeed, MtSeed};
