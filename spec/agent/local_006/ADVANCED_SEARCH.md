# 高度な検索機能 仕様書

## 1. 概要

### 1.1 目的

針リスト検索と MT Seed 逆算検索を実装する。mig_002 仕様書の Phase 5 (検索ユーティリティ) に対応。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| NeedleSearch | 針方向パターンからの Seed 検索 |
| MtseedSearch | 観測値から MT Seed を逆算 |
| Observation | 観測データ (IV, 性格など) |
| IvObservation | IV のみの観測データ |

### 1.3 背景・問題

- local_003-005 で基盤機能が実装済み
- 高度な検索機能を misc/, seed_search/ に実装

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 針検索 | Cgear 針パターンから Seed 特定 |
| MT Seed 逆算 | 観測 IV から MT Seed を逆算 |

### 1.5 着手条件

- local_001-005 が完了

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/lib.rs` | 変更 | misc, seed_search モジュール追加 |
| `wasm-pkg/src/misc/mod.rs` | 新規 | モジュール宣言 |
| `wasm-pkg/src/misc/needle_search.rs` | 新規 | 針リスト検索 |
| `wasm-pkg/src/seed_search/mod.rs` | 新規 | モジュール宣言 |
| `wasm-pkg/src/seed_search/mtseed.rs` | 新規 | MT Seed 逆算 |

## 3. 設計方針

### 3.1 モジュール構成

```
wasm-pkg/src/
├── lib.rs              # misc, seed_search モジュール追加
├── misc/
│   ├── mod.rs          # re-export
│   └── needle_search.rs # 針リスト検索
└── seed_search/
    ├── mod.rs          # re-export
    └── mtseed.rs       # MT Seed 逆算
```

### 3.2 依存関係

```
types/ + core/ + generation/
           ↓
misc/needle_search.rs
seed_search/mtseed.rs
```

## 4. 実装仕様

### 4.1 misc/needle_search.rs

参照: [mig_002/misc/needle-search.md](../mig_002/misc/needle-search.md)

```rust
//! 針リスト検索

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::NeedleDirection;
use crate::types::LcgSeed;

/// 針パターン検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchParams {
    /// 観測した針方向列 (0-7)
    pub observed_pattern: Vec<u8>,
    /// 検索開始 Seed
    pub start_seed: u64,
    /// 検索範囲 (消費数)
    pub search_range: u32,
}

/// 針パターン検索結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchResult {
    /// 一致した Seed
    pub seed: u64,
    /// 一致した消費位置
    pub advance: u32,
    /// パターン一致度 (0.0-1.0)
    pub confidence: f64,
}

/// 針パターン検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchBatch {
    pub results: Vec<NeedleSearchResult>,
    pub processed: u64,
    pub total: u64,
}

/// 針パターン検索器
#[wasm_bindgen]
pub struct NeedleSearcher {
    params: NeedleSearchParams,
    current_advance: u32,
    lcg: Lcg64,
}

#[wasm_bindgen]
impl NeedleSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new(params: NeedleSearchParams) -> Result<NeedleSearcher, String> {
        if params.observed_pattern.is_empty() {
            return Err("observed_pattern is empty".into());
        }
        if params.observed_pattern.iter().any(|&d| d > 7) {
            return Err("Invalid needle direction (must be 0-7)".into());
        }

        let lcg = Lcg64::new(params.start_seed);

        Ok(Self {
            params,
            current_advance: 0,
            lcg,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.current_advance >= self.params.search_range
    }

    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64 {
        if self.params.search_range == 0 {
            return 1.0;
        }
        self.current_advance as f64 / self.params.search_range as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_size: u32) -> NeedleSearchBatch {
        let mut results = Vec::new();
        let pattern_len = self.params.observed_pattern.len();
        let end_advance = (self.current_advance + chunk_size).min(self.params.search_range);

        while self.current_advance < end_advance {
            // 現在位置からパターン長分の針方向を生成
            let mut match_count = 0;
            let mut test_lcg = self.lcg.clone();

            for i in 0..pattern_len {
                let seed = LcgSeed::new(test_lcg.seed());
                let direction = NeedleDirection::from_seed(seed).value();

                if direction == self.params.observed_pattern[i] {
                    match_count += 1;
                }

                test_lcg.next();
            }

            let confidence = match_count as f64 / pattern_len as f64;

            // 完全一致または高い一致度のみ報告
            if confidence >= 0.8 {
                results.push(NeedleSearchResult {
                    seed: self.lcg.seed(),
                    advance: self.current_advance,
                    confidence,
                });
            }

            self.lcg.next();
            self.current_advance += 1;
        }

        NeedleSearchBatch {
            results,
            processed: self.current_advance as u64,
            total: self.params.search_range as u64,
        }
    }
}

/// 単発検索: 特定 Seed からの針パターンを取得
#[wasm_bindgen]
pub fn get_needle_pattern(seed: u64, length: u32) -> Vec<u8> {
    let mut lcg = Lcg64::new(seed);
    let mut pattern = Vec::with_capacity(length as usize);

    for _ in 0..length {
        let direction = NeedleDirection::from_seed(LcgSeed::new(lcg.seed())).value();
        pattern.push(direction);
        lcg.next();
    }

    pattern
}
```

### 4.2 misc/mod.rs

```rust
//! 雑多なユーティリティ

pub mod needle_search;

pub use needle_search::{
    get_needle_pattern, NeedleSearchBatch, NeedleSearcher, NeedleSearchParams, NeedleSearchResult,
};
```

### 4.3 seed_search/mtseed.rs

参照: [mig_002/seed-search/mtseed.md](../mig_002/seed-search/mtseed.md)

```rust
//! MT Seed 逆算検索

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::core::mt::Mt19937;
use crate::generation::algorithm::{extract_iv, Ivs};
use crate::types::MtSeed;

/// 観測データ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(tag = "kind")]
pub enum Observation {
    /// 個体値観測
    Ivs {
        ivs: [u8; 6],
        order: u32,
    },
    /// 性格観測
    Nature {
        nature: u8,
        order: u32,
    },
    /// PID 下位観測
    PidLow {
        low: u16,
        order: u32,
    },
}

/// IV のみの観測 (簡易版)
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct IvObservation {
    pub ivs: [u8; 6],
}

/// MT Seed 検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedSearchParams {
    pub observations: Vec<Observation>,
    pub advances_min: u32,
    pub advances_max: u32,
}

/// MT Seed 検索結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedResult {
    pub seed: u32,
    pub initial_advances: u32,
    pub confidence: f64,
}

/// MT Seed 検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedSearchBatch {
    pub candidates: Vec<MtseedResult>,
    pub processed: u64,
    pub total: u64,
}

/// MT Seed 検索器
#[wasm_bindgen]
pub struct MtseedSearcher {
    params: MtseedSearchParams,
    current_seed: u64,
    processed: u64,
    total: u64,
}

#[wasm_bindgen]
impl MtseedSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new(params: MtseedSearchParams) -> Result<MtseedSearcher, String> {
        if params.observations.is_empty() {
            return Err("observations is empty".into());
        }

        let advances_range = (params.advances_max - params.advances_min) as u64;
        let total = advances_range * 0x100000000; // 32bit Seed 空間

        Ok(Self {
            params,
            current_seed: 0,
            processed: 0,
            total,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.current_seed > 0xFFFFFFFF
    }

    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64 {
        self.current_seed as f64 / 0x100000000u64 as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_size: u32) -> MtseedSearchBatch {
        let mut candidates = Vec::new();
        let end_seed = (self.current_seed + chunk_size as u64).min(0x100000000);

        while self.current_seed < end_seed {
            let seed = self.current_seed as u32;

            if self.verify_seed(seed) {
                candidates.push(MtseedResult {
                    seed,
                    initial_advances: self.params.advances_min,
                    confidence: 1.0,
                });
            }

            self.current_seed += 1;
            self.processed += 1;
        }

        MtseedSearchBatch {
            candidates,
            processed: self.processed,
            total: 0x100000000,
        }
    }

    /// Seed が観測値と一致するか検証
    fn verify_seed(&self, seed: u32) -> bool {
        for obs in &self.params.observations {
            match obs {
                Observation::Ivs { ivs, order } => {
                    let generated = generate_ivs_at(seed, *order);
                    if generated != *ivs {
                        return false;
                    }
                }
                Observation::Nature { nature, order } => {
                    // 性格検証は簡略化
                    let _ = (nature, order);
                }
                Observation::PidLow { low, order } => {
                    // PID 下位検証は簡略化
                    let _ = (low, order);
                }
            }
        }
        true
    }
}

/// 指定 Seed, 消費位置での IV を生成
fn generate_ivs_at(seed: u32, advances: u32) -> [u8; 6] {
    let mut mt = Mt19937::new(seed);

    // advances + 7 回スキップ (7回は初期破棄)
    for _ in 0..(advances + 7) {
        mt.next();
    }

    [
        extract_iv(mt.next()),
        extract_iv(mt.next()),
        extract_iv(mt.next()),
        extract_iv(mt.next()),
        extract_iv(mt.next()),
        extract_iv(mt.next()),
    ]
}

/// 個体値列から MT Seed を検索 (簡易版)
#[wasm_bindgen]
pub fn search_mtseed_by_ivs(observations: Vec<IvObservation>) -> Vec<MtseedResult> {
    if observations.is_empty() {
        return Vec::new();
    }

    let first_ivs = &observations[0].ivs;
    let mut candidates = Vec::new();

    // 全 Seed 空間を探索 (高速化には逆算アルゴリズムが必要)
    // 実際には GPU 並列化または逆算アルゴリズムを使用
    for seed in 0u32..=0xFFFF {
        // サンプル: 一部のみ探索
        let generated = generate_ivs_at(seed, 0);
        if &generated == first_ivs {
            candidates.push(MtseedResult {
                seed,
                initial_advances: 0,
                confidence: 1.0,
            });
        }
    }

    candidates
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_ivs_at() {
        let ivs = generate_ivs_at(0x12345678, 0);
        assert!(ivs.iter().all(|&iv| iv <= 31));
    }
}
```

### 4.4 seed_search/mod.rs

```rust
//! Seed 検索機能

pub mod mtseed;

pub use mtseed::{
    search_mtseed_by_ivs, IvObservation, MtseedResult, MtseedSearchBatch, MtseedSearcher,
    MtseedSearchParams, Observation,
};
```

### 4.5 lib.rs の更新

```rust
// 既存のモジュール宣言に追加
pub mod misc;
pub mod seed_search;

// re-export
pub use misc::{get_needle_pattern, NeedleSearcher, NeedleSearchParams, NeedleSearchResult};
pub use seed_search::{
    search_mtseed_by_ivs, IvObservation, MtseedResult, MtseedSearcher, MtseedSearchParams,
    Observation,
};
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | テスト内容 |
|-----------|-----------|
| `needle_search.rs` | パターン一致検出 |
| `mtseed.rs` | IV 生成の正確性 |
| `mtseed.rs` | Seed 検証ロジック |

### 5.2 コマンド

```powershell
cd wasm-pkg
cargo test
wasm-pack build --target web
```

## 6. 実装チェックリスト

- [ ] `wasm-pkg/src/misc/mod.rs` 作成
- [ ] `wasm-pkg/src/misc/needle_search.rs` 作成
  - [ ] NeedleSearchParams
  - [ ] NeedleSearcher
  - [ ] get_needle_pattern
- [ ] `wasm-pkg/src/seed_search/mod.rs` 作成
- [ ] `wasm-pkg/src/seed_search/mtseed.rs` 作成
  - [ ] Observation enum
  - [ ] IvObservation
  - [ ] MtseedSearcher
  - [ ] search_mtseed_by_ivs
  - [ ] generate_ivs_at
- [ ] `wasm-pkg/src/lib.rs` 更新
- [ ] `cargo test` パス確認
- [ ] `wasm-pack build --target web` 成功確認
