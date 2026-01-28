//! 生成フロー用内部型定義
//!
//! 生成フロー内部でのみ使用される設定型・中間データ型を定義。
//! TS 公開型は `crate::types` に配置。

use crate::types::{
    EncounterResult, Gender, GeneratedEggData, GeneratedPokemonData, HeldItemSlot, InheritanceSlot,
    Ivs, MovingEncounterInfo, Nature, NeedleDirection, SeedOrigin, ShinyType, SpecialEncounterInfo,
};

// Re-export for internal use
pub use crate::types::EncounterSlotConfig;

// ===== 生成エラー =====

/// 生成エラー
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum GenerationError {
    FishingFailed,
    InvalidConfig(String),
}

// ===== 中間データ =====

/// 生の個体データ (IV なし)
#[derive(Clone, Debug)]
pub struct RawPokemonData {
    pub pid: u32,
    pub species_id: u16,
    pub level: u8,
    pub nature: Nature,
    pub sync_applied: bool,
    pub ability_slot: u8,
    pub gender: Gender,
    pub shiny_type: ShinyType,
    pub held_item_slot: HeldItemSlot,
    /// エンカウント結果 (DustCloud/PokemonShadow 時に使用。通常は Pokemon)
    pub encounter_result: EncounterResult,
}

impl RawPokemonData {
    /// Item 取得時のデータ生成
    pub fn item_only(encounter_result: EncounterResult) -> Self {
        Self {
            pid: 0,
            species_id: 0,
            level: 0,
            nature: Nature::Hardy, // デフォルト
            sync_applied: false,
            ability_slot: 0,
            gender: Gender::Genderless,
            shiny_type: ShinyType::None,
            held_item_slot: HeldItemSlot::None,
            encounter_result,
        }
    }
}

/// 生の卵データ (IV なし)
#[derive(Clone, Debug)]
pub struct RawEggData {
    pub pid: u32,
    pub nature: Nature,
    pub gender: Gender,
    pub ability_slot: u8,
    pub shiny_type: ShinyType,
    pub inheritance: [InheritanceSlot; 3],
}

// ===== ヘルパー impl =====

impl GeneratedPokemonData {
    #[allow(clippy::too_many_arguments)]
    pub fn from_raw(
        raw: &RawPokemonData,
        ivs: Ivs,
        advance: u32,
        needle_direction: NeedleDirection,
        source: SeedOrigin,
        moving_encounter: Option<MovingEncounterInfo>,
        special_encounter: Option<SpecialEncounterInfo>,
    ) -> Self {
        Self {
            advance,
            needle_direction,
            source,
            pid: raw.pid,
            species_id: raw.species_id,
            level: raw.level,
            nature: raw.nature,
            sync_applied: raw.sync_applied,
            ability_slot: raw.ability_slot,
            gender: raw.gender,
            shiny_type: raw.shiny_type,
            held_item_slot: raw.held_item_slot,
            ivs,
            moving_encounter,
            special_encounter,
            encounter_result: raw.encounter_result,
        }
    }
}

impl GeneratedEggData {
    pub fn from_raw(
        raw: &RawEggData,
        ivs: Ivs,
        advance: u32,
        needle_direction: NeedleDirection,
        source: SeedOrigin,
        margin_frames: Option<u32>,
    ) -> Self {
        Self {
            advance,
            needle_direction,
            source,
            pid: raw.pid,
            nature: raw.nature,
            gender: raw.gender,
            ability_slot: raw.ability_slot,
            shiny_type: raw.shiny_type,
            inheritance: raw.inheritance,
            ivs,
            margin_frames,
        }
    }
}
