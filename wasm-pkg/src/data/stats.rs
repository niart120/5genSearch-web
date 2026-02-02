//! ステータス計算ロジック
//!
//! 種族値、個体値、性格、レベルからステータス実数値を計算。

use super::species::BaseStats;
use crate::types::{Ivs, Nature, IV_VALUE_UNKNOWN};

/// 計算済みステータス
///
/// 各ステータスは `Option<u16>` で表現。
/// IV が不明 (`IV_VALUE_UNKNOWN`) の場合は `None` を返す。
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Stats {
    pub hp: Option<u16>,
    pub attack: Option<u16>,
    pub defense: Option<u16>,
    pub special_attack: Option<u16>,
    pub special_defense: Option<u16>,
    pub speed: Option<u16>,
}

impl Stats {
    /// 全て不明なステータス
    pub const UNKNOWN: Self = Self {
        hp: None,
        attack: None,
        defense: None,
        special_attack: None,
        special_defense: None,
        speed: None,
    };

    /// 配列形式で取得
    ///
    /// 順序: `[HP, Atk, Def, SpA, SpD, Spe]`
    pub fn to_array(&self) -> [Option<u16>; 6] {
        [
            self.hp,
            self.attack,
            self.defense,
            self.special_attack,
            self.special_defense,
            self.speed,
        ]
    }
}

/// ステータスを計算
///
/// # Arguments
/// * `base` - 種族値
/// * `ivs` - 個体値 (不明な値は `IV_VALUE_UNKNOWN`)
/// * `nature` - 性格
/// * `level` - レベル
///
/// # Returns
/// 計算済みステータス。IV が不明な箇所は `None`。
///
/// # Formula
/// ```text
/// HP  = floor((2 * base + iv) * level / 100) + level + 10
/// 他  = floor(floor((2 * base + iv) * level / 100) + 5) * nature_mod)
/// ```
/// - EV は常に 0 と仮定
/// - 性格補正: 1.1 (上昇) / 0.9 (下降) / 1.0 (無補正)
pub fn calculate_stats(base: BaseStats, ivs: Ivs, nature: Nature, level: u8) -> Stats {
    let mods = nature.stat_modifiers();
    let level = u32::from(level);

    Stats {
        hp: calc_hp_stat(base.hp, ivs.hp, level),
        attack: calc_stat(base.attack, ivs.atk, level, mods[1]),
        defense: calc_stat(base.defense, ivs.def, level, mods[2]),
        special_attack: calc_stat(base.special_attack, ivs.spa, level, mods[3]),
        special_defense: calc_stat(base.special_defense, ivs.spd, level, mods[4]),
        speed: calc_stat(base.speed, ivs.spe, level, mods[5]),
    }
}

/// HP ステータスを計算
///
/// HP = floor((2 * base + iv) * level / 100) + level + 10
#[inline]
#[allow(clippy::cast_possible_truncation)]
fn calc_hp_stat(base: u8, iv: u8, level: u32) -> Option<u16> {
    if iv == IV_VALUE_UNKNOWN {
        return None;
    }
    let base = u32::from(base);
    let iv = u32::from(iv);
    let result = (2 * base + iv) * level / 100 + level + 10;
    // result は最大でも (2*255 + 31) * 100 / 100 + 100 + 10 = 651 なので truncation は発生しない
    Some(result as u16)
}

/// HP 以外のステータスを計算
///
/// 性格補正は 10倍表現 (9, 10, 11) なので最後に 10 で割る
#[inline]
#[allow(clippy::cast_possible_truncation)]
fn calc_stat(base: u8, iv: u8, level: u32, nature_mod: u8) -> Option<u16> {
    if iv == IV_VALUE_UNKNOWN {
        return None;
    }
    let base = u32::from(base);
    let iv = u32::from(iv);
    let nature_mod = u32::from(nature_mod);

    let raw = (2 * base + iv) * level / 100 + 5;
    let result = raw * nature_mod / 10;
    // result は最大でも ((2*255 + 31) * 100 / 100 + 5) * 11 / 10 = 600 なので truncation は発生しない
    Some(result as u16)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_stats_pikachu_level_50() {
        // ピカチュウ Lv.50、6V、がんばりや (無補正)
        // 種族値: H35 A55 B40 C50 D50 S90
        let base = BaseStats {
            hp: 35,
            attack: 55,
            defense: 40,
            special_attack: 50,
            special_defense: 50,
            speed: 90,
        };
        let ivs = Ivs::new(31, 31, 31, 31, 31, 31);
        let nature = Nature::Hardy;
        let level = 50;

        let stats = calculate_stats(base, ivs, nature, level);

        // HP = (2*35 + 31) * 50 / 100 + 50 + 10 = 101 * 50 / 100 + 60 = 50 + 60 = 110
        assert_eq!(stats.hp, Some(110));
        // Atk = ((2*55 + 31) * 50 / 100 + 5) * 10 / 10 = (141 * 50 / 100 + 5) = 70 + 5 = 75
        assert_eq!(stats.attack, Some(75));
        // Def = ((2*40 + 31) * 50 / 100 + 5) = 111 * 50 / 100 + 5 = 55 + 5 = 60
        assert_eq!(stats.defense, Some(60));
        // SpA = ((2*50 + 31) * 50 / 100 + 5) = 131 * 50 / 100 + 5 = 65 + 5 = 70
        assert_eq!(stats.special_attack, Some(70));
        // SpD = 70 (same as SpA)
        assert_eq!(stats.special_defense, Some(70));
        // Spe = ((2*90 + 31) * 50 / 100 + 5) = 211 * 50 / 100 + 5 = 105 + 5 = 110
        assert_eq!(stats.speed, Some(110));
    }

    #[test]
    fn test_calculate_stats_with_nature_boost() {
        // ピカチュウ Lv.50、6V、ようき (Spe↑ SpA↓)
        let base = BaseStats {
            hp: 35,
            attack: 55,
            defense: 40,
            special_attack: 50,
            special_defense: 50,
            speed: 90,
        };
        let ivs = Ivs::new(31, 31, 31, 31, 31, 31);
        let nature = Nature::Jolly;
        let level = 50;

        let stats = calculate_stats(base, ivs, nature, level);

        // HP は補正なし
        assert_eq!(stats.hp, Some(110));
        // Atk は補正なし
        assert_eq!(stats.attack, Some(75));
        // SpA は下降 (0.9倍): 70 * 9 / 10 = 63
        assert_eq!(stats.special_attack, Some(63));
        // Spe は上昇 (1.1倍): 110 * 11 / 10 = 121
        assert_eq!(stats.speed, Some(121));
    }

    #[test]
    fn test_calculate_stats_level_1() {
        // フシギダネ Lv.1、6V、がんばりや
        // 種族値: H45 A49 B49 C65 D65 S45
        let base = BaseStats {
            hp: 45,
            attack: 49,
            defense: 49,
            special_attack: 65,
            special_defense: 65,
            speed: 45,
        };
        let ivs = Ivs::new(31, 31, 31, 31, 31, 31);
        let nature = Nature::Hardy;
        let level = 1;

        let stats = calculate_stats(base, ivs, nature, level);

        // HP = (2*45 + 31) * 1 / 100 + 1 + 10 = 121 / 100 + 11 = 1 + 11 = 12
        assert_eq!(stats.hp, Some(12));
        // Atk = ((2*49 + 31) * 1 / 100 + 5) = 129 / 100 + 5 = 1 + 5 = 6
        assert_eq!(stats.attack, Some(6));
    }

    #[test]
    fn test_calculate_stats_unknown_iv() {
        let base = BaseStats {
            hp: 45,
            attack: 49,
            defense: 49,
            special_attack: 65,
            special_defense: 65,
            speed: 45,
        };
        let ivs = Ivs::new(31, IV_VALUE_UNKNOWN, 31, 31, IV_VALUE_UNKNOWN, 31);
        let nature = Nature::Hardy;
        let level = 50;

        let stats = calculate_stats(base, ivs, nature, level);

        // 確定している IV は計算可能
        assert!(stats.hp.is_some());
        assert!(stats.defense.is_some());
        assert!(stats.special_attack.is_some());
        assert!(stats.speed.is_some());

        // 不明な IV は None
        assert!(stats.attack.is_none());
        assert!(stats.special_defense.is_none());
    }
}
