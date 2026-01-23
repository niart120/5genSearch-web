//! レポート針検索
//!
//! 観測したレポート針パターンから消費位置を特定する機能。
//! 入力ソースとして `LcgSeed` 直接指定と起動条件指定の両方に対応。

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::core::datetime_codes::{get_date_code, get_time_code_for_hardware};
use crate::core::lcg::Lcg64;
use crate::core::sha1::{BaseMessageBuilder, calculate_pokemon_sha1, get_frame, get_nazo_values};
use crate::datetime_search::base::datetime_to_seconds;
use crate::generation::algorithm::calc_report_needle_direction;
use crate::types::{DatetimeParams, DsConfig, GenerationSource, Hardware, LcgSeed};

/// レポート針パターン (0-7 の方向値列)
pub type NeedlePattern = Vec<u8>;

// ===== 検索入力ソース =====

/// 検索入力ソース
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(tag = "type")]
pub enum NeedleSearchInput {
    /// 既知 Seed から検索 (消費位置特定)
    Seed { initial_seed: LcgSeed },
    /// 起動条件から検索 (Timer0/VCount 範囲探索)
    Startup {
        ds: DsConfig,
        datetime: DatetimeParams,
        timer0_min: u16,
        timer0_max: u16,
        vcount_min: u8,
        vcount_max: u8,
        key_code: u32,
    },
}

// ===== 検索パラメータ =====

/// レポート針検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchParams {
    /// 入力ソース (Seed または Startup)
    pub input: NeedleSearchInput,
    /// 観測したレポート針パターン (0-7)
    pub pattern: NeedlePattern,
    /// 検索開始消費位置
    pub advance_min: u32,
    /// 検索終了消費位置
    pub advance_max: u32,
}

// ===== 検索結果 =====

/// レポート針検索結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchResult {
    /// パターン開始消費位置
    pub advance: u32,
    /// 生成元情報
    pub source: GenerationSource,
}

/// レポート針検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchBatch {
    pub results: Vec<NeedleSearchResult>,
    pub processed: u64,
    pub total: u64,
}

// ===== 検索器 =====

/// レポート針検索器
#[wasm_bindgen]
pub struct NeedleSearcher {
    pattern: NeedlePattern,
    advance_min: u32,
    advance_max: u32,
    state: SearcherState,
}

/// 内部検索状態
enum SearcherState {
    /// Seed 入力モード
    Seed {
        lcg: Lcg64,
        current_advance: u32,
        base_seed: u64,
    },
    /// Startup 入力モード
    Startup(StartupState),
}

/// Startup モード内部状態
struct StartupState {
    // 設定
    datetime: DatetimeParams,
    #[allow(dead_code)]
    timer0_min: u16,
    timer0_max: u16,
    vcount_min: u8,
    vcount_max: u8,
    key_code: u32,
    // SHA-1 計算用のベースメッセージ (Timer0/VCount 以外が固定)
    base_message: [u32; 16],
    // hardware フラグ
    #[allow(dead_code)]
    is_ds_or_lite: bool,
    date_code: u32,
    time_code: u32,
    // 現在の探索位置
    current_timer0: u16,
    current_vcount: u8,
    current_advance: u32,
    // キャッシュ
    current_lcg: Option<Lcg64>,
    current_base_seed: u64,
    // 総件数
    total_combinations: u64,
    processed_combinations: u64,
}

#[wasm_bindgen]
impl NeedleSearcher {
    /// 検索器を作成
    ///
    /// # Errors
    ///
    /// パターンが空、無効な方向値 (8 以上)、または `advance_min > advance_max` の場合にエラーを返す
    #[wasm_bindgen(constructor)]
    #[allow(clippy::needless_pass_by_value)]
    pub fn new(params: NeedleSearchParams) -> Result<NeedleSearcher, String> {
        // 共通バリデーション
        if params.pattern.is_empty() {
            return Err("pattern is empty".into());
        }
        if params.pattern.iter().any(|&d| d > 7) {
            return Err("Invalid needle direction (must be 0-7)".into());
        }
        if params.advance_min > params.advance_max {
            return Err("advance_min > advance_max".into());
        }

        let state = match &params.input {
            NeedleSearchInput::Seed { initial_seed } => {
                let mut lcg = Lcg64::new(*initial_seed);
                lcg.jump(u64::from(params.advance_min));
                SearcherState::Seed {
                    lcg,
                    current_advance: params.advance_min,
                    base_seed: initial_seed.value(),
                }
            }
            NeedleSearchInput::Startup {
                ds,
                datetime,
                timer0_min,
                timer0_max,
                vcount_min,
                vcount_max,
                key_code,
            } => {
                // バリデーション
                if timer0_min > timer0_max {
                    return Err("timer0_min > timer0_max".into());
                }
                if vcount_min > vcount_max {
                    return Err("vcount_min > vcount_max".into());
                }

                // ベースメッセージ構築 (timer0/vcount は後で差し替え)
                let nazo = get_nazo_values(ds.version, ds.region);
                let frame = get_frame(ds.hardware);
                let builder = BaseMessageBuilder::new(
                    &nazo,
                    ds.mac,
                    *vcount_min,
                    *timer0_min,
                    *key_code,
                    frame,
                );
                let base_message = builder.to_message();

                // 日時コード計算
                let is_ds_or_lite = matches!(ds.hardware, Hardware::Ds | Hardware::DsLite);
                let days =
                    datetime_to_seconds(datetime.year, datetime.month, datetime.day, 0, 0, 0)
                        / 86400;
                #[allow(clippy::cast_possible_truncation)]
                let date_code = get_date_code(days as u32);
                let secs_of_day = u32::from(datetime.hour) * 3600
                    + u32::from(datetime.minute) * 60
                    + u32::from(datetime.second);
                let time_code = get_time_code_for_hardware(secs_of_day, is_ds_or_lite);

                // 総組み合わせ数
                let timer0_count = u64::from(*timer0_max - *timer0_min + 1);
                let vcount_count = u64::from(*vcount_max - *vcount_min + 1);
                let advance_count = u64::from(params.advance_max - params.advance_min);
                let total_combinations = timer0_count * vcount_count * advance_count;

                SearcherState::Startup(StartupState {
                    datetime: *datetime,
                    timer0_min: *timer0_min,
                    timer0_max: *timer0_max,
                    vcount_min: *vcount_min,
                    vcount_max: *vcount_max,
                    key_code: *key_code,
                    base_message,
                    is_ds_or_lite,
                    date_code,
                    time_code,
                    current_timer0: *timer0_min,
                    current_vcount: *vcount_min,
                    current_advance: params.advance_min,
                    current_lcg: None,
                    current_base_seed: 0,
                    total_combinations,
                    processed_combinations: 0,
                })
            }
        };

        Ok(Self {
            pattern: params.pattern,
            advance_min: params.advance_min,
            advance_max: params.advance_max,
            state,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        match &self.state {
            SearcherState::Seed {
                current_advance, ..
            } => *current_advance >= self.advance_max,
            SearcherState::Startup(s) => {
                s.current_timer0 > s.timer0_max
                    || (s.current_timer0 == s.timer0_max && s.current_vcount > s.vcount_max)
            }
        }
    }

    #[wasm_bindgen(getter)]
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        match &self.state {
            SearcherState::Seed {
                current_advance, ..
            } => {
                let total = u64::from(self.advance_max - self.advance_min);
                if total == 0 {
                    return 1.0;
                }
                f64::from(*current_advance - self.advance_min) / total as f64
            }
            SearcherState::Startup(s) => {
                if s.total_combinations == 0 {
                    return 1.0;
                }
                s.processed_combinations as f64 / s.total_combinations as f64
            }
        }
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_size: u32) -> NeedleSearchBatch {
        match &mut self.state {
            SearcherState::Seed { .. } => self.next_batch_seed(chunk_size),
            SearcherState::Startup(_) => self.next_batch_startup(chunk_size),
        }
    }
}

// ===== Seed モード実装 =====

impl NeedleSearcher {
    fn next_batch_seed(&mut self, chunk_size: u32) -> NeedleSearchBatch {
        let SearcherState::Seed {
            lcg,
            current_advance,
            base_seed,
        } = &mut self.state
        else {
            unreachable!()
        };

        // 借用エラー回避のためローカル変数を使用
        let pattern = self.pattern.clone();
        let advance_max = self.advance_max;

        let mut results = Vec::new();
        let end_advance = (*current_advance + chunk_size).min(advance_max);

        while *current_advance < end_advance {
            if matches_pattern_at_seed(lcg.current_seed(), &pattern) {
                results.push(NeedleSearchResult {
                    advance: *current_advance,
                    source: GenerationSource::fixed(*base_seed),
                });
            }
            lcg.advance(1);
            *current_advance += 1;
        }

        NeedleSearchBatch {
            results,
            processed: u64::from(*current_advance),
            total: u64::from(self.advance_max),
        }
    }
}

// ===== Startup モード実装 =====

impl NeedleSearcher {
    fn next_batch_startup(&mut self, chunk_size: u32) -> NeedleSearchBatch {
        // 借用エラー回避のためローカル変数を使用
        let pattern = self.pattern.clone();
        let advance_min = self.advance_min;
        let advance_max = self.advance_max;

        let SearcherState::Startup(s) = &mut self.state else {
            unreachable!()
        };

        let mut results = Vec::new();
        let mut processed = 0u32;

        while processed < chunk_size {
            // 終了判定
            if s.current_timer0 > s.timer0_max {
                break;
            }

            // 現在の (timer0, vcount) に対する LCG を初期化
            if s.current_lcg.is_none() {
                let lcg_seed = compute_lcg_seed_for_startup(
                    &s.base_message,
                    s.current_timer0,
                    s.current_vcount,
                    s.date_code,
                    s.time_code,
                );
                s.current_base_seed = lcg_seed.value();
                let mut lcg = Lcg64::new(lcg_seed);
                lcg.jump(u64::from(advance_min));
                s.current_lcg = Some(lcg);
                s.current_advance = advance_min;
            }

            // Advance 範囲をスキャン
            let lcg = s.current_lcg.as_mut().unwrap();
            while s.current_advance < advance_max && processed < chunk_size {
                if matches_pattern_at_seed(lcg.current_seed(), &pattern) {
                    results.push(NeedleSearchResult {
                        advance: s.current_advance,
                        source: GenerationSource::datetime(
                            s.current_base_seed,
                            s.datetime,
                            s.current_timer0,
                            s.current_vcount,
                            s.key_code,
                        ),
                    });
                }
                lcg.advance(1);
                s.current_advance += 1;
                s.processed_combinations += 1;
                processed += 1;
            }

            // Advance 範囲を使い切ったら次の (timer0, vcount) へ
            if s.current_advance >= advance_max {
                s.current_lcg = None;
                s.current_vcount += 1;
                if s.current_vcount > s.vcount_max {
                    s.current_vcount = s.vcount_min;
                    s.current_timer0 += 1;
                }
            }
        }

        NeedleSearchBatch {
            results,
            processed: s.processed_combinations,
            total: s.total_combinations,
        }
    }
}

// ===== 共通ヘルパー =====

/// 指定 Seed からパターンが一致するか判定 (スタンドアロン関数)
fn matches_pattern_at_seed(seed: LcgSeed, pattern: &[u8]) -> bool {
    let mut test_seed = seed;
    for &expected in pattern {
        let direction = calc_report_needle_direction(test_seed);
        if direction.value() != expected {
            return false;
        }
        test_seed = Lcg64::compute_next(test_seed);
    }
    true
}

/// Startup 条件から LCG Seed を計算
fn compute_lcg_seed_for_startup(
    base_message: &[u32; 16],
    timer0: u16,
    vcount: u8,
    date_code: u32,
    time_code: u32,
) -> LcgSeed {
    let mut msg = *base_message;
    // word[5] = (vcount << 16) | timer0
    msg[5] = (u32::from(vcount) << 16) | u32::from(timer0);
    // word[8] = date_code
    msg[8] = date_code;
    // word[9] = time_code
    msg[9] = time_code;

    let hash = calculate_pokemon_sha1(&msg);
    hash.to_lcg_seed()
}

// ===== ユーティリティ関数 =====

/// 指定 Seed から針パターンを取得
#[wasm_bindgen]
pub fn get_needle_pattern(seed: LcgSeed, length: u32) -> Vec<u8> {
    let mut pattern = Vec::with_capacity(length as usize);
    let mut current_seed = seed;

    for _ in 0..length {
        let direction = calc_report_needle_direction(current_seed);
        pattern.push(direction.value());
        current_seed = Lcg64::compute_next(current_seed);
    }

    pattern
}

/// 針方向を矢印文字に変換
pub fn needle_direction_arrow(direction: u8) -> &'static str {
    match direction & 7 {
        0 => "↑",
        1 => "↗",
        2 => "→",
        3 => "↘",
        4 => "↓",
        5 => "↙",
        6 => "←",
        7 => "↖",
        _ => "?",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_needle_pattern() {
        let seed = LcgSeed::new(0x0123_4567_89AB_CDEF);
        let pattern = get_needle_pattern(seed, 5);
        assert_eq!(pattern.len(), 5);
        assert!(pattern.iter().all(|&d| d <= 7));
    }

    #[test]
    fn test_needle_searcher_seed_input() {
        let seed = LcgSeed::new(0x0123_4567_89AB_CDEF);
        let pattern = get_needle_pattern(seed, 3);

        let params = NeedleSearchParams {
            input: NeedleSearchInput::Seed { initial_seed: seed },
            pattern,
            advance_min: 0,
            advance_max: 10,
        };

        let mut searcher = NeedleSearcher::new(params).unwrap();
        let batch = searcher.next_batch(100);

        // 先頭位置で一致するはず
        assert!(!batch.results.is_empty());
        assert_eq!(batch.results[0].advance, 0);
        // GenerationSource::Fixed であること
        assert!(matches!(
            batch.results[0].source,
            GenerationSource::Fixed { .. }
        ));
    }

    #[test]
    fn test_needle_direction_arrow() {
        assert_eq!(needle_direction_arrow(0), "↑");
        assert_eq!(needle_direction_arrow(4), "↓");
        assert_eq!(needle_direction_arrow(7), "↖");
    }

    #[test]
    fn test_invalid_params() {
        // Empty pattern
        let params = NeedleSearchParams {
            input: NeedleSearchInput::Seed {
                initial_seed: LcgSeed::new(0),
            },
            pattern: vec![],
            advance_min: 0,
            advance_max: 10,
        };
        assert!(NeedleSearcher::new(params).is_err());

        // Invalid direction
        let params = NeedleSearchParams {
            input: NeedleSearchInput::Seed {
                initial_seed: LcgSeed::new(0),
            },
            pattern: vec![8], // invalid
            advance_min: 0,
            advance_max: 10,
        };
        assert!(NeedleSearcher::new(params).is_err());

        // min > max
        let params = NeedleSearchParams {
            input: NeedleSearchInput::Seed {
                initial_seed: LcgSeed::new(0),
            },
            pattern: vec![0],
            advance_min: 10,
            advance_max: 5,
        };
        assert!(NeedleSearcher::new(params).is_err());
    }
}
