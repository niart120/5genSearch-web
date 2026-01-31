//! 通常野生ポケモン生成
//!
//! 対象: `Normal`, `ShakingGrass`

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    calculate_encounter_slot, determine_held_item_slot, determine_nature,
    encounter_type_supports_held_item, generate_wild_pid_with_reroll, perform_sync_check,
};
use crate::generation::flows::types::RawPokemonData;
use crate::types::{
    EncounterResult, EncounterType, HeldItemSlot, LeadAbilityEffect, PokemonGenerationParams,
    RomVersion,
};

/// 通常野生ポケモン生成
///
/// 対象: `Normal`, `ShakingGrass`
///
/// # 乱数消費順序
/// 1. シンクロ判定
/// 2. スロット決定
/// 3. レベル消費 (値未使用)
/// 4. PID 生成
/// 5. 性格決定
/// 6. 持ち物判定 (`ShakingGrass` のみ)
/// 7. BW 末尾消費
pub fn generate_normal_pokemon(
    lcg: &mut Lcg64,
    params: &PokemonGenerationParams,
    version: RomVersion,
) -> RawPokemonData {
    let enc_type = params.encounter_type;
    let is_compound_eyes = matches!(params.lead_ability, LeadAbilityEffect::CompoundEyes);

    // 1. シンクロ判定 (ふくがん先頭時はスキップ)
    let sync_success = if is_compound_eyes {
        false
    } else {
        perform_sync_check(lcg, enc_type, params.lead_ability)
    };

    // 2. スロット決定
    let slot_rand = lcg.next().unwrap_or(0);
    let slot_idx = calculate_encounter_slot(enc_type, slot_rand, version) as usize;
    let slot_config = &params.slots[slot_idx.min(params.slots.len() - 1)];

    // 3. レベル消費 (値未使用、テーブル定義の level_min を使用)
    let _level_rand = lcg.next();

    // 4. PID 生成
    let reroll_count = if params.shiny_charm { 2 } else { 0 };
    let (pid, shiny_type) = generate_wild_pid_with_reroll(lcg, params.trainer, reroll_count);

    // 5. 性格決定
    let (nature, sync_applied) = determine_nature(lcg, sync_success, params.lead_ability);

    // 6. 持ち物判定 (ShakingGrass のみ)
    let held_item_slot = if encounter_type_supports_held_item(enc_type) && slot_config.has_held_item
    {
        let item_rand = lcg.next().unwrap_or(0);
        let has_very_rare = enc_type == EncounterType::ShakingGrass;
        determine_held_item_slot(version, item_rand, params.lead_ability, has_very_rare)
    } else {
        HeldItemSlot::None
    };

    // 7. BW のみ: 最後の消費
    if version.is_bw() {
        lcg.next();
    }

    // === Resolve (乱数消費なし) ===
    let gender = pid.gender(slot_config.gender_ratio);
    let ability_slot = pid.ability_slot();

    RawPokemonData {
        pid,
        species_id: slot_config.species_id,
        level: slot_config.level_min,
        nature,
        sync_applied,
        ability_slot,
        gender,
        shiny_type,
        held_item_slot,
        encounter_result: EncounterResult::Pokemon,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{EncounterMethod, EncounterSlotConfig, GenderRatio, TrainerInfo};

    fn make_slots() -> Vec<EncounterSlotConfig> {
        vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
            gender_ratio: GenderRatio::F1M1,
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
    fn test_generate_normal_pokemon() {
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let params = make_params(EncounterType::Normal);

        let pokemon = generate_normal_pokemon(&mut lcg, &params, RomVersion::Black);
        assert_eq!(pokemon.species_id, 1);
        assert_eq!(pokemon.level, 5);
        assert_eq!(pokemon.encounter_result, EncounterResult::Pokemon);
    }

    #[test]
    fn test_generate_shaking_grass_pokemon() {
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let params = make_params(EncounterType::ShakingGrass);

        let _pokemon = generate_normal_pokemon(&mut lcg, &params, RomVersion::Black);
    }

    #[test]
    fn test_normal_consumption_bw() {
        // BW: sync(1) + slot(1) + level(1) + pid(1) + nature(1) + bw_tail(1) = 6
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let initial_seed = lcg.current_seed();
        let params = make_params(EncounterType::Normal);

        let _ = generate_normal_pokemon(&mut lcg, &params, RomVersion::Black);

        let mut expected_lcg = Lcg64::new(initial_seed);
        expected_lcg.advance(6);
        assert_eq!(lcg.current_seed(), expected_lcg.current_seed());
    }

    #[test]
    fn test_normal_consumption_bw2() {
        // BW2: sync(1) + slot(1) + level(1) + pid(1) + nature(1) = 5
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let initial_seed = lcg.current_seed();
        let params = make_params(EncounterType::Normal);

        let _ = generate_normal_pokemon(&mut lcg, &params, RomVersion::Black2);

        let mut expected_lcg = Lcg64::new(initial_seed);
        expected_lcg.advance(5);
        assert_eq!(lcg.current_seed(), expected_lcg.current_seed());
    }

    #[test]
    fn test_determine_gender() {
        use crate::types::{Gender, Pid};

        // Male only
        assert_eq!(Pid(0x1234_5678).gender(GenderRatio::MaleOnly), Gender::Male);
        // Female only
        assert_eq!(
            Pid(0x1234_5678).gender(GenderRatio::FemaleOnly),
            Gender::Female
        );
        // Genderless
        assert_eq!(
            Pid(0x1234_5678).gender(GenderRatio::Genderless),
            Gender::Genderless
        );
        // 1:1 ratio: PID & 0xFF = 0x78 = 120 < 127 → Female
        assert_eq!(Pid(0x1234_5678).gender(GenderRatio::F1M1), Gender::Female);
        // PID & 0xFF = 0x80 = 128 >= 127 → Male
        assert_eq!(Pid(0x1234_5680).gender(GenderRatio::F1M1), Gender::Male);
    }
}
