//! 生成器改修前の全フィールド・順序を固定する回帰テスト。
use wasm_pkg::generation::flows::generator::PokemonGenerator;
use wasm_pkg::types::*;

#[test]
fn generation_pipeline_baseline() {
    let mut output = String::new();
    let mut filtered_output = String::new();
    for version in [RomVersion::Black, RomVersion::Black2] {
        for encounter_type in [
            EncounterType::Normal,
            EncounterType::StaticSymbol,
            EncounterType::Roamer,
            EncounterType::Fishing,
            EncounterType::DustCloud,
        ] {
            for lead_ability in [
                LeadAbilityEffect::None,
                LeadAbilityEffect::Synchronize(Nature::Jolly),
                LeadAbilityEffect::CompoundEyes,
            ] {
                let config = GenerationConfig {
                    version,
                    game_start: GameStartConfig {
                        start_mode: StartMode::Continue,
                        save: SavePresence::WithSave,
                        memory_link: MemoryLinkState::Disabled,
                        shiny_charm: ShinyCharmState::NotObtained,
                    },
                    user_offset: 6,
                    max_advance: 30,
                };
                let params = PokemonGenerationParams {
                    trainer: TrainerInfo {
                        tid: 12345,
                        sid: 54321,
                    },
                    encounter_type,
                    encounter_method: EncounterMethod::Stationary,
                    lead_ability,
                    slots: vec![
                        EncounterSlotConfig {
                            species_id: 25,
                            level_min: 5,
                            level_max: 10,
                            gender_ratio: GenderRatio::F1M1,
                            has_held_item: true,
                            shiny_locked: false
                        };
                        if matches!(
                            encounter_type,
                            EncounterType::StaticSymbol | EncounterType::Roamer
                        ) {
                            1
                        } else {
                            12
                        }
                    ],
                };
                let seed = LcgSeed::new(0x1234_5678_9ABC_DEF0);
                let data = PokemonGenerator::new(SeedOrigin::seed(seed), &params, &config, None)
                    .unwrap()
                    .take(24);
                for filter in filters() {
                    let filtered = PokemonGenerator::new(
                        SeedOrigin::seed(seed),
                        &params,
                        &config,
                        Some(&filter),
                    )
                    .unwrap()
                    .take(24);
                    filtered_output.push_str(&serde_json::to_string(&filtered).unwrap());
                    filtered_output.push('\n');
                }
                let data = serde_json::to_string(&data).unwrap();
                output.push_str(&format!(
                    "{version:?}/{encounter_type:?}/{lead_ability:?}\n{data}\n"
                ));
            }
        }
    }
    assert_eq!(output, include_str!("fixtures/generation_pipeline.txt"));
    assert_eq!(
        filtered_output,
        include_str!("fixtures/generation_filters.txt")
    );
}

fn filters() -> Vec<PokemonFilter> {
    vec![
        PokemonFilter {
            base: CoreDataFilter {
                natures: Some(vec![Nature::Jolly, Nature::Hardy]),
                ..CoreDataFilter::any()
            },
            ..PokemonFilter::any()
        },
        PokemonFilter {
            base: CoreDataFilter {
                gender: Some(Gender::Male),
                ability_slot: Some(AbilitySlot::First),
                shiny: None,
                ..CoreDataFilter::any()
            },
            species_ids: Some(vec![25]),
            level_range: Some((5, 7)),
            ..PokemonFilter::any()
        },
        PokemonFilter {
            base: CoreDataFilter {
                iv: Some(IvFilter {
                    hp: (0, 15),
                    ..IvFilter::any()
                }),
                ..CoreDataFilter::any()
            },
            ..PokemonFilter::any()
        },
        PokemonFilter {
            base: CoreDataFilter {
                iv: Some(IvFilter {
                    hidden_power_types: Some(vec![HiddenPowerType::Fire, HiddenPowerType::Ice]),
                    hidden_power_min_power: Some(50),
                    ..IvFilter::any()
                }),
                ..CoreDataFilter::any()
            },
            ..PokemonFilter::any()
        },
        PokemonFilter {
            base: CoreDataFilter {
                stats: Some(StatsFilter {
                    hp: Some(25),
                    ..StatsFilter::any()
                }),
                ..CoreDataFilter::any()
            },
            ..PokemonFilter::any()
        },
        PokemonFilter {
            held_item_slots: Some(vec![HeldItemSlot::None]),
            encounter_result_filter: Some(EncounterResultFilter::PokemonOnly),
            ..PokemonFilter::any()
        },
        PokemonFilter {
            encounter_result_filter: Some(EncounterResultFilter::ItemOnly),
            ..PokemonFilter::any()
        },
        PokemonFilter {
            special_encounter_triggered: Some(false),
            ..PokemonFilter::any()
        },
        PokemonFilter {
            species_ids: Some(vec![]),
            held_item_slots: Some(vec![]),
            base: CoreDataFilter {
                natures: Some(vec![]),
                ..CoreDataFilter::any()
            },
            ..PokemonFilter::any()
        },
    ]
}
