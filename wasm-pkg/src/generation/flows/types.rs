//! 生成フロー用型定義

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use crate::generation::algorithm::{EverstonePlan, HeldItemSlot, InheritanceSlot};
use crate::types::{
    EncounterType, Gender, GenderRatio, GenerationSource, Ivs, LeadAbilityEffect, Nature,
    NeedleDirection, RomVersion, ShinyType,
};

// ===== エンカウント方法 =====

/// エンカウント方法
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum EncounterMethod {
    /// あまいかおり使用 (確定エンカウント、判定スキップ)
    #[default]
    SweetScent,
    /// 移動中 (エンカウント判定あり)
    Moving,
}

// ===== 移動エンカウント情報 =====

/// 移動エンカウント判定結果
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum MovingEncounterLikelihood {
    /// 歩数にかかわらず確定エンカウント (最低閾値通過)
    #[default]
    Guaranteed,
    /// 歩数次第でエンカウント (BW2 のみ、最高閾値のみ通過)
    Possible,
    /// エンカウント無し (最高閾値も不通過)
    NoEncounter,
}

/// 移動エンカウント情報
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MovingEncounterInfo {
    /// 判定結果
    pub likelihood: MovingEncounterLikelihood,
    /// 判定に使用した乱数値
    pub rand_value: u32,
}

// ===== 特殊エンカウント情報 =====

/// 特殊エンカウント発生方向
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum SpecialEncounterDirection {
    #[default]
    Right,
    Up,
    Left,
    Down,
}

/// 特殊エンカウント情報
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SpecialEncounterInfo {
    /// 発生するか (10% 判定結果)
    pub triggered: bool,
    /// 発生方向 (triggered = true の場合のみ有効)
    pub direction: SpecialEncounterDirection,
    /// 発生判定に使用した乱数値
    pub trigger_rand: u32,
    /// 方向決定に使用した乱数値
    pub direction_rand: u32,
}

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

/// エンカウントスロット設定
#[derive(Clone)]
pub struct EncounterSlotConfig {
    pub species_id: u16,
    pub level_min: u8,
    pub level_max: u8,
    pub gender_threshold: u8,
    pub has_held_item: bool,
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

// ===== 生成結果 =====

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
}

/// 完全な個体データ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GeneratedPokemonData {
    // 列挙コンテキスト
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    /// 生成元情報
    pub source: GenerationSource,
    // Seed 情報
    #[tsify(type = "bigint")]
    pub lcg_seed: u64,
    // 基本情報
    pub pid: u32,
    pub species_id: u16,
    pub level: u8,
    // 個体情報
    pub nature: Nature,
    pub sync_applied: bool,
    pub ability_slot: u8,
    pub gender: Gender,
    pub shiny_type: ShinyType,
    pub held_item_slot: HeldItemSlot,
    // IV (既存 Ivs 型を使用)
    pub ivs: Ivs,
    // === エンカウント付加情報 (排反) ===
    /// 移動エンカウント情報 (Normal/Surfing + Moving 時のみ Some)
    pub moving_encounter: Option<MovingEncounterInfo>,
    /// 特殊エンカウント情報 (ShakingGrass/DustCloud/SurfingBubble/FishingBubble/PokemonShadow 時のみ Some)
    pub special_encounter: Option<SpecialEncounterInfo>,
}

impl GeneratedPokemonData {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        raw: &RawPokemonData,
        ivs: Ivs,
        advance: u32,
        needle_direction: NeedleDirection,
        source: GenerationSource,
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

/// 完全な卵データ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GeneratedEggData {
    // 列挙コンテキスト
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    /// 生成元情報
    pub source: GenerationSource,
    // Seed 情報
    #[tsify(type = "bigint")]
    pub lcg_seed: u64,
    // 基本情報
    pub pid: u32,
    // 個体情報
    pub nature: Nature,
    pub gender: Gender,
    pub ability_slot: u8,
    pub shiny_type: ShinyType,
    // 遺伝情報 (配列は Tsify で問題が出る場合があるので個別フィールド化)
    pub inheritance_0_stat: usize,
    pub inheritance_0_parent: u8,
    pub inheritance_1_stat: usize,
    pub inheritance_1_parent: u8,
    pub inheritance_2_stat: usize,
    pub inheritance_2_parent: u8,
    // IV (遺伝適用後)
    pub ivs: Ivs,
}

impl GeneratedEggData {
    pub fn new(
        raw: &RawEggData,
        ivs: Ivs,
        advance: u32,
        needle_direction: NeedleDirection,
        source: GenerationSource,
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
