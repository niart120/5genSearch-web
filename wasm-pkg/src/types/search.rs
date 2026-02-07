//! 検索パラメータ・結果型
//!
//! 起動時刻検索および各種検索の入出力型を定義。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use super::config::{DsConfig, StartupCondition, Timer0VCountRange};
use super::filter::{EggFilter, IvFilter, TrainerInfoFilter};
use super::generation::{EggGenerationParams, GeneratedEggData, GenerationConfig};
use super::keyinput::KeySpec;
use super::pokemon::{Ivs, ShinyType, TrainerInfo};
use super::seeds::{MtSeed, SeedOrigin};

// ===== 時刻範囲パラメータ =====

/// 1日内の時刻範囲
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TimeRangeParams {
    pub hour_start: u8,
    pub hour_end: u8,
    pub minute_start: u8,
    pub minute_end: u8,
    pub second_start: u8,
    pub second_end: u8,
}

impl TimeRangeParams {
    /// バリデーション
    ///
    /// # Errors
    ///
    /// 時間・分・秒の範囲が不正な場合
    pub fn validate(&self) -> Result<(), String> {
        if self.hour_end > 23 || self.hour_start > self.hour_end {
            return Err("Invalid hour range".into());
        }
        if self.minute_end > 59 || self.minute_start > self.minute_end {
            return Err("Invalid minute range".into());
        }
        if self.second_end > 59 || self.second_start > self.second_end {
            return Err("Invalid second range".into());
        }
        Ok(())
    }

    /// 有効な秒数をカウント (独立軸の直積)
    pub fn count_valid_seconds(&self) -> u32 {
        let hours = u32::from(self.hour_end) - u32::from(self.hour_start) + 1;
        let minutes = u32::from(self.minute_end) - u32::from(self.minute_start) + 1;
        let seconds = u32::from(self.second_end) - u32::from(self.second_start) + 1;
        hours * minutes * seconds
    }
}

/// 検索範囲
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SearchRangeParams {
    pub start_year: u16,
    pub start_month: u8,
    pub start_day: u8,
    /// 開始日内のオフセット秒 (0-86399)
    pub start_second_offset: u32,
    /// 検索範囲秒数
    pub range_seconds: u32,
}

/// 日付範囲パラメータ (UI 入力用)
///
/// 開始日〜終了日を表す。`SearchRangeParams` と異なり、
/// UI からの入力に適した形式。`to_search_range()` で変換可能。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DateRangeParams {
    /// 開始年 (2000-2099)
    pub start_year: u16,
    /// 開始月 (1-12)
    pub start_month: u8,
    /// 開始日 (1-31)
    pub start_day: u8,
    /// 終了年 (2000-2099)
    pub end_year: u16,
    /// 終了月 (1-12)
    pub end_month: u8,
    /// 終了日 (1-31)
    pub end_day: u8,
}

impl DateRangeParams {
    /// バリデーション
    ///
    /// # Errors
    ///
    /// - 年が 2000-2099 の範囲外の場合
    /// - 開始日が終了日より後の場合
    pub fn validate(&self) -> Result<(), String> {
        // 年範囲チェック
        if self.start_year < 2000 || self.start_year > 2099 {
            return Err("start_year must be 2000-2099".into());
        }
        if self.end_year < 2000 || self.end_year > 2099 {
            return Err("end_year must be 2000-2099".into());
        }
        // 開始 <= 終了 チェック
        let start = (self.start_year, self.start_month, self.start_day);
        let end = (self.end_year, self.end_month, self.end_day);
        if start > end {
            return Err("start date must be <= end date".into());
        }
        Ok(())
    }

    /// `SearchRangeParams` に変換
    ///
    /// 開始日 00:00:00 から終了日 23:59:59 までの範囲を表す
    /// `SearchRangeParams` を生成する。
    #[allow(clippy::cast_possible_truncation)]
    pub fn to_search_range(&self) -> SearchRangeParams {
        let start_seconds =
            datetime_to_seconds(self.start_year, self.start_month, self.start_day, 0, 0, 0);
        let end_seconds =
            datetime_to_seconds(self.end_year, self.end_month, self.end_day, 23, 59, 59);
        // 範囲秒数 = 終了 - 開始 + 1
        // DS 探索範囲 (2000-2099) では u32 に収まる
        let range_seconds = (end_seconds - start_seconds + 1) as u32;

        SearchRangeParams {
            start_year: self.start_year,
            start_month: self.start_month,
            start_day: self.start_day,
            start_second_offset: 0,
            range_seconds,
        }
    }
}

/// 起動時刻検索の共通コンテキスト
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DatetimeSearchContext {
    /// DS 設定
    pub ds: DsConfig,
    /// 日付範囲 (開始日〜終了日)
    pub date_range: DateRangeParams,
    /// 1日内の時刻範囲
    pub time_range: TimeRangeParams,
    /// Timer0/VCount 範囲 (複数指定可能)
    pub ranges: Vec<Timer0VCountRange>,
    /// キー入力仕様 (全組み合わせを探索)
    pub key_spec: KeySpec,
}

// ===== 内部ヘルパー関数 =====

/// 年月日を 2000年1月1日 00:00:00 からの経過秒数に変換
fn datetime_to_seconds(year: u16, month: u8, day: u8, hour: u8, minute: u8, second: u8) -> u64 {
    let mut days = 0u32;

    for y in 2000..year {
        days += if is_leap_year(y) { 366 } else { 365 };
    }

    let leap = is_leap_year(year);
    let month_days: [u32; 12] = if leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };

    for &md in month_days.iter().take(usize::from(month - 1)) {
        days += md;
    }
    days += u32::from(day - 1);

    u64::from(days) * 86400 + u64::from(hour) * 3600 + u64::from(minute) * 60 + u64::from(second)
}

fn is_leap_year(year: u16) -> bool {
    year.is_multiple_of(4) && !year.is_multiple_of(100) || year.is_multiple_of(400)
}

// ===== MT Seed 起動時刻検索 =====

/// MT Seed 検索パラメータ (単一組み合わせ)
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeSearchParams {
    /// 検索対象の MT Seed セット
    pub target_seeds: Vec<MtSeed>,
    /// DS 設定
    pub ds: DsConfig,
    /// 1日内の時刻範囲
    pub time_range: TimeRangeParams,
    /// 検索範囲 (秒単位)
    pub search_range: SearchRangeParams,
    /// 起動条件 (単一)
    pub condition: StartupCondition,
}

/// MT Seed 検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi, large_number_types_as_bigints)]
pub struct MtseedDatetimeSearchBatch {
    /// 見つかった結果 (`SeedOrigin::Startup` 形式)
    pub results: Vec<SeedOrigin>,
    /// 処理済み件数
    pub processed_count: u64,
    /// 総件数
    pub total_count: u64,
}

// ===== トレーナー情報検索 =====

use super::generation::GameStartConfig;

/// `TrainerInfo` 検索パラメータ (単一組み合わせ)
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TrainerInfoSearchParams {
    /// 検索フィルタ
    pub filter: TrainerInfoFilter,
    /// DS 設定 (`RomVersion` を含む)
    pub ds: DsConfig,
    /// 1日内の時刻範囲
    pub time_range: TimeRangeParams,
    /// 検索範囲 (秒単位)
    pub search_range: SearchRangeParams,
    /// 起動条件 (単一: Timer0/VCount/KeyCode)
    pub condition: StartupCondition,
    /// 起動設定
    pub game_start: GameStartConfig,
}

/// `TrainerInfo` 検索結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TrainerInfoSearchResult {
    /// TID + SID
    pub trainer: TrainerInfo,
    /// 生成元情報 (`Datetime` + `StartupCondition`)
    pub seed_origin: SeedOrigin,
    /// 色違いタイプ (`shiny_pid` 指定時のみ有効)
    pub shiny_type: Option<ShinyType>,
}

/// `TrainerInfo` 検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi, large_number_types_as_bigints)]
pub struct TrainerInfoSearchBatch {
    /// 見つかった結果
    pub results: Vec<TrainerInfoSearchResult>,
    /// 処理済み件数
    pub processed_count: u64,
    /// 総件数
    pub total_count: u64,
}

// ===== 孵化起動時刻検索 =====

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

/// 孵化検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi, large_number_types_as_bigints)]
pub struct EggDatetimeSearchBatch {
    /// 見つかった結果
    pub results: Vec<EggDatetimeSearchResult>,
    /// 処理済み件数
    pub processed_count: u64,
    /// 総件数
    pub total_count: u64,
}

// ===== MT Seed 検索 (misc) =====

/// MT Seed 検索コンテキスト (ユーザー入力用)
///
/// TS 側が組み立てる入力型。検索範囲は含まない。
/// `generate_mtseed_iv_search_tasks` に渡すと、範囲付きの `MtseedSearchParams` に変換される。
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedSearchContext {
    /// IV フィルタ条件
    pub iv_filter: IvFilter,
    /// MT オフセット (IV 生成開始位置、通常 7)
    pub mt_offset: u32,
    /// 徘徊ポケモンモード
    pub is_roamer: bool,
}

/// MT Seed 検索パラメータ (タスク用)
///
/// タスク分割後の各 Worker に渡されるパラメータ。
/// `start_seed` / `end_seed` は閉区間 `[start_seed, end_seed]` を表す。
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedSearchParams {
    /// IV フィルタ条件
    pub iv_filter: IvFilter,
    /// MT オフセット (IV 生成開始位置、通常 7)
    pub mt_offset: u32,
    /// 徘徊ポケモンモード
    pub is_roamer: bool,
    /// 検索開始 Seed (inclusive)
    pub start_seed: u32,
    /// 検索終了 Seed (inclusive)
    pub end_seed: u32,
}

/// MT Seed 検索結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedResult {
    /// 一致した MT Seed
    pub seed: MtSeed,
    /// 生成された IV
    pub ivs: Ivs,
}

/// MT Seed 検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi, large_number_types_as_bigints)]
pub struct MtseedSearchBatch {
    /// 条件を満たした候補
    pub candidates: Vec<MtseedResult>,
    /// 処理済み Seed 数
    pub processed: u64,
    /// 総 Seed 数 (0x100000000)
    pub total: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== DateRangeParams のテスト =====

    #[test]
    fn test_date_range_params_validate_success() {
        let params = DateRangeParams {
            start_year: 2023,
            start_month: 1,
            start_day: 1,
            end_year: 2023,
            end_month: 12,
            end_day: 31,
        };
        assert!(params.validate().is_ok());
    }

    #[test]
    fn test_date_range_params_validate_same_day() {
        let params = DateRangeParams {
            start_year: 2023,
            start_month: 6,
            start_day: 15,
            end_year: 2023,
            end_month: 6,
            end_day: 15,
        };
        assert!(params.validate().is_ok());
    }

    #[test]
    fn test_date_range_params_validate_start_year_out_of_range() {
        let params = DateRangeParams {
            start_year: 1999,
            start_month: 1,
            start_day: 1,
            end_year: 2023,
            end_month: 12,
            end_day: 31,
        };
        assert!(params.validate().is_err());
    }

    #[test]
    fn test_date_range_params_validate_end_year_out_of_range() {
        let params = DateRangeParams {
            start_year: 2023,
            start_month: 1,
            start_day: 1,
            end_year: 2100,
            end_month: 1,
            end_day: 1,
        };
        assert!(params.validate().is_err());
    }

    #[test]
    fn test_date_range_params_validate_start_after_end() {
        let params = DateRangeParams {
            start_year: 2023,
            start_month: 6,
            start_day: 15,
            end_year: 2023,
            end_month: 6,
            end_day: 14,
        };
        assert!(params.validate().is_err());
    }

    #[test]
    fn test_date_range_to_search_range_single_day() {
        let params = DateRangeParams {
            start_year: 2023,
            start_month: 1,
            start_day: 1,
            end_year: 2023,
            end_month: 1,
            end_day: 1,
        };
        let search_range = params.to_search_range();

        assert_eq!(search_range.start_year, 2023);
        assert_eq!(search_range.start_month, 1);
        assert_eq!(search_range.start_day, 1);
        assert_eq!(search_range.start_second_offset, 0);
        // 1日 = 86400 秒
        assert_eq!(search_range.range_seconds, 86400);
    }

    #[test]
    fn test_date_range_to_search_range_multiple_days() {
        let params = DateRangeParams {
            start_year: 2023,
            start_month: 1,
            start_day: 1,
            end_year: 2023,
            end_month: 1,
            end_day: 3,
        };
        let search_range = params.to_search_range();

        // 3日 = 86400 * 3 = 259200 秒
        assert_eq!(search_range.range_seconds, 86400 * 3);
    }

    #[test]
    fn test_date_range_to_search_range_cross_year() {
        let params = DateRangeParams {
            start_year: 2023,
            start_month: 12,
            start_day: 31,
            end_year: 2024,
            end_month: 1,
            end_day: 1,
        };
        let search_range = params.to_search_range();

        // 2日 = 172800 秒
        assert_eq!(search_range.range_seconds, 86400 * 2);
    }

    #[test]
    fn test_datetime_to_seconds_basic() {
        // 2000/1/1 00:00:00 = 0 秒
        assert_eq!(datetime_to_seconds(2000, 1, 1, 0, 0, 0), 0);
        // 2000/1/1 00:00:01 = 1 秒
        assert_eq!(datetime_to_seconds(2000, 1, 1, 0, 0, 1), 1);
        // 2000/1/2 00:00:00 = 86400 秒
        assert_eq!(datetime_to_seconds(2000, 1, 2, 0, 0, 0), 86400);
    }

    #[test]
    fn test_datetime_to_seconds_end_of_day() {
        // 2000/1/1 23:59:59
        let secs = datetime_to_seconds(2000, 1, 1, 23, 59, 59);
        assert_eq!(secs, 86399);
    }

    #[test]
    fn test_is_leap_year() {
        assert!(is_leap_year(2000)); // 400で割り切れる
        assert!(!is_leap_year(2001));
        assert!(is_leap_year(2004)); // 4で割り切れる
        assert!(!is_leap_year(2100)); // 100で割り切れるが400では割り切れない
    }
}
