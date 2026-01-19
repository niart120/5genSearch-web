# WASM API 仕様書: 個体生成

初期seedからポケモン個体列を生成する機能。

## 1. 概要

### 1.1 機能定義

| 項目 | 内容 |
|-----|------|
| 入力 | 初期seed、消費数範囲、生成設定 |
| 出力 | Pokemon個体列 |
| 計算特性 | 決定論的、逐次生成 |

### 1.2 計算フロー

```
初期seed → PRNG初期化 → 消費 → 個体値/性格/特性決定 → Pokemon
```

PRNG (擬似乱数生成器) の状態遷移は決定論的であり、同一の入力に対して常に同一の出力を返す。

## 2. 入力型

### 2.1 GenerationParams

生成リクエストの全パラメータ。

```rust
use serde::{Deserialize, Serialize};
use tsify_next::Tsify;

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GenerationParams {
    /// 初期seed
    pub initial_seed: u64,
    /// 開始消費数
    pub min_advances: u32,
    /// 終了消費数
    pub max_advances: u32,
    /// 生成設定
    pub profile: Pokemon生成Profile,
    /// ゲームコンテキスト
    pub context: GameContext,
}
```

### 2.2 Pokemon生成Profile

個体生成に影響するプロファイル。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct Pokemon生成Profile {
    /// トレーナーID
    pub tid: u16,
    /// 裏ID
    pub sid: u16,
    /// エンカウント種別
    pub encounter: EncounterType,
    /// シンクロ設定
    pub synchronize: Option<u8>,
    /// 色違いロック
    pub shiny_locked: bool,
    /// ひかるおまもり所持
    pub shiny_charm: bool,
}
```

### 2.3 GameContext

ゲームコンテキスト（generation-api.md から継承）。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GameContext {
    pub version: GameVersion,
    pub start_mode: StartMode,
    pub save_state: SaveState,
    pub memory_link: MemoryLinkState,
}
```

## 3. 出力型

### 3.1 Pokemon

生成された個体データ。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct Pokemon {
    /// 消費数
    pub advances: u32,
    /// 性格値
    pub pid: u32,
    /// 性格ID (0-24)
    pub nature: u8,
    /// 個体値 [H, A, B, C, D, S]
    pub ivs: [u8; 6],
    /// 特性スロット (0, 1, 2=夢特性)
    pub ability: u8,
    /// 性別値 (0-255)
    pub gender: u8,
    /// 色違い種別 (0=通常, 1=☆, 2=◇)
    pub shiny: u8,
    /// シンクロ適用
    pub synced: bool,
    /// エンカウントスロット
    pub slot: u8,
}
```

### 3.2 GenerationBatch

バッチ生成結果。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GenerationBatch {
    /// 生成された個体列
    pub pokemon: Vec<Pokemon>,
    /// 処理済み消費数
    pub current_advances: u32,
    /// 終了消費数
    pub max_advances: u32,
}
```

## 4. WASM API

### 4.1 PokemonGenerator

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct PokemonGenerator {
    params: GenerationParams,
    current: u32,
    // PRNG state
}

#[wasm_bindgen]
impl PokemonGenerator {
    #[wasm_bindgen(constructor)]
    pub fn new(params: GenerationParams) -> Result<PokemonGenerator, String> {
        params.context.validate()?;
        Ok(PokemonGenerator {
            current: params.min_advances,
            params,
        })
    }

    /// 完了判定
    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.current >= self.params.max_advances
    }

    /// 進捗率 (0.0 - 1.0)
    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64 {
        let range = self.params.max_advances - self.params.min_advances;
        if range == 0 { return 1.0; }
        let done = self.current - self.params.min_advances;
        done as f64 / range as f64
    }

    /// 次のバッチを生成
    pub fn next_batch(&mut self, batch_size: u32) -> GenerationBatch {
        let mut pokemon = Vec::with_capacity(batch_size as usize);
        
        for _ in 0..batch_size {
            if self.is_done() { break; }
            // 個体生成ロジック
            // pokemon.push(...);
            self.current += 1;
        }
        
        GenerationBatch {
            pokemon,
            current_advances: self.current,
            max_advances: self.params.max_advances,
        }
    }
}
```

### 4.2 単発生成関数

特定消費数の個体のみ必要な場合。

```rust
/// 指定消費数の個体を生成
#[wasm_bindgen]
pub fn generate_at(
    initial_seed: u64,
    advances: u32,
    profile: Pokemon生成Profile,
    context: GameContext,
) -> Result<Pokemon, String> {
    context.validate()?;
    // 生成ロジック
    todo!()
}
```

## 5. Worker 統合

### 5.1 メッセージ型

```typescript
// types/worker.ts
export type GenerationRequest = {
  type: 'generation';
  params: GenerationParams;
};

export type GenerationResponse = 
  | { type: 'PROGRESS'; payload: { current: number; max: number; rate: number } }
  | { type: 'BATCH'; payload: Pokemon[] }
  | { type: 'DONE' };
```

### 5.2 Worker 実装例

```typescript
// workers/generation-worker.ts
import { initWasm, PokemonGenerator, type GenerationParams } from '@/lib/wasm';

self.onmessage = async (ev: MessageEvent<{ type: string; params: GenerationParams }>) => {
  if (ev.data.type !== 'START') return;
  
  await initWasm();
  const gen = new PokemonGenerator(ev.data.params);
  
  while (!gen.is_done) {
    const batch = gen.next_batch(100);
    
    self.postMessage({
      type: 'PROGRESS',
      payload: { current: batch.current_advances, max: batch.max_advances, rate: gen.progress },
    });
    
    if (batch.pokemon.length > 0) {
      self.postMessage({ type: 'BATCH', payload: batch.pokemon });
    }
  }
  
  self.postMessage({ type: 'DONE' });
};
```

## 6. 今後の検討事項

- 個体フィルタリング機能の追加（WASM側 vs TypeScript側）
- 特定条件での早期終了（色違い発見時等）

## 7. 関連ドキュメント

- [overview.md](../overview.md) - 概要、設計原則
- [types.md](../common/types.md) - 共通型定義
