//! 固定シンボル・イベント・徘徊ポケモン生成

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    HeldItemSlot, apply_shiny_lock, calculate_shiny_type, generate_event_pid,
    generate_wild_pid_with_reroll, nature_roll, perform_sync_check,
};
use crate::types::{EncounterType, Gender, LeadAbilityEffect, Nature, ShinyType};

use super::types::{PokemonGenerationConfig, RawPokemonData};

/// 固定ポケモン生成 (IV なし)
pub fn generate_static_pokemon(
    lcg: &mut Lcg64,
    config: &PokemonGenerationConfig,
    species_id: u16,
    level: u8,
    gender_threshold: u8,
) -> RawPokemonData {
    let enc_type = config.encounter_type;
    let is_compound_eyes = matches!(config.lead_ability, LeadAbilityEffect::CompoundEyes);

    // シンクロ判定 (StaticSymbol のみ)
    let sync_success = if enc_type == EncounterType::StaticSymbol && !is_compound_eyes {
        perform_sync_check(lcg, enc_type, &config.lead_ability)
    } else {
        false
    };

    // PID 生成
    let (pid, shiny_type) = match enc_type {
        EncounterType::StaticSymbol | EncounterType::Roamer => {
            let reroll_count = if config.shiny_charm { 2 } else { 0 };
            let (pid, shiny) =
                generate_wild_pid_with_reroll(lcg, config.tid, config.sid, reroll_count);
            if config.shiny_locked {
                (
                    apply_shiny_lock(pid, config.tid, config.sid),
                    ShinyType::None,
                )
            } else {
                (pid, shiny)
            }
        }
        EncounterType::StaticStarter | EncounterType::StaticFossil | EncounterType::StaticEvent => {
            let pid = generate_event_pid(lcg.next().unwrap_or(0));
            let pid = if config.shiny_locked {
                apply_shiny_lock(pid, config.tid, config.sid)
            } else {
                pid
            };
            let shiny = calculate_shiny_type(pid, config.tid, config.sid);
            (pid, shiny)
        }
        _ => {
            let r = lcg.next().unwrap_or(0);
            let shiny = calculate_shiny_type(r, config.tid, config.sid);
            (r, shiny)
        }
    };

    // 性格決定
    let (nature, sync_applied) = if sync_success {
        if let LeadAbilityEffect::Synchronize(n) = config.lead_ability {
            let _r = lcg.next(); // 消費
            (n, true)
        } else {
            (Nature::from_u8(nature_roll(lcg.next().unwrap_or(0))), false)
        }
    } else {
        (Nature::from_u8(nature_roll(lcg.next().unwrap_or(0))), false)
    };

    // 持ち物判定 (StaticSymbol で対象個体のみ)
    if enc_type == EncounterType::StaticSymbol && config.has_held_item {
        lcg.next();
    }

    // BW のみ: 最後の消費
    if enc_type == EncounterType::StaticSymbol && config.version.is_bw() {
        lcg.next();
    }

    // === Resolve ===
    let ability_slot = ((pid >> 16) & 1) as u8;
    let gender = match gender_threshold {
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
        species_id,
        level,
        nature,
        sync_applied,
        ability_slot,
        gender,
        shiny_type,
        held_item_slot: HeldItemSlot::None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::RomVersion;

    fn make_config(
        version: RomVersion,
        encounter_type: EncounterType,
        shiny_locked: bool,
    ) -> PokemonGenerationConfig {
        PokemonGenerationConfig {
            version,
            encounter_type,
            tid: 12345,
            sid: 54321,
            lead_ability: LeadAbilityEffect::None,
            shiny_charm: false,
            shiny_locked,
            has_held_item: false,
        }
    }

    #[test]
    fn test_generate_static_pokemon_symbol() {
        let mut lcg = Lcg64::from_raw(0x1234_5678_9ABC_DEF0);
        let config = make_config(RomVersion::Black, EncounterType::StaticSymbol, false);

        let pokemon = generate_static_pokemon(&mut lcg, &config, 150, 70, 255);

        assert_eq!(pokemon.species_id, 150);
        assert_eq!(pokemon.level, 70);
        assert_eq!(pokemon.gender, Gender::Genderless);
    }

    #[test]
    fn test_generate_static_pokemon_starter() {
        let mut lcg = Lcg64::from_raw(0xABCD_EF01_2345_6789);
        let config = make_config(RomVersion::Black, EncounterType::StaticStarter, true);

        let pokemon = generate_static_pokemon(&mut lcg, &config, 495, 5, 31);

        assert_eq!(pokemon.species_id, 495);
        assert_eq!(pokemon.level, 5);
        // shiny_locked = true なので None
        assert_eq!(pokemon.shiny_type, ShinyType::None);
    }
}
