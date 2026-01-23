# 高度な検索機能 仕様書

## 1. 概要

### 1.1 目的

レポート針検索と MT Seed 全探索機能を実装する。mig_002 仕様書の Phase 5 (検索ユーティリティ) に対応。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| レポート針 | ゲーム内セーブ画面で表示される針の方向 (0-7 の 8 方向) |
| NeedleSearch | レポート針パターンからの消費位置・起動条件検索 |
| MtseedSearch | 指定オフセットで条件を満たす IV が生成される MT Seed を全探索 |
| IvFilter | IV フィルタ条件 (最小値・最大値による範囲指定) |

### 1.3 背景・問題

- local_003-005 で基盤機能が実装済み
- レポート針検索と MT Seed 検索を misc/, seed_search/ に実装
- 既存の `generation/algorithm/needle.rs` で針方向計算は実装済み

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| レポート針検索 | 観測したレポート針パターンから消費位置または起動条件を特定 |
| MT Seed 全探索 | 指定オフセットで条件を満たす IV が生成される MT Seed を特定 |

### 1.5 着手条件

- local_001-005 が完了

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/lib.rs` | 変更 | misc, seed_search モジュール追加 |
| `wasm-pkg/src/misc/mod.rs` | 新規 | モジュール宣言 |
| `wasm-pkg/src/misc/needle_search.rs` | 新規 | レポート針検索 (既存 algorithm を活用) |
| `wasm-pkg/src/seed_search/mod.rs` | 新規 | モジュール宣言 |
| `wasm-pkg/src/seed_search/mtseed.rs` | 新規 | MT Seed 全探索 |

## 3. 設計方針

### 3.1 モジュール構成

```
wasm-pkg/src/
├── lib.rs              # misc, seed_search モジュール追加
├── misc/
│   ├── mod.rs          # re-export
│   └── needle_search.rs # レポート針検索
└── seed_search/
    ├── mod.rs          # re-export
    └── mtseed.rs       # MT Seed 全探索
```

### 3.2 依存関係

```
types/ + core/ + generation/algorithm/
           ↓
misc/needle_search.rs   ← generation/algorithm/needle.rs を活用
seed_search/mtseed.rs   ← generation/algorithm/iv.rs を活用
```

### 3.3 レポート針検索の設計

#### 3.3.1 検索モード

| モード | 入力 | 用途 |
|--------|------|------|
| `InitialSeed` | LcgSeed + 消費範囲 | 既知 Seed からの消費位置特定 |
| `Startup` | 起動条件 + Timer0/VCount 範囲 | 起動条件の検証・特定 (将来拡張) |

**Phase 1 (本仕様)**: `InitialSeed` モードのみ実装。`Startup` モードは将来拡張。

#### 3.3.2 既存実装の活用

- 針方向計算: `generation/algorithm/needle::calculate_needle_direction(LcgSeed)`
- LCG 操作: `core/lcg::Lcg64`
- 型定義: `types::LcgSeed`, `types::NeedleDirection`

### 3.4 MT Seed 全探索の設計

#### 3.4.1 機能概要

指定したオフセットから検索条件 (IV フィルタ) を満たす個体値が生成される MT Seed を全探索する。

```
MT Seed 空間 (0x00000000 - 0xFFFFFFFF)
    │
    └─ 各 Seed に対して:
        1. MT19937 を初期化
        2. 指定オフセット分スキップ
        3. IV を生成
        4. IV フィルタ条件と照合
        5. 一致すれば候補として記録
```

#### 3.4.2 IV フィルタ条件

```rust
/// IV フィルタ条件
pub struct IvFilter {
    pub hp:  (u8, u8),  // (min, max)
    pub atk: (u8, u8),
    pub def: (u8, u8),
    pub spa: (u8, u8),
    pub spd: (u8, u8),
    pub spe: (u8, u8),
}
```

#### 3.4.3 既存実装の活用

- IV 生成: `generation/algorithm/iv::generate_rng_ivs_with_offset(MtSeed, offset)`
- MT 操作: `core/mt::Mt19937`
- 型定義: `types::MtSeed`, `types::Ivs`

## 4. 実装仕様

### 4.1 misc/needle_search.rs

参照: [mig_002/misc/needle-search.md](../mig_002/misc/needle-search.md)

```rust
//! レポート針検索
//!
//! 観測したレポート針パターンから消費位置を特定する機能。
//! 既存の `generation/algorithm/needle.rs` を活用。

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::core::lcg::Lcg64;
use crate::generation::algorithm::calculate_needle_direction;
use crate::types::{LcgSeed, NeedleDirection};

/// レポート針パターン (0-7 の方向値列)
pub type NeedlePattern = Vec<u8>;

/// レポート針検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchParams {
    /// 初期 LCG Seed
    pub initial_seed: LcgSeed,
    /// 観測したレポート針パターン (0-7)
    pub pattern: NeedlePattern,
    /// 検索開始消費位置
    pub advance_min: u32,
    /// 検索終了消費位置
    pub advance_max: u32,
}

/// レポート針検索結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchResult {
    /// パターン開始消費位置
    pub advance: u32,
    /// パターン開始時点の LCG Seed
    pub seed: LcgSeed,
}

/// レポート針検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchBatch {
    pub results: Vec<NeedleSearchResult>,
    pub processed: u64,
    pub total: u64,
}

/// レポート針検索器
#[wasm_bindgen]
pub struct NeedleSearcher {
    pattern: NeedlePattern,
    advance_max: u32,
    current_advance: u32,
    lcg: Lcg64,
    total: u64,
}

#[wasm_bindgen]
impl NeedleSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new(params: NeedleSearchParams) -> Result<NeedleSearcher, String> {
        if params.pattern.is_empty() {
            return Err("pattern is empty".into());
        }
        if params.pattern.iter().any(|&d| d > 7) {
            return Err("Invalid needle direction (must be 0-7)".into());
        }
        if params.advance_min > params.advance_max {
            return Err("advance_min > advance_max".into());
        }

        // 初期位置まで LCG を進める
        let lcg = Lcg64::new_at(params.initial_seed, params.advance_min as u64);
        let total = (params.advance_max - params.advance_min) as u64;

        Ok(Self {
            pattern: params.pattern,
            advance_max: params.advance_max,
            current_advance: params.advance_min,
            lcg,
            total,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.current_advance >= self.advance_max
    }

    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64 {
        if self.total == 0 {
            return 1.0;
        }
        (self.current_advance as u64 - (self.advance_max as u64 - self.total)) as f64
            / self.total as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_size: u32) -> NeedleSearchBatch {
        let mut results = Vec::new();
        let pattern_len = self.pattern.len();
        let end_advance = (self.current_advance + chunk_size).min(self.advance_max);

        while self.current_advance < end_advance {
            // 現在位置でパターン一致判定
            if self.matches_pattern() {
                results.push(NeedleSearchResult {
                    advance: self.current_advance,
                    seed: self.lcg.current_seed(),
                });
            }

            self.lcg.advance(1);
            self.current_advance += 1;
        }

        NeedleSearchBatch {
            results,
            processed: self.current_advance as u64,
            total: self.advance_max as u64,
        }
    }

    /// 現在位置からパターンが一致するか判定
    fn matches_pattern(&self) -> bool {
        let mut test_seed = self.lcg.current_seed();

        for &expected in &self.pattern {
            let direction = calculate_needle_direction(test_seed);
            if direction.value() != expected {
                return false;
            }
            test_seed = Lcg64::compute_next(test_seed);
        }

        true
    }
}

/// 指定 Seed から針パターンを取得
#[wasm_bindgen]
pub fn get_needle_pattern(seed: LcgSeed, length: u32) -> Vec<u8> {
    let mut pattern = Vec::with_capacity(length as usize);
    let mut current_seed = seed;

    for _ in 0..length {
        let direction = calculate_needle_direction(current_seed);
        pattern.push(direction.value());
        current_seed = Lcg64::compute_next(current_seed);
    }

    pattern
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_needle_pattern() {
        let seed = LcgSeed::new(0x0123456789ABCDEF);
        let pattern = get_needle_pattern(seed, 5);
        assert_eq!(pattern.len(), 5);
        assert!(pattern.iter().all(|&d| d <= 7));
    }

    #[test]
    fn test_needle_searcher() {
        let seed = LcgSeed::new(0x0123456789ABCDEF);
        let pattern = get_needle_pattern(seed, 3);

        let params = NeedleSearchParams {
            initial_seed: seed,
            pattern,
            advance_min: 0,
            advance_max: 10,
        };

        let mut searcher = NeedleSearcher::new(params).unwrap();
        let batch = searcher.next_batch(100);

        // 先頭位置で一致するはず
        assert!(!batch.results.is_empty());
        assert_eq!(batch.results[0].advance, 0);
    }
}
```

### 4.2 misc/mod.rs

```rust
//! 雑多なユーティリティ

pub mod needle_search;

pub use needle_search::{
    get_needle_pattern, NeedlePattern, NeedleSearchBatch, NeedleSearcher, NeedleSearchParams,
    NeedleSearchResult,
};
```

### 4.3 seed_search/mtseed.rs

参照: [mig_002/seed-search/mtseed.md](../mig_002/seed-search/mtseed.md)

**機能**: 指定オフセットで IV フィルタ条件を満たす MT Seed を全探索する。

```rust
//! MT Seed 全探索
//!
//! 指定オフセットから検索条件を満たす IV が生成される MT Seed を全探索する機能。

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::generation::algorithm::generate_rng_ivs_with_offset;
use crate::types::{Ivs, MtSeed};

/// IV フィルタ条件
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, Default)]
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
}

impl IvFilter {
    /// 全範囲 (0-31) を許容するフィルタ
    pub const fn any() -> Self {
        Self {
            hp: (0, 31),
            atk: (0, 31),
            def: (0, 31),
            spa: (0, 31),
            spd: (0, 31),
            spe: (0, 31),
        }
    }

    /// 指定 IV が条件を満たすか判定
    #[inline]
    pub fn matches(&self, ivs: &Ivs) -> bool {
        ivs.hp >= self.hp.0
            && ivs.hp <= self.hp.1
            && ivs.atk >= self.atk.0
            && ivs.atk <= self.atk.1
            && ivs.def >= self.def.0
            && ivs.def <= self.def.1
            && ivs.spa >= self.spa.0
            && ivs.spa <= self.spa.1
            && ivs.spd >= self.spd.0
            && ivs.spd <= self.spd.1
            && ivs.spe >= self.spe.0
            && ivs.spe <= self.spe.1
    }
}

/// MT Seed 検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedSearchParams {
    /// IV フィルタ条件
    pub iv_filter: IvFilter,
    /// MT オフセット (IV 生成開始位置、通常 7)
    pub mt_offset: u32,
}

/// MT Seed 検索結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedResult {
    /// 一致した MT Seed
    pub seed: MtSeed,
    /// 生成された IV
    pub ivs: Ivs,
}

/// MT Seed 検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedSearchBatch {
    /// 条件を満たした候補
    pub candidates: Vec<MtseedResult>,
    /// 処理済み Seed 数
    pub processed: u64,
    /// 総 Seed 数 (0x100000000)
    pub total: u64,
}

/// MT Seed 検索器
#[wasm_bindgen]
pub struct MtseedSearcher {
    iv_filter: IvFilter,
    mt_offset: u32,
    current_seed: u64,
}

const TOTAL_SEEDS: u64 = 0x100000000;

#[wasm_bindgen]
impl MtseedSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new(params: MtseedSearchParams) -> MtseedSearcher {
        Self {
            iv_filter: params.iv_filter,
            mt_offset: params.mt_offset,
            current_seed: 0,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.current_seed >= TOTAL_SEEDS
    }

    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64 {
        self.current_seed as f64 / TOTAL_SEEDS as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_size: u32) -> MtseedSearchBatch {
        let mut candidates = Vec::new();
        let end_seed = (self.current_seed + chunk_size as u64).min(TOTAL_SEEDS);

        while self.current_seed < end_seed {
            let seed = MtSeed::new(self.current_seed as u32);
            let ivs = generate_rng_ivs_with_offset(seed, self.mt_offset);

            if self.iv_filter.matches(&ivs) {
                candidates.push(MtseedResult { seed, ivs });
            }

            self.current_seed += 1;
        }

        MtseedSearchBatch {
            candidates,
            processed: self.current_seed,
            total: TOTAL_SEEDS,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_iv_filter_matches() {
        let filter = IvFilter {
            hp: (31, 31),
            atk: (0, 31),
            def: (0, 31),
            spa: (0, 31),
            spd: (0, 31),
            spe: (31, 31),
        };

        let ivs_match = Ivs::new(31, 15, 20, 10, 25, 31);
        let ivs_no_match = Ivs::new(30, 15, 20, 10, 25, 31);

        assert!(filter.matches(&ivs_match));
        assert!(!filter.matches(&ivs_no_match));
    }

    #[test]
    fn test_mtseed_searcher() {
        let params = MtseedSearchParams {
            iv_filter: IvFilter::any(),
            mt_offset: 7,
        };

        let mut searcher = MtseedSearcher::new(params);
        let batch = searcher.next_batch(100);

        // 全範囲フィルタなので 100 件すべて一致
        assert_eq!(batch.candidates.len(), 100);
        assert_eq!(batch.processed, 100);
    }
}
```

### 4.4 seed_search/mod.rs

```rust
//! Seed 検索機能

pub mod mtseed;

pub use mtseed::{IvFilter, MtseedResult, MtseedSearchBatch, MtseedSearcher, MtseedSearchParams};
```

### 4.5 lib.rs の更新

```rust
// 既存のモジュール宣言に追加
pub mod misc;
pub mod seed_search;

// re-export
pub use misc::{
    get_needle_pattern, NeedlePattern, NeedleSearchBatch, NeedleSearcher, NeedleSearchParams,
    NeedleSearchResult,
};
pub use seed_search::{
    IvFilter, MtseedResult, MtseedSearchBatch, MtseedSearcher, MtseedSearchParams,
};
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | テスト内容 |
|-----------|-----------|
| `needle_search.rs` | パターン一致検出、既知 Seed での針パターン取得 |
| `mtseed.rs` | IvFilter の判定ロジック、全範囲フィルタでの候補生成 |

### 5.2 統合テスト

| テスト対象 | テスト内容 |
|-----------|-----------|
| NeedleSearcher | 既知パターンでの検索一致確認 |
| MtseedSearcher | 特定 IV 条件での候補絞り込み確認 |

### 5.3 コマンド

```powershell
cd wasm-pkg
cargo test
wasm-pack build --target web
```

## 6. 実装チェックリスト

- [ ] `wasm-pkg/src/misc/mod.rs` 作成
- [ ] `wasm-pkg/src/misc/needle_search.rs` 作成
  - [ ] NeedleSearchParams (LcgSeed 起点)
  - [ ] NeedleSearcher (既存 algorithm 活用)
  - [ ] get_needle_pattern
  - [ ] ユニットテスト
- [ ] `wasm-pkg/src/seed_search/mod.rs` 作成
- [ ] `wasm-pkg/src/seed_search/mtseed.rs` 作成
  - [ ] IvFilter
  - [ ] MtseedSearchParams
  - [ ] MtseedSearcher
  - [ ] ユニットテスト
- [ ] `wasm-pkg/src/lib.rs` 更新
- [ ] `cargo test` パス確認
- [ ] `wasm-pack build --target web` 成功確認
