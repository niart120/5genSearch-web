//! 配達員の検証済み条件、単一 Seed 列挙、一覧・日時検索共通のバッチ処理。

use std::iter::Peekable;

#[cfg(test)]
thread_local! { static PREPARED_COUNT: std::cell::Cell<u32> = const { std::cell::Cell::new(0) }; }

use crate::core::lcg::Lcg64;
use crate::data::{calculate_stats, get_species_entry};
use crate::generation::algorithm::{calc_report_needle_direction, calculate_game_offset};
use crate::generation::flows::types::GenerationError;
use crate::generation::flows::wondercard::{
    WonderCardGenerationParams, generate_wondercard_pokemon,
};
use crate::types::{
    CoreDataFilter, CoreFilterInput, CorePokemonData, GeneratedWonderCardData, GenerationConfig,
    SeedOrigin, WonderCardBatchLimits, WonderCardParams, WonderCardSearchBatch,
};

/// フィールドは非公開にし、公開入力の検証を構築時に集約する。
#[derive(Clone, Debug)]
pub(crate) struct PreparedWonderCardParams {
    generation: WonderCardGenerationParams,
    species_id: u16,
    level: u8,
}

impl TryFrom<WonderCardParams> for PreparedWonderCardParams {
    type Error = GenerationError;

    fn try_from(params: WonderCardParams) -> Result<Self, Self::Error> {
        #[cfg(test)]
        PREPARED_COUNT.with(|count| count.set(count.get() + 1));
        if !(1..=649).contains(&params.species_id) || !(1..=100).contains(&params.level) {
            return Err(GenerationError::InvalidConfig(
                "Invalid species or level".into(),
            ));
        }
        let generation = WonderCardGenerationParams::new(
            params.trainer,
            get_species_entry(params.species_id).gender_ratio,
            params.fixed_ivs,
            params.fixed_nature,
            params.fixed_gender,
            params.fixed_ability_slot,
            params.shiny_policy,
        )?;
        Ok(Self {
            generation,
            species_id: params.species_id,
            level: params.level,
        })
    }
}

/// 起動時消費を除いた閉区間を、一回につき一候補進める。
pub(crate) struct WonderCardGenerator {
    lcg: Lcg64,
    game_offset: u32,
    user_offset: u32,
    current_advance: u32,
    max_advance: u32,
    source: SeedOrigin,
    params: PreparedWonderCardParams,
    filter: Option<CoreDataFilter>,
}

impl WonderCardGenerator {
    pub(crate) fn new(
        source: SeedOrigin,
        params: &PreparedWonderCardParams,
        config: &GenerationConfig,
        filter: Option<&CoreDataFilter>,
    ) -> Result<Self, GenerationError> {
        let game_offset =
            calculate_game_offset(source.base_seed(), config.version, config.game_start)
                .map_err(GenerationError::InvalidConfig)?;
        let total_offset = config
            .initial_advance(game_offset)
            .map_err(GenerationError::InvalidConfig)?;
        let mut lcg = Lcg64::new(source.base_seed());
        lcg.jump(u64::from(total_offset));
        Ok(Self {
            lcg,
            game_offset,
            user_offset: config.user_offset,
            current_advance: config.user_offset,
            max_advance: config.max_advance,
            source,
            params: params.clone(),
            filter: filter.cloned(),
        })
    }

    pub(crate) fn current_advance(&self) -> u32 {
        self.current_advance
    }

    // 単一 Seed の検証・将来の画面接続に使う Generator 共通 API。
    #[allow(dead_code)]
    pub(crate) fn game_offset(&self) -> u32 {
        self.game_offset
    }

    #[allow(dead_code)]
    pub(crate) fn total_offset(&self) -> u32 {
        self.game_offset + self.user_offset
    }

    pub(crate) fn generate_next(&mut self) -> Option<GeneratedWonderCardData> {
        if self.current_advance > self.max_advance {
            return None;
        }
        let advance = self.current_advance;
        let needle_direction = calc_report_needle_direction(self.lcg.current_seed());
        let raw = generate_wondercard_pokemon(&mut self.lcg.clone(), &self.params.generation);
        self.lcg.next();
        self.current_advance += 1;
        if self.filter.as_ref().is_some_and(|filter| {
            !filter.matches_non_iv(CoreFilterInput {
                nature: raw.nature,
                gender: raw.gender,
                ability_slot: raw.ability_slot,
                shiny_type: raw.shiny_type,
            }) || !filter.matches_ivs(raw.ivs)
        }) {
            return None;
        }
        let stats = calculate_stats(
            get_species_entry(self.params.species_id).base_stats,
            raw.ivs,
            raw.nature,
            self.params.level,
        );
        if self
            .filter
            .as_ref()
            .is_some_and(|filter| !filter.matches_stats(&stats))
        {
            return None;
        }
        Some(GeneratedWonderCardData {
            advance,
            needle_direction,
            source: self.source.clone(),
            core: CorePokemonData {
                pid: raw.pid,
                nature: raw.nature,
                ability_slot: raw.ability_slot,
                gender: raw.gender,
                shiny_type: raw.shiny_type,
                ivs: raw.ivs,
                stats,
                species_id: self.params.species_id,
                level: self.params.level,
            },
        })
    }

    #[allow(dead_code)]
    pub(crate) fn take(&mut self, count: u32) -> Vec<GeneratedWonderCardData> {
        let remaining = (self.max_advance + 1).saturating_sub(self.current_advance);
        (0..count.min(remaining))
            .filter_map(|_| self.generate_next())
            .collect()
    }
}

/// Seed の供給方法だけを差し替える配達員専用バッチ。
pub(crate) struct WonderCardBatchGenerator<S: Iterator<Item = SeedOrigin>> {
    origins: Peekable<S>,
    current: Option<WonderCardGenerator>,
    params: PreparedWonderCardParams,
    config: GenerationConfig,
    filter: Option<CoreDataFilter>,
    processed_count: u64,
    total_count: u64,
}

impl<S: Iterator<Item = SeedOrigin>> WonderCardBatchGenerator<S> {
    pub(crate) fn new(
        origins: S,
        origin_count: u64,
        params: WonderCardParams,
        config: GenerationConfig,
        filter: Option<CoreDataFilter>,
    ) -> Result<Self, GenerationError> {
        config
            .game_start
            .validate(config.version)
            .map_err(GenerationError::InvalidConfig)?;
        let count = config
            .advance_count()
            .map_err(GenerationError::InvalidConfig)?;
        let total_count = origin_count
            .checked_mul(u64::from(count))
            .ok_or_else(|| GenerationError::InvalidConfig("Search count overflow".into()))?;
        let mut batch = Self {
            origins: origins.peekable(),
            current: None,
            params: params.try_into()?,
            config,
            filter,
            processed_count: 0,
            total_count,
        };
        if !batch.is_done() {
            batch.prepare_current()?;
        }
        Ok(batch)
    }

    pub(crate) fn is_done(&self) -> bool {
        self.processed_count == self.total_count
    }

    fn prepare_current(&mut self) -> Result<(), GenerationError> {
        if self.current.is_some() {
            return Ok(());
        }
        if let Some(source) = self.origins.peek() {
            // 初期化に失敗してもこの Origin を失わず、呼び出し元へエラーを返す。
            self.current = Some(WonderCardGenerator::new(
                source.clone(),
                &self.params,
                &self.config,
                self.filter.as_ref(),
            )?);
            self.origins.next();
        }
        Ok(())
    }

    pub(crate) fn next_batch(
        &mut self,
        limits: WonderCardBatchLimits,
    ) -> Result<WonderCardSearchBatch, GenerationError> {
        if limits.max_candidates == 0 || limits.max_results == 0 {
            return Err(GenerationError::InvalidConfig(
                "Batch limits must be positive".into(),
            ));
        }
        let mut results = Vec::new();
        let mut attempts = 0;
        while !self.is_done()
            && attempts < limits.max_candidates
            && results.len() < limits.max_results as usize
        {
            self.prepare_current()?;
            let Some(generator) = self.current.as_mut() else {
                return Err(GenerationError::InvalidConfig(
                    "Seed source exhausted before total count".into(),
                ));
            };
            if let Some(data) = generator.generate_next() {
                results.push(data);
            }
            attempts += 1;
            self.processed_count += 1;
            if generator.current_advance() > self.config.max_advance {
                self.current = None;
            }
        }
        Ok(WonderCardSearchBatch {
            results,
            processed_count: self.processed_count,
            total_count: self.total_count,
        })
    }
}

pub(crate) type WonderCardListGenerator = WonderCardBatchGenerator<std::vec::IntoIter<SeedOrigin>>;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;

    fn params() -> WonderCardParams {
        WonderCardParams {
            trainer: TrainerInfo {
                tid: 12345,
                sid: 54321,
            },
            species_id: 25,
            level: 50,
            fixed_ivs: [None; 6],
            fixed_nature: None,
            fixed_gender: None,
            fixed_ability_slot: None,
            shiny_policy: WonderCardShinyPolicy::Random,
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
            user_offset: 57,
            max_advance: 57,
        }
    }

    #[test]
    fn local_123_fixed_expected_value_connects_without_consuming_card_preprocessing_at_initialization()
     {
        // 0x123456789ABCDEF0 を LCG の逆漸化式で 100 回戻した値。
        // 起動時消費 43 + user_offset 57 の位置で local_123 の第1ケースと一致する。
        let prepared = params().try_into().unwrap();
        let mut generator = WonderCardGenerator::new(
            SeedOrigin::seed(LcgSeed::new(0x5350_281A_0168_543C)),
            &prepared,
            &config(),
            None,
        )
        .unwrap();
        assert_eq!(generator.game_offset(), 43);
        assert_eq!(generator.total_offset(), 100);
        let rows = generator.take(100);
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].advance, 57);
        assert_eq!(rows[0].core.pid, Pid(0xE9A9_2FBC));
        assert_eq!(rows[0].core.ivs.to_array(), [17, 16, 22, 19, 14, 24]);
        assert_eq!(rows[0].core.nature, Nature::Relaxed);
        assert_eq!(
            rows[0].needle_direction,
            calc_report_needle_direction(LcgSeed::new(0x1234_5678_9ABC_DEF0))
        );
        assert!(generator.take(1).is_empty());
        assert_eq!(generator.current_advance(), 58);
    }

    #[test]
    fn prepared_conditions_are_constructed_once_across_seed_and_batch_boundaries() {
        let cfg = GenerationConfig {
            user_offset: 0,
            max_advance: 5,
            ..config()
        };
        let before = PREPARED_COUNT.get();
        let mut batch = WonderCardBatchGenerator::new(
            (0..3).map(|s| SeedOrigin::seed(LcgSeed::new(s))),
            3,
            params(),
            cfg,
            Some(CoreDataFilter {
                gender: Some(Gender::Genderless),
                ..CoreDataFilter::any()
            }),
        )
        .unwrap();
        while !batch.is_done() {
            let result = batch
                .next_batch(WonderCardBatchLimits {
                    max_candidates: 2,
                    max_results: 1,
                })
                .unwrap();
            assert!(result.results.is_empty());
        }
        assert_eq!(batch.processed_count, 18);
        assert_eq!(PREPARED_COUNT.get() - before, 1);
    }

    #[test]
    fn total_count_overflow_is_rejected_without_iterating_origins() {
        let cfg = GenerationConfig {
            user_offset: 0,
            max_advance: 1,
            ..config()
        };
        assert!(
            matches!(WonderCardBatchGenerator::new(std::iter::empty(), u64::MAX,
            params(), cfg, None), Err(GenerationError::InvalidConfig(message)) if message == "Search count overflow")
        );
    }

    #[test]
    fn initialization_failure_on_a_later_seed_is_propagated_without_skipping_it() {
        let mut seeds: Vec<_> = (0..100)
            .map(|seed| {
                let source = SeedOrigin::seed(LcgSeed::new(seed));
                let offset = calculate_game_offset(
                    source.base_seed(),
                    config().version,
                    config().game_start,
                )
                .unwrap();
                (offset, source)
            })
            .collect();
        seeds.sort_by_key(|(offset, _)| *offset);
        let (small, first) = seeds.first().unwrap();
        let (large, second) = seeds.last().unwrap();
        assert!(small < large);
        let position = u32::MAX - large + 1;
        let cfg = GenerationConfig {
            user_offset: position,
            max_advance: position,
            ..config()
        };
        let mut batch = WonderCardBatchGenerator::new(
            vec![first.clone(), second.clone()].into_iter(),
            2,
            params(),
            cfg,
            None,
        )
        .unwrap();
        let limits = WonderCardBatchLimits {
            max_candidates: 1,
            max_results: 1,
        };
        assert_eq!(batch.next_batch(limits).unwrap().processed_count, 1);
        for _ in 0..2 {
            assert!(batch.next_batch(limits).is_err());
            assert_eq!(batch.processed_count, 1);
            assert!(!batch.is_done());
        }
    }
}
