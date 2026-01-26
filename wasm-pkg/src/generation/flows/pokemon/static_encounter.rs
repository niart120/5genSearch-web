//! 固定シンボル・イベント・徘徊ポケモン生成

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    apply_shiny_lock, calculate_shiny_type, generate_event_pid, generate_wild_pid_with_reroll,
    nature_roll, perform_sync_check,
};
use crate::types::{
    EncounterResult, EncounterType, Gender, HeldItemSlot, LeadAbilityEffect, Nature,
    PokemonGeneratorParams, ShinyType,
};

use super::types::{EncounterSlotConfig, RawPokemonData};

/// 固定ポケモン生成 (IV なし)
pub fn generate_static_pokemon(
    lcg: &mut Lcg64,
    params: &PokemonGeneratorParams,
    slot: &EncounterSlotConfig,
) -> RawPokemonData {
    let enc_type = params.encounter_type;
    let is_compound_eyes = matches!(params.lead_ability, LeadAbilityEffect::CompoundEyes);

    // シンクロ判定 (StaticSymbol のみ)
    let sync_success = if enc_type == EncounterType::StaticSymbol && !is_compound_eyes {
        perform_sync_check(lcg, enc_type, &params.lead_ability)
    } else {
        false
    };

    // PID 生成
    let (pid, shiny_type) = match enc_type {
        EncounterType::StaticSymbol | EncounterType::Roamer => {
            let reroll_count = if params.shiny_charm { 2 } else { 0 };
            let (pid, shiny) = generate_wild_pid_with_reroll(
                lcg,
                params.trainer.tid,
                params.trainer.sid,
                reroll_count,
            );
            if slot.shiny_locked {
                (
                    apply_shiny_lock(pid, params.trainer.tid, params.trainer.sid),
                    ShinyType::None,
                )
            } else {
                (pid, shiny)
            }
        }
        EncounterType::StaticStarter | EncounterType::StaticFossil | EncounterType::StaticEvent => {
            let pid = generate_event_pid(lcg.next().unwrap_or(0));
            let pid = if slot.shiny_locked {
                apply_shiny_lock(pid, params.trainer.tid, params.trainer.sid)
            } else {
                pid
            };
            let shiny = calculate_shiny_type(pid, params.trainer.tid, params.trainer.sid);
            (pid, shiny)
        }
        _ => {
            let r = lcg.next().unwrap_or(0);
            let shiny = calculate_shiny_type(r, params.trainer.tid, params.trainer.sid);
            (r, shiny)
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
    if enc_type == EncounterType::StaticSymbol && params.context.version.is_bw() {
        lcg.next();
    }

    // === Resolve ===
    let ability_slot = ((pid >> 16) & 1) as u8;
    let gender = match slot.gender_threshold {
        0 => Gender::Male,
        254 => Gender::Female,
        255 => Gender::Genderless,
        t => {
            if ((pid & 0xFF) as u8) < t {
                Gender::Female
            } else {
                Gender::Male
            }
        }
    };

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{
        EncounterMethod, GameStartConfig, RomVersion, SaveState, SeedContext, SeedInput, StartMode,
        TrainerInfo,
    };

    fn make_params(version: RomVersion, encounter_type: EncounterType) -> PokemonGeneratorParams {
        PokemonGeneratorParams {
            context: SeedContext {
                input: SeedInput::Seeds { seeds: vec![] },
                version,
                game_start: GameStartConfig {
                    start_mode: StartMode::Continue,
                    save_state: SaveState::WithSave,
                },
                user_offset: 0,
                max_advance: 1000,
            },
            trainer: TrainerInfo {
                tid: 12345,
                sid: 54321,
            },
            encounter_type,
            encounter_method: EncounterMethod::Stationary,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            slots: vec![],
        }
    }

    fn make_slot(
        species_id: u16,
        level: u8,
        gender_threshold: u8,
        shiny_locked: bool,
        has_held_item: bool,
    ) -> EncounterSlotConfig {
        EncounterSlotConfig {
            species_id,
            level_min: level,
            level_max: level,
            gender_threshold,
            shiny_locked,
            has_held_item,
        }
    }

    #[test]
    fn test_generate_static_pokemon_symbol() {
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let params = make_params(RomVersion::Black, EncounterType::StaticSymbol);
        let slot = make_slot(150, 70, 255, false, false);

        let pokemon = generate_static_pokemon(&mut lcg, &params, &slot);

        assert_eq!(pokemon.species_id, 150);
        assert_eq!(pokemon.level, 70);
        assert_eq!(pokemon.gender, Gender::Genderless);
    }

    #[test]
    fn test_generate_static_pokemon_starter() {
        let mut lcg = Lcg64::from_raw(0xABCD_EF01_2345_6789);
        let params = make_params(RomVersion::Black, EncounterType::StaticStarter);
        let slot = make_slot(495, 5, 31, true, false);

        let pokemon = generate_static_pokemon(&mut lcg, &params, &slot);

        assert_eq!(pokemon.species_id, 495);
        assert_eq!(pokemon.level, 5);
        // shiny_locked = true なので None
        assert_eq!(pokemon.shiny_type, ShinyType::None);
    }
}
