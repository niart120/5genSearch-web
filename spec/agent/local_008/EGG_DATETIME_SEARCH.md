# 孵化起動時刻検索 仕様書

## 1. 概要

### 1.1 目的

目標の孵化個体を生成する起動時刻を逆算する機能を実装する。mig_002 仕様書 [datetime-search/egg.md](../mig_002/datetime-search/egg.md) に対応。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| EggDatetimeSearcher | 孵化起動時刻検索器 |
| HashValuesEnumerator | 起動時刻を列挙し LCG Seed を計算 (local_003) |
| EggGenerator | LCG Seed から孵化個体を生成 (local_005) |
| IndividualFilter | 孵化個体のフィルター条件 |
| EggSearchResult | 検索結果 (起動時刻 + 個体情報) |

### 1.3 背景・問題

- local_003 で MtseedDatetimeSearcher (MT Seed 検索) を実装
- local_005 で EggGenerator (孵化個体生成) を実装
- 両者を合成して孵化起動時刻検索を実現する

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 孵化起動時刻逆算 | 目標孵化個体を生成する起動日時を特定 |
| フィルタリング | IV/性格/色違い等で条件絞り込み |
| 並列化 | セグメント単位で Worker 分割 |

### 1.5 着手条件

- local_003 (datetime_search/base, mtseed) が完了
- local_005 (generation/flows/egg) が完了

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/datetime_search/mod.rs` | 変更 | egg モジュール追加 |
| `wasm-pkg/src/datetime_search/types.rs` | 変更 | IndividualFilter, IvRange, ShinyFilter 追加 |
| `wasm-pkg/src/datetime_search/egg.rs` | 新規 | EggDatetimeSearcher |

## 3. 設計方針

### 3.1 モジュール構成

```
wasm-pkg/src/datetime_search/
├── mod.rs          # egg モジュール追加
├── types.rs        # IndividualFilter 等追加
├── base.rs         # (local_003 で作成済み)
├── mtseed.rs       # (local_003 で作成済み)
└── egg.rs          # EggDatetimeSearcher (本モジュール)
```

### 3.2 依存関係

```
datetime_search/base.rs (HashValuesEnumerator)
           +
generation/flows/egg.rs (EggGenerator)
           ↓
datetime_search/egg.rs (EggDatetimeSearcher)
           ↓
datetime_search/types.rs (IndividualFilter)
```

### 3.3 処理フロー

```
1. EggDatetimeSearcher.new(params) でイテレータ初期化
2. Worker ループで next_batch(result_limit, chunk_seconds) を呼び出し
3. 内部で HashValuesEnumerator が日時を列挙し LCG Seed を計算
4. 各 LCG Seed に対して EggGenerator で孵化個体を生成
5. IndividualFilter で条件照合
6. マッチした結果を返却
```

### 3.4 MT Seed 検索との違い

| 項目 | MT Seed 検索 | 孵化検索 |
|------|-------------|---------|
| 照合対象 | MT Seed 値 | 生成された孵化個体 |
| 照合ロジック | Set.contains() | Filter.matches() |
| 出力 | 起動時刻のみ | 起動時刻 + 個体情報 |
| 計算量 | O(日時数) | O(日時数 × 消費範囲) |

## 4. 実装仕様

### 4.1 datetime_search/types.rs への追加

```rust
/// IV範囲
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct IvRange {
    pub min: u8,
    pub max: u8,
}

/// 色違いフィルター
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ShinyFilter {
    /// 色違いのみ (Star or Square)
    StarSquare,
    /// 星型のみ
    Star,
    /// ひし形のみ
    Square,
}

/// 孵化個体フィルター
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct IndividualFilter {
    /// 各ステータスの IV 範囲 [HP, Atk, Def, SpA, SpD, Spe]
    pub iv_ranges: Option<[IvRange; 6]>,
    /// 性格フィルター
    pub nature: Option<Nature>,
    /// 性別フィルター
    pub gender: Option<Gender>,
    /// 特性フィルター
    pub ability_slot: Option<AbilitySlot>,
    /// 色違いフィルター
    pub shiny_type: Option<ShinyFilter>,
    /// めざパタイプ (0-15)
    pub hidden_power_type: Option<u8>,
}
```

### 4.2 datetime_search/egg.rs

```rust
//! 孵化起動時刻検索

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::generation::flows::egg::{EggGenerator, EggGenerationParams, EggIndividual};
use crate::types::{AbilitySlot, Gender, LcgSeed, Nature, ShinyType};

use super::base::HashValuesEnumerator;
use super::types::{
    DsConfig, IndividualFilter, IvRange, SearchRangeParams, SearchSegment, ShinyFilter,
    TimeRangeParams,
};

// EggConditions, ParentsIVs, AdvanceRange, GameStartConfig は
// generation/flows/types.rs から re-export されることを想定

/// 孵化検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggDatetimeSearchParams {
    // === 起動時刻検索 ===
    pub ds: DsConfig,
    pub time_range: TimeRangeParams,
    pub search_range: SearchRangeParams,
    pub segment: SearchSegment,

    // === 孵化個体生成 ===
    pub game_start_config: GameStartConfig,
    pub user_offset: u64,
    pub advance_range: AdvanceRange,
    pub conditions: EggConditions,
    pub parents: ParentsIVs,

    // === フィルタリング ===
    pub filter: Option<IndividualFilter>,
}

/// 検索結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggDatetimeSearchResult {
    // === 起動条件 ===
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
    pub timer0: u16,
    pub vcount: u8,
    pub key_code: u32,

    // === Seed 情報 ===
    pub lcg_seed: u64,

    // === 個体情報 ===
    pub advance: u64,
    pub ivs: [u8; 6],
    pub nature: Nature,
    pub gender: Gender,
    pub ability_slot: AbilitySlot,
    pub shiny_type: ShinyType,
    pub pid: u32,
    pub hidden_power_type: u8,
    pub hidden_power_power: u8,
}

/// バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggDatetimeSearchBatch {
    pub results: Vec<EggDatetimeSearchResult>,
    pub processed_seconds: u64,
    pub total_seconds: u64,
}

/// 孵化起動時刻検索器
#[wasm_bindgen]
pub struct EggDatetimeSearcher {
    hash_enumerator: HashValuesEnumerator,

    // 孵化生成パラメータ
    game_start_config: GameStartConfig,
    user_offset: u64,
    advance_range: AdvanceRange,
    conditions: EggConditions,
    parents: ParentsIVs,

    // フィルター
    filter: Option<IndividualFilter>,

    // 進捗
    total_seconds: u64,
    segment: SearchSegment,
}

#[wasm_bindgen]
impl EggDatetimeSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new(params: EggDatetimeSearchParams) -> Result<EggDatetimeSearcher, String> {
        let hash_enumerator = HashValuesEnumerator::new(
            &params.ds,
            &params.time_range,
            &params.search_range,
            params.segment,
        )?;

        Ok(Self {
            hash_enumerator,
            game_start_config: params.game_start_config,
            user_offset: params.user_offset,
            advance_range: params.advance_range,
            conditions: params.conditions,
            parents: params.parents,
            filter: params.filter,
            total_seconds: params.search_range.range_seconds as u64,
            segment: params.segment,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.hash_enumerator.is_exhausted()
    }

    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64 {
        if self.total_seconds == 0 {
            return 1.0;
        }
        self.hash_enumerator.processed_seconds() as f64 / self.total_seconds as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(
        &mut self,
        result_limit: u32,
        chunk_seconds: u32,
    ) -> EggDatetimeSearchBatch {
        let mut results = Vec::new();
        let start_processed = self.hash_enumerator.processed_seconds();

        while self.hash_enumerator.processed_seconds() - start_processed < chunk_seconds as u64
            && results.len() < result_limit as usize
        {
            let (entries, len) = self.hash_enumerator.next_quad();
            if len == 0 {
                break;
            }

            for i in 0..len as usize {
                let lcg_seed = entries[i].lcg_seed;
                self.generate_and_filter(lcg_seed, &entries[i], &mut results);

                if results.len() >= result_limit as usize {
                    break;
                }
            }
        }

        EggDatetimeSearchBatch {
            results,
            processed_seconds: self.hash_enumerator.processed_seconds(),
            total_seconds: self.total_seconds,
        }
    }
}

impl EggDatetimeSearcher {
    /// LCG Seed から孵化個体を生成し、フィルターに一致するものを追加
    fn generate_and_filter(
        &self,
        lcg_seed: u64,
        entry: &HashEntry,
        results: &mut Vec<EggDatetimeSearchResult>,
    ) {
        let gen_params = EggGenerationParams {
            lcg_seed: LcgSeed::new(lcg_seed),
            game_start_config: self.game_start_config,
            user_offset: self.user_offset,
            advance_range: self.advance_range,
            conditions: self.conditions.clone(),
            parents: self.parents,
        };

        let mut generator = EggGenerator::new(gen_params);

        while !generator.is_done() {
            let eggs = generator.next_batch(100);

            for egg in eggs {
                if self.matches_filter(&egg) {
                    results.push(self.create_result(lcg_seed, entry, &egg));
                }
            }
        }
    }

    fn matches_filter(&self, egg: &EggIndividual) -> bool {
        let Some(filter) = &self.filter else {
            return true;
        };

        // IV 範囲チェック
        if let Some(ranges) = &filter.iv_ranges {
            for (i, range) in ranges.iter().enumerate() {
                if egg.ivs[i] < range.min || egg.ivs[i] > range.max {
                    return false;
                }
            }
        }

        // 性格チェック
        if let Some(nature) = filter.nature {
            if egg.nature != nature {
                return false;
            }
        }

        // 性別チェック
        if let Some(gender) = filter.gender {
            if egg.gender != gender {
                return false;
            }
        }

        // 特性チェック
        if let Some(ability_slot) = filter.ability_slot {
            if egg.ability_slot != ability_slot {
                return false;
            }
        }

        // 色違いチェック
        if let Some(shiny_filter) = filter.shiny_type {
            match shiny_filter {
                ShinyFilter::StarSquare => {
                    if egg.shiny_type == ShinyType::None {
                        return false;
                    }
                }
                ShinyFilter::Star => {
                    if egg.shiny_type != ShinyType::Star {
                        return false;
                    }
                }
                ShinyFilter::Square => {
                    if egg.shiny_type != ShinyType::Square {
                        return false;
                    }
                }
            }
        }

        // めざパタイプチェック
        if let Some(hp_type) = filter.hidden_power_type {
            if egg.hidden_power_type != hp_type {
                return false;
            }
        }

        true
    }

    fn create_result(
        &self,
        lcg_seed: u64,
        entry: &HashEntry,
        egg: &EggIndividual,
    ) -> EggDatetimeSearchResult {
        EggDatetimeSearchResult {
            year: entry.year,
            month: entry.month,
            day: entry.day,
            hour: entry.hour,
            minute: entry.minute,
            second: entry.second,
            timer0: self.segment.timer0,
            vcount: self.segment.vcount,
            key_code: self.segment.key_code,
            lcg_seed,
            advance: egg.advance,
            ivs: egg.ivs,
            nature: egg.nature,
            gender: egg.gender,
            ability_slot: egg.ability_slot,
            shiny_type: egg.shiny_type,
            pid: egg.pid,
            hidden_power_type: egg.hidden_power_type,
            hidden_power_power: egg.hidden_power_power,
        }
    }
}
```

### 4.3 datetime_search/mod.rs への追加

```rust
pub mod egg;

pub use egg::{
    EggDatetimeSearchBatch, EggDatetimeSearchParams, EggDatetimeSearchResult,
    EggDatetimeSearcher,
};
pub use types::{IndividualFilter, IvRange, ShinyFilter};
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | テスト内容 |
|-----------|-----------|
| `IndividualFilter` | フィルター条件の正常動作 |
| `matches_filter` | 各条件の境界値テスト |

### 5.2 統合テスト

| テスト | 検証内容 |
|--------|----------|
| EggDatetimeSearcher | 既知のパラメータで期待結果が返ること |
| next_batch | バッチ処理の進捗計算 |
| Worker 統合 | セグメント並列化動作 |

### 5.3 コマンド

```powershell
cd wasm-pkg
cargo test datetime_search::egg
wasm-pack build --target web
```

## 6. 実装チェックリスト

- [ ] `wasm-pkg/src/datetime_search/types.rs` 更新
  - [ ] IvRange
  - [ ] ShinyFilter
  - [ ] IndividualFilter
- [ ] `wasm-pkg/src/datetime_search/egg.rs` 作成
  - [ ] EggDatetimeSearchParams
  - [ ] EggDatetimeSearchResult
  - [ ] EggDatetimeSearchBatch
  - [ ] EggDatetimeSearcher
  - [ ] matches_filter ロジック
- [ ] `wasm-pkg/src/datetime_search/mod.rs` 更新
- [ ] `cargo test` パス確認
- [ ] `wasm-pack build --target web` 成功確認

## 7. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [local_003](../local_003/DATETIME_SEARCH_ENGINE.md) | 起動時刻検索エンジン基盤 |
| [local_005](../local_005/GENERATION_FLOWS.md) | 孵化個体生成 (EggGenerator) |
| [mig_002/datetime-search/egg.md](../mig_002/datetime-search/egg.md) | 元仕様書 |
| [mig_002/datetime-search/base.md](../mig_002/datetime-search/base.md) | 共通基盤仕様 |
