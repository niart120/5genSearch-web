//! 固定シンボル・イベント・徘徊ポケモン生成

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    apply_shiny_lock, calculate_level, determine_held_item_slot, generate_event_pid,
    generate_wild_pid_with_reroll, nature_roll, perform_sync_check,
};
use crate::generation::flows::types::{EncounterSlotConfig, RawPokemonData};
use crate::types::{
    EncounterResult, EncounterType, GenerationConfig, HeldItemSlot, LeadAbilityEffect, Nature, Pid,
    PokemonGenerationParams, RomVersion, ShinyType,
};

/// 固定ポケモン生成 (IV なし)
pub fn generate_static_pokemon(
    lcg: &mut Lcg64,
    params: &PokemonGenerationParams,
    slot: &EncounterSlotConfig,
    config: &GenerationConfig,
) -> RawPokemonData {
    let enc_type = params.encounter_type;
    let is_compound_eyes = matches!(params.lead_ability, LeadAbilityEffect::CompoundEyes);

    // シンクロ判定 (StaticSymbol のみ)
    let sync_success = if enc_type == EncounterType::StaticSymbol && !is_compound_eyes {
        perform_sync_check(lcg, enc_type, params.lead_ability)
    } else {
        false
    };

    // PID 生成
    let (pid, shiny_type) = match enc_type {
        EncounterType::StaticSymbol | EncounterType::Roamer => {
            let reroll_count = if config.game_start.shiny_charm { 2 } else { 0 };
            let (pid, shiny) = generate_wild_pid_with_reroll(lcg, params.trainer, reroll_count);
            if slot.shiny_locked {
                (apply_shiny_lock(pid, params.trainer), ShinyType::None)
            } else {
                (pid, shiny)
            }
        }
        EncounterType::StaticStarter | EncounterType::StaticFossil | EncounterType::StaticEvent => {
            let pid = generate_event_pid(lcg.next().unwrap_or(0));
            let pid = if slot.shiny_locked {
                apply_shiny_lock(pid, params.trainer)
            } else {
                pid
            };
            let shiny = pid.shiny_type(params.trainer);
            (pid, shiny)
        }
        _ => {
            let r = lcg.next().unwrap_or(0);
            let pid = Pid(r);
            let shiny = pid.shiny_type(params.trainer);
            (pid, shiny)
        }
    };

    // 性格決定
    let (nature, sync_applied) = if sync_success {
        if let LeadAbilityEffect::Synchronize(n) = params.lead_ability {
            let _r = lcg.next(); // 消費
            (n, true)
        } else {
            (Nature::from_u8(nature_roll(lcg.next().unwrap_or(0))), false)
        }
    } else {
        (Nature::from_u8(nature_roll(lcg.next().unwrap_or(0))), false)
    };

    // 持ち物判定 (StaticSymbol で対象個体のみ)
    if enc_type == EncounterType::StaticSymbol && slot.has_held_item {
        lcg.next();
    }

    // BW のみ: 最後の消費
    if enc_type == EncounterType::StaticSymbol && config.version.is_bw() {
        lcg.next();
    }

    // === Resolve ===
    let ability_slot = pid.ability_slot();
    let gender = pid.gender(slot.gender_ratio);

    RawPokemonData {
        pid,
        species_id: slot.species_id,
        level: slot.level_min,
        nature,
        sync_applied,
        ability_slot,
        gender,
        shiny_type,
        held_item_slot: HeldItemSlot::None,
        encounter_result: EncounterResult::Pokemon,
    }
}

/// 隠し穴ポケモン生成 (BW2 限定)
///
/// # 乱数消費順序
/// 1. レベル決定 (Range, 先頭)
/// 2. シンクロ判定
/// 3. 性格値生成 (色違い無効、ID補正なし)
/// 4. 性別値決定
/// 5. 性格決定
/// 6. 持ち物判定
///
/// 特徴: 色違い無効、ID 補正なし
pub fn generate_hidden_grotto_pokemon(
    lcg: &mut Lcg64,
    params: &PokemonGenerationParams,
    slot: &EncounterSlotConfig,
) -> RawPokemonData {
    // 1. レベル決定 (Range, 先頭)
    let level_rand = lcg.next().unwrap_or(0);
    let level = calculate_level(
        RomVersion::Black2, // HiddenGrotto は BW2 限定
        level_rand,
        slot.level_min,
        slot.level_max,
    );

    // 2. シンクロ判定
    let sync_success = perform_sync_check(lcg, EncounterType::HiddenGrotto, params.lead_ability);

    // 3. 性格値生成 (色違い無効、ID補正なし)
    // 通常の PID 生成と同じだが、色違い判定は無効
    let pid = Pid(lcg.next().unwrap_or(0));

    // 4. 性別値決定 (別途消費)
    let gender_rand = lcg.next().unwrap_or(0);

    // 5. 性格決定
    let nature = if sync_success {
        if let LeadAbilityEffect::Synchronize(n) = params.lead_ability {
            let _r = lcg.next(); // 消費
            n
        } else {
            Nature::from_u8(nature_roll(lcg.next().unwrap_or(0)))
        }
    } else {
        Nature::from_u8(nature_roll(lcg.next().unwrap_or(0)))
    };

    // 6. 持ち物判定
    let held_item_slot = if slot.has_held_item {
        let item_rand = lcg.next().unwrap_or(0);
        determine_held_item_slot(RomVersion::Black2, item_rand, params.lead_ability, false)
    } else {
        HeldItemSlot::None
    };

    // === Resolve (乱数消費なし) ===
    // 性別は別途消費した gender_rand から決定
    let gender = slot.gender_ratio.determine_gender_from_rand(gender_rand);
    let ability_slot = pid.ability_slot();

    RawPokemonData {
        pid,
        species_id: slot.species_id,
        level,
        nature,
        sync_applied: sync_success,
        ability_slot,
        gender,
        shiny_type: ShinyType::None, // 色違い無効
        held_item_slot,
        encounter_result: EncounterResult::Pokemon,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{EncounterMethod, GenderRatio, TrainerInfo, GameStartConfig, GenerationConfig, RomVersion, SaveState, StartMode};

    fn make_params(encounter_type: EncounterType) -> PokemonGenerationParams {
        PokemonGenerationParams {
            trainer: TrainerInfo {
                tid: 12345,
                sid: 54321,
            },
            encounter_type,
            encounter_method: EncounterMethod::Stationary,
            lead_ability: LeadAbilityEffect::None,

            slots: vec![],
        }
    }

    fn make_config(version: RomVersion) -> GenerationConfig {
        GenerationConfig {
            version,
            game_start: GameStartConfig {
                start_mode: StartMode::Continue,
                save_state: SaveState::WithSave,
                shiny_charm: false,
            },
            user_offset: 0,
            max_advance: 1000,
        }
    }

    fn make_slot(
        species_id: u16,
        level: u8,
        gender_ratio: GenderRatio,
        shiny_locked: bool,
        has_held_item: bool,
    ) -> EncounterSlotConfig {
        EncounterSlotConfig {
            species_id,
            level_min: level,
            level_max: level,
            gender_ratio,
            shiny_locked,
            has_held_item,
        }
    }

    #[test]
    fn test_generate_static_pokemon_symbol() {
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let params = make_params(EncounterType::StaticSymbol);
        let slot = make_slot(150, 70, GenderRatio::Genderless, false, false);

        let pokemon = generate_static_pokemon(&mut lcg, &params, &slot, &make_config(RomVersion::Black));

        assert_eq!(pokemon.species_id, 150);
        assert_eq!(pokemon.level, 70);
        assert_eq!(pokemon.gender, crate::types::Gender::Genderless);
    }

    #[test]
    fn test_generate_static_pokemon_starter() {
        let mut lcg = Lcg64::from_raw(0xABCD_EF01_2345_6789);
        let params = make_params(EncounterType::StaticStarter);
        let slot = make_slot(495, 5, GenderRatio::F1M7, true, false);

        let pokemon = generate_static_pokemon(&mut lcg, &params, &slot, &make_config(RomVersion::Black));

        assert_eq!(pokemon.species_id, 495);
        assert_eq!(pokemon.level, 5);
        // shiny_locked = true なので None
        assert_eq!(pokemon.shiny_type, ShinyType::None);
    }

    fn make_slot_with_range(
        species_id: u16,
        level_min: u8,
        level_max: u8,
        gender_ratio: GenderRatio,
    ) -> EncounterSlotConfig {
        EncounterSlotConfig {
            species_id,
            level_min,
            level_max,
            gender_ratio,
            shiny_locked: false,
            has_held_item: false,
        }
    }

    #[test]
    fn test_generate_hidden_grotto_pokemon() {
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let params = make_params(EncounterType::HiddenGrotto);
        let slot = make_slot_with_range(591, 55, 60, GenderRatio::F1M1); // エモンガ

        let pokemon = generate_hidden_grotto_pokemon(&mut lcg, &params, &slot);

        assert_eq!(pokemon.species_id, 591);
        // レベルは 55-60 の範囲内
        assert!(pokemon.level >= 55 && pokemon.level <= 60);
        // 色違い無効
        assert_eq!(pokemon.shiny_type, ShinyType::None);
    }

    #[test]
    fn test_hidden_grotto_shiny_lock() {
        // どんな seed でも色違いにならない
        let mut lcg = Lcg64::from_raw(0);
        let params = make_params(EncounterType::HiddenGrotto);
        let slot = make_slot(591, 55, GenderRatio::F1M1, false, false);

        for _ in 0..100 {
            let pokemon = generate_hidden_grotto_pokemon(&mut lcg, &params, &slot);
            assert_eq!(pokemon.shiny_type, ShinyType::None);
        }
    }

    #[test]
    fn test_hidden_grotto_consumption() {
        // 消費数: level(1) + sync(1) + pid(1) + gender(1) + nature(1) = 5 (持ち物なし)
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let initial_seed = lcg.current_seed();
        let params = make_params(EncounterType::HiddenGrotto);
        let slot = make_slot(591, 55, GenderRatio::F1M1, false, false);

        let _ = generate_hidden_grotto_pokemon(&mut lcg, &params, &slot);

        let mut expected_lcg = Lcg64::new(initial_seed);
        expected_lcg.advance(5);
        assert_eq!(lcg.current_seed(), expected_lcg.current_seed());
    }

    #[test]
    fn test_hidden_grotto_consumption_with_item() {
        // 消費数: level(1) + sync(1) + pid(1) + gender(1) + nature(1) + item(1) = 6
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let initial_seed = lcg.current_seed();
        let params = make_params(EncounterType::HiddenGrotto);
        let slot = make_slot(591, 55, GenderRatio::F1M1, false, true);

        let _ = generate_hidden_grotto_pokemon(&mut lcg, &params, &slot);

        let mut expected_lcg = Lcg64::new(initial_seed);
        expected_lcg.advance(6);
        assert_eq!(lcg.current_seed(), expected_lcg.current_seed());
    }
}



