# GPU 検索 AsyncIterator API 仕様書

## 1. 概要

### 1.1 目的

GPU 起動時刻検索の API を AsyncIterator 形式に再設計し、UI 側で進捗率・スループットを表示可能にする。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| AsyncIterator | JavaScript の非同期イテレータ。`for await...of` で順次取得可能 |
| バッチ | GPU が一度に処理する検索単位。進捗・結果をまとめて返す |
| スループット | 単位時間あたりの処理量 (messages/sec) |
| バックプレッシャー | 消費側の処理速度に応じて生産側を制御する仕組み |

### 1.3 背景・問題

| 問題 | 現状 | 影響 |
|------|------|------|
| バッチサイズ制御 | 呼び出し側が `next_batch(chunk_count)` で指定 | GPU 最適サイズと乖離する可能性 |
| 進捗通知 | バッチ結果に含まれるが、取得タイミングは呼び出し側依存 | UI 更新頻度が不安定 |
| キャンセル | 明示的な中断機構なし | リソースリークの可能性 |
| API 設計 | Pull 型だが呼び出し側の負担が大きい | Worker 実装が複雑化 |

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| UI 応答性 | バッチごとに yield でイベントループに戻り、UI フリーズを防止 |
| 進捗表示 | 各バッチで進捗率・スループットを取得可能 |
| キャンセル | `break` で自然に中断、リソースを適切に解放 |
| 実装簡素化 | `for await...of` で完結、コールバック地獄を回避 |

### 1.5 着手条件

- `GpuMtseedDatetimeSearcher` (現行 API) が正常動作していること
- GPU テストが全て成功していること
- `wasm-bindgen-futures` が利用可能であること

---

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/gpu/datetime_search/searcher.rs` | 変更 | `next_batch_optimal()` 追加、バッチサイズ自動調整 |
| `wasm-pkg/src/gpu/datetime_search/iterator.rs` | 新規 | `GpuSearchIterator` (WASM 公開用ラッパー) |
| `wasm-pkg/src/gpu/datetime_search/mod.rs` | 変更 | `iterator` モジュール追加 |
| `wasm-pkg/src/lib.rs` | 変更 | `GpuSearchIterator` を WASM API として公開 |
| `src/workers/gpu-search-worker.ts` | 新規 | AsyncIterator を使用した Worker 実装 |

---

## 3. 設計方針

### 3.1 アーキテクチャ

```
[React UI]
    │
    ├─ postMessage({ type: 'start', params })
    │
    ▼
[Web Worker (gpu-search-worker.ts)]
    │
    ├─ for await (const batch of searchIterator) {
    │      postMessage({ type: 'progress', batch });
    │  }
    │
    ▼
[WASM (GpuSearchIterator)]
    │
    ├─ next() → Promise<SearchBatch | null>
    │   ├─ GPU ディスパッチ (最適バッチサイズ)
    │   ├─ 結果読み出し
    │   └─ { progress, throughput, results }
    │
    └─ drop() → リソース解放
```

### 3.2 バッチサイズ自動調整

GPU の処理能力に基づき、WASM 側でバッチサイズを自動決定する:

| GPU 種別 | 推奨バッチサイズ | 根拠 |
|----------|------------------|------|
| Integrated | 10,000 ~ 50,000 | メモリ帯域制限 |
| Discrete | 100,000 ~ 500,000 | 高並列処理能力 |
| Unknown | 50,000 | 安全なデフォルト |

### 3.3 進捗・スループット計測

```rust
pub struct SearchBatch {
    /// 検索結果
    pub results: Vec<SeedOrigin>,
    /// 進捗率 (0.0 - 1.0)
    pub progress: f64,
    /// スループット (messages/sec)
    pub throughput: f64,
    /// 処理済み数
    pub processed_count: u64,
    /// 総処理数
    pub total_count: u64,
}
```

---

## 4. 実装仕様

### 4.1 Rust 側 API

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::future_to_promise;

/// GPU 検索イテレータ (WASM 公開)
#[wasm_bindgen]
pub struct GpuSearchIterator {
    searcher: GpuMtseedDatetimeSearcher,
    start_time: f64,
    last_processed: u64,
    last_time: f64,
}

#[wasm_bindgen]
impl GpuSearchIterator {
    /// イテレータを作成
    #[wasm_bindgen(constructor)]
    pub async fn new(params: JsValue) -> Result<GpuSearchIterator, JsError> {
        let params: MtseedDatetimeSearchParams = 
            serde_wasm_bindgen::from_value(params)?;
        
        let ctx = GpuDeviceContext::new().await
            .map_err(|e| JsError::new(&e))?;
        
        let searcher = GpuMtseedDatetimeSearcher::new(&ctx, &params)
            .map_err(|e| JsError::new(&e))?;
        
        let now = js_sys::Date::now();
        Ok(Self {
            searcher,
            start_time: now,
            last_processed: 0,
            last_time: now,
        })
    }

    /// 次のバッチを取得
    /// 
    /// 終了時は `null` を返す
    pub async fn next(&mut self) -> JsValue {
        if self.searcher.is_done() {
            return JsValue::NULL;
        }

        // GPU 最適バッチサイズで実行
        let batch = self.searcher.next_batch_optimal().await;
        
        // スループット計算
        let now = js_sys::Date::now();
        let elapsed = (now - self.last_time) / 1000.0;
        let processed_delta = batch.processed_count - self.last_processed;
        let throughput = if elapsed > 0.0 {
            processed_delta as f64 / elapsed
        } else {
            0.0
        };
        
        self.last_processed = batch.processed_count;
        self.last_time = now;

        // SearchBatch を JsValue に変換
        serde_wasm_bindgen::to_value(&SearchBatchJs {
            results: batch.results,
            progress: batch.processed_count as f64 / batch.total_count as f64,
            throughput,
            processed_count: batch.processed_count,
            total_count: batch.total_count,
        }).unwrap_or(JsValue::NULL)
    }

    /// 検索が完了したか
    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.searcher.is_done()
    }

    /// 進捗率を取得
    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64 {
        self.searcher.progress()
    }
}
```

### 4.2 TypeScript 側 API

```typescript
// types.ts
export interface SearchBatch {
  results: SeedOrigin[];
  progress: number;
  throughput: number;
  processedCount: bigint;
  totalCount: bigint;
}

// gpu-search.ts
import { GpuSearchIterator } from 'wasm-pkg';

export async function* createGpuSearchIterator(
  params: SearchParams
): AsyncGenerator<SearchBatch, void, undefined> {
  const iterator = await new GpuSearchIterator(params);
  
  try {
    while (!iterator.is_done) {
      const batch = await iterator.next();
      if (batch === null) break;
      yield batch as SearchBatch;
    }
  } finally {
    // WASM 側のリソース解放 (Drop trait)
    iterator.free();
  }
}

// 使用例
async function runSearch(params: SearchParams) {
  for await (const batch of createGpuSearchIterator(params)) {
    // UI 更新
    setProgress(batch.progress);
    setThroughput(batch.throughput);
    addResults(batch.results);
    
    // キャンセル処理
    if (shouldCancel) break;
  }
}
```

### 4.3 Worker 実装

```typescript
// gpu-search-worker.ts
import { createGpuSearchIterator } from './gpu-search';

self.onmessage = async (event) => {
  const { type, params } = event.data;
  
  if (type === 'start') {
    try {
      for await (const batch of createGpuSearchIterator(params)) {
        self.postMessage({ type: 'batch', batch });
        
        // キャンセルチェック (別メッセージで受信)
        if (shouldCancel) break;
      }
      self.postMessage({ type: 'complete' });
    } catch (error) {
      self.postMessage({ type: 'error', error: String(error) });
    }
  }
};
```

---

## 5. テスト方針

### 5.1 ユニットテスト (Rust)

| テスト名 | 検証内容 |
|----------|----------|
| `test_iterator_returns_batches` | イテレータが複数バッチを返すこと |
| `test_iterator_terminates` | 検索完了後に `None` を返すこと |
| `test_progress_monotonic` | 進捗率が単調増加すること |
| `test_throughput_positive` | スループットが正の値であること |

### 5.2 統合テスト (WASM + TypeScript)

| テスト名 | 検証内容 |
|----------|----------|
| `test_async_iterator_basic` | `for await...of` で結果を取得できること |
| `test_cancel_mid_search` | `break` で中断してもリソースリークしないこと |
| `test_progress_updates` | 各バッチで進捗率が更新されること |

---

## 6. 実装チェックリスト

### 6.1 Rust 実装

- [ ] `GpuMtseedDatetimeSearcher::next_batch_optimal()` 追加
- [ ] `GpuSearchIterator` 構造体作成
- [ ] `#[wasm_bindgen]` アトリビュート付与
- [ ] `SearchBatchJs` シリアライズ対応
- [ ] スループット計測ロジック実装

### 6.2 TypeScript 実装

- [ ] `createGpuSearchIterator` ジェネレータ関数
- [ ] `SearchBatch` 型定義
- [ ] Worker 実装 (`gpu-search-worker.ts`)
- [ ] キャンセル機構実装

### 6.3 テスト

- [ ] Rust ユニットテスト
- [ ] WASM 統合テスト
- [ ] Worker E2E テスト

### 6.4 ドキュメント

- [ ] API ドキュメント (TypeDoc)
- [ ] 使用例追加
