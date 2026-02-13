# Criterion ベンチマーク導入仕様書

## 1. 概要

### 1.1 目的

Rust/WASM 計算エンジンの主要経路に対し、criterion によるパフォーマンス測定を導入する。スループット (単位時間当たりの処理件数) を定量的に計測し、性能改善の基準値を確立する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| criterion | Rust の統計ベースベンチマークフレームワーク |
| スループット | 単位時間当たりの処理件数 (items/sec) |
| ベンチマークグループ | 関連するベンチマークをまとめた単位 |
| ウォームアップ | 測定前の事前実行。キャッシュやブランチ予測を安定させる |
| サンプルサイズ | 統計的有意性を確保するための測定回数 |

### 1.3 背景・問題

| 項目 | 現状 |
|------|------|
| 性能測定 | 定量的な測定手段がない |
| 回帰検出 | 性能劣化を検出する仕組みがない |
| 最適化検証 | SIMD/GPU 最適化の効果を客観的に評価できない |

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 性能可視化 | 各経路のスループットを数値化 |
| 回帰検出 | ローカル実行で性能劣化を検出可能 |
| 最適化指針 | ボトルネック特定と改善効果の定量評価 |

### 1.5 着手条件

- 対象 6 経路の実装が完了していること
- Rust nightly toolchain が利用可能であること
- 計測環境: AMD Ryzen 9 9950X3D (16C/32T), 64GB RAM

---

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/Cargo.toml` | 変更 | criterion dev-dependency 追加 |
| `wasm-pkg/benches/mod.rs` | 新規 | ベンチマーク共通設定 |
| `wasm-pkg/benches/datetime_search.rs` | 新規 | `MtseedDatetimeSearcher`, `EggDatetimeSearcher` ベンチ |
| `wasm-pkg/benches/generator.rs` | 新規 | `PokemonGenerator`, `EggGenerator` ベンチ |
| `wasm-pkg/benches/mtseed_search.rs` | 新規 | `MtseedSearcher` ベンチ |
| `wasm-pkg/benches/gpu_datetime_search.rs` | 新規 | `GpuMtseedDatetimeSearcher` ベンチ |
| `.github/copilot-instructions.md` | 変更 | ベンチマーク実行コマンド追記 |

---

## 3. 設計方針

### 3.1 ベンチマーク対象

| 経路 | 構造体 | 測定対象 |
|------|--------|----------|
| MT Seed 起動時刻検索 (CPU) | `MtseedDatetimeSearcher` | `next_batch()` |
| MT Seed 起動時刻検索 (GPU) | `GpuMtseedDatetimeSearcher` | `next_batch()` |
| 孵化起動時刻検索 | `EggDatetimeSearcher` | `next_batch()` |
| ポケモン個体生成 | `PokemonGenerator` | Iterator 消費 |
| タマゴ個体生成 | `EggGenerator` | Iterator 消費 |
| MT Seed 全探索 | `MtseedSearcher` | `next_batch()` |

### 3.2 測定方式

| 項目 | 方針 |
|------|------|
| 測定指標 | スループット (elements/sec) |
| 統計処理 | criterion 標準 (平均・標準偏差・信頼区間) |
| 時間制限 | 全体 2 分以内 |
| 出力形式 | HTML レポート + コンソール出力 |

### 3.3 測定時間の配分

全体 2 分 (120 秒) を 6 経路に配分する。各経路 20 秒を目標とする。

| 経路 | ウォームアップ | 測定時間 | サンプル数 |
|------|---------------|---------|-----------|
| `MtseedDatetimeSearcher` | 1s | 5s | 20 |
| `GpuMtseedDatetimeSearcher` | 2s | 5s | 10 |
| `EggDatetimeSearcher` | 1s | 5s | 20 |
| `PokemonGenerator` | 1s | 5s | 50 |
| `EggGenerator` | 1s | 5s | 50 |
| `MtseedSearcher` | 1s | 5s | 20 |

サンプル数は計測環境 (Ryzen 9 9950X3D) での予備測定に基づき調整する。

### 3.4 GPU ベンチマークの考慮事項

| 項目 | 対応 |
|------|------|
| 非同期実行 | `pollster::block_on()` で同期化 |
| GPU 初期化 | ベンチマーク外で 1 回のみ実行 |
| フィーチャー分離 | `#[cfg(feature = "gpu")]` で GPU ベンチを分離 |
| 環境依存 | GPU 非対応環境ではスキップ |

### 3.5 ディレクトリ構成

```
wasm-pkg/
├── Cargo.toml
├── benches/
│   ├── datetime_search.rs      # CPU 起動時刻検索
│   ├── generator.rs            # 個体生成
│   ├── mtseed_search.rs        # MT Seed 全探索
│   └── gpu_datetime_search.rs  # GPU 起動時刻検索
└── src/
    └── ...
```

---

## 4. 実装仕様

### 4.1 Cargo.toml 追記

```toml
[dev-dependencies]
criterion = { version = "0.6", features = ["html_reports"] }
pollster = "0.4"

[[bench]]
name = "datetime_search"
harness = false

[[bench]]
name = "generator"
harness = false

[[bench]]
name = "mtseed_search"
harness = false

[[bench]]
name = "gpu_datetime_search"
harness = false
required-features = ["gpu"]
```

### 4.2 ベンチマーク実装例

#### 4.2.1 MtseedDatetimeSearcher

```rust
// benches/datetime_search.rs
use criterion::{criterion_group, criterion_main, Criterion, Throughput};
use wasm_pkg::datetime_search::{MtseedDatetimeSearcher, MtseedDatetimeSearchParams};
// ... 必要な型 import

fn bench_mtseed_datetime_search(c: &mut Criterion) {
    let mut group = c.benchmark_group("mtseed_datetime_search");
    group.warm_up_time(std::time::Duration::from_secs(1));
    group.measurement_time(std::time::Duration::from_secs(5));
    group.sample_size(20);

    let chunk_size = 10000_u32;
    group.throughput(Throughput::Elements(u64::from(chunk_size)));

    group.bench_function("next_batch", |b| {
        b.iter_batched(
            || create_mtseed_searcher(), // setup
            |mut searcher| searcher.next_batch(chunk_size), // routine
            criterion::BatchSize::SmallInput,
        );
    });

    group.finish();
}

fn create_mtseed_searcher() -> MtseedDatetimeSearcher {
    // テスト用パラメータで Searcher を生成
    // ...
}

criterion_group!(benches, bench_mtseed_datetime_search);
criterion_main!(benches);
```

#### 4.2.2 PokemonGenerator

```rust
// benches/generator.rs
use criterion::{criterion_group, criterion_main, Criterion, Throughput};
use wasm_pkg::generation::flows::generator::PokemonGenerator;
// ... 必要な型 import

fn bench_pokemon_generator(c: &mut Criterion) {
    let mut group = c.benchmark_group("pokemon_generator");
    group.warm_up_time(std::time::Duration::from_secs(1));
    group.measurement_time(std::time::Duration::from_secs(5));
    group.sample_size(50);

    let generate_count = 1000_u64;
    group.throughput(Throughput::Elements(generate_count));

    group.bench_function("generate_1000", |b| {
        b.iter_batched(
            || create_pokemon_generator(),
            |generator| {
                generator.take(generate_count as usize).for_each(drop);
            },
            criterion::BatchSize::SmallInput,
        );
    });

    group.finish();
}

criterion_group!(benches, bench_pokemon_generator);
criterion_main!(benches);
```

#### 4.2.3 GpuMtseedDatetimeSearcher

```rust
// benches/gpu_datetime_search.rs
#![cfg(feature = "gpu")]

use criterion::{criterion_group, criterion_main, Criterion, Throughput};
use wasm_pkg::gpu::context::GpuDeviceContext;
use wasm_pkg::gpu::datetime_search::GpuMtseedDatetimeSearcher;
// ...

fn bench_gpu_mtseed_datetime_search(c: &mut Criterion) {
    // GPU コンテキスト初期化 (ベンチマーク外)
    let ctx = pollster::block_on(async {
        GpuDeviceContext::new().await
    });

    let ctx = match ctx {
        Ok(ctx) => ctx,
        Err(e) => {
            eprintln!("GPU unavailable: {e}, skipping GPU benchmark");
            return;
        }
    };

    let mut group = c.benchmark_group("gpu_mtseed_datetime_search");
    group.warm_up_time(std::time::Duration::from_secs(2));
    group.measurement_time(std::time::Duration::from_secs(5));
    group.sample_size(10);

    let chunk_size = 100000_u32;
    group.throughput(Throughput::Elements(u64::from(chunk_size)));

    group.bench_function("next_batch", |b| {
        b.iter_batched(
            || create_gpu_searcher(&ctx),
            |mut searcher| {
                pollster::block_on(searcher.next_batch(chunk_size))
            },
            criterion::BatchSize::SmallInput,
        );
    });

    group.finish();
}

criterion_group!(benches, bench_gpu_mtseed_datetime_search);
criterion_main!(benches);
```

### 4.3 実行コマンド

```powershell
# 全ベンチマーク実行
cargo bench --package wasm-pkg

# 特定ベンチマークのみ
cargo bench --package wasm-pkg --bench datetime_search
cargo bench --package wasm-pkg --bench generator
cargo bench --package wasm-pkg --bench mtseed_search

# GPU ベンチマーク (feature 指定)
cargo bench --package wasm-pkg --bench gpu_datetime_search --features gpu

# レポート出力先
# target/criterion/{group_name}/report/index.html
```

---

## 5. テスト方針

| テスト種別 | 内容 |
|-----------|------|
| コンパイル確認 | `cargo build --benches` でビルド成功 |
| 実行確認 | `cargo bench` で全ベンチマークが完了 |
| 時間制限 | 全体 2 分以内に完了 |
| レポート生成 | HTML レポートが正常に生成される |

### 5.1 事前確認項目

- [ ] `MtseedDatetimeSearcher` が正常に動作する
- [ ] `EggDatetimeSearcher` が正常に動作する
- [ ] `PokemonGenerator` が正常に動作する
- [ ] `EggGenerator` が正常に動作する
- [ ] `MtseedSearcher` が正常に動作する
- [ ] `GpuMtseedDatetimeSearcher` が正常に動作する (GPU 環境)

---

## 6. 実装チェックリスト

### 6.1 環境構築

- [ ] `Cargo.toml` に criterion 依存追加
- [ ] `[[bench]]` セクション追加 (4 ファイル分)
- [ ] `benches/` ディレクトリ作成

### 6.2 ベンチマーク実装

- [ ] `benches/datetime_search.rs` 作成
  - [ ] `MtseedDatetimeSearcher::next_batch()` ベンチ
  - [ ] `EggDatetimeSearcher::next_batch()` ベンチ
- [ ] `benches/generator.rs` 作成
  - [ ] `PokemonGenerator` Iterator ベンチ
  - [ ] `EggGenerator` Iterator ベンチ
- [ ] `benches/mtseed_search.rs` 作成
  - [ ] `MtseedSearcher::next_batch()` ベンチ
- [ ] `benches/gpu_datetime_search.rs` 作成
  - [ ] `GpuMtseedDatetimeSearcher::next_batch()` ベンチ
  - [ ] GPU 非対応環境でのスキップ処理

### 6.3 ドキュメント

- [ ] `copilot-instructions.md` にベンチマーク実行コマンド追記

### 6.4 動作確認

- [ ] `cargo bench` で全ベンチマーク完了
- [ ] 全体実行時間 2 分以内
- [ ] HTML レポート生成確認

---

## 7. 補足

### 7.1 CI での扱い

本ベンチマークは CI 環境では実行しない。理由:

- CI 環境の性能は不安定
- GPU 環境の再現が困難
- 実行時間が長い

ローカル開発環境での性能確認・回帰検出を目的とする。

### 7.2 レポートの活用

criterion は `target/criterion/` に HTML レポートを生成する。前回実行との比較が可能で、性能回帰の検出に活用できる。

```powershell
# レポートをブラウザで開く
Start-Process "target/criterion/report/index.html"
```

### 7.3 参考リソース

- [criterion.rs 公式ドキュメント](https://bheisler.github.io/criterion.rs/book/)
- [Rust Performance Book](https://nnethercote.github.io/perf-book/)
