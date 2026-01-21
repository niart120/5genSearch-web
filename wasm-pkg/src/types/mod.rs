//! 共通型定義
//!
//! tsify による TypeScript 型の自動生成を行う。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

// ===== 基本列挙型 =====

/// DS ハードウェア種別
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum Hardware {
    Ds,
    DsLite,
    Dsi,
    Dsi3ds,
}

/// ROM バージョン
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum RomVersion {
    Black,
    White,
    Black2,
    White2,
}

impl RomVersion {
    /// BW (Black/White) かどうか
    #[inline]
    pub const fn is_bw(self) -> bool {
        matches!(self, Self::Black | Self::White)
    }

    /// BW2 (Black2/White2) かどうか
    #[inline]
    pub const fn is_bw2(self) -> bool {
        matches!(self, Self::Black2 | Self::White2)
    }
}

/// ROM リージョン
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum RomRegion {
    Jpn,
    Kor,
    Usa,
    Ger,
    Fra,
    Spa,
    Ita,
}

/// 性格
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[repr(u8)]
pub enum Nature {
    Hardy = 0,
    Lonely = 1,
    Brave = 2,
    Adamant = 3,
    Naughty = 4,
    Bold = 5,
    Docile = 6,
    Relaxed = 7,
    Impish = 8,
    Lax = 9,
    Timid = 10,
    Hasty = 11,
    Serious = 12,
    Jolly = 13,
    Naive = 14,
    Modest = 15,
    Mild = 16,
    Quiet = 17,
    Bashful = 18,
    Rash = 19,
    Calm = 20,
    Gentle = 21,
    Sassy = 22,
    Careful = 23,
    Quirky = 24,
}

impl Nature {
    /// u8 値から Nature に変換 (0-24)
    ///
    /// 25 以上の値は modulo 25 で正規化される。
    #[inline]
    pub const fn from_u8(value: u8) -> Self {
        match value % 25 {
            0 => Self::Hardy,
            1 => Self::Lonely,
            2 => Self::Brave,
            3 => Self::Adamant,
            4 => Self::Naughty,
            5 => Self::Bold,
            6 => Self::Docile,
            7 => Self::Relaxed,
            8 => Self::Impish,
            9 => Self::Lax,
            10 => Self::Timid,
            11 => Self::Hasty,
            12 => Self::Serious,
            13 => Self::Jolly,
            14 => Self::Naive,
            15 => Self::Modest,
            16 => Self::Mild,
            17 => Self::Quiet,
            18 => Self::Bashful,
            19 => Self::Rash,
            20 => Self::Calm,
            21 => Self::Gentle,
            22 => Self::Sassy,
            23 => Self::Careful,
            _ => Self::Quirky, // 24
        }
    }
}

/// 性別
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum Gender {
    Male,
    Female,
    Genderless,
}

/// 特性スロット
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum AbilitySlot {
    First,
    Second,
    Hidden,
}

/// 色違い種別
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ShinyType {
    #[default]
    None,
    Star,
    Square,
}

// ===== Seed 型 (NewType パターン) =====

/// LCG Seed (64bit)
///
/// SHA-1 ハッシュから導出される初期シード。
/// `large_number_types_as_bigints` により TypeScript では bigint として扱われる。
#[derive(Tsify, Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi, large_number_types_as_bigints)]
#[serde(transparent)]
#[repr(transparent)]
pub struct LcgSeed(pub u64);

impl LcgSeed {
    #[inline]
    pub const fn new(value: u64) -> Self {
        Self(value)
    }

    #[inline]
    pub const fn value(self) -> u64 {
        self.0
    }
}

impl From<u64> for LcgSeed {
    fn from(value: u64) -> Self {
        Self(value)
    }
}

impl From<LcgSeed> for u64 {
    fn from(seed: LcgSeed) -> Self {
        seed.0
    }
}

/// MT Seed (32bit)
///
/// LCG から導出される MT19937 初期シード。
/// u32 は JavaScript の safe integer 範囲内のため number として扱われる。
#[derive(Tsify, Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(transparent)]
#[repr(transparent)]
pub struct MtSeed(pub u32);

impl MtSeed {
    #[inline]
    pub const fn new(value: u32) -> Self {
        Self(value)
    }

    #[inline]
    pub const fn value(self) -> u32 {
        self.0
    }
}

impl From<u32> for MtSeed {
    fn from(value: u32) -> Self {
        Self(value)
    }
}

impl From<MtSeed> for u32 {
    fn from(seed: MtSeed) -> Self {
        seed.0
    }
}

/// レポート針方向 (0-7)
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[repr(u8)]
pub enum NeedleDirection {
    N = 0,
    NE = 1,
    E = 2,
    SE = 3,
    S = 4,
    SW = 5,
    W = 6,
    NW = 7,
}

impl NeedleDirection {
    /// 数値から変換
    #[inline]
    pub const fn from_value(v: u8) -> Self {
        match v & 7 {
            0 => Self::N,
            1 => Self::NE,
            2 => Self::E,
            3 => Self::SE,
            4 => Self::S,
            5 => Self::SW,
            6 => Self::W,
            _ => Self::NW,
        }
    }

    /// 数値へ変換
    #[inline]
    pub const fn value(self) -> u8 {
        self as u8
    }
}

// ===== 個体値 =====

/// Unknown IV sentinel value (親個体の不明IV等で使用)
pub const IV_VALUE_UNKNOWN: u8 = 32;

/// 個体値セット \[HP, Atk, Def, `SpA`, `SpD`, Spe\]
pub type IvSet = [u8; 6];

/// 個体値セット (構造体版)
///
/// 各フィールドは 0-31 の通常値、または 32 (Unknown) を取る。
/// TypeScript 側では `{ hp: number, atk: number, ... }` として扱われる。
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, Default, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct Ivs {
    pub hp: u8,
    pub atk: u8,
    pub def: u8,
    pub spa: u8,
    pub spd: u8,
    pub spe: u8,
}

impl Ivs {
    pub const fn new(hp: u8, atk: u8, def: u8, spa: u8, spd: u8, spe: u8) -> Self {
        Self {
            hp,
            atk,
            def,
            spa,
            spd,
            spe,
        }
    }

    /// 全て同じ値で初期化
    pub const fn uniform(value: u8) -> Self {
        Self {
            hp: value,
            atk: value,
            def: value,
            spa: value,
            spd: value,
            spe: value,
        }
    }

    /// インデックスで取得 (0=HP, 1=Atk, 2=Def, 3=SpA, 4=SpD, 5=Spe)
    pub const fn get(&self, idx: usize) -> u8 {
        match idx {
            0 => self.hp,
            1 => self.atk,
            2 => self.def,
            3 => self.spa,
            4 => self.spd,
            _ => self.spe,
        }
    }

    /// インデックスで設定
    pub fn set(&mut self, idx: usize, value: u8) {
        match idx {
            0 => self.hp = value,
            1 => self.atk = value,
            2 => self.def = value,
            3 => self.spa = value,
            4 => self.spd = value,
            _ => self.spe = value,
        }
    }

    /// Unknown を含むかどうか
    pub const fn contains_unknown(&self) -> bool {
        self.hp == IV_VALUE_UNKNOWN
            || self.atk == IV_VALUE_UNKNOWN
            || self.def == IV_VALUE_UNKNOWN
            || self.spa == IV_VALUE_UNKNOWN
            || self.spd == IV_VALUE_UNKNOWN
            || self.spe == IV_VALUE_UNKNOWN
    }

    /// 配列から変換
    pub const fn from_array(arr: [u8; 6]) -> Self {
        Self {
            hp: arr[0],
            atk: arr[1],
            def: arr[2],
            spa: arr[3],
            spd: arr[4],
            spe: arr[5],
        }
    }

    /// 配列へ変換
    pub const fn to_array(&self) -> [u8; 6] {
        [self.hp, self.atk, self.def, self.spa, self.spd, self.spe]
    }
}

impl From<[u8; 6]> for Ivs {
    fn from(arr: [u8; 6]) -> Self {
        Self::from_array(arr)
    }
}

impl From<Ivs> for [u8; 6] {
    fn from(ivs: Ivs) -> Self {
        ivs.to_array()
    }
}

// ===== 共通型 (datetime_search, generation, seed_search 等で使用) =====

/// DS 本体設定
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DsConfig {
    pub mac: [u8; 6],
    pub hardware: Hardware,
    pub version: RomVersion,
    pub region: RomRegion,
}

/// 探索セグメント (`Timer0` × `VCount` × `KeyCode`)
///
/// # `key_code` フォーマット
///
/// `key_code = key_mask XOR 0x2FFF`
///
/// - `key_mask`: 押下キーのビットマスク (押下時 = 1)
/// - ビット割り当て: bit0=A, bit1=B, bit2=Select, bit3=Start, bit4=→, bit5=←, bit6=↑, bit7=↓, bit8=R, bit9=L, bit10=X, bit11=Y
/// - キー入力なし時は `0x2FFF`
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SearchSegment {
    pub timer0: u16,
    pub vcount: u8,
    /// キー入力値: `key_mask XOR 0x2FFF` (入力なし = `0x2FFF`)
    pub key_code: u32,
}

/// VCount/Timer0 範囲
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct VCountTimer0Range {
    pub vcount: u8,
    pub timer0_min: u16,
    pub timer0_max: u16,
}

// ===== 生成アルゴリズム用型 =====

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

/// 先頭ポケモンの特性効果
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, Default, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum LeadAbilityEffect {
    /// 特性効果なし
    #[default]
    None,
    /// シンクロ: 50% で性格一致
    Synchronize(Nature),
    /// ふくがん: 持ち物確率上昇
    CompoundEyes,
}

/// 性別比
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum GenderRatio {
    Genderless,
    MaleOnly,
    FemaleOnly,
    /// 性別値の閾値 (例: 127 = 1:1, 31 = 7:1, 63 = 3:1, 191 = 1:3)
    Threshold(u8),
}
