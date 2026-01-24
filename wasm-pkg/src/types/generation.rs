//! 生成関連型
//!
//! 生成処理の入出力型、エンカウント情報を定義。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use super::config::{DatetimeParams, KeyCode, RomVersion};
use super::pokemon::{Gender, HeldItemSlot, Ivs, Nature, ShinyType};
use super::seeds::NeedleDirection;

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
    /// あまいかおり使用 (確定エンカウント、判定スキップ)
    #[default]
    SweetScent,
    /// 移動中 (エンカウント判定あり)
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

// ===== 生成元情報 =====

/// 生成元情報
///
/// 生成結果のソース情報。各エントリがどの条件から生成されたかを示す。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum GenerationSource {
    /// 固定 Seed から生成
    Fixed {
        /// `BaseSeed` (SHA-1 から導出)
        #[tsify(type = "bigint")]
        base_seed: u64,
    },
    /// 複数 Seed 指定から生成
    Multiple {
        /// `BaseSeed` (SHA-1 から導出)
        #[tsify(type = "bigint")]
        base_seed: u64,
        /// 入力 seeds 配列のインデックス
        seed_index: u32,
    },
    /// 日時検索から生成
    Datetime {
        /// `BaseSeed` (SHA-1 から導出)
        #[tsify(type = "bigint")]
        base_seed: u64,
        /// 起動日時
        datetime: DatetimeParams,
        /// `Timer0` 値
        timer0: u16,
        /// `VCount` 値
        vcount: u8,
        /// キー入力コード
        key_code: KeyCode,
    },
}

impl GenerationSource {
    /// Fixed ソースを作成
    pub const fn fixed(base_seed: u64) -> Self {
        Self::Fixed { base_seed }
    }

    /// Multiple ソースを作成
    pub const fn multiple(base_seed: u64, seed_index: u32) -> Self {
        Self::Multiple {
            base_seed,
            seed_index,
        }
    }

    /// Datetime ソースを作成
    pub const fn datetime(
        base_seed: u64,
        datetime: DatetimeParams,
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
    pub const fn base_seed(&self) -> u64 {
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
    pub source: GenerationSource,
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
    pub source: GenerationSource,
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
