//! GPU プロファイル
//!
//! GPU デバイスの種類と特性を検出する。
//! WASM 環境では vendor + architecture テーブルで GpuKind を判定する。

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
    /// ベンダー名 ("nvidia", "amd", "intel", "apple", ...)
    pub vendor: String,
    /// アーキテクチャ名 ("blackwell", "rdna3", "xe-lpg", ...)
    pub architecture: String,
    /// デバイス記述 (表示用、判定には使用しない)
    pub description: String,
}

impl GpuProfile {
    /// アダプター情報からプロファイルを検出
    ///
    /// ネイティブ環境では wgpu の `AdapterInfo` から `DeviceType` を使用。
    /// WASM 環境ではブラウザの `GPUAdapterInfo` から取得した
    /// `vendor` + `architecture` でテーブル判定を行う。
    pub fn detect(adapter: &wgpu::Adapter) -> Self {
        let info = adapter.get_info();

        #[cfg(not(target_arch = "wasm32"))]
        {
            let kind = match info.device_type {
                wgpu::DeviceType::DiscreteGpu => GpuKind::Discrete,
                wgpu::DeviceType::IntegratedGpu => GpuKind::Integrated,
                _ => GpuKind::Unknown,
            };
            Self {
                kind,
                vendor: info.driver.clone(),
                architecture: String::new(),
                description: info.name,
            }
        }

        #[cfg(target_arch = "wasm32")]
        {
            let browser = query_browser_gpu_info();
            let kind = detect_kind(&browser.vendor, &browser.architecture);
            Self {
                kind,
                vendor: browser.vendor,
                architecture: browser.architecture,
                description: browser.description,
            }
        }
    }

    /// Unknown プロファイルを生成
    pub fn unknown() -> Self {
        Self {
            kind: GpuKind::Unknown,
            vendor: String::new(),
            architecture: String::new(),
            description: String::new(),
        }
    }
}

impl Default for GpuProfile {
    fn default() -> Self {
        Self::unknown()
    }
}

/// vendor + architecture から GpuKind を判定する。
///
/// WASM/ネイティブ両方のテストで使用するため `cfg` なしで定義する。
fn detect_kind(vendor: &str, architecture: &str) -> GpuKind {
    match vendor {
        "nvidia" => {
            if architecture.starts_with("tegra") {
                GpuKind::Mobile
            } else {
                GpuKind::Discrete
            }
        }
        "amd" => {
            if architecture.starts_with("van-gogh") {
                GpuKind::Integrated
            } else {
                GpuKind::Discrete
            }
        }
        "intel" => {
            if architecture.starts_with("arc") {
                GpuKind::Discrete
            } else {
                GpuKind::Integrated
            }
        }
        "apple" => GpuKind::Integrated,
        "qualcomm" | "arm" | "samsung" | "imgtec" => GpuKind::Mobile,
        _ => GpuKind::Unknown,
    }
}

/// ブラウザの GPUAdapterInfo から取得した情報
#[cfg(target_arch = "wasm32")]
struct BrowserGpuInfo {
    vendor: String,
    architecture: String,
    description: String,
}

/// ブラウザの GPUAdapterInfo を globalThis から取得
///
/// GPU Worker の TypeScript 側で `cacheGpuAdapterInfo()` が
/// `globalThis.__wgpu_browser_adapter_info` に `vendor`, `architecture`,
/// `description` を設定する前提。
#[cfg(target_arch = "wasm32")]
fn query_browser_gpu_info() -> BrowserGpuInfo {
    use js_sys::Reflect;
    use wasm_bindgen::JsValue;

    let empty = BrowserGpuInfo {
        vendor: String::new(),
        architecture: String::new(),
        description: String::new(),
    };

    let global = js_sys::global();
    let info = match Reflect::get(&global, &JsValue::from_str("__wgpu_browser_adapter_info")) {
        Ok(v) if !v.is_undefined() && !v.is_null() => v,
        _ => return empty,
    };

    let get = |key: &str| -> String {
        Reflect::get(&info, &JsValue::from_str(key))
            .ok()
            .and_then(|v| v.as_string())
            .unwrap_or_default()
    };

    BrowserGpuInfo {
        vendor: get("vendor"),
        architecture: get("architecture"),
        description: get("description"),
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
        assert!(profile.vendor.is_empty());
        assert!(profile.architecture.is_empty());
        assert!(profile.description.is_empty());
    }

    // -----------------------------------------------------------------------
    // NVIDIA
    // -----------------------------------------------------------------------

    #[test]
    fn test_detect_kind_nvidia_discrete() {
        assert_eq!(detect_kind("nvidia", "blackwell"), GpuKind::Discrete);
    }

    #[test]
    fn test_detect_kind_nvidia_tegra() {
        assert_eq!(detect_kind("nvidia", "tegra"), GpuKind::Mobile);
    }

    #[test]
    fn test_detect_kind_nvidia_empty_arch() {
        assert_eq!(detect_kind("nvidia", ""), GpuKind::Discrete);
    }

    // -----------------------------------------------------------------------
    // AMD
    // -----------------------------------------------------------------------

    #[test]
    fn test_detect_kind_amd_discrete() {
        assert_eq!(detect_kind("amd", "rdna3"), GpuKind::Discrete);
    }

    #[test]
    fn test_detect_kind_amd_van_gogh() {
        assert_eq!(detect_kind("amd", "van-gogh"), GpuKind::Integrated);
    }

    // -----------------------------------------------------------------------
    // Intel
    // -----------------------------------------------------------------------

    #[test]
    fn test_detect_kind_intel_arc() {
        assert_eq!(detect_kind("intel", "arc"), GpuKind::Discrete);
    }

    #[test]
    fn test_detect_kind_intel_integrated() {
        assert_eq!(detect_kind("intel", "xe-lpg"), GpuKind::Integrated);
    }

    #[test]
    fn test_detect_kind_intel_empty_arch() {
        assert_eq!(detect_kind("intel", ""), GpuKind::Integrated);
    }

    // -----------------------------------------------------------------------
    // Apple / Mobile vendors
    // -----------------------------------------------------------------------

    #[test]
    fn test_detect_kind_apple() {
        assert_eq!(detect_kind("apple", "apple-m3"), GpuKind::Integrated);
    }

    #[test]
    fn test_detect_kind_qualcomm() {
        assert_eq!(detect_kind("qualcomm", "adreno-740"), GpuKind::Mobile);
    }

    #[test]
    fn test_detect_kind_arm() {
        assert_eq!(detect_kind("arm", "mali-g78"), GpuKind::Mobile);
    }

    #[test]
    fn test_detect_kind_samsung() {
        assert_eq!(detect_kind("samsung", "xclipse"), GpuKind::Mobile);
    }

    #[test]
    fn test_detect_kind_imgtec() {
        assert_eq!(detect_kind("imgtec", "powervr"), GpuKind::Mobile);
    }

    // -----------------------------------------------------------------------
    // Unknown
    // -----------------------------------------------------------------------

    #[test]
    fn test_detect_kind_unknown_vendor() {
        assert_eq!(detect_kind("", ""), GpuKind::Unknown);
    }

    #[test]
    fn test_detect_kind_unknown_vendor_with_arch() {
        assert_eq!(detect_kind("unknown-vendor", "some-arch"), GpuKind::Unknown);
    }
}
