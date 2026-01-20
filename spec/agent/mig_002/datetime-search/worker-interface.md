# Worker - WASM インタフェース設計: 起動時刻検索

起動時刻検索における Worker ↔ WASM 間のインタフェース設計。CPU/GPU 両経路を考慮。

## 1. 概要

### 1.1 レイヤー構成

```
┌─────────────────────────────────────────────────────────────────────────┐
│ UI (Main Thread)                                                        │
│  - 検索パラメータ入力                                                    │
│  - 進捗表示・結果表示                                                    │
│  - Worker 生成・管理                                                     │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ postMessage (WorkerRequest/Response)
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ Worker Layer                                                            │
│  - WASM 初期化・保持                                                     │
│  - セグメント割り当て受信                                                │
│  - 進捗通知・結果送信                                                    │
│  - 停止/一時停止制御                                                     │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ WASM API 呼び出し
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ WASM Layer                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐                   │
│  │ CPU 経路             │    │ GPU 経路             │                   │
│  │ - SIMD SHA-1         │    │ - wgpu + WGSL        │                   │
│  │ - イテレータ API      │    │ - バッチ API         │                   │
│  └──────────────────────┘    └──────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 設計原則

1. **経路透過性**: CPU/GPU で共通のインタフェースを提供
2. **責務分離**: 分割戦略は Main Thread、計算は WASM
3. **進捗追跡可能性**: Worker 単位で進捗を報告
4. **キャンセル応答性**: セグメント境界で停止検査

## 2. 分割戦略

### 2.1 探索空間の構造

起動時刻検索の探索空間は以下の直積:

```
探索空間 = 時刻範囲 × Timer0範囲 × VCount範囲 × KeyCode集合
```

| 次元 | 典型サイズ | 備考 |
|------|-----------|------|
| 時刻範囲 | 86,400 × 365 = 31,536,000 秒/年 | 時刻フィルタで削減可能 |
| Timer0 | 2-16 値 | ROM/リージョン依存 |
| VCount | 1-2 値 | ROM/リージョン依存 |
| KeyCode | 1-256 値 | ユーザー指定マスクから列挙 |

### 2.2 セグメント定義

**セグメント**: Timer0, VCount, KeyCode を固定した探索単位。

```typescript
type SearchSegment = {
  readonly timer0: number;
  readonly vcount: number;
  readonly keyCode: number;
};
```

**セグメント列挙**: Main Thread 側で全セグメントを事前列挙。

```typescript
function enumerateSegments(
  timer0Range: { min: number; max: number },
  vcountRange: { min: number; max: number },
  keyCodes: readonly number[],
): readonly SearchSegment[] {
  const segments: SearchSegment[] = [];
  for (let timer0 = timer0Range.min; timer0 <= timer0Range.max; timer0++) {
    for (let vcount = vcountRange.min; vcount <= vcountRange.max; vcount++) {
      for (const keyCode of keyCodes) {
        segments.push({ timer0, vcount, keyCode });
      }
    }
  }
  return segments;
}
```

### 2.3 チャンク定義

**チャンク**: 時刻範囲の分割単位。並列 Worker に割り当てる。

```typescript
type TimeChunk = {
  readonly chunkIndex: number;
  readonly startSecondsSince2000: number;
  readonly rangeSeconds: number;
};
```

**チャンク分割**: 総時刻範囲を Worker 数で均等分割。

```typescript
function divideTimeRange(
  totalStartSeconds: number,
  totalRangeSeconds: number,
  workerCount: number,
): readonly TimeChunk[] {
  const chunkSize = Math.ceil(totalRangeSeconds / workerCount);
  const chunks: TimeChunk[] = [];
  
  for (let i = 0; i < workerCount; i++) {
    const start = totalStartSeconds + i * chunkSize;
    const remaining = totalRangeSeconds - i * chunkSize;
    const size = Math.min(chunkSize, remaining);
    if (size > 0) {
      chunks.push({
        chunkIndex: i,
        startSecondsSince2000: start,
        rangeSeconds: size,
      });
    }
  }
  return chunks;
}
```

### 2.4 CPU/GPU での分割戦略の違い

| 観点 | CPU 経路 | GPU 経路 |
|------|---------|---------|
| 並列単位 | Worker (チャンク単位) | GPU スレッド (時刻単位) |
| セグメントループ | Worker 内で逐次処理 | ディスパッチ毎に1セグメント |
| 時刻ループ | WASM 内イテレータ | GPU カーネル内並列 |
| 進捗粒度 | バッチ (数百〜数千秒) | ディスパッチ (数万〜数十万秒) |

**CPU 経路の処理フロー**:
```
Worker が担当チャンク受信
  → 全セグメントをループ
    → 各セグメントで MtseedDatetimeSearcher 生成
      → next_batch() で時刻をイテレート
```

**GPU 経路の処理フロー**:
```
Worker が担当セグメント受信
  → GpuContext.search_segment() 呼び出し
    → GPU カーネルが時刻範囲を並列処理
      → 結果バッファ読み出し
```

## 3. Worker → WASM インタフェース

### 3.1 共通型

```rust
/// 検索ジョブ (1 Worker が処理する単位)
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SearchJob {
    /// ジョブID (進捗追跡用)
    pub job_id: u32,
    /// DS設定
    pub ds: DsConfig,
    /// 1日内の時刻範囲
    pub time_range: TimeRangeParams,
    /// 担当する時刻チャンク
    pub time_chunk: TimeChunk,
    /// 処理するセグメント一覧
    pub segments: Vec<SearchSegment>,
}

/// 時刻チャンク
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TimeChunk {
    pub chunk_index: u32,
    pub start_seconds_since_2000: u64,
    pub range_seconds: u32,
}

/// 検索セグメント
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct SearchSegment {
    pub timer0: u16,
    pub vcount: u8,
    pub key_code: u32,
}
```

### 3.2 CPU 経路 API

```rust
/// CPU版起動時刻検索イテレータ
#[wasm_bindgen]
pub struct DatetimeSearcherCpu {
    job: SearchJob,
    target_seeds: BTreeSet<u32>,
    current_segment_index: usize,
    current_enumerator: Option<HashValuesEnumerator>,
    processed_seconds: u64,
    total_seconds: u64,
}

#[wasm_bindgen]
impl DatetimeSearcherCpu {
    /// 検索器を生成
    #[wasm_bindgen(constructor)]
    pub fn new(job: SearchJob, target_seeds: Vec<u32>) -> Result<DatetimeSearcherCpu, String>;
    
    /// 完了判定
    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool;
    
    /// 進捗 (0.0 - 1.0)
    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64;
    
    /// 処理済み秒数
    #[wasm_bindgen(getter)]
    pub fn processed_seconds(&self) -> u64;
    
    /// 総秒数
    #[wasm_bindgen(getter)]
    pub fn total_seconds(&self) -> u64;
    
    /// 次のバッチを処理
    /// chunk_seconds: 1回の呼び出しで処理する秒数上限
    /// 戻り値: 見つかった結果のバッチ
    pub fn next_batch(&mut self, chunk_seconds: u32) -> MtseedDatetimeSearchBatch;
}
```

**Worker 側呼び出しパターン (CPU)**:

```typescript
// worker-cpu.ts
import { DatetimeSearcherCpu, type SearchJob } from '@wasm/wasm_pkg';

let searcher: DatetimeSearcherCpu | null = null;
let stopRequested = false;

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'START': {
      const { job, targetSeeds } = payload as StartPayload;
      searcher = new DatetimeSearcherCpu(job, targetSeeds);
      stopRequested = false;
      
      while (!searcher.is_done && !stopRequested) {
        const batch = searcher.next_batch(1000); // 1000秒分処理
        
        if (batch.results.length > 0) {
          self.postMessage({ type: 'RESULTS', payload: { results: batch.results } });
        }
        
        self.postMessage({
          type: 'PROGRESS',
          payload: {
            processed: searcher.processed_seconds,
            total: searcher.total_seconds,
          },
        });
        
        // イベントループに制御を返す (停止要求検査)
        await yieldToEventLoop();
      }
      
      self.postMessage({
        type: 'COMPLETE',
        payload: { reason: stopRequested ? 'stopped' : 'completed' },
      });
      break;
    }
    
    case 'STOP':
      stopRequested = true;
      break;
  }
};

function yieldToEventLoop(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
```

### 3.3 GPU 経路 API

```rust
/// GPU版起動時刻検索エンジン
#[cfg(feature = "gpu")]
#[wasm_bindgen]
pub struct DatetimeSearcherGpu {
    context: GpuContext,
    job: SearchJob,
    target_seeds: Vec<u32>,
    current_segment_index: usize,
    processed_seconds: u64,
    total_seconds: u64,
}

#[cfg(feature = "gpu")]
#[wasm_bindgen]
impl DatetimeSearcherGpu {
    /// GPU検索器を生成 (非同期)
    pub async fn new(job: SearchJob, target_seeds: Vec<u32>) -> Result<DatetimeSearcherGpu, String>;
    
    /// 完了判定
    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool;
    
    /// 進捗 (0.0 - 1.0)
    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64;
    
    /// 次のセグメントを GPU で処理 (非同期)
    /// 戻り値: 見つかった結果のバッチ
    pub async fn process_next_segment(&mut self) -> Result<MtseedDatetimeSearchBatch, String>;
}
```

**Worker 側呼び出しパターン (GPU)**:

```typescript
// worker-gpu.ts
import { DatetimeSearcherGpu, is_webgpu_available, type SearchJob } from '@wasm/wasm_pkg';

let searcher: DatetimeSearcherGpu | null = null;
let stopRequested = false;

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'START': {
      if (!is_webgpu_available()) {
        self.postMessage({ type: 'ERROR', message: 'WebGPU not available', fatal: true });
        return;
      }
      
      const { job, targetSeeds } = payload as StartPayload;
      searcher = await DatetimeSearcherGpu.new(job, targetSeeds);
      stopRequested = false;
      
      while (!searcher.is_done && !stopRequested) {
        const batch = await searcher.process_next_segment();
        
        if (batch.results.length > 0) {
          self.postMessage({ type: 'RESULTS', payload: { results: batch.results } });
        }
        
        self.postMessage({
          type: 'PROGRESS',
          payload: {
            processed: searcher.processed_seconds,
            total: searcher.total_seconds,
          },
        });
      }
      
      self.postMessage({
        type: 'COMPLETE',
        payload: { reason: stopRequested ? 'stopped' : 'completed' },
      });
      break;
    }
    
    case 'STOP':
      stopRequested = true;
      break;
  }
};
```

## 4. Main Thread → Worker インタフェース

### 4.1 ジョブ割り当て戦略

**CPU 経路 (複数 Worker)**:
- 時刻範囲をチャンク分割し、各 Worker に割り当て
- 各 Worker は全セグメントを処理

```
Main Thread:
  chunks = divideTimeRange(totalRange, workerCount)
  segments = enumerateSegments(timer0Range, vcountRange, keyCodes)
  
  for each worker[i]:
    job = { timeChunk: chunks[i], segments: segments }
    worker[i].postMessage({ type: 'START', payload: { job, targetSeeds } })
```

**GPU 経路 (単一 Worker)**:
- 全時刻範囲を単一ジョブとして渡す
- GPU Worker 内でセグメント単位にディスパッチ

```
Main Thread:
  job = { timeChunk: fullRange, segments: segments }
  gpuWorker.postMessage({ type: 'START', payload: { job, targetSeeds } })
```

### 4.2 ジョブ割り当てメッセージ

```typescript
type StartPayload = {
  job: SearchJob;
  targetSeeds: readonly number[];
};

type WorkerRequest =
  | { type: 'START'; payload: StartPayload }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' };
```

### 4.3 進捗集約

Main Thread 側で複数 Worker の進捗を集約:

```typescript
type WorkerProgress = {
  workerId: number;
  processed: number;
  total: number;
};

function aggregateProgress(workerProgresses: readonly WorkerProgress[]): AggregatedProgress {
  const totalProcessed = workerProgresses.reduce((sum, w) => sum + w.processed, 0);
  const totalTotal = workerProgresses.reduce((sum, w) => sum + w.total, 0);
  const activeWorkers = workerProgresses.filter(w => w.processed < w.total).length;
  
  return {
    processed: totalProcessed,
    total: totalTotal,
    percentage: totalTotal > 0 ? totalProcessed / totalTotal : 0,
    activeWorkers,
    completedWorkers: workerProgresses.length - activeWorkers,
  };
}
```

## 5. GPU 経路詳細設計

### 5.1 シェーダー設計方針

現行実装 ([seed-search.wgsl](https://github.com/niart120/pokemon-gen5-initseed/blob/main/src/lib/webgpu/kernel/seed-search.wgsl)) を参考に、以下の構成を採用:

```wgsl
// datetime-search.wgsl

// === バインディング ===
@group(0) @binding(0) var<storage, read> state: DispatchState;
@group(0) @binding(1) var<uniform> constants: SearchConstants;
@group(0) @binding(2) var<storage, read> target_seeds: TargetSeedBuffer;
@group(0) @binding(3) var<storage, read_write> output: MatchOutputBuffer;

struct DispatchState {
  message_count: u32,        // 処理するメッセージ数
  base_second_offset: u32,   // 開始秒オフセット
}

struct SearchConstants {
  // Nazo 値 (ROM依存)
  nazo0: u32,
  nazo1: u32,
  nazo2: u32,
  nazo3: u32,
  nazo4: u32,
  // MAC アドレス由来値
  mac_high: u32,
  mac_low: u32,
  // セグメント固定値
  vcount_timer0: u32,  // (vcount << 16) | timer0
  key_input: u32,
  frame: u32,
  // 日付基準値
  base_date_code: u32,
}

struct TargetSeedBuffer {
  count: u32,
  seeds: array<u32, 256>,  // 最大256個の目標Seed
}

struct MatchOutputBuffer {
  match_count: atomic<u32>,
  records: array<MatchRecord, MAX_MATCHES>,
}

struct MatchRecord {
  second_offset: u32,
  seed: u32,
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let thread_index = global_id.x;
  if (thread_index >= state.message_count) { return; }
  
  let second_offset = state.base_second_offset + thread_index;
  
  // 1. 日時コード計算
  let datetime = compute_datetime_codes(second_offset, constants.base_date_code);
  
  // 2. SHA-1 メッセージ構築
  let message = build_sha1_message(constants, datetime);
  
  // 3. SHA-1 計算
  let hash = compute_sha1(message);
  
  // 4. LCG Seed → MT Seed 変換
  let seed = compute_mt_seed(hash.h0, hash.h1);
  
  // 5. 目標Seedとの照合
  if (match_target_seed(seed, target_seeds)) {
    let idx = atomicAdd(&output.match_count, 1u);
    if (idx < MAX_MATCHES) {
      output.records[idx] = MatchRecord(second_offset, seed);
    }
  }
}
```

### 5.2 ディスパッチ戦略

```rust
impl DatetimeSearcherGpu {
    async fn process_next_segment(&mut self) -> Result<MtseedDatetimeSearchBatch, String> {
        let segment = &self.job.segments[self.current_segment_index];
        
        // 定数バッファ更新
        self.update_constants_buffer(segment)?;
        
        // 時刻範囲を複数ディスパッチに分割
        let chunk = &self.job.time_chunk;
        let mut all_results = Vec::new();
        let mut offset = 0u32;
        
        while offset < chunk.range_seconds {
            let dispatch_size = min(self.max_dispatch_size, chunk.range_seconds - offset);
            
            // ディスパッチ状態更新
            self.update_dispatch_state(offset, dispatch_size)?;
            
            // GPU 実行
            self.context.queue.submit(Some(self.command_encoder.finish()));
            
            // 結果読み出し
            let matches = self.read_results().await?;
            all_results.extend(matches);
            
            offset += dispatch_size;
        }
        
        self.current_segment_index += 1;
        self.processed_seconds += chunk.range_seconds as u64;
        
        Ok(MtseedDatetimeSearchBatch {
            results: all_results,
            processed_seconds: self.processed_seconds,
            total_seconds: self.total_seconds,
        })
    }
}
```

### 5.3 デバイス制約への対応

```rust
/// GPU デバイス制約から最適なディスパッチパラメータを決定
pub fn derive_dispatch_params(limits: &wgpu::Limits) -> DispatchParams {
    // ワークグループサイズ: デバイス上限と最適値のバランス
    let workgroup_size = min(256, limits.max_compute_workgroup_size_x);
    
    // 最大ディスパッチ数: ストレージバッファサイズから逆算
    let max_output_records = 4096;
    let output_buffer_size = 4 + max_output_records * 8; // header + records
    
    // 1ディスパッチあたりの最大メッセージ数
    let max_messages_per_dispatch = limits.max_compute_workgroups_per_dimension * workgroup_size;
    
    DispatchParams {
        workgroup_size,
        max_messages_per_dispatch,
        max_output_records,
    }
}
```

## 6. エラーハンドリング

### 6.1 WASM 側エラー

```rust
#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi)]
pub enum SearchError {
    InvalidParams { message: String },
    GpuInitFailed { message: String },
    GpuDispatchFailed { message: String },
    Aborted,
}
```

### 6.2 Worker 側エラー伝播

```typescript
type ErrorResponse = {
  type: 'ERROR';
  message: string;
  category: 'VALIDATION' | 'WASM_INIT' | 'GPU_INIT' | 'RUNTIME' | 'ABORTED';
  fatal: boolean;
};
```

## 7. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [base.md](./base.md) | 共通基盤 (HashValuesEnumerator 等) |
| [mtseed.md](./mtseed.md) | MT Seed 照合検索 |
| [egg.md](./egg.md) | 孵化起動時刻検索 |
| [gpu-kernel.md](./gpu-kernel.md) | GPU カーネル（シェーダー・分割戦略） |
| [../gpu/api.md](../gpu/api.md) | GPU API 概要 |
| [../gpu/device-context.md](../gpu/device-context.md) | GPU 汎用基盤（デバイスコンテキスト・制限値） |
| [../../mig_001/worker-architecture.md](../../mig_001/worker-architecture.md) | Worker アーキテクチャ全体設計 |
