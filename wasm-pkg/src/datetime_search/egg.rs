//! 孵化起動時刻検索

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::generation::flows::generator::EggGenerator;
use crate::types::{
    DatetimeSearchContext, DsConfig, EggFilter, EggGenerationParams, GeneratedEggData,
    GenerationConfig, SearchRangeParams, SeedOrigin, StartupCondition, TimeRangeParams,
};

use super::base::DatetimeHashGenerator;
use super::expand_combinations;

/// 孵化起動時刻検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggDatetimeSearchParams {
    // === 起動時刻検索 ===
    /// DS 設定
    pub ds: DsConfig,
    /// 1日内の時刻範囲
    pub time_range: TimeRangeParams,
    /// 検索範囲 (秒単位)
    pub search_range: SearchRangeParams,
    /// 起動条件 (単一)
    pub condition: StartupCondition,

    // === 個体生成 ===
    /// 孵化生成パラメータ
    pub egg_params: EggGenerationParams,
    /// 生成共通設定
    pub gen_config: GenerationConfig,

    // === フィルタリング ===
    /// フィルター (None の場合は全件返却)
    pub filter: Option<EggFilter>,
}

/// 孵化検索結果
///
/// `GeneratedEggData` に起動条件 (`SeedOrigin::Startup`) が含まれるため、
/// 追加フィールドは不要。
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggDatetimeSearchResult {
    /// 生成された孵化個体データ
    ///
    /// `source` フィールドに `SeedOrigin::Startup` が格納されており、
    /// 起動日時・条件を取得可能。
    pub egg: GeneratedEggData,
}

/// バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggDatetimeSearchBatch {
    /// 見つかった結果
    pub results: Vec<EggDatetimeSearchResult>,
    /// 処理済み件数
    pub processed_count: u64,
    /// 総件数
    pub total_count: u64,
}

/// 孵化起動時刻検索器
#[wasm_bindgen]
pub struct EggDatetimeSearcher {
    /// 起動時刻とハッシュ値の生成器
    generator: DatetimeHashGenerator,
    /// 起動条件 (結果生成用)
    condition: StartupCondition,
    /// 孵化生成パラメータ
    egg_params: EggGenerationParams,
    /// 生成共通設定
    gen_config: GenerationConfig,
    /// フィルター
    filter: Option<EggFilter>,
    // 進捗管理
    total_count: u64,
    processed_count: u64,
}

#[wasm_bindgen]
impl EggDatetimeSearcher {
    /// 新しい `EggDatetimeSearcher` を作成
    ///
    /// # Errors
    ///
    /// - `time_range` のバリデーション失敗
    #[wasm_bindgen(constructor)]
    #[allow(clippy::needless_pass_by_value)]
    pub fn new(params: EggDatetimeSearchParams) -> Result<EggDatetimeSearcher, String> {
        let generator = DatetimeHashGenerator::new(
            &params.ds,
            &params.time_range,
            &params.search_range,
            params.condition,
        )?;

        // 進捗計算
        let valid_seconds_per_day = params.time_range.count_valid_seconds();
        let days = params.search_range.range_seconds.div_ceil(86400);
        let total_count = u64::from(valid_seconds_per_day) * u64::from(days);

        Ok(Self {
            generator,
            condition: params.condition,
            egg_params: params.egg_params,
            gen_config: params.gen_config,
            filter: params.filter,
            total_count,
            processed_count: 0,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.generator.is_exhausted()
    }

    #[wasm_bindgen(getter)]
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        if self.generator.is_exhausted() {
            return 1.0;
        }
        if self.total_count == 0 {
            return 1.0;
        }
        self.processed_count as f64 / self.total_count as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_count: u32) -> EggDatetimeSearchBatch {
        let mut results = Vec::new();
        let mut remaining = u64::from(chunk_count);

        while remaining > 0 && !self.generator.is_exhausted() {
            let (entries, len) = self.generator.next_quad();
            if len == 0 {
                break;
            }

            let processed = u64::from(len);
            self.processed_count += processed;
            remaining = remaining.saturating_sub(processed);

            for (datetime, hash_values) in entries.iter().take(len as usize) {
                let lcg_seed = hash_values.to_lcg_seed();
                let source = SeedOrigin::startup(lcg_seed, *datetime, self.condition);

                // EggGenerator で個体生成
                self.generate_and_filter(lcg_seed, source, &mut results);
            }
        }

        EggDatetimeSearchBatch {
            results,
            processed_count: self.processed_count,
            total_count: self.total_count,
        }
    }
}

impl EggDatetimeSearcher {
    /// 指定 Seed から孵化個体を生成し、フィルターに一致するものを追加
    fn generate_and_filter(
        &self,
        base_seed: crate::types::LcgSeed,
        source: SeedOrigin,
        results: &mut Vec<EggDatetimeSearchResult>,
    ) {
        let Ok(mut generator) =
            EggGenerator::new(base_seed, source, &self.egg_params, &self.gen_config)
        else {
            return;
        };

        // advance 範囲内の個体を生成・フィルタリング
        let advance_count = self.gen_config.max_advance - self.gen_config.user_offset;
        for _ in 0..advance_count {
            let egg = generator.generate_next();

            // フィルター判定
            let matches = match &self.filter {
                Some(filter) => filter.matches(&egg),
                None => true,
            };

            if matches {
                results.push(EggDatetimeSearchResult { egg });
            }
        }
    }
}

// ===== タスク生成関数 =====

/// タスク生成関数
///
/// `DatetimeSearchContext` から組み合わせを展開し、
/// 各 Worker に渡すパラメータを生成する。
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn generate_egg_search_tasks(
    context: DatetimeSearchContext,
    search_range: SearchRangeParams,
    egg_params: EggGenerationParams,
    gen_config: GenerationConfig,
    filter: Option<EggFilter>,
) -> Vec<EggDatetimeSearchParams> {
    // 組み合わせ展開 (共通関数を使用)
    let combinations = expand_combinations(&context);

    // タスク生成 (各組み合わせにつき1タスク)
    combinations
        .into_iter()
        .map(|condition| EggDatetimeSearchParams {
            ds: context.ds.clone(),
            time_range: context.time_range.clone(),
            search_range: search_range.clone(),
            condition,
            egg_params: egg_params.clone(),
            gen_config: gen_config.clone(),
            filter: filter.clone(),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use crate::types::{
        EverstonePlan, GameStartConfig, GenderRatio, Hardware, KeyCode, KeySpec, RomRegion,
        RomVersion, SaveState, StartMode, Timer0VCountRange, TrainerInfo,
    };

    use super::*;

    fn create_test_params() -> EggDatetimeSearchParams {
        EggDatetimeSearchParams {
            ds: DsConfig {
                mac: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56],
                hardware: Hardware::DsLite,
                version: RomVersion::Black,
                region: RomRegion::Jpn,
            },
            time_range: TimeRangeParams {
                hour_start: 0,
                hour_end: 23,
                minute_start: 0,
                minute_end: 59,
                second_start: 0,
                second_end: 59,
            },
            search_range: SearchRangeParams {
                start_year: 2023,
                start_month: 1,
                start_day: 1,
                start_second_offset: 0,
                range_seconds: 60, // Search only 60 seconds for test
            },
            condition: StartupCondition::new(0x0C79, 0x5A, KeyCode::NONE),
            egg_params: EggGenerationParams {
                trainer: TrainerInfo {
                    tid: 12345,
                    sid: 54321,
                },
                everstone: EverstonePlan::None,
                female_has_hidden: false,
                uses_ditto: false,
                gender_ratio: GenderRatio::F1M1,
                nidoran_flag: false,
                masuda_method: false,
                parent_male: [31, 31, 31, 31, 31, 31].into(),
                parent_female: [31, 31, 31, 31, 31, 31].into(),
                consider_npc: false,
            },
            gen_config: GenerationConfig {
                version: RomVersion::Black,
                game_start: GameStartConfig {
                    start_mode: StartMode::NewGame,
                    save_state: SaveState::NoSave,
                },
                user_offset: 0,
                max_advance: 100,
            },
            filter: None,
        }
    }

    #[test]
    fn test_searcher_creation() {
        let params = create_test_params();
        let searcher = EggDatetimeSearcher::new(params);
        assert!(searcher.is_ok());
    }

    #[test]
    fn test_searcher_progress() {
        let params = create_test_params();
        let searcher = EggDatetimeSearcher::new(params).unwrap();
        // Initial progress should be 0
        assert!(searcher.progress() >= 0.0);
        assert!(searcher.progress() <= 1.0);
    }

    #[test]
    fn test_generate_egg_search_tasks() {
        let context = DatetimeSearchContext {
            ds: DsConfig {
                mac: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56],
                hardware: Hardware::DsLite,
                version: RomVersion::Black,
                region: RomRegion::Jpn,
            },
            time_range: TimeRangeParams {
                hour_start: 0,
                hour_end: 23,
                minute_start: 0,
                minute_end: 59,
                second_start: 0,
                second_end: 59,
            },
            ranges: vec![Timer0VCountRange {
                timer0_min: 0x0C79,
                timer0_max: 0x0C79,
                vcount_min: 0x5A,
                vcount_max: 0x5A,
            }],
            key_spec: KeySpec::from_buttons(vec![]),
        };

        let search_range = SearchRangeParams {
            start_year: 2023,
            start_month: 1,
            start_day: 1,
            start_second_offset: 0,
            range_seconds: 60,
        };

        let egg_params = EggGenerationParams {
            trainer: TrainerInfo {
                tid: 12345,
                sid: 54321,
            },
            everstone: EverstonePlan::None,
            female_has_hidden: false,
            uses_ditto: false,
            gender_ratio: GenderRatio::F1M1,
            nidoran_flag: false,
            masuda_method: false,
            parent_male: [31, 31, 31, 31, 31, 31].into(),
            parent_female: [31, 31, 31, 31, 31, 31].into(),
            consider_npc: false,
        };

        let gen_config = GenerationConfig {
            version: RomVersion::Black,
            game_start: GameStartConfig {
                start_mode: StartMode::NewGame,
                save_state: SaveState::NoSave,
            },
            user_offset: 0,
            max_advance: 100,
        };

        let tasks = generate_egg_search_tasks(context, search_range, egg_params, gen_config, None);

        // 1 timer0 × 1 vcount × 1 key = 1 task
        assert_eq!(tasks.len(), 1);
    }

    #[test]
    fn test_batch_processing() {
        let params = create_test_params();
        let mut searcher = EggDatetimeSearcher::new(params).unwrap();

        let batch = searcher.next_batch(10);
        assert!(batch.processed_count > 0);
        assert!(batch.total_count > 0);
    }
}
