//! 生成フロー用内部型定義
//!
//! 生成フロー内部でのみ使用される設定型・中間データ型を定義。
//! TS 公開型は `crate::types` に配置。

use crate::generation::algorithm::InheritanceSlot;
use crate::types::{
    EncounterMethod, EncounterResult, EncounterType, EverstonePlan, Gender, GenderRatio,
    GeneratedEggData, GeneratedPokemonData, HeldItemSlot, Ivs, LeadAbilityEffect,
    MovingEncounterInfo, Nature, NeedleDirection, RomVersion, SeedOrigin, ShinyType,
    SpecialEncounterInfo,
};

// Re-export for internal use
pub use crate::types::EncounterSlotConfig;

// ===== 生成設定 =====

/// 生成設定 (野生・固定共通)
#[derive(Clone)]
pub struct PokemonGenerationConfig {
    pub version: RomVersion,
    pub encounter_type: EncounterType,
    pub tid: u16,
    pub sid: u16,
    pub lead_ability: LeadAbilityEffect,
    pub shiny_charm: bool,
    pub shiny_locked: bool,
    pub has_held_item: bool,
    /// エンカウント方法 (Normal/Surfing 時のみ使用)
    pub encounter_method: EncounterMethod,
}

/// 孵化設定
#[derive(Clone)]
pub struct EggGenerationConfig {
    pub tid: u16,
    pub sid: u16,
    pub everstone: EverstonePlan,
    pub female_has_hidden: bool,
    pub uses_ditto: bool,
    pub gender_ratio: GenderRatio,
    pub nidoran_flag: bool,
    pub pid_reroll_count: u8,
}

// ===== オフセット設定 =====

/// 生成スキーム (MT オフセット自動決定用)
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum GenerationScheme {
    /// 孵化 (BW/BW2 共通: MT offset = 7)
    Egg,
    /// 野生/固定 BW (MT offset = 0)
    WildOrStaticBw,
    /// 野生/固定 BW2 (MT offset = 2)
    WildOrStaticBw2,
    /// 徘徊 BW (MT offset = 1)
    RoamerBw,
}

impl GenerationScheme {
    /// 生成スキームに応じた MT オフセットを返す
    #[inline]
    pub const fn mt_offset(self) -> u32 {
        match self {
            Self::Egg => 7,
            Self::WildOrStaticBw => 0,
            Self::WildOrStaticBw2 => 2,
            Self::RoamerBw => 1,
        }
    }
}

/// オフセット設定
#[derive(Clone, Copy, Debug)]
pub struct OffsetConfig {
    /// ユーザ指定オフセット (`GameOffset` に加算)
    pub user_offset: u32,
    /// MT オフセット (IV 生成開始位置)
    pub mt_offset: u32,
}

impl Default for OffsetConfig {
    fn default() -> Self {
        // デフォルトは孵化向け (mt_offset = 7)
        Self::for_scheme(GenerationScheme::Egg, 0)
    }
}

impl OffsetConfig {
    /// 生成スキームに基づいて作成
    pub const fn for_scheme(scheme: GenerationScheme, user_offset: u32) -> Self {
        Self {
            user_offset,
            mt_offset: scheme.mt_offset(),
        }
    }

    /// エンカウント種別とバージョンから適切なスキームを決定して作成
    ///
    /// `Egg` も受け付けるため、`for_egg()` の代わりに本メソッドを使用可能。
    pub const fn for_encounter(
        version: RomVersion,
        encounter_type: EncounterType,
        user_offset: u32,
    ) -> Self {
        let scheme = match encounter_type {
            EncounterType::Egg => GenerationScheme::Egg,
            EncounterType::Roamer => GenerationScheme::RoamerBw,
            _ => {
                if version.is_bw2() {
                    GenerationScheme::WildOrStaticBw2
                } else {
                    GenerationScheme::WildOrStaticBw
                }
            }
        };
        Self::for_scheme(scheme, user_offset)
    }

    /// 孵化用に作成
    pub const fn for_egg(user_offset: u32) -> Self {
        Self::for_scheme(GenerationScheme::Egg, user_offset)
    }

    /// カスタム MT オフセットで作成
    pub const fn with_custom_mt_offset(user_offset: u32, mt_offset: u32) -> Self {
        Self {
            user_offset,
            mt_offset,
        }
    }
}

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
        lcg_seed: u64,
        moving_encounter: Option<MovingEncounterInfo>,
        special_encounter: Option<SpecialEncounterInfo>,
    ) -> Self {
        Self {
            advance,
            needle_direction,
            source,
            lcg_seed,
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
        lcg_seed: u64,
    ) -> Self {
        Self {
            advance,
            needle_direction,
            source,
            lcg_seed,
            pid: raw.pid,
            nature: raw.nature,
            gender: raw.gender,
            ability_slot: raw.ability_slot,
            shiny_type: raw.shiny_type,
            inheritance_0_stat: raw.inheritance[0].stat,
            inheritance_0_parent: raw.inheritance[0].parent_as_u8(),
            inheritance_1_stat: raw.inheritance[1].stat,
            inheritance_1_parent: raw.inheritance[1].parent_as_u8(),
            inheritance_2_stat: raw.inheritance[2].stat,
            inheritance_2_parent: raw.inheritance[2].parent_as_u8(),
            ivs,
        }
    }
}
