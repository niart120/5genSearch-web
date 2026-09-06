//! 個体値非依存条件による起動日時・消費位置検索。

use std::collections::VecDeque;
use wasm_bindgen::prelude::*;

use super::base::DatetimeHashGenerator;
use super::{calculate_time_chunks, expand_combinations};
use crate::core::datetime::DatetimeSearchSpace;
use crate::generation::flows::generator::PokemonGenerator;
use crate::types::{
    DatetimeSearchContext, EncounterType, GenerationConfig, PokemonDatetimeSearchBatch,
    PokemonDatetimeSearchFilter, PokemonDatetimeSearchParams, PokemonFilter,
    PokemonGenerationParams, PokemonSearchBatchLimits, SeedOrigin, StartupCondition,
};

/// 日時の4件取得と消費位置の双方をバッチ間で保持する。
#[wasm_bindgen]
pub struct PokemonDatetimeSearcher {
    datetime: DatetimeHashGenerator,
    pending: VecDeque<SeedOrigin>,
    current: Option<PokemonGenerator>,
    condition: StartupCondition,
    pokemon_params: PokemonGenerationParams,
    gen_config: GenerationConfig,
    filter: PokemonFilter,
    processed_count: u64,
    total_count: u64,
}

#[wasm_bindgen]
impl PokemonDatetimeSearcher {
    /// # Errors
    /// 不正な日時・生成条件・検索条件を拒否する。
    #[wasm_bindgen(constructor)]
    pub fn new(params: PokemonDatetimeSearchParams) -> Result<Self, String> {
        validate_params(&params)?;
        let space = DatetimeSearchSpace::try_from(params.search_space.clone())?;
        let count = space.count();
        let total_count = count
            .checked_mul(u64::from(
                params.gen_config.max_advance - params.gen_config.user_offset,
            ))
            .ok_or("Search count overflow")?;
        let datetime = DatetimeHashGenerator::new(&params.ds, &space, params.condition);
        let mut searcher = Self {
            datetime,
            pending: VecDeque::with_capacity(4),
            current: None,
            condition: params.condition,
            pokemon_params: params.pokemon_params,
            gen_config: params.gen_config,
            filter: (&params.filter).into(),
            processed_count: 0,
            total_count,
        };
        if total_count > 0 {
            searcher.prepare_current()?;
        }
        Ok(searcher)
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.gen_config.user_offset == self.gen_config.max_advance
            || (self.datetime.is_exhausted() && self.pending.is_empty() && self.current.is_none())
    }

    /// # Errors
    /// バッチ上限が0、または起動時の生成器初期化に失敗した場合。
    pub fn next_batch(
        &mut self,
        limits: PokemonSearchBatchLimits,
    ) -> Result<PokemonDatetimeSearchBatch, String> {
        if limits.max_candidates == 0 || limits.max_results == 0 {
            return Err("Batch limits must be positive".into());
        }
        let mut results = Vec::new();
        let mut attempts = 0;
        while !self.is_done()
            && attempts < limits.max_candidates
            && results.len() < limits.max_results as usize
        {
            self.prepare_current()?;
            let Some(generator) = self.current.as_mut() else {
                break;
            };
            if let Some(data) = generator.generate_next() {
                results.push(data);
            }
            attempts += 1;
            self.processed_count += 1;
            if generator.current_advance() == self.gen_config.max_advance {
                self.current = None;
            }
        }
        Ok(PokemonDatetimeSearchBatch {
            results,
            processed_count: self.processed_count,
            total_count: self.total_count,
        })
    }
}

impl PokemonDatetimeSearcher {
    fn prepare_current(&mut self) -> Result<(), String> {
        if self.current.is_some() {
            return Ok(());
        }
        if self.pending.is_empty() {
            let (entries, len) = self.datetime.next_quad();
            self.pending
                .extend(entries.iter().take(usize::from(len)).map(|(date, hash)| {
                    SeedOrigin::startup(hash.to_lcg_seed(), *date, self.condition)
                }));
        }
        let Some(source) = self.pending.pop_front() else {
            return Ok(());
        };
        self.current = Some(PokemonGenerator::new(
            source,
            &self.pokemon_params,
            &self.gen_config,
            Some(&self.filter),
        )?);
        Ok(())
    }
}

fn validate_params(params: &PokemonDatetimeSearchParams) -> Result<(), String> {
    params.filter.validate()?;
    if params.ds.version != params.gen_config.version {
        return Err("ROM version mismatch".into());
    }
    params.gen_config.game_start.validate(params.ds.version)?;
    if params.gen_config.user_offset > params.gen_config.max_advance
        || params.gen_config.max_advance == u32::MAX
    {
        return Err("Invalid advance range".into());
    }
    // HiddenGrotto は既存共通生成器のディスパッチ対象外。Egg は孵化検索を使う。
    if matches!(
        params.pokemon_params.encounter_type,
        EncounterType::Egg | EncounterType::HiddenGrotto
    ) {
        return Err("Unsupported encounter type".into());
    }
    let static_encounter = matches!(
        params.pokemon_params.encounter_type,
        EncounterType::StaticSymbol
            | EncounterType::StaticStarter
            | EncounterType::StaticFossil
            | EncounterType::StaticEvent
            | EncounterType::Roamer
    );
    let slots = &params.pokemon_params.slots;
    if slots.is_empty() || (static_encounter && slots.len() != 1) {
        return Err("Invalid encounter slot count".into());
    }
    if slots.iter().any(|slot| {
        !(1..=649).contains(&slot.species_id)
            || slot.level_min == 0
            || slot.level_min > slot.level_max
            || slot.level_max > 100
    }) {
        return Err("Invalid encounter slot".into());
    }
    if params.condition.key_mask.0 > 0xFFF {
        return Err("Invalid key mask".into());
    }
    Ok(())
}

/// 検証済み条件を既存の起動条件展開・日時分割でタスク化する。
/// # Errors
/// 日付・起動範囲・生成条件・Worker数が不正な場合。
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn generate_pokemon_search_tasks(
    context: DatetimeSearchContext,
    pokemon_params: PokemonGenerationParams,
    gen_config: GenerationConfig,
    filter: PokemonDatetimeSearchFilter,
    worker_count: u32,
) -> Result<Vec<PokemonDatetimeSearchParams>, JsValue> {
    build_tasks(context, pokemon_params, gen_config, filter, worker_count)
        .map_err(|error| JsValue::from_str(&error))
}

fn build_tasks(
    context: DatetimeSearchContext,
    pokemon_params: PokemonGenerationParams,
    gen_config: GenerationConfig,
    filter: PokemonDatetimeSearchFilter,
    worker_count: u32,
) -> Result<Vec<PokemonDatetimeSearchParams>, String> {
    let space = DatetimeSearchSpace::from_date_range(&context.date_range, &context.time_range)?;
    if worker_count == 0
        || context.ranges.is_empty()
        || context
            .ranges
            .iter()
            .any(|range| range.timer0_min > range.timer0_max || range.vcount_min > range.vcount_max)
    {
        return Err("Invalid startup ranges or worker count".into());
    }
    let combinations = expand_combinations(&context);
    let combo_count =
        u32::try_from(combinations.len()).map_err(|_| "Too many startup conditions")?;
    let spaces = space.split(calculate_time_chunks(combo_count, worker_count)?);
    let template = PokemonDatetimeSearchParams {
        ds: context.ds,
        search_space: spaces[0].clone().into_params(),
        condition: combinations[0],
        pokemon_params,
        gen_config,
        filter,
    };
    validate_params(&template)?;
    Ok(combinations
        .into_iter()
        .flat_map(|condition| {
            spaces
                .iter()
                .map(|space| PokemonDatetimeSearchParams {
                    condition,
                    search_space: space.clone().into_params(),
                    ..template.clone()
                })
                .collect::<Vec<_>>()
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::seed_resolver::resolve_seeds;
    use crate::generation::flows::generator::generate_pokemon_list;
    use crate::types::*;

    fn params() -> PokemonDatetimeSearchParams {
        PokemonDatetimeSearchParams {
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
            pokemon_params: PokemonGenerationParams {
                trainer: TrainerInfo {
                    tid: 12345,
                    sid: 54321,
                },
                encounter_type: EncounterType::StaticSymbol,
                encounter_method: EncounterMethod::Stationary,
                lead_ability: LeadAbilityEffect::None,
                slots: vec![EncounterSlotConfig {
                    species_id: 25,
                    level_min: 5,
                    level_max: 10,
                    gender_ratio: GenderRatio::F1M1,
                    has_held_item: true,
                    shiny_locked: false,
                }],
            },
            gen_config: GenerationConfig {
                version: RomVersion::Black,
                game_start: GameStartConfig {
                    start_mode: StartMode::Continue,
                    save: SavePresence::WithSave,
                    memory_link: MemoryLinkState::Disabled,
                    shiny_charm: ShinyCharmState::NotObtained,
                },
                user_offset: 6,
                max_advance: 30,
            },
            filter: PokemonDatetimeSearchFilter::default(),
        }
    }

    // SIMD日時列挙を使わず、暦日を指定した既存Seed解決と一括生成を基準とする。
    fn reference(params: &PokemonDatetimeSearchParams) -> Vec<GeneratedPokemonData> {
        let mut results = Vec::new();
        let dates = [
            (2024, 2, 29, 23, 59, 57),
            (2024, 2, 29, 23, 59, 58),
            (2024, 2, 29, 23, 59, 59),
            (2024, 3, 1, 0, 0, 0),
            (2024, 3, 1, 0, 0, 1),
            (2024, 3, 1, 0, 0, 2),
            (2024, 3, 1, 0, 0, 3),
        ];
        for (y, m, d, h, min, sec) in dates {
            let origins = resolve_seeds(SeedSpec::Startup {
                ds: params.ds.clone(),
                datetime: Datetime::new(y, m, d, h, min, sec),
                ranges: vec![Timer0VCountRange {
                    timer0_min: params.condition.timer0,
                    timer0_max: params.condition.timer0,
                    vcount_min: params.condition.vcount,
                    vcount_max: params.condition.vcount,
                }],
                key_input: KeyInput { buttons: vec![] },
            })
            .unwrap();
            let data = generate_pokemon_list(
                origins,
                params.pokemon_params.clone(),
                params.gen_config.clone(),
                None,
            )
            .unwrap();
            let filter = PokemonFilter::from(&params.filter);
            results.extend(data.into_iter().filter(|data| filter.matches(data)));
        }
        results
    }

    fn collect(
        params: PokemonDatetimeSearchParams,
        candidates: u32,
        max_results: u32,
    ) -> Vec<GeneratedPokemonData> {
        let mut searcher = PokemonDatetimeSearcher::new(params).unwrap();
        let mut results = Vec::new();
        let mut prev = 0;
        while !searcher.is_done() {
            let batch = searcher
                .next_batch(PokemonSearchBatchLimits {
                    max_candidates: candidates,
                    max_results,
                })
                .unwrap();
            assert!(
                batch.processed_count > prev
                    && batch.processed_count - prev <= u64::from(candidates)
            );
            assert!(batch.results.len() <= max_results as usize);
            prev = batch.processed_count;
            results.extend(batch.results);
        }
        assert_eq!(searcher.processed_count, searcher.total_count);
        let done = searcher
            .next_batch(PokemonSearchBatchLimits {
                max_candidates: 1,
                max_results: 1,
            })
            .unwrap();
        assert!(done.results.is_empty());
        results
    }

    #[test]
    fn resumes_at_every_boundary_without_losing_quad_entries() {
        let expected = serde_json::to_string(&reference(&params())).unwrap();
        for candidates in [1, 4, 1024] {
            for max_results in [1, 256] {
                let result = collect(params(), candidates, max_results);
                assert_eq!(serde_json::to_string(&result).unwrap(), expected);
            }
        }
    }

    #[test]
    fn encounters_and_generation_settings_match_existing_lists() {
        for encounter in [
            EncounterType::Normal,
            EncounterType::ShakingGrass,
            EncounterType::DustCloud,
            EncounterType::PokemonShadow,
            EncounterType::Surfing,
            EncounterType::SurfingBubble,
            EncounterType::Fishing,
            EncounterType::FishingBubble,
            EncounterType::StaticSymbol,
            EncounterType::StaticStarter,
            EncounterType::StaticFossil,
            EncounterType::StaticEvent,
            EncounterType::Roamer,
        ] {
            for version in [RomVersion::Black, RomVersion::Black2] {
                let mut params = params();
                params.ds.version = version;
                params.gen_config.version = version;
                if version.is_bw2() {
                    params.gen_config.game_start.memory_link = MemoryLinkState::Enabled;
                    params.gen_config.game_start.shiny_charm = ShinyCharmState::Obtained;
                }
                params.pokemon_params.encounter_type = encounter;
                params.pokemon_params.encounter_method = EncounterMethod::Moving;
                params.pokemon_params.lead_ability = LeadAbilityEffect::Synchronize(Nature::Jolly);
                let expected = reference(&params);
                let actual = collect(params, 4, 1);
                assert_eq!(
                    serde_json::to_string(&actual).unwrap(),
                    serde_json::to_string(&expected).unwrap(),
                    "{encounter:?}/{version:?}"
                );
                assert!(
                    actual
                        .iter()
                        .all(|data| data.encounter_result == EncounterResult::Pokemon)
                );
            }
        }
    }

    #[test]
    fn six_conditions_are_anded_with_or_selections_and_inclusive_levels() {
        let p = params();
        let first = &reference(&p)[0];
        for filter in [
            PokemonDatetimeSearchFilter {
                shiny: Some(ShinyFilter::Shiny),
                ..Default::default()
            },
            PokemonDatetimeSearchFilter {
                natures: Some(vec![first.core.nature, Nature::Jolly]),
                species_ids: Some(vec![25, 1]),
                gender: Some(first.core.gender),
                ability_slot: Some(first.core.ability_slot),
                level_range: Some((first.core.level, first.core.level)),
                ..Default::default()
            },
            PokemonDatetimeSearchFilter {
                natures: Some(vec![]),
                species_ids: Some(vec![]),
                ..Default::default()
            },
        ] {
            let mut p = params();
            p.filter = filter;
            let expected = reference(&p);
            assert_eq!(
                serde_json::to_string(&collect(p, 1, 1)).unwrap(),
                serde_json::to_string(&expected).unwrap()
            );
        }
    }

    #[test]
    fn partial_days_and_zero_spaces_have_exact_totals() {
        let mut p = params();
        p.search_space.time_range.second_start = 1;
        p.search_space.time_range.second_end = 2;
        assert_eq!(
            PokemonDatetimeSearcher::new(p.clone()).unwrap().total_count,
            48
        );
        p.search_space.time_range.hour_start = 12;
        p.search_space.time_range.hour_end = 12;
        let searcher = PokemonDatetimeSearcher::new(p).unwrap();
        assert!(searcher.is_done());
        assert_eq!(searcher.total_count, 0);
        let mut p = params();
        p.gen_config.max_advance = p.gen_config.user_offset;
        assert!(PokemonDatetimeSearcher::new(p).unwrap().is_done());
        let mut p = params();
        p.search_space.end_seconds = p.search_space.start_seconds;
        assert!(PokemonDatetimeSearcher::new(p).unwrap().is_done());
    }

    #[test]
    fn shiny_types_and_locks_match_existing_generation() {
        let mut p = params();
        p.pokemon_params.encounter_type = EncounterType::Roamer;
        let pid = reference(&p)[0].core.pid.0;
        for (xor, filter, expected_type) in [
            (0, ShinyFilter::Square, ShinyType::Square),
            (1, ShinyFilter::Star, ShinyType::Star),
        ] {
            p.pokemon_params.trainer.tid =
                ((pid >> 16) as u16) ^ u16::try_from(pid & 0xFFFF).unwrap() ^ xor;
            p.pokemon_params.trainer.sid = 0;
            p.filter.shiny = Some(filter);
            let expected = reference(&p);
            assert!(!expected.is_empty());
            assert_eq!(expected[0].core.shiny_type, expected_type);
            assert_eq!(
                serde_json::to_string(&collect(p.clone(), 4, 1)).unwrap(),
                serde_json::to_string(&expected).unwrap()
            );
        }
        p.pokemon_params.slots[0].shiny_locked = true;
        p.filter.shiny = Some(ShinyFilter::Shiny);
        assert!(reference(&p).is_empty());
        assert!(collect(p, 1, 1).is_empty());
    }

    #[test]
    fn rejects_invalid_input_instead_of_reporting_no_matches() {
        let modifications: Vec<fn(&mut PokemonDatetimeSearchParams)> = vec![
            |p| p.ds.version = RomVersion::White,
            |p| p.search_space.start_seconds = u32::MAX,
            |p| p.search_space.end_seconds = 0,
            |p| p.search_space.start_seconds = p.search_space.end_seconds + 1,
            |p| p.search_space.end_seconds = u32::MAX,
            |p| p.search_space.time_range.second_end = 60,
            |p| p.gen_config.max_advance = 5,
            |p| p.gen_config.max_advance = u32::MAX,
            |p| p.pokemon_params.slots.clear(),
            |p| {
                p.pokemon_params
                    .slots
                    .push(p.pokemon_params.slots[0].clone());
            },
            |p| p.pokemon_params.encounter_type = EncounterType::Egg,
            |p| p.pokemon_params.encounter_type = EncounterType::HiddenGrotto,
            |p| p.pokemon_params.slots[0].species_id = 650,
            |p| p.filter.level_range = Some((10, 9)),
            |p| p.filter.level_range = Some((0, 100)),
            |p| p.filter.species_ids = Some(vec![0]),
        ];
        for modify in modifications {
            let mut p = params();
            modify(&mut p);
            assert!(PokemonDatetimeSearcher::new(p).is_err());
        }
        let mut searcher = PokemonDatetimeSearcher::new(params()).unwrap();
        assert!(
            searcher
                .next_batch(PokemonSearchBatchLimits {
                    max_candidates: 0,
                    max_results: 1
                })
                .is_err()
        );
        assert!(
            searcher
                .next_batch(PokemonSearchBatchLimits {
                    max_candidates: 1,
                    max_results: 0
                })
                .is_err()
        );
        assert_eq!(searcher.processed_count, 0);
    }

    #[test]
    #[ignore = "release ビルドで手動実行する性能測定"]
    fn measure_datetime_pipeline() {
        use std::time::{Duration, Instant};
        fn measure(p: PokemonDatetimeSearchParams, condition: &str) {
            let encounter = p.pokemon_params.encounter_type;
            let n = p.search_space.end_seconds - p.search_space.start_seconds;
            let a = p.gen_config.max_advance;
            let start = Instant::now();
            let mut searcher = PokemonDatetimeSearcher::new(p).unwrap();
            let mut max_batch = Duration::ZERO;
            let mut matches = 0;
            while !searcher.is_done() {
                let batch_start = Instant::now();
                let batch = searcher
                    .next_batch(PokemonSearchBatchLimits {
                        max_candidates: 1024,
                        max_results: 256,
                    })
                    .unwrap();
                max_batch = max_batch.max(batch_start.elapsed());
                matches += batch.results.len();
            }
            println!(
                "{encounter:?},{n},{a},{condition},{:.3},{:.3},{matches}",
                start.elapsed().as_secs_f64() * 1000.0,
                max_batch.as_secs_f64() * 1000.0
            );
        }
        if let Ok(condition) = std::env::var("POKEMON_PERF_CONDITION") {
            let mut p = params();
            p.search_space.start_seconds = 762_480_000;
            p.search_space.end_seconds = p.search_space.start_seconds + 10000;
            p.gen_config.user_offset = 0;
            p.gen_config.max_advance = 1000;
            if condition == "none" {
                p.filter.species_ids = Some(vec![1]);
            }
            measure(p, &condition);
            return;
        }
        println!("encounter,N,A,condition,elapsed_ms,max_batch_ms,matches");
        for encounter in [
            EncounterType::Roamer,
            EncounterType::StaticSymbol,
            EncounterType::Normal,
        ] {
            for n in [1000, 10000] {
                for a in [30, 1000, 10000] {
                    let mut p = params();
                    p.search_space.start_seconds = 762_480_000;
                    p.search_space.end_seconds = p.search_space.start_seconds + n;
                    p.gen_config.user_offset = 0;
                    p.gen_config.max_advance = a;
                    p.pokemon_params.encounter_type = encounter;
                    p.filter.shiny = Some(ShinyFilter::Shiny);
                    measure(p, "shiny");
                }
            }
            for condition in [
                "all", "none", "nature", "species", "gender", "ability", "level",
            ] {
                let mut p = params();
                p.search_space.start_seconds = 762_480_000;
                p.search_space.end_seconds = p.search_space.start_seconds + 1000;
                p.gen_config.user_offset = 0;
                p.gen_config.max_advance = 30;
                p.pokemon_params.encounter_type = encounter;
                match condition {
                    "none" => p.filter.species_ids = Some(vec![1]),
                    "nature" => p.filter.natures = Some(vec![Nature::Jolly]),
                    "species" => p.filter.species_ids = Some(vec![25]),
                    "gender" => p.filter.gender = Some(Gender::Female),
                    "ability" => p.filter.ability_slot = Some(AbilitySlot::First),
                    "level" => p.filter.level_range = Some((5, 5)),
                    _ => {}
                }
                measure(p, condition);
            }
        }
    }
}
