//! `TrainerInfo` 起動時刻検索
//!
//! 指定した TID/SID/`ShinyPID` 条件を満たす起動時刻を検索する。

use wasm_bindgen::prelude::*;

use crate::core::offset::calculate_trainer_info;
use crate::types::{
    DatetimeSearchContext, DsConfig, GameStartConfig, SeedOrigin, ShinyType, StartMode,
    StartupCondition, TrainerInfoFilter, TrainerInfoSearchBatch, TrainerInfoSearchParams,
    TrainerInfoSearchResult,
};

use super::base::DatetimeHashGenerator;
use super::{calculate_time_chunks, expand_combinations, split_search_range};

// ===== TrainerInfoSearcher =====

/// `TrainerInfo` 起動時刻検索器
#[wasm_bindgen]
pub struct TrainerInfoSearcher {
    /// 検索フィルタ
    filter: TrainerInfoFilter,
    /// 起動時刻とハッシュ値の生成器
    generator: DatetimeHashGenerator,
    /// 起動条件 (結果生成用)
    condition: StartupCondition,
    /// DS 設定 (`RomVersion` を含む)
    ds: DsConfig,
    /// 起動設定
    game_start: GameStartConfig,
    // 進捗管理
    total_count: u64,
    processed_count: u64,
}

#[wasm_bindgen]
impl TrainerInfoSearcher {
    /// 新しい `TrainerInfoSearcher` を作成
    ///
    /// # Errors
    /// - `StartMode::Continue` が指定された場合
    /// - `GameStartConfig` の検証失敗
    #[wasm_bindgen(constructor)]
    #[allow(clippy::needless_pass_by_value)]
    pub fn new(params: TrainerInfoSearchParams) -> Result<TrainerInfoSearcher, String> {
        // Continue モードは ID 調整不可
        if params.game_start.start_mode == StartMode::Continue {
            return Err("TrainerInfo search requires NewGame mode".into());
        }

        params.game_start.validate(params.ds.version)?;

        let generator = DatetimeHashGenerator::new(
            &params.ds,
            &params.time_range,
            &params.search_range,
            params.condition,
        )?;

        let valid_seconds_per_day = params.time_range.count_valid_seconds();
        let days = params.search_range.range_seconds.div_ceil(86400);
        let total_count = u64::from(valid_seconds_per_day) * u64::from(days);

        Ok(Self {
            filter: params.filter,
            generator,
            condition: params.condition,
            ds: params.ds,
            game_start: params.game_start,
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
        if self.total_count == 0 {
            return 1.0;
        }
        self.processed_count as f64 / self.total_count as f64
    }

    /// 次のバッチを取得
    pub fn next_batch(&mut self, chunk_count: u32) -> TrainerInfoSearchBatch {
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

                // TrainerInfo を算出
                let Ok(trainer) =
                    calculate_trainer_info(lcg_seed, self.ds.version, self.game_start)
                else {
                    continue; // エラーはスキップ (通常発生しない)
                };

                // ShinyType を算出 (shiny_pid 指定時)
                let shiny_type = self.filter.shiny_pid.map(|pid| pid.shiny_type(trainer));

                // フィルタ判定
                if self
                    .filter
                    .matches(&trainer, shiny_type.unwrap_or(ShinyType::None))
                {
                    let seed_origin = SeedOrigin::startup(lcg_seed, *datetime, self.condition);
                    results.push(TrainerInfoSearchResult {
                        trainer,
                        seed_origin,
                        shiny_type,
                    });
                }
            }
        }

        TrainerInfoSearchBatch {
            results,
            processed_count: self.processed_count,
            total_count: self.total_count,
        }
    }
}

// ===== タスク生成関数 =====

/// 検索タスクを生成
///
/// `DatetimeSearchContext` から、
/// 組み合わせ × 時間チャンク のクロス積でタスクを生成する。
/// Worker 数を考慮して時間分割を行い、Worker 活用率を最大化する。
///
/// # Arguments
/// - `context`: 検索コンテキスト (日付範囲、時刻範囲、Timer0/VCount/KeyCode 範囲)
/// - `filter`: 検索フィルタ
/// - `game_start`: 起動設定
/// - `worker_count`: Worker 数
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
#[allow(clippy::cast_possible_truncation)]
pub fn generate_trainer_info_search_tasks(
    context: DatetimeSearchContext,
    filter: TrainerInfoFilter,
    game_start: GameStartConfig,
    worker_count: u32,
) -> Vec<TrainerInfoSearchParams> {
    let search_range = context.date_range.to_search_range();
    let combinations = expand_combinations(&context);
    let combo_count = combinations.len() as u32;

    // 時間分割数を計算
    let time_chunks = calculate_time_chunks(combo_count, worker_count);
    let ranges = split_search_range(search_range, time_chunks);

    // 組み合わせ × 時間チャンク のクロス積でタスク生成
    combinations
        .into_iter()
        .flat_map(|condition| {
            let filter = filter.clone();
            let ds = context.ds.clone();
            let time_range = context.time_range.clone();
            ranges.iter().map(move |range| TrainerInfoSearchParams {
                filter: filter.clone(),
                ds: ds.clone(),
                time_range: time_range.clone(),
                search_range: range.clone(),
                condition,
                game_start,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use crate::types::{
        DateRangeParams, DsConfig, GameStartConfig, Hardware, KeyCode, KeySpec, Pid, RomRegion,
        RomVersion, SaveState, SearchRangeParams, StartMode, StartupCondition, TimeRangeParams,
        Timer0VCountRange, TrainerInfo, TrainerInfoSearchParams,
    };

    use super::*;

    fn create_test_params(filter: TrainerInfoFilter) -> TrainerInfoSearchParams {
        TrainerInfoSearchParams {
            filter,
            ds: DsConfig {
                mac: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56],
                hardware: Hardware::DsLite,
                version: RomVersion::Black,
                region: RomRegion::Jpn,
            },
            time_range: TimeRangeParams {
                hour_start: 0,
                hour_end: 0,
                minute_start: 0,
                minute_end: 0,
                second_start: 0,
                second_end: 59,
            },
            search_range: SearchRangeParams {
                start_year: 2023,
                start_month: 1,
                start_day: 1,
                start_second_offset: 0,
                range_seconds: 60,
            },
            condition: StartupCondition::new(0x0C79, 0x5F, KeyCode::NONE),
            game_start: GameStartConfig {
                start_mode: StartMode::NewGame,
                save_state: SaveState::NoSave,
                shiny_charm: false,
            },
        }
    }

    #[test]
    fn test_searcher_rejects_continue_mode() {
        let mut params = create_test_params(TrainerInfoFilter::default());
        params.game_start.start_mode = StartMode::Continue;
        params.game_start.save_state = SaveState::WithSave;

        let result = TrainerInfoSearcher::new(params);
        assert!(result.is_err());
        assert!(result.err().unwrap().contains("NewGame"));
    }

    #[test]
    fn test_searcher_rejects_bw_memory_link() {
        let mut params = create_test_params(TrainerInfoFilter::default());
        params.game_start.save_state = SaveState::WithMemoryLink;

        let result = TrainerInfoSearcher::new(params);
        assert!(result.is_err());
    }

    #[test]
    fn test_searcher_creation_success() {
        let params = create_test_params(TrainerInfoFilter::default());
        let result = TrainerInfoSearcher::new(params);
        assert!(result.is_ok());
    }

    #[test]
    fn test_searcher_progress() {
        let params = create_test_params(TrainerInfoFilter::default());
        let searcher = TrainerInfoSearcher::new(params).unwrap();

        assert!(!searcher.is_done());
        assert!(searcher.progress() >= 0.0);
        assert!(searcher.progress() <= 1.0);
    }

    #[test]
    fn test_searcher_batch_processing() {
        let params = create_test_params(TrainerInfoFilter::default());
        let mut searcher = TrainerInfoSearcher::new(params).unwrap();

        // フィルタなしで実行 (全件マッチ)
        let batch = searcher.next_batch(10);
        // 何かしらの結果が返る (60秒範囲なので最大60件)
        assert!(batch.processed_count > 0);
    }

    #[test]
    #[allow(clippy::similar_names)]
    fn test_trainer_info_filter_matches() {
        let trainer = TrainerInfo {
            tid: 12345,
            sid: 54321,
        };

        // 条件なし (全件マッチ)
        let filter_any = TrainerInfoFilter::default();
        assert!(filter_any.matches(&trainer, ShinyType::None));

        // TID のみ指定
        let filter_with_tid = TrainerInfoFilter {
            tid: Some(12345),
            sid: None,
            shiny_pid: None,
        };
        assert!(filter_with_tid.matches(&trainer, ShinyType::None));

        // TID 不一致
        let filter_tid_mismatch = TrainerInfoFilter {
            tid: Some(65535),
            sid: None,
            shiny_pid: None,
        };
        assert!(!filter_tid_mismatch.matches(&trainer, ShinyType::None));

        // SID のみ指定
        let filter_with_sid = TrainerInfoFilter {
            tid: None,
            sid: Some(54321),
            shiny_pid: None,
        };
        assert!(filter_with_sid.matches(&trainer, ShinyType::None));

        // TID + SID
        let filter_both = TrainerInfoFilter {
            tid: Some(12345),
            sid: Some(54321),
            shiny_pid: None,
        };
        assert!(filter_both.matches(&trainer, ShinyType::None));

        // ShinyPID 指定時は色違いが必要
        let filter_shiny = TrainerInfoFilter {
            tid: None,
            sid: None,
            shiny_pid: Some(Pid(0x1234_5678)),
        };
        assert!(!filter_shiny.matches(&trainer, ShinyType::None));
        assert!(filter_shiny.matches(&trainer, ShinyType::Star));
        assert!(filter_shiny.matches(&trainer, ShinyType::Square));
    }

    #[test]
    fn test_generate_tasks() {
        let filter = TrainerInfoFilter::default();
        let ds = DsConfig {
            mac: [0x00, 0x09, 0xBF, 0x12, 0x34, 0x56],
            hardware: Hardware::DsLite,
            version: RomVersion::Black,
            region: RomRegion::Jpn,
        };
        let time_range = TimeRangeParams {
            hour_start: 0,
            hour_end: 23,
            minute_start: 0,
            minute_end: 59,
            second_start: 0,
            second_end: 59,
        };
        let date_range = DateRangeParams {
            start_year: 2023,
            start_month: 1,
            start_day: 1,
            end_year: 2023,
            end_month: 1,
            end_day: 1,
        };
        let context = DatetimeSearchContext {
            ds: ds.clone(),
            date_range,
            time_range: time_range.clone(),
            ranges: vec![Timer0VCountRange {
                timer0_min: 0x0C79,
                timer0_max: 0x0C7A,
                vcount_min: 0x5F,
                vcount_max: 0x5F,
            }],
            key_spec: KeySpec::from_buttons(vec![]),
        };
        let game_start = GameStartConfig {
            start_mode: StartMode::NewGame,
            save_state: SaveState::NoSave,
            shiny_charm: false,
        };

        let tasks = generate_trainer_info_search_tasks(context, filter, game_start, 2);

        // Timer0: 2パターン × VCount: 1パターン × KeyCode: 1パターン × time_chunks: 1 = 2タスク
        // (worker_count = 2, combo_count = 2 → time_chunks = 1)
        assert_eq!(tasks.len(), 2);
    }
}
