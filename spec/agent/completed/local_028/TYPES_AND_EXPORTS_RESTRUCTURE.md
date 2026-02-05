# 型定義配置・エクスポート整理 仕様書

## 1. 概要

### 1.1 目的

wasm-pkg 内の型定義を役割に応じて再配置し、tsify/wasm_bindgen の使い分けルールを明確化する。
また、lib.rs の re-export ポリシーを整理し、API 境界を明確にする。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| tsify | Rust 型から TypeScript 型を自動生成し、WASM ABI 変換を提供するクレート |
| wasm_bindgen | Rust 関数・構造体を JavaScript から呼び出し可能にするクレート |
| API 境界型 | JavaScript ↔ WASM 間でやり取りするデータ型 |
| 有状態オブジェクト | 内部状態を持ち、メソッド呼び出しで状態遷移する構造体 (Searcher 等) |
| 内部専用型 | WASM API として公開せず、Rust 内部でのみ使用する型 |

### 1.3 背景・問題

1. **config.rs の肥大化** (849行)
   - DS 設定、キー入力、検索パラメータが混在
   - 関心事の分離ができていない

2. **検索系パラメータの分散配置**
   - `MtseedDatetimeSearchParams` → `datetime_search/mtseed.rs`
   - `TrainerInfoSearchParams` → `datetime_search/trainer_info.rs`
   - `EggDatetimeSearchParams` → `datetime_search/egg.rs`
   - `MtseedSearchParams` → `misc/mtseed_search.rs`
   - Generation 系は `types/generation.rs` に集約済みなのに対し、Search 系は分散

3. **tsify / wasm_bindgen の使い分けが曖昧**
   - API 境界のデータ型なのに `wasm_bindgen` のみ付与されているケースがある
   - 内部専用型と公開型の区別が不明確

4. **lib.rs の re-export 肥大化** (約100行)
   - 全型をフラット re-export しており、何が API 境界なのか不明確
   - 内部利用型も含めて全て公開されている

5. **SeedInput の命名が曖昧**
   - `KeySpec` と類似の役割 (仕様 → 展開) だが、命名が一貫していない

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| config.rs 分割 | 関心事ごとにファイルが分離され、変更影響範囲が明確化 |
| 検索パラメータ集約 | `types/search.rs` で一元管理、一貫性向上 |
| アノテーションルール明確化 | 新規型追加時の判断が容易に |
| re-export ポリシー整理 | API 境界が明確になり、意図しない公開を防止 |
| SeedSpec へのリネーム | KeySpec との一貫性確保 |

### 1.5 着手条件

- local_027 までの実装が完了していること
- 既存テストが全て通過すること (`cargo test`, `pnpm test`)

## 2. 対象ファイル

### 2.1 新規作成

| ファイル | 内容 |
|----------|------|
| `types/keyinput.rs` | キー入力系型 (DsButton, KeyCode, KeyMask, KeyInput, KeySpec) |
| `types/search.rs` | 検索パラメータ・結果型 |

> **Note**: 機能モジュール内の内部専用型 (`datetime_search/types.rs` 等) は、現時点で移動対象となる型が存在しないため作成不要。将来、内部専用型が増加した場合に `types.rs` を作成する。

### 2.2 変更

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `types/config.rs` | 縮小 | キー入力系・検索系を分離、DS 設定系のみ残す |
| `types/generation.rs` | 追加 | `SeedInput` → `SeedSpec` にリネームして移動 |
| `types/mod.rs` | 変更 | 新規サブモジュール宣言・re-export 調整 |
| `lib.rs` | 縮小 | tsify 型のみ re-export に変更 |
| `datetime_search/mtseed.rs` | 縮小 | Params/Batch を `types/search.rs` へ移動 |
| `datetime_search/trainer_info.rs` | 縮小 | Params/Result/Batch を移動 |
| `datetime_search/egg.rs` | 縮小 | Params/Result/Batch を移動 |
| `misc/mtseed_search.rs` | 縮小 | Params/Result/Batch を移動 |
| `core/seed_resolver.rs` | 変更 | `SeedInput` → `SeedSpec` にリネーム |

## 3. 設計方針

### 3.1 types モジュール分割構成

```
wasm-pkg/src/types/
├── mod.rs           # サブモジュール宣言 + 統合 re-export
├── config.rs        # DS 設定系 (縮小)
├── keyinput.rs      # キー入力系 (新規)
├── search.rs        # 検索パラメータ・結果型 (新規)
├── generation.rs    # 生成系 + SeedSpec (既存 + 追加)
├── filter.rs        # フィルター系 (既存のまま)
├── pokemon.rs       # ポケモン関連型 (既存のまま)
├── seeds.rs         # Seed 型 (既存のまま)
└── needle.rs        # 針検索関連 (既存のまま)
```

### 3.2 各ファイルの内容

#### 3.2.1 config.rs (縮小後)

DS 本体設定・起動条件に関する型のみ:

| 型 | 説明 |
|----|------|
| `Hardware` | DS ハードウェア種別 |
| `RomVersion` | ROM バージョン |
| `RomRegion` | ROM リージョン |
| `DsConfig` | DS 本体設定 |
| `Timer0VCountRange` | Timer0/VCount 範囲 |
| `StartupCondition` | 起動条件 |
| `Datetime` | 起動日時 |

#### 3.2.2 keyinput.rs (新規)

キー入力に関する型:

| 型 | 公開範囲 | 説明 |
|----|----------|------|
| `DsButton` | pub + tsify | DS ボタン列挙型 |
| `KeyCode` | pub + tsify | キー入力コード (SHA-1 計算用) |
| `KeyMask` | pub(crate) | キー入力マスク (内部使用) |
| `KeyInput` | pub + tsify | キー入力 (Generator 用、固定ボタン) |
| `KeySpec` | pub + tsify | キー入力仕様 (Searcher 用、全組み合わせ展開) |

#### 3.2.3 search.rs (新規)

検索パラメータ・結果型:

| 型 | 説明 |
|----|------|
| `TimeRangeParams` | 1日内の時刻範囲 |
| `SearchRangeParams` | 検索範囲 (秒単位) |
| `DateRangeParams` | 日付範囲 (UI 入力用) |
| `DatetimeSearchContext` | 起動時刻検索の共通コンテキスト |
| `MtseedDatetimeSearchParams` | MT Seed 起動時刻検索パラメータ |
| `MtseedDatetimeSearchBatch` | MT Seed 検索バッチ結果 |
| `TrainerInfoSearchParams` | トレーナー情報検索パラメータ |
| `TrainerInfoSearchResult` | トレーナー情報検索結果 |
| `TrainerInfoSearchBatch` | トレーナー情報検索バッチ結果 |
| `EggDatetimeSearchParams` | 孵化起動時刻検索パラメータ |
| `EggDatetimeSearchResult` | 孵化検索結果 |
| `EggDatetimeSearchBatch` | 孵化検索バッチ結果 |
| `MtseedSearchParams` | MT Seed 検索パラメータ (misc) |
| `MtseedResult` | MT Seed 検索結果 (misc) |
| `MtseedSearchBatch` | MT Seed 検索バッチ結果 (misc) |
| `GpuSearchBatch` | GPU 検索バッチ結果 |

#### 3.2.4 generation.rs (追加)

既存の生成系型に加え、以下を追加:

| 型 | 変更 |
|----|------|
| `SeedSpec` | `SeedInput` からリネーム・移動 |

### 3.3 機能モジュール内の内部専用型

各機能モジュールに内部専用型が必要な場合は `types.rs` を作成し、WASM API として公開しない型を配置する:

```
wasm-pkg/src/
├── datetime_search/
│   └── types.rs     # 内部専用型 (必要に応じて作成)
├── misc/
│   └── types.rs     # 内部専用型 (必要に応じて作成)
└── gpu/
    └── types.rs     # 内部専用型 (必要に応じて作成)
```

> **現状**: 現時点では移動対象となる内部専用型は存在しない。
> - `HashValues` は `core/sha1/mod.rs` に配置されており、SHA-1 計算ロジックと密結合のためそのままでよい
> - 将来、内部専用型が増加した場合にこのパターンを適用する

### 3.4 tsify / wasm_bindgen アノテーションルール

| 対象 | アノテーション | 配置場所 |
|------|---------------|----------|
| API 境界データ型 (JS ↔ WASM 間でやり取り) | `Tsify` + `#[tsify(into_wasm_abi, from_wasm_abi)]` | `types/` 配下 |
| 有状態オブジェクト (Searcher 等) | `#[wasm_bindgen]` | 機能モジュール内 |
| WASM 公開関数 | `#[wasm_bindgen]` | 機能モジュール内 |
| 内部専用型 | なし | 機能モジュール内 `types.rs` |
| crate 内共有型 (非公開) | `pub(crate)` | 適切なモジュール内 |

### 3.5 re-export ポリシー

**ポリシー D: tsify 型のみ re-export**

`lib.rs` では tsify アノテーション付きの型のみ re-export する。

```rust
// lib.rs

// tsify 型のみ re-export
pub use types::{
    // config
    Hardware, RomVersion, RomRegion, DsConfig, Timer0VCountRange, StartupCondition, Datetime,
    // keyinput
    DsButton, KeyCode, KeyInput, KeySpec,
    // search
    TimeRangeParams, SearchRangeParams, DateRangeParams, DatetimeSearchContext,
    MtseedDatetimeSearchParams, MtseedDatetimeSearchBatch,
    TrainerInfoSearchParams, TrainerInfoSearchResult, TrainerInfoSearchBatch,
    EggDatetimeSearchParams, EggDatetimeSearchResult, EggDatetimeSearchBatch,
    MtseedSearchParams, MtseedResult, MtseedSearchBatch,
    // generation
    SeedSpec, GenerationConfig, PokemonGenerationParams, EggGenerationParams,
    // ... 他の tsify 型
};

// wasm_bindgen 付き関数・構造体は各モジュールから直接 re-export
pub use datetime_search::{
    MtseedDatetimeSearcher, TrainerInfoSearcher, EggDatetimeSearcher,
    generate_mtseed_search_tasks, generate_trainer_info_search_tasks, generate_egg_search_tasks,
};
```

**利点:**
- API 境界が明確
- 内部型の意図しない公開を防止
- `lib.rs` の肥大化を抑制

## 4. 実装仕様

### 4.1 SeedSpec (SeedInput からリネーム)

```rust
// types/generation.rs

/// Seed 指定仕様
///
/// Generator 系 API 用の Seed 指定方法。
/// `KeySpec` と同様に、仕様から `SeedOrigin` リストに展開される。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(tag = "type")]
pub enum SeedSpec {
    /// 複数の LCG Seed を直接指定
    Seeds {
        seeds: Vec<LcgSeed>,
    },

    /// 起動条件から Seed を導出
    Startup {
        ds: DsConfig,
        datetime: Datetime,
        ranges: Vec<Timer0VCountRange>,
        key_input: KeyInput,
    },
}
```

### 4.2 types/keyinput.rs

```rust
//! キー入力型
//!
//! DS ボタン入力に関する型を定義。
//! Generator 用 (固定入力) と Searcher 用 (全組み合わせ展開) の両方をサポート。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

// === DsButton ===

/// DS ボタン
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum DsButton {
    A, B, X, Y, L, R, Start, Select, Up, Down, Left, Right,
}

impl DsButton {
    pub const fn bit_mask(self) -> u32 { /* ... */ }
}

// === KeyCode ===

/// キー入力コード (SHA-1 計算用)
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct KeyCode(pub u32);

impl KeyCode {
    pub const NONE: Self = Self(0x2FFF);
    // ...
}

// === KeyMask (内部使用) ===

/// キー入力マスク (内部使用)
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub(crate) struct KeyMask(pub u32);

// === KeyInput (Generator 用) ===

/// キー入力 (Generator 用)
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct KeyInput {
    pub buttons: Vec<DsButton>,
}

// === KeySpec (Searcher 用) ===

/// キー入力仕様 (Searcher 用)
#[derive(Tsify, Clone, Debug, Default, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct KeySpec {
    pub available_buttons: Vec<DsButton>,
}
```

### 4.3 types/search.rs

```rust
//! 検索パラメータ・結果型
//!
//! 起動時刻検索および各種検索の入出力型を定義。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

use super::{
    DsConfig, EggFilter, EggGenerationParams, GeneratedEggData, GenerationConfig,
    KeySpec, MtSeed, SeedOrigin, StartupCondition, Timer0VCountRange, TrainerInfo,
    TrainerInfoFilter,
};

// === 時刻範囲パラメータ ===

/// 1日内の時刻範囲
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TimeRangeParams { /* ... */ }

/// 検索範囲
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SearchRangeParams { /* ... */ }

/// 日付範囲パラメータ (UI 入力用)
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DateRangeParams { /* ... */ }

/// 起動時刻検索の共通コンテキスト
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DatetimeSearchContext { /* ... */ }

// === MT Seed 起動時刻検索 ===

/// MT Seed 検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeSearchParams { /* ... */ }

/// MT Seed 検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedDatetimeSearchBatch { /* ... */ }

// === トレーナー情報検索 ===
// ...

// === 孵化起動時刻検索 ===
// ...

// === MT Seed 検索 (misc) ===
// ...
```

### 4.4 機能モジュール内の Searcher

```rust
// datetime_search/mtseed.rs

use crate::types::{
    MtseedDatetimeSearchParams, MtseedDatetimeSearchBatch,
    // ...
};

/// MT Seed 起動時刻検索器
#[wasm_bindgen]
pub struct MtseedDatetimeSearcher {
    // ... (内部フィールドは非公開)
}

#[wasm_bindgen]
impl MtseedDatetimeSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new(params: MtseedDatetimeSearchParams) -> Result<Self, String> { /* ... */ }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool { /* ... */ }

    pub fn next_batch(&mut self, chunk_count: u32) -> MtseedDatetimeSearchBatch { /* ... */ }
}
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | 検証内容 |
|-----------|----------|
| `SeedSpec` | Seeds/Startup バリアント変換、resolve_seeds との連携 |
| `KeyInput::to_key_code` | ボタン組み合わせから KeyCode への変換 |
| `KeySpec::combinations` | 無効パターン除外 (上下/左右同時押し、ソフトリセット) |
| `DateRangeParams::to_search_range` | 日付範囲から秒数への変換 |

### 5.2 統合テスト

| テスト対象 | 検証内容 |
|-----------|----------|
| TypeScript 型生成 | `pnpm build:wasm` 後に `.d.ts` ファイルに全 tsify 型が含まれること |
| import パス | 機能モジュールからの型参照が正常に解決されること |
| 既存テスト | `cargo test` / `pnpm test` が全て通過すること |

### 5.3 回帰テスト

既存の検索・生成機能が正常に動作することを確認:

```powershell
cargo test
cargo test --features gpu
pnpm test:run
pnpm build:wasm
```

## 6. 実装チェックリスト

### Phase 1: types モジュール分割

- [x] `types/keyinput.rs` 作成 (config.rs からキー入力系を移動)
- [x] `types/search.rs` 作成 (config.rs から検索パラメータを移動)
- [x] `types/config.rs` 縮小 (DS 設定系のみ残す)
- [x] `types/mod.rs` 更新 (新規サブモジュール宣言・re-export)

### Phase 2: SeedSpec リネーム

- [x] `SeedInput` → `SeedSpec` リネーム (types/generation.rs)
- [x] `core/seed_resolver.rs` 更新
- [x] 関連テスト更新

### Phase 3: 検索パラメータ移動

- [x] `datetime_search/mtseed.rs` から Params/Batch を `types/search.rs` へ移動
- [x] `datetime_search/trainer_info.rs` から Params/Result/Batch を移動
- [x] `datetime_search/egg.rs` から Params/Result/Batch を移動
- [x] `misc/mtseed_search.rs` から Params/Result/Batch を移動
- [x] 各 Searcher の import パス更新

### Phase 4: 内部専用型の整理 (将来対応)

> **現状**: 現時点では移動対象となる内部専用型は存在しないため、スキップ可能。
> 将来、内部専用型が増加した場合に以下のパターンを適用:

- [x] スキップ (対象型なし)

### Phase 5: lib.rs re-export 整理

- [x] lib.rs を tsify 型のみ re-export に変更
- [x] wasm_bindgen 付き関数・構造体の re-export 整理
- [x] 不要な re-export 削除

### Phase 6: 検証

- [x] `cargo test` 通過
- [x] `cargo test --features gpu` 通過 (242 tests)
- [x] `cargo clippy --all-targets -- -D warnings` 通過
- [x] `cargo clippy --all-targets --features gpu -- -D warnings` 通過
- [x] `pnpm build:wasm` 成功
- [ ] `pnpm test:run` 通過
- [ ] TypeScript 型定義の確認 (`wasm-pkg/pkg/*.d.ts`)
