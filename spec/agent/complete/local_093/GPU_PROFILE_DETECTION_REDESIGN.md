# GPU プロファイル検出ロジック再設計 仕様書

## 1. 概要

### 1.1 目的

GPU 種別検出ロジックを `vendor + architecture` ベースの判定に一本化し、WASM/ネイティブ両環境で安定した `GpuKind` 判定を実現する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| `GpuKind` | GPU デバイスの種別分類 (`Discrete` / `Integrated` / `Mobile` / `Unknown`) |
| `GpuProfile` | `GpuKind` + デバイス識別情報 (`vendor`, `architecture`, `description`) |
| `BrowserGpuInfo` | TS 側で `GPUAdapterInfo` から抽出してグローバルにキャッシュする情報 |
| `vendor` | `GPUAdapterInfo.vendor` — ベンダー識別名 (例: `"nvidia"`, `"amd"`, `"intel"`, `"apple"`, `"qualcomm"`, `"arm"`) |
| `architecture` | `GPUAdapterInfo.architecture` — GPU アーキテクチャ名 (例: `"blackwell"`, `"rdna3"`, `"xe"`) |

### 1.3 背景・問題

wgpu v28 の WebGPU バックエンドは `AdapterInfo` の全フィールドを空/デフォルト値で返す。
このため TS 側でブラウザの `GPUAdapterInfo` をキャッシュし、Rust 側でフォールバック判定を行う設計としていた。

現行ロジックの問題:

| 問題 | 詳細 |
|------|------|
| headless Chromium で `Unknown` になる | `type` = undefined, `description` = 空。`vendor` = `"nvidia"` だけでは discrete/integrated の区別不可 |
| フォールバックチェーンが複雑 | `type` → `description` → `vendor` → wgpu info と 4 段階、WASM/ネイティブで `cfg` 分岐 |
| `description` のパターンマッチが脆弱 | GPU モデル名の網羅が必要で、新モデル追加のたびに保守が発生する |
| `GPUAdapterInfo.architecture` を未使用 | Chrome/Safari/Firefox で広く対応済みの有力な判別情報が活用されていない |

### 1.4 期待効果

| 項目 | 現行 | 改善後 |
|------|------|--------|
| headless Chromium での判定 | `Unknown` | `Discrete` (nvidia + blackwell) |
| 判定ロジック行数 (Rust) | ~170 行 (WASM/ネイティブ分岐 + 複数フォールバック) | ~80 行 (統一テーブル) |
| 新 GPU 対応 | `detect_kind_from_name` にモデル名パターン追加 | `VENDOR_ARCH_TABLE` にアーキテクチャ名追加 |
| TS → Rust 橋渡しフィールド数 | 4 (`type`, `description`, `vendor`, `driver`) | 3 (`vendor`, `architecture`, `description`) |

### 1.5 着手条件

- wgpu v28 への更新が完了していること (完了済み)
- `fix/wgpu-v28-native-backend` ブランチの変更がマージ済み、またはその上で作業すること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/gpu/profile.rs` | **全面書き換え** | 判定ロジックを `vendor + architecture` テーブル方式に変更 |
| `src/workers/gpu.worker.ts` | 修正 | `cacheGpuAdapterInfo()` で `architecture` を追加、`type`/`driver` を削除 |
| `src/test/integration/gpu-profile.test.ts` | 修正 | 新インターフェースに合わせてテスト更新 |
| `wasm-pkg/src/gpu/limits.rs` | 変更なし | `GpuKind` を参照するのみ。`GpuProfile` のフィールド変更の影響あり (`name` → 削除、`driver` → 削除) |
| `wasm-pkg/src/gpu/context.rs` | 変更なし | `GpuProfile::detect(&adapter)` の呼び出し。シグネチャ不変 |
| `wasm-pkg/src/lib.rs` | 軽微修正 | `detect_gpu_profile()` エクスポートは維持 |

## 3. 設計方針

### 3.1 判定戦略: vendor + architecture テーブル

GPU 種別の判定を **ベンダー名 × アーキテクチャ名の組み合わせテーブル** に一本化する。

判定優先順:

```
1. vendor + architecture → テーブルルックアップ
2. vendor のみ → デフォルト種別
3. いずれも空 → GpuKind::Unknown
```

フォールバックチェーンを 3 段に削減する。

### 3.2 ベンダー・アーキテクチャ判定テーブル

#### NVIDIA

| architecture パターン | GpuKind | 備考 |
|-----------------------|---------|------|
| `tegra` | Mobile | Tegra (Shield, Switch) |
| それ以外 (kepler, maxwell, pascal, turing, ampere, ada-lovelace, blackwell, ...) | Discrete | デスクトップ/ワークステーション GPU |
| 空 | Discrete | NVIDIA の場合はデスクトップが圧倒的多数 |

#### AMD

| architecture パターン | GpuKind | 備考 |
|-----------------------|---------|------|
| `gcn*`, `rdna*` | Discrete | 単体 GPU |
| `van-gogh` | Integrated | Steam Deck (APU) |
| 空 | Discrete | AMD 単体 GPU がデスクトップ用途で多数 |

#### Intel

| architecture パターン | GpuKind | 備考 |
|-----------------------|---------|------|
| `arc` | Discrete | Intel Arc (A シリーズ) |
| `gen-*`, `xe-*` | Integrated | Intel HD/UHD/Iris 系統合 GPU |
| 空 | Integrated | Intel GPU は統合 GPU が大多数 |

#### Apple

| architecture パターン | GpuKind | 備考 |
|-----------------------|---------|------|
| `apple-*` (全パターン) | Integrated | Apple Silicon は統合メモリ |
| 空 | Integrated | |

#### Qualcomm

| architecture パターン | GpuKind | 備考 |
|-----------------------|---------|------|
| `adreno-*` (全パターン) | Mobile | Snapdragon 搭載モバイル GPU |
| 空 | Mobile | |

#### ARM

| architecture パターン | GpuKind | 備考 |
|-----------------------|---------|------|
| `*` (全パターン) | Mobile | Mali GPU |
| 空 | Mobile | |

#### Samsung

| architecture パターン | GpuKind | 備考 |
|-----------------------|---------|------|
| `*` (全パターン) | Mobile | Xclipse (AMD RDNA2 ベース) |
| 空 | Mobile | |

#### ImgTec (Imagination Technologies)

| architecture パターン | GpuKind | 備考 |
|-----------------------|---------|------|
| `*` (全パターン) | Mobile | PowerVR |
| 空 | Mobile | |

#### 不明ベンダー

| 条件 | GpuKind |
|------|---------|
| vendor 空 | Unknown |

### 3.3 `GpuProfile` フィールド再設計

現行:

```rust
pub struct GpuProfile {
    pub kind: GpuKind,
    pub name: String,        // GPU デバイス名 (空になりやすい)
    pub vendor: String,      // ベンダー (数値 or 文字列が混在)
    pub driver: String,      // ドライバー情報 (空になりやすい)
}
```

変更後:

```rust
pub struct GpuProfile {
    pub kind: GpuKind,
    pub vendor: String,       // ベンダー名 ("nvidia", "amd", ...)
    pub architecture: String, // アーキテクチャ名 ("blackwell", "rdna3", ...)
    pub description: String,  // デバイス記述 (表示用、判定には使用しない)
}
```

変更理由:

- `name` → `description`: wgpu WebGPU バックエンドでは常に空。ブラウザの `description` をそのまま保持するほうが命名として正確
- `driver` → 削除: 判定に不要。headless Chromium / Safari では undefined
- `vendor`: 数値 (`u32`) ではなく文字列に統一。ブラウザの `GPUAdapterInfo.vendor` は文字列
- `architecture`: 新規追加。判定の中心情報

### 3.4 ネイティブ環境 (cargo test) の扱い

ネイティブ環境では wgpu が `AdapterInfo` で正確な `DeviceType` を返すため、ネイティブ専用の判定パスを維持する。

```
Native: wgpu DeviceType (Discrete/Integrated/Other) → GpuKind
         AdapterInfo.name → description, driver → vendor (数値→文字列変換)
WASM:   BrowserGpuInfo (vendor + architecture) → テーブル判定 → GpuKind
```

ただし、どちらのパスも最終的に同じ `GpuProfile` 構造体を生成する。

### 3.5 `BrowserGpuInfo` グローバルキャッシュの再設計

TS 側 (`cacheGpuAdapterInfo`) で保存するフィールドを変更:

```typescript
// 変更前
(globalThis as Record<string, unknown>).__wgpu_browser_adapter_info = {
  type: info.type ?? '',
  description: info.description ?? '',
  vendor: info.vendor ?? '',
  driver: info.driver ?? '',
};

// 変更後
(globalThis as Record<string, unknown>).__wgpu_browser_adapter_info = {
  vendor: info.vendor ?? '',
  architecture: info.architecture ?? '',
  description: info.description ?? '',
};
```

## 4. 実装仕様

### 4.1 Rust: `profile.rs` 全面書き換え

```rust
//! GPU プロファイル
//!
//! GPU デバイスの種類と特性を検出する。
//! WASM 環境では vendor + architecture テーブルで GpuKind を判定する。

use serde::{Deserialize, Serialize};
use tsify::Tsify;

#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, Default, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum GpuKind {
    Discrete,
    Integrated,
    Mobile,
    #[default]
    Unknown,
}

#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GpuProfile {
    pub kind: GpuKind,
    pub vendor: String,
    pub architecture: String,
    pub description: String,
}

impl GpuProfile {
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
```

### 4.2 Rust: `detect_kind` 関数 (テーブル判定)

```rust
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
```

### 4.3 Rust: `query_browser_gpu_info` 関数 (WASM 専用)

```rust
#[cfg(target_arch = "wasm32")]
struct BrowserGpuInfo {
    vendor: String,
    architecture: String,
    description: String,
}

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
```

### 4.4 TS: `gpu.worker.ts` の `cacheGpuAdapterInfo` 修正

```typescript
async function cacheGpuAdapterInfo(): Promise<void> {
  try {
    const gpu = navigator.gpu;
    if (!gpu) return;

    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter?.info) return;

    const info = adapter.info;
    (globalThis as Record<string, unknown>).__wgpu_browser_adapter_info = {
      vendor: info.vendor ?? '',
      architecture: info.architecture ?? '',
      description: info.description ?? '',
    };
  } catch {
    // WebGPU 未対応環境では無視
  }
}
```

`GPUAdapterInfoExtended` インターフェースは削除。`vendor`, `architecture`, `description` は標準プロパティのため拡張不要。

### 4.5 削除対象

| 削除対象 | 理由 |
|----------|------|
| `detect_kind_from_name()` | vendor + architecture テーブルに置換。モデル名パターンマッチ不要 |
| `detect_kind_from_browser_info()` | 4 段フォールバックごと削除 |
| `BrowserGpuAdapterInfo` struct | `BrowserGpuInfo` に置換 (フィールド構成変更) |
| `GPUAdapterInfoExtended` (TS) | `type`/`driver` 非標準プロパティの拡張が不要に |

## 5. テスト方針

### 5.1 ユニットテスト (Rust, `profile.rs`)

| テスト名 | 検証内容 |
|----------|----------|
| `test_detect_kind_nvidia_discrete` | `("nvidia", "blackwell")` → `Discrete` |
| `test_detect_kind_nvidia_tegra` | `("nvidia", "tegra")` → `Mobile` |
| `test_detect_kind_nvidia_empty_arch` | `("nvidia", "")` → `Discrete` |
| `test_detect_kind_amd_discrete` | `("amd", "rdna3")` → `Discrete` |
| `test_detect_kind_amd_van_gogh` | `("amd", "van-gogh")` → `Integrated` |
| `test_detect_kind_intel_arc` | `("intel", "arc")` → `Discrete` |
| `test_detect_kind_intel_integrated` | `("intel", "xe-lpg")` → `Integrated` |
| `test_detect_kind_intel_empty_arch` | `("intel", "")` → `Integrated` |
| `test_detect_kind_apple` | `("apple", "apple-m3")` → `Integrated` |
| `test_detect_kind_qualcomm` | `("qualcomm", "adreno-740")` → `Mobile` |
| `test_detect_kind_arm` | `("arm", "mali-g78")` → `Mobile` |
| `test_detect_kind_samsung` | `("samsung", "xclipse")` → `Mobile` |
| `test_detect_kind_imgtec` | `("imgtec", "powervr")` → `Mobile` |
| `test_detect_kind_unknown_vendor` | `("", "")` → `Unknown` |
| `test_detect_kind_unknown_vendor_with_arch` | `("unknown-vendor", "some-arch")` → `Unknown` |
| `test_gpu_kind_default` | `GpuKind::default()` == `Unknown` |
| `test_gpu_profile_unknown` | `GpuProfile::unknown()` の全フィールド検証 |

### 5.2 統合テスト (Vitest Browser Mode, `gpu-profile.test.ts`)

| テスト名 | 検証内容 |
|----------|----------|
| `GPUAdapterInfo を取得できる` | `adapter.info` が存在する |
| `vendor が空でない` | `info.vendor` に値がある |
| `architecture が空でない` | `info.architecture` に値がある |
| `全プロパティをダンプ` | `vendor`, `architecture`, `description` を出力 |
| `GpuProfile を取得できる` | `detect_gpu_profile()` が成功する |
| `kind が Unknown でない` | vendor + architecture が取れる環境では `Unknown` にならない |
| `vendor がブラウザと一致する` | `wasmProfile.vendor` === `browserInfo.vendor` |
| `architecture がブラウザと一致する` | `wasmProfile.architecture` === `browserInfo.architecture` |

## 6. 実装チェックリスト

- [x] `wasm-pkg/src/gpu/profile.rs` を全面書き換え
  - [x] `GpuProfile` 構造体のフィールド変更 (`name`/`driver` → `architecture`/`description`)
  - [x] `detect_kind(vendor, architecture)` テーブル判定関数を実装
  - [x] `query_browser_gpu_info()` を実装 (`architecture` 読み取り追加)
  - [x] `detect_kind_from_name()`, `detect_kind_from_browser_info()` を削除
  - [x] ユニットテスト追加
- [x] `src/workers/gpu.worker.ts` の `cacheGpuAdapterInfo()` を修正
  - [x] `architecture` フィールド追加
  - [x] `type`/`driver` フィールド削除
  - [x] `GPUAdapterInfoExtended` インターフェース削除
- [x] `src/test/integration/gpu-profile.test.ts` を更新
  - [x] 新フィールドに合わせてアサーション修正
  - [x] `kind` が `Unknown` にならないことの検証追加
- [x] WASM リビルド (`pnpm build:wasm`)
- [x] Rust テスト (`cargo test --features gpu`)
- [ ] Vitest Browser Mode テスト (`pnpm exec vitest run --project integration -- gpu-profile`)
- [x] clippy (`cargo clippy --all-targets --features gpu -- -D warnings`)
- [x] lint (`pnpm lint`)
