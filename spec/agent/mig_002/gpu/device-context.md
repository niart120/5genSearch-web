# GPU 汎用基盤: デバイスコンテキスト・制限値導出

WebGPU デバイス管理と検索ジョブ制限値の導出。検索種別に依存しない汎用基盤。

## 1. 概要

### 1.1 対象範囲

| 本ドキュメント (汎用) | 検索固有ドキュメント |
|---------------------|-------------------|
| デバイス初期化 | シェーダー設計 |
| GPU プロファイル検出 | 分割戦略 |
| 制限値導出 | ディスパッチ制御 |

検索固有の設計:
- datetime-search: [datetime-search/gpu-kernel.md](../datetime-search/gpu-kernel.md)

### 1.2 モジュール構成

```
wasm-pkg/src/
└── gpu/
    ├── mod.rs
    ├── context.rs      # GpuDeviceContext
    ├── profile.rs      # GpuProfile, 検出ロジック
    └── limits.rs       # SearchJobLimits, 導出ロジック
```

## 2. GPU プロファイル

### 2.1 型定義

```rust
/// GPU 種別
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum GpuKind {
    #[default]
    Unknown,
    /// モバイル GPU (Mali, Adreno, PowerVR, Apple GPU on iOS)
    Mobile,
    /// 統合 GPU (Intel UHD, AMD APU, Apple Silicon)
    Integrated,
    /// ディスクリート GPU (NVIDIA, AMD Radeon RX, Intel Arc)
    Discrete,
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
```

### 2.2 検出ロジック

```rust
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

    // モバイル優先（Apple Silicon は Integrated 扱い）
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
```

## 3. デバイスコンテキスト

### 3.1 構造体

```rust
/// WebGPU デバイスコンテキスト
pub struct GpuDeviceContext {
    device: wgpu::Device,
    queue: wgpu::Queue,
    limits: wgpu::Limits,
    profile: GpuProfile,
}
```

### 3.2 初期化

```rust
impl GpuDeviceContext {
    /// コンテキスト作成
    ///
    /// # Errors
    /// アダプタ取得またはデバイス作成に失敗した場合
    pub async fn new(profile: GpuProfile) -> Result<Self, GpuInitError> {
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
            .ok_or(GpuInitError::NoAdapter)?;

        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor::default(), None)
            .await
            .map_err(GpuInitError::DeviceRequest)?;

        let limits = device.limits();

        Ok(Self { device, queue, limits, profile })
    }

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
}

/// GPU 初期化エラー
#[derive(Debug)]
pub enum GpuInitError {
    NoAdapter,
    DeviceRequest(wgpu::RequestDeviceError),
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
```

## 4. 検索ジョブ制限値

### 4.1 型定義

```rust
/// 検索ジョブ制限値
///
/// デバイス能力とプロファイルから導出される実行時パラメータ。
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
    /// 同時実行ディスパッチ数（パイプライン深度）
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
```

### 4.2 プロファイル別デフォルト

```rust
impl GpuKind {
    /// 推奨同時ディスパッチ数
    const fn default_in_flight(self) -> u32 {
        match self {
            Self::Discrete => 4,
            Self::Integrated => 2,
            Self::Mobile | Self::Unknown => 1,
        }
    }
}

const DEFAULT_WORKGROUP_SIZE: u32 = 256;
const DEFAULT_RESULT_CAPACITY: u32 = 4096;
const MAX_IN_FLIGHT_CAP: u32 = 8;
```

### 4.3 導出ロジック

```rust
impl SearchJobLimits {
    /// デバイス制限とプロファイルから導出
    pub fn derive(
        device_limits: &wgpu::Limits,
        profile: &GpuProfile,
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
            const RECORD_SIZE: u32 = 8; // offset(4) + seed(4)
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

## 5. 関連ドキュメント

WASM エクスポート（`is_webgpu_available` 等）は [api.md](./api.md) を参照。

| ドキュメント | 内容 |
|-------------|------|
| [api.md](./api.md) | GPU API 概要 |
| [../datetime-search/gpu-kernel.md](../datetime-search/gpu-kernel.md) | 起動時刻検索 GPU カーネル |
| [../datetime-search/worker-interface.md](../datetime-search/worker-interface.md) | Worker ↔ WASM インタフェース |
