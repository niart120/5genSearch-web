# WASM API 仕様書: 型定義

tsify による型共有戦略と共通型定義。

## 1. tsify による型定義パターン

Rust 側の型定義から TypeScript 型を自動生成する。

```rust
use serde::{Deserialize, Serialize};
use tsify_next::Tsify;
use wasm_bindgen::prelude::*;
```

### 1.1 derive マクロパターン

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct ExampleStruct { /* ... */ }
```

- `Tsify`: TypeScript 型定義生成
- `Serialize, Deserialize`: serde-wasm-bindgen による JS ↔ Rust 変換
- `into_wasm_abi, from_wasm_abi`: 双方向変換を有効化

## 2. 基本列挙型

### 2.1 Hardware

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum Hardware {
    Ds,
    DsLite,
    Dsi,
    Dsi3ds,
}
```

```typescript
// 生成される TypeScript 型
export type Hardware = "Ds" | "DsLite" | "Dsi" | "Dsi3ds";
```

### 2.2 RomVersion

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum RomVersion {
    Black,
    White,
    Black2,
    White2,
}
```

```typescript
export type RomVersion = "Black" | "White" | "Black2" | "White2";
```

### 2.3 RomRegion

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum RomRegion {
    Jpn,
    Kor,
    Usa,
    Ger,
    Fra,
    Spa,
    Ita,
}
```

```typescript
export type RomRegion = "Jpn" | "Kor" | "Usa" | "Ger" | "Fra" | "Spa" | "Ita";
```

各リージョンは ROM 固有の Nazo 値と典型的な Timer0/VCount 範囲を持つ。

### 2.4 EncounterType

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum EncounterType {
    Normal,
    ShakingGrass,
    DustCloud,
    PokemonShadow,
    Surfing,
    SurfingBubble,
    Fishing,
    FishingBubble,
    StaticSymbol,
    StaticStarter,
    StaticFossil,
    StaticEvent,
    Roamer,
}
```

```typescript
export type EncounterType =
  | "Normal"
  | "ShakingGrass"
  | "DustCloud"
  | "PokemonShadow"
  | "Surfing"
  | "SurfingBubble"
  | "Fishing"
  | "FishingBubble"
  | "StaticSymbol"
  | "StaticStarter"
  | "StaticFossil"
  | "StaticEvent"
  | "Roamer";
```

### 2.5 GameMode

ゲーム起動モード。起動時刻からのオフセット計算に影響する。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum GameMode {
    BwNew,
    BwContinue,
    Bw2New,
    Bw2Continue,
}
```

```typescript
export type GameMode = "BwNew" | "BwContinue" | "Bw2New" | "Bw2Continue";
```

| 値 | ゲーム | 起動方法 |
|----|-------|---------|
| `BwNew` | BW | 最初から |
| `BwContinue` | BW | 続きから |
| `Bw2New` | BW2 | 最初から |
| `Bw2Continue` | BW2 | 続きから |

### 2.6 Nature

性格 (0-24)。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum Nature {
    Hardy = 0,
    Lonely,
    Brave,
    Adamant,
    Naughty,
    Bold,
    Docile,
    Relaxed,
    Impish,
    Lax,
    Timid,
    Hasty,
    Serious,
    Jolly,
    Naive,
    Modest,
    Mild,
    Quiet,
    Bashful,
    Rash,
    Calm,
    Gentle,
    Sassy,
    Careful,
    Quirky,
}
```

### 2.7 Gender

性別。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum Gender {
    Male,
    Female,
    Genderless,
}
```

### 2.8 GenderRatio

性別比。孵化時の性別決定に使用。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum GenderRatio {
    Genderless,
    MaleOnly,
    FemaleOnly,
    Male7Female1,
    Male3Female1,
    Male1Female1,
    Male1Female3,
}
```

### 2.9 AbilitySlot

特性スロット。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum AbilitySlot {
    First,
    Second,
    Hidden,
}
```

## 3. 設定型

### 3.1 DsConfig

DS本体設定パラメータ。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DsConfig {
    pub mac_address: [u8; 6],
    pub hardware: Hardware,
    pub rom_version: RomVersion,
    pub rom_region: RomRegion,
}
```

```typescript
export type DsConfig = {
  mac_address: [number, number, number, number, number, number];
  hardware: Hardware;
  rom_version: RomVersion;
  rom_region: RomRegion;
};
```

## 4. Rust ↔ TypeScript 型マッピング

| Rust 型 | TypeScript 型 | 備考 |
|--------|--------------|------|
| `u8`, `u16`, `u32` | `number` | |
| `u64` | `bigint` | tsify + serde-wasm-bindgen |
| `i8`, `i16`, `i32` | `number` | |
| `f32`, `f64` | `number` | |
| `String` | `string` | |
| `bool` | `boolean` | |
| `Vec<T>` | `T[]` | tsify で配列に変換 |
| `Option<T>` | `T \| undefined` | |
| `[T; N]` | タプル型 | `[T, T, ...]` |
| enum (C-like) | 文字列リテラル型 | `"Variant1" \| "Variant2"` |
| struct | オブジェクト型 | `{ field: T }` |

### 4.1 BigInt 取り扱い

```typescript
// TypeScript → WASM
const seeds: bigint[] = [0x1234567890ABCDEFn];

// WASM → TypeScript
const result = batch.results[0];
const seed: bigint = result.seed; // tsify により bigint として型付け
```

## 5. エラーハンドリング

### 5.1 Rust 側

```rust
#[wasm_bindgen]
impl SearchIterator {
    #[wasm_bindgen(constructor)]
    pub fn new(request: SearchRequest) -> Result<SearchIterator, String> {
        if request.target_seeds.is_empty() {
            return Err("target_seeds must not be empty".to_string());
        }
        Ok(SearchIterator { /* ... */ })
    }
}
```

### 5.2 TypeScript 側

```typescript
try {
  const iterator = new SearchIterator(request);
} catch (e) {
  // Rust 側の Err(String) が throw される
  console.error('WASM error:', e);
}
```

### 5.3 エラーカテゴリ

| カテゴリ | 発生タイミング | 対応 |
|---------|--------------|------|
| VALIDATION | パラメータ検証時 | ユーザーへエラー表示 |
| WASM_INIT | WASM初期化時 | Worker再起動 |
| RUNTIME | 処理実行中 | ログ記録、処理中断 |

## 6. 関連ドキュメント

- [overview.md](../overview.md) - 概要、設計原則
- [mtseed.md](../seed-search/mtseed.md) - MT Seed 検索 API
- [pokemon.md](../generation/pokemon.md) - 個体生成 API
- [egg.md](../generation/egg.md) - 孵化生成 API
