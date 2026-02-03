//! ポケモン解決モジュール
//!
//! `GeneratedPokemonData` を表示用の `UiPokemonData` に変換。

#![allow(clippy::too_many_lines)]

use super::format_hidden_power_type;
use crate::data::{calculate_stats, get_ability_name, get_held_item_name, get_nature_name, get_species_entry, get_species_name};
use crate::types::{
    GeneratedPokemonData, IV_VALUE_UNKNOWN, RomVersion, SeedOrigin, UiPokemonData,
};

/// ポケモンデータを表示用に解決
///
/// # Arguments
/// * `data` - 生成されたポケモンデータ
/// * `version` - ROMバージョン (持ち物解決に使用)
/// * `locale` - ロケール (`"ja"` または `"en"`)
#[allow(clippy::needless_pass_by_value)]
pub fn resolve_pokemon_data(
    data: GeneratedPokemonData,
    version: RomVersion,
    locale: &str,
) -> UiPokemonData {
    let species_entry = get_species_entry(data.species_id);

    // Seed情報展開
    let base_seed = format!("{:016X}", data.source.base_seed().value());
    let mt_seed = format!("{:08X}", data.source.mt_seed().value());

    let (datetime_iso, timer0, vcount, key_input) = match &data.source {
        SeedOrigin::Startup { datetime, condition, .. } => {
            let datetime_str = format!(
                "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}",
                datetime.year,
                datetime.month,
                datetime.day,
                datetime.hour,
                datetime.minute,
                datetime.second
            );
            (
                Some(datetime_str),
                Some(format!("{:04X}", condition.timer0)),
                Some(format!("{:02X}", condition.vcount)),
                Some(condition.key_code.to_display_string()),
            )
        }
        SeedOrigin::Seed { .. } => (None, None, None, None),
    };

    // 個体情報解決
    let species_name = get_species_name(data.species_id, locale).to_string();
    let nature_name = get_nature_name(data.core.nature as u8, locale).to_string();
    let ability_name = get_ability_name(data.species_id, data.core.ability_slot, locale).to_string();

    let gender_symbol = match data.core.gender {
        crate::types::Gender::Male => "♂".to_string(),
        crate::types::Gender::Female => "♀".to_string(),
        crate::types::Gender::Genderless => "-".to_string(),
    };

    let shiny_symbol = match data.core.shiny_type {
        crate::types::ShinyType::None => String::new(),
        crate::types::ShinyType::Square => "◇".to_string(),
        crate::types::ShinyType::Star => "☆".to_string(),
    };

    // IV解決
    let ivs_arr = data.core.ivs.to_array();
    let ivs: [String; 6] = std::array::from_fn(|i| {
        let iv = ivs_arr[i];
        if iv == IV_VALUE_UNKNOWN {
            "?".to_string()
        } else {
            iv.to_string()
        }
    });

    // ステータス計算
    let stats_result = calculate_stats(
        species_entry.base_stats,
        data.core.ivs,
        data.core.nature,
        data.level,
    );
    let stats_arr = stats_result.to_array();
    let stats: [String; 6] = std::array::from_fn(|i| {
        stats_arr[i].map_or("?".to_string(), |v| v.to_string())
    });

    // めざパ
    let has_unknown_iv = data.core.ivs.has_unknown();
    let hidden_power_type = if has_unknown_iv {
        "?".to_string()
    } else {
        format_hidden_power_type(data.core.ivs.hidden_power_type(), locale)
    };
    let hidden_power_power = if has_unknown_iv {
        "?".to_string()
    } else {
        data.core.ivs.hidden_power_power().to_string()
    };

    // PID
    let pid = data.core.pid.to_hex_string();

    // エンカウント情報
    let moving_encounter_guaranteed = data.moving_encounter.as_ref().map(|info| {
        info.likelihood.to_display_symbol().to_string()
    });

    let special_encounter_triggered = data.special_encounter.as_ref().map(|info| {
        info.triggered_symbol().to_string()
    });

    let special_encounter_direction = data.special_encounter.as_ref().map(|info| {
        format_direction(info.direction, locale)
    });

    let encounter_result = format_encounter_result(data.encounter_result, locale);

    UiPokemonData {
        advance: data.advance,
        needle_direction: data.needle_direction.value(),
        base_seed,
        mt_seed,
        datetime_iso,
        timer0,
        vcount,
        key_input,
        species_name,
        nature_name,
        ability_name,
        gender_symbol,
        shiny_symbol,
        level: data.level,
        ivs,
        stats,
        hidden_power_type,
        hidden_power_power,
        pid,
        sync_applied: data.sync_applied,
        held_item_name: get_held_item_name(
            data.species_id,
            version.held_item_index(),
            data.held_item_slot,
            locale,
        ).map(ToString::to_string),
        moving_encounter_guaranteed,
        special_encounter_triggered,
        special_encounter_direction,
        encounter_result,
    }
}

fn format_direction(
    direction: crate::types::SpecialEncounterDirection,
    locale: &str,
) -> String {
    match locale {
        "ja" => match direction {
            crate::types::SpecialEncounterDirection::Right => "右",
            crate::types::SpecialEncounterDirection::Up => "上",
            crate::types::SpecialEncounterDirection::Left => "左",
            crate::types::SpecialEncounterDirection::Down => "下",
        },
        _ => match direction {
            crate::types::SpecialEncounterDirection::Right => "Right",
            crate::types::SpecialEncounterDirection::Up => "Up",
            crate::types::SpecialEncounterDirection::Left => "Left",
            crate::types::SpecialEncounterDirection::Down => "Down",
        },
    }
    .to_string()
}

fn format_encounter_result(
    result: crate::types::EncounterResult,
    _locale: &str,
) -> String {
    match result {
        crate::types::EncounterResult::Pokemon => "Pokemon".to_string(),
        crate::types::EncounterResult::Item(item) => {
            let item_str = match item {
                crate::types::ItemContent::EvolutionStone => "EvolutionStone",
                crate::types::ItemContent::Jewel => "Jewel",
                crate::types::ItemContent::Everstone => "Everstone",
                crate::types::ItemContent::Feather => "Feather",
            };
            format!("Item:{item_str}")
        }
        crate::types::EncounterResult::FishingFailed => "FishingFailed".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{
        AbilitySlot, CorePokemonData, Datetime, EncounterResult, Gender, HeldItemSlot, Ivs,
        KeyCode, LcgSeed, MtSeed, NeedleDirection, Nature, Pid, ShinyType, StartupCondition,
    };

    fn make_test_data() -> GeneratedPokemonData {
        GeneratedPokemonData {
            advance: 100,
            needle_direction: NeedleDirection::from_value(0),
            source: SeedOrigin::Startup {
                base_seed: LcgSeed::new(0x1234_5678_9ABC_DEF0),
                mt_seed: MtSeed::new(0xABCD_1234),
                datetime: Datetime {
                    year: 2024,
                    month: 1,
                    day: 15,
                    hour: 12,
                    minute: 30,
                    second: 45,
                },
                condition: StartupCondition {
                    timer0: 0x0C80,
                    vcount: 0x5E,
                    key_code: KeyCode::NONE,
                },
            },
            core: CorePokemonData {
                pid: Pid(0x1234_5678),
                nature: Nature::Adamant,
                ability_slot: AbilitySlot::First,
                gender: Gender::Male,
                shiny_type: ShinyType::None,
                ivs: Ivs::new(31, 31, 31, 31, 31, 31),
            },
            species_id: 25, // ピカチュウ
            level: 50,
            sync_applied: false,
            held_item_slot: HeldItemSlot::None,
            moving_encounter: None,
            special_encounter: None,
            encounter_result: EncounterResult::Pokemon,
        }
    }

    #[test]
    fn test_resolve_pokemon_data_basic() {
        let data = make_test_data();
        let ui = resolve_pokemon_data(data, RomVersion::Black, "ja");

        assert_eq!(ui.advance, 100);
        assert_eq!(ui.species_name, "ピカチュウ");
        assert_eq!(ui.level, 50);
        assert_eq!(ui.pid, "12345678");
        assert_eq!(ui.gender_symbol, "♂");
    }

    #[test]
    fn test_resolve_pokemon_data_en() {
        let data = make_test_data();
        let ui = resolve_pokemon_data(data, RomVersion::Black, "en");

        assert_eq!(ui.species_name, "Pikachu");
        assert_eq!(ui.nature_name, "Adamant");
    }
}
