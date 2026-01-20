# WASM API 仕様書: GPU API

WebGPU による GPU 計算経路。`gpu` feature で有効化。

## 1. 概要

GPU API は Phase 2 での実装を予定。本ドキュメントでは API 設計のみを定義する。

### 1.1 有効化

```toml
# Cargo.toml
[features]
default = ["cpu"]
cpu = []
gpu = ["wgpu"]

[dependencies]
wgpu = { version = "24", optional = true }
```

### 1.2 ビルドコマンド

```powershell
# CPU のみ
wasm-pack build --target web --release

# GPU 込み
wasm-pack build --target web --release --features gpu
```

## 2. WebGPU 可用性チェック

```rust
#[cfg(feature = "gpu")]
use wasm_bindgen::prelude::*;

/// WebGPU 可用性チェック
#[cfg(feature = "gpu")]
#[wasm_bindgen]
pub fn is_webgpu_available() -> bool {
    // navigator.gpu の存在確認
    let window = web_sys::window().expect("no window");
    let navigator = window.navigator();
    js_sys::Reflect::has(&navigator, &"gpu".into()).unwrap_or(false)
}

/// GPU 非対応ビルド用スタブ
#[cfg(not(feature = "gpu"))]
#[wasm_bindgen]
pub fn is_webgpu_available() -> bool {
    false
}
```

```typescript
import { is_webgpu_available } from '@wasm/wasm_pkg';

if (is_webgpu_available()) {
  // GPU 経路を使用
} else {
  // CPU 経路にフォールバック
}
```

## 3. GpuDeviceContext

GPU デバイスコンテキストの詳細定義は [device-context.md](./device-context.md) §3 を参照。

### 3.1 TypeScript 利用例

```typescript
import { GpuDeviceContext, is_webgpu_available, GpuProfile } from '@wasm/wasm_pkg';

async function initGpu(): Promise<GpuDeviceContext | null> {
  if (!is_webgpu_available()) {
    console.warn('WebGPU is not available');
    return null;
  }
  
  try {
    const profile = GpuProfile.fallback(); // または WebGL から検出
    const context = await GpuDeviceContext.new(profile);
    return context;
  } catch (e) {
    console.error('Failed to initialize GPU:', e);
    return null;
  }
}
```

## 4. GPU 検索 API

### 4.1 定義

```rust
#[cfg(feature = "gpu")]
#[wasm_bindgen]
impl GpuContext {
    /// GPU版検索（非同期）
    pub async fn search(&self, request: SearchRequest) -> Result<SearchBatch, String> {
        // GPU 計算シェーダー実行
        // ...
        Ok(SearchBatch {
            results: vec![],
            processed: 0,
            total: 0,
        })
    }

    /// GPU版バッチ検索
    pub async fn search_batch(
        &self,
        request: SearchRequest,
        batch_size: u32,
    ) -> Result<SearchBatch, String> {
        // バッチサイズ単位での GPU 計算
        // ...
        Ok(SearchBatch {
            results: vec![],
            processed: 0,
            total: 0,
        })
    }
}
```

### 4.2 CPU/GPU 経路選択

```typescript
// search-worker.ts
import {
  initWasm,
  SearchIterator,
  GpuContext,
  is_webgpu_available,
  type SearchRequest,
} from '@/lib/core/wasm-interface';

type ComputePath = 'cpu' | 'gpu';

async function search(
  request: SearchRequest,
  preferredPath: ComputePath = 'cpu',
): Promise<void> {
  await initWasm();
  
  if (preferredPath === 'gpu' && is_webgpu_available()) {
    // GPU 経路
    const gpu = await GpuContext.new();
    const batch = await gpu.search(request);
    self.postMessage({ type: 'RESULTS', payload: batch });
    self.postMessage({ type: 'COMPLETE', payload: { reason: 'exhausted' } });
  } else {
    // CPU 経路（イテレータ使用）
    const iterator = new SearchIterator(request);
    while (!iterator.is_finished) {
      const batch = iterator.next_batch(100);
      self.postMessage({ type: 'RESULTS', payload: batch });
    }
    self.postMessage({ type: 'COMPLETE', payload: { reason: 'exhausted' } });
  }
}
```

## 5. 実装ロードマップ

| Phase | 内容 | 状態 |
|-------|------|------|
| Phase 1 | API 設計・スタブ実装 | 本ドキュメント |
| Phase 2 | wgpu 計算シェーダー実装 | 未着手 |
| Phase 3 | パフォーマンス最適化 | 未着手 |

## 6. 注意事項

### 6.1 ブラウザ対応状況

| ブラウザ | WebGPU対応 |
|---------|-----------|
| Chrome 113+ | ✓ |
| Edge 113+ | ✓ |
| Firefox | Nightly のみ |
| Safari 17+ | ✓ (制限あり) |

### 6.2 フォールバック戦略

1. `is_webgpu_available()` で可用性チェック
2. GPU 初期化失敗時は CPU 経路にフォールバック
3. ユーザーに計算経路を明示的に選択させるUIも検討

## 7. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [device-context.md](./device-context.md) | GPU 詳細設計（デバイスコンテキスト・シェーダー・分割戦略） |
| [overview.md](../overview.md) | 概要、設計原則 |
| [worker-interface.md](../datetime-search/worker-interface.md) | Worker ↔ WASM インタフェース |
| [mtseed.md](../seed-search/mtseed.md) | MT Seed 検索 API |
