# GPU 検索スループット最適化 仕様書

## 1. 概要

### 1.1 目的

MtseedDatetime 検索の GPU パスにおけるスループット劣化を調査・改善する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| MtseedDatetime 検索 | 起動時刻候補に対して SHA-1 ハッシュを計算し、対象 MT Seed を探す処理 |
| ディスパッチ | GPU Compute Shader 1 回の実行単位 |
| staging buffer | GPU → CPU へ結果を読み出すための中間バッファ |
| `GpuDatetimeSearchIterator` | WASM 側の GPU 検索イテレータ。`next()` で 1 ディスパッチ分の結果を返す |

### 1.3 背景・問題

ブラウザでの GPU 検索スループットが期待値の約 25%。ネイティブ (Rust) ベンチマークでは性能劣化が再現しないため、WASM 側ではなく JS 側の制御フローに原因があると推定。

| 指標 | 値 |
|------|----|
| ブラウザ GPU スループット | 期待値の ~25% |
| ネイティブベンチマーク | 劣化なし |

### 1.4 期待効果

| 項目 | 現状 | 目標 |
|------|------|------|
| GPU パススループット | 期待値の ~25% | 期待値の ~80% 以上 |

### 1.5 着手条件

- CPU パス最適化 (local_076) の完了後に着手判断

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/workers/gpu.worker.ts` | 修正 | 進捗報告スロットリング (500ms 間引き)、`cacheGpuAdapterInfo()` 追加 |
| `wasm-pkg/src/gpu/datetime_search/shader.wgsl` | 修正 | `ITEMS_PER_THREAD` ループ追加 |
| `wasm-pkg/src/gpu/limits.rs` | 修正 | `items_per_thread` フィールド追加、GPU 種別依存値 |
| `wasm-pkg/src/gpu/datetime_search/pipeline.rs` | 修正 | `ITEMS_PER_THREAD` パイプライン定数注入、ワークグループ数計算修正 |
| `wasm-pkg/src/gpu/profile.rs` | 修正 | WASM 環境でブラウザ `GPUAdapterInfo` から GPU 種別を検出 |

## 3. 設計方針

### 3.1 要因分析

| # | 仮説 | 根拠 | 影響度 (推定) | 検証方法 |
|---|------|------|---------------|----------|
| G1 | 毎ディスパッチの進捗報告オーバーヘッド | `currentIterator.next()` 完了ごとに `postMessage` で進捗を送信。ディスパッチが高速に完了する場合、相対的なオーバーヘッドが大きい | 中 | 進捗報告をスロットリングして比較 |
| G2 | `.await` の JS マイクロタスク境界コスト | `wasm_bindgen_futures` による `.await` は JS Promise のマイクロタスクキューを経由する。GPU dispatch → staging buffer map → 結果読み出しの各段階で境界を越える | **高** | ネイティブ vs WASM のディスパッチ単体時間を計測 |
| G3 | ディスパッチ回数過多 | 100年分検索で ~189 回のディスパッチが発生。各 `dispatch().await` でブラウザ WebGPU `mapAsync` コールバック解決待ち (~30ms/回) が発生し、合計 ~5.7s のオーバーヘッド | **高** | 1 スレッドあたりの処理量を増やしてディスパッチ回数を削減 |
| G4 | staging buffer の `map_async` ポーリング | WASM 環境では `device.poll(Maintain::Poll)` 後に `rx.await` で完了を待つ。ポーリングの粒度が粗いと GPU → CPU 結果転送に遅延が生じる | 低〜中 | ポーリング間隔の調整 |
| G5 | 結果 `postMessage` の構造化クローン | `SeedOrigin[]` の構造化クローンコスト。通常はマッチ件数が少ないため影響は軽微 | 低 | Transferable objects の利用を検討 |

### 3.2 現在の GPU Worker ループ構造

```typescript
while (!cancelRequested && !currentIterator.is_done) {
  batch = await currentIterator.next();       // 1 dispatch + buffer read
  postResponse({ type: 'progress', ... });    // postMessage
  if (batch.results.length > 0) {
    postResponse({ type: 'result', ... });    // postMessage
  }
}
```

`currentIterator.next()` は Rust 内で `pipeline.dispatch(to_process, offset).await` を 1 回実行する。ディスパッチ → submit → staging map → read の全工程が完了するまでブロックし、その間 GPU は次のジョブを受け付けない。

GPU がアイドルになる区間:

1. `dispatch().await` の結果読み出し中 (CPU → GPU → CPU ラウンドトリップ)
2. JS 側での `postMessage` 送信中
3. 次の `next()` 呼び出しまでの JS マイクロタスク処理中

### 3.3 優先度と実施順序

1. G1: 進捗報告スロットリング (低リスク、CPU 側と同様の手法) → **実装済み**
2. G3: `ITEMS_PER_THREAD` によるディスパッチ回数削減 → **実装済み**
3. G2/G4: `.await` 境界コスト / ポーリング間隔 (G1/G3 の効果次第)

### 3.4 G3 の詳細: `ITEMS_PER_THREAD` によるディスパッチ回数削減

ネイティブ (criterion) ベンチマークでは `pollster::block_on` で同期的にポーリングし、`device.poll(Maintain::Wait)` で GPU 完了をブロッキング待機する。一方 WASM では各 `dispatch().await` が JS イベントループに yield し、ブラウザの WebGPU `mapAsync` コールバック解決待ち (~30ms/回) が発生する。

100年分検索のディスパッチ回数:
- 総処理数: 86400 × 36500 ≈ 3.15 × 10^9
- 1 ディスパッチ処理数: `workgroup_size × max_workgroups` = 256 × 65535 ≈ 16.7 × 10^6
- ディスパッチ回数: 3.15B / 16.7M ≈ **189 回**

各スレッドが `ITEMS_PER_THREAD` 個の SHA-1 をループ計算することで、実効的なディスパッチサイズを `× ITEMS_PER_THREAD` に拡大し、ディスパッチ回数を削減する。

| `ITEMS_PER_THREAD` | 実効バッチサイズ | ディスパッチ回数 | 推定非同期 OH |
|---|---|---|---|
| 1 (旧) | 16.7M | 189 | ~5.7s |
| **4 (Mobile)** | **67M** | **47** | **~1.4s** |
| **16 (Integrated)** | **268M** | **12** | **~0.36s** |
| **32 (Discrete)** | **537M** | **6** | **~0.18s** |

GPU watchdog timeout (~5s) を考慮し、GPU 種別ごとに値を調整:

| GPU 種別 | `items_per_thread` | ディスパッチ回数/100年 | 理由 |
|-----------|---|---|---|
| Discrete | 32 | ~6 | GPU watchdog に余裕あり |
| Integrated | 16 | ~12 | CPU 共有帯域を考慮 |
| Mobile / Unknown | 4 | ~94 | iOS watchdog (~2-3s) が厳しい |

## 4. 実装仕様

### 4.1 G1: 進捗報告スロットリング

`gpu.worker.ts` の `executeSearchLoop` で `PROGRESS_INTERVAL_MS = 500` の間引きを実装。CPU Worker (`search.worker.ts`) と同一パターン。

### 4.2 G3: `ITEMS_PER_THREAD` ループ

#### シェーダー変更 (`shader.wgsl`)

```wgsl
override ITEMS_PER_THREAD: u32 = 1u;

@compute @workgroup_size(WORKGROUP_SIZE)
fn sha1_generate(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let base_idx = global_id.x * ITEMS_PER_THREAD;
    for (var item_k = 0u; item_k < ITEMS_PER_THREAD; item_k = item_k + 1u) {
        let idx = base_idx + item_k;
        if (idx >= state.message_count) { return; }
        // SHA-1 計算 (既存ロジック)
    }
}
```

#### パイプライン変更 (`pipeline.rs`)

```rust
// パイプライン定数に ITEMS_PER_THREAD を追加
constants: &[
    (String::from("WORKGROUP_SIZE"), f64::from(limits.workgroup_size)),
    (String::from("ITEMS_PER_THREAD"), f64::from(limits.items_per_thread)),
]

// ディスパッチ時のワークグループ数計算
let threads_needed = count.div_ceil(self.limits.items_per_thread);
let workgroup_count = threads_needed.div_ceil(self.workgroup_size);
```

#### 制限値変更 (`limits.rs`)

```rust
pub struct SearchJobLimits {
    pub items_per_thread: u32,  // GPU 種別依存 (Discrete=32, Integrated=16, Mobile=4)
    pub max_messages_per_dispatch: u32,  // = workgroup_size * max_workgroups * items_per_thread
    // ...
}
```

### 4.3 GpuProfile WASM 環境検出修正

wgpu v24 の WebGPU バックエンド (`src/backend/webgpu.rs:1681`) は `DeviceType::Other` と空の `name` を常に返す。このため WASM 環境では `GpuProfile::detect()` が常に `GpuKind::Unknown` を返し、
`items_per_thread=4` が適用されディスクリート GPU の性能を活かせない。

#### 修正方針

1. **`gpu.worker.ts`**: `cacheGpuAdapterInfo()` で `navigator.gpu.requestAdapter()` を呼び、
   `adapter.info` のプロパティを `globalThis.__wgpu_browser_adapter_info` に保存
2. **`profile.rs`**: WASM 環境では `js_sys::Reflect` でグローバル変数を読み取り、
   GPU 種別を判定

#### フォールバックチェーン

| 優先度 | ソース | 対応ブラウザ |
|---------|--------|----------------|
| 1 | `GPUAdapterInfo.type` | Chrome/Edge (`"discrete GPU"` 等) |
| 2 | `GPUAdapterInfo.description` → 名前マッチ | Safari/Firefox |
| 3 | `GPUAdapterInfo.vendor` → 名前マッチ | 全ブラウザ |
| 4 | wgpu `AdapterInfo` | フォールバック |

`GPUAdapterInfo.type` は W3C WebGPU 仕様外で `@webgpu/types` v0.1.69 に未定義。
`GPUAdapterInfoExtended` インターフェースで optional に拡張。

`detect_kind_from_name()` はデバイス名から GPU 種別を推定:
- Discrete: GeForce, RTX, GTX, Quadro, Radeon, Arc A
- Integrated: Intel HD/UHD/Iris, Apple Silicon
- Mobile: Adreno, Mali, PowerVR

## 5. テスト方針

| テスト | 内容 | 場所 |
|--------|------|------|
| GPU 検索結果の正確性 | 既存の統合テストが通ることを確認 | `src/test/integration/` |
| GPU スロットリング動作 | キャンセルが効くことを確認 | 手動テスト |
| スループット計測 | 同一パラメータで GPU 検索し、スループットを比較 | ブラウザ DevTools + UI 表示 |

## 6. 実装チェックリスト

- [x] G1: `gpu.worker.ts` に進捗報告スロットリングを実装
- [x] G3: `shader.wgsl` に `ITEMS_PER_THREAD` ループを追加
- [x] G3: `limits.rs` に `items_per_thread` フィールドを追加 (GPU 種別依存)
- [x] G3: `pipeline.rs` に `ITEMS_PER_THREAD` パイプライン定数を注入
- [x] G3: `pipeline.rs` のワークグループ数計算を修正
- [x] `profile.rs`: WASM 環境でブラウザ GPUAdapterInfo から GPU 種別検出
- [x] `gpu.worker.ts`: `cacheGpuAdapterInfo()` でアダプター情報を事前設定
- [x] `cargo test --features gpu` / `cargo clippy --features gpu` パス
- [ ] ブラウザでの GPU スループット計測・比較
- [ ] 必要に応じて `ITEMS_PER_THREAD` 値の調整
