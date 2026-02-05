# EncounterResult 生成フロー統合 仕様書

## 1. 概要

### 1.1 目的

DustCloud / PokemonShadow エンカウントにおける「ポケモン出現 vs アイテム取得」判定結果を生成フローに統合し、TypeScript 側で利用可能にする。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| EncounterResult | エンカウント結果（Pokemon / Item） |
| ItemContent | アイテム内容（EvolutionStone / Jewel / Everstone / Feather） |
| DustCloud | 砂煙エンカウント（洞窟内） |
| PokemonShadow | 橋の影エンカウント（橋上） |

### 1.3 背景・問題

- `EncounterResult` / `ItemContent` の型・アルゴリズムは定義済み
- [encounter.rs](../../wasm-pkg/src/generation/algorithm/encounter.rs) に実装済みだが `#[allow(dead_code)]` 状態
- 生成フロー (`generate_wild_pokemon`) から呼び出されておらず、実質的に未統合
- `GeneratedPokemonData` に結果を格納するフィールドがない
- TypeScript 側で「ポケモン or アイテム」を判別できない

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 機能完全性 | DustCloud/PokemonShadow の結果判定が利用可能に |
| ユーザー体験 | アイテム取得ケースも表示可能 |
| 型安全性 | tsify による TypeScript 型生成 |

### 1.5 着手条件

- local_009（types モジュール構造化）完了済み

---

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/generation.rs` | 変更 | `EncounterResult`, `ItemContent` を追加（tsify 適用） |
| `wasm-pkg/src/generation/algorithm/encounter.rs` | 変更 | `#[allow(dead_code)]` 削除、`pub(crate)` 化 |
| `wasm-pkg/src/generation/flows/types.rs` | 変更 | `GeneratedPokemonData` に `encounter_result` フィールド追加 |
| `wasm-pkg/src/generation/flows/pokemon_wild.rs` | 変更 | DustCloud/PokemonShadow 時に判定関数呼び出し |
| `wasm-pkg/src/lib.rs` | 変更 | 新規型の再エクスポート |

---

## 3. 設計方針

### 3.1 消費パターン

#### DustCloud / PokemonShadow 共通

| 結果 | 乱数消費 | 備考 |
|------|----------|------|
| Pokemon | 1 | エンカウント判定のみ → 後続のポケモン生成処理へ |
| Item | 3 | エンカウント判定 + アイテム種別 + テーブル決定 |

```
LCG Seed
    │
    ├─ 1. エンカウント判定 (Pokemon/Item)
    │       │
    │       ├─ Pokemon → 通常のポケモン生成フローへ
    │       │
    │       └─ Item
    │            ├─ 2. アイテム種別決定
    │            └─ 3. テーブル決定 (TBD)
    │
    └─ 終了
```

### 3.2 Item 時のフロー終端処理

`GeneratedPokemonData` に `encounter_result` フィールドを追加する。

```rust
pub struct GeneratedPokemonData {
    // ...existing fields...
    pub encounter_result: EncounterResult,
    // Item 時は他フィールドがデフォルト値
}
```

**採用理由**:
- 既存の `PokemonGenerator` インターフェース（Iterator パターン）を維持
- TypeScript 側で統一的にハンドリング可能
- Item 時は `encounter_result` を見て分岐するだけ
- Generator の LCG 消費管理が単純（1 関数内で完結）

**トレードオフ**:
- Item 時に無意味なフィールドが存在する（デフォルト値で埋める）

### 3.3 不採用案

#### 案 A: Result 型で分岐

```rust
fn generate_wild_pokemon(...) -> Result<RawPokemonData, EncounterResult>
```

**不採用理由**: `Result` の `Err` が「エラー」ではなく「正常な Item 結果」という意味論的な違和感がある。

#### 案 B: 別関数で分離

```rust
fn determine_encounter_result(...) -> EncounterResult  // 判定のみ
fn generate_wild_pokemon(...) -> RawPokemonData        // Pokemon 確定時のみ
```

**不採用理由**:
- Generator の戻り値型を変更する必要がある（`enum WildGenerationResult { Pokemon(...), Item(...) }`）
- LCG 状態管理が複雑化（2 関数間での引き継ぎ、消費数の動的変動）
- 既存の Iterator パターンとの相性が悪い

---

## 4. 実装仕様

### 4.1 型定義（types/generation.rs に追加）

```rust
use serde::{Deserialize, Serialize};
use tsify::Tsify;

/// エンカウント結果
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(tag = "type", content = "item")]
pub enum EncounterResult {
    /// ポケモン出現
    Pokemon,
    /// アイテム取得
    Item(ItemContent),
}

/// アイテム内容
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ItemContent {
    /// 進化の石 (DustCloud)
    EvolutionStone,
    /// ジュエル (DustCloud)
    Jewel,
    /// かわらずのいし (DustCloud)
    Everstone,
    /// 羽根 (PokemonShadow)
    Feather,
}
```

### 4.2 GeneratedPokemonData 拡張（flows/types.rs）

```rust
pub struct GeneratedPokemonData {
    // ...existing fields...
    
    /// エンカウント結果（DustCloud/PokemonShadow 時に使用）
    /// 通常エンカウントでは常に Pokemon
    pub encounter_result: EncounterResult,
}
```

### 4.3 アルゴリズム関数（algorithm/encounter.rs）

既存の `dust_cloud_result` / `pokemon_shadow_result` を `pub(crate)` 化し、`#[allow(dead_code)]` を削除。

```rust
/// 砂煙の結果を判定
pub(crate) fn dust_cloud_result(slot_value: u32) -> EncounterResult {
    match slot_value {
        0..=69 => EncounterResult::Pokemon,
        _ => {
            let item = dust_cloud_item_content(slot_value);
            EncounterResult::Item(item)
        }
    }
}

/// 砂煙のアイテム内容を判定
pub(crate) fn dust_cloud_item_content(slot_value: u32) -> ItemContent {
    match slot_value {
        70 => ItemContent::EvolutionStone,
        71..=94 => ItemContent::Jewel,
        95..=99 => ItemContent::Everstone,
        _ => ItemContent::Jewel,
    }
}

/// 橋の影の結果を判定
pub(crate) fn pokemon_shadow_result(slot_value: u32) -> EncounterResult {
    match slot_value {
        0..=29 => EncounterResult::Pokemon,
        _ => EncounterResult::Item(ItemContent::Feather),
    }
}

/// DustCloud アイテム取得時の追加消費（TBD: 仮実装）
pub(crate) fn dust_cloud_item_table_consume(lcg: &mut Lcg64, _item: ItemContent) {
    // アイテム種別決定: 1 回
    let _ = lcg.next();
    // テーブル決定: 1 回
    let _ = lcg.next();
}

/// PokemonShadow アイテム取得時の追加消費（TBD: 仮実装）
pub(crate) fn pokemon_shadow_item_table_consume(lcg: &mut Lcg64) {
    // アイテム種別決定: 1 回
    let _ = lcg.next();
    // テーブル決定: 1 回
    let _ = lcg.next();
}
```

### 4.4 生成フロー統合（flows/pokemon_wild.rs）

```rust
pub fn generate_wild_pokemon(
    lcg: &mut Lcg64,
    config: &PokemonGenerationConfig,
) -> Result<RawPokemonData, GenerationError> {
    let enc_type = config.encounter_type;
    
    // DustCloud / PokemonShadow: エンカウント判定
    let encounter_result = match enc_type {
        EncounterType::DustCloud => {
            let rand = lcg.next();
            let slot_value = rand_to_percent(config.version, rand);
            let result = dust_cloud_result(slot_value);
            if let EncounterResult::Item(item) = result {
                dust_cloud_item_table_consume(lcg, item);
                return Ok(RawPokemonData::item_only(result));
            }
            result
        }
        EncounterType::PokemonShadow => {
            let rand = lcg.next();
            let slot_value = rand_to_percent(config.version, rand);
            let result = pokemon_shadow_result(slot_value);
            if let EncounterResult::Item(_) = result {
                pokemon_shadow_item_table_consume(lcg);
                return Ok(RawPokemonData::item_only(result));
            }
            result
        }
        _ => EncounterResult::Pokemon,
    };
    
    // 以下、通常のポケモン生成処理...
    // encounter_result を RawPokemonData に含める
}
```

### 4.5 RawPokemonData::item_only ヘルパー

```rust
impl RawPokemonData {
    /// Item 取得時のデータ生成
    pub fn item_only(encounter_result: EncounterResult) -> Self {
        Self {
            pid: 0,
            species_id: 0,
            level: 0,
            nature: Nature::Hardy, // デフォルト
            sync_applied: false,
            ability_slot: 0,
            gender: Gender::Unknown,
            shiny_type: ShinyType::None,
            held_item_slot: HeldItemSlot::None,
            encounter_result,
        }
    }
}
```

### 4.6 TypeScript 側の型定義（自動生成）

```typescript
// wasm_pkg.d.ts に自動生成される
export type EncounterResult = 
  | { type: "Pokemon" }
  | { type: "Item"; item: ItemContent };

export type ItemContent = 
  | "EvolutionStone"
  | "Jewel"
  | "Everstone"
  | "Feather";
```

---

## 5. テスト方針

### 5.1 ユニットテスト

| テスト名 | 検証内容 |
|----------|----------|
| `test_dust_cloud_result_pokemon` | slot_value 0-69 で Pokemon |
| `test_dust_cloud_result_item` | slot_value 70-99 で Item |
| `test_dust_cloud_item_content` | 70=EvolutionStone, 71-94=Jewel, 95-99=Everstone |
| `test_pokemon_shadow_result_pokemon` | slot_value 0-29 で Pokemon |
| `test_pokemon_shadow_result_item` | slot_value 30-99 で Item(Feather) |

### 5.2 統合テスト

| テスト名 | 検証内容 |
|----------|----------|
| `test_dust_cloud_pokemon_flow` | DustCloud Pokemon 時の消費数 = 1 + ポケモン生成消費 |
| `test_dust_cloud_item_flow` | DustCloud Item 時の消費数 = 3 |
| `test_pokemon_shadow_pokemon_flow` | PokemonShadow Pokemon 時の消費数 = 1 + ポケモン生成消費 |
| `test_pokemon_shadow_item_flow` | PokemonShadow Item 時の消費数 = 3 |

---

## 6. 実装チェックリスト

- [ ] `EncounterResult` / `ItemContent` を `types/generation.rs` に移動
- [ ] tsify 属性を適用
- [ ] `lib.rs` で再エクスポート
- [ ] `encounter.rs` の `#[allow(dead_code)]` 削除
- [ ] `encounter.rs` の関数を `pub(crate)` 化
- [ ] `dust_cloud_item_table_consume` / `pokemon_shadow_item_table_consume` 仮実装
- [ ] `RawPokemonData` に `encounter_result` フィールド追加
- [ ] `RawPokemonData::item_only` ヘルパー実装
- [ ] `generate_wild_pokemon` に DustCloud/PokemonShadow 判定統合
- [ ] `GeneratedPokemonData` に `encounter_result` フィールド追加
- [ ] ユニットテスト追加
- [ ] 統合テスト追加
- [ ] `cargo test` 全件パス
- [ ] `pnpm build:wasm` 成功
- [ ] TypeScript 型定義確認

---

## 7. 未解決事項 (TBD)

| 項目 | 状態 | 備考 |
|------|------|------|
| テーブル決定ロジック詳細 | TBD | 仮実装で消費のみ実行、具体的なアイテム ID 決定は後日 |
| Item 取得時の `RawPokemonData` フィールド値 | 仮決定 | デフォルト値で埋める（フロントで無視） |

---

## 関連ドキュメント

> **Note**: 以下のドキュメントは削除されました。Git履歴を参照してください。
> (削除対象: `spec/agent/mig_002/`)
>
> - mig_002/generation/algorithm/encounter.md - セクション 5, 5.5
> - mig_002/generation/flows/pokemon-wild.md - セクション 2.5

- [local_009/TYPES_MODULE_RESTRUCTURING.md](../local_009/TYPES_MODULE_RESTRUCTURING.md) - types モジュール構造化
