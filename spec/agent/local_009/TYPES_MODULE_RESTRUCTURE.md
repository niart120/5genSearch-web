# types モジュール構造化 仕様書

## 1. 概要

### 1.1 目的

local_006 実装完了時点で複雑化した wasm-pkg 内の型定義を整理し、保守性と拡張性を向上させる。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| tsify | Rust 型から TypeScript 型を自動生成するクレート |
| re-export | 下位モジュールの公開要素を上位モジュールから再公開すること |
| `pub(crate)` | クレート内部でのみ公開する可視性修飾子 |
| ネスト型 | 構造体フィールドとして使用される型 |

### 1.3 背景・問題

- `types/mod.rs` が 617 行に肥大化し、関連性の低い型が混在
- `generation/flows/types.rs` と `types/mod.rs` の役割境界が不明確
- `generation/algorithm` 内の関数が全て公開されており、内部実装と公開 API の区別がない
- `GeneratedPokemonData` のフィールド型 `HeldItemSlot` に tsify 属性がなく、TypeScript 型定義が欠落

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 型ファイル分割 | 変更時の影響範囲が明確化、コードナビゲーション向上 |
| 型配置基準の明確化 | 新規型追加時の判断が容易に |
| 公開範囲の最小化 | 意図しない外部依存の防止 |
| ネスト型の tsify 付与 | TypeScript 型定義の欠落を解消 |

### 1.5 着手条件

- local_006 までの実装が完了していること
- 既存テストが全て通過すること

## 2. 現状分析

### 2.1 モジュール構成

```
wasm-pkg/src/
├── lib.rs                    # エントリポイント + re-export (65行)
├── types/
│   └── mod.rs                # 共通型定義 (617行) ← 肥大化
├── core/                     # 計算コア
├── datetime_search/          # 起動時刻検索
├── generation/
│   ├── algorithm/            # 個別アルゴリズム (全 pub)
│   │   ├── encounter.rs      # HeldItemSlot (tsify なし)
│   │   └── iv.rs             # ParentRole, InheritanceSlot (tsify なし)
│   └── flows/
│       └── types.rs          # フロー専用型 (366行)
└── misc/                     # MtSeed検索・Needle検索
```

### 2.2 tsify 属性が欠落しているネスト型

| 型 | 定義場所 | 使用箇所 | 問題 |
|----|----------|----------|------|
| `HeldItemSlot` | `generation/algorithm/encounter.rs` | `GeneratedPokemonData.held_item_slot` | TS 型定義なし |
| `ParentRole` | `generation/algorithm/iv.rs` | 内部のみ (フラット化済み) | - |
| `InheritanceSlot` | `generation/algorithm/iv.rs` | 内部のみ (フラット化済み) | - |

### 2.3 types/mod.rs の内訳 (現状)

| カテゴリ | 含まれる型 | 行数概算 |
|----------|-----------|----------|
| 基本列挙型 | `Hardware`, `RomVersion`, `RomRegion`, `Nature`, `Gender`, `AbilitySlot`, `ShinyType` | ~130行 |
| Seed 型 | `LcgSeed`, `MtSeed`, `NeedleDirection` | ~80行 |
| IV 型 | `IV_VALUE_UNKNOWN`, `IvSet`, `Ivs` | ~100行 |
| 設定型 | `DsConfig`, `SearchSegment`, `VCountTimer0Range`, `DatetimeParams` | ~100行 |
| 生成型 | `EncounterType`, `StartMode`, `SaveState`, `GameStartConfig`, `LeadAbilityEffect`, `GenderRatio`, `GenerationSource` | ~200行 |

### 2.4 generation/flows/types.rs の内訳

| カテゴリ | 含まれる型 | TS公開 |
|----------|-----------|--------|
| エンカウント関連 | `EncounterMethod`, `MovingEncounterLikelihood`, `MovingEncounterInfo`, `SpecialEncounterDirection`, `SpecialEncounterInfo` | あり |
| 内部設定 | `PokemonGenerationConfig`, `EncounterSlotConfig`, `EggGenerationConfig`, `OffsetConfig`, `GenerationScheme` | なし |
| 生成結果 | `RawPokemonData`, `GeneratedPokemonData`, `RawEggData`, `GeneratedEggData`, `GenerationError` | 一部あり |

## 3. リファクタリング方針

### 3.1 types モジュール分割

#### 3.1.1 分割基準

- **ドメイン単位**でファイルを分割
- 後方互換性は考慮しない（破壊的変更を許容）

#### 3.1.2 新規モジュール構成

```
types/
├── mod.rs          # サブモジュール宣言 + 統合 re-export
├── seeds.rs        # LcgSeed, MtSeed, NeedleDirection
├── config.rs       # Hardware, RomVersion, RomRegion, DsConfig, SearchSegment, VCountTimer0Range, DatetimeParams
├── pokemon.rs      # Nature, Gender, AbilitySlot, ShinyType, GenderRatio, Ivs, IV_VALUE_UNKNOWN, IvSet, HeldItemSlot
└── generation.rs   # EncounterType, EncounterMethod, StartMode, SaveState, GameStartConfig, LeadAbilityEffect,
                    # MovingEncounterLikelihood, MovingEncounterInfo, SpecialEncounterDirection, SpecialEncounterInfo,
                    # GenerationSource, GeneratedPokemonData, GeneratedEggData
```

#### 3.1.3 ファイル配置の根拠

| ファイル | 配置根拠 |
|----------|----------|
| `seeds.rs` | 乱数シード関連（計算コアの入出力） |
| `config.rs` | DS本体・起動条件の設定（ハードウェア依存） |
| `pokemon.rs` | ポケモン個体のドメイン情報（ゲームロジック依存） |
| `generation.rs` | 生成処理の入出力型（生成フローで使用） |

### 3.2 generation 配下の型統合

#### 3.2.1 移動対象

**`generation/algorithm/*.rs` → `types/pokemon.rs`**:
- `HeldItemSlot` (tsify 属性を追加)

**`generation/flows/types.rs` → `types/generation.rs`**:
- `EncounterMethod`
- `MovingEncounterLikelihood`, `MovingEncounterInfo`
- `SpecialEncounterDirection`, `SpecialEncounterInfo`
- `GeneratedPokemonData`, `GeneratedEggData`

**`generation/flows/types.rs` に残す型**:
- `PokemonGenerationConfig`, `EncounterSlotConfig`, `EggGenerationConfig` (内部設定)
- `OffsetConfig`, `GenerationScheme` (内部設定)
- `RawPokemonData`, `RawEggData` (中間データ)
- `GenerationError` (内部エラー)

### 3.3 tsify 属性の追加

| 型 | 対応 |
|----|------|
| `HeldItemSlot` | `#[derive(Tsify)]` + `#[tsify(into_wasm_abi, from_wasm_abi)]` を追加 |

### 3.4 algorithm/flows の公開範囲

#### 3.4.1 現状

```rust
// generation/algorithm/mod.rs
pub use encounter::{ ... };  // 全て pub
pub use iv::{ ... };
pub use nature::{ ... };
pub use pid::{ ... };
pub use needle::{ ... };
```

#### 3.4.2 変更後

```rust
// generation/algorithm/mod.rs
pub(crate) use encounter::{ ... };
pub(crate) use iv::{ ... };
pub(crate) use nature::{ ... };
pub(crate) use pid::{ ... };

// misc/needle_search.rs からも参照されるため pub を維持
pub use needle::{calc_report_needle_direction, calculate_needle_direction};
```

## 4. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `types/mod.rs` | 変更 | サブモジュール宣言 + re-export に変更 |
| `types/seeds.rs` | 新規 | Seed 型を移動 |
| `types/config.rs` | 新規 | ハードウェア列挙型 + 設定型を移動 |
| `types/pokemon.rs` | 新規 | ポケモンドメイン型を移動 + HeldItemSlot を追加 |
| `types/generation.rs` | 新規 | 生成関連型を移動 + flows/types.rs から TS公開型を移動 |
| `generation/flows/types.rs` | 変更 | TS公開型を削除、types/ からの import に変更 |
| `generation/algorithm/encounter.rs` | 変更 | `HeldItemSlot` を削除（types/ へ移動） |
| `generation/algorithm/mod.rs` | 変更 | `pub` → `pub(crate)` に変更 |
| `lib.rs` | 変更 | re-export を更新 |

## 5. 実装仕様

### 5.1 types/seeds.rs

```rust
//! 乱数シード型

use serde::{Deserialize, Serialize};
use tsify::Tsify;

/// LCG Seed (64bit)
#[derive(Tsify, Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi, large_number_types_as_bigints)]
#[serde(transparent)]
#[repr(transparent)]
pub struct LcgSeed(pub u64);

// ... MtSeed, NeedleDirection
```

### 5.2 types/config.rs

```rust
//! 設定型

use serde::{Deserialize, Serialize};
use tsify::Tsify;

/// DS ハードウェア種別
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum Hardware { Ds, DsLite, Dsi, Dsi3ds }

/// ROM バージョン
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum RomVersion { Black, White, Black2, White2 }

// ... RomRegion, DsConfig, SearchSegment, VCountTimer0Range, DatetimeParams
```

### 5.3 types/pokemon.rs

```rust
//! ポケモンドメイン型

use serde::{Deserialize, Serialize};
use tsify::Tsify;

/// 性格
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[repr(u8)]
pub enum Nature { Hardy = 0, /* ... */ }

/// 持ち物スロット
#[derive(Tsify, Clone, Copy, Debug, PartialEq, Eq, Default, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum HeldItemSlot { Common, Rare, VeryRare, #[default] None }

// ... Gender, AbilitySlot, ShinyType, GenderRatio, Ivs, IV_VALUE_UNKNOWN
```

### 5.4 types/generation.rs

```rust
//! 生成関連型

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use super::config::DatetimeParams;
use super::pokemon::{Gender, HeldItemSlot, Ivs, Nature, ShinyType};
use super::seeds::{LcgSeed, NeedleDirection};

/// エンカウント種別
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum EncounterType { Normal, ShakingGrass, /* ... */ }

/// 完全な個体データ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GeneratedPokemonData { /* ... */ }

// ... EncounterMethod, MovingEncounterInfo, SpecialEncounterInfo, GeneratedEggData, GenerationSource
```

### 5.5 types/mod.rs (変更後)

```rust
//! 共通型定義

mod seeds;
mod config;
mod pokemon;
mod generation;

pub use seeds::*;
pub use config::*;
pub use pokemon::*;
pub use generation::*;
```

### 5.6 generation/algorithm/mod.rs (変更後)

```rust
//! 生成アルゴリズム

pub mod encounter;
pub mod game_offset;
pub mod iv;
pub mod nature;
pub mod needle;
pub mod pid;

// クレート内部のみ公開
pub(crate) use encounter::{
    EncounterResult, ItemContent, calculate_encounter_slot, check_moving_encounter,
    determine_held_item_slot, dust_cloud_result, encounter_type_supports_held_item,
    fishing_encounter_slot, fishing_success, generate_moving_encounter_info,
    generate_special_encounter_info, is_moving_encounter_type, is_special_encounter_type,
    normal_encounter_slot, pokemon_shadow_result, rand_to_percent, special_encounter_direction,
    special_encounter_trigger, surfing_encounter_slot,
};
pub(crate) use game_offset::{apply_game_offset, calculate_game_offset, create_offset_lcg};
pub(crate) use iv::{
    InheritanceSlot, ParentRole, apply_inheritance, extract_iv, generate_rng_ivs,
    generate_rng_ivs_with_offset, generate_roamer_ivs,
};
pub(crate) use nature::{
    EverstonePlan, determine_egg_nature, determine_nature, nature_roll, perform_sync_check,
    supports_sync, sync_check,
};
pub(crate) use pid::{
    apply_id_correction, apply_shiny_lock, calculate_shiny_type, generate_base_pid,
    generate_egg_pid, generate_egg_pid_with_reroll, generate_event_pid, generate_wild_pid,
    generate_wild_pid_with_reroll,
};

// 外部公開 (misc/needle_search.rs から参照)
pub use needle::{calc_report_needle_direction, calculate_needle_direction};
```

## 6. テスト方針

### 6.1 リファクタリング前後の動作検証

| テスト | 検証内容 |
|--------|----------|
| `cargo test` | 全ユニットテスト通過 |
| `cargo clippy` | 警告なし |
| `pnpm build:wasm` | WASM ビルド成功 |

### 6.2 TypeScript 型出力の検証

| 検証項目 | 方法 |
|----------|------|
| `HeldItemSlot` 型追加 | `wasm_pkg.d.ts` に型定義が出力されていることを確認 |
| 既存型の維持 | 主要な型が維持されていることを確認 |

### 6.3 パフォーマンス回帰テスト

- WASM バイナリサイズの比較

## 7. 実装チェックリスト

- [ ] types/seeds.rs 作成
- [ ] types/config.rs 作成
- [ ] types/pokemon.rs 作成 (HeldItemSlot に tsify 追加)
- [ ] types/generation.rs 作成
- [ ] types/mod.rs をサブモジュール構成に変更
- [ ] generation/flows/types.rs から TS公開型を移動
- [ ] generation/algorithm/encounter.rs から HeldItemSlot を削除
- [ ] generation/algorithm/mod.rs の公開範囲を変更
- [ ] lib.rs の re-export を更新
- [ ] cargo test 通過確認
- [ ] cargo clippy 通過確認
- [ ] pnpm build:wasm 成功確認
- [ ] wasm_pkg.d.ts に HeldItemSlot が出力されていることを確認
