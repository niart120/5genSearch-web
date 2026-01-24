//! 野生ポケモン生成

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    calculate_encounter_slot, determine_held_item_slot, determine_nature,
    encounter_type_supports_held_item, fishing_success, generate_wild_pid_with_reroll,
    perform_sync_check,
};
use crate::types::{EncounterType, Gender, HeldItemSlot, LeadAbilityEffect};

use super::types::{EncounterSlotConfig, GenerationError, PokemonGenerationConfig, RawPokemonData};

/// 野生ポケモン生成 (IV なし)
///
/// # Errors
///
/// - `GenerationError::FishingFailed`: 釣り失敗時
/// - `GenerationError::NoSlot`: エンカウントスロットが見つからない場合
pub fn generate_wild_pokemon(
    lcg: &mut Lcg64,
    config: &PokemonGenerationConfig,
    slots: &[EncounterSlotConfig],
) -> Result<RawPokemonData, GenerationError> {
    let enc_type = config.encounter_type;
    let is_compound_eyes = matches!(config.lead_ability, LeadAbilityEffect::CompoundEyes);

    // 1. シンクロ判定 (ふくがん先頭時はスキップ)
    let sync_success = if is_compound_eyes {
        false
    } else {
        perform_sync_check(lcg, enc_type, &config.lead_ability)
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
    let slot_idx = calculate_encounter_slot(enc_type, slot_rand, config.version) as usize;
    let slot_config = &slots[slot_idx.min(slots.len() - 1)];

    // 4. レベル決定
    let _level_rand = lcg.next();

    // 5. PID 生成
    let reroll_count = if config.shiny_charm { 2 } else { 0 };
    let (pid, shiny_type) =
        generate_wild_pid_with_reroll(lcg, config.tid, config.sid, reroll_count);

    // 6. 性格決定
    let (nature, sync_applied) = determine_nature(lcg, sync_success, &config.lead_ability);

    // 7. 持ち物判定
    let held_item_slot = if encounter_type_supports_held_item(enc_type) && slot_config.has_held_item
    {
        let item_rand = lcg.next().unwrap_or(0);
        let has_very_rare = matches!(
            enc_type,
            EncounterType::ShakingGrass | EncounterType::SurfingBubble
        );
        determine_held_item_slot(
            config.version,
            item_rand,
            &config.lead_ability,
            has_very_rare,
        )
    } else {
        HeldItemSlot::None
    };

    // 8. BW のみ: 最後の消費
    if config.version.is_bw() {
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
    use crate::types::{EncounterMethod, RomVersion};

    fn make_config(version: RomVersion, encounter_type: EncounterType) -> PokemonGenerationConfig {
        PokemonGenerationConfig {
            version,
            encounter_type,
            tid: 12345,
            sid: 54321,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            shiny_locked: false,
            has_held_item: false,
            encounter_method: EncounterMethod::SweetScent,
        }
    }

    fn make_slots() -> Vec<EncounterSlotConfig> {
        vec![EncounterSlotConfig {
            species_id: 1,
            level_min: 5,
            level_max: 10,
            gender_threshold: 127,
            has_held_item: false,
        }]
    }

    #[test]
    fn test_generate_wild_pokemon_normal() {
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let config = make_config(RomVersion::Black, EncounterType::Normal);
        let slots = make_slots();

        let result = generate_wild_pokemon(&mut lcg, &config, &slots);
        assert!(result.is_ok());

        let pokemon = result.unwrap();
        assert_eq!(pokemon.species_id, 1);
        assert_eq!(pokemon.level, 5);
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
