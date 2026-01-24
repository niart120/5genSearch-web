//! エンカウント処理アルゴリズム
#![allow(clippy::trivially_copy_pass_by_ref)]

use crate::core::lcg::Lcg64;
use crate::types::{
    EncounterResult, EncounterType, HeldItemSlot, ItemContent, LeadAbilityEffect,
    MovingEncounterInfo, MovingEncounterLikelihood, RomVersion, SpecialEncounterDirection,
    SpecialEncounterInfo,
};

// ===== 移動エンカウント判定 =====

/// BW エンカウント判定閾値
const BW_ENCOUNTER_THRESHOLD: u32 = 9;
/// BW2 最低エンカウント率 (初期歩数後)
const BW2_ENCOUNTER_MIN_RATE: u32 = 5;
/// BW2 最高エンカウント率 (十分な歩数後)
const BW2_ENCOUNTER_MAX_RATE: u32 = 14;

/// 移動エンカウント判定
pub fn check_moving_encounter(version: RomVersion, rand_value: u32) -> MovingEncounterLikelihood {
    let percent = rand_to_percent(version, rand_value);

    match version {
        RomVersion::Black | RomVersion::White => {
            if percent < BW_ENCOUNTER_THRESHOLD {
                MovingEncounterLikelihood::Guaranteed
            } else {
                MovingEncounterLikelihood::NoEncounter
            }
        }
        RomVersion::Black2 | RomVersion::White2 => {
            if percent < BW2_ENCOUNTER_MIN_RATE {
                MovingEncounterLikelihood::Guaranteed
            } else if percent < BW2_ENCOUNTER_MAX_RATE {
                MovingEncounterLikelihood::Possible
            } else {
                MovingEncounterLikelihood::NoEncounter
            }
        }
    }
}

/// 移動エンカウント情報を生成
pub fn generate_moving_encounter_info(version: RomVersion, rand_value: u32) -> MovingEncounterInfo {
    MovingEncounterInfo {
        likelihood: check_moving_encounter(version, rand_value),
        rand_value,
    }
}

// ===== 特殊エンカウント判定 =====

/// 特殊エンカウント発生判定 (10%)
#[inline]
pub fn special_encounter_trigger(rand_value: u32) -> bool {
    ((u64::from(rand_value) * 10) >> 32) == 0
}

/// 特殊エンカウント発生方向決定
#[inline]
#[allow(clippy::cast_possible_truncation)]
pub fn special_encounter_direction(rand_value: u32) -> SpecialEncounterDirection {
    // 0..4 の範囲なので u8 への truncation は安全
    let v = ((u64::from(rand_value) * 4) >> 32) as u8;
    match v {
        0 => SpecialEncounterDirection::Right,
        1 => SpecialEncounterDirection::Up,
        2 => SpecialEncounterDirection::Left,
        _ => SpecialEncounterDirection::Down,
    }
}

/// 特殊エンカウント情報を生成
pub fn generate_special_encounter_info(
    trigger_rand: u32,
    direction_rand: u32,
) -> SpecialEncounterInfo {
    SpecialEncounterInfo {
        triggered: special_encounter_trigger(trigger_rand),
        direction: special_encounter_direction(direction_rand),
        trigger_rand,
        direction_rand,
    }
}

/// 特殊エンカウント情報が付加されるエンカウント種別か
pub fn is_special_encounter_type(encounter_type: EncounterType) -> bool {
    matches!(
        encounter_type,
        EncounterType::ShakingGrass
            | EncounterType::DustCloud
            | EncounterType::SurfingBubble
            | EncounterType::FishingBubble
            | EncounterType::PokemonShadow
    )
}

/// 移動エンカウント判定が適用されるエンカウント種別か
pub fn is_moving_encounter_type(encounter_type: EncounterType) -> bool {
    matches!(
        encounter_type,
        EncounterType::Normal | EncounterType::Surfing
    )
}

// ===== 百分率換算 =====

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

/// エンカウント種別に応じたスロット決定
pub fn calculate_encounter_slot(
    encounter_type: EncounterType,
    rand_value: u32,
    version: RomVersion,
) -> u8 {
    let percent = rand_to_percent(version, rand_value);

    match encounter_type {
        // 揺れる草むら / 土煙 / 橋の影 は通常エンカウントと同じ12スロット分布
        EncounterType::Normal
        | EncounterType::ShakingGrass
        | EncounterType::DustCloud
        | EncounterType::PokemonShadow => normal_encounter_slot(percent),
        EncounterType::Surfing | EncounterType::SurfingBubble => surfing_encounter_slot(percent),
        EncounterType::Fishing | EncounterType::FishingBubble => fishing_encounter_slot(percent),
        _ => 0, // 固定エンカウント
    }
}

/// 砂煙の結果を判定
pub(crate) fn dust_cloud_result(slot_value: u32) -> EncounterResult {
    if slot_value <= 69 {
        EncounterResult::Pokemon
    } else {
        let item = dust_cloud_item_content(slot_value);
        EncounterResult::Item(item)
    }
}

/// 砂煙のアイテム内容を判定
pub(crate) fn dust_cloud_item_content(slot_value: u32) -> ItemContent {
    match slot_value {
        70 => ItemContent::EvolutionStone,
        95..=99 => ItemContent::Everstone,
        _ => ItemContent::Jewel,
    }
}

/// 橋の影の結果を判定
pub(crate) fn pokemon_shadow_result(slot_value: u32) -> EncounterResult {
    if slot_value <= 29 {
        EncounterResult::Pokemon
    } else {
        EncounterResult::Item(ItemContent::Feather)
    }
}

/// `DustCloud` アイテム取得時の追加消費 (TBD: 仮実装)
pub(crate) fn dust_cloud_item_table_consume(lcg: &mut Lcg64, _item: ItemContent) {
    // アイテム種別決定: 1 回
    let _ = lcg.next();
    // テーブル決定: 1 回
    let _ = lcg.next();
}

/// `PokemonShadow` アイテム取得時の追加消費 (TBD: 仮実装)
pub(crate) fn pokemon_shadow_item_table_consume(lcg: &mut Lcg64) {
    // アイテム種別決定: 1 回
    let _ = lcg.next();
    // テーブル決定: 1 回
    let _ = lcg.next();
}

/// 釣り成功判定 (50%)
#[inline]
pub fn fishing_success(rand_value: u32) -> bool {
    ((u64::from(rand_value) * 2) >> 32) == 0
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
    fn test_dust_cloud_result_pokemon() {
        // 0-69: Pokemon
        assert_eq!(dust_cloud_result(0), EncounterResult::Pokemon);
        assert_eq!(dust_cloud_result(50), EncounterResult::Pokemon);
        assert_eq!(dust_cloud_result(69), EncounterResult::Pokemon);
    }

    #[test]
    fn test_dust_cloud_result_item() {
        // 70: EvolutionStone
        assert_eq!(
            dust_cloud_result(70),
            EncounterResult::Item(ItemContent::EvolutionStone)
        );
        // 71-94: Jewel
        assert_eq!(
            dust_cloud_result(71),
            EncounterResult::Item(ItemContent::Jewel)
        );
        assert_eq!(
            dust_cloud_result(94),
            EncounterResult::Item(ItemContent::Jewel)
        );
        // 95-99: Everstone
        assert_eq!(
            dust_cloud_result(95),
            EncounterResult::Item(ItemContent::Everstone)
        );
        assert_eq!(
            dust_cloud_result(99),
            EncounterResult::Item(ItemContent::Everstone)
        );
    }

    #[test]
    fn test_dust_cloud_item_content() {
        assert_eq!(dust_cloud_item_content(70), ItemContent::EvolutionStone);
        assert_eq!(dust_cloud_item_content(71), ItemContent::Jewel);
        assert_eq!(dust_cloud_item_content(94), ItemContent::Jewel);
        assert_eq!(dust_cloud_item_content(95), ItemContent::Everstone);
        assert_eq!(dust_cloud_item_content(99), ItemContent::Everstone);
    }

    #[test]
    fn test_pokemon_shadow_result_pokemon() {
        // 0-29: Pokemon
        assert_eq!(pokemon_shadow_result(0), EncounterResult::Pokemon);
        assert_eq!(pokemon_shadow_result(15), EncounterResult::Pokemon);
        assert_eq!(pokemon_shadow_result(29), EncounterResult::Pokemon);
    }

    #[test]
    fn test_pokemon_shadow_result_item() {
        // 30-99: Feather
        assert_eq!(
            pokemon_shadow_result(30),
            EncounterResult::Item(ItemContent::Feather)
        );
        assert_eq!(
            pokemon_shadow_result(99),
            EncounterResult::Item(ItemContent::Feather)
        );
    }
}
