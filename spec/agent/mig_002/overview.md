# WASM API 仕様書: 概要

Phase 1 タスク P1-4, P1-5 に対応する WASM API 設計仕様の概要。

## 1. 設計原則

1. **単方向データフロー**: Request → WASM → Response
2. **自己完結性**: WASM側で全計算を完結
3. **型安全性**: wasm-bindgen による型生成
4. **ストリーミング対応**: イテレータパターンによる分割処理
5. **CPU/GPU経路分離**: 明示的な経路選択
6. **Seed 型安全性**: NewType パターンによる LcgSeed/MtSeed の区別

## 2. 技術スタック

| 項目 | 採用技術 |
|-----|---------|
| Rust Edition | 2024 |
| Rust → WASM | wasm-bindgen |
| 型共有 | tsify + serde + serde-wasm-bindgen |
| SIMD | wasm-pack --enable-simd |
| GPU | wgpu (WebGPU) |

## 3. 型定義方針

- **Single Source of Truth**: Rust 側の型定義が唯一の真実のソース
- **TypeScript 型自動生成**: tsify により `.d.ts` を自動生成
- **TypeScript 側では `type` のみ使用**: `interface` は使用しない（mig_001 方針に準拠）

## 4. Cargo.toml 設定

```toml
[package]
name = "wasm-pkg"
version = "0.1.0"
edition = "2024"

[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-O3", "--enable-simd", "--enable-bulk-memory", "--enable-nontrapping-float-to-int"]

[lib]
crate-type = ["cdylib"]

[features]
default = ["cpu", "gpu"]
cpu = []
gpu = ["wgpu"]

# Feature Flags 詳細 → spec/architecture/rust-structure.md

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
web-sys = { version = "0.3", features = ["console"] }
tsify = { version = "0.5.6", default-features = false, features = ["js"] }
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"
wgpu = { version = "24", optional = true }

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
incremental = false
opt-level = 3
lto = "fat"
codegen-units = 1
panic = "abort"
strip = true
```

## 5. パフォーマンス最適化

### 5.1 wasm-opt 設定

```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-O3", "--enable-simd", "--enable-bulk-memory"]
```

### 5.2 Release プロファイル

```toml
[profile.release]
lto = "fat"
codegen-units = 1
opt-level = 3
panic = "abort"
strip = true
```

## 6. ファイル構成

Rust/WASM ディレクトリ構成の詳細は下記を参照:

→ [spec/architecture/rust-structure.md](../../architecture/rust-structure.md)

## 7. モジュール依存関係

### 7.1 Seed 型階層

```
LcgSeed (u64 NewType)        MtSeed (u32 NewType)
    ↑                            ↑
    │                            │
HashValues.to_lcg_seed()         │
    (sha1.md)                    │
                                 │
LcgSeed.derive_mt_seed() ────────┘
    (types.md)
```

### 7.2 責務分離

| モジュール | 責務 |
|-----------|------|
| core/lcg.md | Lcg64 PRNG (状態管理、純関数計算、針方向計算) |
| core/mt.md | Mt19937 PRNG (状態管理、乱数生成) |
| core/sha1.md | SHA-1 ハッシュ + BCD + HashValues → LcgSeed/MtSeed |
| common/types.md | 型定義 + LcgSeed.derive_mt_seed() |
| generation/algorithm/iv-inheritance.md | IV 生成、遺伝処理、IV コードエンコード |
| generation/algorithm/needle.md | 連続針計算、パターン検索、逆算 |

### 7.3 データフロー

```
┌──────────────────────────────────────────────────────────────────────┐
│ common/types.md                                                       │
│  共通型: LcgSeed, MtSeed, IvSet, NeedleDirection, Nature, etc         │
└──────────────────────────────┬───────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                 ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│ core/sha1.md │  │ generation/  │  │ generation/      │
│              │  │ egg.md       │  │ pokemon.md       │
│ BCD+SHA-1    │  │              │  │                  │
│ →LcgSeed     │  │ LCG→孵化個体 │  │ Seed→Pokemon列  │
└──────┬───────┘  └──────┬───────┘  └──────────────────┘
       │                 │
       ↓                 │
┌─────────────────────┐  │
│ datetime-search/    │  │
│ base.md (共通基盤)   │  │
│                     │  │
│ HashValuesEnumerator│  │
│ RangedTimeCodeTable │  │
└──────────┬──────────┘  │
           │             │
     ┌─────┴─────┐       │
     ↓           ↓       ↓
┌────────────┐ ┌─────────────────────────┐
│ datetime-  │ │ datetime-search/egg.md  │
│ search/    │ │                         │
│ mtseed.md  │ │ base.md + generation/   │
│            │ │ egg.md を合成           │
│ MT Seed    │ │ → 孵化起動時刻検索       │
│ 照合検索   │ └─────────────────────────┘
└────────────┘
```

## 8. ドキュメント構成

```
mig_002/
├── overview.md                 # 本ドキュメント
├── common/                     # 共通基盤
│   └── types.md                # 共通型定義 + Seed 変換メソッド
├── core/                       # 計算コア (PRNG, Hash)
│   ├── lcg.md                  # 64bit LCG PRNG
│   ├── mt.md                   # MT19937 PRNG
│   └── sha1.md                 # SHA-1 ハッシュ + BCD + HashValues→Seed
├── generation/                 # 個体生成
│   ├── pokemon.md              # 野生個体生成 (Seed → Pokemon列)
│   ├── egg.md                  # 孵化個体生成 (LCG Seed → EggIndividual)
│   └── algorithm/
│       ├── iv-inheritance.md   # IV 生成・遺伝処理
│       └── needle.md           # 連続針計算・パターン検索
├── datetime-search/            # 起動時刻検索
│   ├── base.md                 # 共通基盤 (HashValuesEnumerator)
│   ├── mtseed.md               # MT Seed 起動時刻検索
│   ├── egg.md                  # 孵化起動時刻検索
│   ├── worker-interface.md     # Worker ↔ WASM インタフェース
│   └── gpu-kernel.md           # GPU カーネル設計
├── seed-search/                # Seed 逆算
│   └── mtseed.md               # MTSeed 逆算 (観測値 → MTSeed候補)
├── misc/                       # その他ユーティリティ
│   └── needle-search.md        # レポート針検索 (針パターン → 消費位置)
└── gpu/
    ├── api.md                  # GPU API (wgpu/WebGPU)
    └── device-context.md       # GPU 汎用基盤 (デバイスコンテキスト・制限値)
```

### ドキュメント一覧

| パス | 内容 |
|------|------|
| [common/types.md](./common/types.md) | 共通型定義 + LcgSeed.derive_mt_seed() |
| [core/lcg.md](./core/lcg.md) | 64bit LCG PRNG + Lcg64::calc_needle_direction() |
| [core/mt.md](./core/mt.md) | MT19937 PRNG |
| [core/sha1.md](./core/sha1.md) | SHA-1 ハッシュ + BCD + HashValues.to_lcg_seed()/to_mt_seed() |
| [generation/algorithm/iv-inheritance.md](./generation/algorithm/iv-inheritance.md) | IV 生成・遺伝処理、IV コードエンコード |
| [generation/algorithm/needle.md](./generation/algorithm/needle.md) | 連続針計算、パターン検索、逆算 |
| [datetime-search/base.md](./datetime-search/base.md) | 起動時刻検索 共通基盤 |
| [datetime-search/mtseed.md](./datetime-search/mtseed.md) | MT Seed 起動時刻検索 |
| [datetime-search/egg.md](./datetime-search/egg.md) | 孵化起動時刻検索 |
| [generation/pokemon.md](./generation/pokemon.md) | 野生個体生成 |
| [generation/egg.md](./generation/egg.md) | 孵化個体生成 |
| [seed-search/mtseed.md](./seed-search/mtseed.md) | MTSeed 逆算検索 |
| [misc/needle-search.md](./misc/needle-search.md) | レポート針検索 |
| [gpu/api.md](./gpu/api.md) | GPU API |
| [gpu/device-context.md](./gpu/device-context.md) | GPU 汎用基盤 |
| [datetime-search/worker-interface.md](./datetime-search/worker-interface.md) | Worker ↔ WASM インタフェース |
| [datetime-search/gpu-kernel.md](./datetime-search/gpu-kernel.md) | 起動時刻検索 GPU カーネル |

## 9. 関連ドキュメント

- [mig_001: Worker アーキテクチャ設計](../mig_001/worker-architecture.md)
