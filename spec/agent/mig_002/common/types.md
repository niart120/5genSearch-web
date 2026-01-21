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

エンカウント種別。乱数消費パターンを決定する。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
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

### 2.5 StartMode

起動方法。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum StartMode {
    /// 最初から (New Game)
    NewGame,
    /// 続きから (Continue)
    Continue,
}
```

```typescript
export type StartMode = 'NewGame' | 'Continue';
```

### 2.6 SaveState

セーブ状態。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum SaveState {
    /// セーブデータなし
    NoSave,
    /// セーブデータあり
    WithSave,
    /// セーブデータあり + 思い出リンク済み (BW2 のみ)
    WithMemoryLink,
}
```

```typescript
export type SaveState = 'NoSave' | 'WithSave' | 'WithMemoryLink';
```

### 2.7 GameStartConfig

起動設定。`RomVersion` と組み合わせて Game Offset を計算する。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GameStartConfig {
    pub start_mode: StartMode,
    pub save_state: SaveState,
}
```

```typescript
export type GameStartConfig = {
  start_mode: StartMode;
  save_state: SaveState;
};
```

**有効な組み合わせ**:

| RomVersion | StartMode | SaveState | 有効 |
|------------|-----------|-----------|------|
| BW | NewGame | NoSave | ✓ |
| BW | NewGame | WithSave | ✓ |
| BW | Continue | WithSave | ✓ |
| BW2 | NewGame | NoSave | ✓ |
| BW2 | NewGame | WithSave | ✓ |
| BW2 | NewGame | WithMemoryLink | ✓ |
| BW2 | Continue | WithSave | ✓ |
| BW2 | Continue | WithMemoryLink | ✓ |

無効な組み合わせ:
- `Continue + NoSave`: セーブなしで続きからは不可
- `BW + WithMemoryLink`: BW に思い出リンク機能なし

詳細は [game-offset.md](../generation/algorithm/game-offset.md) を参照。

### 2.8 Nature

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

### 2.9 Gender

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

### 2.10 GenderRatio

性別比。孵化時の性別決定に使用。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum GenderRatio {
    Genderless,
    MaleOnly,
    FemaleOnly,
    /// 性別値の閾値 (例: 127 = 1:1, 31 = 7:1, 63 = 3:1, 191 = 1:3)
    Threshold(u8),
}
```

```typescript
export type GenderRatio =
  | { type: "Genderless" }
  | { type: "MaleOnly" }
  | { type: "FemaleOnly" }
  | { type: "Threshold"; value: number };
```

| 閾値 | 性別比 | 備考 |
|------|--------|------|
| 31 | ♂7:♀1 | 御三家など |
| 63 | ♂3:♀1 | - |
| 127 | ♂1:♀1 | 多くのポケモン |
| 191 | ♂1:♀3 | - |

### 2.11 AbilitySlot

特性スロット。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum AbilitySlot {
    First,   // 0
    Second,  // 1
    Hidden,  // 2 (夢特性)
}
```

### 2.12 ShinyType

色違い種別。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ShinyType {
    None,    // 通常
    Star,    // ☆
    Square,  // ◇
}
```

```typescript
export type ShinyType = "None" | "Star" | "Square";
```

### 2.13 IvSet

個体値セット (HP, Atk, Def, SpA, SpD, Spe)。

```rust
/// [HP, Atk, Def, SpA, SpD, Spe]
pub type IvSet = [u8; 6];
```

```typescript
export type IvSet = [number, number, number, number, number, number];
```

### 2.14 LcgSeed

LCG 乱数生成器のシード値 (64bit)。SHA-1 ハッシュから導出される初期シード。

```rust
/// LCG Seed (64bit)
/// 
/// SHA-1 ハッシュ H[0] || H[1] から導出される。
/// NewType パターンにより MtSeed との混同を防止。
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[repr(transparent)]
pub struct LcgSeed(pub u64);

impl LcgSeed {
    #[inline]
    pub const fn new(value: u64) -> Self {
        Self(value)
    }

    #[inline]
    pub const fn value(self) -> u64 {
        self.0
    }

    /// MT Seed を導出 (純関数)
    /// 
    /// LCG を 1 回進めた結果の上位 32bit を MT Seed として返す。
    /// self は変更されない。
    #[inline]
    pub fn derive_mt_seed(&self) -> MtSeed {
        use crate::core::lcg::{LCG_MULTIPLIER, LCG_INCREMENT};
        let next = self.0
            .wrapping_mul(LCG_MULTIPLIER)
            .wrapping_add(LCG_INCREMENT);
        MtSeed::new((next >> 32) as u32)
    }
}

impl From<u64> for LcgSeed {
    fn from(value: u64) -> Self {
        Self(value)
    }
}

impl From<LcgSeed> for u64 {
    fn from(seed: LcgSeed) -> Self {
        seed.0
    }
}
```

```typescript
// TypeScript 側: bigint として扱う (tsify の u64 デフォルト)
export type LcgSeed = bigint;
```

### 2.15 MtSeed

MT19937 乱数生成器のシード値 (32bit)。LCG から導出される。

```rust
/// MT Seed (32bit)
/// 
/// LCG の上位 32bit から導出される。
/// NewType パターンにより LcgSeed との混同を防止。
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[repr(transparent)]
pub struct MtSeed(pub u32);

impl MtSeed {
    #[inline]
    pub const fn new(value: u32) -> Self {
        Self(value)
    }

    #[inline]
    pub const fn value(self) -> u32 {
        self.0
    }
}

impl From<u32> for MtSeed {
    fn from(value: u32) -> Self {
        Self(value)
    }
}

impl From<MtSeed> for u32 {
    fn from(seed: MtSeed) -> Self {
        seed.0
    }
}
```

```typescript
// TypeScript 側: number として扱う (32bit は安全に表現可能)
export type MtSeed = number;
```

### 2.16 NeedleDirection

レポート針方向。ゲーム内セーブ画面で観測できる八方向の針。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[repr(u8)]
pub enum NeedleDirection {
    N = 0,   // ↑ 上
    NE = 1,  // ↗ 右上
    E = 2,   // → 右
    SE = 3,  // ↘ 右下
    S = 4,   // ↓ 下
    SW = 5,  // ↙ 左下
    W = 6,   // ← 左
    NW = 7,  // ↖ 左上
}
```

```typescript
export type NeedleDirection = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
```

**計算仕様**:

針計算ロジックは [generation/algorithm/needle.md](../generation/algorithm/needle.md) に定義。enueration に含まれない。

```rust
impl NeedleDirection {
    /// 値からの変換
    #[inline]
    pub fn from_value(v: u8) -> Self {
        debug_assert!(v < 8);
        // Safety: v は 0-7 の範囲
        unsafe { std::mem::transmute(v & 7) }
    }

    /// 値への変換
    #[inline]
    pub fn value(&self) -> u8 {
        *self as u8
    }
}
```

| 値 | 方向 | 矢印 | 角度 |
|----|------|------|------|
| 0 | N | ↑ | 0° |
| 1 | NE | ↗ | 45° |
| 2 | E | → | 90° |
| 3 | SE | ↘ | 135° |
| 4 | S | ↓ | 180° |
| 5 | SW | ↙ | 225° |
| 6 | W | ← | 270° |
| 7 | NW | ↖ | 315° |

**用途**:
- 目押し: 狙った消費数に到達したかの確認
- 針検索: 観測した針の並びから起動条件/消費数を逆算

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
