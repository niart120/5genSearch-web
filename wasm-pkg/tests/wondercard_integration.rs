//! 配達員の公開 API を通した一覧・検索・表示の契約。

use wasm_pkg::core::{datetime::DatetimeSearchSpace, lcg::Lcg64, offset::calculate_game_offset};
use wasm_pkg::generation::flows::wondercard::{
    WonderCardGenerationParams, generate_wondercard_pokemon,
};
use wasm_pkg::types::*;
use wasm_pkg::{
    WonderCardDatetimeSearcher, WonderCardListGenerator, resolve_wondercard_data_batch,
};

fn params() -> WonderCardParams {
    WonderCardParams {
        trainer: TrainerInfo {
            tid: 12345,
            sid: 54321,
        },
        species_id: 519,
        level: 1,
        fixed_ivs: [None, Some(31), None, None, None, None],
        fixed_nature: Some(Nature::Hardy),
        fixed_gender: Some(Gender::Female),
        fixed_ability_slot: Some(AbilitySlot::Second),
        shiny_policy: WonderCardShinyPolicy::Never,
    }
}

fn config() -> GenerationConfig {
    GenerationConfig {
        version: RomVersion::Black,
        game_start: GameStartConfig {
            start_mode: StartMode::Continue,
            save: SavePresence::WithSave,
            memory_link: MemoryLinkState::Disabled,
            shiny_charm: ShinyCharmState::NotObtained,
        },
        user_offset: 0,
        max_advance: 9,
    }
}

fn origins() -> Vec<SeedOrigin> {
    vec![
        SeedOrigin::seed(LcgSeed::new(0)),
        SeedOrigin::seed(LcgSeed::new(0x1234_5678_9ABC_DEF0)),
    ]
}

fn collect_list(
    origins: Vec<SeedOrigin>,
    params: WonderCardParams,
    config: GenerationConfig,
    filter: Option<CoreDataFilter>,
    candidates: u32,
    results: u32,
) -> Vec<GeneratedWonderCardData> {
    let mut generator = WonderCardListGenerator::new(origins, params, config, filter).unwrap();
    let mut all = Vec::new();
    let mut previous = 0;
    while !generator.is_done() {
        let batch = generator
            .next_batch(WonderCardBatchLimits {
                max_candidates: candidates,
                max_results: results,
            })
            .unwrap();
        assert!(
            batch.processed_count > previous
                && batch.processed_count - previous <= u64::from(candidates)
        );
        assert!(batch.results.len() <= results as usize);
        previous = batch.processed_count;
        all.extend(batch.results);
    }
    let last = generator
        .next_batch(WonderCardBatchLimits {
            max_candidates: 1,
            max_results: 1,
        })
        .unwrap();
    assert!(last.results.is_empty());
    assert_eq!(last.processed_count, last.total_count);
    all
}

#[test]
fn frozen_pokefinder_pidove_fixture_connects_startup_generation_and_stats() {
    // PokeFinder ecf9762 / Test/Gen5/event5.json: Secret Egg Pidove、seed=0。
    // この repo の既存起動計算は seed=0 の BW 続きからを 43 消費とする。
    // PokeFinder の絶対位置 43/44 の固定期待値と照合する（表示位置 0/1）。
    assert_eq!(
        calculate_game_offset(LcgSeed::new(0), config().version, config().game_start).unwrap(),
        43
    );
    let data = collect_list(vec![origins()[0].clone()], params(), config(), None, 3, 1);
    assert_eq!(data[0].core.pid, Pid(3_001_616_718));
    assert_eq!(data[0].core.ivs.to_array(), [21, 31, 29, 20, 6, 4]);
    assert_eq!(
        data[0].core.stats.to_array(),
        [Some(12), Some(6), Some(6), Some(5), Some(5), Some(5)]
    );
    assert_eq!(data[0].advance, 0);
    assert_eq!(data[1].core.pid, Pid(2_653_287_285));
    assert_eq!(data[1].core.ivs.to_array(), [29, 31, 20, 6, 4, 24]);
}

#[test]
fn every_position_matches_low_level_generation_and_receiving_start_needle() {
    let params = params();
    let mut config = config();
    config.user_offset = 6;
    let prepared = WonderCardGenerationParams::new(
        params.trainer,
        GenderRatio::F1M1,
        params.fixed_ivs,
        params.fixed_nature,
        params.fixed_gender,
        params.fixed_ability_slot,
        params.shiny_policy,
    )
    .unwrap();
    let result = collect_list(origins(), params, config.clone(), None, 3, 2);
    for data in result {
        let offset =
            calculate_game_offset(data.source.base_seed(), config.version, config.game_start)
                .unwrap();
        let mut lcg = Lcg64::new(data.source.base_seed());
        lcg.jump(u64::from(offset + data.advance));
        assert_eq!(
            data.needle_direction,
            wasm_pkg::calc_report_needle_direction(lcg.current_seed())
        );
        let raw = generate_wondercard_pokemon(&mut lcg, &prepared);
        assert_eq!(data.core.pid, raw.pid);
        assert_eq!(data.core.ivs, raw.ivs);
    }
}

#[test]
fn batches_preserve_every_origin_and_advance_with_both_limits() {
    let all = collect_list(origins(), params(), config(), None, 100, 100);
    for (candidates, results) in [(1, 100), (100, 1), (3, 2), (13, 11)] {
        let split = collect_list(origins(), params(), config(), None, candidates, results);
        assert_eq!(
            serde_json::to_value(split).unwrap(),
            serde_json::to_value(&all).unwrap()
        );
    }
    assert_eq!(all.len(), 20);
}

#[test]
fn filter_matches_post_filtering_for_ivs_hidden_power_nature_gender_ability_shiny_and_stats() {
    let all = collect_list(origins(), params(), config(), None, 100, 100);
    let sample = all[0].core;
    let filters = [
        CoreDataFilter::any(),
        CoreDataFilter {
            iv: Some(IvFilter {
                hp: (sample.ivs.hp, sample.ivs.hp),
                ..IvFilter::any()
            }),
            ..CoreDataFilter::any()
        },
        CoreDataFilter {
            iv: Some(IvFilter {
                hidden_power_types: Some(vec![sample.ivs.hidden_power_type()]),
                hidden_power_min_power: Some(50),
                ..IvFilter::any()
            }),
            ..CoreDataFilter::any()
        },
        CoreDataFilter {
            natures: Some(vec![Nature::Hardy]),
            gender: Some(Gender::Female),
            ability_slot: Some(AbilitySlot::Second),
            ..CoreDataFilter::any()
        },
        CoreDataFilter {
            shiny: Some(ShinyFilter::Shiny),
            ..CoreDataFilter::any()
        },
        CoreDataFilter {
            stats: Some(StatsFilter {
                hp: sample.stats.hp,
                ..StatsFilter::any()
            }),
            ..CoreDataFilter::any()
        },
        CoreDataFilter {
            natures: Some(vec![Nature::Jolly]),
            ..CoreDataFilter::any()
        },
    ];
    for filter in filters {
        let expected: Vec<_> = all
            .iter()
            .filter(|d| filter.matches(&d.core))
            .cloned()
            .collect();
        let actual = collect_list(origins(), params(), config(), Some(filter), 3, 1);
        assert_eq!(
            serde_json::to_value(actual).unwrap(),
            serde_json::to_value(expected).unwrap()
        );
    }
}

fn search_params() -> WonderCardDatetimeSearchParams {
    WonderCardDatetimeSearchParams {
        ds: DsConfig {
            mac: [0, 9, 191, 18, 52, 86],
            hardware: Hardware::DsLite,
            version: RomVersion::Black,
            region: RomRegion::Jpn,
        },
        search_space: DatetimeSearchSpaceParams {
            start_seconds: 762_566_397,
            end_seconds: 762_566_404,
            time_range: TimeRangeParams {
                hour_start: 0,
                hour_end: 23,
                minute_start: 0,
                minute_end: 59,
                second_start: 0,
                second_end: 59,
            },
        },
        condition: StartupCondition::new(0xC79, 0x5A, KeyMask::NONE),
        wondercard_params: params(),
        gen_config: config(),
        filter: None,
    }
}

#[test]
fn datetime_and_list_paths_match_including_quad_remainders_and_filters() {
    for version in [
        RomVersion::Black,
        RomVersion::White,
        RomVersion::Black2,
        RomVersion::White2,
    ] {
        let mut params = search_params();
        params.ds.version = version;
        params.gen_config.version = version;
        let space = DatetimeSearchSpace::try_from(params.search_space.clone()).unwrap();
        let specs: Vec<_> = space
            .iter()
            .map(|datetime| SeedSpec::Startup {
                ds: params.ds.clone(),
                datetime,
                ranges: vec![Timer0VCountRange::fixed(
                    params.condition.timer0,
                    params.condition.vcount,
                )],
                key_input: KeyInput::new(),
            })
            .collect();
        let resolved = specs
            .into_iter()
            .flat_map(|spec| wasm_pkg::resolve_seeds(spec).unwrap())
            .collect();
        let expected = collect_list(
            resolved,
            params.wondercard_params.clone(),
            params.gen_config.clone(),
            params.filter.clone(),
            100,
            100,
        );
        let mut searcher = WonderCardDatetimeSearcher::new(params).unwrap();
        let mut actual = Vec::new();
        while !searcher.is_done() {
            let batch = searcher
                .next_batch(WonderCardBatchLimits {
                    max_candidates: 13,
                    max_results: 7,
                })
                .unwrap();
            assert_eq!(batch.total_count, 70);
            actual.extend(batch.results);
        }
        assert_eq!(
            serde_json::to_value(actual).unwrap(),
            serde_json::to_value(expected).unwrap()
        );
    }
}

#[test]
fn empty_and_singleton_ranges_and_zero_limits_preserve_state() {
    let mut empty = WonderCardListGenerator::new(vec![], params(), config(), None).unwrap();
    assert!(empty.is_done());
    assert_eq!(
        empty
            .next_batch(WonderCardBatchLimits {
                max_candidates: 1,
                max_results: 1
            })
            .unwrap()
            .total_count,
        0
    );
    let mut p = search_params();
    p.search_space.end_seconds = p.search_space.start_seconds;
    assert!(WonderCardDatetimeSearcher::new(p).unwrap().is_done());
    let mut cfg = config();
    cfg.max_advance = cfg.user_offset;
    let mut generator =
        WonderCardListGenerator::new(vec![origins()[0].clone()], params(), cfg, None).unwrap();
    for (max_candidates, max_results) in [(0, 1), (1, 0)] {
        assert!(
            generator
                .next_batch(WonderCardBatchLimits {
                    max_candidates,
                    max_results
                })
                .is_err()
        );
        assert!(!generator.is_done());
    }
    let batch = generator
        .next_batch(WonderCardBatchLimits {
            max_candidates: 1,
            max_results: 1,
        })
        .unwrap();
    assert_eq!(batch.processed_count, 1);
    assert_eq!(batch.results[0].advance, 0);
    assert!(generator.is_done());
}

#[test]
fn constructors_reject_invalid_conditions_even_without_origins() {
    for (species_id, level) in [(0, 1), (650, 1), (1, 0), (1, 101)] {
        let p = WonderCardParams {
            species_id,
            level,
            ..params()
        };
        assert!(WonderCardListGenerator::new(vec![], p, config(), None).is_err());
    }
    for p in [
        WonderCardParams {
            fixed_ivs: [Some(32); 6],
            ..params()
        },
        WonderCardParams {
            fixed_gender: Some(Gender::Genderless),
            ..params()
        },
        WonderCardParams {
            species_id: 81,
            ..params()
        },
    ] {
        assert!(WonderCardListGenerator::new(vec![], p, config(), None).is_err());
    }
    for (min, max) in [
        (10, 9),
        (0, u32::MAX),
        (u32::MAX, u32::MAX),
        (u32::MAX - 1, u32::MAX - 1),
    ] {
        let cfg = GenerationConfig {
            user_offset: min,
            max_advance: max,
            ..config()
        };
        assert!(WonderCardListGenerator::new(origins(), params(), cfg, None).is_err());
    }
    let mut cfg = config();
    cfg.game_start.save = SavePresence::NoSave;
    assert!(WonderCardListGenerator::new(vec![], params(), cfg, None).is_err());
    let mut p = search_params();
    p.gen_config.version = RomVersion::White;
    assert!(WonderCardDatetimeSearcher::new(p).is_err());
}

#[test]
fn same_seed_from_different_datetimes_is_not_deduplicated_and_egg_species_is_preserved() {
    let sources: Vec<_> = [0, 1]
        .map(|second| {
            SeedOrigin::startup(
                LcgSeed::new(0),
                Datetime::new(2024, 1, 1, 0, 0, second),
                StartupCondition::new(0xC79, 0x5A, KeyMask::NONE),
            )
        })
        .into();
    let p = WonderCardParams {
        species_id: 29,
        fixed_gender: None,
        ..params()
    };
    let rows = collect_list(sources, p, config(), None, 3, 2);
    assert_eq!(rows.len(), 20);
    assert!(rows.iter().all(|row| row.core.species_id == 29));
    assert_ne!(
        serde_json::to_value(&rows[0].source).unwrap(),
        serde_json::to_value(&rows[10].source).unwrap()
    );
}

#[test]
fn display_preserves_order_fixed_values_hidden_ability_shininess_and_startup_fields() {
    let p = WonderCardParams {
        species_id: 25,
        level: 50,
        fixed_ability_slot: Some(AbilitySlot::Hidden),
        fixed_ivs: [Some(0), Some(1), Some(2), Some(3), Some(4), Some(5)],
        shiny_policy: WonderCardShinyPolicy::Always,
        ..params()
    };
    let source = SeedOrigin::startup(
        LcgSeed::new(0),
        Datetime::new(2024, 1, 2, 3, 4, 5),
        StartupCondition::new(0xC79, 0x5A, KeyMask::NONE),
    );
    let rows = collect_list(vec![source], p, config(), None, 3, 2);
    let ui = resolve_wondercard_data_batch(rows.clone(), "en");
    assert_eq!(ui.len(), rows.len());
    for (raw, ui) in rows.iter().zip(ui) {
        assert_eq!(ui.advance, raw.advance);
        assert_eq!(ui.pid, raw.core.pid.to_hex_string());
        assert_eq!(ui.ivs, ["0", "1", "2", "3", "4", "5"]);
        assert_eq!(ui.ability_name, "Lightning Rod");
        assert!(!ui.shiny_symbol.is_empty());
        assert_eq!(ui.datetime_iso.as_deref(), Some("2024-01-02T03:04:05"));
        assert_eq!(ui.timer0.as_deref(), Some("0C79"));
        assert_eq!(ui.vcount.as_deref(), Some("5A"));
    }
}
