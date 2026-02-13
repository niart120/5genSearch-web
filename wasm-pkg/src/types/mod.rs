//! 共通型定義
//!
//! tsify による TypeScript 型の自動生成を行う。
//! サブモジュールに分割された型を re-export する。

mod config;
mod filter;
mod generation;
mod keyinput;
mod needle;
mod pokemon;
mod search;
mod seeds;
mod ui;

// ===== Re-exports =====

// config
pub use config::{
    Datetime, DsConfig, Hardware, RomRegion, RomVersion, StartupCondition, Timer0VCountRange,
};

// keyinput
pub use keyinput::{DsButton, KeyCode, KeyInput, KeySpec};

// search
pub use search::{
    DateRangeParams, DatetimeSearchContext, EggDatetimeSearchBatch, EggDatetimeSearchParams,
    EggDatetimeSearchResult, MtseedDatetimeSearchBatch, MtseedDatetimeSearchParams, MtseedResult,
    MtseedSearchBatch, MtseedSearchContext, MtseedSearchParams, SearchRangeParams, TimeRangeParams,
    TrainerInfoSearchBatch, TrainerInfoSearchParams, TrainerInfoSearchResult,
};

// filter
pub use filter::{
    CoreDataFilter, EggFilter, IvFilter, PokemonFilter, ShinyFilter, StatsFilter, TrainerInfoFilter,
};

// generation
pub use generation::{
    CorePokemonData, EggGenerationParams, EncounterMethod, EncounterResult, EncounterSlotConfig,
    EncounterType, EverstonePlan, GameStartConfig, GeneratedEggData, GeneratedPokemonData,
    GenerationConfig, ItemContent, MemoryLinkState, MovingEncounterInfo, MovingEncounterLikelihood,
    PokemonGenerationParams, SavePresence, SeedSpec, ShinyCharmState, SpecialEncounterDirection,
    SpecialEncounterInfo, StartMode,
};

// needle
pub use needle::{NeedleDirection, NeedlePattern, NeedleSearchResult};

// pokemon
pub use pokemon::{
    AbilitySlot, Gender, GenderRatio, HeldItemSlot, HiddenPowerType, IV_VALUE_UNKNOWN,
    InheritanceSlot, Ivs, LeadAbilityEffect, Nature, Pid, ShinyType, TrainerInfo,
};

// seeds
pub use seeds::{LcgSeed, MtSeed, SeedOrigin};

// ui
pub use ui::{UiEggData, UiPokemonData};

// data (re-export for convenience)
pub use crate::data::Stats;
