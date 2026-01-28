# 孵化起動時刻検索 仕様書

## 1. 概要

### 1.1 目的

目標の孵化個体を生成する起動時刻を逆算する機能を実装する。local_015 で再設計された `MtseedDatetimeSearcher` のアーキテクチャを踏襲し、`EggDatetimeSearcher` を実装する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| `EggDatetimeSearcher` | 孵化起動時刻検索器。単一の `StartupCondition` に対して起動時刻を検索 |
| `DatetimeHashGenerator` | 起動時刻から `HashValues` を生成する生成器 (local_015 で実装済み) |
| `EggGenerator` | LCG Seed から孵化個体を生成 (local_016, local_017 で実装済み) |
| `SeedOrigin` | 生成結果のソース情報。`Seed` / `Startup` の2種 (local_015 で拡張済み) |
| `DatetimeSearchContext` | 起動時刻検索の共通設定 (local_015 で定義済み) |
| `GenerationConfig` | 生成共通設定 (local_016 で定義済み) |
| `EggFilter` | 孵化個体フィルター (local_019 で定義) |

### 1.3 背景・問題

local_008 で定義した旧設計は、以下の再設計により無効となった:

| リファクタリング | 変更内容 |
|------------------|----------|
| local_015 | `MtseedDatetimeSearcher` 再設計、`SeedOrigin` 拡張、`DatetimeSearchContext` 導入 |
| local_016 | Generator 再設計、`GenerationConfig` 分離、API 統一 |
| local_017 | `generate_egg` 処理順序修正、NPC消費シミュレーション追加 |

旧設計で定義されていた `HashValuesEnumerator`、`IndividualFilter`、独自の結果型は廃止され、現行アーキテクチャとの整合性を失っている。

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| アーキテクチャ一貫性 | `MtseedDatetimeSearcher` と同一パターンでの実装 |
| Worker 並列化対応 | `generate_egg_search_tasks()` でタスク分割、Worker ごとに単一条件を処理 |
| 既存型の再利用 | `IvFilter`、`SeedOrigin`、`GeneratedEggData` を流用 |
| フィルタリング | IV/性格/色違い等で条件絞り込み |

### 1.5 着手条件

- local_015 (`MtseedDatetimeSearcher` 再設計) 実装済み
- local_016 (Generator 再設計) 実装済み
- local_017 (`generate_egg` 修正、NPC消費) 実装済み
- **local_019 (フィルター設計) 実装済み**

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/datetime_search/egg.rs` | 新規 | `EggDatetimeSearcher` 実装 |
| `wasm-pkg/src/datetime_search/mod.rs` | 変更 | `egg` モジュール追加、re-export、`expand_combinations` 共通化 |
| `wasm-pkg/src/datetime_search/mtseed.rs` | 変更 | `expand_combinations` を `mod.rs` に移動 |
| `wasm-pkg/src/lib.rs` | 変更 | `EggDatetimeSearcher` の WASM エクスポート |

> **注意**: `EggFilter` / `ShinyFilter` / `ResultFilter` は [local_019](../local_019/FILTER_REDESIGN.md) で定義済み。本仕様では定義しない。

## 3. 設計方針

### 3.1 アーキテクチャ概要

`MtseedDatetimeSearcher` と同一の設計パターンを採用する。

```
┌─────────────────────────────────────────────────────────────┐
│  TS 側 (Worker 管理層)                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. generate_egg_search_tasks() でタスク生成         │   │
│  │ 2. Worker にタスクを分散                            │   │
│  │ 3. 結果を集約                                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Worker (Rust/WASM)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ EggDatetimeSearcher                                 │   │
│  │ - 単一の StartupCondition を処理                    │   │
│  │ - next_batch() で段階的に検索                       │   │
│  │ - 進捗報告 (processed_count / total_count)          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 MT Seed 検索との相違点

| 項目 | MT Seed 検索 | 孵化検索 |
|------|-------------|---------|
| 照合対象 | MT Seed 値 (Set.contains) | 生成された孵化個体 (Filter.matches) |
| 照合ロジック | `BTreeSet<MtSeed>::contains()` | `EggFilter::matches()` |
| 出力 | `SeedOrigin::Startup` | `EggDatetimeSearchResult` (起動時刻 + 個体情報) |
| 計算量 | O(日時数) | O(日時数 × advance 範囲) |

### 3.3 処理フロー

```
1. EggDatetimeSearcher::new(params) で初期化
   - DatetimeHashGenerator を内部で作成
   - EggGenerationParams, GenerationConfig を保持

2. next_batch(chunk_count) で検索
   - DatetimeHashGenerator から (Datetime, HashValues) を取得
   - HashValues → LcgSeed → SeedOrigin::Startup 変換
   - EggGenerator で advance 範囲内の個体を生成
   - EggFilter でフィルタリング
   - マッチした結果を返却

3. 進捗管理
   - processed_count: 処理済み日時数
   - total_count: 総日時数
```

### 3.4 依存関係

```
types/  (local_019 でフィルター型追加済み)
├── config.rs         (DatetimeSearchContext, GenerationConfig, etc.)
├── generation.rs     (EggGenerationParams, GeneratedEggData)
├── seeds.rs          (SeedOrigin, LcgSeed, MtSeed)
└── pokemon.rs        (IvFilter, ResultFilter, EggFilter, ShinyFilter)

datetime_search/
├── mod.rs            (expand_combinations ← 共通化)
├── base.rs           (DatetimeHashGenerator)
├── mtseed.rs         (MtseedDatetimeSearcher)
└── egg.rs            (EggDatetimeSearcher ← 新規)

generation/flows/
├── generator/egg.rs  (EggGenerator)
└── egg.rs            (generate_egg)
```

## 4. 実装仕様

### 4.1 型定義

#### 4.1.1 フィルター型

フィルター型 (`EggFilter`, `ResultFilter`, `ShinyFilter`) は [local_019](../local_019/FILTER_REDESIGN.md) で定義済み。本仕様書では定義しない。

#### 4.1.2 `EggDatetimeSearchParams` (datetime_search/egg.rs)

```rust
/// 孵化起動時刻検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggDatetimeSearchParams {
    // === 起動時刻検索 ===
    /// DS 設定
    pub ds: DsConfig,
    /// 1日内の時刻範囲
    pub time_range: TimeRangeParams,
    /// 検索範囲 (秒単位)
    pub search_range: SearchRangeParams,
    /// 起動条件 (単一)
    pub condition: StartupCondition,

    // === 個体生成 ===
    /// 孵化生成パラメータ
    pub egg_params: EggGenerationParams,
    /// 生成共通設定
    pub gen_config: GenerationConfig,

    // === フィルタリング ===
    /// フィルター (None の場合は全件返却)
    pub filter: Option<EggFilter>,
}
```

#### 4.1.3 `EggDatetimeSearchResult` (datetime_search/egg.rs)

```rust
/// 孵化検索結果
///
/// `GeneratedEggData` に起動条件 (`SeedOrigin::Startup`) が含まれるため、
/// 追加フィールドは不要。
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggDatetimeSearchResult {
    /// 生成された孵化個体データ
    ///
    /// `source` フィールドに `SeedOrigin::Startup` が格納されており、
    /// 起動日時・条件を取得可能。
    pub egg: GeneratedEggData,
}
```

#### 4.1.4 `EggDatetimeSearchBatch` (datetime_search/egg.rs)

```rust
/// バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggDatetimeSearchBatch {
    /// 見つかった結果
    pub results: Vec<EggDatetimeSearchResult>,
    /// 処理済み件数
    pub processed_count: u64,
    /// 総件数
    pub total_count: u64,
}
```

### 4.2 `EggDatetimeSearcher` 実装

```rust
// datetime_search/egg.rs

use wasm_bindgen::prelude::*;

use crate::generation::flows::generator::EggGenerator;
use crate::types::{
    DsConfig, EggGenerationParams, GeneratedEggData, GenerationConfig, LcgSeed,
    SearchRangeParams, SeedOrigin, StartupCondition, TimeRangeParams,
};

use super::base::DatetimeHashGenerator;

/// 孵化起動時刻検索器
#[wasm_bindgen]
pub struct EggDatetimeSearcher {
    /// 起動時刻とハッシュ値の生成器
    generator: DatetimeHashGenerator,
    /// 起動条件 (結果生成用)
    condition: StartupCondition,
    /// 孵化生成パラメータ
    egg_params: EggGenerationParams,
    /// 生成共通設定
    gen_config: GenerationConfig,
    /// フィルター
    filter: Option<EggFilter>,
    // 進捗管理
    total_count: u64,
    processed_count: u64,
}

#[wasm_bindgen]
impl EggDatetimeSearcher {
    /// 新しい `EggDatetimeSearcher` を作成
    #[wasm_bindgen(constructor)]
    #[allow(clippy::needless_pass_by_value)]
    pub fn new(params: EggDatetimeSearchParams) -> Result<EggDatetimeSearcher, String> {
        let generator = DatetimeHashGenerator::new(
            &params.ds,
            &params.time_range,
            &params.search_range,
            params.condition,
        )?;

        // 進捗計算
        let valid_seconds_per_day = params.time_range.count_valid_seconds();
        let days = params.search_range.range_seconds.div_ceil(86400);
        let total_count = u64::from(valid_seconds_per_day) * u64::from(days);

        Ok(Self {
            generator,
            condition: params.condition,
            egg_params: params.egg_params,
            gen_config: params.gen_config,
            filter: params.filter,
            total_count,
            processed_count: 0,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.generator.is_exhausted()
    }

    #[wasm_bindgen(getter)]
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        if self.generator.is_exhausted() {
            return 1.0;
        }
        if self.total_count == 0 {
            return 1.0;
        }
        self.processed_count as f64 / self.total_count as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_count: u32) -> EggDatetimeSearchBatch {
        let mut results = Vec::new();
        let mut remaining = u64::from(chunk_count);

        while remaining > 0 && !self.generator.is_exhausted() {
            let (entries, len) = self.generator.next_quad();
            if len == 0 {
                break;
            }

            let processed = u64::from(len);
            self.processed_count += processed;
            remaining = remaining.saturating_sub(processed);

            for (datetime, hash_values) in entries.iter().take(len as usize) {
                let lcg_seed = hash_values.to_lcg_seed();
                let source = SeedOrigin::startup(lcg_seed, *datetime, self.condition);

                // EggGenerator で個体生成
                self.generate_and_filter(lcg_seed, source, &mut results);
            }
        }

        EggDatetimeSearchBatch {
            results,
            processed_count: self.processed_count,
            total_count: self.total_count,
        }
    }
}

impl EggDatetimeSearcher {
    /// 指定 Seed から孵化個体を生成し、フィルターに一致するものを追加
    fn generate_and_filter(
        &self,
        base_seed: LcgSeed,
        source: SeedOrigin,
        results: &mut Vec<EggDatetimeSearchResult>,
    ) {
        let Ok(mut generator) = EggGenerator::new(
            base_seed,
            source.clone(),
            &self.egg_params,
            &self.gen_config,
        ) else {
            return;
        };

        // advance 範囲内の個体を生成・フィルタリング
        let advance_count = self.gen_config.max_advance - self.gen_config.user_offset;
        for _ in 0..advance_count {
            let egg = generator.generate_next();

            // フィルター判定
            let matches = match &self.filter {
                Some(filter) => filter.matches(&egg),
                None => true,
            };

            if matches {
                results.push(EggDatetimeSearchResult { egg });
            }
        }
    }
}
```

### 4.3 タスク生成関数

`expand_combinations` は `datetime_search/mtseed.rs` に既に存在するため、`mod.rs` に共通関数として移動し、両 Searcher から利用する。

```rust
// datetime_search/mod.rs

use crate::types::{DatetimeSearchContext, StartupCondition};

/// 組み合わせ展開 (共通関数)
///
/// `DatetimeSearchContext` から `Timer0` × `VCount` × `KeyCode` の全組み合わせを展開する。
pub(crate) fn expand_combinations(context: &DatetimeSearchContext) -> Vec<StartupCondition> {
    let key_codes = context.key_spec.combinations();
    let mut combinations = Vec::new();

    for range in &context.ranges {
        for timer0 in range.timer0_min..=range.timer0_max {
            for vcount in range.vcount_min..=range.vcount_max {
                for &key_code in &key_codes {
                    combinations.push(StartupCondition::new(timer0, vcount, key_code));
                }
            }
        }
    }
    combinations
}
```

```rust
// datetime_search/egg.rs

use super::expand_combinations;

/// タスク生成関数
///
/// `DatetimeSearchContext` から組み合わせを展開し、
/// 各 Worker に渡すパラメータを生成する。
#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn generate_egg_search_tasks(
    context: DatetimeSearchContext,
    search_range: SearchRangeParams,
    egg_params: EggGenerationParams,
    gen_config: GenerationConfig,
    filter: Option<EggFilter>,
) -> Vec<EggDatetimeSearchParams> {
    // 組み合わせ展開 (共通関数を使用)
    let combinations = expand_combinations(&context);

    // タスク生成 (各組み合わせにつき1タスク)
    combinations
        .into_iter()
        .map(|condition| EggDatetimeSearchParams {
            ds: context.ds.clone(),
            time_range: context.time_range.clone(),
            search_range: search_range.clone(),
            condition,
            egg_params: egg_params.clone(),
            gen_config: gen_config.clone(),
            filter: filter.clone(),
        })
        .collect()
}
```

### 4.4 モジュール公開

```rust
// datetime_search/mod.rs

pub mod base;
pub mod egg;
pub mod mtseed;

use crate::types::{DatetimeSearchContext, StartupCondition};

pub use egg::{
    EggDatetimeSearchBatch, EggDatetimeSearchParams, EggDatetimeSearchResult,
    EggDatetimeSearcher, generate_egg_search_tasks,
};
pub use mtseed::{
    MtseedDatetimeSearchBatch, MtseedDatetimeSearchParams, MtseedDatetimeSearcher,
    generate_mtseed_search_tasks,
};

/// 組み合わせ展開 (共通関数)
pub(crate) fn expand_combinations(context: &DatetimeSearchContext) -> Vec<StartupCondition> {
    // (実装は 4.3 を参照)
}
```

## 5. テスト方針

### 5.1 ユニットテスト

| テストケース | 検証内容 |
|--------------|----------|
| `test_searcher_creation` | `EggDatetimeSearcher` が正常に作成されること |
| `test_searcher_progress` | 進捗が正しく計算されること |

> **注意**: フィルター型のユニットテストは [local_019](../local_019/FILTER_REDESIGN.md) で実施済み。

### 5.2 統合テスト

| テストケース | 検証内容 |
|--------------|----------|
| `test_egg_search_finds_known_result` | 既知のパラメータで期待結果が見つかること |
| `test_generate_egg_search_tasks` | タスク生成が正しく組み合わせを展開すること |
| `test_batch_processing` | バッチ処理が正しく進捗を更新すること |

### 5.3 コマンド

```powershell
cd wasm-pkg
cargo test datetime_search::egg
wasm-pack build --target web
```

## 6. 実装チェックリスト

> **前提**: [local_019](../local_019/FILTER_REDESIGN.md) (フィルター設計) が実装済みであること。

- [x] `datetime_search/mod.rs` に `expand_combinations` を共通関数として移動
- [x] `datetime_search/mtseed.rs` の `expand_combinations` を `mod.rs` のものに置き換え
- [x] `datetime_search/egg.rs` 新規作成
  - [x] `EggDatetimeSearchParams`
  - [x] `EggDatetimeSearchResult`
  - [x] `EggDatetimeSearchBatch`
  - [x] `EggDatetimeSearcher`
  - [x] `generate_egg_search_tasks`
- [x] `datetime_search/mod.rs` に `egg` モジュール追加・re-export
- [x] `lib.rs` に WASM エクスポート追加
- [x] ユニットテスト追加
- [x] `cargo test` パス確認
- [x] `cargo clippy` 警告なし
- [x] `wasm-pack build --target web` 成功確認

## 7. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [local_015](../local_015/MTSEED_DATETIME_SEARCHER_REDESIGN.md) | `MtseedDatetimeSearcher` 再設計 |
| [local_016](../local_016/GENERATOR_REDESIGN.md) | Generator 再設計 |
| [local_017](../local_017/EGG_GENERATION_REDESIGN.md) | タマゴ生成ロジック再設計 |
| [local_019](../local_019/FILTER_REDESIGN.md) | フィルター設計 (前提) |
