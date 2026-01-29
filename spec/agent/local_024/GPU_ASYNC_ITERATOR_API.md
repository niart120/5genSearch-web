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

- GPU テストが全て成功していること (`cargo test --features gpu`)
- `wasm-bindgen-futures` が利用可能であること

---

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/gpu/datetime_search/searcher.rs` | 削除 | `iterator.rs` に統合 |
| `wasm-pkg/src/gpu/datetime_search/iterator.rs` | 新規 | `GpuDatetimeSearchIterator` (WASM 公開・イテレータ統合) |
| `wasm-pkg/src/gpu/datetime_search/mod.rs` | 変更 | `searcher` → `iterator` に置換 |
| `wasm-pkg/src/gpu/mod.rs` | 変更 | 公開型を `GpuDatetimeSearchIterator` に変更 |
| `wasm-pkg/src/lib.rs` | 変更 | GPU 公開 API を更新 |
| `wasm-pkg/benches/gpu_datetime_search.rs` | 変更 | 新 API に対応 |

---

## 3. 設計方針

### 3.1 アーキテクチャ

```
[React UI]
    │
    ├─ postMessage({ type: 'start', params })
    │
    ▼
[Web Worker]
    │
    ├─ for await (const batch of iterator) {
    │      postMessage({ type: 'progress', batch });
    │  }
    │
    ▼
[WASM (GpuDatetimeSearchIterator)]
    │
    ├─ next() → Promise<GpuSearchBatch | undefined>
    │   ├─ GPU ディスパッチ (SearchJobLimits.max_messages_per_dispatch)
    │   ├─ 結果読み出し
    │   └─ { progress, throughput, results }
    │
    └─ Drop trait → GPU リソース解放
```

### 3.2 バッチサイズ決定

`SearchJobLimits` (既存実装) に基づき、GPU デバイス能力に応じたバッチサイズを使用する:

```rust
// limits.rs (既存)
pub struct SearchJobLimits {
    pub workgroup_size: u32,          // 256 (Discrete/Integrated) / 128 (Mobile)
    pub max_workgroups: u32,          // 65535 (デバイス上限)
    pub max_messages_per_dispatch: u32, // workgroup_size × max_workgroups
    // ...
}
```

| GPU 種別 | `max_messages_per_dispatch` | 備考 |
|----------|------------------------------|------|
| Discrete / Integrated | 16,776,960 | 256 × 65535 |
| Mobile / Unknown | 8,388,480 | 128 × 65535 |

### 3.3 進捗・スループット計測

```rust
use serde::{Deserialize, Serialize};
use tsify::Tsify;

/// GPU 検索バッチ結果 (WASM 公開)
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi)]
pub struct GpuSearchBatch {
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

### 3.4 型定義方針

| 方針 | 詳細 |
|------|------|
| tsify + serde-wasm-bindgen | Rust 型から TypeScript 型を自動生成 |
| `JsValue` 直接使用禁止 | 戻り値・引数は tsify 対応型を使用 |
| `Result<T, String>` | エラー型は他 API との一貫性を維持 |
| `large_number_types_as_bigints` | u64 フィールドは bigint として公開 |

### 3.5 条件付きコンパイル

ネイティブベンチマーク対応のため、`#[wasm_bindgen]` は条件付きで適用する:

```rust
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct GpuDatetimeSearchIterator { ... }

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl GpuDatetimeSearchIterator {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(constructor))]
    pub async fn new(...) -> Result<Self, String> { ... }
}
```

| ターゲット | 動作 |
|-----------|------|
| `wasm32-unknown-unknown` | `#[wasm_bindgen]` 適用、JS から呼び出し可能 |
| ネイティブ (`x86_64-*` 等) | 通常の Rust 構造体、ベンチマーク実行可能 |

---

## 4. 実装仕様

### 4.1 Rust 側 API

```rust
use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::datetime_search::MtseedDatetimeSearchParams;
use crate::types::SeedOrigin;

use super::context::GpuDeviceContext;
use super::limits::SearchJobLimits;
use super::pipeline::SearchPipeline;

/// GPU 検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, large_number_types_as_bigints)]
pub struct GpuSearchBatch {
    pub results: Vec<SeedOrigin>,
    pub progress: f64,
    pub throughput: f64,
    pub processed_count: u64,
    pub total_count: u64,
}

/// GPU 起動時刻検索イテレータ
///
/// AsyncIterator パターンで GPU 検索を実行する。
/// `next()` を呼び出すたびに最適バッチサイズで GPU ディスパッチを実行し、
/// 結果・進捗・スループットを返す。
#[wasm_bindgen]
pub struct GpuDatetimeSearchIterator {
    // GPU リソース
    pipeline: SearchPipeline,
    limits: SearchJobLimits,
    
    // 進捗管理
    current_offset: u32,
    total_count: u64,
    processed_count: u64,
    
    // スループット計測
    last_processed: u64,
    last_time: f64,
}

#[wasm_bindgen]
impl GpuDatetimeSearchIterator {
    /// イテレータを作成
    ///
    /// # Errors
    ///
    /// - GPU デバイスが利用不可の場合
    /// - `target_seeds` が空の場合
    #[wasm_bindgen(constructor)]
    pub async fn new(params: MtseedDatetimeSearchParams) -> Result<GpuDatetimeSearchIterator, String> {
        if params.target_seeds.is_empty() {
            return Err("target_seeds is empty".into());
        }

        let ctx = GpuDeviceContext::new().await?;
        let limits = SearchJobLimits::from_device_limits(ctx.limits(), ctx.gpu_profile());
        let pipeline = SearchPipeline::new(&ctx, &params);
        let total_count = calculate_total_count(&params);

        let now = web_time::Instant::now();
        Ok(Self {
            pipeline,
            limits,
            current_offset: 0,
            total_count,
            processed_count: 0,
            last_processed: 0,
            last_time: now.elapsed().as_secs_f64(),
        })
    }

    /// 次のバッチを取得
    ///
    /// 検索完了時は `None` を返す。
    pub async fn next(&mut self) -> Option<GpuSearchBatch> {
        if self.is_done() {
            return None;
        }

        // 最適バッチサイズで GPU ディスパッチ
        let chunk_count = self.limits.max_messages_per_dispatch;
        let remaining = (self.total_count - self.processed_count) as u32;
        let to_process = chunk_count.min(remaining);

        if to_process == 0 {
            return None;
        }

        // GPU 実行
        let (matches, processed) = self.pipeline.dispatch(to_process, self.current_offset).await;
        
        self.processed_count += u64::from(processed);
        self.current_offset += processed;

        // スループット計算
        let now = web_time::Instant::now().elapsed().as_secs_f64();
        let elapsed = now - self.last_time;
        let processed_delta = self.processed_count - self.last_processed;
        let throughput = if elapsed > 0.001 {
            processed_delta as f64 / elapsed
        } else {
            0.0
        };
        self.last_processed = self.processed_count;
        self.last_time = now;

        // 結果変換
        let condition = self.pipeline.condition();
        let results: Vec<SeedOrigin> = matches
            .into_iter()
            .map(|m| SeedOrigin::startup(m.lcg_seed, m.datetime, condition))
            .collect();

        Some(GpuSearchBatch {
            results,
            progress: self.progress(),
            throughput,
            processed_count: self.processed_count,
            total_count: self.total_count,
        })
    }

    /// 検索が完了したか
    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.processed_count >= self.total_count
    }

    /// 進捗率 (0.0 - 1.0)
    #[wasm_bindgen(getter)]
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        if self.total_count == 0 {
            1.0
        } else {
            self.processed_count as f64 / self.total_count as f64
        }
    }
}

// Drop trait は SearchPipeline が wgpu リソースを保持しているため自動実装
```

### 4.2 TypeScript 側 API

tsify により自動生成される型定義:

```typescript
// wasm_pkg.d.ts (自動生成)
export interface GpuSearchBatch {
  results: SeedOrigin[];
  progress: number;
  throughput: number;
  processedCount: bigint;
  totalCount: bigint;
}

export class GpuDatetimeSearchIterator {
  constructor(params: MtseedDatetimeSearchParams);
  next(): Promise<GpuSearchBatch | undefined>;
  readonly is_done: boolean;
  readonly progress: number;
  free(): void;
}
```

使用例:

```typescript
import { GpuDatetimeSearchIterator, MtseedDatetimeSearchParams } from 'wasm-pkg';

async function runGpuSearch(params: MtseedDatetimeSearchParams) {
  const iterator = await new GpuDatetimeSearchIterator(params);
  
  try {
    let batch = await iterator.next();
    while (batch !== undefined) {
      // UI 更新
      console.log(`Progress: ${(batch.progress * 100).toFixed(1)}%`);
      console.log(`Throughput: ${(batch.throughput / 1e6).toFixed(2)} M/sec`);
      console.log(`Found: ${batch.results.length} results`);
      
      // キャンセル処理
      if (shouldCancel) break;
      
      batch = await iterator.next();
    }
  } finally {
    iterator.free();
  }
}
```

### 4.3 WebWorker 実装パターン

WebWorker 内で `GpuDatetimeSearchIterator` を使用する推奨パターン:

#### Worker 側 (gpu-search.worker.ts)

```typescript
import init, { GpuDatetimeSearchIterator, MtseedDatetimeSearchParams } from 'wasm-pkg';

// WASM 初期化
let wasmReady = init();

self.onmessage = async (event: MessageEvent) => {
  const { type, params } = event.data;
  
  if (type !== 'start') return;
  
  try {
    await wasmReady;
    
    const iterator = await new GpuDatetimeSearchIterator(params as MtseedDatetimeSearchParams);
    
    try {
      let batch = await iterator.next();
      while (batch !== undefined) {
        self.postMessage({ type: 'batch', batch });
        batch = await iterator.next();
      }
      
      self.postMessage({ type: 'complete' });
    } finally {
      iterator.free();
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: String(error) });
  }
};
```

#### 呼び出し側 (useGpuSearch.ts)

```typescript
import type { GpuSearchBatch, MtseedDatetimeSearchParams } from 'wasm-pkg';

interface SearchCallbacks {
  onBatch: (batch: GpuSearchBatch) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

export function createGpuSearchWorker(
  params: MtseedDatetimeSearchParams,
  callbacks: SearchCallbacks,
): () => void {
  const worker = new Worker(
    new URL('./gpu-search.worker.ts', import.meta.url),
    { type: 'module' }
  );

  worker.onmessage = (event: MessageEvent) => {
    const { type, batch, error } = event.data;

    switch (type) {
      case 'batch':
        callbacks.onBatch(batch);
        break;
      case 'complete':
        callbacks.onComplete();
        worker.terminate();
        break;
      case 'error':
        callbacks.onError(error);
        worker.terminate();
        break;
    }
  };

  worker.onerror = (event) => {
    callbacks.onError(event.message);
    worker.terminate();
  };

  // 検索開始
  worker.postMessage({ type: 'start', params });

  // キャンセル関数を返す
  // Worker.terminate() で WASM インスタンスごと破棄される
  return () => worker.terminate();
}
```

#### React コンポーネントでの使用例

```typescript
function GpuSearchButton({ params }: { params: MtseedDatetimeSearchParams }) {
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SeedOrigin[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const handleStart = () => {
    setIsRunning(true);
    setResults([]);

    cancelRef.current = createGpuSearchWorker(params, {
      onBatch: (batch) => {
        setProgress(batch.progress);
        if (batch.results.length > 0) {
          setResults((prev) => [...prev, ...batch.results]);
        }
      },
      onComplete: () => {
        setIsRunning(false);
        cancelRef.current = null;
      },
      onError: (error) => {
        console.error('GPU search error:', error);
        setIsRunning(false);
        cancelRef.current = null;
      },
    });
  };

  const handleCancel = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setIsRunning(false);
  };

  return (
    <div>
      <button onClick={isRunning ? handleCancel : handleStart}>
        {isRunning ? 'キャンセル' : '検索開始'}
      </button>
      <progress value={progress} max={1} />
      <p>結果: {results.length} 件</p>
    </div>
  );
}
```

#### 設計ポイント

1. **キャンセル**: `worker.terminate()` で WASM インスタンスごと破棄。wasm 側にキャンセル API は不要
2. **メモリ**: 結果はバッチごとにメインスレッドへ転送。Worker 内でメモリが蓄積しない
3. **エラー処理**: Worker 内例外は `postMessage` でメインスレッドへ伝播
4. **複数条件**: 条件ごとに Worker を順次起動するか、複数 Worker を並列実行
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
| `test_known_seed_found` | 既知の Seed が正しく検出されること (既存テスト移行) |

### 5.2 統合テスト (WASM)

| テスト名 | 検証内容 |
|----------|----------|
| `test_wasm_iterator_basic` | WASM 経由でイテレータが動作すること |
| `test_wasm_batch_serialization` | `GpuSearchBatch` が正しくシリアライズされること |

---

## 6. 実装チェックリスト

### 6.1 Rust 実装

- [x] `searcher.rs` 削除
- [x] `iterator.rs` 新規作成
  - [x] `GpuSearchBatch` 構造体 (tsify 対応)
  - [x] `GpuDatetimeSearchIterator` 構造体
  - [x] `new()` コンストラクタ (async)
  - [x] `next()` メソッド (async)
  - [x] `is_done` / `progress` getter
  - [x] スループット計測ロジック
- [x] `mod.rs` 更新 (`iterator` モジュール公開)
- [x] `gpu/mod.rs` 更新 (公開型変更)
- [x] `lib.rs` 更新 (GPU API 公開)

### 6.2 テスト・ベンチマーク

- [x] 既存 GPU テスト移行 (`searcher.rs` → `iterator.rs`)
- [x] ベンチマーク更新 (`gpu_datetime_search.rs`)

### 6.3 依存関係

- [x] 時刻計測: WASM では `js_sys::Date::now()`, ネイティブでは `std::time` を使用 (`web-time` は不要)

---

## 7. パフォーマンス考慮事項

### 7.1 AsyncIterator オーバーヘッド

GPU 処理が高速な場合、`next()` 呼び出しごとに発生するオーバーヘッドが懸念される:

| オーバーヘッド要因 | 影響度 | 対策 |
|-------------------|--------|------|
| Promise 生成・解決 | 低 | GPU ディスパッチ時間 (数ms〜) に比べ無視可能 |
| WASM ↔ JS 境界越え | 低 | tsify による効率的なシリアライズ |
| イベントループ yield | 中 | UI 応答性とのトレードオフ (意図的) |

### 7.2 バッチサイズと UI 更新頻度

大きなバッチサイズ (1600万件) の場合、1 バッチあたりの処理時間:

| GPU 性能 | 推定処理時間 | UI 更新頻度 |
|----------|-------------|-------------|
| High-end discrete | 10-50 ms | 20-100 Hz |
| Integrated | 100-500 ms | 2-10 Hz |
| Mobile | 500-2000 ms | 0.5-2 Hz |

UI 更新頻度が低すぎる場合は、バッチサイズを動的に調整する拡張を検討。

---

## 8. 今後の拡張 (スコープ外)

- Worker 実装
- 動的バッチサイズ調整 (目標更新頻度に基づく)
- 複数 GPU 対応
- WebGPU Timestamp Query によるより正確なスループット計測
