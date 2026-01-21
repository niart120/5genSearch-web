# 生成フロー 仕様書

## 1. 概要

### 1.1 目的

ポケモン個体の完全な生成フロー (孵化・野生・固定) を実装する。mig_002 仕様書の Phase 4 (生成機能層) - フロー部分に対応。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| RawPokemonData | IV を含まない個体データ |
| GeneratedPokemonData | 完全な個体データ (IV + コンテキスト含む) |
| BaseSeed | SHA-1 から導出される初期 Seed (IV 計算用) |
| CurrentSeed | n 消費後の LCG 状態 (個体生成用) |
| PokemonGenerator | 個体生成を管理する構造体 |

### 1.3 背景・問題

- local_004 で generation/algorithm/ が実装済み
- algorithm を組み合わせて完全な生成フローを実装

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 野生個体生成 | 各エンカウント種別に対応 |
| 固定個体生成 | 伝説・御三家・徘徊に対応 |
| 孵化個体生成 | 遺伝・リロール対応 |

### 1.5 着手条件

- local_004 (generation/algorithm/) が完了

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/generation/mod.rs` | 変更 | flows モジュール追加 |
| `wasm-pkg/src/generation/flows/mod.rs` | 新規 | サブモジュール宣言 |
| `wasm-pkg/src/generation/flows/types.rs` | 新規 | フロー用型定義 |
| `wasm-pkg/src/generation/flows/wild.rs` | 新規 | 野生ポケモン生成 |
| `wasm-pkg/src/generation/flows/static_pokemon.rs` | 新規 | 固定シンボル生成 |
| `wasm-pkg/src/generation/flows/egg.rs` | 新規 | 孵化個体生成 |
| `wasm-pkg/src/generation/flows/generator.rs` | 新規 | PokemonGenerator |

## 3. 設計方針

### 3.1 モジュール構成

```
wasm-pkg/src/generation/
├── mod.rs              # flows モジュール追加
├── algorithm/          # (local_004 で作成済み)
└── flows/
    ├── mod.rs          # re-export
    ├── types.rs        # フロー用型定義
    ├── wild.rs         # 野生ポケモン生成
    ├── static_pokemon.rs # 固定シンボル生成
    ├── egg.rs          # 孵化個体生成
    └── generator.rs    # PokemonGenerator
```

### 3.2 BaseSeed / CurrentSeed の分離

```
SHA-1(日時+DS設定) → LcgSeed (BaseSeed)
                         │
                         ├─ derive_mt_seed() → MtSeed → IV生成 (全消費位置で共通)
                         │
                         └─ advance(n) → n消費後の Lcg64 → PID/性格等生成
```

**重要**: IV は BaseSeed から導出した MT Seed で計算するため、個体生成関数には渡さない。

## 4. 実装仕様

### 4.1 generation/flows/types.rs

```rust
//! 生成フロー用型定義

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use crate::generation::algorithm::{HeldItemSlot, Ivs, ShinyType};
use crate::types::{EncounterType, Gender, LeadAbilityEffect, Nature, RomVersion};

/// 生成設定 (野生・固定共通)
#[derive(Clone)]
pub struct PokemonGenerationConfig {
    pub version: RomVersion,
    pub encounter_type: EncounterType,
    pub tid: u16,
    pub sid: u16,
    pub lead_ability: LeadAbilityEffect,
    pub shiny_charm: bool,
    pub shiny_locked: bool,
    pub has_held_item: bool,
}

/// エンカウントスロット設定
#[derive(Clone)]
pub struct EncounterSlotConfig {
    pub species_id: u16,
    pub level_min: u8,
    pub level_max: u8,
    pub gender_threshold: u8,
    pub has_held_item: bool,
}

/// 生成エラー
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum GenerationError {
    FishingFailed,
    InvalidConfig(String),
}

/// 生の個体データ (IV なし)
#[derive(Clone, Debug)]
pub struct RawPokemonData {
    pub pid: u32,
    pub species_id: u16,
    pub level: u8,
    pub nature: Nature,
    pub sync_applied: bool,
    pub ability_slot: u8,
    pub gender: Gender,
    pub shiny_type: ShinyType,
    pub held_item_slot: HeldItemSlot,
}

/// 完全な個体データ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GeneratedPokemonData {
    // 列挙コンテキスト
    pub advance: u64,
    pub needle_direction: u8,
    // Seed 情報
    pub lcg_seed: u64,
    // 基本情報
    pub pid: u32,
    pub species_id: u16,
    pub level: u8,
    // 個体情報
    pub nature: u8,
    pub sync_applied: bool,
    pub ability_slot: u8,
    pub gender: u8,
    pub shiny_type: u8,
    pub held_item_slot: u8,
    // IV
    pub iv_hp: u8,
    pub iv_atk: u8,
    pub iv_def: u8,
    pub iv_spa: u8,
    pub iv_spd: u8,
    pub iv_spe: u8,
}

impl GeneratedPokemonData {
    pub fn from_raw(
        raw: RawPokemonData,
        ivs: Ivs,
        advance: u64,
        needle_direction: u8,
        lcg_seed: u64,
    ) -> Self {
        Self {
            advance,
            needle_direction,
            lcg_seed,
            pid: raw.pid,
            species_id: raw.species_id,
            level: raw.level,
            nature: raw.nature as u8,
            sync_applied: raw.sync_applied,
            ability_slot: raw.ability_slot,
            gender: raw.gender as u8,
            shiny_type: raw.shiny_type as u8,
            held_item_slot: raw.held_item_slot as u8,
            iv_hp: ivs.hp,
            iv_atk: ivs.atk,
            iv_def: ivs.def,
            iv_spa: ivs.spa,
            iv_spd: ivs.spd,
            iv_spe: ivs.spe,
        }
    }
}

/// 孵化設定
#[derive(Clone)]
pub struct EggGenerationConfig {
    pub tid: u16,
    pub sid: u16,
    pub everstone: EverstonePlan,
    pub female_has_hidden: bool,
    pub uses_ditto: bool,
    pub gender_ratio: GenderRatio,
    pub nidoran_flag: bool,
    pub pid_reroll_count: u8,
}

/// かわらずのいし設定
#[derive(Clone, Copy, Debug, Default)]
pub enum EverstonePlan {
    #[default]
    None,
    Fixed(Nature),
}

/// 性別比率
#[derive(Clone, Copy, Debug)]
pub enum GenderRatio {
    Genderless,
    MaleOnly,
    FemaleOnly,
    Threshold(u8),
}

/// 生の卵データ (IV なし)
#[derive(Clone, Debug)]
pub struct RawEggData {
    pub pid: u32,
    pub nature: Nature,
    pub gender: Gender,
    pub ability_slot: u8,
    pub shiny_type: ShinyType,
    pub inheritance: [InheritanceSlot; 3],
}

/// 遺伝スロット
#[derive(Clone, Copy, Debug, Default)]
pub struct InheritanceSlot {
    pub stat: u8,
    pub parent: u8,
}

/// 完全な卵データ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GeneratedEggData {
    // 列挙コンテキスト
    pub advance: u64,
    pub needle_direction: u8,
    // Seed 情報
    pub lcg_seed: u64,
    // 基本情報
    pub pid: u32,
    // 個体情報
    pub nature: u8,
    pub gender: u8,
    pub ability_slot: u8,
    pub shiny_type: u8,
    // 遺伝情報
    pub inheritance_stat_0: u8,
    pub inheritance_parent_0: u8,
    pub inheritance_stat_1: u8,
    pub inheritance_parent_1: u8,
    pub inheritance_stat_2: u8,
    pub inheritance_parent_2: u8,
    // IV
    pub iv_hp: u8,
    pub iv_atk: u8,
    pub iv_def: u8,
    pub iv_spa: u8,
    pub iv_spd: u8,
    pub iv_spe: u8,
}
```

### 4.2 generation/flows/wild.rs

参照: [mig_002/generation/flows/pokemon-wild.md](../mig_002/generation/flows/pokemon-wild.md)

```rust
//! 野生ポケモン生成

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    calculate_encounter_slot, determine_held_item_slot, determine_nature,
    encounter_type_supports_held_item, fishing_success, generate_wild_pid_with_reroll,
    perform_sync_check, HeldItemSlot, ShinyType,
};
use crate::types::{EncounterType, Gender, LeadAbilityEffect};

use super::types::{
    EncounterSlotConfig, GenerationError, PokemonGenerationConfig, RawPokemonData,
};

/// 野生ポケモン生成 (IV なし)
pub fn generate_wild_pokemon(
    lcg: &mut Lcg64,
    config: &PokemonGenerationConfig,
    slots: &[EncounterSlotConfig],
) -> Result<RawPokemonData, GenerationError> {
    let enc_type = config.encounter_type;
    let is_compound_eyes = matches!(config.lead_ability, LeadAbilityEffect::CompoundEyes);

    // 1. シンクロ判定 (ふくがん先頭時はスキップ)
    let sync_success = if is_compound_eyes {
        false
    } else {
        perform_sync_check(lcg, enc_type, &config.lead_ability)
    };

    // 2. 釣り成功判定 (Fishing のみ)
    if enc_type == EncounterType::Fishing {
        let fishing_result = lcg.next();
        if !fishing_success(fishing_result) {
            return Err(GenerationError::FishingFailed);
        }
    }

    // 3. スロット決定
    let slot_rand = lcg.next();
    let slot_idx = calculate_encounter_slot(enc_type, slot_rand, config.version) as usize;
    let slot_config = &slots[slot_idx.min(slots.len() - 1)];

    // 4. レベル決定
    let _level_rand = lcg.next();

    // 5. PID 生成
    let reroll_count = if config.shiny_charm { 2 } else { 0 };
    let (pid, shiny_type) =
        generate_wild_pid_with_reroll(lcg, config.tid, config.sid, reroll_count);

    // 6. 性格決定
    let (nature, sync_applied) = determine_nature(lcg, sync_success, &config.lead_ability);

    // 7. 持ち物判定
    let held_item_slot = if encounter_type_supports_held_item(enc_type) && slot_config.has_held_item
    {
        let item_rand = lcg.next();
        let has_very_rare = matches!(
            enc_type,
            EncounterType::ShakingGrass | EncounterType::SurfingBubble
        );
        determine_held_item_slot(config.version, item_rand, &config.lead_ability, has_very_rare)
    } else {
        HeldItemSlot::None
    };

    // 8. BW のみ: 最後の消費
    if config.version.is_bw() {
        lcg.next();
    }

    // === Resolve (乱数消費なし) ===
    let gender = determine_gender(pid, slot_config.gender_threshold);
    let ability_slot = ((pid >> 16) & 1) as u8;

    Ok(RawPokemonData {
        pid,
        species_id: slot_config.species_id,
        level: slot_config.level_min, // 簡略化
        nature,
        sync_applied,
        ability_slot,
        gender,
        shiny_type,
        held_item_slot,
    })
}

/// 性別判定
fn determine_gender(pid: u32, threshold: u8) -> Gender {
    match threshold {
        0 => Gender::Male,
        254 => Gender::Female,
        255 => Gender::Unknown,
        t => {
            let gender_value = (pid & 0xFF) as u8;
            if gender_value < t {
                Gender::Female
            } else {
                Gender::Male
            }
        }
    }
}
```

### 4.3 generation/flows/static_pokemon.rs

参照: [mig_002/generation/flows/pokemon-static.md](../mig_002/generation/flows/pokemon-static.md)

```rust
//! 固定シンボル・イベント・徘徊ポケモン生成

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    apply_shiny_lock, calculate_shiny_type, determine_nature, generate_event_pid,
    generate_wild_pid_with_reroll, nature_roll, perform_sync_check, HeldItemSlot, ShinyType,
};
use crate::types::{EncounterType, Gender, LeadAbilityEffect, Nature};

use super::types::{PokemonGenerationConfig, RawPokemonData};

/// 固定ポケモン生成 (IV なし)
pub fn generate_static_pokemon(
    lcg: &mut Lcg64,
    config: &PokemonGenerationConfig,
    species_id: u16,
    level: u8,
    gender_threshold: u8,
) -> RawPokemonData {
    let enc_type = config.encounter_type;
    let is_compound_eyes = matches!(config.lead_ability, LeadAbilityEffect::CompoundEyes);

    // シンクロ判定 (StaticSymbol のみ)
    let sync_success = if enc_type == EncounterType::StaticSymbol && !is_compound_eyes {
        perform_sync_check(lcg, enc_type, &config.lead_ability)
    } else {
        false
    };

    // PID 生成
    let (pid, shiny_type) = match enc_type {
        EncounterType::StaticSymbol | EncounterType::Roamer => {
            let reroll_count = if config.shiny_charm { 2 } else { 0 };
            let (pid, shiny) =
                generate_wild_pid_with_reroll(lcg, config.tid, config.sid, reroll_count);
            if config.shiny_locked {
                (apply_shiny_lock(pid, config.tid, config.sid), ShinyType::None)
            } else {
                (pid, shiny)
            }
        }
        EncounterType::StaticStarter
        | EncounterType::StaticFossil
        | EncounterType::StaticEvent => {
            let pid = generate_event_pid(lcg.next());
            let pid = if config.shiny_locked {
                apply_shiny_lock(pid, config.tid, config.sid)
            } else {
                pid
            };
            let shiny = calculate_shiny_type(pid, config.tid, config.sid);
            (pid, shiny)
        }
        _ => {
            let r = lcg.next();
            let pid = r;
            let shiny = calculate_shiny_type(pid, config.tid, config.sid);
            (pid, shiny)
        }
    };

    // 性格決定
    let (nature, sync_applied) = if sync_success {
        if let LeadAbilityEffect::Synchronize(n) = config.lead_ability {
            let _r = lcg.next(); // 消費
            (n, true)
        } else {
            (Nature::from_u8(nature_roll(lcg.next())), false)
        }
    } else {
        (Nature::from_u8(nature_roll(lcg.next())), false)
    };

    // 持ち物判定 (StaticSymbol で対象個体のみ)
    if enc_type == EncounterType::StaticSymbol && config.has_held_item {
        lcg.next();
    }

    // BW のみ: 最後の消費
    if enc_type == EncounterType::StaticSymbol && config.version.is_bw() {
        lcg.next();
    }

    // === Resolve ===
    let ability_slot = ((pid >> 16) & 1) as u8;
    let gender = match gender_threshold {
        0 => Gender::Male,
        254 => Gender::Female,
        255 => Gender::Unknown,
        t => {
            if (pid & 0xFF) as u8 < t {
                Gender::Female
            } else {
                Gender::Male
            }
        }
    };

    RawPokemonData {
        pid,
        species_id,
        level,
        nature,
        sync_applied,
        ability_slot,
        gender,
        shiny_type,
        held_item_slot: HeldItemSlot::None,
    }
}
```

### 4.4 generation/flows/egg.rs

参照: [mig_002/generation/flows/egg.md](../mig_002/generation/flows/egg.md)

```rust
//! 孵化個体生成

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    generate_egg_pid_with_reroll, nature_roll, ShinyType,
};
use crate::types::{Gender, Nature};

use super::types::{EggGenerationConfig, EverstonePlan, GenderRatio, InheritanceSlot, RawEggData};

/// 卵の個体生成 (IV なし)
pub fn generate_egg(lcg: &mut Lcg64, config: &EggGenerationConfig) -> RawEggData {
    // 1. 性格決定
    let nature = determine_egg_nature(lcg, config.everstone);

    // 2. 遺伝スロット決定
    let inheritance = determine_inheritance(lcg);

    // 3. 夢特性判定
    let has_hidden = determine_hidden_ability(
        lcg,
        config.female_has_hidden,
        config.uses_ditto,
    );

    // 4. 性別判定
    let gender = determine_egg_gender(lcg, config.gender_ratio);

    // 5. PID 生成
    let (pid, shiny_type) = generate_egg_pid_with_reroll(
        lcg,
        config.tid,
        config.sid,
        config.pid_reroll_count,
    );

    // 特性スロット決定
    let ability_slot = if has_hidden {
        2
    } else {
        ((pid >> 16) & 1) as u8
    };

    RawEggData {
        pid,
        nature,
        gender,
        ability_slot,
        shiny_type,
        inheritance,
    }
}

/// 卵の性格決定
fn determine_egg_nature(lcg: &mut Lcg64, everstone: EverstonePlan) -> Nature {
    let nature_idx = nature_roll(lcg.next());

    match everstone {
        EverstonePlan::None => Nature::from_u8(nature_idx),
        EverstonePlan::Fixed(parent_nature) => {
            let inherit = (lcg.next() >> 31) == 0;
            if inherit {
                parent_nature
            } else {
                Nature::from_u8(nature_idx)
            }
        }
    }
}

/// 遺伝スロット決定
fn determine_inheritance(lcg: &mut Lcg64) -> [InheritanceSlot; 3] {
    let mut slots = [InheritanceSlot::default(); 3];
    let mut used = [false; 6];

    for slot in &mut slots {
        // 遺伝先ステータス決定 (重複不可)
        let stat = loop {
            let r = lcg.next();
            let candidate = ((r as u64 * 6) >> 32) as usize;
            if !used[candidate] {
                used[candidate] = true;
                break candidate as u8;
            }
        };

        // 遺伝元親決定 (50%)
        let parent = if lcg.next() >> 31 == 1 { 0 } else { 1 };

        *slot = InheritanceSlot { stat, parent };
    }

    slots
}

/// 夢特性判定
fn determine_hidden_ability(lcg: &mut Lcg64, female_has_hidden: bool, uses_ditto: bool) -> bool {
    let r = lcg.next();

    // 夢特性条件:
    // - メタモンを使用していない
    // - ♀親が夢特性
    // - 乱数判定成功 (60%)
    if !uses_ditto && female_has_hidden {
        ((r as u64 * 5) >> 32) >= 2
    } else {
        false
    }
}

/// 卵の性別判定
fn determine_egg_gender(lcg: &mut Lcg64, gender_ratio: GenderRatio) -> Gender {
    match gender_ratio {
        GenderRatio::Genderless => Gender::Unknown,
        GenderRatio::MaleOnly => Gender::Male,
        GenderRatio::FemaleOnly => Gender::Female,
        GenderRatio::Threshold(threshold) => {
            let r = lcg.next();
            let value = ((r as u64 * 252) >> 32) as u8;
            if value < threshold {
                Gender::Female
            } else {
                Gender::Male
            }
        }
    }
}
```

### 4.5 generation/flows/generator.rs

```rust
//! PokemonGenerator - 完全な個体生成

use wasm_bindgen::prelude::*;

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{generate_rng_ivs, Ivs, NeedleDirection};
use crate::types::{LcgSeed, MtSeed};

use super::egg::generate_egg;
use super::static_pokemon::generate_static_pokemon;
use super::types::{
    EggGenerationConfig, GeneratedEggData, GeneratedPokemonData, PokemonGenerationConfig,
};
use super::wild::generate_wild_pokemon;

/// 野生ポケモン Generator
#[wasm_bindgen]
pub struct WildPokemonGenerator {
    base_seed: LcgSeed,
    mt_seed: MtSeed,
    rng_ivs: Ivs,
    config: PokemonGenerationConfig,
    slots: Vec<EncounterSlotConfig>,
}

use super::types::EncounterSlotConfig;

impl WildPokemonGenerator {
    pub fn new(
        base_seed: LcgSeed,
        config: PokemonGenerationConfig,
        slots: Vec<EncounterSlotConfig>,
    ) -> Self {
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs(mt_seed);

        Self {
            base_seed,
            mt_seed,
            rng_ivs,
            config,
            slots,
        }
    }

    /// 指定消費位置での個体生成
    pub fn generate_at(&self, advance: u32) -> Option<GeneratedPokemonData> {
        let mut lcg = Lcg64::new(self.base_seed.value());
        lcg.advance(advance as u64 + 1);

        let current_seed = lcg.seed();
        let needle = NeedleDirection::from_seed(LcgSeed::new(current_seed));

        match generate_wild_pokemon(&mut lcg, &self.config, &self.slots) {
            Ok(raw) => Some(GeneratedPokemonData::from_raw(
                raw,
                self.rng_ivs,
                advance as u64,
                needle.value(),
                current_seed,
            )),
            Err(_) => None,
        }
    }
}

/// 固定ポケモン Generator
pub struct StaticPokemonGenerator {
    base_seed: LcgSeed,
    rng_ivs: Ivs,
    config: PokemonGenerationConfig,
    species_id: u16,
    level: u8,
    gender_threshold: u8,
}

impl StaticPokemonGenerator {
    pub fn new(
        base_seed: LcgSeed,
        config: PokemonGenerationConfig,
        species_id: u16,
        level: u8,
        gender_threshold: u8,
    ) -> Self {
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs(mt_seed);

        Self {
            base_seed,
            rng_ivs,
            config,
            species_id,
            level,
            gender_threshold,
        }
    }

    pub fn generate_at(&self, advance: u32) -> GeneratedPokemonData {
        let mut lcg = Lcg64::new(self.base_seed.value());
        lcg.advance(advance as u64 + 1);

        let current_seed = lcg.seed();
        let needle = NeedleDirection::from_seed(LcgSeed::new(current_seed));

        let raw = generate_static_pokemon(
            &mut lcg,
            &self.config,
            self.species_id,
            self.level,
            self.gender_threshold,
        );

        GeneratedPokemonData::from_raw(
            raw,
            self.rng_ivs,
            advance as u64,
            needle.value(),
            current_seed,
        )
    }
}

/// 卵 Generator
pub struct EggGenerator {
    base_seed: LcgSeed,
    rng_ivs: Ivs,
    config: EggGenerationConfig,
    parent_male: Ivs,
    parent_female: Ivs,
}

impl EggGenerator {
    pub fn new(
        base_seed: LcgSeed,
        config: EggGenerationConfig,
        parent_male: Ivs,
        parent_female: Ivs,
    ) -> Self {
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs(mt_seed);

        Self {
            base_seed,
            rng_ivs,
            config,
            parent_male,
            parent_female,
        }
    }

    pub fn generate_at(&self, advance: u32) -> GeneratedEggData {
        let mut lcg = Lcg64::new(self.base_seed.value());
        lcg.advance(advance as u64 + 1);

        let current_seed = lcg.seed();
        let needle = NeedleDirection::from_seed(LcgSeed::new(current_seed));

        let raw = generate_egg(&mut lcg, &self.config);

        // 遺伝適用
        let mut final_ivs = self.rng_ivs;
        for slot in &raw.inheritance {
            let parent_iv = if slot.parent == 0 {
                self.parent_male.get(slot.stat)
            } else {
                self.parent_female.get(slot.stat)
            };
            final_ivs.set(slot.stat, parent_iv);
        }

        GeneratedEggData {
            advance: advance as u64,
            needle_direction: needle.value(),
            lcg_seed: current_seed,
            pid: raw.pid,
            nature: raw.nature as u8,
            gender: raw.gender as u8,
            ability_slot: raw.ability_slot,
            shiny_type: raw.shiny_type as u8,
            inheritance_stat_0: raw.inheritance[0].stat,
            inheritance_parent_0: raw.inheritance[0].parent,
            inheritance_stat_1: raw.inheritance[1].stat,
            inheritance_parent_1: raw.inheritance[1].parent,
            inheritance_stat_2: raw.inheritance[2].stat,
            inheritance_parent_2: raw.inheritance[2].parent,
            iv_hp: final_ivs.hp,
            iv_atk: final_ivs.atk,
            iv_def: final_ivs.def,
            iv_spa: final_ivs.spa,
            iv_spd: final_ivs.spd,
            iv_spe: final_ivs.spe,
        }
    }
}
```

### 4.6 generation/flows/mod.rs

```rust
//! 生成フロー

pub mod egg;
pub mod generator;
pub mod static_pokemon;
pub mod types;
pub mod wild;

pub use egg::generate_egg;
pub use generator::{EggGenerator, StaticPokemonGenerator, WildPokemonGenerator};
pub use static_pokemon::generate_static_pokemon;
pub use types::{
    EggGenerationConfig, EncounterSlotConfig, EverstonePlan, GenderRatio, GeneratedEggData,
    GeneratedPokemonData, GenerationError, InheritanceSlot, PokemonGenerationConfig, RawEggData,
    RawPokemonData,
};
pub use wild::generate_wild_pokemon;
```

### 4.7 generation/mod.rs の更新

```rust
//! ポケモン生成機能

pub mod algorithm;
pub mod flows;

pub use algorithm::*;
pub use flows::*;
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | テスト内容 |
|-----------|-----------|
| `wild.rs` | 野生個体生成の消費パターン |
| `static_pokemon.rs` | 固定個体生成の消費パターン |
| `egg.rs` | 卵生成・遺伝処理 |
| `generator.rs` | Generator の advance 処理 |

### 5.2 コマンド

```powershell
cd wasm-pkg
cargo test
wasm-pack build --target web
```

## 6. 実装チェックリスト

- [ ] `wasm-pkg/src/generation/flows/mod.rs` 作成
- [ ] `wasm-pkg/src/generation/flows/types.rs` 作成
  - [ ] PokemonGenerationConfig
  - [ ] EncounterSlotConfig
  - [ ] RawPokemonData, GeneratedPokemonData
  - [ ] EggGenerationConfig
  - [ ] RawEggData, GeneratedEggData
- [ ] `wasm-pkg/src/generation/flows/wild.rs` 作成
  - [ ] generate_wild_pokemon
  - [ ] determine_gender
- [ ] `wasm-pkg/src/generation/flows/static_pokemon.rs` 作成
  - [ ] generate_static_pokemon
- [ ] `wasm-pkg/src/generation/flows/egg.rs` 作成
  - [ ] generate_egg
  - [ ] determine_egg_nature
  - [ ] determine_inheritance
  - [ ] determine_hidden_ability
  - [ ] determine_egg_gender
- [ ] `wasm-pkg/src/generation/flows/generator.rs` 作成
  - [ ] WildPokemonGenerator
  - [ ] StaticPokemonGenerator
  - [ ] EggGenerator
- [ ] `wasm-pkg/src/generation/mod.rs` 更新
- [ ] `cargo test` パス確認
- [ ] `wasm-pack build --target web` 成功確認
