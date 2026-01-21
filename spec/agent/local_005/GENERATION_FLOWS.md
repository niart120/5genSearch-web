# 生成フロー 仕様書

## 1. 概要

### 1.1 目的

ポケモン個体の完全な生成フロー (孵化・野生・固定) を実装する。mig_002 仕様書の Phase 4 (生成機能層) - フロー部分に対応。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| RawPokemonData | IV を含まない個体データ |
| GeneratedPokemonData | 完全な個体データ (IV + コンテキスト含む) |
| BaseSeed | SHA-1 から導出される初期 Seed |
| GameOffset | ゲーム起動条件により自動計算されるオフセット (`algorithm/game_offset.rs`) |
| UserOffset | ユーザが検索利便性のために追加指定するオフセット |
| TotalOffset | GameOffset + UserOffset |
| MtOffset | MT19937 初期化後、IV 生成を開始する位置 (通常 7) |
| PokemonGenerator | 個体生成を管理する構造体 |

### 1.3 背景・問題

- local_004 で generation/algorithm/ が実装済み
- algorithm を組み合わせて完全な生成フローを実装
- オフセット計算は `algorithm/game_offset.rs` に既存実装あり

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
| `wasm-pkg/src/generation/flows/pokemon_wild.rs` | 新規 | 野生ポケモン生成 |
| `wasm-pkg/src/generation/flows/pokemon_static.rs` | 新規 | 固定シンボル生成 |
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
    ├── pokemon_wild.rs # 野生ポケモン生成
    ├── pokemon_static.rs # 固定シンボル生成
    ├── egg.rs          # 孵化個体生成
    └── generator.rs    # PokemonGenerator
```

### 3.2 既存型の再利用

以下の型は既存定義を使用し、重複定義を避ける:

| 型 | 既存定義場所 |
|---|---|
| `Ivs` | `types/mod.rs` |
| `ShinyType` | `types/mod.rs` |
| `GenderRatio` | `types/mod.rs` |
| `EverstonePlan` | `algorithm/nature.rs` |
| `InheritanceSlot`, `ParentRole` | `algorithm/iv.rs` |
| `HeldItemSlot` | `algorithm/encounter.rs` |

### 3.3 オフセット設計

```
BaseSeed (SHA-1 → LcgSeed)
    │
    ├─ derive_mt_seed() → MtSeed
    │       │
    │       └─ advance(mt_offset) → IV 生成開始位置 (通常 7)
    │
    └─ calculate_game_offset() → GameOffset (起動条件依存)
            │
            └─ + UserOffset → TotalOffset
                    │
                    └─ advance(total_offset + n) → n 消費後の LCG → PID/性格等生成
```

**オフセットの種類**:

| オフセット | 説明 | 計算方法 |
|---|---|---|
| MtOffset | MT19937 で IV 生成を開始する位置 | 固定値 (通常 7、BW2 一部 0) |
| GameOffset | ゲーム起動条件による自動消費 | `calculate_game_offset()` |
| UserOffset | ユーザ指定の追加オフセット | ユーザ入力 |
| TotalOffset | 実際の LCG 開始位置 | GameOffset + UserOffset |

## 4. 実装仕様

### 4.1 generation/flows/types.rs

```rust
//! 生成フロー用型定義

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use crate::types::{
    EncounterType, GameStartConfig, Gender, GenderRatio, Ivs, LeadAbilityEffect, Nature,
    NeedleDirection, RomVersion, ShinyType,
};
use crate::generation::algorithm::{HeldItemSlot, InheritanceSlot, EverstonePlan};

// ===== 生成設定 =====

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

// ===== オフセット設定 =====

/// オフセット設定
#[derive(Clone, Debug, Default)]
pub struct OffsetConfig {
    /// ユーザ指定オフセット (GameOffset に加算)
    pub user_offset: u32,
    /// MT オフセット (IV 生成開始位置、通常 7)
    pub mt_offset: u32,
}

impl OffsetConfig {
    pub const DEFAULT_MT_OFFSET: u32 = 7;

    pub fn new(user_offset: u32) -> Self {
        Self {
            user_offset,
            mt_offset: Self::DEFAULT_MT_OFFSET,
        }
    }

    pub fn with_mt_offset(user_offset: u32, mt_offset: u32) -> Self {
        Self {
            user_offset,
            mt_offset,
        }
    }
}

// ===== 生成エラー =====

/// 生成エラー
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum GenerationError {
    FishingFailed,
    InvalidConfig(String),
}

// ===== 生成結果 =====

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
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    // Seed 情報
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
}

impl GeneratedPokemonData {
    pub fn new(
        raw: RawPokemonData,
        ivs: Ivs,
        advance: u32,
        needle_direction: NeedleDirection,
        lcg_seed: u64,
    ) -> Self {
        Self {
            advance,
            needle_direction,
            lcg_seed,
            pid: raw.pid,
            species_id: raw.species_id,
            level: raw.level,
            nature: raw.nature,
            sync_applied: raw.sync_applied,
            ability_slot: raw.ability_slot,
            gender: raw.gender,
            shiny_type: raw.shiny_type,
            held_item_slot: raw.held_item_slot,
            ivs,
        }
    }
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

/// 完全な卵データ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GeneratedEggData {
    // 列挙コンテキスト
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    // Seed 情報
    pub lcg_seed: u64,
    // 基本情報
    pub pid: u32,
    // 個体情報
    pub nature: Nature,
    pub gender: Gender,
    pub ability_slot: u8,
    pub shiny_type: ShinyType,
    // 遺伝情報
    pub inheritance: [InheritanceSlot; 3],
    // IV (遺伝適用後)
    pub ivs: Ivs,
}

impl GeneratedEggData {
    pub fn new(
        raw: RawEggData,
        ivs: Ivs,
        advance: u32,
        needle_direction: NeedleDirection,
        lcg_seed: u64,
    ) -> Self {
        Self {
            advance,
            needle_direction,
            lcg_seed,
            pid: raw.pid,
            nature: raw.nature,
            gender: raw.gender,
            ability_slot: raw.ability_slot,
            shiny_type: raw.shiny_type,
            inheritance: raw.inheritance,
            ivs,
        }
    }
}
```

### 4.2 generation/flows/pokemon_wild.rs

参照: [mig_002/generation/flows/pokemon-wild.md](../mig_002/generation/flows/pokemon-wild.md)

```rust
//! 野生ポケモン生成

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    calculate_encounter_slot, determine_held_item_slot, determine_nature,
    encounter_type_supports_held_item, fishing_success, generate_wild_pid_with_reroll,
    perform_sync_check, HeldItemSlot,
};
use crate::types::{EncounterType, Gender, LeadAbilityEffect, ShinyType};

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
        let fishing_result = lcg.next().unwrap_or(0);
        if !fishing_success(fishing_result) {
            return Err(GenerationError::FishingFailed);
        }
    }

    // 3. スロット決定
    let slot_rand = lcg.next().unwrap_or(0);
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
        let item_rand = lcg.next().unwrap_or(0);
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
        255 => Gender::Genderless,
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

### 4.3 generation/flows/pokemon_static.rs

参照: [mig_002/generation/flows/pokemon-static.md](../mig_002/generation/flows/pokemon-static.md)

```rust
//! 固定シンボル・イベント・徘徊ポケモン生成

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    apply_shiny_lock, calculate_shiny_type, determine_nature, generate_event_pid,
    generate_wild_pid_with_reroll, nature_roll, perform_sync_check, HeldItemSlot,
};
use crate::types::{EncounterType, Gender, LeadAbilityEffect, Nature, ShinyType};

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
            let pid = generate_event_pid(lcg.next().unwrap_or(0));
            let pid = if config.shiny_locked {
                apply_shiny_lock(pid, config.tid, config.sid)
            } else {
                pid
            };
            let shiny = calculate_shiny_type(pid, config.tid, config.sid);
            (pid, shiny)
        }
        _ => {
            let r = lcg.next().unwrap_or(0);
            let shiny = calculate_shiny_type(r, config.tid, config.sid);
            (r, shiny)
        }
    };

    // 性格決定
    let (nature, sync_applied) = if sync_success {
        if let LeadAbilityEffect::Synchronize(n) = config.lead_ability {
            let _r = lcg.next(); // 消費
            (n, true)
        } else {
            (Nature::from_u8(nature_roll(lcg.next().unwrap_or(0))), false)
        }
    } else {
        (Nature::from_u8(nature_roll(lcg.next().unwrap_or(0))), false)
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
        255 => Gender::Genderless,
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
    determine_egg_nature, generate_egg_pid_with_reroll, EverstonePlan, InheritanceSlot, ParentRole,
};
use crate::types::{Gender, GenderRatio, Nature, ShinyType};

use super::types::{EggGenerationConfig, RawEggData};

/// 卵の個体生成 (IV なし)
pub fn generate_egg(lcg: &mut Lcg64, config: &EggGenerationConfig) -> RawEggData {
    // 1. 性格決定 (既存関数を使用)
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

/// 遺伝スロット決定
fn determine_inheritance(lcg: &mut Lcg64) -> [InheritanceSlot; 3] {
    let mut slots = [InheritanceSlot::default(); 3];
    let mut used = [false; 6];

    for slot in &mut slots {
        // 遺伝先ステータス決定 (重複不可)
        let stat = loop {
            let r = lcg.next().unwrap_or(0);
            let candidate = ((u64::from(r) * 6) >> 32) as usize;
            if !used[candidate] {
                used[candidate] = true;
                break candidate;
            }
        };

        // 遺伝元親決定 (50%)
        let parent = if lcg.next().unwrap_or(0) >> 31 == 1 {
            ParentRole::Male
        } else {
            ParentRole::Female
        };

        *slot = InheritanceSlot { stat, parent };
    }

    slots
}

/// 夢特性判定
fn determine_hidden_ability(lcg: &mut Lcg64, female_has_hidden: bool, uses_ditto: bool) -> bool {
    let r = lcg.next().unwrap_or(0);

    // 夢特性条件:
    // - メタモンを使用していない
    // - ♀親が夢特性
    // - 乱数判定成功 (60%)
    if !uses_ditto && female_has_hidden {
        ((u64::from(r) * 5) >> 32) >= 2
    } else {
        false
    }
}

/// 卵の性別判定
fn determine_egg_gender(lcg: &mut Lcg64, gender_ratio: GenderRatio) -> Gender {
    match gender_ratio {
        GenderRatio::Genderless => Gender::Genderless,
        GenderRatio::MaleOnly => Gender::Male,
        GenderRatio::FemaleOnly => Gender::Female,
        GenderRatio::Threshold(threshold) => {
            let r = lcg.next().unwrap_or(0);
            let value = ((u64::from(r) * 252) >> 32) as u8;
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
//!
//! オフセット対応:
//! - GameOffset: ゲーム起動条件により自動計算 (`calculate_game_offset`)
//! - UserOffset: ユーザ指定の追加オフセット
//! - MtOffset: MT19937 で IV 生成を開始する位置

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::{
    apply_inheritance, calculate_game_offset, calculate_needle_direction,
    generate_rng_ivs_with_offset, InheritanceSlot,
};
use crate::types::{GameStartConfig, Ivs, LcgSeed, NeedleDirection, RomVersion};

use super::egg::generate_egg;
use super::pokemon_static::generate_static_pokemon;
use super::pokemon_wild::generate_wild_pokemon;
use super::types::{
    EggGenerationConfig, EncounterSlotConfig, GeneratedEggData, GeneratedPokemonData,
    OffsetConfig, PokemonGenerationConfig, RawEggData,
};

/// 野生ポケモン Generator
pub struct WildPokemonGenerator {
    base_seed: LcgSeed,
    game_offset: u32,
    offset_config: OffsetConfig,
    rng_ivs: Ivs,
    config: PokemonGenerationConfig,
    slots: Vec<EncounterSlotConfig>,
}

impl WildPokemonGenerator {
    /// Generator を作成
    ///
    /// # Errors
    /// 無効な起動設定の場合にエラーを返す。
    pub fn new(
        base_seed: LcgSeed,
        version: RomVersion,
        game_start: &GameStartConfig,
        offset_config: OffsetConfig,
        config: PokemonGenerationConfig,
        slots: Vec<EncounterSlotConfig>,
    ) -> Result<Self, String> {
        let game_offset = calculate_game_offset(base_seed, version, game_start)?;
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs_with_offset(mt_seed, offset_config.mt_offset);

        Ok(Self {
            base_seed,
            game_offset,
            offset_config,
            rng_ivs,
            config,
            slots,
        })
    }

    /// 総オフセット (GameOffset + UserOffset)
    pub fn total_offset(&self) -> u32 {
        self.game_offset + self.offset_config.user_offset
    }

    /// 指定消費位置での個体生成
    ///
    /// `advance` は total_offset からの相対位置。
    pub fn generate_at(&self, advance: u32) -> Option<GeneratedPokemonData> {
        let mut lcg = Lcg64::new(self.base_seed);
        let absolute_advance = self.total_offset() + advance;
        lcg.jump(u64::from(absolute_advance));

        let current_seed = lcg.current_seed();
        let needle = calculate_needle_direction(current_seed);

        // 1回進めてから生成開始
        lcg.next();

        match generate_wild_pokemon(&mut lcg, &self.config, &self.slots) {
            Ok(raw) => Some(GeneratedPokemonData::new(
                raw,
                self.rng_ivs,
                advance,
                needle,
                current_seed.value(),
            )),
            Err(_) => None,
        }
    }

    /// 範囲内の個体を生成
    pub fn generate_range(&self, start: u32, end: u32) -> Vec<GeneratedPokemonData> {
        (start..end).filter_map(|adv| self.generate_at(adv)).collect()
    }
}

/// 固定ポケモン Generator
pub struct StaticPokemonGenerator {
    base_seed: LcgSeed,
    game_offset: u32,
    offset_config: OffsetConfig,
    rng_ivs: Ivs,
    config: PokemonGenerationConfig,
    species_id: u16,
    level: u8,
    gender_threshold: u8,
}

impl StaticPokemonGenerator {
    pub fn new(
        base_seed: LcgSeed,
        version: RomVersion,
        game_start: &GameStartConfig,
        offset_config: OffsetConfig,
        config: PokemonGenerationConfig,
        species_id: u16,
        level: u8,
        gender_threshold: u8,
    ) -> Result<Self, String> {
        let game_offset = calculate_game_offset(base_seed, version, game_start)?;
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs_with_offset(mt_seed, offset_config.mt_offset);

        Ok(Self {
            base_seed,
            game_offset,
            offset_config,
            rng_ivs,
            config,
            species_id,
            level,
            gender_threshold,
        })
    }

    pub fn total_offset(&self) -> u32 {
        self.game_offset + self.offset_config.user_offset
    }

    pub fn generate_at(&self, advance: u32) -> GeneratedPokemonData {
        let mut lcg = Lcg64::new(self.base_seed);
        let absolute_advance = self.total_offset() + advance;
        lcg.jump(u64::from(absolute_advance));

        let current_seed = lcg.current_seed();
        let needle = calculate_needle_direction(current_seed);

        lcg.next();

        let raw = generate_static_pokemon(
            &mut lcg,
            &self.config,
            self.species_id,
            self.level,
            self.gender_threshold,
        );

        GeneratedPokemonData::new(raw, self.rng_ivs, advance, needle, current_seed.value())
    }
}

/// 卵 Generator
pub struct EggGenerator {
    base_seed: LcgSeed,
    game_offset: u32,
    offset_config: OffsetConfig,
    rng_ivs: Ivs,
    config: EggGenerationConfig,
    parent_male: Ivs,
    parent_female: Ivs,
}

impl EggGenerator {
    pub fn new(
        base_seed: LcgSeed,
        version: RomVersion,
        game_start: &GameStartConfig,
        offset_config: OffsetConfig,
        config: EggGenerationConfig,
        parent_male: Ivs,
        parent_female: Ivs,
    ) -> Result<Self, String> {
        let game_offset = calculate_game_offset(base_seed, version, game_start)?;
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs_with_offset(mt_seed, offset_config.mt_offset);

        Ok(Self {
            base_seed,
            game_offset,
            offset_config,
            rng_ivs,
            config,
            parent_male,
            parent_female,
        })
    }

    pub fn total_offset(&self) -> u32 {
        self.game_offset + self.offset_config.user_offset
    }

    pub fn generate_at(&self, advance: u32) -> GeneratedEggData {
        let mut lcg = Lcg64::new(self.base_seed);
        let absolute_advance = self.total_offset() + advance;
        lcg.jump(u64::from(absolute_advance));

        let current_seed = lcg.current_seed();
        let needle = calculate_needle_direction(current_seed);

        lcg.next();

        let raw = generate_egg(&mut lcg, &self.config);

        // 遺伝適用
        let final_ivs = apply_inheritance(
            &self.rng_ivs,
            &self.parent_male,
            &self.parent_female,
            &raw.inheritance,
        );

        GeneratedEggData::new(raw, final_ivs, advance, needle, current_seed.value())
    }
}
```

### 4.6 generation/flows/mod.rs

```rust
//! 生成フロー

pub mod egg;
pub mod generator;
pub mod pokemon_static;
pub mod pokemon_wild;
pub mod types;

pub use egg::generate_egg;
pub use generator::{EggGenerator, StaticPokemonGenerator, WildPokemonGenerator};
pub use pokemon_static::generate_static_pokemon;
pub use pokemon_wild::generate_wild_pokemon;
pub use types::{
    EggGenerationConfig, EncounterSlotConfig, GeneratedEggData, GeneratedPokemonData,
    GenerationError, OffsetConfig, PokemonGenerationConfig, RawEggData, RawPokemonData,
};
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
| `pokemon_wild.rs` | 野生個体生成の消費パターン |
| `pokemon_static.rs` | 固定個体生成の消費パターン |
| `egg.rs` | 卵生成・遺伝処理 |
| `generator.rs` | Generator の offset + advance 処理 |

### 5.2 コマンド

```powershell
cd wasm-pkg
cargo test
wasm-pack build --target web
```

## 6. 実装チェックリスト

- [x] `wasm-pkg/src/generation/flows/mod.rs` 作成
- [x] `wasm-pkg/src/generation/flows/types.rs` 作成
  - [x] PokemonGenerationConfig
  - [x] EncounterSlotConfig
  - [x] EggGenerationConfig
  - [x] OffsetConfig
  - [x] RawPokemonData, GeneratedPokemonData
  - [x] RawEggData, GeneratedEggData
- [x] `wasm-pkg/src/generation/flows/pokemon_wild.rs` 作成
  - [x] generate_wild_pokemon
  - [x] determine_gender
- [x] `wasm-pkg/src/generation/flows/pokemon_static.rs` 作成
  - [x] generate_static_pokemon
- [x] `wasm-pkg/src/generation/flows/egg.rs` 作成
  - [x] generate_egg
  - [x] determine_inheritance
  - [x] determine_hidden_ability
  - [x] determine_egg_gender
- [x] `wasm-pkg/src/generation/flows/generator.rs` 作成
  - [x] WildPokemonGenerator (オフセット対応)
  - [x] StaticPokemonGenerator (オフセット対応)
  - [x] EggGenerator (オフセット対応)
- [x] `wasm-pkg/src/generation/mod.rs` 更新
- [x] `cargo test` パス確認
- [x] `wasm-pack build --target web` 成功確認
