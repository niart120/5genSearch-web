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
    ///
    /// ネイティブ環境では wgpu の `AdapterInfo` を使用。
    /// WASM 環境では wgpu v24 の WebGPU バックエンドが `DeviceType::Other` と
    /// 空の `name` を常に返すため、ブラウザの `GPUAdapterInfo` から直接取得した
    /// 情報で補完する。
    pub fn detect(adapter: &wgpu::Adapter) -> Self {
        let info = adapter.get_info();

        // WASM 環境: wgpu が DeviceType::Other かつ name が空の場合、
        // JS API から取得した情報で補完する
        #[cfg(target_arch = "wasm32")]
        let (kind, name, vendor, driver) = {
            let js_info = query_browser_gpu_adapter_info();
            let kind = detect_kind_from_browser_info(&js_info, &info);
            let name = if info.name.is_empty() {
                js_info.description
            } else {
                info.name
            };
            let vendor = if info.vendor == 0 {
                js_info.vendor
            } else {
                format!("{:?}", info.vendor)
            };
            let driver = if info.driver.is_empty() {
                js_info.driver
            } else {
                info.driver
            };
            (kind, name, vendor, driver)
        };

        #[cfg(not(target_arch = "wasm32"))]
        let (kind, name, vendor, driver) = {
            let kind = match info.device_type {
                wgpu::DeviceType::DiscreteGpu => GpuKind::Discrete,
                wgpu::DeviceType::IntegratedGpu => GpuKind::Integrated,
                wgpu::DeviceType::VirtualGpu | wgpu::DeviceType::Cpu | wgpu::DeviceType::Other => {
                    detect_kind_from_name(&info.name)
                }
            };
            (kind, info.name, format!("{:?}", info.vendor), info.driver)
        };

        Self {
            kind,
            name,
            vendor,
            driver,
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

/// デバイス名から GPU 種別を推定
fn detect_kind_from_name(name: &str) -> GpuKind {
    let name_lower = name.to_lowercase();

    // モバイル GPU
    if name_lower.contains("adreno")
        || name_lower.contains("mali")
        || name_lower.contains("powervr")
    {
        return GpuKind::Mobile;
    }

    // Apple Silicon: macOS = Integrated, iOS/iPadOS = Mobile
    // WASM からは OS 判別が難しいため Integrated とする
    // (Apple Silicon の GPU コア数は Discrete に匹敵するが、
    //  メモリ帯域は統合メモリのため Integrated 寄り)
    if name_lower.contains("apple") {
        return GpuKind::Integrated;
    }

    // 独立 GPU (NVIDIA / AMD / Intel Arc)
    if name_lower.contains("geforce")
        || name_lower.contains("rtx")
        || name_lower.contains("gtx")
        || name_lower.contains("quadro")
        || name_lower.contains("radeon")
        || name_lower.contains("arc a")
    {
        return GpuKind::Discrete;
    }

    // 統合 GPU (Intel HD/UHD/Iris)
    if name_lower.contains("intel")
        && (name_lower.contains("hd") || name_lower.contains("uhd") || name_lower.contains("iris"))
    {
        return GpuKind::Integrated;
    }

    GpuKind::Unknown
}

/// ブラウザの GPUAdapterInfo から取得した情報
#[cfg(target_arch = "wasm32")]
struct BrowserGpuAdapterInfo {
    /// GPUAdapterInfo.type: "discrete GPU", "integrated GPU", "CPU", ""
    gpu_type: String,
    /// GPUAdapterInfo.description
    description: String,
    /// GPUAdapterInfo.vendor
    vendor: String,
    /// GPUAdapterInfo.driver (非標準、Chrome が公開)
    driver: String,
}

/// ブラウザの GPUAdapterInfo を JS API から直接取得
///
/// wgpu v24 の WebGPU バックエンドは `AdapterInfo` のフィールドを
/// 空/デフォルト値で返すため、ブラウザの `GPUAdapterInfo` から
/// `type`, `description`, `vendor` を直接読み取る。
#[cfg(target_arch = "wasm32")]
fn query_browser_gpu_adapter_info() -> BrowserGpuAdapterInfo {
    use js_sys::Reflect;
    use wasm_bindgen::JsValue;

    let empty_info = BrowserGpuAdapterInfo {
        gpu_type: String::new(),
        description: String::new(),
        vendor: String::new(),
        driver: String::new(),
    };

    // globalThis.__wgpu_browser_adapter_info を読み取る。
    // GPU Worker の TypeScript 側で requestAdapter() を呼び、
    // adapter.info のプロパティをこのグローバルに設定してから
    // WASM を呼び出す前提。
    let global = js_sys::global();
    let adapter_info =
        match Reflect::get(&global, &JsValue::from_str("__wgpu_browser_adapter_info")) {
            Ok(v) if !v.is_undefined() && !v.is_null() => v,
            _ => return empty_info,
        };

    let get_str = |obj: &JsValue, key: &str| -> String {
        Reflect::get(obj, &JsValue::from_str(key))
            .ok()
            .and_then(|v| v.as_string())
            .unwrap_or_default()
    };

    BrowserGpuAdapterInfo {
        gpu_type: get_str(&adapter_info, "type"),
        description: get_str(&adapter_info, "description"),
        vendor: get_str(&adapter_info, "vendor"),
        driver: get_str(&adapter_info, "driver"),
    }
}

/// ブラウザの GPUAdapterInfo.type から GpuKind を判定
#[cfg(target_arch = "wasm32")]
fn detect_kind_from_browser_info(
    browser_info: &BrowserGpuAdapterInfo,
    wgpu_info: &wgpu::AdapterInfo,
) -> GpuKind {
    // ブラウザの type プロパティを優先
    match browser_info.gpu_type.as_str() {
        "discrete GPU" => return GpuKind::Discrete,
        "integrated GPU" => return GpuKind::Integrated,
        "CPU" => return GpuKind::Unknown,
        _ => {}
    }

    // type が空の場合 (Safari / Firefox 等)、description から判定
    if !browser_info.description.is_empty() {
        return detect_kind_from_name(&browser_info.description);
    }

    // description も空の場合、vendor から推定
    if !browser_info.vendor.is_empty() {
        return detect_kind_from_name(&browser_info.vendor);
    }

    // wgpu の情報にフォールバック
    match wgpu_info.device_type {
        wgpu::DeviceType::DiscreteGpu => GpuKind::Discrete,
        wgpu::DeviceType::IntegratedGpu => GpuKind::Integrated,
        _ => detect_kind_from_name(&wgpu_info.name),
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

    #[test]
    fn test_detect_kind_from_name_discrete() {
        assert_eq!(
            detect_kind_from_name("NVIDIA GeForce RTX 5090"),
            GpuKind::Discrete
        );
        assert_eq!(
            detect_kind_from_name("NVIDIA GeForce GTX 1080"),
            GpuKind::Discrete
        );
        assert_eq!(
            detect_kind_from_name("AMD Radeon RX 7900 XTX"),
            GpuKind::Discrete
        );
        assert_eq!(
            detect_kind_from_name("NVIDIA Quadro RTX 6000"),
            GpuKind::Discrete
        );
        assert_eq!(detect_kind_from_name("Intel Arc A770"), GpuKind::Discrete);
    }

    #[test]
    fn test_detect_kind_from_name_integrated() {
        assert_eq!(
            detect_kind_from_name("Intel UHD Graphics 630"),
            GpuKind::Integrated
        );
        assert_eq!(
            detect_kind_from_name("Intel HD Graphics 4000"),
            GpuKind::Integrated
        );
        assert_eq!(
            detect_kind_from_name("Intel Iris Xe Graphics"),
            GpuKind::Integrated
        );
        assert_eq!(detect_kind_from_name("Apple M3 Pro"), GpuKind::Integrated);
    }

    #[test]
    fn test_detect_kind_from_name_mobile() {
        assert_eq!(
            detect_kind_from_name("Qualcomm Adreno 740"),
            GpuKind::Mobile
        );
        assert_eq!(detect_kind_from_name("ARM Mali-G78"), GpuKind::Mobile);
        assert_eq!(
            detect_kind_from_name("Imagination PowerVR"),
            GpuKind::Mobile
        );
    }

    #[test]
    fn test_detect_kind_from_name_unknown() {
        assert_eq!(detect_kind_from_name(""), GpuKind::Unknown);
        assert_eq!(detect_kind_from_name("Some Unknown GPU"), GpuKind::Unknown);
    }
}
