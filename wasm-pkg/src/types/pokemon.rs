//! ポケモンドメイン型
//!
//! 性格、性別、個体値など、ポケモン個体に関する型を定義。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

// ===== PID =====

/// ポケモンの性格値 (Personality ID)
///
/// TypeScript では `export type Pid = number` として公開される。
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(transparent)]
#[repr(transparent)]
pub struct Pid(pub u32);

impl Pid {
    /// ゼロ値
    pub const ZERO: Self = Self(0);

    /// 生の値を取得
    #[inline]
    pub const fn raw(self) -> u32 {
        self.0
    }

    /// 通常特性スロット判定 (PID bit16)
    ///
    /// 夢特性は別途乱数ロールで決定されるため、ここでは First/Second のみ返す。
    /// 夢特性が確定した場合は呼び出し側で `AbilitySlot::Hidden` に上書きする。
    #[inline]
    pub const fn ability_slot(self) -> AbilitySlot {
        if (self.0 >> 16) & 1 == 0 {
            AbilitySlot::First
        } else {
            AbilitySlot::Second
        }
    }

    /// 性別を判定
    ///
    /// PID 下位 8bit (性別値) と `GenderRatio` の閾値を比較して性別を決定。
    #[inline]
    pub fn gender(self, ratio: GenderRatio) -> Gender {
        ratio.determine_gender_from_pid(self)
    }

    /// 色違い判定
    ///
    /// PID と `TrainerInfo` (TID/SID) から色違いタイプを判定。
    /// - xor == 0: Square (ひし形)
    /// - 1 <= xor < 8: Star (星型)
    /// - 8 <= xor: None (通常)
    #[inline]
    pub fn shiny_type(self, trainer: TrainerInfo) -> ShinyType {
        let pid_high = (self.0 >> 16) as u16;
        let pid_low = (self.0 & 0xFFFF) as u16;
        let xor = pid_high ^ pid_low ^ trainer.tid ^ trainer.sid;

        if xor == 0 {
            ShinyType::Square
        } else if xor < 8 {
            ShinyType::Star
        } else {
            ShinyType::None
        }
    }

    /// prefix無し16進数文字列に変換
    ///
    /// # Examples
    /// - `Pid(0x12345678)` → `"12345678"`
    /// - `Pid(0x00000001)` → `"00000001"`
    pub fn to_hex_string(self) -> String {
        format!("{:08X}", self.0)
    }
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

    /// 性格補正を10倍表現で取得
    ///
    /// 配列順序: `[HP, Atk, Def, SpA, SpD, Spe]`
    /// - HP は常に 10 (無補正)
    /// - 上昇補正: 11 (1.1倍)
    /// - 下降補正: 9 (0.9倍)
    /// - 無補正: 10 (1.0倍)
    ///
    /// # Examples
    /// - `Adamant`: `[10, 11, 10, 9, 10, 10]` (攻撃上昇, 特攻下降)
    /// - `Jolly`: `[10, 10, 10, 9, 10, 11]` (素早さ上昇, 特攻下降)
    /// - `Hardy`: `[10, 10, 10, 10, 10, 10]` (無補正)
    #[inline]
    pub const fn stat_modifiers(self) -> [u8; 6] {
        // 基本値: 無補正
        const BASE: [u8; 6] = [10, 10, 10, 10, 10, 10];

        // 性格ごとの上昇/下降ステータス
        // 性格値 = (上昇ステータス * 5) + 下降ステータス
        // ステータスインデックス: 0=Atk, 1=Def, 2=Spe, 3=SpA, 4=SpD
        // 同一ステータス上昇下降 = 無補正 (Hardy, Docile, Serious, Bashful, Quirky)

        match self {
            // 無補正性格 (上昇=下降)
            Self::Hardy | Self::Docile | Self::Serious | Self::Bashful | Self::Quirky => BASE,

            // Atk↑ (攻撃上昇)
            Self::Lonely => [10, 11, 9, 10, 10, 10],  // Atk↑ Def↓
            Self::Brave => [10, 11, 10, 10, 10, 9],   // Atk↑ Spe↓
            Self::Adamant => [10, 11, 10, 9, 10, 10], // Atk↑ SpA↓
            Self::Naughty => [10, 11, 10, 10, 9, 10], // Atk↑ SpD↓

            // Def↑ (防御上昇)
            Self::Bold => [10, 9, 11, 10, 10, 10],    // Def↑ Atk↓
            Self::Relaxed => [10, 10, 11, 10, 10, 9], // Def↑ Spe↓
            Self::Impish => [10, 10, 11, 9, 10, 10],  // Def↑ SpA↓
            Self::Lax => [10, 10, 11, 10, 9, 10],     // Def↑ SpD↓

            // Spe↑ (素早さ上昇)
            Self::Timid => [10, 9, 10, 10, 10, 11],   // Spe↑ Atk↓
            Self::Hasty => [10, 10, 9, 10, 10, 11],   // Spe↑ Def↓
            Self::Jolly => [10, 10, 10, 9, 10, 11],   // Spe↑ SpA↓
            Self::Naive => [10, 10, 10, 10, 9, 11],   // Spe↑ SpD↓

            // SpA↑ (特攻上昇)
            Self::Modest => [10, 9, 10, 11, 10, 10],  // SpA↑ Atk↓
            Self::Mild => [10, 10, 9, 11, 10, 10],    // SpA↑ Def↓
            Self::Quiet => [10, 10, 10, 11, 10, 9],   // SpA↑ Spe↓
            Self::Rash => [10, 10, 10, 11, 9, 10],    // SpA↑ SpD↓

            // SpD↑ (特防上昇)
            Self::Calm => [10, 9, 10, 10, 11, 10],    // SpD↑ Atk↓
            Self::Gentle => [10, 10, 9, 10, 11, 10],  // SpD↑ Def↓
            Self::Sassy => [10, 10, 10, 10, 11, 9],   // SpD↑ Spe↓
            Self::Careful => [10, 10, 10, 9, 11, 10], // SpD↑ SpA↓
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
    /// ♀:♂ = 1:7 (閾値 31)
    F1M7,
    /// ♀:♂ = 1:3 (閾値 63)
    F1M3,
    /// ♀:♂ = 1:1 (閾値 127)
    F1M1,
    /// ♀:♂ = 3:1 (閾値 191)
    F3M1,
}

impl GenderRatio {
    // ===== 性別判定 =====

    /// PID から性別を判定
    ///
    /// 性別値 (PID 下位 8bit) が閾値未満なら Female、以上なら Male。
    #[inline]
    pub fn determine_gender_from_pid(self, pid: Pid) -> Gender {
        let threshold = self.to_threshold();
        match threshold {
            0 => Gender::Male,
            254 => Gender::Female,
            255 => Gender::Genderless,
            t => {
                let gender_value = (pid.raw() & 0xFF) as u8;
                if gender_value < t {
                    Gender::Female
                } else {
                    Gender::Male
                }
            }
        }
    }

    /// 閾値を取得
    #[inline]
    pub const fn to_threshold(self) -> u8 {
        match self {
            Self::MaleOnly => 0,
            Self::F1M7 => 31,
            Self::F1M3 => 63,
            Self::F1M1 => 127,
            Self::F3M1 => 191,
            Self::FemaleOnly => 254,
            Self::Genderless => 255,
        }
    }

    /// 乱数値から性別を判定 (Hidden Grotto 等で使用)
    ///
    /// 乱数値を 0-251 の範囲に変換し、閾値と比較。
    #[inline]
    #[allow(clippy::cast_possible_truncation)]
    pub fn determine_gender_from_rand(self, rand_value: u32) -> Gender {
        let threshold = self.to_threshold();
        match threshold {
            0 => Gender::Male,
            254 => Gender::Female,
            255 => Gender::Genderless,
            t => {
                // (rand * 252) >> 32 で 0-251 の値を取得
                let gender_value = ((u64::from(rand_value) * 252) >> 32) as u8;
                if gender_value < t {
                    Gender::Female
                } else {
                    Gender::Male
                }
            }
        }
    }
}

// ===== 特性・色違い =====

/// 特性スロット
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum AbilitySlot {
    /// 通常特性1
    #[default]
    First,
    /// 通常特性2
    Second,
    /// 夢特性 (Hidden Ability)
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

    // === Pid::to_hex_string tests ===

    #[test]
    fn test_pid_to_hex_string() {
        let pid = Pid(0x1234_5678);
        assert_eq!(pid.to_hex_string(), "12345678");
    }

    #[test]
    fn test_pid_to_hex_string_zero_padding() {
        let pid = Pid(0x0000_0001);
        assert_eq!(pid.to_hex_string(), "00000001");
    }

    #[test]
    fn test_pid_to_hex_string_zero() {
        let pid = Pid::ZERO;
        assert_eq!(pid.to_hex_string(), "00000000");
    }

    // === Nature::stat_modifiers tests ===

    #[test]
    fn test_nature_stat_modifiers_adamant() {
        // いじっぱり: Atk↑ SpA↓
        let mods = Nature::Adamant.stat_modifiers();
        assert_eq!(mods, [10, 11, 10, 9, 10, 10]);
    }

    #[test]
    fn test_nature_stat_modifiers_jolly() {
        // ようき: Spe↑ SpA↓
        let mods = Nature::Jolly.stat_modifiers();
        assert_eq!(mods, [10, 10, 10, 9, 10, 11]);
    }

    #[test]
    fn test_nature_stat_modifiers_modest() {
        // ひかえめ: SpA↑ Atk↓
        let mods = Nature::Modest.stat_modifiers();
        assert_eq!(mods, [10, 9, 10, 11, 10, 10]);
    }

    #[test]
    fn test_nature_stat_modifiers_timid() {
        // おくびょう: Spe↑ Atk↓
        let mods = Nature::Timid.stat_modifiers();
        assert_eq!(mods, [10, 9, 10, 10, 10, 11]);
    }

    #[test]
    fn test_nature_stat_modifiers_neutral() {
        // 無補正性格
        assert_eq!(Nature::Hardy.stat_modifiers(), [10, 10, 10, 10, 10, 10]);
        assert_eq!(Nature::Docile.stat_modifiers(), [10, 10, 10, 10, 10, 10]);
        assert_eq!(Nature::Serious.stat_modifiers(), [10, 10, 10, 10, 10, 10]);
        assert_eq!(Nature::Bashful.stat_modifiers(), [10, 10, 10, 10, 10, 10]);
        assert_eq!(Nature::Quirky.stat_modifiers(), [10, 10, 10, 10, 10, 10]);
    }

    #[test]
    fn test_nature_stat_modifiers_brave() {
        // ゆうかん: Atk↑ Spe↓
        let mods = Nature::Brave.stat_modifiers();
        assert_eq!(mods, [10, 11, 10, 10, 10, 9]);
    }

    #[test]
    fn test_nature_stat_modifiers_quiet() {
        // れいせい: SpA↑ Spe↓
        let mods = Nature::Quiet.stat_modifiers();
        assert_eq!(mods, [10, 10, 10, 11, 10, 9]);
    }
}
