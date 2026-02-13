//! 卵解決モジュール
//!
//! `GeneratedEggData` を表示用の `UiEggData` に変換。

#![allow(clippy::too_many_lines)]

use super::format_hidden_power_type;
use crate::data::{get_ability_name, get_nature_name, get_species_name};
use crate::types::{AbilitySlot, GeneratedEggData, IV_VALUE_UNKNOWN, SeedOrigin, UiEggData};

/// 卵データを表示用に解決
///
/// # Arguments
/// * `data` - 生成された卵データ
/// * `locale` - ロケール (`"ja"` または `"en"`)
/// * `species_id` - 種族 ID (任意。指定時は種族名や特性名を解決)
#[allow(clippy::needless_pass_by_value)]
pub fn resolve_egg_data(
    data: GeneratedEggData,
    locale: &str,
    species_id: Option<u16>,
) -> UiEggData {
    // Seed情報展開
    let base_seed = format!("{:016X}", data.source.base_seed().value());
    let mt_seed = format!("{:08X}", data.source.mt_seed().value());

    let (datetime_iso, timer0, vcount, key_input) = match &data.source {
        SeedOrigin::Startup {
            datetime,
            condition,
            ..
        } => {
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

    // 種族名解決
    let species_name = species_id.map(|id| get_species_name(id, locale).to_string());

    // 性格名解決
    let nature_name = get_nature_name(data.core.nature as u8, locale).to_string();

    // 特性名解決
    let ability_name = if let Some(id) = species_id {
        get_ability_name(id, data.core.ability_slot, locale).to_string()
    } else {
        // 種族未指定時はスロット名を返す
        format_ability_slot_name(data.core.ability_slot, locale)
    };

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

    // ステータス (CorePokemonData.stats から取得)
    let stats_arr = data.core.stats.to_array();
    let stats: [String; 6] =
        std::array::from_fn(|i| stats_arr[i].map_or("?".to_string(), |v| v.to_string()));

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

    UiEggData {
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
        level: data.core.level,
        ivs,
        stats,
        hidden_power_type,
        hidden_power_power,
        pid,
        margin_frames: data.margin_frames,
    }
}

fn format_ability_slot_name(slot: AbilitySlot, locale: &str) -> String {
    match locale {
        "ja" => match slot {
            AbilitySlot::First => "特性1",
            AbilitySlot::Second => "特性2",
            AbilitySlot::Hidden => "夢特性",
        },
        _ => match slot {
            AbilitySlot::First => "Ability 1",
            AbilitySlot::Second => "Ability 2",
            AbilitySlot::Hidden => "Hidden Ability",
        },
    }
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::Stats;
    use crate::types::{
        CorePokemonData, Datetime, Gender, InheritanceSlot, Ivs, KeyCode, LcgSeed, MtSeed, Nature,
        NeedleDirection, Pid, ShinyType, StartupCondition,
    };

    fn make_test_egg_data() -> GeneratedEggData {
        GeneratedEggData {
            advance: 50,
            needle_direction: NeedleDirection::from_value(1),
            source: SeedOrigin::Startup {
                base_seed: LcgSeed::new(0x1234_5678_9ABC_DEF0),
                mt_seed: MtSeed::new(0xABCD_1234),
                datetime: Datetime {
                    year: 2024,
                    month: 2,
                    day: 20,
                    hour: 10,
                    minute: 15,
                    second: 30,
                },
                condition: StartupCondition {
                    timer0: 0x0C80,
                    vcount: 0x5E,
                    key_code: KeyCode::NONE,
                },
            },
            core: CorePokemonData {
                pid: Pid(0xABCD_EF12),
                nature: Nature::Jolly,
                ability_slot: AbilitySlot::Hidden,
                gender: Gender::Female,
                shiny_type: ShinyType::Star,
                ivs: Ivs::new(31, 31, 31, 31, 31, 31),
                stats: Stats::UNKNOWN, // 卵は種族ID未定義のため不明
                species_id: 0,
                level: 1,
            },
            inheritance: [
                InheritanceSlot::new(0, 1), // HP from Female
                InheritanceSlot::new(1, 0), // Atk from Male
                InheritanceSlot::new(2, 1), // Def from Female
            ],
            margin_frames: Some(10),
        }
    }

    #[test]
    fn test_resolve_egg_data_without_species() {
        let data = make_test_egg_data();
        let ui = resolve_egg_data(data, "ja", None);

        assert_eq!(ui.advance, 50);
        assert_eq!(ui.species_name, None);
        assert_eq!(ui.ability_name, "夢特性"); // スロット名が返る
        assert_eq!(ui.level, 1);
        assert_eq!(ui.pid, "ABCDEF12");
        assert_eq!(ui.gender_symbol, "♀");
        assert_eq!(ui.shiny_symbol, "☆");
        assert!(ui.stats.iter().all(|s| s == "?")); // species_id なしは ? 
    }

    #[test]
    fn test_resolve_egg_data_with_species() {
        // stats は CorePokemonData に事前計算済み (species_id=0 の場合は UNKNOWN)
        let data = make_test_egg_data();
        let ui = resolve_egg_data(data, "ja", Some(25)); // ピカチュウ

        assert_eq!(ui.species_name, Some("ピカチュウ".to_string()));
        // 特性名が解決される
        assert!(!ui.ability_name.is_empty());
        // species_id=0 で生成されたデータのため stats は "?"
        assert!(ui.stats.iter().all(|s| s == "?"));
    }

    #[test]
    fn test_resolve_egg_data_with_precomputed_stats() {
        use crate::data::{calculate_stats, get_species_entry};

        let species_id = 25u16; // ピカチュウ
        let ivs = Ivs::new(31, 31, 31, 31, 31, 31);
        let nature = Nature::Jolly;
        let entry = get_species_entry(species_id);
        let stats = calculate_stats(entry.base_stats, ivs, nature, 1);

        let mut data = make_test_egg_data();
        data.core.stats = stats;
        data.core.species_id = species_id;

        let ui = resolve_egg_data(data, "ja", Some(species_id));
        assert_eq!(ui.species_name, Some("ピカチュウ".to_string()));
        // stats が事前計算済みのため "?" でない
        assert!(ui.stats[0] != "?"); // HP
    }

    #[test]
    fn test_resolve_egg_data_en() {
        let data = make_test_egg_data();
        let ui = resolve_egg_data(data, "en", Some(25));

        assert_eq!(ui.species_name, Some("Pikachu".to_string()));
        assert_eq!(ui.nature_name, "Jolly");
    }
}
