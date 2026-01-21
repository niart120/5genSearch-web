# 生成アルゴリズム 仕様書

## 1. 概要

### 1.1 目的

ポケモン個体生成に必要なアルゴリズム群を実装する。mig_002 仕様書の Phase 4 (生成機能層) - アルゴリズム部分に対応。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| IV | 個体値 (Individual Values)。0-31 の 6種類 |
| PID | 性格値 (Personality ID)。32bit 整数 |
| ShinyType | 色違い種別 (None / Star / Square) |
| NeedleDirection | 針方向 (0-7, 8分割) |
| Nature | 性格 (25 種類) |
| EncounterSlot | エンカウントスロット (0-11 等) |
| GameOffset | ゲーム起動時の固定乱数消費数 |

### 1.3 背景・問題

- local_001-003 で基盤レイヤ (types, core, datetime_search) が実装済み
- 個体生成に必要なアルゴリズムを generation/algorithm/ に実装

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| IV 生成 | MT19937 による乱数 IV 生成と遺伝処理 |
| PID 生成 | 色違い判定・リロール対応 |
| 性格決定 | シンクロ・かわらずのいし対応 |
| エンカウント | スロット/レベル/持ち物決定 |
| GameOffset | 起動状態別のオフセット計算 |

### 1.5 着手条件

- local_001 (types/, core/) が完了
- local_002 (core/sha1/) が完了
- local_003 (datetime_search/) が完了

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/mod.rs` | 変更 | 共通型追加 (EncounterType, StartMode, SaveState, GameStartConfig, LeadAbilityEffect, GenderRatio, Ivs), Nature::from_u8() 追加 |
| `wasm-pkg/src/lib.rs` | 変更 | generation モジュール追加 |
| `wasm-pkg/src/generation/mod.rs` | 新規 | モジュール宣言 |
| `wasm-pkg/src/generation/algorithm/mod.rs` | 新規 | サブモジュール宣言 |
| `wasm-pkg/src/generation/algorithm/iv.rs` | 新規 | IV 生成・遺伝 |
| `wasm-pkg/src/generation/algorithm/pid.rs` | 新規 | PID 生成・色違い判定 |
| `wasm-pkg/src/generation/algorithm/nature.rs` | 新規 | 性格決定・シンクロ |
| `wasm-pkg/src/generation/algorithm/needle.rs` | 新規 | 針方向計算 |
| `wasm-pkg/src/generation/algorithm/encounter.rs` | 新規 | エンカウント処理 |
| `wasm-pkg/src/generation/algorithm/game_offset.rs` | 新規 | GameOffset 計算 |

## 3. 設計方針

### 3.1 モジュール構成

```
wasm-pkg/src/
├── lib.rs                      # generation モジュール追加
└── generation/
    ├── mod.rs                  # サブモジュール宣言
    └── algorithm/
        ├── mod.rs              # re-export
        ├── iv.rs               # IV 生成・遺伝
        ├── pid.rs              # PID 生成・色違い判定
        ├── nature.rs           # 性格決定・シンクロ
        ├── needle.rs           # 針方向計算
        ├── encounter.rs        # エンカウント処理
        └── game_offset.rs      # GameOffset 計算
```

### 3.2 依存関係

```
types/ + core/lcg + core/mt
           ↓
generation/algorithm/*.rs
```

### 3.3 types モジュールへの型追加

本仕様で使用する共通型を `types/mod.rs` に追加する。

| 型名 | 用途 |
|------|------|
| `Ivs` | 個体値セット (構造体版、0-31 + Unknown対応) |
| `EncounterType` | エンカウント種別 |
| `StartMode` | 起動方法 (NewGame / Continue) |
| `SaveState` | セーブ状態 (NoSave / WithSave / WithMemoryLink) |
| `GameStartConfig` | 起動設定 |
| `LeadAbilityEffect` | 先頭ポケモン特性効果 |
| `GenderRatio` | 性別比 |

また、既存の `Nature` enum に `from_u8()` メソッドを追加する（性格決定アルゴリズムで使用）。

## 4. 実装仕様

### 4.1 types/mod.rs への追加

#### 4.1.1 Ivs 構造体

既存の `IvSet = [u8; 6]` を構造体版に置き換える。tsify による TypeScript 型生成に対応。

```rust
use serde::{Deserialize, Serialize};
use tsify::Tsify;

/// Unknown IV sentinel value (親個体の不明IV等で使用)
pub const IV_VALUE_UNKNOWN: u8 = 32;

/// 個体値セット
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
        Self { hp, atk, def, spa, spd, spe }
    }

    /// 全て同じ値で初期化
    pub const fn uniform(value: u8) -> Self {
        Self { hp: value, atk: value, def: value, spa: value, spd: value, spe: value }
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
```

#### 4.1.2 EncounterType

```rust
/// エンカウント種別
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum EncounterType {
    // 野生エンカウント
    Normal,         // 草むら・洞窟
    ShakingGrass,   // 揺れる草むら
    DustCloud,      // 砂煙
    PokemonShadow,  // 橋の影
    Surfing,        // なみのり
    SurfingBubble,  // 水泡
    Fishing,        // 釣り
    FishingBubble,  // 釣り + 水泡
    // 固定エンカウント
    StaticSymbol,   // 固定シンボル
    StaticStarter,  // 御三家
    StaticFossil,   // 化石
    StaticEvent,    // イベント配布
    Roamer,         // 徘徊
}
```

#### 4.1.3 StartMode / SaveState / GameStartConfig

```rust
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
```

#### 4.1.4 LeadAbilityEffect

```rust
/// 先頭ポケモンの特性効果
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum LeadAbilityEffect {
    /// 特性効果なし
    None,
    /// シンクロ: 50% で性格一致
    Synchronize(Nature),
    /// ふくがん: 持ち物確率上昇
    CompoundEyes,
}

impl Default for LeadAbilityEffect {
    fn default() -> Self {
        Self::None
    }
}
```

#### 4.1.5 GenderRatio

```rust
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
```

#### 4.1.6 Nature への from_u8 メソッド追加

`nature.rs` の `nature_roll()` で得た `u8` 値 (0-24) を `Nature` に変換するために必要。

```rust
impl Nature {
    /// u8 値から Nature に変換 (0-24)
    ///
    /// 25 以上の値は modulo 25 で正規化される。
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
```

### 4.2 generation/algorithm/iv.rs

参照: [mig_002/generation/algorithm/iv-inheritance.md](../mig_002/generation/algorithm/iv-inheritance.md)

```rust
//! IV 生成・遺伝アルゴリズム

use crate::core::mt::Mt19937;
use crate::types::{Ivs, MtSeed};

/// MT19937 出力から IV を抽出 (0-31)
#[inline]
pub fn extract_iv(mt_output: u32) -> u8 {
    (mt_output >> 27) as u8
}

/// 乱数 IV を生成 (野生・固定シンボル用)
///
/// MT19937 の最初の 7 回を破棄後、6 回取得。
pub fn generate_rng_ivs(seed: MtSeed) -> Ivs {
    let mut mt = Mt19937::new(seed.value());

    // 最初の 7 回を破棄
    for _ in 0..7 {
        mt.next();
    }

    Ivs::new(
        extract_iv(mt.next()), // HP
        extract_iv(mt.next()), // Atk
        extract_iv(mt.next()), // Def
        extract_iv(mt.next()), // SpA
        extract_iv(mt.next()), // SpD
        extract_iv(mt.next()), // Spe
    )
}

/// 指定オフセットで IV 生成
///
/// BW2 固定シンボル等、オフセットが異なるケースで使用。
pub fn generate_rng_ivs_with_offset(seed: MtSeed, offset: u32) -> Ivs {
    let mut mt = Mt19937::new(seed.value());

    for _ in 0..offset {
        mt.next();
    }

    Ivs::new(
        extract_iv(mt.next()),
        extract_iv(mt.next()),
        extract_iv(mt.next()),
        extract_iv(mt.next()),
        extract_iv(mt.next()),
        extract_iv(mt.next()),
    )
}

/// 徘徊ポケモン用 IV 生成 (特殊順序)
///
/// HP/Atk のみ乱数、他は 0 固定。
pub fn generate_roamer_ivs(seed: MtSeed) -> Ivs {
    let mut mt = Mt19937::new(seed.value());

    for _ in 0..7 {
        mt.next();
    }

    let hp = extract_iv(mt.next());
    let atk = extract_iv(mt.next());

    Ivs::new(hp, atk, 0, 0, 0, 0)
}

/// 親の役割
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum ParentRole {
    #[default]
    Male,
    Female,
}

/// 遺伝スロット
#[derive(Clone, Copy, Debug, Default)]
pub struct InheritanceSlot {
    /// 遺伝先ステータス (0=HP, 1=Atk, 2=Def, 3=SpA, 4=SpD, 5=Spe)
    pub stat: usize,
    /// 遺伝元親
    pub parent: ParentRole,
}

/// 遺伝適用
pub fn apply_inheritance(
    rng_ivs: &Ivs,
    parent_male: &Ivs,
    parent_female: &Ivs,
    slots: &[InheritanceSlot; 3],
) -> Ivs {
    let mut result = *rng_ivs;

    for slot in slots {
        let parent_iv = match slot.parent {
            ParentRole::Male => parent_male.get(slot.stat),
            ParentRole::Female => parent_female.get(slot.stat),
        };
        result.set(slot.stat, parent_iv);
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_rng_ivs() {
        let seed = MtSeed::new(0x12345678);
        let ivs = generate_rng_ivs(seed);
        // 各 IV は 0-31 の範囲
        assert!(ivs.hp <= 31);
        assert!(ivs.atk <= 31);
        assert!(ivs.def <= 31);
        assert!(ivs.spa <= 31);
        assert!(ivs.spd <= 31);
        assert!(ivs.spe <= 31);
    }

    #[test]
    fn test_apply_inheritance() {
        let rng_ivs = Ivs::new(10, 10, 10, 10, 10, 10);
        let male = Ivs::new(31, 0, 0, 0, 0, 0);
        let female = Ivs::new(0, 31, 0, 0, 0, 0);
        let slots = [
            InheritanceSlot { stat: 0, parent: ParentRole::Male },   // HP from male
            InheritanceSlot { stat: 1, parent: ParentRole::Female }, // Atk from female
            InheritanceSlot { stat: 2, parent: ParentRole::Male },   // Def from male
        ];
        let result = apply_inheritance(&rng_ivs, &male, &female, &slots);
        assert_eq!(result.hp, 31);
        assert_eq!(result.atk, 31);
        assert_eq!(result.def, 0);
    }
}
```

### 4.3 generation/algorithm/pid.rs

参照: [mig_002/generation/algorithm/pid-shiny.md](../mig_002/generation/algorithm/pid-shiny.md)

`ShinyType` は `types/mod.rs` に既存のため、そちらを使用する。

```rust
//! PID 生成・色違い判定アルゴリズム

use crate::core::lcg::Lcg64;
use crate::types::ShinyType;

/// 色違い判定
///
/// - `xor == 0`: Square (ひし形)
/// - `1 <= xor < 8`: Star (星型)
/// - `8 <= xor`: None (通常)
#[inline]
pub fn calculate_shiny_type(pid: u32, tid: u16, sid: u16) -> ShinyType {
    let pid_high = (pid >> 16) as u16;
    let pid_low = (pid & 0xFFFF) as u16;
    let xor = pid_high ^ pid_low ^ tid ^ sid;

    if xor == 0 {
        ShinyType::Square
    } else if xor < 8 {
        ShinyType::Star
    } else {
        ShinyType::None
    }
}

/// 野生 PID 生成 (1回消費)
#[inline]
pub fn generate_wild_pid(r: u32, tid: u16, sid: u16) -> u32 {
    let base = r ^ (tid as u32) ^ (sid as u32);
    let high = base & 0xFFFF0000;
    let low = r & 0xFFFF;
    high | low
}

/// イベント/御三家 PID 生成 (1回消費、ID 補正なし)
#[inline]
pub fn generate_event_pid(r: u32) -> u32 {
    r
}

/// 孵化 PID 生成 (2回消費)
#[inline]
pub fn generate_egg_pid(r1: u32, r2: u32) -> u32 {
    let low = r1 >> 16;
    let high = r2 & 0xFFFF0000;
    high | low
}

/// 色違いロック適用
/// PID を変更して色違いにならないようにする
pub fn apply_shiny_lock(pid: u32, tid: u16, sid: u16) -> u32 {
    if calculate_shiny_type(pid, tid, sid) != ShinyType::None {
        pid ^ 0x10000000 // 上位ビットを反転
    } else {
        pid
    }
}

/// ひかるおまもり付き野生 PID 生成
/// 最大 reroll_count 回リロール
pub fn generate_wild_pid_with_reroll(
    lcg: &mut Lcg64,
    tid: u16,
    sid: u16,
    reroll_count: u8,
) -> (u32, ShinyType) {
    for _ in 0..reroll_count {
        let r = lcg.next();
        let pid = generate_wild_pid(r, tid, sid);
        let shiny = calculate_shiny_type(pid, tid, sid);
        if shiny != ShinyType::None {
            return (pid, shiny);
        }
    }

    // 最後の試行
    let r = lcg.next();
    let pid = generate_wild_pid(r, tid, sid);
    let shiny = calculate_shiny_type(pid, tid, sid);
    (pid, shiny)
}

/// 孵化 PID 生成 (リロール付き)
pub fn generate_egg_pid_with_reroll(
    lcg: &mut Lcg64,
    tid: u16,
    sid: u16,
    reroll_count: u8,
) -> (u32, ShinyType) {
    for _ in 0..reroll_count {
        let r1 = lcg.next();
        let r2 = lcg.next();
        let pid = generate_egg_pid(r1, r2);
        let shiny = calculate_shiny_type(pid, tid, sid);
        if shiny != ShinyType::None {
            return (pid, shiny);
        }
    }

    // 最後の試行
    let r1 = lcg.next();
    let r2 = lcg.next();
    let pid = generate_egg_pid(r1, r2);
    let shiny = calculate_shiny_type(pid, tid, sid);
    (pid, shiny)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shiny_type_square() {
        // xor = 0 の場合 → Square
        let pid = 0x12341234u32;
        let tid = 0x1234u16;
        let sid = 0x0000u16;
        assert_eq!(calculate_shiny_type(pid, tid, sid), ShinyType::Square);
    }

    #[test]
    fn test_shiny_type_star() {
        // xor = 1 の場合 → Star
        let pid = 0x12341235u32;
        let tid = 0x1234u16;
        let sid = 0x0000u16;
        assert_eq!(calculate_shiny_type(pid, tid, sid), ShinyType::Star);
    }

    #[test]
    fn test_shiny_type_none() {
        // xor >= 8 の場合 → None
        let pid = 0x12345678u32;
        let tid = 0x0000u16;
        let sid = 0x0000u16;
        assert_eq!(calculate_shiny_type(pid, tid, sid), ShinyType::None);
    }
}
```

### 4.4 generation/algorithm/nature.rs

参照: [mig_002/generation/algorithm/nature-sync.md](../mig_002/generation/algorithm/nature-sync.md)

```rust
//! 性格決定・シンクロアルゴリズム

use crate::core::lcg::Lcg64;
use crate::types::{EncounterType, LeadAbilityEffect, Nature};

/// 乱数から性格 ID を決定 (0-24)
#[inline]
pub fn nature_roll(r: u32) -> u8 {
    ((r as u64 * 25) >> 32) as u8
}

/// シンクロ成否判定
#[inline]
pub fn sync_check(r: u32) -> bool {
    ((r as u64 * 2) >> 32) == 1
}

/// シンクロ対応エンカウントかどうか
pub fn supports_sync(encounter_type: EncounterType) -> bool {
    matches!(
        encounter_type,
        EncounterType::Normal
            | EncounterType::Surfing
            | EncounterType::Fishing
            | EncounterType::ShakingGrass
            | EncounterType::DustCloud
            | EncounterType::PokemonShadow
            | EncounterType::SurfingBubble
            | EncounterType::FishingBubble
            | EncounterType::StaticSymbol
    )
}

/// シンクロ判定を実行
/// 対応エンカウントでは常に乱数を消費
pub fn perform_sync_check(
    lcg: &mut Lcg64,
    encounter_type: EncounterType,
    lead_ability: &LeadAbilityEffect,
) -> bool {
    if !supports_sync(encounter_type) {
        return false; // 乱数消費なし
    }

    let r = lcg.next(); // 対応エンカウントでは常に消費

    matches!(lead_ability, LeadAbilityEffect::Synchronize(_)) && sync_check(r)
}

/// 性格決定 (シンクロ考慮)
pub fn determine_nature(
    lcg: &mut Lcg64,
    sync_success: bool,
    lead_ability: &LeadAbilityEffect,
) -> (Nature, bool) {
    let rng_nature = nature_roll(lcg.next()); // 常に消費

    if sync_success {
        if let LeadAbilityEffect::Synchronize(nature) = lead_ability {
            return (*nature, true);
        }
    }
    (Nature::from_u8(rng_nature), false)
}

/// かわらずのいし効果
#[derive(Clone, Copy, Debug, Default)]
pub enum EverstonePlan {
    #[default]
    None,
    Fixed(Nature),
}

/// 孵化時の性格決定
pub fn determine_egg_nature(lcg: &mut Lcg64, everstone: EverstonePlan) -> Nature {
    let nature_idx = nature_roll(lcg.next());

    match everstone {
        EverstonePlan::None => Nature::from_u8(nature_idx),
        EverstonePlan::Fixed(parent_nature) => {
            // かわらずのいし判定: 最上位ビットが 0 で成功
            let inherit = (lcg.next() >> 31) == 0;
            if inherit {
                parent_nature
            } else {
                Nature::from_u8(nature_idx)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nature_roll() {
        // 0 〜 24 の範囲
        for i in 0..100 {
            let r = (i as u32) * 0x01000000;
            let nature = nature_roll(r);
            assert!(nature < 25);
        }
    }

    #[test]
    fn test_sync_check() {
        // 最上位ビット 1 で成功
        assert!(sync_check(0x80000000));
        assert!(!sync_check(0x7FFFFFFF));
    }
}
```

### 4.5 generation/algorithm/needle.rs

参照: [mig_002/generation/algorithm/needle.md](../mig_002/generation/algorithm/needle.md)

`NeedleDirection` は `types/mod.rs` に既存の enum を使用する。  
ここでは LCG Seed から針方向を計算する関数を提供する。

```rust
//! 針方向計算アルゴリズム

use crate::types::{LcgSeed, NeedleDirection};

/// LCG Seed から針方向を計算
///
/// Seed の上位 32bit のうち、さらに上位 3bit (bit 61-63) を取得して 0-7 に変換。
pub fn calculate_needle_direction(seed: LcgSeed) -> NeedleDirection {
    let value = seed.value();
    let upper32 = (value >> 32) as u32;
    let direction = (upper32 >> 29) as u8;
    NeedleDirection::from_value(direction)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_needle_direction() {
        // 上位3ビットが 0b000 → N (0)
        let seed = LcgSeed::new(0x0000000000000000);
        assert_eq!(calculate_needle_direction(seed), NeedleDirection::N);

        // 上位3ビットが 0b111 → NW (7)
        let seed = LcgSeed::new(0xE000000000000000);
        assert_eq!(calculate_needle_direction(seed), NeedleDirection::NW);

        // 上位3ビットが 0b100 → S (4)
        let seed = LcgSeed::new(0x8000000000000000);
        assert_eq!(calculate_needle_direction(seed), NeedleDirection::S);
    }
}
```

### 4.6 generation/algorithm/encounter.rs

参照: [mig_002/generation/algorithm/encounter.md](../mig_002/generation/algorithm/encounter.md)

```rust
//! エンカウント処理アルゴリズム

use crate::types::{EncounterType, LeadAbilityEffect, RomVersion};

/// 百分率換算値を計算 (0-99)
#[inline]
pub fn rand_to_percent(version: RomVersion, rand_value: u32) -> u32 {
    match version {
        RomVersion::Black | RomVersion::White => {
            ((rand_value as u64 * 0xFFFF / 0x290) >> 32) as u32
        }
        RomVersion::Black2 | RomVersion::White2 => ((rand_value as u64 * 100) >> 32) as u32,
    }
}

/// 通常エンカウント・揺れる草むら: スロット決定 (12スロット)
pub fn normal_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=19 => 0,
        20..=39 => 1,
        40..=49 => 2,
        50..=59 => 3,
        60..=69 => 4,
        70..=79 => 5,
        80..=84 => 6,
        85..=89 => 7,
        90..=93 => 8,
        94..=97 => 9,
        98 => 10,
        _ => 11,
    }
}

/// なみのり・水泡なみのり: スロット決定 (5スロット)
pub fn surfing_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=59 => 0,
        60..=89 => 1,
        90..=94 => 2,
        95..=98 => 3,
        _ => 4,
    }
}

/// 釣り・水泡釣り: スロット決定 (5スロット)
pub fn fishing_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=39 => 0,
        40..=79 => 1,
        80..=94 => 2,
        95..=98 => 3,
        _ => 4,
    }
}

/// エンカウント種別に応じたスロット決定
///
/// 揺れる草むら / 土煙 / 橋の影 は通常エンカウントと同じ12スロット分布を使用
pub fn calculate_encounter_slot(
    encounter_type: EncounterType,
    rand_value: u32,
    version: RomVersion,
) -> u8 {
    let percent = rand_to_percent(version, rand_value);

    match encounter_type {
        EncounterType::Normal
        | EncounterType::ShakingGrass
        | EncounterType::DustCloud
        | EncounterType::PokemonShadow => normal_encounter_slot(percent),
        EncounterType::Surfing | EncounterType::SurfingBubble => surfing_encounter_slot(percent),
        EncounterType::Fishing | EncounterType::FishingBubble => fishing_encounter_slot(percent),
        _ => 0, // 固定エンカウント
    }
}

/// エンカウント結果
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EncounterResult {
    Pokemon,
    Item(ItemContent),
    Failed,
}

/// アイテム内容
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ItemContent {
    EvolutionStone,
    Jewel,
    Everstone,
    Feather,
}

/// 砂煙の結果を判定
pub fn dust_cloud_result(slot_value: u32) -> EncounterResult {
    match slot_value {
        0..=69 => EncounterResult::Pokemon,
        70 => EncounterResult::Item(ItemContent::EvolutionStone),
        71..=94 => EncounterResult::Item(ItemContent::Jewel),
        _ => EncounterResult::Item(ItemContent::Everstone),
    }
}

/// 橋の影の結果を判定
pub fn pokemon_shadow_result(slot_value: u32) -> EncounterResult {
    match slot_value {
        0..=29 => EncounterResult::Pokemon,
        _ => EncounterResult::Item(ItemContent::Feather),
    }
}

/// 釣り成功判定 (50%)
#[inline]
pub fn fishing_success(rand_value: u32) -> bool {
    ((rand_value as u64 * 2) >> 32) == 0
}

/// 持ち物スロット
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum HeldItemSlot {
    Common,
    Rare,
    VeryRare,
    #[default]
    None,
}

/// 持ち物判定
pub fn determine_held_item_slot(
    version: RomVersion,
    rand_value: u32,
    lead_ability: &LeadAbilityEffect,
    has_rare_item: bool,
) -> HeldItemSlot {
    let percent = rand_to_percent(version, rand_value);
    let has_compound_eyes = matches!(lead_ability, LeadAbilityEffect::CompoundEyes);

    if has_compound_eyes {
        match percent {
            0..=59 => HeldItemSlot::Common,
            60..=79 => HeldItemSlot::Rare,
            80..=84 if has_rare_item => HeldItemSlot::VeryRare,
            _ => HeldItemSlot::None,
        }
    } else {
        match percent {
            0..=49 => HeldItemSlot::Common,
            50..=54 => HeldItemSlot::Rare,
            55 if has_rare_item => HeldItemSlot::VeryRare,
            _ => HeldItemSlot::None,
        }
    }
}

/// 持ち物判定で乱数を消費するエンカウント種別
pub fn encounter_type_supports_held_item(encounter_type: EncounterType) -> bool {
    matches!(
        encounter_type,
        EncounterType::Surfing
            | EncounterType::SurfingBubble
            | EncounterType::Fishing
            | EncounterType::FishingBubble
            | EncounterType::ShakingGrass
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rand_to_percent_bw() {
        let result = rand_to_percent(RomVersion::Black, 0x80000000);
        assert!(result < 100);
    }

    #[test]
    fn test_normal_encounter_slot() {
        assert_eq!(normal_encounter_slot(0), 0);
        assert_eq!(normal_encounter_slot(19), 0);
        assert_eq!(normal_encounter_slot(20), 1);
        assert_eq!(normal_encounter_slot(99), 11);
    }

    #[test]
    fn test_dust_cloud_result() {
        assert_eq!(dust_cloud_result(0), EncounterResult::Pokemon);
        assert_eq!(dust_cloud_result(70), EncounterResult::Item(ItemContent::EvolutionStone));
        assert_eq!(dust_cloud_result(71), EncounterResult::Item(ItemContent::Jewel));
        assert_eq!(dust_cloud_result(95), EncounterResult::Item(ItemContent::Everstone));
    }
}
```

### 4.7 generation/algorithm/game_offset.rs

参照: [mig_002/generation/algorithm/game-offset.md](../mig_002/generation/algorithm/game-offset.md)

関数ベースの実装。`LcgSeed` を受け取り、起動設定に応じたオフセットを計算する。

```rust
//! Game Offset 計算アルゴリズム

use crate::core::lcg::Lcg64;
use crate::types::{GameStartConfig, LcgSeed, RomVersion, SaveState, StartMode};

/// Probability Table 閾値
const PT_THRESHOLD: u64 = 0x80000000;

/// 固定回数の乱数を消費
#[inline]
fn consume_random(lcg: &mut Lcg64, count: u32) -> u32 {
    for _ in 0..count {
        lcg.next();
    }
    count
}

/// Probability Table 処理 (条件を満たすまで消費)
#[inline]
fn probability_table_process(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    loop {
        let r = lcg.next();
        advances += 1;
        if (r as u64) < PT_THRESHOLD {
            break;
        }
    }
    advances
}

/// Probability Table 処理を複数回実行
#[inline]
fn probability_table_multiple(lcg: &mut Lcg64, count: u32) -> u32 {
    let mut total = 0;
    for _ in 0..count {
        total += probability_table_process(lcg);
    }
    total
}

// ===== BW パターン =====

fn bw_new_game_with_save(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += probability_table_multiple(lcg, 2);
    advances += consume_random(lcg, 3); // チラーミィ PID + ID
    advances += consume_random(lcg, 2); // TID/SID
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 4);
    advances
}

fn bw_new_game_no_save(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 4);
    advances
}

fn bw_continue(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 5);
    advances
}

// ===== BW2 パターン =====

fn bw2_new_game_with_memory_link(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 2);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 2);
    advances += consume_random(lcg, 3); // チラチーノ PID + ID
    advances += consume_random(lcg, 2); // TID/SID
    advances
}

fn bw2_new_game_with_save(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 3);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 2);
    advances += consume_random(lcg, 3); // チラチーノ PID + ID
    advances += consume_random(lcg, 2); // TID/SID
    advances
}

fn bw2_new_game_no_save(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 4);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 2);
    advances += consume_random(lcg, 3); // チラチーノ PID + ID
    advances += consume_random(lcg, 2); // TID/SID
    advances
}

fn bw2_continue_with_memory_link(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 2);
    advances += probability_table_multiple(lcg, 4);
    advances
}

fn bw2_continue_no_memory_link(lcg: &mut Lcg64) -> u32 {
    let mut advances = 0;
    advances += consume_random(lcg, 1);
    advances += probability_table_multiple(lcg, 1);
    advances += consume_random(lcg, 3);
    advances += probability_table_multiple(lcg, 4);
    advances
}

/// Game Offset を計算
///
/// 初期シード、ゲームバージョン、起動設定から固定乱数消費数を算出する。
pub fn calculate_game_offset(
    seed: LcgSeed,
    version: RomVersion,
    config: &GameStartConfig,
) -> Result<u32, String> {
    config.validate(version)?;

    let mut lcg = Lcg64::new(seed.value());
    let is_bw2 = matches!(version, RomVersion::Black2 | RomVersion::White2);

    let advances = match (is_bw2, config.start_mode, config.save_state) {
        // BW
        (false, StartMode::NewGame, SaveState::WithSave) => bw_new_game_with_save(&mut lcg),
        (false, StartMode::NewGame, SaveState::NoSave) => bw_new_game_no_save(&mut lcg),
        (false, StartMode::Continue, _) => bw_continue(&mut lcg),

        // BW2
        (true, StartMode::NewGame, SaveState::WithMemoryLink) => {
            bw2_new_game_with_memory_link(&mut lcg)
        }
        (true, StartMode::NewGame, SaveState::WithSave) => bw2_new_game_with_save(&mut lcg),
        (true, StartMode::NewGame, SaveState::NoSave) => bw2_new_game_no_save(&mut lcg),
        (true, StartMode::Continue, SaveState::WithMemoryLink) => {
            bw2_continue_with_memory_link(&mut lcg)
        }
        (true, StartMode::Continue, SaveState::WithSave | SaveState::NoSave) => {
            bw2_continue_no_memory_link(&mut lcg)
        }

        _ => return Err("Invalid combination".into()),
    };

    Ok(advances)
}

/// 初期 Seed に Game Offset を適用し、オフセット適用後の Seed を返す
pub fn apply_game_offset(
    seed: LcgSeed,
    version: RomVersion,
    config: &GameStartConfig,
) -> Result<LcgSeed, String> {
    let offset = calculate_game_offset(seed, version, config)?;
    let mut lcg = Lcg64::new(seed.value());
    lcg.jump(offset as u64);
    Ok(LcgSeed::new(lcg.seed()))
}

/// 初期 Seed に Game Offset を適用し、オフセット適用済みの Lcg64 を返す
///
/// 呼び出し側はそのまま乱数生成を続けられる。
pub fn create_offset_lcg(
    seed: LcgSeed,
    version: RomVersion,
    config: &GameStartConfig,
) -> Result<Lcg64, String> {
    let offset = calculate_game_offset(seed, version, config)?;
    let mut lcg = Lcg64::new(seed.value());
    lcg.jump(offset as u64);
    Ok(lcg)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bw_continue() {
        let seed = LcgSeed::new(0x12345678_00000000);
        let config = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::WithSave,
        };
        let offset = calculate_game_offset(seed, RomVersion::Black, &config);
        assert!(offset.is_ok());
        assert!(offset.unwrap() > 0);
    }

    #[test]
    fn test_bw2_new_game_no_save() {
        let seed = LcgSeed::new(0xABCDEF01_23456789);
        let config = GameStartConfig {
            start_mode: StartMode::NewGame,
            save_state: SaveState::NoSave,
        };
        let offset = calculate_game_offset(seed, RomVersion::Black2, &config);
        assert!(offset.is_ok());
        assert!(offset.unwrap() > 0);
    }

    #[test]
    fn test_invalid_combination() {
        let seed = LcgSeed::new(0x12345678_00000000);
        let config = GameStartConfig {
            start_mode: StartMode::Continue,
            save_state: SaveState::NoSave,
        };
        let result = calculate_game_offset(seed, RomVersion::Black, &config);
        assert!(result.is_err());
    }
}
```

### 4.8 generation/algorithm/mod.rs

```rust
//! 生成アルゴリズム

pub mod encounter;
pub mod game_offset;
pub mod iv;
pub mod nature;
pub mod needle;
pub mod pid;

pub use encounter::{
    calculate_encounter_slot, determine_held_item_slot, dust_cloud_result,
    encounter_type_supports_held_item, fishing_encounter_slot, fishing_success, normal_encounter_slot,
    pokemon_shadow_encounter_slot, pokemon_shadow_result, rand_to_percent, surfing_encounter_slot,
    EncounterResult, HeldItemSlot, ItemContent,
};
pub use game_offset::{apply_game_offset, calculate_game_offset};
pub use iv::{
    apply_inheritance, extract_iv, generate_rng_ivs, generate_rng_ivs_with_offset,
    generate_roamer_ivs, InheritanceSlot, ParentRole,
};
pub use nature::{
    determine_egg_nature, determine_nature, nature_roll, perform_sync_check, supports_sync,
    sync_check, EverstonePlan,
};
pub use needle::calculate_needle_direction;
pub use pid::{
    apply_shiny_lock, calculate_shiny_type, generate_egg_pid, generate_egg_pid_with_reroll,
    generate_event_pid, generate_wild_pid, generate_wild_pid_with_reroll,
};
```

### 4.9 generation/mod.rs

```rust
//! ポケモン生成機能

pub mod algorithm;

pub use algorithm::*;
```

### 4.10 lib.rs の更新

```rust
// 既存のモジュール宣言に追加
pub mod generation;

// types から re-export (追加分)
pub use types::{
    EncounterType, GameStartConfig, GenderRatio, Ivs, LeadAbilityEffect,
    SaveState, StartMode, IV_VALUE_UNKNOWN,
};

// generation から re-export
pub use generation::algorithm::{
    apply_game_offset, calculate_game_offset, calculate_needle_direction,
    EncounterResult, EverstonePlan, HeldItemSlot, InheritanceSlot, ItemContent, ParentRole,
};
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | テスト内容 |
|-----------|-----------|
| `iv.rs` | IV 生成範囲確認、遺伝適用 |
| `pid.rs` | 色違い判定、PID 生成形式 |
| `nature.rs` | 性格ロール範囲、シンクロ判定 |
| `encounter.rs` | スロット決定、百分率変換 |
| `game_offset.rs` | オフセット計算 |

### 5.2 コマンド

```powershell
cd wasm-pkg
cargo test
wasm-pack build --target web
```

## 6. 実装チェックリスト

- [x] `wasm-pkg/src/types/mod.rs` 更新
  - [x] Ivs 構造体追加
  - [x] IV_VALUE_UNKNOWN 定数追加
  - [x] EncounterType enum 追加
  - [x] StartMode enum 追加
  - [x] SaveState enum 追加
  - [x] GameStartConfig 構造体追加
  - [x] LeadAbilityEffect enum 追加
  - [x] GenderRatio enum 追加
  - [x] Nature::from_u8() メソッド追加
- [x] `wasm-pkg/src/generation/mod.rs` 作成
- [x] `wasm-pkg/src/generation/algorithm/mod.rs` 作成
- [x] `wasm-pkg/src/generation/algorithm/iv.rs` 作成
  - [x] extract_iv
  - [x] generate_rng_ivs, generate_rng_ivs_with_offset, generate_roamer_ivs
  - [x] ParentRole, InheritanceSlot, apply_inheritance
- [x] `wasm-pkg/src/generation/algorithm/pid.rs` 作成
  - [x] calculate_shiny_type (xor==0→Square, 1<=xor<8→Star)
  - [x] generate_wild_pid, generate_event_pid, generate_egg_pid
  - [x] リロール関数
- [x] `wasm-pkg/src/generation/algorithm/nature.rs` 作成
  - [x] nature_roll, sync_check
  - [x] perform_sync_check, determine_nature
  - [x] EverstonePlan, determine_egg_nature
- [x] `wasm-pkg/src/generation/algorithm/needle.rs` 作成
  - [x] calculate_needle_direction (既存 NeedleDirection を使用)
- [x] `wasm-pkg/src/generation/algorithm/encounter.rs` 作成
  - [x] rand_to_percent
  - [x] スロット決定関数群
  - [x] EncounterResult, ItemContent, HeldItemSlot
  - [x] determine_held_item_slot
- [x] `wasm-pkg/src/generation/algorithm/game_offset.rs` 作成
  - [x] 関数ベースのオフセット計算
  - [x] calculate_game_offset, apply_game_offset
- [x] `wasm-pkg/src/lib.rs` 更新
- [x] `cargo test` パス確認
- [x] `wasm-pack build --target web` 成功確認
