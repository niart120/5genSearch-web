//! GPU プロファイル
//!
//! GPU デバイスの種類と特性を検出する。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

/// GPU デバイスの種類
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, Default, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum GpuKind {
    /// 独立 GPU (高性能)
    Discrete,
    /// 統合 GPU (CPU 内蔵)
    Integrated,
    /// モバイル GPU
    Mobile,
    /// 種別不明
    #[default]
    Unknown,
}

/// GPU プロファイル
///
/// デバイス情報と最適化パラメータを保持する。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GpuProfile {
    /// GPU の種類
    pub kind: GpuKind,
    /// デバイス名
    pub name: String,
    /// ベンダー名
    pub vendor: String,
    /// ドライバー情報
    pub driver: String,
}

impl GpuProfile {
    /// アダプター情報からプロファイルを検出
    pub fn detect(adapter: &wgpu::Adapter) -> Self {
        let info = adapter.get_info();

        let kind = match info.device_type {
            wgpu::DeviceType::DiscreteGpu => GpuKind::Discrete,
            wgpu::DeviceType::IntegratedGpu => GpuKind::Integrated,
            wgpu::DeviceType::VirtualGpu | wgpu::DeviceType::Cpu | wgpu::DeviceType::Other => {
                // モバイル判定: 名前にモバイル GPU のキーワードが含まれるか
                let name_lower = info.name.to_lowercase();
                if name_lower.contains("adreno")
                    || name_lower.contains("mali")
                    || name_lower.contains("powervr")
                    || name_lower.contains("apple")
                {
                    GpuKind::Mobile
                } else {
                    GpuKind::Unknown
                }
            }
        };

        Self {
            kind,
            name: info.name,
            vendor: format!("{:?}", info.vendor),
            driver: info.driver,
        }
    }

    /// Unknown プロファイルを生成
    pub fn unknown() -> Self {
        Self {
            kind: GpuKind::Unknown,
            name: "Unknown".into(),
            vendor: "Unknown".into(),
            driver: "Unknown".into(),
        }
    }
}

impl Default for GpuProfile {
    fn default() -> Self {
        Self::unknown()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gpu_kind_default() {
        assert_eq!(GpuKind::default(), GpuKind::Unknown);
    }

    #[test]
    fn test_gpu_profile_unknown() {
        let profile = GpuProfile::unknown();
        assert_eq!(profile.kind, GpuKind::Unknown);
        assert_eq!(profile.name, "Unknown");
    }
}
