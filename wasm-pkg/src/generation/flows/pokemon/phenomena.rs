//! 特殊現象野生ポケモン生成
//!
//! 対象: `DustCloud` (砂煙), `PokemonShadow` (橋の影)

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    calculate_encounter_slot, determine_held_item_slot, determine_nature,
    dust_cloud_item_table_consume, dust_cloud_result, generate_wild_pid_with_reroll,
    perform_sync_check, pokemon_shadow_item_table_consume, pokemon_shadow_result, rand_to_percent,
};
use crate::generation::flows::types::{GenerationError, RawPokemonData};
use crate::types::{
    EncounterResult, EncounterType, Gender, HeldItemSlot, LeadAbilityEffect,
    PokemonGenerationParams, RomVersion,
};

/// 特殊現象野生ポケモン生成
///
/// 対象: `DustCloud`, `PokemonShadow`
///
/// # 乱数消費順序
/// 0. エンカウント判定 (Pokemon vs Item)
/// 1. シンクロ判定
/// 2. スロット決定
/// 3. レベル消費 (値未使用)
/// 4. PID 生成
/// 5. 性格決定
/// 6. 持ち物判定
/// 7. BW 末尾消費
#[allow(clippy::unnecessary_wraps)]
pub fn generate_phenomena_pokemon(
    lcg: &mut Lcg64,
    params: &PokemonGenerationParams,
    version: RomVersion,
) -> Result<RawPokemonData, GenerationError> {
    let enc_type = params.encounter_type;
    let is_compound_eyes = matches!(params.lead_ability, LeadAbilityEffect::CompoundEyes);

    // 0. エンカウント判定 (Pokemon vs Item)
    let encounter_result = match enc_type {
        EncounterType::DustCloud => {
            let rand = lcg.next().unwrap_or(0);
            let slot_value = rand_to_percent(version, rand);
            let result = dust_cloud_result(slot_value);
            if let EncounterResult::Item(item) = result {
                dust_cloud_item_table_consume(lcg, item);
                return Ok(RawPokemonData::item_only(result));
            }
            result
        }
        EncounterType::PokemonShadow => {
            let rand = lcg.next().unwrap_or(0);
            let slot_value = rand_to_percent(version, rand);
            let result = pokemon_shadow_result(slot_value);
            if let EncounterResult::Item(_) = result {
                pokemon_shadow_item_table_consume(lcg);
                return Ok(RawPokemonData::item_only(result));
            }
            result
        }
        _ => EncounterResult::Pokemon,
    };

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

    // 3. レベル消費 (値未使用、テーブル定義の level_min を使用)
    let _level_rand = lcg.next();

    // 4. PID 生成
    let reroll_count = if params.shiny_charm { 2 } else { 0 };
    let (pid, shiny_type) =
        generate_wild_pid_with_reroll(lcg, params.trainer.tid, params.trainer.sid, reroll_count);

    // 5. 性格決定
    let (nature, sync_applied) = determine_nature(lcg, sync_success, &params.lead_ability);

    // 6. 持ち物判定
    let held_item_slot = if slot_config.has_held_item {
        let item_rand = lcg.next().unwrap_or(0);
        determine_held_item_slot(version, item_rand, &params.lead_ability, false)
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

    Ok(RawPokemonData {
        pid,
        species_id: slot_config.species_id,
        level: slot_config.level_min,
        nature,
        sync_applied,
        ability_slot,
        gender,
        shiny_type,
        held_item_slot,
        encounter_result,
    })
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
    use crate::types::{EncounterMethod, EncounterSlotConfig, ItemContent, TrainerInfo};

    fn make_slots() -> Vec<EncounterSlotConfig> {
        vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
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
    fn test_dust_cloud_pokemon_flow() {
        // slot_value が 0-69 で Pokemon になる seed を使用
        let mut lcg = Lcg64::from_raw(0x0000_0000_0000_0001);
        let params = make_params(EncounterType::DustCloud);

        let result = generate_phenomena_pokemon(&mut lcg, &params, RomVersion::Black2);
        assert!(result.is_ok());

        let pokemon = result.unwrap();
        assert_eq!(pokemon.encounter_result, EncounterResult::Pokemon);
        assert_eq!(pokemon.species_id, 1);
    }

    #[test]
    fn test_dust_cloud_item_flow() {
        // slot_value が 70 以上で Item になる seed を使用
        let mut lcg = Lcg64::from_raw(0xFFFF_FFFF_0000_0001);
        let initial_seed = lcg.current_seed();
        let params = make_params(EncounterType::DustCloud);

        let result = generate_phenomena_pokemon(&mut lcg, &params, RomVersion::Black2);
        assert!(result.is_ok());

        let pokemon = result.unwrap();
        assert!(matches!(pokemon.encounter_result, EncounterResult::Item(_)));
        assert_eq!(pokemon.species_id, 0);
        assert_eq!(pokemon.level, 0);

        // 消費数確認: エンカウント判定(1) + アイテム消費(2) = 3
        let mut expected_lcg = Lcg64::new(initial_seed);
        expected_lcg.advance(3);
        assert_eq!(lcg.current_seed(), expected_lcg.current_seed());
    }

    #[test]
    fn test_pokemon_shadow_item_flow() {
        // slot_value が 30 以上で Item(Feather) になる seed を使用
        let mut lcg = Lcg64::from_raw(0xFFFF_FFFF_0000_0001);
        let initial_seed = lcg.current_seed();
        let params = make_params(EncounterType::PokemonShadow);

        let result = generate_phenomena_pokemon(&mut lcg, &params, RomVersion::Black2);
        assert!(result.is_ok());

        let pokemon = result.unwrap();
        assert_eq!(
            pokemon.encounter_result,
            EncounterResult::Item(ItemContent::Feather)
        );
        assert_eq!(pokemon.species_id, 0);
        assert_eq!(pokemon.level, 0);

        // 消費数確認: エンカウント判定(1) + アイテム消費(2) = 3
        let mut expected_lcg = Lcg64::new(initial_seed);
        expected_lcg.advance(3);
        assert_eq!(lcg.current_seed(), expected_lcg.current_seed());
    }
}
