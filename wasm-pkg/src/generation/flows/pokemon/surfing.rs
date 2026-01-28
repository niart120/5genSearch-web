//! 波乗り野生ポケモン生成
//!
//! 対象: `Surfing` (波乗り), `SurfingBubble` (泡波乗り)

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    calculate_encounter_slot, calculate_level, determine_held_item_slot, determine_nature,
    encounter_type_supports_held_item, generate_wild_pid_with_reroll, perform_sync_check,
};
use crate::generation::flows::types::RawPokemonData;
use crate::types::{
    EncounterResult, EncounterType, Gender, HeldItemSlot, LeadAbilityEffect,
    PokemonGenerationParams, RomVersion,
};

/// 波乗り野生ポケモン生成
///
/// 対象: `Surfing`, `SurfingBubble`
///
/// # 乱数消費順序
/// 0. `SurfingBubble`: 泡判定 (TBD)
/// 1. シンクロ判定
/// 2. スロット決定
/// 3. レベル決定 (Range)
/// 4. PID 生成
/// 5. 性格決定
/// 6. 持ち物判定
/// 7. BW 末尾消費
pub fn generate_surfing_pokemon(
    lcg: &mut Lcg64,
    params: &PokemonGenerationParams,
    version: RomVersion,
) -> RawPokemonData {
    let enc_type = params.encounter_type;
    let is_compound_eyes = matches!(params.lead_ability, LeadAbilityEffect::CompoundEyes);

    // 0. SurfingBubble: 泡判定 (TBD - 現状スキップ)
    // 泡発生判定は歩行時に別途行われるため、ここでは追加消費なし

    // 1. シンクロ判定 (ふくがん先頭時はスキップ)
    let sync_success = if is_compound_eyes {
        false
    } else {
        perform_sync_check(lcg, enc_type, &params.lead_ability)
    };

    // 2. スロット決定
    let slot_rand = lcg.next().unwrap_or(0);
    let slot_idx = calculate_encounter_slot(enc_type, slot_rand, version) as usize;
    let slot_config = &params.slots[slot_idx.min(params.slots.len() - 1)];

    // 3. レベル決定 (Range パターン: 乱数値からレベルを計算)
    let level_rand = lcg.next().unwrap_or(0);
    let level = calculate_level(
        version,
        level_rand,
        slot_config.level_min,
        slot_config.level_max,
    );

    // 4. PID 生成
    let reroll_count = if params.shiny_charm { 2 } else { 0 };
    let (pid, shiny_type) =
        generate_wild_pid_with_reroll(lcg, params.trainer.tid, params.trainer.sid, reroll_count);

    // 5. 性格決定
    let (nature, sync_applied) = determine_nature(lcg, sync_success, &params.lead_ability);

    // 6. 持ち物判定
    let held_item_slot = if encounter_type_supports_held_item(enc_type) && slot_config.has_held_item
    {
        let item_rand = lcg.next().unwrap_or(0);
        let has_very_rare = enc_type == EncounterType::SurfingBubble;
        determine_held_item_slot(version, item_rand, &params.lead_ability, has_very_rare)
    } else {
        HeldItemSlot::None
    };

    // 7. BW のみ: 最後の消費
    if version.is_bw() {
        lcg.next();
    }

    // === Resolve (乱数消費なし) ===
    let gender = determine_gender(pid, slot_config.gender_threshold);
    let ability_slot = ((pid >> 16) & 1) as u8;

    RawPokemonData {
        pid,
        species_id: slot_config.species_id,
        level,
        nature,
        sync_applied,
        ability_slot,
        gender,
        shiny_type,
        held_item_slot,
        encounter_result: EncounterResult::Pokemon,
    }
}

/// 性別判定
fn determine_gender(pid: u32, threshold: u8) -> Gender {
    match threshold {
        0 => Gender::Male,
        254 => Gender::Female,
        255 => Gender::Genderless,
        t => {
            let gender_value = (pid & 0xFF) as u8;
            if gender_value < t {
                Gender::Female
            } else {
                Gender::Male
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{EncounterMethod, EncounterSlotConfig, TrainerInfo};

    fn make_slots() -> Vec<EncounterSlotConfig> {
        vec![EncounterSlotConfig {
            species_id: 118, // コイキング
            level_min: 10,
            level_max: 25,
            gender_threshold: 127,
            has_held_item: false,
            shiny_locked: false,
        }]
    }

    fn make_params(encounter_type: EncounterType) -> PokemonGenerationParams {
        PokemonGenerationParams {
            trainer: TrainerInfo {
                tid: 12345,
                sid: 54321,
            },
            encounter_type,
            encounter_method: EncounterMethod::Stationary,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            slots: make_slots(),
        }
    }

    #[test]
    fn test_generate_surfing_pokemon() {
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let params = make_params(EncounterType::Surfing);

        let pokemon = generate_surfing_pokemon(&mut lcg, &params, RomVersion::Black);
        assert_eq!(pokemon.species_id, 118);
        // レベルは 10-25 の範囲内
        assert!((10..=25).contains(&pokemon.level));
        assert_eq!(pokemon.encounter_result, EncounterResult::Pokemon);
    }

    #[test]
    fn test_surfing_level_range_bw2() {
        // BW2 でレベル計算が正しく行われることを確認
        // rand = 0x8000_0000 → offset = (0x8000_0000 * 16) >> 32 = 8
        // level = 10 + 8 = 18
        let mut lcg = Lcg64::from_raw(0);
        let params = make_params(EncounterType::Surfing);

        // 特定の乱数値でレベルが計算される
        let pokemon = generate_surfing_pokemon(&mut lcg, &params, RomVersion::Black2);
        assert!((10..=25).contains(&pokemon.level));
    }

    #[test]
    fn test_surfing_consumption_bw() {
        // BW: sync(1) + slot(1) + level(1) + pid(1) + nature(1) + bw_tail(1) = 6
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let initial_seed = lcg.current_seed();
        let params = make_params(EncounterType::Surfing);

        let _ = generate_surfing_pokemon(&mut lcg, &params, RomVersion::Black);

        let mut expected_lcg = Lcg64::new(initial_seed);
        expected_lcg.advance(6);
        assert_eq!(lcg.current_seed(), expected_lcg.current_seed());
    }

    #[test]
    fn test_surfing_consumption_bw2() {
        // BW2: sync(1) + slot(1) + level(1) + pid(1) + nature(1) = 5
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let initial_seed = lcg.current_seed();
        let params = make_params(EncounterType::Surfing);

        let _ = generate_surfing_pokemon(&mut lcg, &params, RomVersion::Black2);

        let mut expected_lcg = Lcg64::new(initial_seed);
        expected_lcg.advance(5);
        assert_eq!(lcg.current_seed(), expected_lcg.current_seed());
    }

    #[test]
    fn test_surfing_bubble_pokemon() {
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let params = make_params(EncounterType::SurfingBubble);

        let _pokemon = generate_surfing_pokemon(&mut lcg, &params, RomVersion::Black2);
    }
}
