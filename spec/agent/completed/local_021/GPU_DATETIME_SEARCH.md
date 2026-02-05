# GPU 起動時刻検索 (MT Seed) 仕様書

## 1. 概要

### 1.1 目的

WebGPU による GPU 並列計算で MT Seed 起動時刻検索を高速化する。現行の `MtseedDatetimeSearcher` (CPU 版) と同等の機能を Rust/WASM (wgpu) で GPU 実装し、検索速度を大幅に向上させる。

### 1.2 設計方針

| 項目 | 方針 |
|------|------|
| 実装言語 | Rust (wgpu + wasm-bindgen) |
| シェーダー | WGSL (Rust 側で管理) |
| 型定義 | 既存の `SeedOrigin`, `MtseedDatetimeSearchBatch` を再利用 |
| Worker 連携 | TypeScript Worker から WASM API を呼び出し |
| 出力形式 | CPU 版と同一 (`Vec<SeedOrigin>`) |

### 1.3 用語定義

| 用語 | 定義 |
|------|------|
| MT Seed | MT19937 の初期化に使用される 32bit Seed。LCG Seed の上位 32bit から導出 |
| LCG Seed | 64bit 線形合同法の Seed。起動時刻パラメータから SHA-1 ハッシュで生成 |
| SHA-1 メッセージ | DS パラメータ・起動時刻を BCD 形式で構築した 13 ワード (52 bytes) のデータ |
| wgpu | Rust の WebGPU 抽象化ライブラリ。WASM ターゲットで WebGPU を利用可能 |
| ワークグループ | GPU 計算シェーダーの実行単位。複数スレッドで構成 |
| ディスパッチ | GPU カーネルの実行命令。ワークグループ数を指定 |
| セグメント | Timer0 × VCount × KeyCode の組み合わせ単位 |

### 1.4 背景・問題

| 項目 | CPU 版の特性 | GPU 版の解決策 |
|------|-------------|---------------|
| 処理速度 | 複数 Worker 並列でも CPU コア数に依存 | 数千スレッドの並列 SHA-1 計算 |
| 検索範囲 | 1 日分で数秒 (Worker 数依存) | 1 日分を 1 秒未満で処理可能 |
| スケーラビリティ | Worker 追加で線形向上 (CPU コア上限) | GPU 性能に応じた自動最適化 |

> **Note:** CPU 版も複数 Web Worker による並列化を前提とした設計になっている。各 Worker が独立した `MtseedDatetimeSearcher` インスタンスを持ち、検索範囲を分割して並列処理する。

### 1.5 期待効果

| 項目 | 効果 |
|------|------|
| 検索速度 | CPU 比 10〜100 倍 (GPU 性能依存) |
| 応答性 | バックグラウンド実行でメインスレッド非ブロック |
| 型統一 | CPU 版と同一の出力型 (`SeedOrigin`) |

### 1.6 着手条件

- `datetime_search/mtseed.rs` (CPU 版) が完成していること
- `gpu` feature flag で有効化
- WebGPU 対応ブラウザでの動作を前提
- GPU 非対応環境では CPU 版にフォールバック

---

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/Cargo.toml` | 変更 | `gpu` feature + wgpu 依存追加 |
| `wasm-pkg/src/lib.rs` | 変更 | `gpu` モジュール re-export |
| `wasm-pkg/src/gpu/mod.rs` | 新規 | GPU モジュール宣言 |
| `wasm-pkg/src/gpu/context.rs` | 新規 | `GpuDeviceContext` (デバイス管理) |
| `wasm-pkg/src/gpu/profile.rs` | 新規 | `GpuProfile`, `GpuKind` (プロファイル検出) |
| `wasm-pkg/src/gpu/limits.rs` | 新規 | `SearchJobLimits` (制限値導出) |
| `wasm-pkg/src/gpu/datetime_search/mod.rs` | 新規 | GPU 起動時刻検索モジュール |
| `wasm-pkg/src/gpu/datetime_search/searcher.rs` | 新規 | `GpuMtseedDatetimeSearcher` |
| `wasm-pkg/src/gpu/datetime_search/shader.wgsl` | 新規 | WGSL シェーダー本体 |
| `wasm-pkg/src/gpu/datetime_search/pipeline.rs` | 新規 | パイプライン・バッファ管理 |
| `src/workers/mtseed-datetime-search-worker-gpu.ts` | 新規 | GPU Worker (WASM 呼び出し) |
| `.github/workflows/ci.yml` | 変更 | GPU feature 対応 (lint/test 分離) |

---

## 3. 設計方針

### 3.1 アーキテクチャ概要

```
[TypeScript Worker]
    │
    ├─ import { GpuMtseedDatetimeSearcher } from 'wasm-pkg'
    │
    └─ searcher.next_batch(chunk_count)
           │
           ▼
[Rust/WASM (wgpu)]
    │
    ├─ GpuDeviceContext (デバイス・キュー管理)
    │
    ├─ GpuMtseedDatetimeSearcher
    │   ├─ パイプライン初期化
    │   ├─ バッファ作成・書き込み
    │   ├─ ディスパッチ実行
    │   └─ 結果読み出し → Vec<SeedOrigin>
    │
    └─ MtseedDatetimeSearchBatch (既存型)
           │
           ▼
[TypeScript Worker]
    │
    └─ postMessage({ type: 'RESULT', batch })
```

### 3.2 CPU 版との API 互換性

GPU 版は CPU 版 (`MtseedDatetimeSearcher`) と同一のインターフェースを提供する:

```rust
// CPU 版 (既存)
impl MtseedDatetimeSearcher {
    pub fn new(params: MtseedDatetimeSearchParams) -> Result<Self, String>;
    pub fn is_done(&self) -> bool;
    pub fn progress(&self) -> f64;
    pub fn next_batch(&mut self, chunk_count: u32) -> MtseedDatetimeSearchBatch;
}

// GPU 版 (新規)
impl GpuMtseedDatetimeSearcher {
    pub fn new(ctx: &GpuDeviceContext, params: &MtseedDatetimeSearchParams) 
        -> Result<Self, String>;
    pub fn is_done(&self) -> bool;
    pub fn progress(&self) -> f64;
    pub async fn next_batch(&mut self, chunk_count: u32) -> MtseedDatetimeSearchBatch;
}
```

**差異:**
- コンストラクタが `GpuDeviceContext` を要求
- `next_batch` が async (GPU 計算待機)

### 3.3 既存型の再利用

| 型 | 定義元 | 用途 |
|----|--------|------|
| `MtseedDatetimeSearchParams` | `datetime_search/mtseed.rs` | 検索パラメータ |
| `MtseedDatetimeSearchBatch` | `datetime_search/mtseed.rs` | バッチ結果 |
| `SeedOrigin` | `types/seeds.rs` | 検索結果 (起動条件付き) |
| `StartupCondition` | `types/config.rs` | Timer0 / VCount / KeyCode |
| `Datetime` | `types/config.rs` | 日時情報 |
| `MtSeed`, `LcgSeed` | `types/seeds.rs` | Seed 型 |

### 3.4 Feature Flag

```toml
# wasm-pkg/Cargo.toml
[features]
default = ["console_error_panic_hook", "gpu"]
gpu = ["dep:wgpu", "dep:web-sys"]

[dependencies]
wgpu = { version = "24", optional = true, default-features = false, features = ["webgpu", "wgsl"] }
web-sys = { version = "0.3", optional = true, features = ["Navigator", "Gpu"] }

[dev-dependencies]
pollster = "0.4"  # Native 環境で wgpu の async をブロック実行
```

> **Note:** wgpu の async 関数は環境によって異なるランタイムを使用する:
> - **WASM**: `wasm-bindgen-futures` (自動適用)
> - **Native**: `pollster::block_on()` または `tokio` でブロック実行

#### CI 環境での考慮事項

| 環境 | 対応 |
|------|------|
| `cargo test` (native) | `--no-default-features` で GPU テストをスキップ |
| `cargo clippy` | GPU コードも静的解析対象 (feature 有効) |
| `wasm-pack build` | `--features gpu` でビルド |
| `wasm-pack test --headless --chrome` | WebGPU 対応ブラウザでのみ GPU テスト実行 |

**CI スクリプト例:**

```powershell
# Lint (GPU コード含む)
cargo clippy --all-targets --features gpu -- -D warnings

# Native テスト (GPU スキップ)
cargo test --no-default-features --features console_error_panic_hook

# WASM ビルド
wasm-pack build --target web --features gpu
```

### 3.5 モジュール構成

```
wasm-pkg/src/
├── lib.rs                    # gpu モジュール re-export
├── datetime_search/
│   ├── mtseed.rs            # CPU 版 (既存)
│   └── ...
└── gpu/
    ├── mod.rs               # サブモジュール宣言
    ├── context.rs           # GpuDeviceContext
    ├── profile.rs           # GpuProfile, GpuKind
    ├── limits.rs            # SearchJobLimits
    └── datetime_search/
        ├── mod.rs           # GpuMtseedDatetimeSearcher
        ├── searcher.rs      # 検索ロジック本体
        ├── shader.wgsl      # WGSL シェーダー
        └── pipeline.rs      # パイプライン・バッファ管理
```

### 3.6 SearchJobLimits

GPU デバイス制限から検索ジョブのパラメータを導出する:

```rust
// wasm-pkg/src/gpu/limits.rs

/// GPU 検索ジョブの制限値
#[derive(Debug, Clone)]
pub struct SearchJobLimits {
    /// ワークグループサイズ (スレッド数/ワークグループ)
    pub workgroup_size: u32,
    /// 最大ワークグループ数 (1 ディスパッチあたり)
    pub max_workgroups: u32,
    /// 1 ディスパッチあたりの最大メッセージ数
    pub max_messages_per_dispatch: u32,
    /// 候補バッファ容量 (マッチ結果の最大数)
    pub candidate_capacity: u32,
    /// 同時実行可能なディスパッチ数
    pub max_dispatches_in_flight: u32,
}

impl SearchJobLimits {
    /// デバイス制限から導出
    pub fn from_device_limits(limits: &wgpu::Limits, profile: &GpuProfile) -> Self {
        let workgroup_size = match profile.kind {
            GpuKind::Discrete => 256,
            GpuKind::Integrated => 256,
            GpuKind::Mobile => 128,
            GpuKind::Unknown => 128,
        };

        let max_workgroups = limits
            .max_compute_workgroups_per_dimension
            .min(65535);

        let max_messages_per_dispatch = workgroup_size * max_workgroups;

        // 候補バッファ: 4KB (1024 レコード × 8 bytes)
        let candidate_capacity = 1024;

        let max_dispatches_in_flight = match profile.kind {
            GpuKind::Discrete => 4,
            GpuKind::Integrated => 2,
            _ => 1,
        };

        Self {
            workgroup_size,
            max_workgroups,
            max_messages_per_dispatch,
            candidate_capacity,
            max_dispatches_in_flight,
        }
    }
}
```

| フィールド | 用途 | 導出元 |
|-----------|------|-------|
| `workgroup_size` | シェーダーの `@workgroup_size` | GPU プロファイル |
| `max_workgroups` | `dispatch_workgroups(N, 1, 1)` の N | `limits.max_compute_workgroups_per_dimension` |
| `max_messages_per_dispatch` | 1 回のディスパッチで処理するメッセージ数 | `workgroup_size × max_workgroups` |
| `candidate_capacity` | 結果バッファのレコード数上限 | 固定値 (メモリ効率) |
| `max_dispatches_in_flight` | パイプライン深度 | GPU プロファイル |

### 3.7 パイプライン処理の工夫

参照実装のパイプライン最適化パターンを採用する:

#### 3.7.1 DispatchSlot プール

```rust
/// ディスパッチスロット
/// 各スロットが独立したバッファセットを持ち、並行ディスパッチを実現
struct DispatchSlot {
    id: usize,
    /// ディスパッチ状態バッファ (message_count, base_offset, capacity, padding)
    dispatch_state_buffer: wgpu::Buffer,
    /// uniform バッファ (セグメント固有パラメータ)
    uniform_buffer: wgpu::Buffer,
    /// 結果出力バッファ (GPU 書き込み用)
    match_output_buffer: wgpu::Buffer,
    /// 結果読み出しバッファ (CPU 読み出し用、MAP_READ)
    readback_buffer: wgpu::Buffer,
}
```

#### 3.7.2 バッチディスパッチ (ダブルバッファリングの代替)

> **Note:** WASM 環境では threads が使用できないため、真のダブルバッファリング（GPU 計算と CPU 処理の同時進行）は実現できない。代わりに「バッチディスパッチ」パターンを採用する。

**制約:**
- WASM はシングルスレッド（async/await は cooperative multitasking）
- GPU 計算待機中に CPU 処理を「並列」実行することは不可能

**バッチディスパッチパターン:**
1. 複数のセグメントを連続して `queue.submit()` （GPU に投げるだけ、待機しない）
2. 全ディスパッチ完了後、まとめて `buffer.map_async()` で結果読み出し
3. 各スロットの結果を順次処理

```
[submit seg0] → [submit seg1] → [submit seg2] → [await all] → [process results]
```

- 各スロットが独立した `match_output_buffer` と `readback_buffer` を持つ
- GPU パイプラインを埋めることでスループット向上
- `max_dispatches_in_flight` 個のスロットを事前確保

#### 3.7.3 acquire/release パターン

```rust
impl SearchPipeline {
    /// 利用可能なスロットを取得 (空きがなければ待機)
    async fn acquire_slot(&self) -> DispatchSlot { ... }
    
    /// スロットを解放 (待機中のタスクがあれば通知)
    fn release_slot(&self, slot: DispatchSlot) { ... }
}
```

- GPU 計算完了を待たずに次のディスパッチを発行
- パイプライン深度を最大化し、GPU 使用率を向上

#### 3.7.4 パイプライン充填による効率化

**WASM (シングルスレッド) での実行フロー:**

```
時間軸 →
[submit 0][submit 1][submit 2] ────────────────▶ [await] ▶ [process 0][process 1][process 2]
                                  GPU が並列処理
```

**効果:**
- GPU は複数ディスパッチを内部でパイプライン処理
- CPU 側は submit 後に即座に次の submit を発行可能
- 全 submit 完了後にまとめて await することで GPU 利用率を最大化

> **Native 環境 (テスト用):** threads が使える場合は真の並列処理も可能だが、本実装では WASM 互換性を優先してバッチディスパッチを採用する。

---

## 4. 実装仕様

### 4.1 GpuDeviceContext

```rust
// wasm-pkg/src/gpu/context.rs

#[cfg(feature = "gpu")]
use wgpu;

#[cfg(all(feature = "gpu", target_arch = "wasm32"))]
use wasm_bindgen::prelude::*;

/// WebGPU デバイスコンテキスト
/// WASM/Native 両環境で共通のインターフェースを提供
#[cfg(feature = "gpu")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct GpuDeviceContext {
    device: wgpu::Device,
    queue: wgpu::Queue,
    limits: wgpu::Limits,
    profile: GpuProfile,
}

#[cfg(feature = "gpu")]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl GpuDeviceContext {
    /// コンテキスト作成 (非同期)
    /// WASM: WebGPU バックエンド、Native: Vulkan/Metal/DX12
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(constructor))]
    pub async fn new() -> Result<GpuDeviceContext, String> {
        let backends = {
            #[cfg(target_arch = "wasm32")]
            { wgpu::Backends::BROWSER_WEBGPU }
            #[cfg(not(target_arch = "wasm32"))]
            { wgpu::Backends::PRIMARY }
        };

        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor {
            backends,
            ..Default::default()
        });

        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                ..Default::default()
            })
            .await
            .ok_or("GPU adapter not found")?;

        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor::default(), None)
            .await
            .map_err(|e| format!("Device request failed: {e}"))?;

        let limits = device.limits();
        let profile = GpuProfile::detect(&adapter);

        Ok(Self { device, queue, limits, profile })
    }
}

#[cfg(feature = "gpu")]
impl GpuDeviceContext {
    pub fn device(&self) -> &wgpu::Device { &self.device }
    pub fn queue(&self) -> &wgpu::Queue { &self.queue }
    pub fn limits(&self) -> &wgpu::Limits { &self.limits }
    pub fn profile(&self) -> &GpuProfile { &self.profile }
}
```

### 4.2 GpuMtseedDatetimeSearcher

```rust
// wasm-pkg/src/gpu/datetime_search/searcher.rs

use crate::datetime_search::{MtseedDatetimeSearchBatch, MtseedDatetimeSearchParams};
use crate::types::{Datetime, LcgSeed, MtSeed, SeedOrigin, StartupCondition};
use super::pipeline::SearchPipeline;
use super::super::context::GpuDeviceContext;

/// GPU 版 MT Seed 起動時刻検索器
#[cfg(feature = "gpu")]
#[wasm_bindgen]
pub struct GpuMtseedDatetimeSearcher {
    pipeline: SearchPipeline,
    params: MtseedDatetimeSearchParams,
    /// 現在のセグメントインデックス
    current_segment: usize,
    /// セグメント内の処理済みオフセット
    segment_offset: u32,
    /// 総処理数
    total_count: u64,
    /// 処理済み数
    processed_count: u64,
}

#[cfg(feature = "gpu")]
impl GpuMtseedDatetimeSearcher {
    /// 検索器を作成
    pub fn new(
        ctx: &GpuDeviceContext,
        params: &MtseedDatetimeSearchParams,
    ) -> Result<GpuMtseedDatetimeSearcher, String> {
        if params.target_seeds.is_empty() {
            return Err("target_seeds is empty".into());
        }

        let pipeline = SearchPipeline::new(ctx, params);
        let total_count = calculate_total_count(params);

        Ok(Self {
            pipeline,
            params,
            current_segment: 0,
            segment_offset: 0,
            total_count,
            processed_count: 0,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.processed_count >= self.total_count
    }

    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64 {
        if self.total_count == 0 { 1.0 }
        else { self.processed_count as f64 / self.total_count as f64 }
    }

    /// 次のバッチを検索 (GPU 実行)
    pub async fn next_batch(&mut self, chunk_count: u32) -> MtseedDatetimeSearchBatch {
        let mut results = Vec::new();
        let mut remaining = chunk_count;

        while remaining > 0 && !self.is_done() {
            // GPU ディスパッチ実行
            let (matches, processed) = self.pipeline
                .dispatch(remaining, self.current_segment, self.segment_offset)
                .await;

            self.processed_count += u64::from(processed);
            remaining = remaining.saturating_sub(processed);

            // マッチ結果を SeedOrigin に変換
            for (datetime, lcg_seed, condition) in matches {
                results.push(SeedOrigin::startup(lcg_seed, datetime, condition));
            }

            // セグメント進行管理
            self.segment_offset += processed;
            if self.segment_offset >= self.pipeline.segment_size(self.current_segment) {
                self.current_segment += 1;
                self.segment_offset = 0;
            }
        }

        MtseedDatetimeSearchBatch {
            results,
            processed_count: self.processed_count,
            total_count: self.total_count,
        }
    }
}
```

### 4.3 SearchPipeline

```rust
// wasm-pkg/src/gpu/datetime_search/pipeline.rs

use wgpu;
use crate::datetime_search::MtseedDatetimeSearchParams;
use crate::types::{Datetime, LcgSeed, StartupCondition};

/// GPU 検索パイプライン
#[cfg(feature = "gpu")]
pub struct SearchPipeline {
    device: wgpu::Device,
    queue: wgpu::Queue,
    pipeline: wgpu::ComputePipeline,
    bind_group_layout: wgpu::BindGroupLayout,
    /// セグメント情報 (Timer0 × VCount × KeyCode)
    segments: Vec<SegmentInfo>,
    /// ターゲット Seed バッファ
    target_buffer: wgpu::Buffer,
    /// 定数バッファ
    constants_buffer: wgpu::Buffer,
    /// 結果バッファ
    output_buffer: wgpu::Buffer,
    /// 結果読み出し用ステージングバッファ
    staging_buffer: wgpu::Buffer,
    /// ワークグループサイズ
    workgroup_size: u32,
}

#[derive(Clone)]
struct SegmentInfo {
    timer0: u16,
    vcount: u8,
    key_code: u32,
    message_count: u32,
}

#[cfg(feature = "gpu")]
impl SearchPipeline {
    pub fn new(ctx: &GpuDeviceContext, params: &MtseedDatetimeSearchParams) -> Result<Self, String> {
        let device = ctx.device().clone();
        let queue = ctx.queue().clone();

        // シェーダーモジュール作成
        let shader_source = include_str!("shader.wgsl");
        let workgroup_size = derive_workgroup_size(ctx.limits());
        let shader_code = shader_source.replace("WORKGROUP_SIZE_PLACEHOLDER", &workgroup_size.to_string());

        let module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("mtseed-datetime-search"),
            source: wgpu::ShaderSource::Wgsl(shader_code.into()),
        });

        // バインドグループレイアウト
        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("mtseed-datetime-search-layout"),
            entries: &[
                // binding 0: DispatchState (storage, read)
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // binding 1: SearchConstants (uniform)
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // binding 2: TargetSeeds (storage, read)
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // binding 3: MatchOutput (storage, read_write)
                wgpu::BindGroupLayoutEntry {
                    binding: 3,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });

        // パイプライン作成
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("mtseed-datetime-search-pipeline-layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("mtseed-datetime-search-pipeline"),
            layout: Some(&pipeline_layout),
            module: &module,
            entry_point: Some("sha1_generate"),
            compilation_options: Default::default(),
            cache: None,
        });

        // セグメント展開
        let segments = expand_segments(params);

        // バッファ作成
        let target_buffer = create_target_buffer(&device, &params.target_seeds);
        let constants_buffer = create_constants_buffer(&device, params);
        let output_buffer = create_output_buffer(&device);
        let staging_buffer = create_staging_buffer(&device);

        Ok(Self {
            device,
            queue,
            pipeline,
            bind_group_layout,
            segments,
            target_buffer,
            constants_buffer,
            output_buffer,
            staging_buffer,
            workgroup_size,
        })
    }

    /// GPU ディスパッチ実行
    pub async fn dispatch(
        &self,
        max_count: u32,
        segment_idx: usize,
        offset: u32,
    ) -> (Vec<(Datetime, LcgSeed, StartupCondition)>, u32) {
        let segment = &self.segments[segment_idx];
        let remaining = segment.message_count.saturating_sub(offset);
        let count = max_count.min(remaining);

        if count == 0 {
            return (vec![], 0);
        }

        // ディスパッチ状態を更新
        self.update_dispatch_state(segment, offset, count);

        // コマンドエンコード
        let mut encoder = self.device.create_command_encoder(&Default::default());
        {
            let mut pass = encoder.begin_compute_pass(&Default::default());
            pass.set_pipeline(&self.pipeline);
            pass.set_bind_group(0, &self.create_bind_group(segment), &[]);
            let workgroup_count = count.div_ceil(self.workgroup_size);
            pass.dispatch_workgroups(workgroup_count, 1, 1);
        }

        // 結果コピー
        encoder.copy_buffer_to_buffer(
            &self.output_buffer, 0,
            &self.staging_buffer, 0,
            self.staging_buffer.size(),
        );

        self.queue.submit(std::iter::once(encoder.finish()));

        // 結果読み出し
        let matches = self.read_results(segment).await;

        (matches, count)
    }

    pub fn segment_size(&self, idx: usize) -> u32 {
        self.segments.get(idx).map_or(0, |s| s.message_count)
    }
}
```

### 4.4 WGSL シェーダー

```wgsl
// wasm-pkg/src/gpu/datetime_search/shader.wgsl

const WORKGROUP_SIZE: u32 = WORKGROUP_SIZE_PLACEHOLDERu;

struct DispatchState {
    message_count: u32,
    base_second_offset: u32,
    candidate_capacity: u32,
    padding: u32,
};

// 定数構築ルール:
// - timer0_vcount_swapped: swap_bytes((vcount << 16) | timer0)
// - mac_lower: (mac[4] << 8) | mac[5]  ※16bit のみ
// - data7_swapped: swap_bytes(mac[0..4] ^ GX_STAT ^ frame)
//   - GX_STAT = 0x0600_0000
//   - frame = get_frame(hardware)  // DS:8, DsLite/Dsi:6, Dsi3ds:9
// - nazo0..4: swap_bytes(nazo.values[i])  ※エンディアン変換必須
struct SearchConstants {
    timer0_vcount_swapped: u32,  // swap_bytes((vcount << 16) | timer0)
    mac_lower: u32,              // (mac[4] << 8) | mac[5] ※16bit
    data7_swapped: u32,          // swap_bytes(mac_upper ^ GX_STAT ^ frame)
    key_input_swapped: u32,      // swap_bytes(key_code)
    hardware_type: u32,          // 0:DS, 1:DsLite, 2:Dsi, 3:Dsi3ds
    start_year: u32,
    start_day_of_year: u32,
    start_day_of_week: u32,
    hour_range_start: u32,
    hour_range_count: u32,
    minute_range_start: u32,
    minute_range_count: u32,
    second_range_start: u32,
    second_range_count: u32,
    nazo0: u32,  // swap_bytes(nazo.values[0])
    nazo1: u32,  // swap_bytes(nazo.values[1])
    nazo2: u32,  // swap_bytes(nazo.values[2])
    nazo3: u32,  // swap_bytes(nazo.values[3])
    nazo4: u32,  // swap_bytes(nazo.values[4])
    reserved0: u32,
};

struct TargetSeedBuffer {
    count: u32,
    values: array<u32>,
};

struct MatchRecord {
    message_index: u32,
    h0: u32,  // SHA-1 ハッシュ h0 (LCG Seed 下位用)
    h1: u32,  // SHA-1 ハッシュ h1 (LCG Seed 上位用)
    padding: u32,  // アライメント用
};

struct MatchOutputBuffer {
    match_count: atomic<u32>,
    records: array<MatchRecord>,
};

@group(0) @binding(0) var<storage, read> state: DispatchState;
@group(0) @binding(1) var<uniform> constants: SearchConstants;
@group(0) @binding(2) var<storage, read> target_seeds: TargetSeedBuffer;
@group(0) @binding(3) var<storage, read_write> output_buffer: MatchOutputBuffer;

// BCD ルックアップテーブル (0-99)
const BCD_LOOKUP: array<u32, 100> = array<u32, 100>(
    0x00u, 0x01u, 0x02u, 0x03u, 0x04u, 0x05u, 0x06u, 0x07u, 0x08u, 0x09u,
    0x10u, 0x11u, 0x12u, 0x13u, 0x14u, 0x15u, 0x16u, 0x17u, 0x18u, 0x19u,
    0x20u, 0x21u, 0x22u, 0x23u, 0x24u, 0x25u, 0x26u, 0x27u, 0x28u, 0x29u,
    0x30u, 0x31u, 0x32u, 0x33u, 0x34u, 0x35u, 0x36u, 0x37u, 0x38u, 0x39u,
    0x40u, 0x41u, 0x42u, 0x43u, 0x44u, 0x45u, 0x46u, 0x47u, 0x48u, 0x49u,
    0x50u, 0x51u, 0x52u, 0x53u, 0x54u, 0x55u, 0x56u, 0x57u, 0x58u, 0x59u,
    0x60u, 0x61u, 0x62u, 0x63u, 0x64u, 0x65u, 0x66u, 0x67u, 0x68u, 0x69u,
    0x70u, 0x71u, 0x72u, 0x73u, 0x74u, 0x75u, 0x76u, 0x77u, 0x78u, 0x79u,
    0x80u, 0x81u, 0x82u, 0x83u, 0x84u, 0x85u, 0x86u, 0x87u, 0x88u, 0x89u,
    0x90u, 0x91u, 0x92u, 0x93u, 0x94u, 0x95u, 0x96u, 0x97u, 0x98u, 0x99u
);

fn left_rotate(value: u32, amount: u32) -> u32 {
    return (value << amount) | (value >> (32u - amount));
}

fn is_leap_year(year: u32) -> bool {
    return (year % 4u == 0u) && ((year % 100u != 0u) || (year % 400u == 0u));
}

fn month_day_from_day_of_year(day_of_year: u32, leap: bool) -> vec2<u32> {
    // 月と日を返す (1-indexed)
    var day = day_of_year;
    let feb = select(28u, 29u, leap);
    let months = array<u32, 12>(31u, feb, 31u, 30u, 31u, 30u, 31u, 31u, 30u, 31u, 30u, 31u);
    
    for (var m = 0u; m < 12u; m = m + 1u) {
        if (day <= months[m]) {
            return vec2<u32>(m + 1u, day);
        }
        day = day - months[m];
    }
    return vec2<u32>(12u, 31u);
}

fn linear_search(code: u32) -> bool {
    for (var i = 0u; i < target_seeds.count; i = i + 1u) {
        if (target_seeds.values[i] == code) {
            return true;
        }
    }
    return false;
}

fn sha1_compress(w_in: array<u32, 16>) -> array<u32, 5> {
    var w = w_in;
    var a: u32 = 0x67452301u;
    var b: u32 = 0xEFCDAB89u;
    var c: u32 = 0x98BADCFEu;
    var d: u32 = 0x10325476u;
    var e: u32 = 0xC3D2E1F0u;

    for (var i: u32 = 0u; i < 80u; i = i + 1u) {
        let w_index = i & 15u;
        var w_value: u32;
        if (i < 16u) {
            w_value = w[w_index];
        } else {
            w_value = left_rotate(
                w[(w_index + 13u) & 15u] ^
                w[(w_index + 8u) & 15u] ^
                w[(w_index + 2u) & 15u] ^
                w[w_index],
                1u
            );
            w[w_index] = w_value;
        }

        var f: u32;
        var k: u32;
        if (i < 20u) {
            f = (b & c) | ((~b) & d);
            k = 0x5A827999u;
        } else if (i < 40u) {
            f = b ^ c ^ d;
            k = 0x6ED9EBA1u;
        } else if (i < 60u) {
            f = (b & c) | (b & d) | (c & d);
            k = 0x8F1BBCDCu;
        } else {
            f = b ^ c ^ d;
            k = 0xCA62C1D6u;
        }

        let temp = left_rotate(a, 5u) + f + e + k + w_value;
        e = d;
        d = c;
        c = left_rotate(b, 30u);
        b = a;
        a = temp;
    }

    return array<u32, 5>(
        0x67452301u + a,
        0xEFCDAB89u + b,
        0x98BADCFEu + c,
        0x10325476u + d,
        0xC3D2E1F0u + e
    );
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn sha1_generate(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let idx = global_id.x;
    if (idx >= state.message_count) {
        return;
    }

    // 時刻範囲から日時を計算
    let combos_per_day = max(constants.hour_range_count, 1u)
                       * max(constants.minute_range_count, 1u)
                       * max(constants.second_range_count, 1u);
    let total_offset = state.base_second_offset + idx;

    let day_offset = total_offset / combos_per_day;
    let remainder = total_offset - day_offset * combos_per_day;

    let entries_per_hour = max(constants.minute_range_count, 1u) 
                         * max(constants.second_range_count, 1u);
    let hour_index = remainder / entries_per_hour;
    let remainder2 = remainder - hour_index * entries_per_hour;
    let minute_index = remainder2 / max(constants.second_range_count, 1u);
    let second_index = remainder2 - minute_index * max(constants.second_range_count, 1u);

    let hour = constants.hour_range_start + hour_index;
    let minute = constants.minute_range_start + minute_index;
    let second = constants.second_range_start + second_index;

    // 年・月・日を計算
    var year = constants.start_year;
    var day_of_year = constants.start_day_of_year + day_offset;
    loop {
        let year_length = select(365u, 366u, is_leap_year(year));
        if (day_of_year <= year_length) { break; }
        day_of_year = day_of_year - year_length;
        year = year + 1u;
    }

    let leap = is_leap_year(year);
    let month_day = month_day_from_day_of_year(day_of_year, leap);
    let month = month_day.x;
    let day = month_day.y;
    let day_of_week = (constants.start_day_of_week + day_offset) % 7u;

    // BCD 形式で日時ワードを構築
    let year_mod = year % 100u;
    let date_word = (BCD_LOOKUP[year_mod] << 24u) |
                    (BCD_LOOKUP[month] << 16u) |
                    (BCD_LOOKUP[day] << 8u) |
                    BCD_LOOKUP[day_of_week];

    let is_pm = (constants.hardware_type <= 1u) && (hour >= 12u);
    let pm_flag = select(0u, 1u, is_pm);
    let time_word = (pm_flag << 30u) |
                    (BCD_LOOKUP[hour] << 24u) |
                    (BCD_LOOKUP[minute] << 16u) |
                    (BCD_LOOKUP[second] << 8u);

    // SHA-1 メッセージ構築
    var w: array<u32, 16>;
    w[0] = constants.nazo0;
    w[1] = constants.nazo1;
    w[2] = constants.nazo2;
    w[3] = constants.nazo3;
    w[4] = constants.nazo4;
    w[5] = constants.timer0_vcount_swapped;
    w[6] = constants.mac_lower;
    w[7] = constants.data7_swapped;
    w[8] = date_word;
    w[9] = time_word;
    w[10] = 0u;
    w[11] = 0u;
    w[12] = constants.key_input_swapped;
    w[13] = 0x80000000u;
    w[14] = 0u;
    w[15] = 0x000001A0u;

    // SHA-1 計算
    let hash = sha1_compress(w);

    // MT Seed = hash[0] (上位 32bit)
    let mt_seed = hash[0];

    // ターゲットとマッチ判定
    if (linear_search(mt_seed)) {
        let match_idx = atomicAdd(&output_buffer.match_count, 1u);
        if (match_idx < state.candidate_capacity) {
            output_buffer.records[match_idx].message_index = idx;
            output_buffer.records[match_idx].h0 = hash[0];  // LCG Seed 下位用
            output_buffer.records[match_idx].h1 = hash[1];  // LCG Seed 上位用
            output_buffer.records[match_idx].padding = 0u;
        }
    }
}
```

### 4.5 Worker 実装 (TypeScript)

```typescript
// src/workers/mtseed-datetime-search-worker-gpu.ts

import init, {
  GpuDeviceContext,
  GpuMtseedDatetimeSearcher,
  type MtseedDatetimeSearchParams,
  type MtseedDatetimeSearchBatch,
} from '@wasm/wasm_pkg';

let context: GpuDeviceContext | null = null;
let searcher: GpuMtseedDatetimeSearcher | null = null;
let stopRequested = false;

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'START':
      await runSearch(payload);
      break;
    case 'STOP':
      stopRequested = true;
      break;
  }
};

async function runSearch(params: MtseedDatetimeSearchParams) {
  stopRequested = false;

  try {
    await init();

    // GPU コンテキスト初期化 (WebGPU 非対応環境ではエラーが投げられる)
    context = await new GpuDeviceContext();
    // new() は同期だが、WASM 経由では Promise になる可能性あり
    searcher = new GpuMtseedDatetimeSearcher(context, params);

    const BATCH_SIZE = 100_000;

    while (!searcher.is_done && !stopRequested) {
      const batch: MtseedDatetimeSearchBatch = await searcher.next_batch(BATCH_SIZE);

      // 結果をメインスレッドに送信
      for (const result of batch.results) {
        self.postMessage({ type: 'RESULT', result });
      }

      // 進捗を送信
      self.postMessage({
        type: 'PROGRESS',
        progress: {
          processed: batch.processed_count,
          total: batch.total_count,
          percentage: searcher.progress,
        },
      });
    }

    self.postMessage({
      type: 'COMPLETE',
      message: stopRequested ? 'Search stopped' : 'Search completed',
    });
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    searcher?.free();
    context?.free();
    searcher = null;
    context = null;
  }
}
```

---

## 5. テスト方針

### 5.1 ユニットテスト (Rust)

| テストケース | 検証内容 |
|--------------|----------|
| `test_bcd_encode` | BCD 変換の正確性 |
| `test_date_calculation` | 年月日・曜日計算の正確性 |
| `test_message_construction` | SHA-1 メッセージ構築の CPU 版との一致 |
| `test_sha1_hash` | SHA-1 ハッシュ計算の正確性 |

### 5.2 統合テスト

| テストケース | 検証内容 |
|--------------|----------|
| `test_gpu_cpu_consistency` | GPU 結果と CPU 結果の完全一致 |
| `test_known_seed_detection` | 既知の MT Seed が正しく検出されること |
| `test_batch_output_format` | `MtseedDatetimeSearchBatch` 形式の正確性 |

### 5.3 WASM テスト

```powershell
# CPU テスト
cargo test

# GPU 有効テスト (ブラウザ環境でのみ実行可能)
wasm-pack test --headless --chrome --features gpu
```

---

## 6. 実装チェックリスト

- [ ] `wasm-pkg/Cargo.toml` 更新
  - [ ] wgpu 依存追加 (`features = ["webgpu"]`)
  - [ ] web-sys features 追加 (`Navigator`, `Gpu`)
  - [ ] `gpu` feature flag 追加
- [ ] `wasm-pkg/src/gpu/mod.rs` 作成
- [ ] `wasm-pkg/src/gpu/context.rs` 作成
  - [ ] `GpuDeviceContext`
- [ ] `wasm-pkg/src/gpu/profile.rs` 作成
  - [ ] `GpuProfile`, `GpuKind`
  - [ ] プロファイル検出
- [ ] `wasm-pkg/src/gpu/limits.rs` 作成
  - [ ] `SearchJobLimits`
  - [ ] デバイス制限からの導出
- [ ] `wasm-pkg/src/gpu/datetime_search/mod.rs` 作成
- [ ] `wasm-pkg/src/gpu/datetime_search/searcher.rs` 作成
  - [ ] `GpuMtseedDatetimeSearcher`
  - [ ] CPU 版と同一の API
- [ ] `wasm-pkg/src/gpu/datetime_search/pipeline.rs` 作成
  - [ ] パイプライン初期化
  - [ ] バッファ管理
  - [ ] ディスパッチ実行
- [ ] `wasm-pkg/src/gpu/datetime_search/shader.wgsl` 作成
  - [ ] SHA-1 計算
  - [ ] 日時計算
  - [ ] マッチ判定
- [ ] `wasm-pkg/src/lib.rs` 更新
  - [ ] `gpu` モジュール re-export
- [ ] Worker 実装
  - [ ] WASM API 呼び出し
  - [ ] 進捗・結果送信
- [ ] テスト
  - [ ] CPU 版との結果一致確認
  - [ ] `cargo test` パス
  - [ ] `wasm-pack test` パス
- [ ] CI 更新 (`.github/workflows/ci.yml`)
  - [ ] `lint-rust` ジョブ: `--features gpu` で clippy 実行
  - [ ] `test-rust` ジョブ: `--no-default-features` で GPU テストスキップ
  - [ ] WASM ビルドジョブ追加: `wasm-pack build --features gpu`

---

## 7. 関連ドキュメント

| ドキュメント | 概要 |
|-------------|------|
| [local_007 (DEPRECATED)](../local_007/GPU_COMPUTE.md) | 旧 GPU 計算基盤仕様 (欠番) |
| [datetime_search/mtseed.rs](../../../wasm-pkg/src/datetime_search/mtseed.rs) | CPU 版実装 |
| [types/seeds.rs](../../../wasm-pkg/src/types/seeds.rs) | `SeedOrigin` 定義 |

---

## 補遁 A. ベンチマーク実装例

Native 環境 (Vulkan/DX12/Metal) で criterion による GPU ベンチマークが可能。

### A.1 Cargo.toml 追記

```toml
# wasm-pkg/Cargo.toml

[dev-dependencies]
criterion = { version = "0.5", features = ["async_tokio"] }
tokio = { version = "1", features = ["rt-multi-thread"] }
pollster = "0.4"

[[bench]]
name = "gpu_datetime_search"
harness = false
required-features = ["gpu"]
```

### A.2 ベンチマークコード例

```rust
// benches/gpu_datetime_search.rs

use criterion::{criterion_group, criterion_main, Criterion, BenchmarkId};
use wasm_pkg::gpu::{GpuDeviceContext, GpuMtseedDatetimeSearcher};
use wasm_pkg::datetime_search::MtseedDatetimeSearchParams;
use tokio::runtime::Runtime;

fn bench_10year_search(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    // Native GPU コンテキスト作成 (Vulkan/DX12/Metal)
    let ctx = rt.block_on(async {
        GpuDeviceContext::new().await.expect("GPU required for benchmark")
    });

    let params = MtseedDatetimeSearchParams {
        // 10年分の検索範囲 (2000-01-01 〜 2009-12-31)
        // ... パラメータ設定
        ..Default::default()
    };

    let mut group = c.benchmark_group("gpu_datetime_search");
    group.sample_size(10);  // GPU ベンチは時間がかかるためサンプル数を減らす

    group.bench_with_input(
        BenchmarkId::new("search", "10years"),
        &params,
        |b, params| {
            b.to_async(&rt).iter(|| async {
                let mut searcher = GpuMtseedDatetimeSearcher::new(&ctx, params.clone())
                    .await
                    .unwrap();
                while !searcher.is_done() {
                    searcher.next_batch(1_000_000).await;
                }
            });
        },
    );

    group.finish();
}

criterion_group!(benches, bench_10year_search);
criterion_main!(benches);
```

### A.3 実行方法

```powershell
# GPU ベンチマーク実行
cargo bench --features gpu --bench gpu_datetime_search

# 特定のベンチのみ
cargo bench --features gpu --bench gpu_datetime_search -- "10years"
```

### A.4 注意事項

| 項目 | 説明 |
|------|------|
| CI 環境 | GitHub Actions の標準 Runner には GPU がないため、ローカル実行または GPU 付き Runner が必要 |
| バックエンド差異 | Native (Vulkan/DX12/Metal) と WebGPU で性能特性が異なる可能性 |
| シェーダー互換性 | WGSL は両環境で動作するが、最適化パスが異なる |
| ウォームアップ | 初回実行時はシェーダーコンパイルが発生するため、`sample_size` を調整 |
| メモリ | 10年検索は大量の結果を生成する可能性があるため、メモリ使用量に注意 |

