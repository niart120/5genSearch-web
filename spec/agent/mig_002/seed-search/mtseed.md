# WASM API 仕様書: MTSeed検索

観測値からMersenne Twister初期seedを逆算する機能。

## 1. 概要

### 1.1 機能定義

| 項目 | 内容 |
|-----|------|
| 入力 | 観測値列（Pokemon個体 or 乱数消費パターン） |
| 出力 | MTSeed候補列 |
| 計算特性 | 逆算、パターンマッチ |

### 1.2 計算原理

Gen5ではMersenne Twister (MT19937) が使用される。MTの出力列から内部状態を逆算し、初期seedを特定する。

```
観測値列 → MT出力推定 → 内部状態逆算 → 初期seed
```

### 1.3 観測値の種類

| 観測対象 | 取得可能情報 | 精度 |
|---------|-------------|------|
| 野生Pokemon個体値 | IV (6値) | 高 |
| 孵化Pokemon個体値 | IV (6値) | 高 |
| 性格値 | PID下位ビット | 中 |
| 特性スロット | 1bit | 低 |
| 性別 | 性別値範囲 | 低 |

## 2. 入力型

### 2.1 MtseedSearchParams

```rust
use serde::{Deserialize, Serialize};
use tsify_next::Tsify;

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedSearchParams {
    /// 観測データ列
    pub observations: Vec<Observation>,
    /// 消費数範囲
    pub advances_min: u32,
    pub advances_max: u32,
}
```

### 2.2 Observation

観測データ。複数種類をサポート。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(tag = "kind")]
pub enum Observation {
    /// 個体値観測
    Ivs {
        /// 個体値 [H, A, B, C, D, S]
        ivs: [u8; 6],
        /// 観測順序
        order: u32,
    },
    /// 性格観測
    Nature {
        /// 性格ID (0-24)
        nature: u8,
        order: u32,
    },
    /// 性格値下位観測
    PidLow {
        /// PID下位16bit
        low: u16,
        order: u32,
    },
}
```

### 2.3 IvObservation（簡易版）

個体値のみの観測に特化した型。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct IvObservation {
    /// 個体値 [H, A, B, C, D, S]
    pub ivs: [u8; 6],
}
```

## 3. 出力型

### 3.1 MtseedResult

候補seed。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedResult {
    /// MT Seed (初期seed)
    pub seed: MtSeed,
    /// 最初の観測に対応する消費数
    pub initial_advances: u32,
    /// 一致度スコア (観測値との整合性)
    pub confidence: f64,
}
```

### 3.2 MtseedSearchBatch

バッチ結果。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedSearchBatch {
    /// 候補列
    pub candidates: Vec<MtseedResult>,
    /// 処理済み件数
    pub processed: u64,
    /// 総件数
    pub total: u64,
}
```

## 4. WASM API

### 4.1 MtseedSearcher

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct MtseedSearcher {
    params: MtseedSearchParams,
    processed: u64,
    total: u64,
}

#[wasm_bindgen]
impl MtseedSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new(params: MtseedSearchParams) -> Result<MtseedSearcher, String> {
        if params.observations.is_empty() {
            return Err("observations is empty".to_string());
        }
        
        let total = Self::calculate_search_space(&params);
        
        Ok(MtseedSearcher {
            params,
            processed: 0,
            total,
        })
    }

    fn calculate_search_space(params: &MtseedSearchParams) -> u64 {
        // seed空間 × 消費数範囲
        let advances_range = (params.advances_max - params.advances_min) as u64;
        // 実際はIV逆算で絞り込むため、これより小さい
        advances_range * 0x100000000 // 仮の値
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.processed >= self.total
    }

    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64 {
        if self.total == 0 { return 1.0; }
        self.processed as f64 / self.total as f64
    }

    pub fn next_batch(&mut self, max_candidates: u32) -> MtseedSearchBatch {
        let mut candidates = Vec::new();
        
        // 検索ロジック
        // 1. 最初の観測値からMT出力を逆算
        // 2. 候補seed列を生成
        // 3. 後続の観測値で検証・絞り込み
        
        MtseedSearchBatch {
            candidates,
            processed: self.processed,
            total: self.total,
        }
    }
}
```

### 4.2 簡易検索関数

個体値のみからの高速検索。

```rust
/// 個体値列からMTSeedを検索
#[wasm_bindgen]
pub fn search_mtseed_by_ivs(
    observations: Vec<IvObservation>,
    advances_min: u32,
    advances_max: u32,
) -> Vec<MtseedResult> {
    // 個体値特化の高速アルゴリズム
    todo!()
}
```

## 5. アルゴリズム概要

### 5.1 IV逆算

```
IV = (MT出力 >> 27) & 0x1F  (各ステータス)
```

6つのIVから2つのMT出力（32bit × 2）を逆算可能。

### 5.2 MT状態逆算

MT19937の内部状態（624個の32bit値）のうち、連続する出力から状態を特定。

### 5.3 初期seed特定

内部状態から初期化処理を逆算し、32bit初期seedを特定。

## 6. Worker 統合

### 6.1 メッセージ型

```typescript
export type MtseedSearchRequest = {
  type: 'mtseed-search';
  params: MtseedSearchParams;
};

export type MtseedSearchResponse =
  | { type: 'PROGRESS'; payload: { processed: number; total: number; rate: number } }
  | { type: 'FOUND'; payload: MtseedResult[] }
  | { type: 'DONE' };
```

### 6.2 Worker 実装例

```typescript
// workers/mtseed-search-worker.ts
import { initWasm, MtseedSearcher, type MtseedSearchParams } from '@/lib/wasm';

self.onmessage = async (ev: MessageEvent<{ type: string; params: MtseedSearchParams }>) => {
  if (ev.data.type !== 'START') return;
  
  await initWasm();
  const searcher = new MtseedSearcher(ev.data.params);
  
  while (!searcher.is_done) {
    const batch = searcher.next_batch(100);
    
    self.postMessage({
      type: 'PROGRESS',
      payload: { processed: batch.processed, total: batch.total, rate: searcher.progress },
    });
    
    if (batch.candidates.length > 0) {
      self.postMessage({ type: 'FOUND', payload: batch.candidates });
    }
  }
  
  self.postMessage({ type: 'DONE' });
};
```

## 7. GPU 最適化

MTSeed検索は計算量が大きく、GPU並列化の効果が高い。

```rust
#[cfg(feature = "gpu")]
#[wasm_bindgen]
impl GpuContext {
    pub async fn search_mtseed(
        &self,
        params: MtseedSearchParams,
    ) -> Result<Vec<MtseedResult>, String> {
        // 計算シェーダーで並列検索
        todo!()
    }
}
```

## 8. 関連ドキュメント

- [overview.md](../overview.md) - 概要、設計原則
- [types.md](../common/types.md) - 共通型定義
- [api.md](../gpu/api.md) - GPU API
