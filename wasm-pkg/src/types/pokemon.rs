//! ポケモンドメイン型
//!
//! 性格、性別、個体値など、ポケモン個体に関する型を定義。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

// ===== 性格 =====

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

// ===== 性別 =====

/// 性別
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum Gender {
    Male,
    Female,
    Genderless,
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

// ===== 特性・色違い =====

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

// ===== 遺伝 =====

/// 遺伝スロット
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, Default, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct InheritanceSlot {
    /// 遺伝先ステータス (0=HP, 1=Atk, 2=Def, 3=SpA, 4=SpD, 5=Spe)
    pub stat: u8,
    /// 遺伝元親 (0=Male, 1=Female)
    pub parent: u8,
}

impl InheritanceSlot {
    /// 新しい遺伝スロットを作成
    #[inline]
    pub const fn new(stat: u8, parent: u8) -> Self {
        Self { stat, parent }
    }
}

// ===== 持ち物 =====

/// 持ち物スロット
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum HeldItemSlot {
    Common,
    Rare,
    VeryRare,
    #[default]
    None,
}

// ===== 先頭特性効果 =====

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

// ===== めざめるパワー =====

/// めざめるパワーのタイプ
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[repr(u8)]
pub enum HiddenPowerType {
    Fighting = 0,
    Flying = 1,
    Poison = 2,
    Ground = 3,
    Rock = 4,
    Bug = 5,
    Ghost = 6,
    Steel = 7,
    Fire = 8,
    Water = 9,
    Grass = 10,
    Electric = 11,
    Psychic = 12,
    Ice = 13,
    Dragon = 14,
    Dark = 15,
}

impl HiddenPowerType {
    /// u8 から変換 (0-15)
    #[inline]
    pub const fn from_u8(value: u8) -> Self {
        match value & 0x0F {
            0 => Self::Fighting,
            1 => Self::Flying,
            2 => Self::Poison,
            3 => Self::Ground,
            4 => Self::Rock,
            5 => Self::Bug,
            6 => Self::Ghost,
            7 => Self::Steel,
            8 => Self::Fire,
            9 => Self::Water,
            10 => Self::Grass,
            11 => Self::Electric,
            12 => Self::Psychic,
            13 => Self::Ice,
            14 => Self::Dragon,
            _ => Self::Dark,
        }
    }

    /// タイプ名を取得
    pub const fn name(&self) -> &'static str {
        match self {
            Self::Fighting => "Fighting",
            Self::Flying => "Flying",
            Self::Poison => "Poison",
            Self::Ground => "Ground",
            Self::Rock => "Rock",
            Self::Bug => "Bug",
            Self::Ghost => "Ghost",
            Self::Steel => "Steel",
            Self::Fire => "Fire",
            Self::Water => "Water",
            Self::Grass => "Grass",
            Self::Electric => "Electric",
            Self::Psychic => "Psychic",
            Self::Ice => "Ice",
            Self::Dragon => "Dragon",
            Self::Dark => "Dark",
        }
    }
}

// ===== 個体値 =====

/// Unknown IV sentinel value (親個体の不明IV等で使用)
pub const IV_VALUE_UNKNOWN: u8 = 32;

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
    pub const fn has_unknown(&self) -> bool {
        self.hp == IV_VALUE_UNKNOWN
            || self.atk == IV_VALUE_UNKNOWN
            || self.def == IV_VALUE_UNKNOWN
            || self.spa == IV_VALUE_UNKNOWN
            || self.spd == IV_VALUE_UNKNOWN
            || self.spe == IV_VALUE_UNKNOWN
    }

    /// 全 IV が有効範囲 (0-31) かどうか
    pub const fn is_valid(&self) -> bool {
        self.hp <= 31
            && self.atk <= 31
            && self.def <= 31
            && self.spa <= 31
            && self.spd <= 31
            && self.spe <= 31
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

    /// めざめるパワーのタイプを計算
    ///
    /// Gen3-5 の計算式に準拠。
    /// `type = ((HP&1) + (Atk&1)*2 + (Def&1)*4 + (Spe&1)*8 + (SpA&1)*16 + (SpD&1)*32) * 15 / 63`
    #[allow(clippy::cast_possible_truncation)]
    pub fn hidden_power_type(&self) -> HiddenPowerType {
        let type_bits = u32::from(self.hp & 1)
            | (u32::from(self.atk & 1) << 1)
            | (u32::from(self.def & 1) << 2)
            | (u32::from(self.spe & 1) << 3)
            | (u32::from(self.spa & 1) << 4)
            | (u32::from(self.spd & 1) << 5);
        // type_bits は 0-63、結果は 0-15 なので truncation は発生しない
        let type_index = (type_bits * 15 / 63) as u8;
        HiddenPowerType::from_u8(type_index)
    }

    /// めざめるパワーの威力を計算 (30-70)
    ///
    /// Gen3-5 の計算式に準拠。
    /// `power = ((HP>>1&1) + (Atk>>1&1)*2 + (Def>>1&1)*4 + (Spe>>1&1)*8 + (SpA>>1&1)*16 + (SpD>>1&1)*32) * 40 / 63 + 30`
    #[allow(clippy::cast_possible_truncation)]
    pub fn hidden_power_power(&self) -> u8 {
        let power_bits = u32::from((self.hp >> 1) & 1)
            | (u32::from((self.atk >> 1) & 1) << 1)
            | (u32::from((self.def >> 1) & 1) << 2)
            | (u32::from((self.spe >> 1) & 1) << 3)
            | (u32::from((self.spa >> 1) & 1) << 4)
            | (u32::from((self.spd >> 1) & 1) << 5);
        // power_bits は 0-63、結果は 30-70 なので truncation は発生しない
        ((power_bits * 40 / 63) + 30) as u8
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

// ===== IV フィルタ =====

/// IV フィルタ条件
///
/// 各ステータスの範囲指定に加え、めざめるパワーのタイプ・威力条件を指定可能。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct IvFilter {
    /// HP (min, max)
    pub hp: (u8, u8),
    /// 攻撃 (min, max)
    pub atk: (u8, u8),
    /// 防御 (min, max)
    pub def: (u8, u8),
    /// 特攻 (min, max)
    pub spa: (u8, u8),
    /// 特防 (min, max)
    pub spd: (u8, u8),
    /// 素早さ (min, max)
    pub spe: (u8, u8),
    /// めざパタイプ条件 (指定タイプのいずれかに一致)
    #[serde(default)]
    pub hidden_power_types: Option<Vec<HiddenPowerType>>,
    /// めざパ威力下限 (30-70)
    #[serde(default)]
    pub hidden_power_min_power: Option<u8>,
}

impl IvFilter {
    /// 全範囲 (0-31) を許容するフィルタ
    pub const fn any() -> Self {
        Self {
            hp: (0, 31),
            atk: (0, 31),
            def: (0, 31),
            spa: (0, 31),
            spd: (0, 31),
            spe: (0, 31),
            hidden_power_types: None,
            hidden_power_min_power: None,
        }
    }

    /// 6V フィルタ
    pub const fn six_v() -> Self {
        Self {
            hp: (31, 31),
            atk: (31, 31),
            def: (31, 31),
            spa: (31, 31),
            spd: (31, 31),
            spe: (31, 31),
            hidden_power_types: None,
            hidden_power_min_power: None,
        }
    }

    /// 指定 IV が条件を満たすか判定
    #[inline]
    pub fn matches(&self, ivs: &Ivs) -> bool {
        // 各ステータスの範囲チェック
        if ivs.hp < self.hp.0
            || ivs.hp > self.hp.1
            || ivs.atk < self.atk.0
            || ivs.atk > self.atk.1
            || ivs.def < self.def.0
            || ivs.def > self.def.1
            || ivs.spa < self.spa.0
            || ivs.spa > self.spa.1
            || ivs.spd < self.spd.0
            || ivs.spd > self.spd.1
            || ivs.spe < self.spe.0
            || ivs.spe > self.spe.1
        {
            return false;
        }

        // めざパタイプチェック
        if let Some(ref types) = self.hidden_power_types
            && !types.is_empty()
            && !types.contains(&ivs.hidden_power_type())
        {
            return false;
        }

        // めざパ威力チェック
        if let Some(min_power) = self.hidden_power_min_power
            && ivs.hidden_power_power() < min_power
        {
            return false;
        }

        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hidden_power_type_from_u8() {
        assert_eq!(HiddenPowerType::from_u8(0), HiddenPowerType::Fighting);
        assert_eq!(HiddenPowerType::from_u8(8), HiddenPowerType::Fire);
        assert_eq!(HiddenPowerType::from_u8(13), HiddenPowerType::Ice);
        assert_eq!(HiddenPowerType::from_u8(15), HiddenPowerType::Dark);
        // 16以上は & 0x0F でマスクされる
        assert_eq!(HiddenPowerType::from_u8(16), HiddenPowerType::Fighting);
    }

    #[test]
    fn test_hidden_power_type_ice() {
        // めざ氷の典型的な個体値: 31-31-31-31-31-31 (6V) は Dark
        let ivs_6v = Ivs::new(31, 31, 31, 31, 31, 31);
        assert_eq!(ivs_6v.hidden_power_type(), HiddenPowerType::Dark);

        // めざ氷: HP奇, Atk偶, Def偶, SpA奇, SpD奇, Spe奇
        // 31-30-30-31-31-31
        let ivs_ice = Ivs::new(31, 30, 30, 31, 31, 31);
        // type_bits = 1 + 0 + 0 + 8 + 16 + 32 = 57
        // type_index = 57 * 15 / 63 = 13 = Ice
        assert_eq!(ivs_ice.hidden_power_type(), HiddenPowerType::Ice);
    }

    #[test]
    fn test_hidden_power_type_fire() {
        // Fire(8) を得るには type_bits * 15 / 63 = 8
        // type_bits ∈ [34, 37] (34*15/63=8.09..., 37*15/63=8.80...)
        // type_bits = 34 = 0b100010 = SpD(32) + Atk(2)
        // HP偶, Atk奇, Def偶, Spe偶, SpA偶, SpD奇
        let ivs_fire = Ivs::new(30, 31, 30, 30, 31, 30);
        assert_eq!(ivs_fire.hidden_power_type(), HiddenPowerType::Fire);
    }

    #[test]
    fn test_hidden_power_power_max() {
        // 威力最大 (70): 全ての IV の bit1 が 1
        // HP, Atk, Def, Spe, SpA, SpD 全て奇数で bit1=1 => 31 or 偶数で bit1=1 => 2,3,6,7,10,11...
        let ivs_max_power = Ivs::new(31, 31, 31, 31, 31, 31);
        // power_bits = 1+2+4+8+16+32 = 63
        // power = 63 * 40 / 63 + 30 = 70
        assert_eq!(ivs_max_power.hidden_power_power(), 70);
    }

    #[test]
    fn test_hidden_power_power_min() {
        // 威力最小 (30): 全ての IV の bit1 が 0
        let ivs_min_power = Ivs::new(0, 0, 0, 0, 0, 0);
        // power_bits = 0
        // power = 0 * 40 / 63 + 30 = 30
        assert_eq!(ivs_min_power.hidden_power_power(), 30);
    }

    #[test]
    fn test_ivs_to_array() {
        let ivs = Ivs::new(31, 30, 29, 28, 27, 26);
        assert_eq!(ivs.to_array(), [31, 30, 29, 28, 27, 26]);
    }

    #[test]
    fn test_ivs_from_array() {
        let arr = [31, 30, 29, 28, 27, 26];
        let ivs = Ivs::from_array(arr);
        assert_eq!(ivs.hp, 31);
        assert_eq!(ivs.atk, 30);
        assert_eq!(ivs.spe, 26);
    }

    #[test]
    fn test_ivs_has_unknown() {
        let ivs_normal = Ivs::new(31, 31, 31, 31, 31, 31);
        assert!(!ivs_normal.has_unknown());

        let ivs_unknown = Ivs::new(31, IV_VALUE_UNKNOWN, 31, 31, 31, 31);
        assert!(ivs_unknown.has_unknown());
    }

    #[test]
    fn test_ivs_is_valid() {
        let ivs_valid = Ivs::new(31, 31, 31, 31, 31, 31);
        assert!(ivs_valid.is_valid());

        let ivs_zero = Ivs::new(0, 0, 0, 0, 0, 0);
        assert!(ivs_zero.is_valid());

        let ivs_invalid = Ivs::new(31, 32, 31, 31, 31, 31);
        assert!(!ivs_invalid.is_valid());

        let ivs_unknown = Ivs::new(31, IV_VALUE_UNKNOWN, 31, 31, 31, 31);
        assert!(!ivs_unknown.is_valid());
    }

    #[test]
    fn test_iv_filter_any() {
        let filter = IvFilter::any();
        let ivs = Ivs::new(15, 15, 15, 15, 15, 15);
        assert!(filter.matches(&ivs));
    }

    #[test]
    fn test_iv_filter_six_v() {
        let filter = IvFilter::six_v();
        let ivs_6v = Ivs::new(31, 31, 31, 31, 31, 31);
        let ivs_5v = Ivs::new(31, 30, 31, 31, 31, 31);
        assert!(filter.matches(&ivs_6v));
        assert!(!filter.matches(&ivs_5v));
    }

    #[test]
    fn test_iv_filter_hidden_power_type() {
        let filter = IvFilter {
            hp: (0, 31),
            atk: (0, 31),
            def: (0, 31),
            spa: (0, 31),
            spd: (0, 31),
            spe: (0, 31),
            hidden_power_types: Some(vec![HiddenPowerType::Ice]),
            hidden_power_min_power: None,
        };

        // めざ氷: 31-30-30-31-31-31
        let ivs_ice = Ivs::new(31, 30, 30, 31, 31, 31);
        assert!(filter.matches(&ivs_ice));

        // めざ炎: 30-31-30-30-31-30
        let ivs_fire = Ivs::new(30, 31, 30, 30, 31, 30);
        assert!(!filter.matches(&ivs_fire));
    }

    #[test]
    fn test_iv_filter_hidden_power_power() {
        let filter = IvFilter {
            hp: (0, 31),
            atk: (0, 31),
            def: (0, 31),
            spa: (0, 31),
            spd: (0, 31),
            spe: (0, 31),
            hidden_power_types: None,
            hidden_power_min_power: Some(70),
        };

        // 威力最大 (70): 6V
        let ivs_max = Ivs::new(31, 31, 31, 31, 31, 31);
        assert!(filter.matches(&ivs_max));

        // 威力最小 (30): 0V
        let ivs_min = Ivs::new(0, 0, 0, 0, 0, 0);
        assert!(!filter.matches(&ivs_min));
    }
}
