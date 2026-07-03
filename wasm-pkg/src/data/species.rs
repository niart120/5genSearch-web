//! 種族データテーブル
//!
//! このファイルは自動生成されています。直接編集しないでください。
//! 生成コマンド: node scripts/generate-species-data.js

use crate::types::GenderRatio;

/// 種族値
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct BaseStats {
    pub hp: u8,
    pub attack: u8,
    pub defense: u8,
    pub special_attack: u8,
    pub special_defense: u8,
    pub speed: u8,
}

/// 種族エントリ
#[derive(Clone, Copy, Debug)]
pub struct SpeciesEntry {
    pub base_stats: BaseStats,
    pub gender_ratio: GenderRatio,
    /// 特性ID: [通常1, 通常2, 夢] (0 = なし)
    pub ability_ids: [u8; 3],
}

/// 種族テーブル (649件)
pub static SPECIES_TABLE: [SpeciesEntry; 649] = [
    // #001 Bulbasaur
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 49,
            defense: 49,
            special_attack: 65,
            special_defense: 65,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [1, 0, 2],
    },
    // #002 Ivysaur
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 62,
            defense: 63,
            special_attack: 80,
            special_defense: 80,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [1, 0, 2],
    },
    // #003 Venusaur
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 82,
            defense: 83,
            special_attack: 100,
            special_defense: 100,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [1, 0, 2],
    },
    // #004 Charmander
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 39,
            attack: 52,
            defense: 43,
            special_attack: 60,
            special_defense: 50,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [3, 0, 4],
    },
    // #005 Charmeleon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 58,
            attack: 64,
            defense: 58,
            special_attack: 80,
            special_defense: 65,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [3, 0, 4],
    },
    // #006 Charizard
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 78,
            attack: 84,
            defense: 78,
            special_attack: 109,
            special_defense: 85,
            speed: 100,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [3, 0, 4],
    },
    // #007 Squirtle
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 44,
            attack: 48,
            defense: 65,
            special_attack: 50,
            special_defense: 64,
            speed: 43,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [5, 0, 6],
    },
    // #008 Wartortle
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 59,
            attack: 63,
            defense: 80,
            special_attack: 65,
            special_defense: 80,
            speed: 58,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [5, 0, 6],
    },
    // #009 Blastoise
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 79,
            attack: 83,
            defense: 100,
            special_attack: 85,
            special_defense: 105,
            speed: 78,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [5, 0, 6],
    },
    // #010 Caterpie
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 30,
            defense: 35,
            special_attack: 20,
            special_defense: 20,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [7, 0, 8],
    },
    // #011 Metapod
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 20,
            defense: 55,
            special_attack: 25,
            special_defense: 25,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [9, 0, 0],
    },
    // #012 Butterfree
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 45,
            defense: 50,
            special_attack: 80,
            special_defense: 80,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [10, 0, 11],
    },
    // #013 Weedle
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 35,
            defense: 30,
            special_attack: 20,
            special_defense: 20,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [7, 0, 8],
    },
    // #014 Kakuna
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 25,
            defense: 50,
            special_attack: 25,
            special_defense: 25,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [9, 0, 0],
    },
    // #015 Beedrill
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 80,
            defense: 40,
            special_attack: 45,
            special_defense: 80,
            speed: 75,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 0, 13],
    },
    // #016 Pidgey
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 45,
            defense: 40,
            special_attack: 35,
            special_defense: 35,
            speed: 56,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 15, 16],
    },
    // #017 Pidgeotto
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 63,
            attack: 60,
            defense: 55,
            special_attack: 50,
            special_defense: 50,
            speed: 71,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 15, 16],
    },
    // #018 Pidgeot
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 83,
            attack: 80,
            defense: 75,
            special_attack: 70,
            special_defense: 70,
            speed: 91,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 15, 16],
    },
    // #019 Rattata
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 30,
            attack: 56,
            defense: 35,
            special_attack: 25,
            special_defense: 35,
            speed: 72,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [8, 17, 18],
    },
    // #020 Raticate
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 81,
            defense: 60,
            special_attack: 50,
            special_defense: 70,
            speed: 97,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [8, 17, 18],
    },
    // #021 Spearow
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 60,
            defense: 30,
            special_attack: 31,
            special_defense: 31,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 0, 13],
    },
    // #022 Fearow
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 90,
            defense: 65,
            special_attack: 61,
            special_defense: 61,
            speed: 100,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 0, 13],
    },
    // #023 Ekans
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 60,
            defense: 44,
            special_attack: 40,
            special_defense: 54,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 9, 20],
    },
    // #024 Arbok
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 85,
            defense: 69,
            special_attack: 65,
            special_defense: 79,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 9, 20],
    },
    // #025 Pikachu
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 55,
            defense: 30,
            special_attack: 50,
            special_defense: 40,
            speed: 90,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [21, 0, 22],
    },
    // #026 Raichu
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 90,
            defense: 55,
            special_attack: 90,
            special_defense: 80,
            speed: 100,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [21, 0, 22],
    },
    // #027 Sandshrew
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 75,
            defense: 85,
            special_attack: 20,
            special_defense: 30,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [23, 0, 24],
    },
    // #028 Sandslash
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 100,
            defense: 110,
            special_attack: 45,
            special_defense: 55,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [23, 0, 24],
    },
    // #029 Nidoran♀
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 47,
            defense: 52,
            special_attack: 40,
            special_defense: 40,
            speed: 41,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [25, 26, 18],
    },
    // #030 Nidorina
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 62,
            defense: 67,
            special_attack: 55,
            special_defense: 55,
            speed: 56,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [25, 26, 18],
    },
    // #031 Nidoqueen
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 82,
            defense: 87,
            special_attack: 75,
            special_defense: 85,
            speed: 76,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [25, 26, 27],
    },
    // #032 Nidoran♂
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 46,
            attack: 57,
            defense: 40,
            special_attack: 40,
            special_defense: 40,
            speed: 50,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [25, 26, 18],
    },
    // #033 Nidorino
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 61,
            attack: 72,
            defense: 57,
            special_attack: 55,
            special_defense: 55,
            speed: 65,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [25, 26, 18],
    },
    // #034 Nidoking
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 81,
            attack: 92,
            defense: 77,
            special_attack: 85,
            special_defense: 75,
            speed: 85,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [25, 26, 27],
    },
    // #035 Clefairy
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 45,
            defense: 48,
            special_attack: 60,
            special_defense: 65,
            speed: 35,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [28, 29, 30],
    },
    // #036 Clefable
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 70,
            defense: 73,
            special_attack: 85,
            special_defense: 90,
            speed: 60,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [28, 29, 31],
    },
    // #037 Vulpix
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 38,
            attack: 41,
            defense: 40,
            special_attack: 50,
            special_defense: 65,
            speed: 65,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [32, 0, 33],
    },
    // #038 Ninetales
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 73,
            attack: 76,
            defense: 75,
            special_attack: 81,
            special_defense: 100,
            speed: 100,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [32, 0, 33],
    },
    // #039 Jigglypuff
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 115,
            attack: 45,
            defense: 20,
            special_attack: 45,
            special_defense: 25,
            speed: 20,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [28, 0, 30],
    },
    // #040 Wigglytuff
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 140,
            attack: 70,
            defense: 45,
            special_attack: 75,
            special_defense: 50,
            speed: 45,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [28, 0, 34],
    },
    // #041 Zubat
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 45,
            defense: 35,
            special_attack: 30,
            special_defense: 40,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [35, 0, 36],
    },
    // #042 Golbat
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 80,
            defense: 70,
            special_attack: 65,
            special_defense: 75,
            speed: 90,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [35, 0, 36],
    },
    // #043 Oddish
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 50,
            defense: 55,
            special_attack: 75,
            special_defense: 65,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 0, 8],
    },
    // #044 Gloom
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 65,
            defense: 70,
            special_attack: 85,
            special_defense: 75,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 0, 37],
    },
    // #045 Vileplume
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 80,
            defense: 85,
            special_attack: 100,
            special_defense: 90,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 0, 38],
    },
    // #046 Paras
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 70,
            defense: 55,
            special_attack: 45,
            special_defense: 55,
            speed: 25,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [38, 39, 40],
    },
    // #047 Parasect
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 95,
            defense: 80,
            special_attack: 60,
            special_defense: 80,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [38, 39, 40],
    },
    // #048 Venonat
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 55,
            defense: 50,
            special_attack: 40,
            special_defense: 55,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [10, 11, 8],
    },
    // #049 Venomoth
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 65,
            defense: 60,
            special_attack: 90,
            special_defense: 75,
            speed: 90,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [7, 11, 41],
    },
    // #050 Diglett
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 10,
            attack: 55,
            defense: 25,
            special_attack: 35,
            special_defense: 45,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [23, 42, 43],
    },
    // #051 Dugtrio
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 80,
            defense: 50,
            special_attack: 50,
            special_defense: 70,
            speed: 120,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [23, 42, 43],
    },
    // #052 Meowth
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 45,
            defense: 35,
            special_attack: 40,
            special_defense: 40,
            speed: 90,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [44, 45, 20],
    },
    // #053 Persian
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 70,
            defense: 60,
            special_attack: 65,
            special_defense: 65,
            speed: 115,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [46, 45, 20],
    },
    // #054 Psyduck
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 52,
            defense: 48,
            special_attack: 65,
            special_defense: 50,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [40, 47, 48],
    },
    // #055 Golduck
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 82,
            defense: 78,
            special_attack: 95,
            special_defense: 80,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [40, 47, 48],
    },
    // #056 Mankey
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 80,
            defense: 35,
            special_attack: 35,
            special_defense: 45,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [49, 50, 51],
    },
    // #057 Primeape
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 105,
            defense: 60,
            special_attack: 60,
            special_defense: 70,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [49, 50, 51],
    },
    // #058 Growlithe
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 70,
            defense: 45,
            special_attack: 70,
            special_defense: 50,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [19, 32, 52],
    },
    // #059 Arcanine
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 110,
            defense: 80,
            special_attack: 100,
            special_defense: 80,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [19, 32, 52],
    },
    // #060 Poliwag
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 50,
            defense: 40,
            special_attack: 40,
            special_defense: 40,
            speed: 90,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [53, 40, 48],
    },
    // #061 Poliwhirl
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 65,
            defense: 65,
            special_attack: 50,
            special_defense: 50,
            speed: 90,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [53, 40, 48],
    },
    // #062 Poliwrath
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 85,
            defense: 95,
            special_attack: 70,
            special_defense: 90,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [53, 40, 48],
    },
    // #063 Abra
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 25,
            attack: 20,
            defense: 15,
            special_attack: 105,
            special_defense: 55,
            speed: 90,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [54, 35, 29],
    },
    // #064 Kadabra
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 35,
            defense: 30,
            special_attack: 120,
            special_defense: 70,
            speed: 105,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [54, 35, 29],
    },
    // #065 Alakazam
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 50,
            defense: 45,
            special_attack: 135,
            special_defense: 85,
            speed: 120,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [54, 35, 29],
    },
    // #066 Machop
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 80,
            defense: 50,
            special_attack: 35,
            special_defense: 35,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [17, 55, 56],
    },
    // #067 Machoke
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 100,
            defense: 70,
            special_attack: 50,
            special_defense: 60,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [17, 55, 56],
    },
    // #068 Machamp
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 130,
            defense: 80,
            special_attack: 65,
            special_defense: 85,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [17, 55, 56],
    },
    // #069 Bellsprout
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 75,
            defense: 35,
            special_attack: 70,
            special_defense: 30,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 0, 57],
    },
    // #070 Weepinbell
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 90,
            defense: 50,
            special_attack: 85,
            special_defense: 45,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 0, 57],
    },
    // #071 Victreebel
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 105,
            defense: 65,
            special_attack: 100,
            special_defense: 60,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 0, 57],
    },
    // #072 Tentacool
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 40,
            defense: 35,
            special_attack: 50,
            special_defense: 100,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [58, 59, 6],
    },
    // #073 Tentacruel
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 70,
            defense: 65,
            special_attack: 80,
            special_defense: 120,
            speed: 100,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [58, 59, 6],
    },
    // #074 Geodude
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 80,
            defense: 100,
            special_attack: 30,
            special_defense: 30,
            speed: 20,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [60, 61, 23],
    },
    // #075 Graveler
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 95,
            defense: 115,
            special_attack: 45,
            special_defense: 45,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [60, 61, 23],
    },
    // #076 Golem
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 110,
            defense: 130,
            special_attack: 55,
            special_defense: 65,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [60, 61, 23],
    },
    // #077 Ponyta
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 85,
            defense: 55,
            special_attack: 65,
            special_defense: 65,
            speed: 90,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [8, 32, 62],
    },
    // #078 Rapidash
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 100,
            defense: 70,
            special_attack: 80,
            special_defense: 80,
            speed: 105,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [8, 32, 62],
    },
    // #079 Slowpoke
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 65,
            defense: 65,
            special_attack: 40,
            special_defense: 40,
            speed: 15,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [63, 64, 65],
    },
    // #080 Slowbro
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 75,
            defense: 110,
            special_attack: 100,
            special_defense: 80,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [63, 64, 65],
    },
    // #081 Magnemite
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 25,
            attack: 35,
            defense: 70,
            special_attack: 95,
            special_defense: 55,
            speed: 45,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [66, 61, 67],
    },
    // #082 Magneton
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 60,
            defense: 95,
            special_attack: 120,
            special_defense: 70,
            speed: 70,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [66, 61, 67],
    },
    // #083 Farfetch’d
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 52,
            attack: 65,
            defense: 55,
            special_attack: 58,
            special_defense: 62,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 35, 51],
    },
    // #084 Doduo
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 85,
            defense: 45,
            special_attack: 35,
            special_defense: 35,
            speed: 75,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [8, 68, 15],
    },
    // #085 Dodrio
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 110,
            defense: 70,
            special_attack: 60,
            special_defense: 60,
            speed: 100,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [8, 68, 15],
    },
    // #086 Seel
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 45,
            defense: 55,
            special_attack: 45,
            special_defense: 70,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [69, 70, 71],
    },
    // #087 Dewgong
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 70,
            defense: 80,
            special_attack: 70,
            special_defense: 95,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [69, 70, 71],
    },
    // #088 Grimer
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 80,
            defense: 50,
            special_attack: 40,
            special_defense: 50,
            speed: 25,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [37, 72, 73],
    },
    // #089 Muk
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 105,
            attack: 105,
            defense: 75,
            special_attack: 65,
            special_defense: 100,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [37, 72, 73],
    },
    // #090 Shellder
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 30,
            attack: 65,
            defense: 100,
            special_attack: 45,
            special_defense: 25,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [74, 75, 76],
    },
    // #091 Cloyster
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 95,
            defense: 180,
            special_attack: 85,
            special_defense: 45,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [74, 75, 76],
    },
    // #092 Gastly
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 30,
            attack: 35,
            defense: 30,
            special_attack: 100,
            special_defense: 35,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 0],
    },
    // #093 Haunter
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 50,
            defense: 45,
            special_attack: 115,
            special_defense: 55,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 0],
    },
    // #094 Gengar
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 65,
            defense: 60,
            special_attack: 130,
            special_defense: 75,
            speed: 110,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 0],
    },
    // #095 Onix
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 45,
            defense: 160,
            special_attack: 30,
            special_defense: 45,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [60, 61, 78],
    },
    // #096 Drowzee
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 48,
            defense: 45,
            special_attack: 43,
            special_defense: 90,
            speed: 42,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [79, 80, 35],
    },
    // #097 Hypno
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 73,
            defense: 70,
            special_attack: 73,
            special_defense: 115,
            speed: 67,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [79, 80, 35],
    },
    // #098 Krabby
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 30,
            attack: 105,
            defense: 90,
            special_attack: 25,
            special_defense: 25,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [81, 74, 27],
    },
    // #099 Kingler
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 130,
            defense: 115,
            special_attack: 50,
            special_defense: 50,
            speed: 75,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [81, 74, 27],
    },
    // #100 Voltorb
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 30,
            defense: 50,
            special_attack: 55,
            special_defense: 55,
            speed: 100,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [82, 21, 83],
    },
    // #101 Electrode
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 50,
            defense: 70,
            special_attack: 80,
            special_defense: 80,
            speed: 140,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [82, 21, 83],
    },
    // #102 Exeggcute
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 40,
            defense: 80,
            special_attack: 60,
            special_defense: 45,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 0, 84],
    },
    // #103 Exeggutor
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 95,
            defense: 85,
            special_attack: 125,
            special_defense: 65,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 0, 84],
    },
    // #104 Cubone
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 50,
            defense: 95,
            special_attack: 40,
            special_defense: 50,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [60, 22, 85],
    },
    // #105 Marowak
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 80,
            defense: 110,
            special_attack: 50,
            special_defense: 80,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [60, 22, 85],
    },
    // #106 Hitmonlee
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 120,
            defense: 53,
            special_attack: 35,
            special_defense: 110,
            speed: 87,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [46, 86, 87],
    },
    // #107 Hitmonchan
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 105,
            defense: 79,
            special_attack: 35,
            special_defense: 110,
            speed: 76,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [14, 88, 35],
    },
    // #108 Lickitung
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 55,
            defense: 75,
            special_attack: 60,
            special_defense: 75,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [64, 63, 47],
    },
    // #109 Koffing
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 65,
            defense: 95,
            special_attack: 60,
            special_defense: 45,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 37],
    },
    // #110 Weezing
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 90,
            defense: 120,
            special_attack: 85,
            special_defense: 70,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 37],
    },
    // #111 Rhyhorn
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 85,
            defense: 95,
            special_attack: 30,
            special_defense: 30,
            speed: 25,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [22, 60, 86],
    },
    // #112 Rhydon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 105,
            attack: 130,
            defense: 120,
            special_attack: 45,
            special_defense: 45,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [22, 60, 86],
    },
    // #113 Chansey
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 250,
            attack: 5,
            defense: 5,
            special_attack: 35,
            special_defense: 105,
            speed: 50,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [89, 90, 91],
    },
    // #114 Tangela
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 55,
            defense: 115,
            special_attack: 100,
            special_defense: 40,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 92, 65],
    },
    // #115 Kangaskhan
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 105,
            attack: 95,
            defense: 80,
            special_attack: 40,
            special_defense: 80,
            speed: 90,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [68, 93, 35],
    },
    // #116 Horsea
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 30,
            attack: 40,
            defense: 70,
            special_attack: 70,
            special_defense: 25,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 13, 40],
    },
    // #117 Seadra
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 65,
            defense: 95,
            special_attack: 95,
            special_defense: 45,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [25, 13, 40],
    },
    // #118 Goldeen
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 67,
            defense: 60,
            special_attack: 35,
            special_defense: 50,
            speed: 63,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 94, 22],
    },
    // #119 Seaking
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 92,
            defense: 65,
            special_attack: 65,
            special_defense: 80,
            speed: 68,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 94, 22],
    },
    // #120 Staryu
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 30,
            attack: 45,
            defense: 55,
            special_attack: 70,
            special_defense: 55,
            speed: 85,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [95, 89, 67],
    },
    // #121 Starmie
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 75,
            defense: 85,
            special_attack: 100,
            special_defense: 85,
            speed: 115,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [95, 89, 67],
    },
    // #122 Mr. Mime
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 45,
            defense: 65,
            special_attack: 100,
            special_defense: 120,
            speed: 90,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [82, 96, 45],
    },
    // #123 Scyther
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 110,
            defense: 80,
            special_attack: 55,
            special_defense: 80,
            speed: 105,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 45, 56],
    },
    // #124 Jynx
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 50,
            defense: 35,
            special_attack: 115,
            special_defense: 95,
            speed: 95,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [63, 80, 39],
    },
    // #125 Electabuzz
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 83,
            defense: 57,
            special_attack: 95,
            special_defense: 85,
            speed: 105,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [21, 0, 49],
    },
    // #126 Magmar
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 95,
            defense: 57,
            special_attack: 100,
            special_defense: 85,
            speed: 93,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [62, 0, 49],
    },
    // #127 Pinsir
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 125,
            defense: 100,
            special_attack: 55,
            special_defense: 70,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [81, 97, 98],
    },
    // #128 Tauros
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 100,
            defense: 95,
            special_attack: 40,
            special_defense: 70,
            speed: 110,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [19, 50, 27],
    },
    // #129 Magikarp
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 20,
            attack: 10,
            defense: 55,
            special_attack: 15,
            special_defense: 20,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 0, 99],
    },
    // #130 Gyarados
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 125,
            defense: 79,
            special_attack: 60,
            special_defense: 100,
            speed: 81,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 0, 98],
    },
    // #131 Lapras
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 130,
            attack: 85,
            defense: 80,
            special_attack: 85,
            special_defense: 95,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [53, 74, 70],
    },
    // #132 Ditto
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 48,
            attack: 48,
            defense: 48,
            special_attack: 48,
            special_defense: 48,
            speed: 48,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [46, 0, 100],
    },
    // #133 Eevee
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 55,
            defense: 50,
            special_attack: 45,
            special_defense: 65,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [8, 101, 102],
    },
    // #134 Vaporeon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 130,
            attack: 65,
            defense: 60,
            special_attack: 110,
            special_defense: 95,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [53, 0, 70],
    },
    // #135 Jolteon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 65,
            defense: 60,
            special_attack: 110,
            special_defense: 95,
            speed: 130,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [103, 0, 104],
    },
    // #136 Flareon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 130,
            defense: 60,
            special_attack: 95,
            special_defense: 110,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [32, 0, 17],
    },
    // #137 Porygon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 60,
            defense: 70,
            special_attack: 85,
            special_defense: 75,
            speed: 40,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [105, 106, 67],
    },
    // #138 Omanyte
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 40,
            defense: 100,
            special_attack: 90,
            special_defense: 55,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [48, 74, 78],
    },
    // #139 Omastar
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 60,
            defense: 125,
            special_attack: 115,
            special_defense: 70,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [48, 74, 78],
    },
    // #140 Kabuto
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 30,
            attack: 80,
            defense: 90,
            special_attack: 55,
            special_defense: 45,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [48, 85, 78],
    },
    // #141 Kabutops
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 115,
            defense: 105,
            special_attack: 65,
            special_defense: 70,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [48, 85, 78],
    },
    // #142 Aerodactyl
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 105,
            defense: 65,
            special_attack: 60,
            special_defense: 75,
            speed: 130,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [60, 107, 20],
    },
    // #143 Snorlax
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 160,
            attack: 110,
            defense: 65,
            special_attack: 65,
            special_defense: 110,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [108, 69, 57],
    },
    // #144 Articuno
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 85,
            defense: 100,
            special_attack: 95,
            special_defense: 125,
            speed: 85,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [107, 0, 109],
    },
    // #145 Zapdos
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 90,
            defense: 85,
            special_attack: 125,
            special_defense: 90,
            speed: 100,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [107, 0, 22],
    },
    // #146 Moltres
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 100,
            defense: 90,
            special_attack: 125,
            special_defense: 85,
            speed: 90,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [107, 0, 62],
    },
    // #147 Dratini
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 41,
            attack: 64,
            defense: 45,
            special_attack: 50,
            special_defense: 50,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [9, 0, 110],
    },
    // #148 Dragonair
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 61,
            attack: 84,
            defense: 65,
            special_attack: 70,
            special_defense: 70,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [9, 0, 110],
    },
    // #149 Dragonite
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 91,
            attack: 134,
            defense: 95,
            special_attack: 100,
            special_defense: 100,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [35, 0, 111],
    },
    // #150 Mewtwo
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 106,
            attack: 110,
            defense: 90,
            special_attack: 154,
            special_defense: 90,
            speed: 130,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [107, 0, 20],
    },
    // #151 Mew
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 100,
            defense: 100,
            special_attack: 100,
            special_defense: 100,
            speed: 100,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [54, 0, 0],
    },
    // #152 Chikorita
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 49,
            defense: 65,
            special_attack: 49,
            special_defense: 65,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [1, 0, 92],
    },
    // #153 Bayleef
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 62,
            defense: 80,
            special_attack: 63,
            special_defense: 80,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [1, 0, 92],
    },
    // #154 Meganium
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 82,
            defense: 100,
            special_attack: 83,
            special_defense: 100,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [1, 0, 92],
    },
    // #155 Cyndaquil
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 39,
            attack: 52,
            defense: 43,
            special_attack: 60,
            special_defense: 50,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [3, 0, 32],
    },
    // #156 Quilava
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 58,
            attack: 64,
            defense: 58,
            special_attack: 80,
            special_defense: 65,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [3, 0, 32],
    },
    // #157 Typhlosion
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 78,
            attack: 84,
            defense: 78,
            special_attack: 109,
            special_defense: 85,
            speed: 100,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [3, 0, 32],
    },
    // #158 Totodile
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 65,
            defense: 64,
            special_attack: 44,
            special_defense: 48,
            speed: 43,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [5, 0, 27],
    },
    // #159 Croconaw
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 80,
            defense: 80,
            special_attack: 59,
            special_defense: 63,
            speed: 58,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [5, 0, 27],
    },
    // #160 Feraligatr
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 105,
            defense: 100,
            special_attack: 79,
            special_defense: 83,
            speed: 78,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [5, 0, 27],
    },
    // #161 Sentret
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 46,
            defense: 34,
            special_attack: 35,
            special_defense: 45,
            speed: 20,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [8, 14, 34],
    },
    // #162 Furret
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 76,
            defense: 64,
            special_attack: 45,
            special_defense: 55,
            speed: 90,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [8, 14, 34],
    },
    // #163 Hoothoot
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 30,
            defense: 30,
            special_attack: 36,
            special_defense: 56,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [79, 14, 11],
    },
    // #164 Noctowl
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 50,
            defense: 50,
            special_attack: 76,
            special_defense: 96,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [79, 14, 11],
    },
    // #165 Ledyba
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 20,
            defense: 30,
            special_attack: 40,
            special_defense: 80,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 68, 99],
    },
    // #166 Ledian
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 35,
            defense: 50,
            special_attack: 55,
            special_defense: 110,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 68, 88],
    },
    // #167 Spinarak
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 60,
            defense: 40,
            special_attack: 40,
            special_defense: 40,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 79, 13],
    },
    // #168 Ariados
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 90,
            defense: 70,
            special_attack: 60,
            special_defense: 60,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 79, 13],
    },
    // #169 Crobat
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 90,
            defense: 80,
            special_attack: 70,
            special_defense: 80,
            speed: 130,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [35, 0, 36],
    },
    // #170 Chinchou
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 38,
            defense: 38,
            special_attack: 56,
            special_defense: 56,
            speed: 67,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [103, 95, 53],
    },
    // #171 Lanturn
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 125,
            attack: 58,
            defense: 58,
            special_attack: 76,
            special_defense: 76,
            speed: 67,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [103, 95, 53],
    },
    // #172 Pichu
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 20,
            attack: 40,
            defense: 15,
            special_attack: 35,
            special_defense: 35,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [21, 0, 22],
    },
    // #173 Cleffa
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 25,
            defense: 28,
            special_attack: 45,
            special_defense: 55,
            speed: 15,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [28, 29, 30],
    },
    // #174 Igglybuff
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 30,
            defense: 15,
            special_attack: 40,
            special_defense: 20,
            speed: 15,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [28, 0, 30],
    },
    // #175 Togepi
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 20,
            defense: 65,
            special_attack: 40,
            special_defense: 65,
            speed: 20,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [18, 90, 112],
    },
    // #176 Togetic
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 40,
            defense: 85,
            special_attack: 80,
            special_defense: 105,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [18, 90, 112],
    },
    // #177 Natu
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 50,
            defense: 45,
            special_attack: 70,
            special_defense: 45,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [54, 68, 113],
    },
    // #178 Xatu
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 75,
            defense: 70,
            special_attack: 95,
            special_defense: 70,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [54, 68, 113],
    },
    // #179 Mareep
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 40,
            defense: 40,
            special_attack: 65,
            special_defense: 45,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [21, 0, 114],
    },
    // #180 Flaaffy
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 55,
            defense: 55,
            special_attack: 80,
            special_defense: 60,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [21, 0, 114],
    },
    // #181 Ampharos
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 75,
            defense: 75,
            special_attack: 115,
            special_defense: 90,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [21, 0, 114],
    },
    // #182 Bellossom
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 80,
            defense: 85,
            special_attack: 90,
            special_defense: 100,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 0, 91],
    },
    // #183 Marill
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 20,
            defense: 50,
            special_attack: 20,
            special_defense: 50,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [69, 115, 116],
    },
    // #184 Azumarill
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 50,
            defense: 80,
            special_attack: 50,
            special_defense: 80,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [69, 115, 116],
    },
    // #185 Sudowoodo
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 100,
            defense: 115,
            special_attack: 30,
            special_defense: 65,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 60, 99],
    },
    // #186 Politoed
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 75,
            defense: 75,
            special_attack: 90,
            special_defense: 100,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [53, 40, 117],
    },
    // #187 Hoppip
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 35,
            defense: 40,
            special_attack: 35,
            special_defense: 55,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 92, 36],
    },
    // #188 Skiploom
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 45,
            defense: 50,
            special_attack: 45,
            special_defense: 65,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 92, 36],
    },
    // #189 Jumpluff
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 55,
            defense: 70,
            special_attack: 55,
            special_defense: 85,
            speed: 110,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 92, 36],
    },
    // #190 Aipom
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 70,
            defense: 55,
            special_attack: 40,
            special_defense: 55,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [8, 44, 75],
    },
    // #191 Sunkern
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 30,
            attack: 30,
            defense: 30,
            special_attack: 30,
            special_defense: 30,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 4, 68],
    },
    // #192 Sunflora
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 75,
            defense: 55,
            special_attack: 105,
            special_defense: 85,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 4, 68],
    },
    // #193 Yanma
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 65,
            defense: 45,
            special_attack: 75,
            special_defense: 45,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [118, 10, 34],
    },
    // #194 Wooper
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 45,
            defense: 45,
            special_attack: 25,
            special_defense: 25,
            speed: 15,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [40, 53, 31],
    },
    // #195 Quagsire
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 85,
            defense: 85,
            special_attack: 65,
            special_defense: 65,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [40, 53, 31],
    },
    // #196 Espeon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 65,
            defense: 60,
            special_attack: 130,
            special_defense: 95,
            speed: 110,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [54, 0, 113],
    },
    // #197 Umbreon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 65,
            defense: 110,
            special_attack: 60,
            special_defense: 130,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [54, 0, 35],
    },
    // #198 Murkrow
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 85,
            defense: 42,
            special_attack: 85,
            special_defense: 42,
            speed: 91,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [79, 112, 119],
    },
    // #199 Slowking
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 75,
            defense: 80,
            special_attack: 100,
            special_defense: 110,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [63, 64, 65],
    },
    // #200 Misdreavus
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 60,
            defense: 60,
            special_attack: 85,
            special_defense: 85,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 0],
    },
    // #201 Unown
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 48,
            attack: 72,
            defense: 48,
            special_attack: 72,
            special_defense: 48,
            speed: 48,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [77, 0, 0],
    },
    // #202 Wobbuffet
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 190,
            attack: 33,
            defense: 58,
            special_attack: 33,
            special_defense: 58,
            speed: 33,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [120, 0, 121],
    },
    // #203 Girafarig
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 80,
            defense: 65,
            special_attack: 90,
            special_defense: 65,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [35, 68, 116],
    },
    // #204 Pineco
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 65,
            defense: 90,
            special_attack: 35,
            special_defense: 35,
            speed: 15,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 0, 76],
    },
    // #205 Forretress
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 90,
            defense: 140,
            special_attack: 60,
            special_defense: 60,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 0, 76],
    },
    // #206 Dunsparce
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 70,
            defense: 70,
            special_attack: 65,
            special_defense: 65,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [90, 8, 99],
    },
    // #207 Gligar
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 75,
            defense: 105,
            special_attack: 35,
            special_defense: 65,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [81, 23, 108],
    },
    // #208 Steelix
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 85,
            defense: 200,
            special_attack: 55,
            special_defense: 65,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [60, 61, 27],
    },
    // #209 Snubbull
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 80,
            defense: 50,
            special_attack: 40,
            special_defense: 40,
            speed: 30,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [19, 8, 99],
    },
    // #210 Granbull
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 120,
            defense: 75,
            special_attack: 60,
            special_defense: 60,
            speed: 45,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [19, 104, 99],
    },
    // #211 Qwilfish
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 95,
            defense: 75,
            special_attack: 55,
            special_defense: 55,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [25, 48, 19],
    },
    // #212 Scizor
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 130,
            defense: 100,
            special_attack: 55,
            special_defense: 80,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 45, 122],
    },
    // #213 Shuckle
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 20,
            attack: 10,
            defense: 230,
            special_attack: 10,
            special_defense: 230,
            speed: 5,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 57, 123],
    },
    // #214 Heracross
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 125,
            defense: 75,
            special_attack: 40,
            special_defense: 95,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 17, 98],
    },
    // #215 Sneasel
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 95,
            defense: 55,
            special_attack: 35,
            special_defense: 75,
            speed: 115,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [35, 14, 124],
    },
    // #216 Teddiursa
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 80,
            defense: 50,
            special_attack: 50,
            special_defense: 50,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [44, 104, 125],
    },
    // #217 Ursaring
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 130,
            defense: 75,
            special_attack: 75,
            special_defense: 75,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [17, 104, 20],
    },
    // #218 Slugma
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 40,
            defense: 40,
            special_attack: 70,
            special_defense: 40,
            speed: 20,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [126, 62, 78],
    },
    // #219 Magcargo
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 50,
            defense: 120,
            special_attack: 80,
            special_defense: 80,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [126, 62, 78],
    },
    // #220 Swinub
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 50,
            defense: 40,
            special_attack: 30,
            special_defense: 30,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [63, 109, 69],
    },
    // #221 Piloswine
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 100,
            defense: 80,
            special_attack: 60,
            special_defense: 60,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [63, 109, 69],
    },
    // #222 Corsola
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 55,
            defense: 85,
            special_attack: 65,
            special_defense: 85,
            speed: 35,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [18, 89, 65],
    },
    // #223 Remoraid
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 65,
            defense: 35,
            special_attack: 65,
            special_defense: 35,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [18, 13, 127],
    },
    // #224 Octillery
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 105,
            defense: 75,
            special_attack: 105,
            special_defense: 75,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [128, 13, 127],
    },
    // #225 Delibird
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 55,
            defense: 45,
            special_attack: 65,
            special_defense: 45,
            speed: 75,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [49, 18, 79],
    },
    // #226 Mantine
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 40,
            defense: 70,
            special_attack: 80,
            special_defense: 140,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 53, 94],
    },
    // #227 Skarmory
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 80,
            defense: 140,
            special_attack: 40,
            special_defense: 70,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 61, 78],
    },
    // #228 Houndour
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 60,
            defense: 30,
            special_attack: 80,
            special_defense: 50,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [68, 32, 20],
    },
    // #229 Houndoom
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 90,
            defense: 50,
            special_attack: 110,
            special_defense: 80,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [68, 32, 20],
    },
    // #230 Kingdra
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 95,
            defense: 95,
            special_attack: 95,
            special_defense: 95,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 13, 40],
    },
    // #231 Phanpy
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 60,
            defense: 60,
            special_attack: 40,
            special_defense: 40,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [44, 0, 23],
    },
    // #232 Donphan
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 120,
            defense: 120,
            special_attack: 60,
            special_defense: 60,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 0, 23],
    },
    // #233 Porygon2
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 80,
            defense: 90,
            special_attack: 105,
            special_defense: 95,
            speed: 60,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [105, 106, 67],
    },
    // #234 Stantler
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 73,
            attack: 95,
            defense: 62,
            special_attack: 85,
            special_defense: 65,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 34, 116],
    },
    // #235 Smeargle
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 20,
            defense: 35,
            special_attack: 20,
            special_defense: 45,
            speed: 75,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [64, 45, 127],
    },
    // #236 Tyrogue
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 35,
            defense: 35,
            special_attack: 35,
            special_defense: 35,
            speed: 35,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [17, 56, 49],
    },
    // #237 Hitmontop
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 95,
            defense: 95,
            special_attack: 35,
            special_defense: 110,
            speed: 70,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [19, 45, 56],
    },
    // #238 Smoochum
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 30,
            defense: 15,
            special_attack: 85,
            special_defense: 65,
            speed: 65,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [63, 80, 70],
    },
    // #239 Elekid
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 63,
            defense: 37,
            special_attack: 65,
            special_defense: 55,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [21, 0, 49],
    },
    // #240 Magby
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 75,
            defense: 37,
            special_attack: 70,
            special_defense: 55,
            speed: 83,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [62, 0, 49],
    },
    // #241 Miltank
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 80,
            defense: 105,
            special_attack: 40,
            special_defense: 70,
            speed: 100,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [69, 93, 116],
    },
    // #242 Blissey
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 255,
            attack: 10,
            defense: 10,
            special_attack: 75,
            special_defense: 135,
            speed: 55,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [89, 90, 91],
    },
    // #243 Raikou
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 85,
            defense: 75,
            special_attack: 115,
            special_defense: 100,
            speed: 115,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [107, 0, 103],
    },
    // #244 Entei
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 115,
            attack: 115,
            defense: 85,
            special_attack: 90,
            special_defense: 75,
            speed: 100,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [107, 0, 32],
    },
    // #245 Suicune
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 75,
            defense: 115,
            special_attack: 90,
            special_defense: 115,
            speed: 85,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [107, 0, 53],
    },
    // #246 Larvitar
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 64,
            defense: 50,
            special_attack: 45,
            special_defense: 50,
            speed: 41,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [17, 0, 23],
    },
    // #247 Pupitar
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 84,
            defense: 70,
            special_attack: 65,
            special_defense: 70,
            speed: 51,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [9, 0, 0],
    },
    // #248 Tyranitar
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 134,
            defense: 110,
            special_attack: 95,
            special_defense: 100,
            speed: 61,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [129, 0, 20],
    },
    // #249 Lugia
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 106,
            attack: 90,
            defense: 130,
            special_attack: 90,
            special_defense: 154,
            speed: 110,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [107, 0, 111],
    },
    // #250 Ho-Oh
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 106,
            attack: 130,
            defense: 90,
            special_attack: 110,
            special_defense: 154,
            speed: 90,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [107, 0, 65],
    },
    // #251 Celebi
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 100,
            defense: 100,
            special_attack: 100,
            special_defense: 100,
            speed: 100,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [89, 0, 0],
    },
    // #252 Treecko
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 45,
            defense: 35,
            special_attack: 65,
            special_defense: 55,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [1, 0, 87],
    },
    // #253 Grovyle
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 65,
            defense: 45,
            special_attack: 85,
            special_defense: 65,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [1, 0, 87],
    },
    // #254 Sceptile
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 85,
            defense: 65,
            special_attack: 105,
            special_defense: 85,
            speed: 120,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [1, 0, 87],
    },
    // #255 Torchic
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 60,
            defense: 40,
            special_attack: 70,
            special_defense: 50,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [3, 0, 118],
    },
    // #256 Combusken
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 85,
            defense: 60,
            special_attack: 85,
            special_defense: 60,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [3, 0, 118],
    },
    // #257 Blaziken
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 120,
            defense: 70,
            special_attack: 110,
            special_defense: 70,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [3, 0, 118],
    },
    // #258 Mudkip
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 70,
            defense: 50,
            special_attack: 50,
            special_defense: 50,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [5, 0, 40],
    },
    // #259 Marshtomp
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 85,
            defense: 70,
            special_attack: 60,
            special_defense: 70,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [5, 0, 40],
    },
    // #260 Swampert
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 110,
            defense: 90,
            special_attack: 85,
            special_defense: 90,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [5, 0, 40],
    },
    // #261 Poochyena
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 55,
            defense: 35,
            special_attack: 30,
            special_defense: 30,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [8, 104, 99],
    },
    // #262 Mightyena
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 90,
            defense: 70,
            special_attack: 60,
            special_defense: 60,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 104, 98],
    },
    // #263 Zigzagoon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 38,
            attack: 30,
            defense: 41,
            special_attack: 30,
            special_defense: 41,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [44, 57, 104],
    },
    // #264 Linoone
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 78,
            attack: 70,
            defense: 61,
            special_attack: 50,
            special_defense: 61,
            speed: 100,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [44, 57, 104],
    },
    // #265 Wurmple
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 45,
            defense: 35,
            special_attack: 20,
            special_defense: 30,
            speed: 20,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [7, 0, 8],
    },
    // #266 Silcoon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 35,
            defense: 55,
            special_attack: 25,
            special_defense: 25,
            speed: 15,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [9, 0, 0],
    },
    // #267 Beautifly
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 70,
            defense: 50,
            special_attack: 90,
            special_defense: 50,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 0, 26],
    },
    // #268 Cascoon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 35,
            defense: 55,
            special_attack: 25,
            special_defense: 25,
            speed: 15,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [9, 0, 0],
    },
    // #269 Dustox
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 50,
            defense: 70,
            special_attack: 50,
            special_defense: 90,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [7, 0, 10],
    },
    // #270 Lotad
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 30,
            defense: 30,
            special_attack: 40,
            special_defense: 50,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 6, 64],
    },
    // #271 Lombre
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 50,
            defense: 50,
            special_attack: 60,
            special_defense: 70,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 6, 64],
    },
    // #272 Ludicolo
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 70,
            defense: 70,
            special_attack: 90,
            special_defense: 100,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 6, 64],
    },
    // #273 Seedot
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 40,
            defense: 50,
            special_attack: 30,
            special_defense: 30,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 68, 124],
    },
    // #274 Nuzleaf
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 70,
            defense: 40,
            special_attack: 60,
            special_defense: 40,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 68, 124],
    },
    // #275 Shiftry
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 100,
            defense: 60,
            special_attack: 90,
            special_defense: 60,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 68, 124],
    },
    // #276 Taillow
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 55,
            defense: 30,
            special_attack: 30,
            special_defense: 30,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [17, 0, 93],
    },
    // #277 Swellow
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 85,
            defense: 60,
            special_attack: 50,
            special_defense: 50,
            speed: 125,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [17, 0, 93],
    },
    // #278 Wingull
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 30,
            defense: 30,
            special_attack: 55,
            special_defense: 30,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 0, 6],
    },
    // #279 Pelipper
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 50,
            defense: 100,
            special_attack: 85,
            special_defense: 70,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 0, 6],
    },
    // #280 Ralts
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 28,
            attack: 25,
            defense: 25,
            special_attack: 45,
            special_defense: 35,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [54, 105, 121],
    },
    // #281 Kirlia
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 38,
            attack: 35,
            defense: 35,
            special_attack: 65,
            special_defense: 55,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [54, 105, 121],
    },
    // #282 Gardevoir
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 68,
            attack: 65,
            defense: 65,
            special_attack: 125,
            special_defense: 115,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [54, 105, 121],
    },
    // #283 Surskit
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 30,
            defense: 32,
            special_attack: 50,
            special_defense: 52,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 0, 6],
    },
    // #284 Masquerain
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 60,
            defense: 62,
            special_attack: 80,
            special_defense: 82,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 0, 20],
    },
    // #285 Shroomish
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 40,
            defense: 60,
            special_attack: 40,
            special_defense: 60,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [38, 130, 104],
    },
    // #286 Breloom
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 130,
            defense: 80,
            special_attack: 60,
            special_defense: 60,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [38, 130, 45],
    },
    // #287 Slakoth
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 60,
            defense: 60,
            special_attack: 35,
            special_defense: 35,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [131, 0, 0],
    },
    // #288 Vigoroth
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 80,
            defense: 80,
            special_attack: 55,
            special_defense: 55,
            speed: 90,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [49, 0, 0],
    },
    // #289 Slaking
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 150,
            attack: 160,
            defense: 100,
            special_attack: 95,
            special_defense: 65,
            speed: 100,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [131, 0, 0],
    },
    // #290 Nincada
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 31,
            attack: 45,
            defense: 90,
            special_attack: 30,
            special_defense: 30,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [10, 0, 8],
    },
    // #291 Ninjask
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 61,
            attack: 90,
            defense: 45,
            special_attack: 50,
            special_defense: 50,
            speed: 160,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [118, 0, 36],
    },
    // #292 Shedinja
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 1,
            attack: 90,
            defense: 45,
            special_attack: 30,
            special_defense: 30,
            speed: 40,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [132, 0, 0],
    },
    // #293 Whismur
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 64,
            attack: 51,
            defense: 23,
            special_attack: 51,
            special_defense: 23,
            speed: 28,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [82, 0, 99],
    },
    // #294 Loudred
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 84,
            attack: 71,
            defense: 43,
            special_attack: 71,
            special_defense: 43,
            speed: 48,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [82, 0, 93],
    },
    // #295 Exploud
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 104,
            attack: 91,
            defense: 63,
            special_attack: 91,
            special_defense: 63,
            speed: 68,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [82, 0, 93],
    },
    // #296 Makuhita
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 72,
            attack: 60,
            defense: 30,
            special_attack: 20,
            special_defense: 30,
            speed: 25,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [69, 17, 27],
    },
    // #297 Hariyama
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 144,
            attack: 120,
            defense: 60,
            special_attack: 40,
            special_defense: 60,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [69, 17, 27],
    },
    // #298 Azurill
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 20,
            defense: 40,
            special_attack: 20,
            special_defense: 40,
            speed: 20,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [69, 115, 116],
    },
    // #299 Nosepass
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 30,
            attack: 45,
            defense: 135,
            special_attack: 45,
            special_defense: 90,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 66, 43],
    },
    // #300 Skitty
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 45,
            defense: 45,
            special_attack: 35,
            special_defense: 35,
            speed: 50,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [28, 133, 41],
    },
    // #301 Delcatty
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 65,
            defense: 65,
            special_attack: 55,
            special_defense: 55,
            speed: 70,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [28, 133, 41],
    },
    // #302 Sableye
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 75,
            defense: 75,
            special_attack: 65,
            special_defense: 65,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 134, 119],
    },
    // #303 Mawile
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 85,
            defense: 85,
            special_attack: 55,
            special_defense: 55,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [81, 19, 27],
    },
    // #304 Aron
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 70,
            defense: 100,
            special_attack: 40,
            special_defense: 40,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 60, 135],
    },
    // #305 Lairon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 90,
            defense: 140,
            special_attack: 50,
            special_defense: 50,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 60, 135],
    },
    // #306 Aggron
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 110,
            defense: 180,
            special_attack: 60,
            special_defense: 60,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 60, 135],
    },
    // #307 Meditite
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 30,
            attack: 40,
            defense: 55,
            special_attack: 40,
            special_defense: 55,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [136, 0, 121],
    },
    // #308 Medicham
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 60,
            defense: 75,
            special_attack: 60,
            special_defense: 75,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [136, 0, 121],
    },
    // #309 Electrike
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 45,
            defense: 40,
            special_attack: 65,
            special_defense: 40,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [21, 22, 137],
    },
    // #310 Manectric
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 75,
            defense: 60,
            special_attack: 105,
            special_defense: 60,
            speed: 105,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [21, 22, 137],
    },
    // #311 Plusle
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 50,
            defense: 40,
            special_attack: 85,
            special_defense: 75,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [114, 0, 0],
    },
    // #312 Minun
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 40,
            defense: 50,
            special_attack: 75,
            special_defense: 85,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [137, 0, 0],
    },
    // #313 Volbeat
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 73,
            defense: 55,
            special_attack: 47,
            special_defense: 75,
            speed: 85,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [95, 12, 119],
    },
    // #314 Illumise
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 47,
            defense: 55,
            special_attack: 73,
            special_defense: 75,
            speed: 85,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [63, 11, 119],
    },
    // #315 Roselia
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 60,
            defense: 45,
            special_attack: 100,
            special_defense: 80,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [89, 25, 92],
    },
    // #316 Gulpin
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 43,
            defense: 53,
            special_attack: 43,
            special_defense: 53,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [59, 72, 57],
    },
    // #317 Swalot
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 73,
            defense: 83,
            special_attack: 73,
            special_defense: 83,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [59, 72, 57],
    },
    // #318 Carvanha
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 90,
            defense: 20,
            special_attack: 65,
            special_defense: 20,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [138, 0, 118],
    },
    // #319 Sharpedo
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 120,
            defense: 40,
            special_attack: 95,
            special_defense: 40,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [138, 0, 118],
    },
    // #320 Wailmer
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 130,
            attack: 70,
            defense: 35,
            special_attack: 70,
            special_defense: 35,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [94, 63, 107],
    },
    // #321 Wailord
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 170,
            attack: 90,
            defense: 45,
            special_attack: 90,
            special_defense: 45,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [94, 63, 107],
    },
    // #322 Numel
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 60,
            defense: 40,
            special_attack: 65,
            special_defense: 45,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [63, 139, 64],
    },
    // #323 Camerupt
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 100,
            defense: 70,
            special_attack: 105,
            special_defense: 75,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [126, 140, 50],
    },
    // #324 Torkoal
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 85,
            defense: 140,
            special_attack: 85,
            special_defense: 70,
            speed: 20,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [141, 0, 74],
    },
    // #325 Spoink
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 25,
            defense: 35,
            special_attack: 70,
            special_defense: 80,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [69, 64, 57],
    },
    // #326 Grumpig
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 45,
            defense: 65,
            special_attack: 90,
            special_defense: 110,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [69, 64, 57],
    },
    // #327 Spinda
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 60,
            defense: 60,
            special_attack: 60,
            special_defense: 60,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [64, 15, 123],
    },
    // #328 Trapinch
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 100,
            defense: 45,
            special_attack: 45,
            special_defense: 45,
            speed: 10,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [81, 42, 27],
    },
    // #329 Vibrava
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 70,
            defense: 50,
            special_attack: 50,
            special_defense: 50,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 0],
    },
    // #330 Flygon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 100,
            defense: 80,
            special_attack: 80,
            special_defense: 80,
            speed: 100,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 0],
    },
    // #331 Cacnea
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 85,
            defense: 40,
            special_attack: 85,
            special_defense: 40,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [23, 0, 53],
    },
    // #332 Cacturne
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 115,
            defense: 60,
            special_attack: 115,
            special_defense: 60,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [23, 0, 53],
    },
    // #333 Swablu
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 40,
            defense: 60,
            special_attack: 40,
            special_defense: 75,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [89, 0, 47],
    },
    // #334 Altaria
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 70,
            defense: 90,
            special_attack: 70,
            special_defense: 105,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [89, 0, 47],
    },
    // #335 Zangoose
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 73,
            attack: 115,
            defense: 60,
            special_attack: 60,
            special_defense: 60,
            speed: 90,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [108, 0, 142],
    },
    // #336 Seviper
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 73,
            attack: 100,
            defense: 60,
            special_attack: 100,
            special_defense: 60,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [9, 0, 36],
    },
    // #337 Lunatone
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 55,
            defense: 65,
            special_attack: 95,
            special_defense: 85,
            speed: 70,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [77, 0, 0],
    },
    // #338 Solrock
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 95,
            defense: 85,
            special_attack: 55,
            special_defense: 65,
            speed: 70,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [77, 0, 0],
    },
    // #339 Barboach
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 48,
            defense: 43,
            special_attack: 46,
            special_defense: 41,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [63, 102, 70],
    },
    // #340 Whiscash
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 110,
            attack: 78,
            defense: 73,
            special_attack: 76,
            special_defense: 71,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [63, 102, 70],
    },
    // #341 Corphish
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 43,
            attack: 80,
            defense: 65,
            special_attack: 50,
            special_defense: 35,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [81, 74, 101],
    },
    // #342 Crawdaunt
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 63,
            attack: 120,
            defense: 85,
            special_attack: 90,
            special_defense: 55,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [81, 74, 101],
    },
    // #343 Baltoy
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 40,
            defense: 55,
            special_attack: 40,
            special_defense: 70,
            speed: 55,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [77, 0, 0],
    },
    // #344 Claydol
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 70,
            defense: 105,
            special_attack: 70,
            special_defense: 120,
            speed: 75,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [77, 0, 0],
    },
    // #345 Lileep
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 66,
            attack: 41,
            defense: 77,
            special_attack: 61,
            special_defense: 87,
            speed: 23,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [128, 0, 143],
    },
    // #346 Cradily
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 86,
            attack: 81,
            defense: 97,
            special_attack: 81,
            special_defense: 107,
            speed: 43,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [128, 0, 143],
    },
    // #347 Anorith
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 95,
            defense: 50,
            special_attack: 40,
            special_defense: 50,
            speed: 75,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [85, 0, 48],
    },
    // #348 Armaldo
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 125,
            defense: 100,
            special_attack: 70,
            special_defense: 80,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [85, 0, 48],
    },
    // #349 Feebas
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 20,
            attack: 15,
            defense: 20,
            special_attack: 10,
            special_defense: 55,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 0, 101],
    },
    // #350 Milotic
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 60,
            defense: 79,
            special_attack: 100,
            special_defense: 125,
            speed: 81,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [110, 0, 28],
    },
    // #351 Castform
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 70,
            defense: 70,
            special_attack: 70,
            special_defense: 70,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [144, 0, 0],
    },
    // #352 Kecleon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 90,
            defense: 70,
            special_attack: 60,
            special_defense: 120,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [145, 0, 0],
    },
    // #353 Shuppet
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 44,
            attack: 75,
            defense: 35,
            special_attack: 63,
            special_defense: 33,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [79, 34, 146],
    },
    // #354 Banette
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 64,
            attack: 115,
            defense: 65,
            special_attack: 83,
            special_defense: 63,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [79, 34, 146],
    },
    // #355 Duskull
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 20,
            attack: 40,
            defense: 90,
            special_attack: 30,
            special_defense: 90,
            speed: 25,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 0],
    },
    // #356 Dusclops
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 70,
            defense: 130,
            special_attack: 60,
            special_defense: 130,
            speed: 25,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [107, 0, 0],
    },
    // #357 Tropius
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 99,
            attack: 68,
            defense: 83,
            special_attack: 72,
            special_defense: 87,
            speed: 51,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 4, 84],
    },
    // #358 Chimecho
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 50,
            defense: 70,
            special_attack: 95,
            special_defense: 80,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 0],
    },
    // #359 Absol
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 130,
            defense: 60,
            special_attack: 75,
            special_defense: 60,
            speed: 75,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [107, 112, 52],
    },
    // #360 Wynaut
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 23,
            defense: 48,
            special_attack: 23,
            special_defense: 48,
            speed: 23,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [120, 0, 121],
    },
    // #361 Snorunt
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 50,
            defense: 50,
            special_attack: 50,
            special_defense: 50,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [35, 71, 127],
    },
    // #362 Glalie
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 80,
            defense: 80,
            special_attack: 80,
            special_defense: 80,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [35, 71, 127],
    },
    // #363 Spheal
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 40,
            defense: 50,
            special_attack: 55,
            special_defense: 50,
            speed: 25,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [69, 71, 63],
    },
    // #364 Sealeo
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 60,
            defense: 70,
            special_attack: 75,
            special_defense: 70,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [69, 71, 63],
    },
    // #365 Walrein
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 110,
            attack: 80,
            defense: 90,
            special_attack: 95,
            special_defense: 90,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [69, 71, 63],
    },
    // #366 Clamperl
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 64,
            defense: 85,
            special_attack: 74,
            special_defense: 55,
            speed: 32,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [74, 0, 99],
    },
    // #367 Huntail
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 104,
            defense: 105,
            special_attack: 94,
            special_defense: 75,
            speed: 52,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 0, 94],
    },
    // #368 Gorebyss
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 84,
            defense: 105,
            special_attack: 114,
            special_defense: 75,
            speed: 52,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 0, 70],
    },
    // #369 Relicanth
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 90,
            defense: 130,
            special_attack: 45,
            special_defense: 65,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [48, 60, 61],
    },
    // #370 Luvdisc
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 43,
            attack: 30,
            defense: 55,
            special_attack: 40,
            special_defense: 65,
            speed: 97,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [48, 0, 70],
    },
    // #371 Bagon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 75,
            defense: 60,
            special_attack: 40,
            special_defense: 30,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [60, 0, 27],
    },
    // #372 Shelgon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 95,
            defense: 100,
            special_attack: 60,
            special_defense: 50,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [60, 0, 76],
    },
    // #373 Salamence
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 135,
            defense: 80,
            special_attack: 110,
            special_defense: 80,
            speed: 100,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 0, 98],
    },
    // #374 Beldum
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 55,
            defense: 80,
            special_attack: 35,
            special_defense: 60,
            speed: 30,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [58, 0, 122],
    },
    // #375 Metang
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 75,
            defense: 100,
            special_attack: 55,
            special_defense: 80,
            speed: 50,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [58, 0, 122],
    },
    // #376 Metagross
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 135,
            defense: 130,
            special_attack: 95,
            special_defense: 90,
            speed: 70,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [58, 0, 122],
    },
    // #377 Regirock
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 100,
            defense: 200,
            special_attack: 50,
            special_defense: 100,
            speed: 50,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [58, 0, 61],
    },
    // #378 Regice
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 50,
            defense: 100,
            special_attack: 100,
            special_defense: 200,
            speed: 50,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [58, 0, 71],
    },
    // #379 Registeel
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 75,
            defense: 150,
            special_attack: 75,
            special_defense: 150,
            speed: 50,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [58, 0, 122],
    },
    // #380 Latias
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 80,
            defense: 90,
            special_attack: 110,
            special_defense: 130,
            speed: 110,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [77, 0, 0],
    },
    // #381 Latios
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 90,
            defense: 80,
            special_attack: 130,
            special_defense: 110,
            speed: 110,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [77, 0, 0],
    },
    // #382 Kyogre
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 100,
            defense: 90,
            special_attack: 150,
            special_defense: 140,
            speed: 90,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [117, 0, 0],
    },
    // #383 Groudon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 150,
            defense: 140,
            special_attack: 100,
            special_defense: 90,
            speed: 90,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [33, 0, 0],
    },
    // #384 Rayquaza
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 105,
            attack: 150,
            defense: 90,
            special_attack: 150,
            special_defense: 90,
            speed: 95,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [147, 0, 0],
    },
    // #385 Jirachi
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 100,
            defense: 100,
            special_attack: 100,
            special_defense: 100,
            speed: 100,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [90, 0, 0],
    },
    // #386 Deoxys
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 150,
            defense: 50,
            special_attack: 150,
            special_defense: 50,
            speed: 150,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [107, 0, 0],
    },
    // #387 Turtwig
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 68,
            defense: 64,
            special_attack: 45,
            special_defense: 55,
            speed: 31,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [1, 0, 74],
    },
    // #388 Grotle
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 89,
            defense: 85,
            special_attack: 55,
            special_defense: 65,
            speed: 36,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [1, 0, 74],
    },
    // #389 Torterra
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 109,
            defense: 105,
            special_attack: 75,
            special_defense: 85,
            speed: 56,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [1, 0, 74],
    },
    // #390 Chimchar
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 44,
            attack: 58,
            defense: 44,
            special_attack: 58,
            special_defense: 44,
            speed: 61,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [3, 0, 88],
    },
    // #391 Monferno
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 64,
            attack: 78,
            defense: 52,
            special_attack: 78,
            special_defense: 52,
            speed: 81,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [3, 0, 88],
    },
    // #392 Infernape
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 76,
            attack: 104,
            defense: 71,
            special_attack: 104,
            special_defense: 71,
            speed: 108,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [3, 0, 88],
    },
    // #393 Piplup
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 53,
            attack: 51,
            defense: 53,
            special_attack: 61,
            special_defense: 56,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [5, 0, 51],
    },
    // #394 Prinplup
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 64,
            attack: 66,
            defense: 68,
            special_attack: 81,
            special_defense: 76,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [5, 0, 51],
    },
    // #395 Empoleon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 84,
            attack: 86,
            defense: 88,
            special_attack: 111,
            special_defense: 101,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [5, 0, 51],
    },
    // #396 Starly
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 55,
            defense: 30,
            special_attack: 30,
            special_defense: 30,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 0, 0],
    },
    // #397 Staravia
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 75,
            defense: 50,
            special_attack: 40,
            special_defense: 40,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 0, 86],
    },
    // #398 Staraptor
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 120,
            defense: 70,
            special_attack: 50,
            special_defense: 50,
            speed: 100,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 0, 86],
    },
    // #399 Bidoof
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 59,
            attack: 45,
            defense: 40,
            special_attack: 35,
            special_defense: 40,
            speed: 31,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [139, 31, 127],
    },
    // #400 Bibarel
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 79,
            attack: 85,
            defense: 60,
            special_attack: 55,
            special_defense: 60,
            speed: 71,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [139, 31, 127],
    },
    // #401 Kricketot
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 37,
            attack: 25,
            defense: 41,
            special_attack: 25,
            special_defense: 41,
            speed: 25,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [9, 0, 8],
    },
    // #402 Kricketune
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 77,
            attack: 85,
            defense: 51,
            special_attack: 55,
            special_defense: 51,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 0, 45],
    },
    // #403 Shinx
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 65,
            defense: 34,
            special_attack: 40,
            special_defense: 34,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [26, 19, 17],
    },
    // #404 Luxio
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 85,
            defense: 49,
            special_attack: 60,
            special_defense: 49,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [26, 19, 17],
    },
    // #405 Luxray
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 120,
            defense: 79,
            special_attack: 95,
            special_defense: 79,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [26, 19, 17],
    },
    // #406 Budew
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 30,
            defense: 35,
            special_attack: 50,
            special_defense: 70,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [89, 25, 92],
    },
    // #407 Roserade
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 55,
            defense: 65,
            special_attack: 125,
            special_defense: 105,
            speed: 90,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [89, 25, 45],
    },
    // #408 Cranidos
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 67,
            attack: 125,
            defense: 40,
            special_attack: 30,
            special_defense: 30,
            speed: 58,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [97, 0, 27],
    },
    // #409 Rampardos
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 97,
            attack: 165,
            defense: 60,
            special_attack: 65,
            special_defense: 50,
            speed: 58,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [97, 0, 27],
    },
    // #410 Shieldon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 30,
            attack: 42,
            defense: 118,
            special_attack: 42,
            special_defense: 88,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [61, 0, 82],
    },
    // #411 Bastiodon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 52,
            defense: 168,
            special_attack: 47,
            special_defense: 138,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [61, 0, 82],
    },
    // #412 Burmy
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 29,
            defense: 45,
            special_attack: 29,
            special_defense: 45,
            speed: 36,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [9, 0, 76],
    },
    // #413 Wormadam
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 59,
            defense: 85,
            special_attack: 79,
            special_defense: 105,
            speed: 36,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [102, 0, 76],
    },
    // #414 Mothim
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 94,
            defense: 50,
            special_attack: 94,
            special_defense: 50,
            speed: 66,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [12, 0, 11],
    },
    // #415 Combee
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 30,
            attack: 30,
            defense: 42,
            special_attack: 30,
            special_defense: 42,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [125, 0, 18],
    },
    // #416 Vespiquen
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 80,
            defense: 102,
            special_attack: 80,
            special_defense: 102,
            speed: 40,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [107, 0, 20],
    },
    // #417 Pachirisu
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 45,
            defense: 70,
            special_attack: 45,
            special_defense: 90,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [8, 44, 103],
    },
    // #418 Buizel
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 65,
            defense: 35,
            special_attack: 60,
            special_defense: 30,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 0, 94],
    },
    // #419 Floatzel
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 105,
            defense: 55,
            special_attack: 85,
            special_defense: 50,
            speed: 115,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 0, 94],
    },
    // #420 Cherubi
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 35,
            defense: 45,
            special_attack: 62,
            special_defense: 53,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 0, 0],
    },
    // #421 Cherrim
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 60,
            defense: 70,
            special_attack: 87,
            special_defense: 78,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [148, 0, 0],
    },
    // #422 Shellos
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 76,
            attack: 48,
            defense: 48,
            special_attack: 57,
            special_defense: 62,
            speed: 34,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [72, 143, 43],
    },
    // #423 Gastrodon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 111,
            attack: 83,
            defense: 68,
            special_attack: 92,
            special_defense: 82,
            speed: 39,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [72, 143, 43],
    },
    // #424 Ambipom
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 100,
            defense: 66,
            special_attack: 60,
            special_defense: 66,
            speed: 115,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [45, 44, 75],
    },
    // #425 Drifloon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 50,
            defense: 34,
            special_attack: 60,
            special_defense: 44,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [83, 87, 149],
    },
    // #426 Drifblim
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 150,
            attack: 80,
            defense: 44,
            special_attack: 90,
            special_defense: 54,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [83, 87, 149],
    },
    // #427 Buneary
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 66,
            defense: 44,
            special_attack: 44,
            special_defense: 56,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [8, 150, 46],
    },
    // #428 Lopunny
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 76,
            defense: 84,
            special_attack: 54,
            special_defense: 96,
            speed: 105,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [28, 150, 46],
    },
    // #429 Mismagius
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 60,
            defense: 60,
            special_attack: 105,
            special_defense: 105,
            speed: 105,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 0],
    },
    // #430 Honchkrow
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 125,
            defense: 52,
            special_attack: 105,
            special_defense: 52,
            speed: 71,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [79, 112, 98],
    },
    // #431 Glameow
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 49,
            attack: 55,
            defense: 42,
            special_attack: 42,
            special_defense: 37,
            speed: 85,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [46, 64, 14],
    },
    // #432 Purugly
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 71,
            attack: 82,
            defense: 64,
            special_attack: 64,
            special_defense: 59,
            speed: 112,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [69, 64, 51],
    },
    // #433 Chingling
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 30,
            defense: 50,
            special_attack: 65,
            special_defense: 50,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 0],
    },
    // #434 Stunky
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 63,
            attack: 63,
            defense: 47,
            special_attack: 41,
            special_defense: 41,
            speed: 74,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [37, 83, 14],
    },
    // #435 Skuntank
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 103,
            attack: 93,
            defense: 67,
            special_attack: 71,
            special_defense: 61,
            speed: 84,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [37, 83, 14],
    },
    // #436 Bronzor
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 57,
            attack: 24,
            defense: 86,
            special_attack: 24,
            special_defense: 86,
            speed: 23,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [77, 151, 135],
    },
    // #437 Bronzong
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 67,
            attack: 89,
            defense: 116,
            special_attack: 79,
            special_defense: 116,
            speed: 33,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [77, 151, 135],
    },
    // #438 Bonsly
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 80,
            defense: 95,
            special_attack: 10,
            special_defense: 45,
            speed: 10,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 60, 99],
    },
    // #439 Mime Jr.
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 20,
            attack: 25,
            defense: 45,
            special_attack: 70,
            special_defense: 90,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [82, 96, 45],
    },
    // #440 Happiny
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 5,
            defense: 5,
            special_attack: 15,
            special_defense: 65,
            speed: 30,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [89, 90, 30],
    },
    // #441 Chatot
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 76,
            attack: 65,
            defense: 45,
            special_attack: 92,
            special_defense: 42,
            speed: 91,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 15, 16],
    },
    // #442 Spiritomb
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 92,
            defense: 108,
            special_attack: 92,
            special_defense: 108,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [107, 0, 36],
    },
    // #443 Gible
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 58,
            attack: 70,
            defense: 45,
            special_attack: 40,
            special_defense: 45,
            speed: 42,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [23, 0, 138],
    },
    // #444 Gabite
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 68,
            attack: 90,
            defense: 65,
            special_attack: 50,
            special_defense: 55,
            speed: 82,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [23, 0, 138],
    },
    // #445 Garchomp
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 108,
            attack: 130,
            defense: 95,
            special_attack: 80,
            special_defense: 85,
            speed: 102,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [23, 0, 138],
    },
    // #446 Munchlax
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 135,
            attack: 85,
            defense: 40,
            special_attack: 40,
            special_defense: 85,
            speed: 5,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [44, 69, 57],
    },
    // #447 Riolu
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 70,
            defense: 40,
            special_attack: 35,
            special_defense: 40,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [56, 35, 119],
    },
    // #448 Lucario
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 110,
            defense: 70,
            special_attack: 115,
            special_defense: 70,
            speed: 90,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [56, 35, 52],
    },
    // #449 Hippopotas
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 68,
            attack: 72,
            defense: 78,
            special_attack: 38,
            special_defense: 42,
            speed: 32,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [129, 0, 43],
    },
    // #450 Hippowdon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 108,
            attack: 112,
            defense: 118,
            special_attack: 68,
            special_defense: 72,
            speed: 47,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [129, 0, 43],
    },
    // #451 Skorupi
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 50,
            defense: 90,
            special_attack: 30,
            special_defense: 55,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [85, 13, 14],
    },
    // #452 Drapion
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 90,
            defense: 110,
            special_attack: 60,
            special_defense: 75,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [85, 13, 14],
    },
    // #453 Croagunk
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 48,
            attack: 61,
            defense: 40,
            special_attack: 61,
            special_defense: 40,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [102, 39, 73],
    },
    // #454 Toxicroak
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 83,
            attack: 106,
            defense: 65,
            special_attack: 86,
            special_defense: 65,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [102, 39, 73],
    },
    // #455 Carnivine
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 74,
            attack: 100,
            defense: 72,
            special_attack: 90,
            special_defense: 72,
            speed: 46,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 0],
    },
    // #456 Finneon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 49,
            attack: 49,
            defense: 56,
            special_attack: 49,
            special_defense: 61,
            speed: 66,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 143, 94],
    },
    // #457 Lumineon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 69,
            attack: 69,
            defense: 76,
            special_attack: 69,
            special_defense: 86,
            speed: 91,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 143, 94],
    },
    // #458 Mantyke
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 20,
            defense: 50,
            special_attack: 60,
            special_defense: 120,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 53, 94],
    },
    // #459 Snover
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 62,
            defense: 50,
            special_attack: 62,
            special_defense: 60,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [152, 0, 82],
    },
    // #460 Abomasnow
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 92,
            defense: 75,
            special_attack: 92,
            special_defense: 85,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [152, 0, 82],
    },
    // #461 Weavile
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 120,
            defense: 65,
            special_attack: 45,
            special_defense: 85,
            speed: 125,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [107, 0, 124],
    },
    // #462 Magnezone
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 70,
            defense: 115,
            special_attack: 130,
            special_defense: 90,
            speed: 60,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [66, 61, 67],
    },
    // #463 Lickilicky
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 110,
            attack: 85,
            defense: 95,
            special_attack: 80,
            special_defense: 95,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [64, 63, 47],
    },
    // #464 Rhyperior
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 115,
            attack: 140,
            defense: 130,
            special_attack: 55,
            special_defense: 55,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [22, 140, 86],
    },
    // #465 Tangrowth
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 100,
            defense: 125,
            special_attack: 110,
            special_defense: 50,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 92, 65],
    },
    // #466 Electivire
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 123,
            defense: 67,
            special_attack: 95,
            special_defense: 85,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [153, 0, 49],
    },
    // #467 Magmortar
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 95,
            defense: 67,
            special_attack: 125,
            special_defense: 95,
            speed: 83,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [62, 0, 49],
    },
    // #468 Togekiss
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 50,
            defense: 95,
            special_attack: 120,
            special_defense: 115,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [18, 90, 112],
    },
    // #469 Yanmega
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 86,
            attack: 76,
            defense: 86,
            special_attack: 116,
            special_defense: 56,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [118, 11, 34],
    },
    // #470 Leafeon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 110,
            defense: 130,
            special_attack: 60,
            special_defense: 65,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [92, 0, 2],
    },
    // #471 Glaceon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 60,
            defense: 110,
            special_attack: 130,
            special_defense: 95,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [109, 0, 71],
    },
    // #472 Gliscor
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 95,
            defense: 125,
            special_attack: 45,
            special_defense: 75,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [81, 23, 130],
    },
    // #473 Mamoswine
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 110,
            attack: 130,
            defense: 80,
            special_attack: 70,
            special_defense: 60,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [63, 109, 69],
    },
    // #474 Porygon-Z
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 80,
            defense: 70,
            special_attack: 135,
            special_defense: 75,
            speed: 90,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [101, 106, 67],
    },
    // #475 Gallade
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 68,
            attack: 125,
            defense: 65,
            special_attack: 65,
            special_defense: 115,
            speed: 80,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [56, 0, 52],
    },
    // #476 Probopass
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 55,
            defense: 145,
            special_attack: 75,
            special_defense: 150,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 66, 43],
    },
    // #477 Dusknoir
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 100,
            defense: 135,
            special_attack: 65,
            special_defense: 135,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [107, 0, 0],
    },
    // #478 Froslass
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 80,
            defense: 70,
            special_attack: 80,
            special_defense: 70,
            speed: 110,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [109, 0, 146],
    },
    // #479 Rotom
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 50,
            defense: 77,
            special_attack: 95,
            special_defense: 77,
            speed: 91,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [77, 0, 0],
    },
    // #480 Uxie
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 75,
            defense: 130,
            special_attack: 75,
            special_defense: 130,
            speed: 95,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [77, 0, 0],
    },
    // #481 Mesprit
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 105,
            defense: 105,
            special_attack: 105,
            special_defense: 105,
            speed: 80,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [77, 0, 0],
    },
    // #482 Azelf
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 125,
            defense: 70,
            special_attack: 125,
            special_defense: 70,
            speed: 115,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [77, 0, 0],
    },
    // #483 Dialga
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 120,
            defense: 120,
            special_attack: 150,
            special_defense: 100,
            speed: 90,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [107, 0, 121],
    },
    // #484 Palkia
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 120,
            defense: 100,
            special_attack: 150,
            special_defense: 120,
            speed: 100,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [107, 0, 121],
    },
    // #485 Heatran
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 91,
            attack: 90,
            defense: 106,
            special_attack: 130,
            special_defense: 106,
            speed: 77,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [32, 0, 62],
    },
    // #486 Regigigas
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 110,
            attack: 160,
            defense: 110,
            special_attack: 80,
            special_defense: 110,
            speed: 100,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [154, 0, 0],
    },
    // #487 Giratina
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 150,
            attack: 100,
            defense: 120,
            special_attack: 100,
            special_defense: 120,
            speed: 90,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [107, 0, 121],
    },
    // #488 Cresselia
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 120,
            attack: 70,
            defense: 120,
            special_attack: 75,
            special_defense: 130,
            speed: 85,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [77, 0, 0],
    },
    // #489 Phione
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 80,
            defense: 80,
            special_attack: 80,
            special_defense: 80,
            speed: 80,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [70, 0, 0],
    },
    // #490 Manaphy
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 100,
            defense: 100,
            special_attack: 100,
            special_defense: 100,
            speed: 100,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [70, 0, 0],
    },
    // #491 Darkrai
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 90,
            defense: 90,
            special_attack: 135,
            special_defense: 90,
            speed: 125,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [155, 0, 0],
    },
    // #492 Shaymin
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 100,
            defense: 100,
            special_attack: 100,
            special_defense: 100,
            speed: 100,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [89, 0, 0],
    },
    // #493 Arceus
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 120,
            attack: 120,
            defense: 120,
            special_attack: 120,
            special_defense: 120,
            speed: 120,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [156, 0, 0],
    },
    // #494 Victini
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 100,
            defense: 100,
            special_attack: 100,
            special_defense: 100,
            speed: 100,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [157, 0, 0],
    },
    // #495 Snivy
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 45,
            defense: 55,
            special_attack: 45,
            special_defense: 55,
            speed: 63,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [1, 0, 123],
    },
    // #496 Servine
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 60,
            defense: 75,
            special_attack: 60,
            special_defense: 75,
            speed: 83,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [1, 0, 123],
    },
    // #497 Serperior
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 75,
            defense: 95,
            special_attack: 75,
            special_defense: 95,
            speed: 113,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [1, 0, 123],
    },
    // #498 Tepig
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 63,
            defense: 45,
            special_attack: 45,
            special_defense: 45,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [3, 0, 69],
    },
    // #499 Pignite
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 93,
            defense: 55,
            special_attack: 70,
            special_defense: 55,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [3, 0, 69],
    },
    // #500 Emboar
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 110,
            attack: 123,
            defense: 65,
            special_attack: 100,
            special_defense: 65,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [3, 0, 86],
    },
    // #501 Oshawott
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 55,
            defense: 45,
            special_attack: 63,
            special_defense: 45,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [5, 0, 74],
    },
    // #502 Dewott
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 75,
            defense: 60,
            special_attack: 83,
            special_defense: 60,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [5, 0, 74],
    },
    // #503 Samurott
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 100,
            defense: 85,
            special_attack: 108,
            special_defense: 70,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [5, 0, 74],
    },
    // #504 Patrat
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 55,
            defense: 39,
            special_attack: 35,
            special_defense: 39,
            speed: 42,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [8, 14, 67],
    },
    // #505 Watchog
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 85,
            defense: 69,
            special_attack: 60,
            special_defense: 69,
            speed: 77,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [95, 14, 67],
    },
    // #506 Lillipup
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 60,
            defense: 45,
            special_attack: 25,
            special_defense: 45,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [49, 44, 8],
    },
    // #507 Herdier
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 80,
            defense: 65,
            special_attack: 35,
            special_defense: 65,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 24, 93],
    },
    // #508 Stoutland
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 100,
            defense: 90,
            special_attack: 45,
            special_defense: 90,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 24, 93],
    },
    // #509 Purrloin
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 41,
            attack: 50,
            defense: 37,
            special_attack: 50,
            special_defense: 37,
            speed: 66,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [46, 87, 119],
    },
    // #510 Liepard
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 64,
            attack: 88,
            defense: 50,
            special_attack: 88,
            special_defense: 50,
            speed: 106,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [46, 87, 119],
    },
    // #511 Pansage
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 53,
            defense: 48,
            special_attack: 53,
            special_defense: 48,
            speed: 64,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [57, 0, 1],
    },
    // #512 Simisage
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 98,
            defense: 63,
            special_attack: 98,
            special_defense: 63,
            speed: 101,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [57, 0, 1],
    },
    // #513 Pansear
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 53,
            defense: 48,
            special_attack: 53,
            special_defense: 48,
            speed: 64,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [57, 0, 3],
    },
    // #514 Simisear
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 98,
            defense: 63,
            special_attack: 98,
            special_defense: 63,
            speed: 101,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [57, 0, 3],
    },
    // #515 Panpour
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 53,
            defense: 48,
            special_attack: 53,
            special_defense: 48,
            speed: 64,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [57, 0, 5],
    },
    // #516 Simipour
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 98,
            defense: 63,
            special_attack: 98,
            special_defense: 63,
            speed: 101,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [57, 0, 5],
    },
    // #517 Munna
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 76,
            attack: 25,
            defense: 45,
            special_attack: 67,
            special_defense: 55,
            speed: 24,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [80, 54, 121],
    },
    // #518 Musharna
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 116,
            attack: 55,
            defense: 85,
            special_attack: 107,
            special_defense: 95,
            speed: 29,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [80, 54, 121],
    },
    // #519 Pidove
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 55,
            defense: 50,
            special_attack: 36,
            special_defense: 30,
            speed: 43,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [16, 112, 26],
    },
    // #520 Tranquill
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 62,
            attack: 77,
            defense: 62,
            special_attack: 50,
            special_defense: 42,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [16, 112, 26],
    },
    // #521 Unfezant
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 105,
            defense: 80,
            special_attack: 65,
            special_defense: 55,
            speed: 93,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [16, 112, 26],
    },
    // #522 Blitzle
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 60,
            defense: 32,
            special_attack: 50,
            special_defense: 32,
            speed: 76,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [22, 153, 116],
    },
    // #523 Zebstrika
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 100,
            defense: 63,
            special_attack: 80,
            special_defense: 63,
            speed: 116,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [22, 153, 116],
    },
    // #524 Roggenrola
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 75,
            defense: 85,
            special_attack: 25,
            special_defense: 25,
            speed: 15,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 0, 43],
    },
    // #525 Boldore
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 105,
            defense: 105,
            special_attack: 50,
            special_defense: 40,
            speed: 20,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 0, 43],
    },
    // #526 Gigalith
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 135,
            defense: 130,
            special_attack: 60,
            special_defense: 70,
            speed: 25,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 0, 43],
    },
    // #527 Woobat
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 45,
            defense: 43,
            special_attack: 55,
            special_defense: 43,
            speed: 72,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [31, 150, 139],
    },
    // #528 Swoobat
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 67,
            attack: 57,
            defense: 55,
            special_attack: 77,
            special_defense: 55,
            speed: 114,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [31, 150, 139],
    },
    // #529 Drilbur
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 85,
            defense: 40,
            special_attack: 30,
            special_defense: 45,
            speed: 68,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [24, 43, 97],
    },
    // #530 Excadrill
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 110,
            attack: 135,
            defense: 60,
            special_attack: 50,
            special_defense: 65,
            speed: 88,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [24, 43, 97],
    },
    // #531 Audino
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 103,
            attack: 60,
            defense: 86,
            special_attack: 60,
            special_defense: 86,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [91, 65, 150],
    },
    // #532 Timburr
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 80,
            defense: 55,
            special_attack: 25,
            special_defense: 35,
            speed: 35,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [17, 27, 88],
    },
    // #533 Gurdurr
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 105,
            defense: 85,
            special_attack: 40,
            special_defense: 50,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [17, 27, 88],
    },
    // #534 Conkeldurr
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 105,
            attack: 140,
            defense: 95,
            special_attack: 55,
            special_defense: 65,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [17, 27, 88],
    },
    // #535 Tympole
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 50,
            defense: 40,
            special_attack: 50,
            special_defense: 40,
            speed: 64,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 70, 53],
    },
    // #536 Palpitoad
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 65,
            defense: 55,
            special_attack: 65,
            special_defense: 55,
            speed: 69,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 70, 53],
    },
    // #537 Seismitoad
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 105,
            attack: 85,
            defense: 75,
            special_attack: 85,
            special_defense: 75,
            speed: 74,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [48, 73, 53],
    },
    // #538 Throh
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 120,
            attack: 100,
            defense: 85,
            special_attack: 30,
            special_defense: 85,
            speed: 45,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [17, 35, 97],
    },
    // #539 Sawk
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 125,
            defense: 75,
            special_attack: 30,
            special_defense: 75,
            speed: 85,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [61, 35, 97],
    },
    // #540 Sewaddle
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 53,
            defense: 70,
            special_attack: 40,
            special_defense: 60,
            speed: 42,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 2, 76],
    },
    // #541 Swadloon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 63,
            defense: 90,
            special_attack: 50,
            special_defense: 80,
            speed: 42,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [92, 2, 76],
    },
    // #542 Leavanny
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 103,
            defense: 80,
            special_attack: 70,
            special_defense: 70,
            speed: 92,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 2, 76],
    },
    // #543 Venipede
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 30,
            attack: 45,
            defense: 59,
            special_attack: 30,
            special_defense: 39,
            speed: 57,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [25, 12, 104],
    },
    // #544 Whirlipede
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 55,
            defense: 99,
            special_attack: 40,
            special_defense: 79,
            speed: 47,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [25, 12, 104],
    },
    // #545 Scolipede
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 90,
            defense: 89,
            special_attack: 55,
            special_defense: 69,
            speed: 112,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [25, 12, 104],
    },
    // #546 Cottonee
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 27,
            defense: 60,
            special_attack: 37,
            special_defense: 50,
            speed: 66,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [119, 36, 2],
    },
    // #547 Whimsicott
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 67,
            defense: 85,
            special_attack: 77,
            special_defense: 75,
            speed: 116,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [119, 36, 2],
    },
    // #548 Petilil
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 35,
            defense: 50,
            special_attack: 70,
            special_defense: 50,
            speed: 30,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [2, 64, 92],
    },
    // #549 Lilligant
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 60,
            defense: 75,
            special_attack: 110,
            special_defense: 75,
            speed: 90,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [2, 64, 92],
    },
    // #550 Basculin
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 92,
            defense: 65,
            special_attack: 80,
            special_defense: 55,
            speed: 98,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [86, 101, 97],
    },
    // #551 Sandile
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 72,
            defense: 35,
            special_attack: 35,
            special_defense: 35,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 98, 50],
    },
    // #552 Krokorok
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 82,
            defense: 45,
            special_attack: 45,
            special_defense: 45,
            speed: 74,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 98, 50],
    },
    // #553 Krookodile
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 117,
            defense: 70,
            special_attack: 65,
            special_defense: 70,
            speed: 92,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 98, 50],
    },
    // #554 Darumaka
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 90,
            defense: 45,
            special_attack: 15,
            special_defense: 45,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [18, 0, 35],
    },
    // #555 Darmanitan
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 105,
            attack: 140,
            defense: 55,
            special_attack: 30,
            special_defense: 55,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [27, 0, 158],
    },
    // #556 Maractus
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 86,
            defense: 67,
            special_attack: 106,
            special_defense: 67,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [53, 2, 143],
    },
    // #557 Dwebble
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 65,
            defense: 85,
            special_attack: 35,
            special_defense: 35,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 74, 78],
    },
    // #558 Crustle
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 95,
            defense: 125,
            special_attack: 65,
            special_defense: 75,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 74, 78],
    },
    // #559 Scraggy
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 75,
            defense: 70,
            special_attack: 35,
            special_defense: 70,
            speed: 48,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [9, 98, 19],
    },
    // #560 Scrafty
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 90,
            defense: 115,
            special_attack: 45,
            special_defense: 115,
            speed: 58,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [9, 98, 19],
    },
    // #561 Sigilyph
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 72,
            attack: 58,
            defense: 80,
            special_attack: 103,
            special_defense: 80,
            speed: 97,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [41, 29, 11],
    },
    // #562 Yamask
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 38,
            attack: 30,
            defense: 85,
            special_attack: 55,
            special_defense: 65,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [159, 0, 0],
    },
    // #563 Cofagrigus
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 58,
            attack: 50,
            defense: 145,
            special_attack: 95,
            special_defense: 105,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [159, 0, 0],
    },
    // #564 Tirtouga
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 54,
            attack: 78,
            defense: 103,
            special_attack: 53,
            special_defense: 45,
            speed: 22,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [140, 61, 48],
    },
    // #565 Carracosta
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 74,
            attack: 108,
            defense: 133,
            special_attack: 83,
            special_defense: 65,
            speed: 32,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [140, 61, 48],
    },
    // #566 Archen
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 112,
            defense: 45,
            special_attack: 74,
            special_defense: 45,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [160, 0, 0],
    },
    // #567 Archeops
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 140,
            defense: 65,
            special_attack: 112,
            special_defense: 65,
            speed: 110,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [160, 0, 0],
    },
    // #568 Trubbish
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 50,
            defense: 62,
            special_attack: 40,
            special_defense: 62,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [37, 72, 83],
    },
    // #569 Garbodor
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 95,
            defense: 82,
            special_attack: 60,
            special_defense: 82,
            speed: 75,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [37, 78, 83],
    },
    // #570 Zorua
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 65,
            defense: 40,
            special_attack: 80,
            special_defense: 40,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [161, 0, 0],
    },
    // #571 Zoroark
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 105,
            defense: 60,
            special_attack: 120,
            special_defense: 60,
            speed: 105,
        },
        gender_ratio: GenderRatio::F1M7,
        ability_ids: [161, 0, 0],
    },
    // #572 Minccino
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 50,
            defense: 40,
            special_attack: 40,
            special_defense: 40,
            speed: 75,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [28, 45, 75],
    },
    // #573 Cinccino
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 95,
            defense: 60,
            special_attack: 65,
            special_defense: 60,
            speed: 115,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [28, 45, 75],
    },
    // #574 Gothita
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 30,
            defense: 50,
            special_attack: 55,
            special_defense: 65,
            speed: 45,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [34, 0, 120],
    },
    // #575 Gothorita
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 45,
            defense: 70,
            special_attack: 75,
            special_defense: 85,
            speed: 55,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [34, 0, 120],
    },
    // #576 Gothitelle
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 55,
            defense: 95,
            special_attack: 95,
            special_defense: 110,
            speed: 65,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [34, 0, 120],
    },
    // #577 Solosis
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 30,
            defense: 40,
            special_attack: 105,
            special_defense: 50,
            speed: 20,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [76, 29, 65],
    },
    // #578 Duosion
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 40,
            defense: 50,
            special_attack: 125,
            special_defense: 60,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [76, 29, 65],
    },
    // #579 Reuniclus
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 110,
            attack: 65,
            defense: 75,
            special_attack: 125,
            special_defense: 85,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [76, 29, 65],
    },
    // #580 Ducklett
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 62,
            attack: 44,
            defense: 50,
            special_attack: 44,
            special_defense: 50,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 16, 70],
    },
    // #581 Swanna
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 87,
            defense: 63,
            special_attack: 87,
            special_defense: 63,
            speed: 98,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 16, 70],
    },
    // #582 Vanillite
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 36,
            attack: 50,
            defense: 50,
            special_attack: 65,
            special_defense: 60,
            speed: 44,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [71, 0, 78],
    },
    // #583 Vanillish
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 51,
            attack: 65,
            defense: 65,
            special_attack: 80,
            special_defense: 75,
            speed: 59,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [71, 0, 78],
    },
    // #584 Vanilluxe
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 71,
            attack: 95,
            defense: 85,
            special_attack: 110,
            special_defense: 95,
            speed: 79,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [71, 0, 78],
    },
    // #585 Deerling
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 60,
            defense: 50,
            special_attack: 40,
            special_defense: 50,
            speed: 75,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 116, 90],
    },
    // #586 Sawsbuck
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 100,
            defense: 70,
            special_attack: 60,
            special_defense: 70,
            speed: 95,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 116, 90],
    },
    // #587 Emolga
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 75,
            defense: 60,
            special_attack: 75,
            special_defense: 60,
            speed: 103,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [21, 0, 153],
    },
    // #588 Karrablast
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 75,
            defense: 45,
            special_attack: 40,
            special_defense: 45,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 9, 55],
    },
    // #589 Escavalier
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 135,
            defense: 105,
            special_attack: 60,
            special_defense: 105,
            speed: 20,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 74, 76],
    },
    // #590 Foongus
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 69,
            attack: 55,
            defense: 45,
            special_attack: 55,
            special_defense: 55,
            speed: 15,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [38, 0, 65],
    },
    // #591 Amoonguss
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 114,
            attack: 85,
            defense: 70,
            special_attack: 85,
            special_defense: 80,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [38, 0, 65],
    },
    // #592 Frillish
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 40,
            defense: 50,
            special_attack: 65,
            special_defense: 85,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [53, 146, 40],
    },
    // #593 Jellicent
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 60,
            defense: 70,
            special_attack: 85,
            special_defense: 105,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [53, 146, 40],
    },
    // #594 Alomomola
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 165,
            attack: 75,
            defense: 80,
            special_attack: 40,
            special_defense: 45,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [91, 70, 65],
    },
    // #595 Joltik
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 47,
            defense: 50,
            special_attack: 57,
            special_defense: 50,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [10, 20, 12],
    },
    // #596 Galvantula
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 77,
            defense: 60,
            special_attack: 97,
            special_defense: 60,
            speed: 108,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [10, 20, 12],
    },
    // #597 Ferroseed
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 44,
            attack: 50,
            defense: 91,
            special_attack: 24,
            special_defense: 86,
            speed: 10,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [162, 0, 0],
    },
    // #598 Ferrothorn
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 74,
            attack: 94,
            defense: 131,
            special_attack: 54,
            special_defense: 116,
            speed: 20,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [162, 0, 0],
    },
    // #599 Klink
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 40,
            attack: 55,
            defense: 70,
            special_attack: 45,
            special_defense: 60,
            speed: 30,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [114, 137, 58],
    },
    // #600 Klang
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 80,
            defense: 95,
            special_attack: 70,
            special_defense: 85,
            speed: 50,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [114, 137, 58],
    },
    // #601 Klinklang
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 100,
            defense: 115,
            special_attack: 70,
            special_defense: 85,
            speed: 90,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [114, 137, 58],
    },
    // #602 Tynamo
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 55,
            defense: 40,
            special_attack: 45,
            special_defense: 40,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 0],
    },
    // #603 Eelektrik
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 85,
            defense: 70,
            special_attack: 75,
            special_defense: 70,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 0],
    },
    // #604 Eelektross
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 115,
            defense: 80,
            special_attack: 105,
            special_defense: 80,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 0],
    },
    // #605 Elgyem
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 55,
            defense: 55,
            special_attack: 85,
            special_defense: 55,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [121, 54, 67],
    },
    // #606 Beheeyem
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 75,
            defense: 75,
            special_attack: 125,
            special_defense: 95,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [121, 54, 67],
    },
    // #607 Litwick
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 30,
            defense: 55,
            special_attack: 65,
            special_defense: 55,
            speed: 20,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [32, 62, 120],
    },
    // #608 Lampent
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 40,
            defense: 60,
            special_attack: 95,
            special_defense: 60,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [32, 62, 120],
    },
    // #609 Chandelure
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 55,
            defense: 90,
            special_attack: 145,
            special_defense: 90,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [32, 62, 120],
    },
    // #610 Axew
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 46,
            attack: 87,
            defense: 60,
            special_attack: 30,
            special_defense: 40,
            speed: 57,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [26, 97, 20],
    },
    // #611 Fraxure
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 66,
            attack: 117,
            defense: 70,
            special_attack: 40,
            special_defense: 50,
            speed: 67,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [26, 97, 20],
    },
    // #612 Haxorus
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 76,
            attack: 147,
            defense: 90,
            special_attack: 60,
            special_defense: 70,
            speed: 97,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [26, 97, 20],
    },
    // #613 Cubchoo
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 70,
            defense: 40,
            special_attack: 60,
            special_defense: 40,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [109, 0, 99],
    },
    // #614 Beartic
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 110,
            defense: 80,
            special_attack: 70,
            special_defense: 80,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [109, 0, 48],
    },
    // #615 Cryogonal
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 30,
            defense: 50,
            special_attack: 95,
            special_defense: 135,
            speed: 105,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [77, 0, 0],
    },
    // #616 Shelmet
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 50,
            attack: 40,
            defense: 85,
            special_attack: 40,
            special_defense: 65,
            speed: 25,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [70, 74, 76],
    },
    // #617 Accelgor
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 70,
            defense: 40,
            special_attack: 100,
            special_defense: 60,
            speed: 145,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [70, 72, 87],
    },
    // #618 Stunfisk
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 109,
            attack: 66,
            defense: 84,
            special_attack: 81,
            special_defense: 99,
            speed: 32,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [21, 46, 23],
    },
    // #619 Mienfoo
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 85,
            defense: 50,
            special_attack: 55,
            special_defense: 50,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [35, 65, 86],
    },
    // #620 Mienshao
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 125,
            defense: 60,
            special_attack: 95,
            special_defense: 60,
            speed: 105,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [35, 65, 86],
    },
    // #621 Druddigon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 77,
            attack: 120,
            defense: 90,
            special_attack: 60,
            special_defense: 90,
            speed: 48,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [138, 27, 97],
    },
    // #622 Golett
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 59,
            attack: 74,
            defense: 50,
            special_attack: 35,
            special_defense: 50,
            speed: 35,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [88, 150, 55],
    },
    // #623 Golurk
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 89,
            attack: 124,
            defense: 80,
            special_attack: 55,
            special_defense: 80,
            speed: 55,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [88, 150, 55],
    },
    // #624 Pawniard
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 45,
            attack: 85,
            defense: 70,
            special_attack: 40,
            special_defense: 40,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [51, 35, 107],
    },
    // #625 Bisharp
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 125,
            defense: 100,
            special_attack: 60,
            special_defense: 70,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [51, 35, 107],
    },
    // #626 Bouffalant
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 110,
            defense: 95,
            special_attack: 40,
            special_defense: 95,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [86, 116, 82],
    },
    // #627 Rufflet
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 83,
            defense: 50,
            special_attack: 37,
            special_defense: 50,
            speed: 60,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [14, 27, 18],
    },
    // #628 Braviary
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 123,
            defense: 75,
            special_attack: 57,
            special_defense: 75,
            speed: 80,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [14, 27, 51],
    },
    // #629 Vullaby
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 55,
            defense: 75,
            special_attack: 45,
            special_defense: 65,
            speed: 60,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [16, 76, 78],
    },
    // #630 Mandibuzz
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 110,
            attack: 65,
            defense: 105,
            special_attack: 55,
            special_defense: 95,
            speed: 80,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [16, 76, 78],
    },
    // #631 Heatmor
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 97,
            defense: 66,
            special_attack: 105,
            special_defense: 66,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [57, 32, 141],
    },
    // #632 Durant
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 58,
            attack: 109,
            defense: 112,
            special_attack: 48,
            special_defense: 48,
            speed: 109,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 18, 131],
    },
    // #633 Deino
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 52,
            attack: 65,
            defense: 50,
            special_attack: 45,
            special_defense: 50,
            speed: 38,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [18, 0, 0],
    },
    // #634 Zweilous
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 72,
            attack: 85,
            defense: 70,
            special_attack: 65,
            special_defense: 70,
            speed: 58,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [18, 0, 0],
    },
    // #635 Hydreigon
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 92,
            attack: 105,
            defense: 90,
            special_attack: 125,
            special_defense: 90,
            speed: 98,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [77, 0, 0],
    },
    // #636 Larvesta
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 85,
            defense: 55,
            special_attack: 50,
            special_defense: 55,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [62, 0, 12],
    },
    // #637 Volcarona
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 60,
            defense: 65,
            special_attack: 135,
            special_defense: 105,
            speed: 100,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [62, 0, 12],
    },
    // #638 Cobalion
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 91,
            attack: 90,
            defense: 129,
            special_attack: 90,
            special_defense: 72,
            speed: 108,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [52, 0, 0],
    },
    // #639 Terrakion
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 91,
            attack: 129,
            defense: 90,
            special_attack: 72,
            special_defense: 90,
            speed: 108,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [52, 0, 0],
    },
    // #640 Virizion
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 91,
            attack: 90,
            defense: 72,
            special_attack: 90,
            special_defense: 129,
            speed: 108,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [52, 0, 0],
    },
    // #641 Tornadus
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 79,
            attack: 115,
            defense: 70,
            special_attack: 125,
            special_defense: 80,
            speed: 111,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [119, 0, 51],
    },
    // #642 Thundurus
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 79,
            attack: 115,
            defense: 70,
            special_attack: 125,
            special_defense: 80,
            speed: 111,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [119, 0, 51],
    },
    // #643 Reshiram
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 120,
            defense: 100,
            special_attack: 150,
            special_defense: 120,
            speed: 90,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [163, 0, 0],
    },
    // #644 Zekrom
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 150,
            defense: 120,
            special_attack: 120,
            special_defense: 100,
            speed: 90,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [164, 0, 0],
    },
    // #645 Landorus
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 89,
            attack: 125,
            defense: 90,
            special_attack: 115,
            special_defense: 80,
            speed: 101,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [43, 0, 27],
    },
    // #646 Kyurem
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 125,
            attack: 130,
            defense: 90,
            special_attack: 130,
            special_defense: 90,
            speed: 95,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [107, 0, 0],
    },
    // #647 Keldeo
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 91,
            attack: 72,
            defense: 90,
            special_attack: 129,
            special_defense: 90,
            speed: 108,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [52, 0, 0],
    },
    // #648 Meloetta
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 77,
            defense: 77,
            special_attack: 128,
            special_defense: 128,
            speed: 90,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [90, 0, 0],
    },
    // #649 Genesect
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 71,
            attack: 120,
            defense: 95,
            special_attack: 120,
            special_defense: 95,
            speed: 99,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [106, 0, 0],
    },
];

/// 種族エントリを取得
///
/// # Arguments
/// * `species_id` - 全国図鑑番号 (1-649)
///
/// # Returns
/// 種族エントリへの参照。範囲外の場合はインデックス0 (フシギダネ) を返す。
#[inline]
pub fn get_species_entry(species_id: u16) -> &'static SpeciesEntry {
    let index = if species_id == 0 || species_id > 649 {
        0
    } else {
        (species_id - 1) as usize
    };
    &SPECIES_TABLE[index]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_species_entry_bulbasaur() {
        let entry = get_species_entry(1);
        assert_eq!(entry.base_stats.hp, 45);
        assert_eq!(entry.base_stats.attack, 49);
        assert_eq!(entry.base_stats.speed, 45);
    }

    #[test]
    fn test_get_species_entry_pikachu() {
        let entry = get_species_entry(25);
        assert_eq!(entry.base_stats.hp, 35);
        assert_eq!(entry.base_stats.attack, 55);
        assert_eq!(entry.base_stats.speed, 90);
    }

    #[test]
    fn test_get_species_entry_gen5_corrected_base_stats() {
        assert_eq!(get_species_entry(526).base_stats.special_defense, 70);
        assert_eq!(get_species_entry(25).base_stats.defense, 30);
        assert_eq!(get_species_entry(488).base_stats.defense, 120);
        assert_eq!(get_species_entry(488).base_stats.special_defense, 130);
    }

    #[test]
    fn test_get_species_entry_out_of_range() {
        // 0 と 650 はインデックス0にフォールバック
        let entry0 = get_species_entry(0);
        let entry650 = get_species_entry(650);
        let entry1 = get_species_entry(1);
        assert_eq!(entry0.base_stats.hp, entry1.base_stats.hp);
        assert_eq!(entry650.base_stats.hp, entry1.base_stats.hp);
    }
}
