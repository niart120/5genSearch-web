//! レポート針生成
//!
//! 観測したレポート針パターンから消費位置を特定する機能。
//! 入力ソースとして `GeneratorSource` を使用し、Seed 直接指定と起動条件指定の両方に対応。

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::core::datetime_codes::{get_date_code, get_time_code_for_hardware};
use crate::core::lcg::Lcg64;
use crate::core::needle::calc_report_needle_direction;
use crate::core::sha1::{BaseMessageBuilder, calculate_pokemon_sha1, get_frame, get_nazo_values};
use crate::datetime_search::base::datetime_to_seconds;
use crate::types::{
    Datetime, DsConfig, GeneratorSource, Hardware, KeyCode, LcgSeed, NeedleDirection,
    NeedlePattern, SeedOrigin, StartupCondition,
};

// ===== 生成パラメータ =====

/// レポート針生成パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleGeneratorParams {
    /// 入力ソース (`GeneratorSource` を使用)
    pub input: GeneratorSource,
    /// 観測したレポート針パターン (0-7)
    pub pattern: NeedlePattern,
    /// 検索開始消費位置
    pub advance_min: u32,
    /// 検索終了消費位置
    pub advance_max: u32,
}

// ===== 生成結果 =====

/// レポート針生成結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleGeneratorResult {
    /// パターン開始消費位置
    pub advance: u32,
    /// 生成元情報
    pub source: SeedOrigin,
}

/// レポート針生成バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleGeneratorBatch {
    pub results: Vec<NeedleGeneratorResult>,
    pub processed: u64,
    pub total: u64,
}

// ===== 生成器 =====

/// レポート針生成器
///
/// LCG Seed から針パターン位置を生成する順算系 API。
#[wasm_bindgen]
pub struct NeedleGenerator {
    pattern: NeedlePattern,
    advance_min: u32,
    advance_max: u32,
    state: GeneratorState,
}

/// 内部生成状態
enum GeneratorState {
    /// Seed 入力モード
    Seed {
        lcg: Lcg64,
        current_advance: u32,
        base_seed: LcgSeed,
    },
    /// Seeds 入力モード (複数 Seed)
    Seeds {
        seeds: Vec<LcgSeed>,
        current_index: usize,
        lcg: Option<Lcg64>,
        current_advance: u32,
    },
    /// Startup 入力モード
    Startup(StartupState),
}

/// Startup モード内部状態
struct StartupState {
    // 設定
    datetime: Datetime,
    #[allow(dead_code)]
    timer0_min: u16,
    timer0_max: u16,
    vcount_min: u8,
    vcount_max: u8,
    key_code: KeyCode,
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
    current_base_seed: LcgSeed,
    // 総件数
    total_combinations: u64,
    processed_combinations: u64,
}

#[wasm_bindgen]
impl NeedleGenerator {
    /// 生成器を作成
    ///
    /// # Errors
    ///
    /// パターンが空、または `advance_min > advance_max` の場合にエラーを返す
    #[wasm_bindgen(constructor)]
    #[allow(clippy::needless_pass_by_value)]
    pub fn new(params: NeedleGeneratorParams) -> Result<NeedleGenerator, String> {
        // 共通バリデーション
        if params.pattern.is_empty() {
            return Err("pattern is empty".into());
        }
        if params.advance_min > params.advance_max {
            return Err("advance_min > advance_max".into());
        }

        let state = match &params.input {
            GeneratorSource::Seed { initial_seed } => {
                let mut lcg = Lcg64::new(*initial_seed);
                lcg.jump(u64::from(params.advance_min));
                GeneratorState::Seed {
                    lcg,
                    current_advance: params.advance_min,
                    base_seed: *initial_seed,
                }
            }
            GeneratorSource::Seeds { seeds } => {
                if seeds.is_empty() {
                    return Err("seeds is empty".into());
                }
                GeneratorState::Seeds {
                    seeds: seeds.clone(),
                    current_index: 0,
                    lcg: None,
                    current_advance: params.advance_min,
                }
            }
            GeneratorSource::Startup {
                ds,
                datetime,
                ranges,
                key_input,
            } => {
                if ranges.is_empty() {
                    return Err("ranges is empty".into());
                }
                // 最初の範囲を使用（複数範囲は今後対応）
                let range = &ranges[0];

                Self::create_startup_state(
                    ds,
                    *datetime,
                    range.timer0_min,
                    range.timer0_max,
                    range.vcount_min,
                    range.vcount_max,
                    key_input.to_key_code(),
                    params.advance_min,
                    params.advance_max,
                )?
            }
        };

        Ok(Self {
            pattern: params.pattern,
            advance_min: params.advance_min,
            advance_max: params.advance_max,
            state,
        })
    }

    /// Startup 状態を作成するヘルパー
    #[allow(clippy::too_many_arguments)]
    fn create_startup_state(
        ds: &DsConfig,
        datetime: Datetime,
        timer0_min: u16,
        timer0_max: u16,
        vcount_min: u8,
        vcount_max: u8,
        key_code: KeyCode,
        advance_min: u32,
        advance_max: u32,
    ) -> Result<GeneratorState, String> {
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
        let builder =
            BaseMessageBuilder::new(&nazo, ds.mac, vcount_min, timer0_min, key_code, frame);
        let base_message = builder.to_message();

        // 日時コード計算
        let is_ds_or_lite = matches!(ds.hardware, Hardware::Ds | Hardware::DsLite);
        let days =
            datetime_to_seconds(datetime.year, datetime.month, datetime.day, 0, 0, 0) / 86400;
        #[allow(clippy::cast_possible_truncation)]
        let date_code = get_date_code(days as u32);
        let secs_of_day = u32::from(datetime.hour) * 3600
            + u32::from(datetime.minute) * 60
            + u32::from(datetime.second);
        let time_code = get_time_code_for_hardware(secs_of_day, is_ds_or_lite);

        // 総組み合わせ数
        let timer0_count = u64::from(timer0_max - timer0_min + 1);
        let vcount_count = u64::from(vcount_max - vcount_min + 1);
        let advance_count = u64::from(advance_max - advance_min);
        let total_combinations = timer0_count * vcount_count * advance_count;

        Ok(GeneratorState::Startup(StartupState {
            datetime,
            timer0_min,
            timer0_max,
            vcount_min,
            vcount_max,
            key_code,
            base_message,
            is_ds_or_lite,
            date_code,
            time_code,
            current_timer0: timer0_min,
            current_vcount: vcount_min,
            current_advance: advance_min,
            current_lcg: None,
            current_base_seed: LcgSeed::new(0),
            total_combinations,
            processed_combinations: 0,
        }))
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        match &self.state {
            GeneratorState::Seed {
                current_advance, ..
            } => *current_advance >= self.advance_max,
            GeneratorState::Seeds {
                seeds,
                current_index,
                current_advance,
                ..
            } => {
                *current_index >= seeds.len()
                    || (*current_index == seeds.len() - 1 && *current_advance >= self.advance_max)
            }
            GeneratorState::Startup(s) => {
                s.current_timer0 > s.timer0_max
                    || (s.current_timer0 == s.timer0_max && s.current_vcount > s.vcount_max)
            }
        }
    }

    #[wasm_bindgen(getter)]
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        match &self.state {
            GeneratorState::Seed {
                current_advance, ..
            } => {
                let total = u64::from(self.advance_max - self.advance_min);
                if total == 0 {
                    return 1.0;
                }
                f64::from(*current_advance - self.advance_min) / total as f64
            }
            GeneratorState::Seeds {
                seeds,
                current_index,
                current_advance,
                ..
            } => {
                let total_seeds = seeds.len() as u64;
                let advances_per_seed = u64::from(self.advance_max - self.advance_min);
                let total = total_seeds * advances_per_seed;
                if total == 0 {
                    return 1.0;
                }
                let processed = (*current_index as u64) * advances_per_seed
                    + u64::from(*current_advance - self.advance_min);
                processed as f64 / total as f64
            }
            GeneratorState::Startup(s) => {
                if s.total_combinations == 0 {
                    return 1.0;
                }
                s.processed_combinations as f64 / s.total_combinations as f64
            }
        }
    }

    /// 次のバッチを生成
    pub fn next_batch(&mut self, chunk_size: u32) -> NeedleGeneratorBatch {
        match &mut self.state {
            GeneratorState::Seed { .. } => self.next_batch_seed(chunk_size),
            GeneratorState::Seeds { .. } => self.next_batch_seeds(chunk_size),
            GeneratorState::Startup(_) => self.next_batch_startup(chunk_size),
        }
    }
}

// ===== Seed モード実装 =====

impl NeedleGenerator {
    fn next_batch_seed(&mut self, chunk_size: u32) -> NeedleGeneratorBatch {
        let GeneratorState::Seed {
            lcg,
            current_advance,
            base_seed,
        } = &mut self.state
        else {
            unreachable!()
        };

        let pattern = self.pattern.clone();
        let advance_max = self.advance_max;

        let mut results = Vec::new();
        let end_advance = (*current_advance + chunk_size).min(advance_max);

        while *current_advance < end_advance {
            if matches_pattern_at_seed(lcg.current_seed(), pattern.directions()) {
                results.push(NeedleGeneratorResult {
                    advance: *current_advance,
                    source: SeedOrigin::seed(*base_seed),
                });
            }
            lcg.advance(1);
            *current_advance += 1;
        }

        NeedleGeneratorBatch {
            results,
            processed: u64::from(*current_advance),
            total: u64::from(self.advance_max),
        }
    }

    fn next_batch_seeds(&mut self, chunk_size: u32) -> NeedleGeneratorBatch {
        let GeneratorState::Seeds {
            seeds,
            current_index,
            lcg,
            current_advance,
        } = &mut self.state
        else {
            unreachable!()
        };

        let pattern = self.pattern.clone();
        let advance_min = self.advance_min;
        let advance_max = self.advance_max;

        let mut results = Vec::new();
        let mut processed = 0u32;

        while processed < chunk_size && *current_index < seeds.len() {
            // 現在の Seed に対する LCG を初期化
            if lcg.is_none() {
                let seed = seeds[*current_index];
                let mut new_lcg = Lcg64::new(seed);
                new_lcg.jump(u64::from(advance_min));
                *lcg = Some(new_lcg);
                *current_advance = advance_min;
            }

            let current_lcg = lcg.as_mut().unwrap();
            let base_seed = seeds[*current_index];

            while *current_advance < advance_max && processed < chunk_size {
                if matches_pattern_at_seed(current_lcg.current_seed(), pattern.directions()) {
                    #[allow(clippy::cast_possible_truncation)]
                    results.push(NeedleGeneratorResult {
                        advance: *current_advance,
                        source: SeedOrigin::seed(base_seed),
                    });
                }
                current_lcg.advance(1);
                *current_advance += 1;
                processed += 1;
            }

            // Advance 範囲を使い切ったら次の Seed へ
            if *current_advance >= advance_max {
                *lcg = None;
                *current_index += 1;
            }
        }

        let total_seeds = seeds.len() as u64;
        let advances_per_seed = u64::from(advance_max - advance_min);
        let total = total_seeds * advances_per_seed;
        let processed_total =
            (*current_index as u64) * advances_per_seed + u64::from(*current_advance - advance_min);

        NeedleGeneratorBatch {
            results,
            processed: processed_total,
            total,
        }
    }
}

// ===== Startup モード実装 =====

impl NeedleGenerator {
    fn next_batch_startup(&mut self, chunk_size: u32) -> NeedleGeneratorBatch {
        let pattern = self.pattern.clone();
        let advance_min = self.advance_min;
        let advance_max = self.advance_max;

        let GeneratorState::Startup(s) = &mut self.state else {
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
                s.current_base_seed = lcg_seed;
                let mut lcg = Lcg64::new(lcg_seed);
                lcg.jump(u64::from(advance_min));
                s.current_lcg = Some(lcg);
                s.current_advance = advance_min;
            }

            // Advance 範囲をスキャン
            let lcg = s.current_lcg.as_mut().unwrap();
            while s.current_advance < advance_max && processed < chunk_size {
                if matches_pattern_at_seed(lcg.current_seed(), pattern.directions()) {
                    results.push(NeedleGeneratorResult {
                        advance: s.current_advance,
                        source: SeedOrigin::startup(
                            s.current_base_seed,
                            s.datetime,
                            StartupCondition::new(s.current_timer0, s.current_vcount, s.key_code),
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

        NeedleGeneratorBatch {
            results,
            processed: s.processed_combinations,
            total: s.total_combinations,
        }
    }
}

// ===== 共通ヘルパー =====

/// 指定 Seed からパターンが一致するか判定 (スタンドアロン関数)
fn matches_pattern_at_seed(seed: LcgSeed, pattern: &[NeedleDirection]) -> bool {
    let mut test_seed = seed;
    for &expected in pattern {
        let direction = calc_report_needle_direction(test_seed);
        if direction != expected {
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
pub fn get_needle_pattern(seed: LcgSeed, length: u32) -> NeedlePattern {
    let mut directions = Vec::with_capacity(length as usize);
    let mut current_seed = seed;

    for _ in 0..length {
        let direction = calc_report_needle_direction(current_seed);
        directions.push(direction);
        current_seed = Lcg64::compute_next(current_seed);
    }

    NeedlePattern::new(directions)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_needle_pattern() {
        let seed = LcgSeed::new(0x0123_4567_89AB_CDEF);
        let pattern = get_needle_pattern(seed, 5);
        assert_eq!(pattern.len(), 5);
        assert!(pattern.iter().all(|d| d.value() <= 7));
    }

    #[test]
    fn test_needle_generator_seed_input() {
        let seed = LcgSeed::new(0x0123_4567_89AB_CDEF);
        let pattern = get_needle_pattern(seed, 3);

        let params = NeedleGeneratorParams {
            input: GeneratorSource::Seed { initial_seed: seed },
            pattern,
            advance_min: 0,
            advance_max: 10,
        };

        let mut generator = NeedleGenerator::new(params).unwrap();
        let batch = generator.next_batch(100);

        // 先頭位置で一致するはず
        assert!(!batch.results.is_empty());
        assert_eq!(batch.results[0].advance, 0);
        // SeedOrigin::Seed であること
        assert!(matches!(batch.results[0].source, SeedOrigin::Seed { .. }));
    }

    #[test]
    fn test_needle_generator_seeds_input() {
        let seed1 = LcgSeed::new(0x0123_4567_89AB_CDEF);
        let seed2 = LcgSeed::new(0xFEDC_BA98_7654_3210);
        let pattern = get_needle_pattern(seed1, 3);

        let params = NeedleGeneratorParams {
            input: GeneratorSource::Seeds {
                seeds: vec![seed1, seed2],
            },
            pattern,
            advance_min: 0,
            advance_max: 10,
        };

        let mut generator = NeedleGenerator::new(params).unwrap();
        let batch = generator.next_batch(100);

        // 最初の Seed の先頭位置で一致するはず
        assert!(!batch.results.is_empty());
        assert_eq!(batch.results[0].advance, 0);
        // SeedOrigin::Seed であること
        assert!(matches!(batch.results[0].source, SeedOrigin::Seed { .. }));
    }

    #[test]
    fn test_needle_direction_arrow() {
        assert_eq!(NeedleDirection::N.arrow(), "↑");
        assert_eq!(NeedleDirection::S.arrow(), "↓");
        assert_eq!(NeedleDirection::NW.arrow(), "↖");
    }

    #[test]
    fn test_invalid_params() {
        // Empty pattern
        let params = NeedleGeneratorParams {
            input: GeneratorSource::Seed {
                initial_seed: LcgSeed::new(0),
            },
            pattern: NeedlePattern::new(vec![]),
            advance_min: 0,
            advance_max: 10,
        };
        assert!(NeedleGenerator::new(params).is_err());

        // min > max
        let params = NeedleGeneratorParams {
            input: GeneratorSource::Seed {
                initial_seed: LcgSeed::new(0),
            },
            pattern: NeedlePattern::new(vec![NeedleDirection::N]),
            advance_min: 10,
            advance_max: 5,
        };
        assert!(NeedleGenerator::new(params).is_err());
    }
}
