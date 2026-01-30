# Rust (WASM) ディレクトリ構成

Rust/WASM パッケージ `wasm-pkg/` のディレクトリ構成を定義する。

## ディレクトリ構成

```
wasm-pkg/
├── Cargo.toml
├── rustfmt.toml
├── src/
│   ├── lib.rs              # エントリポイント (wasm-bindgen エクスポート)
│   ├── types/              # 共通型定義 (tsify による TS 型生成)
│   │   └── mod.rs
│   ├── core/               # 計算コア (PRNG, Hash)
│   │   ├── mod.rs
│   │   ├── mt/             # Mersenne Twister
│   │   │   ├── mod.rs      # 共通インターフェース
│   │   │   ├── scalar.rs   # スカラー実装
│   │   │   └── simd.rs     # SIMD実装
│   │   ├── sha1/           # SHA-1 ハッシュ
│   │   │   ├── mod.rs      # 共通インターフェース
│   │   │   ├── scalar.rs   # スカラー実装
│   │   │   └── simd.rs     # SIMD実装
│   │   ├── lcg.rs          # Linear Congruential Generator
│   │   └── bcd.rs          # BCD 変換
│   ├── generation/         # 個体生成 (CPU のみ)
│   │   └── mod.rs
│   ├── datetime_search/    # 起動時刻検索 (CPU)
│   │   └── mod.rs
│   ├── mtseed_search/      # MTSeed 検索 (CPU)
│   │   └── mod.rs
│   └── gpu/                # GPU 計算 (datetime_search, mtseed_search の GPU 経路)
│       ├── mod.rs
│       ├── context.rs      # デバイスコンテキスト管理
│       ├── datetime_search.rs
│       └── mtseed_search.rs
├── tests/                  # 統合テスト
└── pkg/                    # wasm-pack 出力 (生成物、Git 管理外)
    ├── wasm_pkg.js
    ├── wasm_pkg.d.ts
    └── wasm_pkg_bg.wasm
```

## モジュール責務

| モジュール | 責務 |
|-----------|------|
| `lib.rs` | wasm-bindgen エクスポート、モジュール宣言 |
| `types/` | tsify による共通型定義。TypeScript 側との型共有 |
| `core/` | PRNG (MT, LCG)、SHA-1 ハッシュ等の計算コア |
| `generation/` | Seed から Pokemon/Egg 個体を生成 (CPU のみ) |
| `datetime_search/` | 起動時刻検索 (CPU 経路) |
| `mtseed_search/` | MTSeed 逆算検索 (CPU 経路) |
| `gpu/` | datetime_search / mtseed_search の GPU 経路 |

### `core/` サブモジュール

| サブモジュール | 責務 |
|---------------|------|
| `mt/` | Mersenne Twister (MT19937)。scalar/simd 実装を提供 |
| `sha1/` | SHA-1 ハッシュ。scalar/simd 実装を提供 |
| `lcg.rs` | Linear Congruential Generator |
| `bcd.rs` | BCD (Binary-Coded Decimal) 変換 |

`mt/` および `sha1/` は scalar/simd の2実装を持ち、共通インターフェースを `mod.rs` で提供する。
各実装の詳細仕様は別途ドキュメント化する。

### `gpu/` サブモジュール

| サブモジュール | 責務 |
|---------------|------|
| `context.rs` | wgpu デバイス初期化・共通リソース管理 |
| `datetime_search.rs` | 起動時刻検索の GPU 実装 |
| `mtseed_search.rs` | MTSeed 検索の GPU 実装 |

## 依存関係

```
types/
  ↑
  ├── core/
  │     ↑
  │     ├── generation/
  │     ├── datetime_search/
  │     ├── mtseed_search/
  │     └── gpu/
```

- `types/` は他モジュールに依存しない
- `core/` は `types/` のみに依存
- 機能モジュールは `types/` と `core/` に依存

## Feature Flags

| Feature | 説明 |
|---------|------|
| `cpu` | CPU 計算経路 (SIMD) |
| `gpu` | GPU 計算経路 (`wgpu` 依存) |

両経路をデフォルトで有効化:

```toml
[features]
default = ["cpu", "gpu"]
cpu = []
gpu = ["wgpu"]
```

GPU 非対応環境では実行時に `is_webgpu_available()` で判定し、CPU 経路へフォールバック。

## 命名規則

| 対象 | 規則 | 例 |
|-----|------|-----|
| ディレクトリ | snake_case | `datetime_search/` |
| ファイル | snake_case | `hash_values.rs` |
| モジュール | snake_case | `mod datetime_search` |
| 構造体 | PascalCase | `Pokemon`, `EggIndividual` |
| 関数 | snake_case | `generate_pokemon` |
| 定数 | SCREAMING_SNAKE_CASE | `MAX_POKEMON_COUNT` |

## 関連ドキュメント

- [WASM API 仕様: 概要](../agent/mig_002/overview.md)
- [共通型定義](../agent/mig_002/common/types.md)
