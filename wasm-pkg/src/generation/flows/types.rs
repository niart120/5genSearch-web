//! 生成フロー用内部型定義
//!
//! 生成フロー内部でのみ使用される設定型・中間データ型を定義。
//! TS 公開型は `crate::types` に配置。

use crate::data::{Stats, calculate_stats, get_species_entry};
use crate::types::{
    AbilitySlot, CorePokemonData, EncounterResult, Gender, GeneratedEggData, GeneratedPokemonData,
    HeldItemSlot, InheritanceSlot, Ivs, MovingEncounterInfo, Nature, NeedleDirection, Pid,
    SeedOrigin, ShinyType, SpecialEncounterInfo,
};

// Re-export for internal use
pub use crate::types::EncounterSlotConfig;

// ===== 生成エラー =====

/// 生成エラー
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum GenerationError {
    InvalidConfig(String),
    UnsupportedEncounterType,
}

// ===== 中間データ =====

/// 生の個体データ (IV なし)
#[derive(Clone, Debug)]
pub struct RawPokemonData {
    pub pid: Pid,
    pub species_id: u16,
    pub level: u8,
    pub nature: Nature,
    pub sync_applied: bool,
    pub ability_slot: AbilitySlot,
    pub gender: Gender,
    pub shiny_type: ShinyType,
    pub held_item_slot: HeldItemSlot,
    pub encounter_result: EncounterResult,
}

impl RawPokemonData {
    pub(crate) fn filter_input(
        &self,
        special: Option<&SpecialEncounterInfo>,
    ) -> crate::types::PokemonFilterInput<'_> {
        use crate::types::{CoreFilterInput, PokemonFilterInput};
        PokemonFilterInput {
            core: CoreFilterInput {
                nature: self.nature,
                gender: self.gender,
                ability_slot: self.ability_slot,
                shiny_type: self.shiny_type,
            },
            species_id: self.species_id,
            level: self.level,
            held_item_slot: self.held_item_slot,
            encounter_result: &self.encounter_result,
            special_encounter_triggered: special.map(|info| info.triggered),
        }
    }
}

impl RawPokemonData {
    /// ポケモン以外のエンカウント結果を生成
    ///
    /// Item 取得、釣り失敗など、ポケモンが生成されない場合に使用。
    pub fn not_pokemon(encounter_result: EncounterResult) -> Self {
        Self {
            pid: Pid::ZERO,
            species_id: 0,
            level: 0,
            nature: Nature::Hardy,
            sync_applied: false,
            ability_slot: AbilitySlot::First,
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
    pub pid: Pid,
    pub nature: Nature,
    pub gender: Gender,
    pub ability_slot: AbilitySlot,
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
        let stats = if raw.species_id > 0 {
            let entry = get_species_entry(raw.species_id);
            calculate_stats(entry.base_stats, ivs, raw.nature, raw.level)
        } else {
            Stats::UNKNOWN
        };

        Self {
            advance,
            needle_direction,
            source,
            core: CorePokemonData {
                pid: raw.pid,
                nature: raw.nature,
                ability_slot: raw.ability_slot,
                gender: raw.gender,
                shiny_type: raw.shiny_type,
                ivs,
                stats,
                species_id: raw.species_id,
                level: raw.level,
            },
            sync_applied: raw.sync_applied,
            held_item_slot: raw.held_item_slot,
            moving_encounter,
            special_encounter,
            encounter_result: raw.encounter_result,
        }
    }
}

impl GeneratedEggData {
    /// `RawEggData` から `GeneratedEggData` を構築
    ///
    /// # `species_id` の例外種変換
    /// - ニドラン♀ (#29) + ♂ → ニドラン♂ (#32)
    /// - イルミーゼ (#314) + ♂ → バルビート (#313)
    pub fn from_raw(
        raw: &RawEggData,
        ivs: Ivs,
        advance: u32,
        needle_direction: NeedleDirection,
        source: SeedOrigin,
        margin_frames: Option<u32>,
        species_id: Option<u16>,
    ) -> Self {
        // 例外種の変換
        let resolved_species_id = match species_id {
            Some(29) if raw.gender == Gender::Male => 32, // ニドラン♀ → ニドラン♂
            Some(314) if raw.gender == Gender::Male => 313, // イルミーゼ → バルビート
            Some(id) => id,
            None => 0,
        };

        let stats = if resolved_species_id > 0 {
            let entry = get_species_entry(resolved_species_id);
            calculate_stats(entry.base_stats, ivs, raw.nature, 1) // 卵は常にLv.1
        } else {
            Stats::UNKNOWN
        };

        Self {
            advance,
            needle_direction,
            source,
            core: CorePokemonData {
                pid: raw.pid,
                nature: raw.nature,
                ability_slot: raw.ability_slot,
                gender: raw.gender,
                shiny_type: raw.shiny_type,
                ivs,
                stats,
                species_id: resolved_species_id,
                level: 1, // 卵は常にLv.1
            },
            inheritance: raw.inheritance,
            margin_frames,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{LcgSeed, ShinyType};

    fn make_male_raw_egg() -> RawEggData {
        RawEggData {
            pid: Pid::ZERO,
            nature: Nature::Hardy,
            gender: Gender::Male,
            ability_slot: AbilitySlot::First,
            shiny_type: ShinyType::None,
            inheritance: [
                InheritanceSlot::new(0, 0),
                InheritanceSlot::new(1, 0),
                InheritanceSlot::new(2, 0),
            ],
        }
    }

    fn generate_male_egg(species_id: u16) -> GeneratedEggData {
        GeneratedEggData::from_raw(
            &make_male_raw_egg(),
            Ivs::uniform(31),
            0,
            NeedleDirection::N,
            SeedOrigin::seed(LcgSeed(0)),
            None,
            Some(species_id),
        )
    }

    #[test]
    fn male_nidoran_uses_nidoran_male_as_resolved_species() {
        let egg = generate_male_egg(29);

        assert_eq!(egg.core.species_id, 32);
        assert_eq!(egg.core.stats.hp, Some(12));
    }

    #[test]
    fn male_illumise_uses_volbeat_as_resolved_species() {
        let egg = generate_male_egg(314);

        assert_eq!(egg.core.species_id, 313);
        assert_eq!(egg.core.stats.hp, Some(12));
    }
}
