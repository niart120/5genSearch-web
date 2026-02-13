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

### Phase 7: Needle 関連型の集約・型安全化
- [x] `types/needle.rs` 新設
- [x] `NeedleDirection` を `seeds.rs` から移動
- [x] `NeedlePattern` を `config.rs` から移動し `Vec<NeedleDirection>` に変更
- [x] `NeedleDirection::arrow()` メソッド追加
- [x] `core/needle.rs` 新設 (計算関数を移動)
- [x] `generation/algorithm/needle.rs` 削除
- [x] `misc/needle_search.rs` から `needle_direction_arrow` 削除
- [x] re-export 更新
- [x] テスト修正

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

## 8. Phase 7: Needle 関連型の集約・型安全化

### 8.1 概要

Needle 関連の型と関数が複数ファイルに散逸している問題を解決し、`NeedlePattern` の型安全性を向上させる。

**現状の問題:**
| ファイル | 内容 | 問題点 |
|---------|------|--------|
| `types/seeds.rs` | `NeedleDirection` | seeds と無関係 |
| `types/config.rs` | `NeedlePattern(Vec<u8>)` | config と無関係、型安全でない |
| `generation/algorithm/needle.rs` | 計算関数 | generation 内に埋もれている |
| `misc/needle_search.rs` | `needle_direction_arrow(u8)` | 型変換関数が分散 |

### 8.2 `types/needle.rs` (新設)

```rust
//! レポート針関連型

use serde::{Deserialize, Serialize};
use tsify::Tsify;

/// レポート針方向 (0-7)
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[repr(u8)]
pub enum NeedleDirection {
    N = 0,
    NE = 1,
    E = 2,
    SE = 3,
    S = 4,
    SW = 5,
    W = 6,
    NW = 7,
}

impl NeedleDirection {
    /// 数値から変換
    pub const fn from_value(v: u8) -> Self {
        match v & 7 {
            0 => Self::N,
            1 => Self::NE,
            2 => Self::E,
            3 => Self::SE,
            4 => Self::S,
            5 => Self::SW,
            6 => Self::W,
            _ => Self::NW,
        }
    }

    /// 数値へ変換
    pub const fn value(self) -> u8 {
        self as u8
    }

    /// 矢印文字に変換
    pub const fn arrow(self) -> &'static str {
        match self {
            Self::N => "↑",
            Self::NE => "↗",
            Self::E => "→",
            Self::SE => "↘",
            Self::S => "↓",
            Self::SW => "↙",
            Self::W => "←",
            Self::NW => "↖",
        }
    }
}

/// レポート針パターン
///
/// `Vec<NeedleDirection>` のラッパー。型レベルで 0-7 範囲を保証。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedlePattern(pub Vec<NeedleDirection>);

impl NeedlePattern {
    pub fn new(directions: Vec<NeedleDirection>) -> Self {
        Self(directions)
    }

    /// u8 スライスから変換 (各値は & 7 でマスク)
    pub fn from_values(values: &[u8]) -> Self {
        Self(values.iter().map(|&v| NeedleDirection::from_value(v)).collect())
    }

    pub fn directions(&self) -> &[NeedleDirection] {
        &self.0
    }

    pub fn into_inner(self) -> Vec<NeedleDirection> {
        self.0
    }

    pub fn len(&self) -> usize {
        self.0.len()
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    pub fn iter(&self) -> impl Iterator<Item = &NeedleDirection> {
        self.0.iter()
    }

    /// 矢印文字列に変換
    pub fn to_arrows(&self) -> String {
        self.0.iter().map(|d| d.arrow()).collect()
    }
}
```

### 8.3 `core/needle.rs` (新設)

```rust
//! 針方向計算

use crate::core::lcg::Lcg64;
use crate::types::{LcgSeed, NeedleDirection};

/// LCG Seed から針方向を計算
pub fn calculate_needle_direction(seed: LcgSeed) -> NeedleDirection {
    let value = seed.value();
    let upper32 = (value >> 32) as u32;
    let direction = (upper32 >> 29) as u8;
    NeedleDirection::from_value(direction)
}

/// レポート針方向を計算 (pokemon-gen5-initseed 準拠)
pub fn calc_report_needle_direction(seed: LcgSeed) -> NeedleDirection {
    let next = Lcg64::compute_next(seed);
    let upper = next.value() >> 32;
    let dir = upper.wrapping_mul(8) >> 32;
    NeedleDirection::from_value((dir & 7) as u8)
}
```

### 8.4 影響範囲

| 変更内容 | ファイル |
|---------|---------|
| `types/needle.rs` 新設 | 新規 |
| `types/seeds.rs` から `NeedleDirection` 削除 | 修正 |
| `types/config.rs` から `NeedlePattern` 削除 | 修正 |
| `types/mod.rs` re-export 更新 | 修正 |
| `core/needle.rs` 新設 | 新規 |
| `core/mod.rs` re-export 追加 | 修正 |
| `generation/algorithm/needle.rs` 削除 | 削除 |
| `generation/algorithm/mod.rs` 更新 | 修正 |
| `misc/needle_search.rs` 更新 | 修正 |
| `lib.rs` re-export 更新 | 修正 |

## 9. Phase 8: IV 関連リファクタリング

### 9.1 概要

IV (個体値) 関連の型を整理し、不要な型・関数を削除、めざめるパワー計算・フィルタ機能を追加する。

### 9.2 背景・問題

| 問題 | 詳細 |
|------|------|
| `IvCode` 不要 | `Ivs` 構造体があれば圧縮表現は不要。TS 型定義も欠落している |
| `IvSet` 未使用 | type alias で TS 型生成されない。crate 内で使用箇所なし |
| `ivs_to_array` 重複 | `Ivs::to_array()` と同一機能 |
| WASM 公開関数過多 | `encode_iv_code_wasm` 等、外部から不要な関数が公開されている |
| めざパ計算なし | Hidden Power のタイプ・威力計算が未実装 |
| `IvFilter` 配置 | `misc/mtseed_search.rs` に埋もれている |

### 9.3 ユースケース整理

| # | ユースケース | 入力 | 出力 | 対応状況 |
|---|-------------|------|------|----------|
| 1 | ポケモン生成結果に IV を含める | `MtSeed`, offset | `Ivs` | 対応済 |
| 2 | タマゴ生成に親 IV を渡す | `Ivs` (0-31, Unknown=32) | - | 対応済 |
| 3 | IV 条件から MTSeed 検索 | `IvFilter` + offset + 順序 | `Vec<MtSeed>` | 対応済 |
| 4 | めざパタイプ・威力計算 | `Ivs` | `HiddenPowerType`, `u8` | **未実装** |
| 5 | めざパ条件で MTSeed 検索 | `IvFilter` + めざパ条件 | `Vec<MtSeed>` | **未実装** |

### 9.4 実装チェックリスト

#### Phase 8-1: 不要な型・関数の削除
- [x] `IvCode` 型削除 (`types/config.rs`)
- [x] `IvSet` type alias 削除 (`types/pokemon.rs`)
- [x] `MtseedResult.iv_code` フィールド削除
- [x] `encode_iv_code`, `decode_iv_code`, `reorder_iv_code_for_roamer` 削除
- [x] `encode_iv_code_wasm`, `decode_iv_code_wasm`, `reorder_iv_code_for_roamer_wasm` 削除
- [x] `ivs_to_array` ヘルパー削除
- [x] re-export 更新 (`lib.rs`, `types/mod.rs`, `misc/mod.rs`)
- [x] テスト修正

#### Phase 8-2: めざパ計算実装
- [x] `HiddenPowerType` enum 追加 (`types/pokemon.rs`)
- [x] `Ivs::hidden_power_type()` メソッド追加
- [x] `Ivs::hidden_power_power()` メソッド追加
- [x] テスト追加

#### Phase 8-3: `IvFilter` 拡張・移動
- [x] `IvFilter` を `misc/mtseed_search.rs` → `types/pokemon.rs` に移動
- [x] `hidden_power_types: Option<Vec<HiddenPowerType>>` フィールド追加
- [x] `hidden_power_min_power: Option<u8>` フィールド追加
- [x] `IvFilter::matches()` にめざパ条件追加
- [x] re-export 更新
- [x] テスト修正・追加

#### Phase 8-4: `Ivs` 利便性向上
- [x] `contains_unknown()` → `has_unknown()` リネーム
- [x] `Ivs::is_valid()` メソッド追加 (全値 0-31 検証)
- [x] テスト追加

### 9.5 削除対象一覧

| 対象 | 場所 | 理由 |
|------|------|------|
| `IvCode` 型 | `types/config.rs` | `Ivs` があれば不要 |
| `IvSet` type alias | `types/pokemon.rs` | 未使用、TS 型生成されない |
| `MtseedResult.iv_code` | `misc/mtseed_search.rs` | `ivs` と重複 |
| `encode_iv_code` | `misc/mtseed_search.rs` | 不要 |
| `decode_iv_code` | `misc/mtseed_search.rs` | 不要 |
| `reorder_iv_code_for_roamer` | `misc/mtseed_search.rs` | 内部処理済み |
| `encode_iv_code_wasm` | `misc/mtseed_search.rs` | WASM 公開不要 |
| `decode_iv_code_wasm` | `misc/mtseed_search.rs` | WASM 公開不要 |
| `reorder_iv_code_for_roamer_wasm` | `misc/mtseed_search.rs` | WASM 公開不要 |
| `ivs_to_array` | `misc/mtseed_search.rs` | `Ivs::to_array()` と重複 |

### 9.6 追加型・メソッド

#### `HiddenPowerType` enum

```rust
/// めざめるパワーのタイプ
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[repr(u8)]
pub enum HiddenPowerType {
    Fighting = 0,
    Flying = 1,
    Poison = 2,
    Ground = 3,
    Rock = 4,
    Bug = 5,
    Ghost = 6,
    Steel = 7,
    Fire = 8,
    Water = 9,
    Grass = 10,
    Electric = 11,
    Psychic = 12,
    Ice = 13,
    Dragon = 14,
    Dark = 15,
}
```

#### `Ivs` 追加メソッド

```rust
impl Ivs {
    /// めざめるパワーのタイプを計算
    pub fn hidden_power_type(&self) -> HiddenPowerType {
        let type_value = ((self.hp & 1)
            | ((self.atk & 1) << 1)
            | ((self.def & 1) << 2)
            | ((self.spe & 1) << 3)
            | ((self.spa & 1) << 4)
            | ((self.spd & 1) << 5)) as u32;
        let type_index = (type_value * 15 / 63) as u8;
        HiddenPowerType::from_u8(type_index)
    }

    /// めざめるパワーの威力を計算 (30-70)
    pub fn hidden_power_power(&self) -> u8 {
        let power_value = (((self.hp >> 1) & 1)
            | (((self.atk >> 1) & 1) << 1)
            | (((self.def >> 1) & 1) << 2)
            | (((self.spe >> 1) & 1) << 3)
            | (((self.spa >> 1) & 1) << 4)
            | (((self.spd >> 1) & 1) << 5)) as u32;
        ((power_value * 40 / 63) + 30) as u8
    }

    /// Unknown を含むかどうか
    pub const fn has_unknown(&self) -> bool {
        self.hp == IV_VALUE_UNKNOWN
            || self.atk == IV_VALUE_UNKNOWN
            || self.def == IV_VALUE_UNKNOWN
            || self.spa == IV_VALUE_UNKNOWN
            || self.spd == IV_VALUE_UNKNOWN
            || self.spe == IV_VALUE_UNKNOWN
    }

    /// 全 IV が有効範囲 (0-31) かどうか
    pub const fn is_valid(&self) -> bool {
        self.hp <= 31
            && self.atk <= 31
            && self.def <= 31
            && self.spa <= 31
            && self.spd <= 31
            && self.spe <= 31
    }
}
```

#### `IvFilter` 拡張

```rust
/// IV フィルタ条件
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct IvFilter {
    /// HP (min, max)
    pub hp: (u8, u8),
    /// 攻撃 (min, max)
    pub atk: (u8, u8),
    /// 防御 (min, max)
    pub def: (u8, u8),
    /// 特攻 (min, max)
    pub spa: (u8, u8),
    /// 特防 (min, max)
    pub spd: (u8, u8),
    /// 素早さ (min, max)
    pub spe: (u8, u8),
    /// めざパタイプ条件 (指定タイプのいずれかに一致)
    pub hidden_power_types: Option<Vec<HiddenPowerType>>,
    /// めざパ威力下限
    pub hidden_power_min_power: Option<u8>,
}
```
