# API 公開戦略・型正規化 仕様書

## 1. 概要

### 1.1 目的

WASM API の公開範囲を整理し、型の重複を解消する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| wasm-bindgen | Rust と JavaScript/TypeScript 間のバインディングを生成するツール |
| re-export | 下位モジュールの公開要素を上位モジュールから再公開すること |
| 型正規化 | 重複・類似した型定義を統合し、一貫性を持たせること |
| 入力ソース型 | Seed 直接指定 or 起動条件指定を表す汎用 enum |

### 1.3 背景・問題

- `MtseedDatetimeResult` が `DatetimeParams` + `SearchSegment` と重複
- SHA-1 関連関数が TS 側に公開されているが、Searcher 経由で使用するため不要
- `NeedleSearchInput::Startup` の Timer0/VCount が個別フィールドで冗長
- 入力ソース型（Seed/Startup）が `NeedleSearchInput` のみに存在し、汎用性がない

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| `MtseedDatetimeResult` 統合 | 型重複の解消、`GenerationSource` への変換が容易に |
| SHA-1 関数の内部化 | 公開 API 削減、Worker から呼ぶ必要がなくなる |
| 入力ソース型の汎用化 | Generator 全体で統一的な入力インターフェース |

### 1.5 着手条件

- [x] local_009 のリファクタリングが完了していること
- [x] 既存テストが全て通過すること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `types/config.rs` | 修正 | `SeedSource` 型を追加 |
| `datetime_search/mtseed.rs` | 修正 | `MtseedDatetimeResult` を `DatetimeParams` + `SearchSegment` に統合 |
| `misc/needle_search.rs` | 修正 | `NeedleSearchInput` を `SeedSource` に置き換え |
| `core/sha1/mod.rs` | 修正 | `#[wasm_bindgen]` を削除、内部関数化 |
| `lib.rs` | 修正 | SHA-1 関数の re-export 削除、`SeedSource` 追加 |

## 3. 設計方針

### 3.1 `MtseedDatetimeResult` の統合

#### 現状

```rust
pub struct MtseedDatetimeResult {
    pub seed: u32,
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
    pub timer0: u16,
    pub vcount: u8,
    pub key_code: u32,
}
```

#### 変更後

```rust
pub struct MtseedDatetimeResult {
    pub seed: MtSeed,
    pub datetime: DatetimeParams,
    pub segment: SearchSegment,
}

impl MtseedDatetimeResult {
    /// `GenerationSource::Datetime` に変換
    pub fn to_generation_source(&self, base_seed: u64) -> GenerationSource {
        GenerationSource::datetime(
            base_seed,
            self.datetime,
            self.segment.timer0,
            self.segment.vcount,
            self.segment.key_code,
        )
    }
}
```

### 3.2 SHA-1 関連関数の内部化

#### 現状の公開関数

| 関数 | 用途 |
|------|------|
| `sha1_hash_single` | 単一メッセージの SHA-1 計算 |
| `sha1_hash_batch` | 複数メッセージの SHA-1 計算 |
| `hash_to_lcg_seed` | ハッシュ → LCG Seed 変換 |
| `hash_to_mt_seed` | ハッシュ → MT Seed 変換 |

#### 方針

- これらは `MtseedDatetimeSearcher` 等が内部で使用
- TS 側から直接呼ぶ必要がないため、`#[wasm_bindgen]` を削除
- `pub(crate)` に変更して crate 内部のみ公開

### 3.3 入力ソース型の汎用化 (`SeedSource`)

#### 現状: `NeedleSearchInput`

```rust
pub enum NeedleSearchInput {
    Seed { initial_seed: LcgSeed },
    Startup {
        ds: DsConfig,
        datetime: DatetimeParams,
        timer0_min: u16,
        timer0_max: u16,
        vcount_min: u8,
        vcount_max: u8,
        key_code: u32,
    },
}
```

#### 変更後: `SeedSource` (汎用型)

```rust
/// 計算入力のソース指定
///
/// Searcher / Generator 共通で使用可能な入力ソース型。
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(tag = "type")]
pub enum SeedSource {
    /// 既知の LCG Seed を直接指定
    Seed { initial_seed: LcgSeed },

    /// 既知の MT Seed を直接指定
    MtSeed { seed: MtSeed },

    /// 複数の LCG Seed を指定
    MultipleSeeds { seeds: Vec<LcgSeed> },

    /// 起動条件から Seed を導出
    Startup {
        ds: DsConfig,
        datetime: DatetimeParams,
        /// Timer0/VCount の探索範囲（複数指定可能）
        segments: Vec<SearchSegment>,
    },

    /// 起動条件 + Timer0/VCount 範囲から探索
    StartupRange {
        ds: DsConfig,
        datetime: DatetimeParams,
        /// Timer0/VCount の範囲指定
        ranges: Vec<VCountTimer0Range>,
        key_code: u32,
    },
}
```

#### `NeedleSearchInput` の移行

- `NeedleSearchInput::Seed` → `SeedSource::Seed`
- `NeedleSearchInput::Startup` → `SeedSource::StartupRange`

### 3.4 公開維持する型

以下は TS 側で必要なため公開を維持:

| 型 | 理由 |
|---|------|
| `LcgSeed` | UI から Seed 直接入力、Generator 入力 |
| `MtSeed` | UI から MT Seed 入力、検索結果表示 |
| `DsConfig` | ユーザー入力 |
| `DatetimeParams` | ユーザー入力、結果表示 |
| `SearchSegment` | ユーザー入力、結果表示 |
| `VCountTimer0Range` | 探索範囲指定 |

## 4. 実装仕様

### 4.1 `SeedSource` 型 (新規)

**配置**: `types/config.rs`

```rust
use super::seeds::{LcgSeed, MtSeed};

/// 計算入力のソース指定
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(tag = "type")]
pub enum SeedSource {
    /// 既知の LCG Seed を直接指定
    Seed { initial_seed: LcgSeed },

    /// 既知の MT Seed を直接指定
    MtSeed { seed: MtSeed },

    /// 複数の LCG Seed を指定
    MultipleSeeds { seeds: Vec<LcgSeed> },

    /// 起動条件 + 固定 Segment
    Startup {
        ds: DsConfig,
        datetime: DatetimeParams,
        segments: Vec<SearchSegment>,
    },

    /// 起動条件 + Timer0/VCount 範囲
    StartupRange {
        ds: DsConfig,
        datetime: DatetimeParams,
        ranges: Vec<VCountTimer0Range>,
        key_code: u32,
    },
}
```

### 4.2 `MtseedDatetimeResult` 修正

**配置**: `datetime_search/mtseed.rs`

```rust
use crate::types::{DatetimeParams, MtSeed, SearchSegment, GenerationSource};

#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeResult {
    pub seed: MtSeed,
    pub datetime: DatetimeParams,
    pub segment: SearchSegment,
}

impl MtseedDatetimeResult {
    pub fn to_generation_source(&self, base_seed: u64) -> GenerationSource {
        GenerationSource::datetime(
            base_seed,
            self.datetime,
            self.segment.timer0,
            self.segment.vcount,
            self.segment.key_code,
        )
    }
}
```

### 4.3 SHA-1 関数の内部化

**変更箇所**: `core/sha1/mod.rs`

```rust
// Before
#[wasm_bindgen]
pub fn sha1_hash_single(message: Uint32Array) -> Uint32Array { ... }

// After
pub(crate) fn sha1_hash_single(message: &[u32; 16]) -> HashValues { ... }
```

## 5. テスト方針

### 5.1 `MtseedDatetimeResult` 変更

- 既存の `MtseedDatetimeSearcher` テストが通過すること
- `to_generation_source()` の単体テスト追加

### 5.2 SHA-1 内部化

- `wasm_pkg.d.ts` から `sha1_hash_single` 等が消えていることを確認
- 既存の Searcher テストが通過すること（内部で SHA-1 を使用）

### 5.3 `SeedSource` 追加

- 各バリアントのシリアライズ/デシリアライズテスト
- `NeedleSearcher` で `SeedSource` を使用したテスト

## 6. 実装チェックリスト

### Phase 1: `MtseedDatetimeResult` 統合
- [x] `MtseedDatetimeResult` の構造変更
- [x] `to_generation_source()` メソッド追加
- [x] 使用箇所の修正
- [x] テスト修正・追加

### Phase 2: SHA-1 関数の内部化
- [x] `#[wasm_bindgen]` 削除
- [x] `pub(crate)` に変更
- [x] lib.rs から re-export 削除
- [x] `wasm_pkg.d.ts` 差分確認

### Phase 3: `SeedSource` 導入
- [x] `SeedSource` 型定義
- [x] `NeedleSearchInput` を `SeedSource` に置き換え
- [x] lib.rs に re-export 追加
- [x] テスト追加

### Phase 4: 動作確認
- [x] `pnpm build:wasm` 成功
- [x] `cargo test` 成功 (127 tests passed)

### Phase 5: 追加改修
- [x] `SeedSource::MtSeed` バリアント削除（使用箇所なし）
- [x] `MtseedDatetimeSearchParams.target_seeds` を `Vec<MtSeed>` に厳格化

### Phase 6: Newtype Struct 導入
- [x] `IvCode` newtype struct 化（`misc/mtseed_search.rs`）
- [x] `NeedlePattern` newtype struct 化（`misc/needle_search.rs`）
- [x] `KeyCode` newtype struct 新規追加（`types/config.rs`）
- [x] `KeyMask` newtype struct 新規追加（`types/config.rs`）
- [x] 各使用箇所の修正
- [x] テスト修正・追加

## 7. Phase 6: Newtype Struct 詳細設計

### 7.1 概要

type alias は tsify で TypeScript 型として export されないため、newtype struct パターンで明示的な型を定義する。

### 7.2 `IvCode`

**配置**: `types/config.rs`（共通型として移動）

```rust
/// IV の 30bit 圧縮表現
///
/// 配置: [HP:5bit][Atk:5bit][Def:5bit][SpA:5bit][SpD:5bit][Spe:5bit]
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct IvCode(pub u32);

impl IvCode {
    pub const fn new(value: u32) -> Self {
        Self(value)
    }

    pub const fn value(self) -> u32 {
        self.0
    }

    /// IV セットからエンコード
    pub fn encode(ivs: &[u8; 6]) -> Self {
        Self(
            (u32::from(ivs[0]) << 25)
                | (u32::from(ivs[1]) << 20)
                | (u32::from(ivs[2]) << 15)
                | (u32::from(ivs[3]) << 10)
                | (u32::from(ivs[4]) << 5)
                | u32::from(ivs[5]),
        )
    }

    /// IV セットにデコード
    pub fn decode(self) -> [u8; 6] {
        [
            ((self.0 >> 25) & 0x1F) as u8,
            ((self.0 >> 20) & 0x1F) as u8,
            ((self.0 >> 15) & 0x1F) as u8,
            ((self.0 >> 10) & 0x1F) as u8,
            ((self.0 >> 5) & 0x1F) as u8,
            (self.0 & 0x1F) as u8,
        ]
    }

    /// 徘徊ポケモン用順序変換 (HABCDS → HABDSC)
    pub fn reorder_for_roamer(self) -> Self {
        let hp = (self.0 >> 25) & 0x1F;
        let atk = (self.0 >> 20) & 0x1F;
        let def = (self.0 >> 15) & 0x1F;
        let spa = (self.0 >> 10) & 0x1F;
        let spd = (self.0 >> 5) & 0x1F;
        let spe = self.0 & 0x1F;
        Self((hp << 25) | (atk << 20) | (def << 15) | (spd << 10) | (spe << 5) | spa)
    }
}
```

### 7.3 `NeedlePattern`

**配置**: `types/config.rs`

```rust
/// レポート針パターン (0-7 の方向値列)
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedlePattern(pub Vec<u8>);

impl NeedlePattern {
    pub fn new(values: Vec<u8>) -> Self {
        Self(values)
    }

    pub fn values(&self) -> &[u8] {
        &self.0
    }

    pub fn into_inner(self) -> Vec<u8> {
        self.0
    }

    pub fn len(&self) -> usize {
        self.0.len()
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
}
```

### 7.4 `KeyCode` / `KeyMask`

**配置**: `types/config.rs`

```rust
/// キー入力コード (SHA-1 計算用)
///
/// `KeyMask` を XOR 0x2FFF で変換した値。
/// ゲーム内部の SHA-1 メッセージ生成で使用される。
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct KeyCode(pub u32);

impl KeyCode {
    /// キー入力なしの値
    pub const NONE: Self = Self(0x2FFF);

    pub const fn new(value: u32) -> Self {
        Self(value)
    }

    pub const fn value(self) -> u32 {
        self.0
    }

    /// `KeyMask` から変換
    pub const fn from_mask(mask: KeyMask) -> Self {
        Self(mask.0 ^ 0x2FFF)
    }

    /// `KeyMask` に変換
    pub const fn to_mask(self) -> KeyMask {
        KeyMask(self.0 ^ 0x2FFF)
    }
}

/// キー入力マスク (UI 入力用)
///
/// ユーザーが押したキーのビットマスク。
/// `KeyCode` との関係: `key_code = key_mask XOR 0x2FFF`
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct KeyMask(pub u32);

impl KeyMask {
    /// キー入力なしの値
    pub const NONE: Self = Self(0x0000);

    pub const fn new(value: u32) -> Self {
        Self(value)
    }

    pub const fn value(self) -> u32 {
        self.0
    }

    /// `KeyCode` から変換
    pub const fn from_code(code: KeyCode) -> Self {
        Self(code.0 ^ 0x2FFF)
    }

    /// `KeyCode` に変換
    pub const fn to_code(self) -> KeyCode {
        KeyCode(self.0 ^ 0x2FFF)
    }
}
```

### 7.5 影響範囲

| 型 | 影響ファイル数 | 主な変更内容 |
|---|---|---|
| `IvCode` | 2 | `mtseed_search.rs` 関数削除・メソッド化、re-export 更新 |
| `NeedlePattern` | 2 | `needle_search.rs` フィールド型変更、re-export 更新 |
| `KeyCode` | 7 | 全 `key_code: u32` を `key_code: KeyCode` に変更 |
| `KeyMask` | 1 | 新規追加のみ |
