# GPU 計算基盤 仕様書

## 1. 概要

### 1.1 目的

WebGPU による GPU 並列計算機能を実装する。mig_002 仕様書の Phase 6 (GPU アクセラレーション) に対応。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| GpuDeviceContext | WebGPU デバイスコンテキスト |
| GpuProfile | GPU 種別・能力プロファイル |
| GpuKind | GPU 種別 (Mobile / Integrated / Discrete) |
| SearchJobLimits | 検索ジョブ制限値 |
| wgpu | Rust の WebGPU 抽象化ライブラリ |

### 1.3 背景・問題

- CPU 検索は単一 Worker に制限される
- GPU 並列化により検索速度を大幅に向上可能
- WebGPU 対応ブラウザで有効化

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 起動時刻検索 | GPU 並列 SHA-1 計算 |
| MT Seed 検索 | GPU 並列逆算 |
| スケーラビリティ | デバイス能力に応じた自動調整 |

### 1.5 着手条件

- local_001-006 が完了
- wgpu 依存関係が追加済み

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/Cargo.toml` | 変更 | gpu feature + wgpu 依存追加 |
| `wasm-pkg/src/lib.rs` | 変更 | gpu モジュール追加 |
| `wasm-pkg/src/gpu/mod.rs` | 新規 | モジュール宣言 |
| `wasm-pkg/src/gpu/context.rs` | 新規 | GpuDeviceContext |
| `wasm-pkg/src/gpu/profile.rs` | 新規 | GpuProfile, GpuKind |
| `wasm-pkg/src/gpu/limits.rs` | 新規 | SearchJobLimits |
| `wasm-pkg/src/gpu/datetime_search.rs` | 新規 | GPU 起動時刻検索 |
| `wasm-pkg/src/gpu/mtseed_search.rs` | 新規 | GPU MT Seed 検索 |

## 3. 設計方針

### 3.1 モジュール構成

```
wasm-pkg/src/
├── lib.rs              # gpu モジュール追加 (#[cfg(feature = "gpu")])
└── gpu/
    ├── mod.rs          # サブモジュール宣言
    ├── context.rs      # GpuDeviceContext
    ├── profile.rs      # GpuProfile, GpuKind
    ├── limits.rs       # SearchJobLimits
    ├── datetime_search.rs # GPU 起動時刻検索
    └── mtseed_search.rs   # GPU MT Seed 検索
```

### 3.2 Feature Flag

```toml
[features]
default = ["console_error_panic_hook"]
gpu = ["wgpu"]
```

### 3.3 依存関係

```
wgpu (WebGPU)
    ↓
gpu/context.rs (GpuDeviceContext)
    ↓
gpu/datetime_search.rs
gpu/mtseed_search.rs
```

## 4. 実装仕様

### 4.1 Cargo.toml への追加

```toml
[dependencies]
# 既存の依存に追加
wgpu = { version = "0.20", optional = true }
web-sys = { version = "0.3", features = ["Window", "Navigator"] }
js-sys = "0.3"

[features]
default = ["console_error_panic_hook"]
gpu = ["wgpu"]
```

### 4.2 gpu/profile.rs

参照: [mig_002/gpu/device-context.md](../mig_002/gpu/device-context.md)

```rust
//! GPU プロファイル検出

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

/// GPU 種別
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, Default, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum GpuKind {
    #[default]
    Unknown,
    /// モバイル GPU (Mali, Adreno, PowerVR)
    Mobile,
    /// 統合 GPU (Intel UHD, AMD APU, Apple Silicon)
    Integrated,
    /// ディスクリート GPU (NVIDIA, AMD Radeon RX)
    Discrete,
}

impl GpuKind {
    /// 推奨同時ディスパッチ数
    pub const fn default_in_flight(self) -> u32 {
        match self {
            Self::Discrete => 4,
            Self::Integrated => 2,
            Self::Mobile | Self::Unknown => 1,
        }
    }
}

/// プロファイル検出元
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum ProfileSource {
    #[default]
    Unknown,
    /// WebGL UNMASKED_RENDERER_WEBGL
    WebGlRenderer,
    /// wgpu Adapter info
    AdapterInfo,
}

/// GPU プロファイル
#[derive(Clone, Debug, Default)]
pub struct GpuProfile {
    pub kind: GpuKind,
    pub source: ProfileSource,
    pub is_fallback: bool,
    pub renderer: Option<String>,
}

impl GpuProfile {
    /// WebGL レンダラ文字列から検出
    pub fn from_renderer(renderer: &str, is_fallback: bool) -> Self {
        let kind = classify_renderer(renderer);
        Self {
            kind,
            source: ProfileSource::WebGlRenderer,
            is_fallback,
            renderer: Some(renderer.to_owned()),
        }
    }

    /// フォールバック（検出不可時）
    pub fn fallback() -> Self {
        Self {
            kind: GpuKind::Unknown,
            source: ProfileSource::Unknown,
            is_fallback: true,
            renderer: None,
        }
    }
}

fn classify_renderer(renderer: &str) -> GpuKind {
    let s = renderer.to_ascii_lowercase();

    // モバイル優先
    const MOBILE: &[&str] = &["mali", "adreno", "powervr", "sgx"];
    if MOBILE.iter().any(|k| s.contains(k)) {
        return GpuKind::Mobile;
    }

    // ディスクリート
    const DISCRETE: &[&str] = &[
        "nvidia", "geforce", "rtx", "gtx", "quadro",
        "radeon rx", "radeon pro",
        "arc a",
    ];
    if DISCRETE.iter().any(|k| s.contains(k)) {
        return GpuKind::Discrete;
    }

    // 統合
    const INTEGRATED: &[&str] = &[
        "intel", "iris", "uhd", "hd graphics",
        "radeon graphics",
        "apple",
    ];
    if INTEGRATED.iter().any(|k| s.contains(k)) {
        return GpuKind::Integrated;
    }

    GpuKind::Unknown
}

/// WebGPU 可用性チェック
#[wasm_bindgen]
pub fn is_webgpu_available() -> bool {
    let window = match web_sys::window() {
        Some(w) => w,
        None => return false,
    };
    let navigator = window.navigator();
    js_sys::Reflect::has(&navigator, &"gpu".into()).unwrap_or(false)
}
```

### 4.3 gpu/limits.rs

```rust
//! 検索ジョブ制限値

#[cfg(feature = "gpu")]
use wgpu;

/// 検索ジョブ制限値
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SearchJobLimits {
    /// ワークグループあたりのスレッド数
    pub workgroup_size: u32,
    /// 1ディスパッチあたりの最大ワークグループ数
    pub max_workgroups: u32,
    /// 1ディスパッチあたりの最大処理数
    pub max_items: u32,
    /// 結果バッファ容量
    pub result_capacity: u32,
    /// 同時実行ディスパッチ数
    pub max_in_flight: u32,
}

/// ユーザー指定のオーバーライド
#[derive(Clone, Copy, Debug, Default)]
pub struct LimitsOverride {
    pub workgroup_size: Option<u32>,
    pub max_workgroups: Option<u32>,
    pub max_items: Option<u32>,
    pub result_capacity: Option<u32>,
    pub max_in_flight: Option<u32>,
}

const DEFAULT_WORKGROUP_SIZE: u32 = 256;
const DEFAULT_RESULT_CAPACITY: u32 = 4096;
const MAX_IN_FLIGHT_CAP: u32 = 8;

#[cfg(feature = "gpu")]
impl SearchJobLimits {
    /// デバイス制限とプロファイルから導出
    pub fn derive(
        device_limits: &wgpu::Limits,
        profile: &super::profile::GpuProfile,
        overrides: LimitsOverride,
    ) -> Self {
        // ワークグループサイズ
        let workgroup_size = {
            let requested = overrides.workgroup_size.unwrap_or(DEFAULT_WORKGROUP_SIZE);
            let max_x = device_limits.max_compute_workgroup_size_x;
            let max_inv = device_limits.max_compute_invocations_per_workgroup;
            requested.min(max_x).min(max_inv).max(1)
        };

        // ワークグループ数
        let max_workgroups = {
            let device_max = device_limits.max_compute_workgroups_per_dimension;
            let overflow_safe = u32::MAX / workgroup_size;
            overrides
                .max_workgroups
                .unwrap_or(device_max)
                .min(device_max)
                .min(overflow_safe)
                .max(1)
        };

        // 処理数
        let max_items = {
            let by_workgroups = workgroup_size.saturating_mul(max_workgroups);
            overrides.max_items.unwrap_or(by_workgroups).min(by_workgroups).max(1)
        };

        // 結果バッファ容量
        let result_capacity = {
            const RECORD_SIZE: u32 = 8;
            let by_storage = device_limits.max_storage_buffer_binding_size / RECORD_SIZE;
            overrides
                .result_capacity
                .unwrap_or(DEFAULT_RESULT_CAPACITY)
                .min(by_storage)
                .max(1)
        };

        // 同時ディスパッチ数
        let max_in_flight = {
            let default = if profile.is_fallback {
                1
            } else {
                profile.kind.default_in_flight()
            };
            overrides.max_in_flight.unwrap_or(default).min(MAX_IN_FLIGHT_CAP).max(1)
        };

        Self {
            workgroup_size,
            max_workgroups,
            max_items,
            result_capacity,
            max_in_flight,
        }
    }
}
```

### 4.4 gpu/context.rs

```rust
//! GPU デバイスコンテキスト

#[cfg(feature = "gpu")]
use wgpu;
use wasm_bindgen::prelude::*;

use super::limits::{LimitsOverride, SearchJobLimits};
use super::profile::GpuProfile;

/// GPU 初期化エラー
#[derive(Debug)]
pub enum GpuInitError {
    NoAdapter,
    DeviceRequest(String),
}

impl std::fmt::Display for GpuInitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NoAdapter => write!(f, "WebGPU adapter not found"),
            Self::DeviceRequest(e) => write!(f, "device request failed: {e}"),
        }
    }
}

impl std::error::Error for GpuInitError {}

/// WebGPU デバイスコンテキスト
#[cfg(feature = "gpu")]
#[wasm_bindgen]
pub struct GpuDeviceContext {
    device: wgpu::Device,
    queue: wgpu::Queue,
    limits: wgpu::Limits,
    profile: GpuProfile,
    job_limits: SearchJobLimits,
}

#[cfg(feature = "gpu")]
#[wasm_bindgen]
impl GpuDeviceContext {
    /// コンテキスト作成
    #[wasm_bindgen(constructor)]
    pub async fn new() -> Result<GpuDeviceContext, String> {
        Self::with_profile(GpuProfile::fallback()).await
    }

    /// プロファイル指定でコンテキスト作成
    pub async fn with_profile(profile: GpuProfile) -> Result<GpuDeviceContext, String> {
        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor {
            backends: wgpu::Backends::BROWSER_WEBGPU,
            ..Default::default()
        });

        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                ..Default::default()
            })
            .await
            .ok_or("WebGPU adapter not found")?;

        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor::default(), None)
            .await
            .map_err(|e| format!("device request failed: {e}"))?;

        let limits = device.limits();
        let job_limits = SearchJobLimits::derive(&limits, &profile, LimitsOverride::default());

        Ok(Self {
            device,
            queue,
            limits,
            profile,
            job_limits,
        })
    }

    /// プロファイル取得
    #[wasm_bindgen(getter)]
    pub fn gpu_kind(&self) -> u8 {
        self.profile.kind as u8
    }

    /// ジョブ制限値取得
    #[wasm_bindgen(getter)]
    pub fn workgroup_size(&self) -> u32 {
        self.job_limits.workgroup_size
    }

    #[wasm_bindgen(getter)]
    pub fn max_workgroups(&self) -> u32 {
        self.job_limits.max_workgroups
    }

    #[wasm_bindgen(getter)]
    pub fn max_items(&self) -> u32 {
        self.job_limits.max_items
    }
}

#[cfg(feature = "gpu")]
impl GpuDeviceContext {
    pub fn device(&self) -> &wgpu::Device {
        &self.device
    }

    pub fn queue(&self) -> &wgpu::Queue {
        &self.queue
    }

    pub fn limits(&self) -> &wgpu::Limits {
        &self.limits
    }

    pub fn profile(&self) -> &GpuProfile {
        &self.profile
    }

    pub fn job_limits(&self) -> &SearchJobLimits {
        &self.job_limits
    }
}
```

### 4.5 gpu/datetime_search.rs

```rust
//! GPU 起動時刻検索

#[cfg(feature = "gpu")]
use wasm_bindgen::prelude::*;

use crate::datetime_search::{MtseedDatetimeResult, MtseedDatetimeSearchParams};

use super::context::GpuDeviceContext;

/// GPU 版起動時刻検索 (スタブ)
#[cfg(feature = "gpu")]
#[wasm_bindgen]
impl GpuDeviceContext {
    /// GPU で起動時刻検索を実行
    pub async fn search_datetime(
        &self,
        _params: MtseedDatetimeSearchParams,
    ) -> Result<Vec<MtseedDatetimeResult>, String> {
        // Phase 2 で実装予定
        // 計算シェーダーで SHA-1 並列計算
        Err("GPU datetime search not implemented yet".into())
    }
}
```

### 4.6 gpu/mtseed_search.rs

```rust
//! GPU MT Seed 検索

#[cfg(feature = "gpu")]
use wasm_bindgen::prelude::*;

use crate::seed_search::{MtseedResult, MtseedSearchParams};

use super::context::GpuDeviceContext;

/// GPU 版 MT Seed 検索 (スタブ)
#[cfg(feature = "gpu")]
#[wasm_bindgen]
impl GpuDeviceContext {
    /// GPU で MT Seed 検索を実行
    pub async fn search_mtseed(
        &self,
        _params: MtseedSearchParams,
    ) -> Result<Vec<MtseedResult>, String> {
        // Phase 2 で実装予定
        // 計算シェーダーで MT 逆算並列計算
        Err("GPU mtseed search not implemented yet".into())
    }
}
```

### 4.7 gpu/mod.rs

```rust
//! GPU 計算基盤

pub mod context;
pub mod limits;
pub mod profile;

#[cfg(feature = "gpu")]
pub mod datetime_search;
#[cfg(feature = "gpu")]
pub mod mtseed_search;

pub use context::GpuDeviceContext;
pub use limits::{LimitsOverride, SearchJobLimits};
pub use profile::{is_webgpu_available, GpuKind, GpuProfile, ProfileSource};
```

### 4.8 lib.rs の更新

```rust
// 既存のモジュール宣言に追加
#[cfg(feature = "gpu")]
pub mod gpu;

// re-export
#[cfg(feature = "gpu")]
pub use gpu::{is_webgpu_available, GpuDeviceContext, GpuKind};

// GPU 非対応ビルド用スタブ
#[cfg(not(feature = "gpu"))]
#[wasm_bindgen]
pub fn is_webgpu_available() -> bool {
    false
}
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | テスト内容 |
|-----------|-----------|
| `profile.rs` | GPU 種別判定 |
| `limits.rs` | 制限値導出 |

### 5.2 統合テスト

GPU テストはブラウザ環境でのみ実行可能。

### 5.3 コマンド

```powershell
cd wasm-pkg

# CPU のみ
cargo test

# GPU 有効
cargo test --features gpu

# ビルド
wasm-pack build --target web --features gpu
```

## 6. 実装チェックリスト

- [ ] `wasm-pkg/Cargo.toml` 更新
  - [ ] wgpu 依存追加
  - [ ] gpu feature 追加
  - [ ] web-sys, js-sys 依存追加
- [ ] `wasm-pkg/src/gpu/mod.rs` 作成
- [ ] `wasm-pkg/src/gpu/profile.rs` 作成
  - [ ] GpuKind enum
  - [ ] GpuProfile struct
  - [ ] classify_renderer
  - [ ] is_webgpu_available
- [ ] `wasm-pkg/src/gpu/limits.rs` 作成
  - [ ] SearchJobLimits
  - [ ] LimitsOverride
  - [ ] SearchJobLimits::derive
- [ ] `wasm-pkg/src/gpu/context.rs` 作成
  - [ ] GpuDeviceContext
  - [ ] GpuInitError
  - [ ] コンテキスト初期化
- [ ] `wasm-pkg/src/gpu/datetime_search.rs` 作成 (スタブ)
- [ ] `wasm-pkg/src/gpu/mtseed_search.rs` 作成 (スタブ)
- [ ] `wasm-pkg/src/lib.rs` 更新
- [ ] `cargo test` パス確認
- [ ] `wasm-pack build --target web --features gpu` 成功確認

## 7. 今後の拡張 (Phase 2)

| 項目 | 内容 |
|------|------|
| 計算シェーダー実装 | WGSL で SHA-1 / MT 逆算を実装 |
| パイプライン最適化 | 複数ディスパッチの並列実行 |
| 結果バッファ管理 | リングバッファによる結果ストリーミング |
