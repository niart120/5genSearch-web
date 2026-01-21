//! エンカウント処理アルゴリズム

use crate::types::{EncounterType, LeadAbilityEffect, RomVersion};

/// 百分率換算値を計算 (0-99)
#[inline]
pub fn rand_to_percent(version: RomVersion, rand_value: u32) -> u32 {
    match version {
        RomVersion::Black | RomVersion::White => {
            ((u64::from(rand_value) * 0xFFFF / 0x290) >> 32) as u32
        }
        RomVersion::Black2 | RomVersion::White2 => ((u64::from(rand_value) * 100) >> 32) as u32,
    }
}

/// 通常エンカウント・揺れる草むら: スロット決定 (12スロット)
pub fn normal_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=19 => 0,
        20..=39 => 1,
        40..=49 => 2,
        50..=59 => 3,
        60..=69 => 4,
        70..=79 => 5,
        80..=84 => 6,
        85..=89 => 7,
        90..=93 => 8,
        94..=97 => 9,
        98 => 10,
        _ => 11,
    }
}

/// なみのり・水泡なみのり: スロット決定 (5スロット)
pub fn surfing_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=59 => 0,
        60..=89 => 1,
        90..=94 => 2,
        95..=98 => 3,
        _ => 4,
    }
}

/// 釣り・水泡釣り: スロット決定 (5スロット)
pub fn fishing_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=39 => 0,
        40..=79 => 1,
        80..=94 => 2,
        95..=98 => 3,
        _ => 4,
    }
}

/// 橋の影: スロット決定 (4スロット)
pub fn pokemon_shadow_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=49 => 0,
        50..=79 => 1,
        80..=94 => 2,
        _ => 3,
    }
}

/// エンカウント種別に応じたスロット決定
pub fn calculate_encounter_slot(
    encounter_type: EncounterType,
    rand_value: u32,
    version: RomVersion,
) -> u8 {
    let percent = rand_to_percent(version, rand_value);

    match encounter_type {
        EncounterType::Normal | EncounterType::ShakingGrass | EncounterType::DustCloud => {
            normal_encounter_slot(percent)
        }
        EncounterType::Surfing | EncounterType::SurfingBubble => surfing_encounter_slot(percent),
        EncounterType::Fishing | EncounterType::FishingBubble => fishing_encounter_slot(percent),
        EncounterType::PokemonShadow => pokemon_shadow_encounter_slot(percent),
        _ => 0, // 固定エンカウント
    }
}

/// エンカウント結果
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EncounterResult {
    Pokemon,
    Item(ItemContent),
    Failed,
}

/// アイテム内容
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ItemContent {
    EvolutionStone,
    Jewel,
    Everstone,
    Feather,
}

/// 砂煙の結果を判定
pub fn dust_cloud_result(slot_value: u32) -> EncounterResult {
    match slot_value {
        0..=69 => EncounterResult::Pokemon,
        70 => EncounterResult::Item(ItemContent::EvolutionStone),
        71..=94 => EncounterResult::Item(ItemContent::Jewel),
        _ => EncounterResult::Item(ItemContent::Everstone),
    }
}

/// 橋の影の結果を判定
pub fn pokemon_shadow_result(slot_value: u32) -> EncounterResult {
    match slot_value {
        0..=29 => EncounterResult::Pokemon,
        _ => EncounterResult::Item(ItemContent::Feather),
    }
}

/// 釣り成功判定 (50%)
#[inline]
pub fn fishing_success(rand_value: u32) -> bool {
    ((u64::from(rand_value) * 2) >> 32) == 0
}

/// 持ち物スロット
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum HeldItemSlot {
    Common,
    Rare,
    VeryRare,
    #[default]
    None,
}

/// 持ち物判定
pub fn determine_held_item_slot(
    version: RomVersion,
    rand_value: u32,
    lead_ability: &LeadAbilityEffect,
    has_rare_item: bool,
) -> HeldItemSlot {
    let percent = rand_to_percent(version, rand_value);
    let has_compound_eyes = matches!(lead_ability, LeadAbilityEffect::CompoundEyes);

    if has_compound_eyes {
        match percent {
            0..=59 => HeldItemSlot::Common,
            60..=79 => HeldItemSlot::Rare,
            80..=84 if has_rare_item => HeldItemSlot::VeryRare,
            _ => HeldItemSlot::None,
        }
    } else {
        match percent {
            0..=49 => HeldItemSlot::Common,
            50..=54 => HeldItemSlot::Rare,
            55 if has_rare_item => HeldItemSlot::VeryRare,
            _ => HeldItemSlot::None,
        }
    }
}

/// 持ち物判定で乱数を消費するエンカウント種別
pub fn encounter_type_supports_held_item(encounter_type: EncounterType) -> bool {
    matches!(
        encounter_type,
        EncounterType::Surfing
            | EncounterType::SurfingBubble
            | EncounterType::Fishing
            | EncounterType::FishingBubble
            | EncounterType::ShakingGrass
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rand_to_percent_bw() {
        let result = rand_to_percent(RomVersion::Black, 0x8000_0000);
        assert!(result < 100);
    }

    #[test]
    fn test_normal_encounter_slot() {
        assert_eq!(normal_encounter_slot(0), 0);
        assert_eq!(normal_encounter_slot(19), 0);
        assert_eq!(normal_encounter_slot(20), 1);
        assert_eq!(normal_encounter_slot(99), 11);
    }

    #[test]
    fn test_dust_cloud_result() {
        assert_eq!(dust_cloud_result(0), EncounterResult::Pokemon);
        assert_eq!(
            dust_cloud_result(70),
            EncounterResult::Item(ItemContent::EvolutionStone)
        );
        assert_eq!(
            dust_cloud_result(71),
            EncounterResult::Item(ItemContent::Jewel)
        );
        assert_eq!(
            dust_cloud_result(95),
            EncounterResult::Item(ItemContent::Everstone)
        );
    }
}
