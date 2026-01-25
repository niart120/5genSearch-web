//! 生成関連型
//!
//! 生成処理の入出力型、エンカウント情報を定義。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use super::config::{Datetime, GeneratorSource, KeyCode, RomVersion};
use super::needle::NeedleDirection;
use super::pokemon::{
    Gender, GenderRatio, HeldItemSlot, Ivs, LeadAbilityEffect, Nature, ShinyType,
};
use super::seeds::LcgSeed;

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
    /// 固定 Seed から生成
    Fixed {
        /// `BaseSeed` (SHA-1 から導出)
        base_seed: LcgSeed,
    },
    /// 複数 Seed 指定から生成
    Multiple {
        /// `BaseSeed` (SHA-1 から導出)
        base_seed: LcgSeed,
        /// 入力 seeds 配列のインデックス
        seed_index: u32,
    },
    /// 日時検索から生成
    Datetime {
        /// `BaseSeed` (SHA-1 から導出)
        base_seed: LcgSeed,
        /// 起動日時
        datetime: Datetime,
        /// `Timer0` 値
        timer0: u16,
        /// `VCount` 値
        vcount: u8,
        /// キー入力コード
        key_code: KeyCode,
    },
}

impl SeedOrigin {
    /// Fixed ソースを作成
    pub const fn fixed(base_seed: LcgSeed) -> Self {
        Self::Fixed { base_seed }
    }

    /// Multiple ソースを作成
    pub const fn multiple(base_seed: LcgSeed, seed_index: u32) -> Self {
        Self::Multiple {
            base_seed,
            seed_index,
        }
    }

    /// Datetime ソースを作成
    pub const fn datetime(
        base_seed: LcgSeed,
        datetime: Datetime,
        timer0: u16,
        vcount: u8,
        key_code: KeyCode,
    ) -> Self {
        Self::Datetime {
            base_seed,
            datetime,
            timer0,
            vcount,
            key_code,
        }
    }

    /// `BaseSeed` を取得
    pub const fn base_seed(&self) -> LcgSeed {
        match self {
            Self::Fixed { base_seed }
            | Self::Multiple { base_seed, .. }
            | Self::Datetime { base_seed, .. } => *base_seed,
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
}

/// ポケモン Generator パラメータ (統合版)
///
/// Wild / Static を統合したパラメータ。
/// `encounter_type` により Wild / Static を判別する。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct PokemonGeneratorParams {
    /// 入力ソース
    pub source: GeneratorSource,
    /// ROM バージョン
    pub version: RomVersion,
    /// 起動設定
    pub game_start: GameStartConfig,
    /// ユーザオフセット
    pub user_offset: u32,
    /// エンカウント種別
    pub encounter_type: EncounterType,
    /// エンカウント方法 (Wild のみ有効、Static は `Stationary` 固定)
    pub encounter_method: EncounterMethod,
    /// トレーナー情報
    pub trainer: TrainerInfo,
    /// 先頭特性効果
    pub lead_ability: LeadAbilityEffect,
    /// ひかるおまもり所持
    pub shiny_charm: bool,
    /// 色違いロック (Static のみ有効)
    pub shiny_locked: bool,
    /// エンカウントスロット (Wild: 複数、Static: 1件)
    pub slots: Vec<EncounterSlotConfig>,
}

/// 卵 Generator パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggGeneratorParams {
    /// 入力ソース
    pub source: GeneratorSource,
    /// ROM バージョン
    pub version: RomVersion,
    /// 起動設定
    pub game_start: GameStartConfig,
    /// ユーザオフセット
    pub user_offset: u32,
    /// トレーナー ID
    pub tid: u16,
    /// 裏 ID
    pub sid: u16,
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
    /// PID リロール回数 (国際孵化等)
    pub pid_reroll_count: u8,
    /// オス親の個体値
    pub parent_male: Ivs,
    /// メス親の個体値
    pub parent_female: Ivs,
}
