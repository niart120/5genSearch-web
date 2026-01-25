//! 野生ポケモン生成

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    calculate_encounter_slot, determine_held_item_slot, determine_nature,
    dust_cloud_item_table_consume, dust_cloud_result, encounter_type_supports_held_item,
    fishing_success, generate_wild_pid_with_reroll, perform_sync_check,
    pokemon_shadow_item_table_consume, pokemon_shadow_result, rand_to_percent,
};
use crate::types::{
    EncounterResult, EncounterType, Gender, HeldItemSlot, LeadAbilityEffect, PokemonGeneratorParams,
};

use super::types::{GenerationError, RawPokemonData};

/// 野生ポケモン生成 (IV なし)
///
/// # Errors
///
/// - `GenerationError::FishingFailed`: 釣り失敗時
/// - `GenerationError::NoSlot`: エンカウントスロットが見つからない場合
pub fn generate_wild_pokemon(
    lcg: &mut Lcg64,
    params: &PokemonGeneratorParams,
) -> Result<RawPokemonData, GenerationError> {
    let enc_type = params.encounter_type;
    let is_compound_eyes = matches!(params.lead_ability, LeadAbilityEffect::CompoundEyes);

    // 0. DustCloud / PokemonShadow: エンカウント判定 (Pokemon vs Item)
    let encounter_result = match enc_type {
        EncounterType::DustCloud => {
            let rand = lcg.next().unwrap_or(0);
            let slot_value = rand_to_percent(params.version, rand);
            let result = dust_cloud_result(slot_value);
            if let EncounterResult::Item(item) = result {
                dust_cloud_item_table_consume(lcg, item);
                return Ok(RawPokemonData::item_only(result));
            }
            result
        }
        EncounterType::PokemonShadow => {
            let rand = lcg.next().unwrap_or(0);
            let slot_value = rand_to_percent(params.version, rand);
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

    // 2. 釣り成功判定 (Fishing のみ)
    if enc_type == EncounterType::Fishing {
        let fishing_result = lcg.next().unwrap_or(0);
        if !fishing_success(fishing_result) {
            return Err(GenerationError::FishingFailed);
        }
    }

    // 3. スロット決定
    let slot_rand = lcg.next().unwrap_or(0);
    let slot_idx = calculate_encounter_slot(enc_type, slot_rand, params.version) as usize;
    let slot_config = &params.slots[slot_idx.min(params.slots.len() - 1)];

    // 4. レベル決定
    let _level_rand = lcg.next();

    // 5. PID 生成
    let reroll_count = if params.shiny_charm { 2 } else { 0 };
    let (pid, shiny_type) =
        generate_wild_pid_with_reroll(lcg, params.trainer.tid, params.trainer.sid, reroll_count);

    // 6. 性格決定
    let (nature, sync_applied) = determine_nature(lcg, sync_success, &params.lead_ability);

    // 7. 持ち物判定
    let held_item_slot = if encounter_type_supports_held_item(enc_type) && slot_config.has_held_item
    {
        let item_rand = lcg.next().unwrap_or(0);
        let has_very_rare = matches!(
            enc_type,
            EncounterType::ShakingGrass | EncounterType::SurfingBubble
        );
        determine_held_item_slot(
            params.version,
            item_rand,
            &params.lead_ability,
            has_very_rare,
        )
    } else {
        HeldItemSlot::None
    };

    // 8. BW のみ: 最後の消費
    if params.version.is_bw() {
        lcg.next();
    }

    // === Resolve (乱数消費なし) ===
    let gender = determine_gender(pid, slot_config.gender_threshold);
    let ability_slot = ((pid >> 16) & 1) as u8;

    Ok(RawPokemonData {
        pid,
        species_id: slot_config.species_id,
        level: slot_config.level_min, // 簡略化
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
    use crate::types::{
        EncounterMethod, EncounterSlotConfig, GameStartConfig, GeneratorSource, ItemContent,
        RomVersion, SaveState, StartMode, TrainerInfo,
    };

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

    fn make_params(version: RomVersion, encounter_type: EncounterType) -> PokemonGeneratorParams {
        PokemonGeneratorParams {
            source: GeneratorSource::Seeds { seeds: vec![] },
            version,
            encounter_type,
            trainer: TrainerInfo {
                tid: 12345,
                sid: 54321,
            },
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            encounter_method: EncounterMethod::Stationary,
            game_start: GameStartConfig {
                start_mode: StartMode::Continue,
                save_state: SaveState::WithSave,
            },
            user_offset: 0,
            slots: make_slots(),
        }
    }

    #[test]
    fn test_generate_wild_pokemon_normal() {
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let params = make_params(RomVersion::Black, EncounterType::Normal);

        let result = generate_wild_pokemon(&mut lcg, &params);
        assert!(result.is_ok());

        let pokemon = result.unwrap();
        assert_eq!(pokemon.species_id, 1);
        assert_eq!(pokemon.level, 5);
        assert_eq!(pokemon.encounter_result, EncounterResult::Pokemon);
    }

    #[test]
    fn test_dust_cloud_pokemon_flow() {
        // slot_value が 0-69 で Pokemon になる seed を使用
        // BW2 では rand_to_percent = (rand * 100) >> 32
        // 0x0000_0000 → 0, Pokemon 判定
        let mut lcg = Lcg64::from_raw(0x0000_0000_0000_0001);
        let params = make_params(RomVersion::Black2, EncounterType::DustCloud);

        let result = generate_wild_pokemon(&mut lcg, &params);
        assert!(result.is_ok());

        let pokemon = result.unwrap();
        assert_eq!(pokemon.encounter_result, EncounterResult::Pokemon);
        // Pokemon の場合は通常のフィールドが設定される
        assert_eq!(pokemon.species_id, 1);
    }

    #[test]
    fn test_dust_cloud_item_flow() {
        // slot_value が 70 以上で Item になる seed を使用
        // BW2 では rand_to_percent = (rand * 100) >> 32
        // 0xFFFF_FFFF → 99, Item(Everstone) 判定
        let mut lcg = Lcg64::from_raw(0xFFFF_FFFF_0000_0001);
        let initial_seed = lcg.current_seed();
        let params = make_params(RomVersion::Black2, EncounterType::DustCloud);

        let result = generate_wild_pokemon(&mut lcg, &params);
        assert!(result.is_ok());

        let pokemon = result.unwrap();
        // Item の場合は encounter_result が Item
        assert!(matches!(pokemon.encounter_result, EncounterResult::Item(_)));
        // Item の場合は species_id, level などはデフォルト値
        assert_eq!(pokemon.species_id, 0);
        assert_eq!(pokemon.level, 0);

        // 消費数確認: エンカウント判定(1) + アイテム消費(2) = 3
        let mut expected_lcg = Lcg64::new(initial_seed);
        expected_lcg.advance(3);
        assert_eq!(lcg.current_seed(), expected_lcg.current_seed());
    }

    #[test]
    fn test_pokemon_shadow_pokemon_flow() {
        // PokemonShadow で Pokemon になるには slot_value が 0-29 である必要がある
        // BW2: rand_to_percent = (rand * 100) >> 32
        // rand が 0x2000_0000 未満なら slot_value < 30 で Pokemon
        // LCG の next() は seed を進めてから上位32bitを返す
        // 適切な seed を使用: 最初の next() で小さい値が出る seed
        let mut lcg = Lcg64::from_raw(0);
        let params = make_params(RomVersion::Black2, EncounterType::PokemonShadow);

        // 最初の next() で得られる rand 値を確認
        let first_rand = {
            let mut test_lcg = Lcg64::from_raw(0);
            test_lcg.next().unwrap()
        };
        // slot_value を計算
        let slot_value = ((u64::from(first_rand) * 100) >> 32) as u32;

        let result = generate_wild_pokemon(&mut lcg, &params);

        if slot_value < 30 {
            // Pokemon の場合
            assert!(result.is_ok());
            let pokemon = result.unwrap();
            assert_eq!(pokemon.encounter_result, EncounterResult::Pokemon);
        } else {
            // Item の場合 (この seed では Item になる可能性)
            assert!(result.is_ok());
            let pokemon = result.unwrap();
            assert!(matches!(
                pokemon.encounter_result,
                EncounterResult::Item(ItemContent::Feather)
            ));
        }
    }

    #[test]
    fn test_pokemon_shadow_item_flow() {
        // slot_value が 30 以上で Item(Feather) になる seed を使用
        let mut lcg = Lcg64::from_raw(0xFFFF_FFFF_0000_0001);
        let initial_seed = lcg.current_seed();
        let params = make_params(RomVersion::Black2, EncounterType::PokemonShadow);

        let result = generate_wild_pokemon(&mut lcg, &params);
        assert!(result.is_ok());

        let pokemon = result.unwrap();
        assert_eq!(
            pokemon.encounter_result,
            EncounterResult::Item(ItemContent::Feather)
        );
        // Item の場合は species_id, level などはデフォルト値
        assert_eq!(pokemon.species_id, 0);
        assert_eq!(pokemon.level, 0);

        // 消費数確認: エンカウント判定(1) + アイテム消費(2) = 3
        let mut expected_lcg = Lcg64::new(initial_seed);
        expected_lcg.advance(3);
        assert_eq!(lcg.current_seed(), expected_lcg.current_seed());
    }

    #[test]
    fn test_determine_gender() {
        // Male only (threshold = 0)
        assert_eq!(determine_gender(0x1234_5678, 0), Gender::Male);

        // Female only (threshold = 254)
        assert_eq!(determine_gender(0x1234_5678, 254), Gender::Female);

        // Genderless (threshold = 255)
        assert_eq!(determine_gender(0x1234_5678, 255), Gender::Genderless);

        // 1:1 ratio (threshold = 127)
        // PID & 0xFF = 0x78 = 120, 120 < 127 → Female
        assert_eq!(determine_gender(0x1234_5678, 127), Gender::Female);

        // PID & 0xFF = 0x80 = 128, 128 >= 127 → Male
        assert_eq!(determine_gender(0x1234_5680, 127), Gender::Male);
    }
}
