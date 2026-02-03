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
            special_attack: 90,
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
            attack: 90,
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
            speed: 101,
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
            attack: 95,
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
            defense: 40,
            special_attack: 50,
            special_defense: 50,
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
            speed: 110,
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
            attack: 92,
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
            attack: 102,
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
            special_attack: 95,
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
        ability_ids: [28, 34, 30],
    },
    // #040 Wigglytuff
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 140,
            attack: 70,
            defense: 45,
            special_attack: 85,
            special_defense: 50,
            speed: 45,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [28, 34, 35],
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
        ability_ids: [36, 0, 37],
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
        ability_ids: [36, 0, 37],
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
        ability_ids: [2, 0, 38],
    },
    // #045 Vileplume
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 80,
            defense: 85,
            special_attack: 110,
            special_defense: 90,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 0, 39],
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
        ability_ids: [39, 40, 41],
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
        ability_ids: [39, 40, 41],
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
        ability_ids: [7, 11, 42],
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
        ability_ids: [23, 43, 44],
    },
    // #051 Dugtrio
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 35,
            attack: 100,
            defense: 50,
            special_attack: 50,
            special_defense: 70,
            speed: 120,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [23, 43, 44],
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
        ability_ids: [45, 46, 20],
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
        ability_ids: [47, 46, 20],
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
        ability_ids: [41, 48, 49],
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
        ability_ids: [41, 48, 49],
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
        ability_ids: [50, 51, 52],
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
        ability_ids: [50, 51, 52],
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
        ability_ids: [19, 32, 53],
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
        ability_ids: [19, 32, 53],
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
        ability_ids: [54, 41, 49],
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
        ability_ids: [54, 41, 49],
    },
    // #062 Poliwrath
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 95,
            defense: 95,
            special_attack: 70,
            special_defense: 90,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [54, 41, 49],
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
        ability_ids: [55, 36, 29],
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
        ability_ids: [55, 36, 29],
    },
    // #065 Alakazam
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 55,
            attack: 50,
            defense: 45,
            special_attack: 135,
            special_defense: 95,
            speed: 120,
        },
        gender_ratio: GenderRatio::F1M3,
        ability_ids: [55, 36, 29],
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
        ability_ids: [17, 56, 57],
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
        ability_ids: [17, 56, 57],
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
        ability_ids: [17, 56, 57],
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
        ability_ids: [2, 0, 58],
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
        ability_ids: [2, 0, 58],
    },
    // #071 Victreebel
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 105,
            defense: 65,
            special_attack: 100,
            special_defense: 70,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 0, 58],
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
        ability_ids: [59, 60, 6],
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
        ability_ids: [59, 60, 6],
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
        ability_ids: [61, 62, 23],
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
        ability_ids: [61, 62, 23],
    },
    // #076 Golem
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 120,
            defense: 130,
            special_attack: 55,
            special_defense: 65,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [61, 62, 23],
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
        ability_ids: [8, 32, 63],
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
        ability_ids: [8, 32, 63],
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
        ability_ids: [64, 65, 66],
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
        ability_ids: [64, 65, 66],
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
        ability_ids: [67, 62, 68],
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
        ability_ids: [67, 62, 68],
    },
    // #083 Farfetch’d
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 52,
            attack: 90,
            defense: 55,
            special_attack: 58,
            special_defense: 62,
            speed: 60,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 36, 52],
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
        ability_ids: [8, 69, 15],
    },
    // #085 Dodrio
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 110,
            defense: 70,
            special_attack: 60,
            special_defense: 60,
            speed: 110,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [8, 69, 15],
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
        ability_ids: [70, 71, 72],
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
        ability_ids: [70, 71, 72],
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
        ability_ids: [38, 73, 74],
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
        ability_ids: [38, 73, 74],
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
        ability_ids: [75, 76, 77],
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
        ability_ids: [75, 76, 77],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [79, 0, 0],
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
        ability_ids: [61, 62, 80],
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
        ability_ids: [81, 82, 36],
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
        ability_ids: [81, 82, 36],
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
        ability_ids: [83, 75, 27],
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
        ability_ids: [83, 75, 27],
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
        ability_ids: [84, 21, 85],
    },
    // #101 Electrode
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 50,
            defense: 70,
            special_attack: 80,
            special_defense: 80,
            speed: 150,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [84, 21, 85],
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
        ability_ids: [2, 0, 86],
    },
    // #103 Exeggutor
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 95,
            defense: 85,
            special_attack: 125,
            special_defense: 75,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 0, 86],
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
        ability_ids: [61, 22, 87],
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
        ability_ids: [61, 22, 87],
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
        ability_ids: [47, 88, 89],
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
        ability_ids: [14, 90, 36],
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
        ability_ids: [65, 64, 48],
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
        ability_ids: [78, 91, 38],
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
        ability_ids: [78, 91, 38],
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
        ability_ids: [22, 61, 88],
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
        ability_ids: [22, 61, 88],
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
        ability_ids: [92, 93, 94],
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
        ability_ids: [2, 95, 66],
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
        ability_ids: [69, 96, 36],
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
        ability_ids: [49, 13, 41],
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
        ability_ids: [25, 13, 41],
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
        ability_ids: [49, 97, 22],
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
        ability_ids: [49, 97, 22],
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
        ability_ids: [98, 92, 68],
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
        ability_ids: [98, 92, 68],
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
        ability_ids: [84, 99, 46],
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
        ability_ids: [12, 46, 57],
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
        ability_ids: [64, 82, 40],
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
        ability_ids: [21, 0, 50],
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
        ability_ids: [63, 0, 50],
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
        ability_ids: [83, 100, 101],
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
        ability_ids: [19, 51, 27],
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
        ability_ids: [49, 0, 102],
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
        ability_ids: [19, 0, 101],
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
        ability_ids: [54, 75, 71],
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
        ability_ids: [47, 0, 103],
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
        ability_ids: [8, 104, 105],
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
        ability_ids: [54, 0, 71],
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
        ability_ids: [106, 0, 107],
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
        ability_ids: [108, 109, 68],
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
        ability_ids: [49, 75, 80],
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
        ability_ids: [49, 75, 80],
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
        ability_ids: [49, 87, 80],
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
        ability_ids: [49, 87, 80],
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
        ability_ids: [61, 110, 20],
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
        ability_ids: [111, 70, 58],
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
        ability_ids: [110, 0, 112],
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
        ability_ids: [110, 0, 21],
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
        ability_ids: [110, 0, 63],
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
        ability_ids: [9, 0, 113],
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
        ability_ids: [9, 0, 113],
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
        ability_ids: [36, 0, 114],
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
        ability_ids: [110, 0, 20],
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
        ability_ids: [55, 0, 0],
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
        ability_ids: [1, 0, 95],
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
        ability_ids: [1, 0, 95],
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
        ability_ids: [1, 0, 95],
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
        ability_ids: [8, 14, 35],
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
        ability_ids: [8, 14, 35],
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
        ability_ids: [81, 14, 11],
    },
    // #164 Noctowl
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 50,
            defense: 50,
            special_attack: 86,
            special_defense: 96,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [81, 14, 11],
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
        ability_ids: [12, 69, 102],
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
        ability_ids: [12, 69, 90],
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
        ability_ids: [12, 81, 13],
    },
    // #168 Ariados
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 90,
            defense: 70,
            special_attack: 60,
            special_defense: 70,
            speed: 40,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 81, 13],
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
        ability_ids: [36, 0, 37],
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
        ability_ids: [106, 98, 54],
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
        ability_ids: [106, 98, 54],
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
        ability_ids: [28, 34, 30],
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
        ability_ids: [18, 93, 115],
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
        ability_ids: [18, 93, 115],
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
        ability_ids: [55, 69, 116],
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
        ability_ids: [55, 69, 116],
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
        ability_ids: [21, 0, 117],
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
        ability_ids: [21, 0, 117],
    },
    // #181 Ampharos
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 75,
            defense: 85,
            special_attack: 115,
            special_defense: 90,
            speed: 55,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [21, 0, 117],
    },
    // #182 Bellossom
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 80,
            defense: 95,
            special_attack: 90,
            special_defense: 100,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 0, 94],
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
        ability_ids: [70, 118, 119],
    },
    // #184 Azumarill
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 100,
            attack: 50,
            defense: 80,
            special_attack: 60,
            special_defense: 80,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [70, 118, 119],
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
        ability_ids: [62, 61, 102],
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
        ability_ids: [54, 41, 120],
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
        ability_ids: [2, 95, 37],
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
        ability_ids: [2, 95, 37],
    },
    // #189 Jumpluff
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 55,
            defense: 70,
            special_attack: 55,
            special_defense: 95,
            speed: 110,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [2, 95, 37],
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
        ability_ids: [8, 45, 76],
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
        ability_ids: [2, 4, 69],
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
        ability_ids: [2, 4, 69],
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
        ability_ids: [121, 10, 35],
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
        ability_ids: [41, 54, 31],
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
        ability_ids: [41, 54, 31],
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
        ability_ids: [55, 0, 116],
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
        ability_ids: [55, 0, 36],
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
        ability_ids: [81, 115, 122],
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
        ability_ids: [64, 65, 66],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [123, 0, 124],
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
        ability_ids: [36, 69, 119],
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
        ability_ids: [62, 0, 77],
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
        ability_ids: [62, 0, 77],
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
        ability_ids: [93, 8, 102],
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
        ability_ids: [83, 23, 111],
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
        ability_ids: [61, 62, 27],
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
        ability_ids: [19, 8, 102],
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
        ability_ids: [19, 107, 102],
    },
    // #211 Qwilfish
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 95,
            defense: 85,
            special_attack: 55,
            special_defense: 55,
            speed: 85,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [25, 49, 19],
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
        ability_ids: [12, 46, 125],
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
        ability_ids: [62, 58, 126],
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
        ability_ids: [12, 17, 101],
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
        ability_ids: [36, 14, 127],
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
        ability_ids: [45, 107, 128],
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
        ability_ids: [17, 107, 20],
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
        ability_ids: [129, 63, 80],
    },
    // #219 Magcargo
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 50,
            defense: 120,
            special_attack: 90,
            special_defense: 80,
            speed: 30,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [129, 63, 80],
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
        ability_ids: [64, 112, 70],
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
        ability_ids: [64, 112, 70],
    },
    // #222 Corsola
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 55,
            defense: 95,
            special_attack: 65,
            special_defense: 95,
            speed: 35,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [18, 92, 66],
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
        ability_ids: [18, 13, 130],
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
        ability_ids: [131, 13, 130],
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
        ability_ids: [50, 18, 81],
    },
    // #226 Mantine
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 40,
            defense: 70,
            special_attack: 80,
            special_defense: 140,
            speed: 70,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [49, 54, 97],
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
        ability_ids: [14, 62, 80],
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
        ability_ids: [69, 32, 20],
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
        ability_ids: [69, 32, 20],
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
        ability_ids: [49, 13, 41],
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
        ability_ids: [45, 0, 23],
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
        ability_ids: [62, 0, 23],
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
        ability_ids: [108, 109, 68],
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
        ability_ids: [19, 35, 119],
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
        ability_ids: [65, 46, 130],
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
        ability_ids: [17, 57, 50],
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
        ability_ids: [19, 46, 57],
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
        ability_ids: [64, 82, 71],
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
        ability_ids: [21, 0, 50],
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
        ability_ids: [63, 0, 50],
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
        ability_ids: [70, 96, 119],
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
        ability_ids: [92, 93, 94],
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
        ability_ids: [110, 0, 36],
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
        ability_ids: [110, 0, 36],
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
        ability_ids: [110, 0, 36],
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
        ability_ids: [132, 0, 20],
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
        ability_ids: [110, 0, 114],
    },
    // #250 Ho Oh
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
        ability_ids: [110, 0, 66],
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
        ability_ids: [92, 0, 0],
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
        ability_ids: [1, 0, 89],
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
        ability_ids: [1, 0, 89],
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
        ability_ids: [1, 0, 89],
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
        ability_ids: [3, 0, 121],
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
        ability_ids: [3, 0, 121],
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
        ability_ids: [3, 0, 121],
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
        ability_ids: [5, 0, 41],
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
        ability_ids: [5, 0, 41],
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
        ability_ids: [5, 0, 41],
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
        ability_ids: [8, 107, 102],
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
        ability_ids: [19, 107, 101],
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
        ability_ids: [45, 58, 107],
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
        ability_ids: [45, 58, 107],
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
            special_attack: 100,
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
        ability_ids: [49, 6, 65],
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
        ability_ids: [49, 6, 65],
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
        ability_ids: [49, 6, 65],
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
        ability_ids: [2, 69, 127],
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
        ability_ids: [2, 69, 127],
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
        ability_ids: [2, 133, 127],
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
        ability_ids: [17, 0, 96],
    },
    // #277 Swellow
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 85,
            defense: 60,
            special_attack: 75,
            special_defense: 50,
            speed: 125,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [17, 0, 96],
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
        ability_ids: [14, 71, 6],
    },
    // #279 Pelipper
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 50,
            defense: 100,
            special_attack: 95,
            special_defense: 70,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [14, 120, 6],
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
        ability_ids: [55, 108, 124],
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
        ability_ids: [55, 108, 124],
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
        ability_ids: [55, 108, 124],
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
        ability_ids: [49, 0, 6],
    },
    // #284 Masquerain
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 60,
            defense: 62,
            special_attack: 100,
            special_defense: 82,
            speed: 80,
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
        ability_ids: [39, 134, 107],
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
        ability_ids: [39, 134, 46],
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
        ability_ids: [135, 0, 0],
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
        ability_ids: [50, 0, 0],
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
        ability_ids: [135, 0, 0],
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
        ability_ids: [121, 0, 37],
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
        ability_ids: [136, 0, 0],
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
        ability_ids: [84, 0, 102],
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
        ability_ids: [84, 0, 96],
    },
    // #295 Exploud
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 104,
            attack: 91,
            defense: 63,
            special_attack: 91,
            special_defense: 73,
            speed: 68,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [84, 0, 96],
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
        ability_ids: [70, 17, 27],
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
        ability_ids: [70, 17, 27],
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
        ability_ids: [70, 118, 119],
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
        ability_ids: [62, 67, 44],
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
        ability_ids: [28, 137, 42],
    },
    // #301 Delcatty
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 65,
            defense: 65,
            special_attack: 55,
            special_defense: 55,
            speed: 90,
        },
        gender_ratio: GenderRatio::F3M1,
        ability_ids: [28, 137, 42],
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
        ability_ids: [14, 138, 122],
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
        ability_ids: [83, 19, 27],
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
        ability_ids: [62, 61, 139],
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
        ability_ids: [62, 61, 139],
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
        ability_ids: [62, 61, 139],
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
        ability_ids: [140, 0, 124],
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
        ability_ids: [140, 0, 124],
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
        ability_ids: [21, 22, 141],
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
        ability_ids: [21, 22, 141],
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
        ability_ids: [117, 0, 22],
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
        ability_ids: [141, 0, 106],
    },
    // #313 Volbeat
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 73,
            defense: 75,
            special_attack: 47,
            special_defense: 85,
            speed: 85,
        },
        gender_ratio: GenderRatio::MaleOnly,
        ability_ids: [98, 12, 122],
    },
    // #314 Illumise
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 47,
            defense: 75,
            special_attack: 73,
            special_defense: 85,
            speed: 85,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [64, 11, 122],
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
        ability_ids: [92, 25, 95],
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
        ability_ids: [60, 73, 58],
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
        ability_ids: [60, 73, 58],
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
        ability_ids: [142, 0, 121],
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
        ability_ids: [142, 0, 121],
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
        ability_ids: [97, 64, 110],
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
        ability_ids: [97, 64, 110],
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
        ability_ids: [64, 143, 65],
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
        ability_ids: [129, 144, 51],
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
        ability_ids: [145, 33, 75],
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
        ability_ids: [70, 65, 58],
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
        ability_ids: [70, 65, 58],
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
        ability_ids: [65, 15, 126],
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
        ability_ids: [83, 43, 27],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [23, 0, 54],
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
        ability_ids: [23, 0, 54],
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
        ability_ids: [92, 0, 48],
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
        ability_ids: [92, 0, 48],
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
        ability_ids: [111, 0, 146],
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
        ability_ids: [9, 0, 37],
    },
    // #337 Lunatone
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 55,
            defense: 65,
            special_attack: 95,
            special_defense: 85,
            speed: 70,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [78, 0, 0],
    },
    // #338 Solrock
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 90,
            attack: 95,
            defense: 85,
            special_attack: 55,
            special_defense: 65,
            speed: 70,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [78, 0, 0],
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
        ability_ids: [64, 105, 71],
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
        ability_ids: [64, 105, 71],
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
        ability_ids: [83, 75, 104],
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
        ability_ids: [83, 75, 104],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [131, 0, 147],
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
        ability_ids: [131, 0, 147],
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
        ability_ids: [87, 0, 49],
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
        ability_ids: [87, 0, 49],
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
        ability_ids: [49, 64, 104],
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
        ability_ids: [113, 34, 28],
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
        ability_ids: [148, 0, 0],
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
        ability_ids: [149, 0, 150],
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
        ability_ids: [81, 35, 79],
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
        ability_ids: [81, 35, 79],
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
        ability_ids: [78, 0, 35],
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
        ability_ids: [110, 0, 35],
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
        ability_ids: [2, 4, 86],
    },
    // #358 Chimecho
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 50,
            defense: 80,
            special_attack: 95,
            special_defense: 90,
            speed: 65,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [78, 0, 0],
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
        ability_ids: [110, 115, 53],
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
        ability_ids: [123, 0, 124],
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
        ability_ids: [36, 72, 130],
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
        ability_ids: [36, 72, 130],
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
        ability_ids: [70, 72, 64],
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
        ability_ids: [70, 72, 64],
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
        ability_ids: [70, 72, 64],
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
        ability_ids: [75, 0, 102],
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
        ability_ids: [49, 0, 97],
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
        ability_ids: [49, 0, 71],
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
        ability_ids: [49, 61, 62],
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
        ability_ids: [49, 0, 71],
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
        ability_ids: [61, 0, 27],
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
        ability_ids: [61, 0, 77],
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
        ability_ids: [19, 0, 101],
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
        ability_ids: [59, 0, 125],
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
        ability_ids: [59, 0, 125],
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
        ability_ids: [59, 0, 125],
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
        ability_ids: [59, 0, 62],
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
        ability_ids: [59, 0, 72],
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
        ability_ids: [59, 0, 125],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [120, 0, 0],
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
        ability_ids: [151, 0, 0],
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
        ability_ids: [93, 0, 0],
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
        ability_ids: [110, 0, 0],
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
        ability_ids: [1, 0, 75],
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
        ability_ids: [1, 0, 75],
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
        ability_ids: [1, 0, 75],
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
        ability_ids: [3, 0, 90],
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
        ability_ids: [3, 0, 90],
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
        ability_ids: [3, 0, 90],
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
        ability_ids: [5, 0, 34],
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
        ability_ids: [5, 0, 34],
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
        ability_ids: [5, 0, 34],
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
        ability_ids: [14, 0, 88],
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
        ability_ids: [19, 0, 88],
    },
    // #398 Staraptor
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 120,
            defense: 70,
            special_attack: 50,
            special_defense: 60,
            speed: 100,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 0, 88],
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
        ability_ids: [143, 31, 130],
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
        ability_ids: [143, 31, 130],
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
        ability_ids: [12, 0, 46],
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
        ability_ids: [92, 25, 95],
    },
    // #407 Roserade
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 70,
            defense: 65,
            special_attack: 125,
            special_defense: 105,
            speed: 90,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [92, 25, 46],
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
        ability_ids: [100, 0, 27],
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
        ability_ids: [100, 0, 27],
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
        ability_ids: [62, 0, 84],
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
        ability_ids: [62, 0, 84],
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
        ability_ids: [9, 0, 77],
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
        ability_ids: [105, 0, 77],
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
        ability_ids: [128, 0, 18],
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
        ability_ids: [110, 0, 20],
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
        ability_ids: [8, 45, 106],
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
        ability_ids: [49, 0, 97],
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
        ability_ids: [49, 0, 97],
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
        ability_ids: [152, 0, 0],
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
        ability_ids: [73, 147, 44],
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
        ability_ids: [73, 147, 44],
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
        ability_ids: [46, 45, 76],
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
        ability_ids: [85, 89, 153],
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
        ability_ids: [85, 89, 153],
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
        ability_ids: [8, 154, 47],
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
        ability_ids: [28, 154, 47],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [81, 115, 101],
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
        ability_ids: [47, 65, 14],
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
        ability_ids: [70, 65, 52],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [38, 85, 14],
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
        ability_ids: [38, 85, 14],
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
        ability_ids: [78, 155, 139],
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
        ability_ids: [78, 155, 139],
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
        ability_ids: [62, 61, 102],
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
        ability_ids: [84, 99, 46],
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
        ability_ids: [92, 93, 30],
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
        ability_ids: [110, 0, 37],
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
        ability_ids: [23, 0, 142],
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
        ability_ids: [23, 0, 142],
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
        ability_ids: [23, 0, 142],
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
        ability_ids: [45, 70, 58],
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
        ability_ids: [57, 36, 122],
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
        ability_ids: [57, 36, 53],
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
        ability_ids: [132, 0, 44],
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
        ability_ids: [132, 0, 44],
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
        ability_ids: [87, 13, 14],
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
        ability_ids: [87, 13, 14],
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
        ability_ids: [105, 40, 74],
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
        ability_ids: [105, 40, 74],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [49, 147, 97],
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
        ability_ids: [49, 147, 97],
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
        ability_ids: [49, 54, 97],
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
        ability_ids: [156, 0, 84],
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
        ability_ids: [156, 0, 84],
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
        ability_ids: [110, 0, 127],
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
        ability_ids: [67, 62, 68],
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
        ability_ids: [65, 64, 48],
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
        ability_ids: [22, 144, 88],
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
        ability_ids: [2, 95, 66],
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
        ability_ids: [157, 0, 50],
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
        ability_ids: [63, 0, 50],
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
        ability_ids: [18, 93, 115],
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
        ability_ids: [121, 11, 35],
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
        ability_ids: [95, 0, 2],
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
        ability_ids: [112, 0, 72],
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
        ability_ids: [83, 23, 134],
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
        ability_ids: [64, 112, 70],
    },
    // #474 Porygon Z
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
        ability_ids: [104, 109, 68],
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
        ability_ids: [57, 158, 53],
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
        ability_ids: [62, 67, 44],
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
        ability_ids: [110, 0, 35],
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
        ability_ids: [112, 0, 79],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [110, 0, 124],
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
        ability_ids: [110, 0, 124],
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
        ability_ids: [32, 0, 63],
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
        ability_ids: [159, 0, 0],
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
        ability_ids: [110, 0, 124],
    },
    // #488 Cresselia
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 120,
            attack: 70,
            defense: 110,
            special_attack: 75,
            special_defense: 120,
            speed: 85,
        },
        gender_ratio: GenderRatio::FemaleOnly,
        ability_ids: [78, 0, 0],
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
        ability_ids: [71, 0, 0],
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
        ability_ids: [71, 0, 0],
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
        ability_ids: [160, 0, 0],
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
        ability_ids: [92, 0, 0],
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
        ability_ids: [161, 0, 0],
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
        ability_ids: [162, 0, 0],
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
        ability_ids: [1, 0, 126],
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
        ability_ids: [1, 0, 126],
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
        ability_ids: [1, 0, 126],
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
        ability_ids: [3, 0, 70],
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
        ability_ids: [3, 0, 70],
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
        ability_ids: [3, 0, 88],
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
        ability_ids: [5, 0, 75],
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
        ability_ids: [5, 0, 75],
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
        ability_ids: [5, 0, 75],
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
        ability_ids: [8, 14, 68],
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
        ability_ids: [98, 14, 68],
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
        ability_ids: [50, 45, 8],
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
        ability_ids: [19, 24, 96],
    },
    // #508 Stoutland
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 110,
            defense: 90,
            special_attack: 45,
            special_defense: 90,
            speed: 80,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 24, 96],
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
        ability_ids: [47, 89, 122],
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
        ability_ids: [47, 89, 122],
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
        ability_ids: [58, 0, 1],
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
        ability_ids: [58, 0, 1],
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
        ability_ids: [58, 0, 3],
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
        ability_ids: [58, 0, 3],
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
        ability_ids: [58, 0, 5],
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
        ability_ids: [58, 0, 5],
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
        ability_ids: [82, 55, 124],
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
        ability_ids: [82, 55, 124],
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
        ability_ids: [16, 115, 26],
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
        ability_ids: [16, 115, 26],
    },
    // #521 Unfezant
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 115,
            defense: 80,
            special_attack: 65,
            special_defense: 55,
            speed: 93,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [16, 115, 26],
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
        ability_ids: [22, 157, 119],
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
        ability_ids: [22, 157, 119],
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
        ability_ids: [62, 80, 44],
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
        ability_ids: [62, 80, 44],
    },
    // #526 Gigalith
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 85,
            attack: 135,
            defense: 130,
            special_attack: 60,
            special_defense: 80,
            speed: 25,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [62, 132, 44],
    },
    // #527 Woobat
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 65,
            attack: 45,
            defense: 43,
            special_attack: 55,
            special_defense: 43,
            speed: 72,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [31, 154, 143],
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
        ability_ids: [31, 154, 143],
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
        ability_ids: [24, 44, 100],
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
        ability_ids: [24, 44, 100],
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
        ability_ids: [94, 66, 154],
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
        ability_ids: [17, 27, 90],
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
        ability_ids: [17, 27, 90],
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
        ability_ids: [17, 27, 90],
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
        ability_ids: [49, 71, 54],
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
        ability_ids: [49, 71, 54],
    },
    // #537 Seismitoad
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 105,
            attack: 95,
            defense: 75,
            special_attack: 85,
            special_defense: 75,
            speed: 74,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [49, 74, 54],
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
        ability_ids: [17, 36, 100],
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
        ability_ids: [62, 36, 100],
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
        ability_ids: [12, 2, 77],
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
        ability_ids: [95, 2, 77],
    },
    // #542 Leavanny
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 75,
            attack: 103,
            defense: 80,
            special_attack: 70,
            special_defense: 80,
            speed: 92,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [12, 2, 77],
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
        ability_ids: [25, 12, 121],
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
        ability_ids: [25, 12, 121],
    },
    // #545 Scolipede
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 60,
            attack: 100,
            defense: 89,
            special_attack: 55,
            special_defense: 69,
            speed: 112,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [25, 12, 121],
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
        ability_ids: [122, 37, 2],
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
        ability_ids: [122, 37, 2],
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
        ability_ids: [2, 65, 95],
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
        ability_ids: [2, 65, 95],
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
        ability_ids: [88, 104, 100],
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
        ability_ids: [19, 101, 51],
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
        ability_ids: [19, 101, 51],
    },
    // #553 Krookodile
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 117,
            defense: 80,
            special_attack: 65,
            special_defense: 70,
            speed: 92,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [19, 101, 51],
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
        ability_ids: [18, 0, 36],
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
        ability_ids: [27, 0, 163],
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
        ability_ids: [54, 2, 147],
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
        ability_ids: [62, 75, 80],
    },
    // #558 Crustle
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 70,
            attack: 105,
            defense: 125,
            special_attack: 65,
            special_defense: 75,
            speed: 45,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [62, 75, 80],
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
        ability_ids: [9, 101, 19],
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
        ability_ids: [9, 101, 19],
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
        ability_ids: [42, 29, 11],
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
        ability_ids: [164, 0, 0],
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
        ability_ids: [164, 0, 0],
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
        ability_ids: [144, 62, 49],
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
        ability_ids: [144, 62, 49],
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
        ability_ids: [165, 0, 0],
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
        ability_ids: [165, 0, 0],
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
        ability_ids: [38, 73, 85],
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
        ability_ids: [38, 80, 85],
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
        ability_ids: [166, 0, 0],
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
        ability_ids: [166, 0, 0],
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
        ability_ids: [28, 46, 76],
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
        ability_ids: [28, 46, 76],
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
        ability_ids: [35, 34, 123],
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
        ability_ids: [35, 34, 123],
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
        ability_ids: [35, 34, 123],
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
        ability_ids: [77, 29, 66],
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
        ability_ids: [77, 29, 66],
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
        ability_ids: [77, 29, 66],
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
        ability_ids: [14, 16, 71],
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
        ability_ids: [14, 16, 71],
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
        ability_ids: [72, 112, 80],
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
        ability_ids: [72, 112, 80],
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
        ability_ids: [72, 156, 80],
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
        ability_ids: [2, 119, 93],
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
        ability_ids: [2, 119, 93],
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
        ability_ids: [21, 0, 157],
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
        ability_ids: [12, 9, 56],
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
        ability_ids: [12, 75, 77],
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
        ability_ids: [39, 0, 66],
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
        ability_ids: [39, 0, 66],
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
        ability_ids: [54, 79, 41],
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
        ability_ids: [54, 79, 41],
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
        ability_ids: [94, 71, 66],
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
        ability_ids: [167, 0, 0],
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
        ability_ids: [167, 0, 105],
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
        ability_ids: [117, 141, 59],
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
        ability_ids: [117, 141, 59],
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
        ability_ids: [117, 141, 59],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [124, 55, 68],
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
        ability_ids: [124, 55, 68],
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
        ability_ids: [32, 63, 37],
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
        ability_ids: [32, 63, 37],
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
        ability_ids: [32, 63, 37],
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
        ability_ids: [26, 100, 20],
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
        ability_ids: [26, 100, 20],
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
        ability_ids: [26, 100, 20],
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
        ability_ids: [112, 168, 102],
    },
    // #614 Beartic
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 95,
            attack: 130,
            defense: 80,
            special_attack: 70,
            special_defense: 80,
            speed: 50,
        },
        gender_ratio: GenderRatio::F1M1,
        ability_ids: [112, 168, 49],
    },
    // #615 Cryogonal
    SpeciesEntry {
        base_stats: BaseStats {
            hp: 80,
            attack: 50,
            defense: 50,
            special_attack: 95,
            special_defense: 135,
            speed: 105,
        },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [78, 0, 0],
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
        ability_ids: [71, 75, 77],
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
        ability_ids: [71, 73, 89],
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
        ability_ids: [21, 47, 23],
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
        ability_ids: [36, 66, 88],
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
        ability_ids: [36, 66, 88],
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
        ability_ids: [142, 27, 100],
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
        ability_ids: [90, 154, 56],
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
        ability_ids: [90, 154, 56],
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
        ability_ids: [52, 36, 110],
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
        ability_ids: [52, 36, 110],
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
        ability_ids: [88, 119, 84],
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
        ability_ids: [14, 27, 52],
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
        ability_ids: [16, 77, 80],
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
        ability_ids: [16, 77, 80],
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
        ability_ids: [58, 32, 145],
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
        ability_ids: [12, 18, 135],
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
        ability_ids: [78, 0, 0],
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
        ability_ids: [63, 0, 12],
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
        ability_ids: [63, 0, 12],
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
        ability_ids: [53, 0, 0],
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
        ability_ids: [53, 0, 0],
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
        ability_ids: [53, 0, 0],
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
        ability_ids: [122, 0, 52],
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
        ability_ids: [122, 0, 52],
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
        ability_ids: [169, 0, 0],
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
        ability_ids: [170, 0, 0],
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
        ability_ids: [44, 0, 27],
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
        ability_ids: [110, 0, 0],
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
        ability_ids: [53, 0, 0],
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
        ability_ids: [93, 0, 0],
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
        ability_ids: [109, 0, 0],
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
    fn test_get_species_entry_out_of_range() {
        // 0 と 650 はインデックス0にフォールバック
        let entry0 = get_species_entry(0);
        let entry650 = get_species_entry(650);
        let entry1 = get_species_entry(1);
        assert_eq!(entry0.base_stats.hp, entry1.base_stats.hp);
        assert_eq!(entry650.base_stats.hp, entry1.base_stats.hp);
    }
}
