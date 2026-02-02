//! 生成関連型
//!
//! 生成処理の入出力型、エンカウント情報を定義。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use super::config::RomVersion;
use super::needle::NeedleDirection;
use super::pokemon::{
    AbilitySlot, Gender, GenderRatio, HeldItemSlot, InheritanceSlot, Ivs, LeadAbilityEffect,
    Nature, Pid, ShinyType, TrainerInfo,
};
use super::seeds::SeedOrigin;

// ===== エンカウント結果 =====

/// エンカウント結果 (`DustCloud` / `PokemonShadow` / `Fishing` 用)
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(tag = "type", content = "item")]
pub enum EncounterResult {
    /// ポケモン出現
    #[default]
    Pokemon,
    /// アイテム取得
    Item(ItemContent),
    /// 釣り失敗
    FishingFailed,
}

/// アイテム内容 (`DustCloud` / `PokemonShadow` 用)
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ItemContent {
    /// 進化の石 (`DustCloud`)
    EvolutionStone,
    /// ジュエル (`DustCloud`)
    Jewel,
    /// かわらずのいし (`DustCloud`)
    Everstone,
    /// 羽根 (`PokemonShadow`)
    Feather,
}

// ===== エンカウント種別 =====

/// エンカウント種別
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum EncounterType {
    // 野生エンカウント - 陸上
    Normal,
    ShakingGrass,
    DustCloud,
    PokemonShadow,
    // 野生エンカウント - 水上
    Surfing,
    SurfingBubble,
    Fishing,
    FishingBubble,
    // 固定エンカウント
    StaticSymbol,
    StaticStarter,
    StaticFossil,
    StaticEvent,
    Roamer,
    HiddenGrotto,
    // 孵化
    Egg,
}

/// エンカウント方法
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum EncounterMethod {
    /// 静止エンカウント (確定エンカウント、判定スキップ)
    ///
    /// あまいかおり使用時や固定シンボルとの接触など
    #[default]
    Stationary,
    /// 移動エンカウント (エンカウント判定あり)
    Moving,
}

// ===== 起動設定 =====

/// 起動方法
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum StartMode {
    /// 最初から
    NewGame,
    /// 続きから
    Continue,
}

/// セーブ状態
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum SaveState {
    /// セーブデータなし
    NoSave,
    /// セーブデータあり
    WithSave,
    /// セーブ + 思い出リンク済み (BW2 のみ)
    WithMemoryLink,
}

/// 起動設定
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GameStartConfig {
    pub start_mode: StartMode,
    pub save_state: SaveState,
}

impl GameStartConfig {
    /// 組み合わせの妥当性を検証
    ///
    /// # Errors
    /// 無効な組み合わせの場合にエラーを返す。
    pub fn validate(&self, version: RomVersion) -> Result<(), String> {
        let is_bw2 = matches!(version, RomVersion::Black2 | RomVersion::White2);

        // 思い出リンクは BW2 のみ
        if self.save_state == SaveState::WithMemoryLink && !is_bw2 {
            return Err("MemoryLink is only available in BW2".to_string());
        }

        // 続きからはセーブ必須
        if self.start_mode == StartMode::Continue && self.save_state == SaveState::NoSave {
            return Err("Continue requires a save file".to_string());
        }

        Ok(())
    }
}

// ===== 移動エンカウント情報 =====

/// 移動エンカウント判定結果
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum MovingEncounterLikelihood {
    /// 歩数にかかわらず確定エンカウント (最低閾値通過)
    #[default]
    Guaranteed,
    /// 歩数次第でエンカウント (BW2 のみ、最高閾値のみ通過)
    Possible,
    /// エンカウント無し (最高閾値も不通過)
    NoEncounter,
}

/// 移動エンカウント情報
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MovingEncounterInfo {
    /// 判定結果
    pub likelihood: MovingEncounterLikelihood,
    /// 判定に使用した乱数値
    pub rand_value: u32,
}

// ===== 特殊エンカウント情報 =====

/// 特殊エンカウント発生方向
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum SpecialEncounterDirection {
    #[default]
    Right,
    Up,
    Left,
    Down,
}

/// 特殊エンカウント情報
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SpecialEncounterInfo {
    /// 発生するか (10% 判定結果)
    pub triggered: bool,
    /// 発生方向 (triggered = true の場合のみ有効)
    pub direction: SpecialEncounterDirection,
    /// 発生判定に使用した乱数値
    pub trigger_rand: u32,
    /// 方向決定に使用した乱数値
    pub direction_rand: u32,
}

// ===== 生成共通設定 =====

/// 生成共通設定
///
/// オフセット計算と検索範囲を定義。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GenerationConfig {
    /// ROM バージョン (`game_offset` 計算用)
    pub version: RomVersion,
    /// 起動設定 (`game_offset` 計算用)
    pub game_start: GameStartConfig,
    /// 検索開始位置 (advance の初期値)
    pub user_offset: u32,
    /// 検索終了位置
    pub max_advance: u32,
}

// ===== 生成結果 =====

/// ポケモン/卵の共通個体情報
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct CorePokemonData {
    /// 性格値
    pub pid: Pid,
    /// 性格
    pub nature: Nature,
    /// 特性スロット
    pub ability_slot: AbilitySlot,
    /// 性別
    pub gender: Gender,
    /// 色違い種別
    pub shiny_type: ShinyType,
    /// 個体値
    pub ivs: Ivs,
}

/// 完全な個体データ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GeneratedPokemonData {
    // 列挙コンテキスト
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    /// 生成元情報
    pub source: SeedOrigin,
    // 共通個体情報 (ネスト)
    pub core: CorePokemonData,
    // ポケモン固有
    pub species_id: u16,
    pub level: u8,
    pub sync_applied: bool,
    pub held_item_slot: HeldItemSlot,
    // === エンカウント付加情報 (排反) ===
    /// 移動エンカウント情報 (Normal/Surfing + Moving 時のみ Some)
    pub moving_encounter: Option<MovingEncounterInfo>,
    /// 特殊エンカウント情報 (ShakingGrass/DustCloud/SurfingBubble/FishingBubble/PokemonShadow 時のみ Some)
    pub special_encounter: Option<SpecialEncounterInfo>,
    /// エンカウント結果 (DustCloud/PokemonShadow 時に使用。通常は Pokemon)
    pub encounter_result: EncounterResult,
}

/// 完全な卵データ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GeneratedEggData {
    // 列挙コンテキスト
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    /// 生成元情報
    pub source: SeedOrigin,
    // 共通個体情報 (ネスト)
    pub core: CorePokemonData,
    // 卵固有
    /// 遺伝情報 (配列化)
    pub inheritance: [InheritanceSlot; 3],
    /// NPC消費による猶予フレーム (`consider_npc` = false 時は None)
    pub margin_frames: Option<u32>,
}

// ===== 生成パラメータ (WASM 公開用) =======

/// かわらずのいし効果
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum EverstonePlan {
    /// かわらずのいしなし
    #[default]
    None,
    /// 固定性格 (所持親の性格)
    Fixed(Nature),
}

/// エンカウントスロット設定
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EncounterSlotConfig {
    /// ポケモン種族 ID
    pub species_id: u16,
    /// 最小レベル
    pub level_min: u8,
    /// 最大レベル
    pub level_max: u8,
    /// 性別比
    pub gender_ratio: GenderRatio,
    /// 所持アイテムあり
    pub has_held_item: bool,
    /// 色違いロック
    pub shiny_locked: bool,
}

/// ポケモン生成パラメータ
///
/// `GenerationConfig` を含まない。生成条件のみを定義。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct PokemonGenerationParams {
    /// トレーナー情報
    pub trainer: TrainerInfo,
    /// エンカウント種別
    pub encounter_type: EncounterType,
    /// エンカウント方法 (Wild のみ有効、Static は `Stationary` 固定)
    pub encounter_method: EncounterMethod,
    /// 先頭特性効果
    pub lead_ability: LeadAbilityEffect,
    /// ひかるおまもり所持
    pub shiny_charm: bool,
    /// エンカウントスロット (Wild: 複数、Static: 1件)
    pub slots: Vec<EncounterSlotConfig>,
}

/// 卵生成パラメータ
///
/// `GenerationConfig` を含まない。生成条件のみを定義。
#[allow(clippy::struct_excessive_bools)]
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggGenerationParams {
    /// トレーナー情報
    pub trainer: TrainerInfo,
    /// かわらずのいし効果
    pub everstone: EverstonePlan,
    /// メス親が夢特性か
    pub female_has_hidden: bool,
    /// メタモン使用
    pub uses_ditto: bool,
    /// 性別比率
    pub gender_ratio: GenderRatio,
    /// ニドラン♀フラグ
    pub nidoran_flag: bool,
    /// 国際孵化 (Masuda Method)
    pub masuda_method: bool,
    /// オス親の個体値
    pub parent_male: Ivs,
    /// メス親の個体値
    pub parent_female: Ivs,
    /// NPC消費を考慮するか
    pub consider_npc: bool,
}

// ===== Seed 指定仕様 =====

use super::config::{Datetime, DsConfig, Timer0VCountRange};
use super::keyinput::KeyInput;
use super::seeds::LcgSeed;

/// Seed 指定仕様
///
/// Generator 系 API 用の Seed 指定方法。
/// `KeySpec` と同様に、仕様から `SeedOrigin` リストに展開される。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(tag = "type")]
pub enum SeedSpec {
    /// 複数の LCG Seed を指定
    Seeds {
        /// LCG Seed のリスト
        seeds: Vec<LcgSeed>,
    },

    /// 起動条件から Seed を導出
    Startup {
        /// DS 設定
        ds: DsConfig,
        /// 起動日時
        datetime: Datetime,
        /// `Timer0` / `VCount` 範囲 (複数指定可能)
        ranges: Vec<Timer0VCountRange>,
        /// キー入力
        key_input: KeyInput,
    },
}
