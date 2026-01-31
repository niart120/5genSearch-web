//! 共通型定義
//!
//! tsify による TypeScript 型の自動生成を行う。
//! サブモジュールに分割された型を re-export する。

mod config;
mod filter;
mod generation;
mod needle;
mod pokemon;
mod seeds;

// ===== Re-exports =====

pub use config::{
    Datetime, DatetimeSearchContext, DsButton, DsConfig, Hardware, KeyCode, KeyInput, KeySpec,
    RomRegion, RomVersion, SearchRangeParams, SeedInput, StartupCondition, TimeRangeParams,
    Timer0VCountRange,
};
pub use filter::{CoreDataFilter, EggFilter, IvFilter, PokemonFilter, ShinyFilter};
pub use generation::{
    CorePokemonData, EggGenerationParams, EncounterMethod, EncounterResult, EncounterSlotConfig,
    EncounterType, EverstonePlan, GameStartConfig, GeneratedEggData, GeneratedPokemonData,
    GenerationConfig, ItemContent, MovingEncounterInfo, MovingEncounterLikelihood,
    PokemonGenerationParams, SaveState, SpecialEncounterDirection, SpecialEncounterInfo, StartMode,
};
pub use needle::{NeedleDirection, NeedlePattern, NeedleSearchResult};
pub use pokemon::{
    AbilitySlot, Gender, GenderRatio, HeldItemSlot, HiddenPowerType, IV_VALUE_UNKNOWN,
    InheritanceSlot, Ivs, LeadAbilityEffect, Nature, Pid, ShinyType, TrainerInfo,
};
pub use seeds::{LcgSeed, MtSeed, SeedOrigin};
