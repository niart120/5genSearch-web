//! GPU デバイスコンテキスト
//!
//! WebGPU デバイスとキューを管理する。

use super::profile::GpuProfile;

/// WebGPU デバイスコンテキスト
///
/// WASM/Native 両環境で共通のインターフェースを提供する。
pub struct GpuDeviceContext {
    device: wgpu::Device,
    queue: wgpu::Queue,
    limits: wgpu::Limits,
    profile: GpuProfile,
}

impl GpuDeviceContext {
    /// コンテキスト作成 (非同期)
    ///
    /// WASM: WebGPU バックエンド、Native: Vulkan/Metal/DX12
    ///
    /// # Errors
    ///
    /// GPU アダプターが見つからない、またはデバイス要求に失敗した場合。
    pub async fn new() -> Result<GpuDeviceContext, String> {
        let backends = {
            #[cfg(target_arch = "wasm32")]
            {
                wgpu::Backends::BROWSER_WEBGPU
            }
            #[cfg(not(target_arch = "wasm32"))]
            {
                wgpu::Backends::PRIMARY
            }
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

        Ok(Self {
            device,
            queue,
            limits,
            profile,
        })
    }
}

impl GpuDeviceContext {
    /// wgpu デバイスへの参照
    pub fn device(&self) -> &wgpu::Device {
        &self.device
    }

    /// wgpu キューへの参照
    pub fn queue(&self) -> &wgpu::Queue {
        &self.queue
    }

    /// デバイス制限への参照
    pub fn limits(&self) -> &wgpu::Limits {
        &self.limits
    }

    /// GPU プロファイルへの参照
    pub fn gpu_profile(&self) -> &GpuProfile {
        &self.profile
    }
}
