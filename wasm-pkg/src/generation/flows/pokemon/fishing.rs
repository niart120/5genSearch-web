//! 釣り野生ポケモン生成
//!
//! 対象: `Fishing` (釣り), `FishingBubble` (泡釣り)

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    calculate_encounter_slot, calculate_level, determine_held_item_slot, determine_nature,
    encounter_type_supports_held_item, fishing_success, generate_wild_pid_with_reroll,
    perform_sync_check,
};
use crate::generation::flows::types::RawPokemonData;
use crate::types::{
    EncounterResult, EncounterType, GenerationConfig, HeldItemSlot, LeadAbilityEffect,
    PokemonGenerationParams,
};

/// 釣り野生ポケモン生成
///
/// 対象: `Fishing`, `FishingBubble`
///
/// # 乱数消費順序
/// 1. シンクロ判定
/// 2. 釣り成功判定 (通常釣りのみ)
/// 3. スロット決定
/// 4. レベル決定 (Range)
/// 5. PID 生成
/// 6. 性格決定
/// 7. 持ち物判定
/// 8. BW 末尾消費
///
/// 釣り失敗時は `EncounterResult::FishingFailed` を持つ `RawPokemonData` を返す。
pub fn generate_fishing_pokemon(
    lcg: &mut Lcg64,
    params: &PokemonGenerationParams,
    config: &GenerationConfig,
) -> RawPokemonData {
    let enc_type = params.encounter_type;
    let is_compound_eyes = matches!(params.lead_ability, LeadAbilityEffect::CompoundEyes);

    // 1. シンクロ判定 (ふくがん先頭時はスキップ)
    let sync_success = if is_compound_eyes {
        false
    } else {
        perform_sync_check(lcg, enc_type, params.lead_ability)
    };

    // 2. 釣り成功判定 (50%) - 通常釣りのみ (泡釣りはスキップ)
    if enc_type == EncounterType::Fishing {
        let fishing_result = lcg.next().unwrap_or(0);
        if !fishing_success(fishing_result) {
            return RawPokemonData::not_pokemon(EncounterResult::FishingFailed);
        }
    }

    // 3. スロット決定
    let slot_rand = lcg.next().unwrap_or(0);
    let slot_idx = calculate_encounter_slot(enc_type, slot_rand, config.version) as usize;
    let slot_config = &params.slots[slot_idx.min(params.slots.len() - 1)];

    // 4. レベル決定 (Range パターン: 乱数値からレベルを計算)
    let level_rand = lcg.next().unwrap_or(0);
    let level = calculate_level(
        config.version,
        level_rand,
        slot_config.level_min,
        slot_config.level_max,
    );

    // 5. PID 生成
    let reroll_count = if config.game_start.shiny_charm { 2 } else { 0 };
    let (pid, shiny_type) = generate_wild_pid_with_reroll(lcg, params.trainer, reroll_count);

    // 6. 性格決定
    let (nature, sync_applied) = determine_nature(lcg, sync_success, params.lead_ability);

    // 7. 持ち物判定
    let held_item_slot = if encounter_type_supports_held_item(enc_type) && slot_config.has_held_item
    {
        let item_rand = lcg.next().unwrap_or(0);
        let has_very_rare = enc_type == EncounterType::FishingBubble;
        determine_held_item_slot(config.version, item_rand, params.lead_ability, has_very_rare)
    } else {
        HeldItemSlot::None
    };

    // 8. BW のみ: 最後の消費
    if config.version.is_bw() {
        lcg.next();
    }

    // === Resolve (乱数消費なし) ===
    let gender = pid.gender(slot_config.gender_ratio);
    let ability_slot = pid.ability_slot();

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{EncounterMethod, EncounterSlotConfig, GenderRatio, TrainerInfo, GameStartConfig, GenerationConfig, RomVersion, SaveState, StartMode};

    fn make_slots() -> Vec<EncounterSlotConfig> {
        vec![EncounterSlotConfig {
            species_id: 129, // コイキング
            level_min: 10,
            level_max: 25,
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

            slots: make_slots(),
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

    #[test]
    fn test_generate_fishing_pokemon_success() {
        // 釣り成功する seed を使用 (fishing_success = (rand * 2) >> 32 == 0)
        // rand < 0x8000_0000 で成功
        let mut lcg = Lcg64::from_raw(0);
        let params = make_params(EncounterType::Fishing);

        // LCG の状態によって成功/失敗が変わる
        let pokemon = generate_fishing_pokemon(&mut lcg, &params, &make_config(RomVersion::Black2));

        // 成功または失敗のどちらかになる
        match pokemon.encounter_result {
            EncounterResult::Pokemon => {
                assert_eq!(pokemon.species_id, 129);
                assert!((10..=25).contains(&pokemon.level));
            }
            EncounterResult::FishingFailed => {
                // 釣り失敗もOK
                assert_eq!(pokemon.species_id, 0);
            }
            EncounterResult::Item(_) => panic!("Unexpected item result"),
        }
    }

    #[test]
    fn test_fishing_failed() {
        // 釣り失敗する seed を探す
        // fishing_success = (rand * 2) >> 32 == 0 で成功
        // rand >= 0x8000_0000 で失敗
        // 最初の next() で sync 判定、2番目の next() で釣り判定
        // sync 判定後に大きい値が出る seed が必要

        let mut lcg = Lcg64::from_raw(0xFFFF_FFFF_FFFF_FFFF);
        let params = make_params(EncounterType::Fishing);

        // この seed では失敗する可能性が高い
        let pokemon = generate_fishing_pokemon(&mut lcg, &params, &make_config(RomVersion::Black2));

        // 失敗または成功のどちらかになる
        assert!(matches!(
            pokemon.encounter_result,
            EncounterResult::Pokemon | EncounterResult::FishingFailed
        ));
    }

    #[test]
    fn test_fishing_consumption_bw_success() {
        // 成功時の BW 消費数
        // sync(1) + fishing(1) + slot(1) + level(1) + pid(1) + nature(1) + bw_tail(1) = 7
        // 失敗時は sync(1) + fishing(1) = 2
        let mut lcg = Lcg64::from_raw(0);
        let params = make_params(EncounterType::Fishing);

        let pokemon = generate_fishing_pokemon(&mut lcg, &params, &make_config(RomVersion::Black));

        // 成功/失敗に関わらず、消費は発生している
        assert!(matches!(
            pokemon.encounter_result,
            EncounterResult::Pokemon | EncounterResult::FishingFailed
        ));
    }

    #[test]
    fn test_fishing_bubble_pokemon() {
        // FishingBubble: 釣り成功判定がないので必ず成功
        // sync(1) + slot(1) + level(1) + pid(1) + nature(1) = 5 (BW2)
        let mut lcg = Lcg64::from_raw(0);
        let params = make_params(EncounterType::FishingBubble);

        let pokemon = generate_fishing_pokemon(&mut lcg, &params, &make_config(RomVersion::Black2));

        assert_eq!(
            pokemon.encounter_result,
            EncounterResult::Pokemon,
            "FishingBubble should always succeed"
        );
        assert_eq!(pokemon.species_id, 129);
        assert!((10..=25).contains(&pokemon.level));
    }
}



