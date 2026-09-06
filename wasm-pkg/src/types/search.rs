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

/// WASM 間で転送する未検証の日時探索入力。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DatetimeSearchSpaceParams {
    pub start_seconds: u32,
    pub end_seconds: u32,
    pub time_range: TimeRangeParams,
}

/// 日付範囲パラメータ (UI 入力用)
///
/// 開始日と終了日の両端を含む UI 入力。検証と変換は共通探索空間が担う。
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

// ===== MT Seed 起動時刻検索 =====

/// MT Seed 検索パラメータ (単一組み合わせ)
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeSearchParams {
    /// 検索対象の MT Seed セット
    pub target_seeds: Vec<MtSeed>,
    /// DS 設定
    pub ds: DsConfig,
    /// 日時探索空間 (転送用入力)
    pub search_space: DatetimeSearchSpaceParams,
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
    /// 日時探索空間 (転送用入力)
    pub search_space: DatetimeSearchSpaceParams,
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
    /// 日時探索空間 (転送用入力)
    pub search_space: DatetimeSearchSpaceParams,
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

/// ポケモン条件による日時検索の単一タスク。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct PokemonDatetimeSearchParams {
    pub ds: DsConfig,
    pub search_space: DatetimeSearchSpaceParams,
    pub condition: StartupCondition,
    pub pokemon_params: super::generation::PokemonGenerationParams,
    pub gen_config: GenerationConfig,
    pub filter: super::filter::PokemonDatetimeSearchFilter,
}

/// 一回の同期呼び出しで処理・返却する上限。検索全体の打ち切りには使わない。
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct PokemonSearchBatchLimits {
    pub max_candidates: u32,
    pub max_results: u32,
}

/// 処理済み件数は不一致を含む消費位置数。
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi, large_number_types_as_bigints)]
pub struct PokemonDatetimeSearchBatch {
    pub results: Vec<super::generation::GeneratedPokemonData>,
    pub processed_count: u64,
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
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
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
