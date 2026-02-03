//! 解決モジュール統合テスト
//!
//! ポケモン/卵データの解決処理をエンドツーエンドでテスト。

use wasm_pkg::resolve::{resolve_egg_data, resolve_pokemon_data};
use wasm_pkg::types::{
    AbilitySlot, CorePokemonData, Datetime, EncounterResult, Gender, GeneratedEggData,
    GeneratedPokemonData, HeldItemSlot, InheritanceSlot, Ivs, KeyCode, LcgSeed, MtSeed, Nature,
    NeedleDirection, Pid, RomVersion, SeedOrigin, ShinyType, StartupCondition,
};

/// テスト用のポケモンデータを生成
fn create_test_pokemon_data() -> GeneratedPokemonData {
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
            species_id: 25, // ピカチュウ
            level: 50,
        },
        sync_applied: false,
        held_item_slot: HeldItemSlot::Common, // オレンのみ
        moving_encounter: None,
        special_encounter: None,
        encounter_result: EncounterResult::Pokemon,
    }
}

/// テスト用の卵データを生成
fn create_test_egg_data() -> GeneratedEggData {
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
            species_id: 0, // 卵は種族ID未定義
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
fn test_resolve_pokemon_full_flow_ja() {
    let data = create_test_pokemon_data();
    let ui = resolve_pokemon_data(data, RomVersion::Black, "ja");

    // 基本情報
    assert_eq!(ui.advance, 100);
    assert_eq!(ui.species_name, "ピカチュウ");
    assert_eq!(ui.level, 50);

    // 性格
    assert_eq!(ui.nature_name, "いじっぱり");

    // 性別・色違い
    assert_eq!(ui.gender_symbol, "♂");
    assert_eq!(ui.shiny_symbol, "");

    // 個体値・めざパ
    assert_eq!(ui.ivs, ["31", "31", "31", "31", "31", "31"]);
    assert_eq!(ui.hidden_power_type, "あく");
    assert_eq!(ui.hidden_power_power, "70");

    // PID (hex)
    assert_eq!(ui.pid, "12345678");

    // 持ち物 (ピカチュウの Common = オレンのみ)
    assert_eq!(ui.held_item_name, Some("オレンのみ".to_string()));

    // Seed情報
    assert_eq!(ui.base_seed, "123456789ABCDEF0");
    assert_eq!(ui.mt_seed, "ABCD1234");
    assert_eq!(ui.datetime_iso, Some("2024-01-15T12:30:45".to_string()));
}

#[test]
fn test_resolve_pokemon_full_flow_en() {
    let data = create_test_pokemon_data();
    let ui = resolve_pokemon_data(data, RomVersion::Black, "en");

    assert_eq!(ui.species_name, "Pikachu");
    assert_eq!(ui.nature_name, "Adamant");
    assert_eq!(ui.hidden_power_type, "Dark");
    assert_eq!(ui.held_item_name, Some("Oran Berry".to_string()));
}

#[test]
fn test_resolve_egg_full_flow_with_species() {
    let data = create_test_egg_data();
    let ui = resolve_egg_data(data, "ja", Some(113)); // ラッキー

    assert_eq!(ui.advance, 50);
    assert_eq!(ui.species_name, Some("ラッキー".to_string()));
    assert_eq!(ui.nature_name, "ようき");
    assert_eq!(ui.gender_symbol, "♀");
    assert_eq!(ui.shiny_symbol, "☆");
    assert_eq!(ui.level, 1);
    assert_eq!(ui.pid, "ABCDEF12");
}

#[test]
fn test_resolve_egg_without_species() {
    let data = create_test_egg_data();
    let ui = resolve_egg_data(data, "ja", None);

    assert_eq!(ui.species_name, None);
    // 種族ID未指定時は特性スロット名が返る
    assert_eq!(ui.ability_name, "夢特性");
}

#[test]
fn test_batch_resolve_pokemon() {
    let data1 = create_test_pokemon_data();
    let mut data2 = create_test_pokemon_data();
    data2.core.species_id = 6; // リザードン
    data2.core.level = 36;

    let results = wasm_pkg::resolve_pokemon_data_batch(vec![data1, data2], RomVersion::Black, "ja");

    assert_eq!(results.len(), 2);
    assert_eq!(results[0].species_name, "ピカチュウ");
    assert_eq!(results[0].level, 50);
    assert_eq!(results[1].species_name, "リザードン");
    assert_eq!(results[1].level, 36);
}

#[test]
fn test_batch_resolve_egg() {
    let data1 = create_test_egg_data();
    let data2 = create_test_egg_data();

    let results = wasm_pkg::resolve_egg_data_batch(
        vec![data1, data2],
        "en",
        Some(25), // ピカチュウ
    );

    assert_eq!(results.len(), 2);
    assert_eq!(results[0].species_name, Some("Pikachu".to_string()));
    assert_eq!(results[1].species_name, Some("Pikachu".to_string()));
}
