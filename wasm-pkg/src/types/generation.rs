//! 生成関連型
//!
//! 生成処理の入出力型、エンカウント情報を定義。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use super::config::{Datetime, RomVersion, SeedInput, StartupCondition};
use super::needle::NeedleDirection;
use super::pokemon::{
    Gender, GenderRatio, HeldItemSlot, Ivs, LeadAbilityEffect, Nature, ShinyType,
};
use super::seeds::{LcgSeed, MtSeed};

// ===== エンカウント結果 =====

/// エンカウント結果 (`DustCloud` / `PokemonShadow` 用)
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(tag = "type", content = "item")]
pub enum EncounterResult {
    /// ポケモン出現
    #[default]
    Pokemon,
    /// アイテム取得
    Item(ItemContent),
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
    // 野生エンカウント
    Normal,
    ShakingGrass,
    DustCloud,
    PokemonShadow,
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

// ===== トレーナー情報 =====

/// トレーナー情報
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TrainerInfo {
    /// トレーナー ID
    pub tid: u16,
    /// 裏 ID
    pub sid: u16,
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

// ===== 生成元情報 =====

/// 生成元情報
///
/// 生成結果のソース情報。各エントリがどの条件から生成されたかを示す。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum SeedOrigin {
    /// Seed 値から直接生成
    Seed {
        /// `BaseSeed` (LCG 初期値)
        base_seed: LcgSeed,
        /// MT Seed (LCG から導出)
        mt_seed: MtSeed,
    },
    /// 起動条件から生成
    Startup {
        /// `BaseSeed` (SHA-1 から導出)
        base_seed: LcgSeed,
        /// MT Seed (LCG から導出)
        mt_seed: MtSeed,
        /// 起動日時
        datetime: Datetime,
        /// 起動条件 (`Timer0` / `VCount` / `KeyCode`)
        condition: StartupCondition,
    },
}

impl SeedOrigin {
    /// Seed ソースを作成 (`MtSeed` は `LcgSeed` から導出)
    pub fn seed(base_seed: LcgSeed) -> Self {
        Self::Seed {
            base_seed,
            mt_seed: base_seed.derive_mt_seed(),
        }
    }

    /// Startup ソースを作成 (`MtSeed` は `LcgSeed` から導出)
    pub fn startup(base_seed: LcgSeed, datetime: Datetime, condition: StartupCondition) -> Self {
        Self::Startup {
            base_seed,
            mt_seed: base_seed.derive_mt_seed(),
            datetime,
            condition,
        }
    }

    /// `BaseSeed` を取得
    pub const fn base_seed(&self) -> LcgSeed {
        match self {
            Self::Seed { base_seed, .. } | Self::Startup { base_seed, .. } => *base_seed,
        }
    }

    /// `MtSeed` を取得
    pub const fn mt_seed(&self) -> MtSeed {
        match self {
            Self::Seed { mt_seed, .. } | Self::Startup { mt_seed, .. } => *mt_seed,
        }
    }
}

// ===== 生成結果 =====

/// 完全な個体データ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GeneratedPokemonData {
    // 列挙コンテキスト
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    /// 生成元情報
    pub source: SeedOrigin,
    // Seed 情報
    #[tsify(type = "bigint")]
    pub lcg_seed: u64,
    // 基本情報
    pub pid: u32,
    pub species_id: u16,
    pub level: u8,
    // 個体情報
    pub nature: Nature,
    pub sync_applied: bool,
    pub ability_slot: u8,
    pub gender: Gender,
    pub shiny_type: ShinyType,
    pub held_item_slot: HeldItemSlot,
    // IV (既存 Ivs 型を使用)
    pub ivs: Ivs,
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
    // Seed 情報
    #[tsify(type = "bigint")]
    pub lcg_seed: u64,
    // 基本情報
    pub pid: u32,
    // 個体情報
    pub nature: Nature,
    pub gender: Gender,
    pub ability_slot: u8,
    pub shiny_type: ShinyType,
    // 遺伝情報 (配列は Tsify で問題が出る場合があるので個別フィールド化)
    pub inheritance_0_stat: usize,
    pub inheritance_0_parent: u8,
    pub inheritance_1_stat: usize,
    pub inheritance_1_parent: u8,
    pub inheritance_2_stat: usize,
    pub inheritance_2_parent: u8,
    // IV (遺伝適用後)
    pub ivs: Ivs,
}

// ===== Generator パラメータ (WASM 公開用) =====

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
    /// 性別閾値 (0-255)
    pub gender_threshold: u8,
    /// 所持アイテムあり
    pub has_held_item: bool,
    /// 色違いロック
    pub shiny_locked: bool,
}

/// Seed 解決 + オフセット計算 + 検索範囲設定
///
/// Seed の解決とオフセット計算に必要な共通設定。
/// Pokemon / Egg / Needle Generator で共通して使用。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SeedContext {
    /// Seed 入力
    pub input: SeedInput,
    /// ROM バージョン
    pub version: RomVersion,
    /// 起動設定
    pub game_start: GameStartConfig,
    /// ユーザオフセット (検索開始位置)
    pub user_offset: u32,
    /// 検索終了位置
    pub max_advance: u32,
}

/// ポケモン Generator パラメータ (統合版)
///
/// Wild / Static を統合したパラメータ。
/// `encounter_type` により Wild / Static を判別する。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct PokemonGeneratorParams {
    /// Seed 解決 + オフセット + 検索範囲設定
    pub context: SeedContext,
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

/// 卵 Generator パラメータ
#[allow(clippy::struct_excessive_bools)]
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggGeneratorParams {
    /// Seed 解決 + オフセット + 検索範囲設定
    pub context: SeedContext,
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
}
