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

## 4. 依存関係

主要な依存クレート:

| クレート | 用途 |
|---------|------|
| wasm-bindgen | Rust ↔ JavaScript FFI |
| tsify | Rust型 → TypeScript型定義生成 |
| serde + serde-wasm-bindgen | シリアライゼーション |
| wgpu | WebGPU (GPU計算、optional) |

## 5. ビルド設定

- **crate-type**: `["cdylib", "rlib"]` (WASM + Rustライブラリ)
- **最適化**: LTO有効、SIMD有効化
- **詳細**: 実際のCargo.toml設定と [spec/architecture/rust-structure.md](../../architecture/rust-structure.md) を参照

## 6. ファイル構成

Rust/WASM ディレクトリ構成の詳細は下記を参照:

→ [spec/architecture/rust-structure.md](../../architecture/rust-structure.md)

### 6.1 仕様書構造と実装構造の関係

**重要**: 本仕様書のディレクトリ構造は論理的な機能グループを示すものであり、実際の Rust コードのモジュール配置とは必ずしも1:1対応しない。

| 項目 | 説明 |
|------|------|
| **仕様書** | 機能・責務による論理的グループ (`core/`, `generation/`, `datetime-search/` 等) |
| **実装** | Rust のモジュールシステム・依存関係に基づく配置 (`wasm-pkg/src/` 配下) |

**例**:
- 仕様書: `core/lcg.md`, `core/mt.md`, `core/sha1.md`
- 実装: `wasm-pkg/src/core.rs` に統合、または `wasm-pkg/src/core/` 配下に分割

実装時のモジュール配置は以下を優先:
1. Rust のモジュールシステムの慣習
2. 循環依存の回避
3. ビルド効率とコンパイル時間

詳細な実装ディレクトリ構造は [spec/architecture/rust-structure.md](../../architecture/rust-structure.md) を参照。

### 6.2 複数セッション開発における注意点

本プロジェクトは複数セッションにわたってコーディングエージェントが実装を行うことを想定している。

各セッションの開始時に以下を確認すること:
1. **最新の実装状況**: `wasm-pkg/src/` 配下の既存コードを確認
2. **実装済みモジュール**: どの仕様書が既に実装されているか
3. **依存関係**: 実装予定のモジュールが依存する機能が完成しているか

推奨実装順序については [7.4 実装順序](#74-実装順序) を参照。

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
┌──────────────────────────────────────────────────────────┐
│ common/types.md                                          │
│  LcgSeed, MtSeed, IvSet, Nature 等の共通型              │
└────────────────┬─────────────────────────────────────────┘
                 │
       ┌─────────┼──────────┐
       ↓         ↓          ↓
  ┌────────┐ ┌────────┐ ┌─────────────┐
  │ core/  │ │ core/  │ │ core/       │
  │ lcg.md │ │ mt.md  │ │ sha1.md     │
  │        │ │        │ │ BCD+SHA-1   │
  │ LCG    │ │ MT     │ │ →LcgSeed    │
  │ PRNG   │ │ PRNG   │ └──┬──────────┘
  └────┬───┘ └───┬────┘    │
       │         │         │
       └─────────┼─────────┘
                 │
       ┌─────────┼──────────────┐
       ↓         ↓              ↓
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │datetime- │ │generation│ │seed-     │
  │search/   │ │/flows/   │ │search/   │
  │base.md   │ │*.md      │ │*.md      │
  │          │ │          │ │          │
  │起動時刻  │ │個体生成  │ │Seed逆算  │
  │列挙基盤  │ │フロー    │ └──────────┘
  └────┬─────┘ └──────────┘
       │
  ┌────┴─────┐
  ↓          ↓
┌────────┐ ┌────────┐
│datetime│ │datetime│
│-search/│ │-search/│
│mtseed  │ │egg.md  │
│.md     │ │        │
└────────┘ └────────┘
```

### 7.4 実装順序

複数セッション開発を考慮した推奨実装順序:

**Phase 1: 基礎層** (依存なし・テスト容易)
1. `common/types.md` → 型定義 (全モジュールの基盤)
2. `core/lcg.md` → LCG 実装
3. `core/mt.md` → MT19937 実装

**Phase 2: コア計算層**
4. `core/sha1.md` → SHA-1 実装
5. `datetime-search/base.md` → 日時列挙基盤

**Phase 3: 検索機能層**
6. `datetime-search/mtseed.md` → MT Seed 起動時刻検索
7. `datetime-search/egg.md` → タマゴ初期 seed 検索

**Phase 4: 個体生成層**
8. `generation/algorithm/` → 個体生成アルゴリズム群
9. `generation/flows/` → フロー統合
10. `generation/data-structures.md`, `resolution.md`

**Phase 5: 高度な機能**
11. `misc/needle-search.md` → 針検索
12. `seed-search/mtseed.md` → Seed逆算

**Phase 6: GPU (任意)**
13. `gpu/` → WebGPU対応

Phase 1-2 は並行開発可能。Phase 3 完了でエンドツーエンドの日時検索機能が動作する。

## 8. ドキュメント構成

```
mig_002/
├── overview.md                      # 本ドキュメント
├── common/
│   └── types.md                     # 共通型定義 + Seed 変換メソッド
├── core/
│   ├── lcg.md                       # 64bit LCG PRNG
│   ├── mt.md                        # MT19937 PRNG
│   └── sha1.md                      # SHA-1 ハッシュ + BCD + HashValues→Seed
├── generation/
│   ├── README.md                    # 個体生成機能の概要
│   ├── data-structures.md           # 個体生成の入出力型定義
│   ├── resolution.md                # 個体生成解決ロジック
│   ├── worker-interface.md          # Worker ↔ WASM インタフェース
│   ├── algorithm/
│   │   ├── encounter.md             # エンカウント判定
│   │   ├── game-offset.md           # ゲームバージョン別オフセット
│   │   ├── iv-inheritance.md        # IV 生成・遺伝処理
│   │   ├── nature-sync.md           # 性格シンクロ判定
│   │   ├── needle.md                # 連続針計算・パターン検索
│   │   └── pid-shiny.md             # PID生成・色違い判定
│   └── flows/
│       ├── egg.md                   # 孵化個体生成フロー
│       ├── pokemon-static.md        # 固定シンボル生成フロー
│       └── pokemon-wild.md          # 野生個体生成フロー
├── datetime-search/
│   ├── base.md                      # 共通基盤 (HashValuesEnumerator)
│   ├── mtseed.md                    # MT Seed 起動時刻検索
│   ├── egg.md                       # 孵化起動時刻検索
│   ├── worker-interface.md          # Worker ↔ WASM インタフェース
│   └── gpu-kernel.md                # GPU カーネル設計
├── seed-search/
│   └── mtseed.md                    # MTSeed 逆算 (観測値 → MTSeed候補)
├── misc/
│   └── needle-search.md             # レポート針検索 (針パターン → 消費位置)
└── gpu/
    ├── api.md                       # GPU API (wgpu/WebGPU)
    └── device-context.md            # GPU 汎用基盤 (デバイスコンテキスト・制限値)
```

### ドキュメント一覧

| パス | 内容 |
|------|------|
| [common/types.md](./common/types.md) | 共通型定義 + LcgSeed.derive_mt_seed() |
| [core/lcg.md](./core/lcg.md) | 64bit LCG PRNG + 針方向計算 |
| [core/mt.md](./core/mt.md) | MT19937 PRNG (スカラー版/SIMD版) |
| [core/sha1.md](./core/sha1.md) | SHA-1 ハッシュ + BCD + HashValues.to_lcg_seed()/to_mt_seed() |
| [generation/README.md](./generation/README.md) | 個体生成機能の概要 |
| [generation/data-structures.md](./generation/data-structures.md) | 個体生成の入出力型定義 |
| [generation/resolution.md](./generation/resolution.md) | 個体生成解決ロジック |
| [generation/worker-interface.md](./generation/worker-interface.md) | 個体生成 Worker インタフェース |
| [generation/algorithm/encounter.md](./generation/algorithm/encounter.md) | エンカウント判定ロジック |
| [generation/algorithm/game-offset.md](./generation/algorithm/game-offset.md) | ゲームバージョン別オフセット |
| [generation/algorithm/iv-inheritance.md](./generation/algorithm/iv-inheritance.md) | IV 生成・遺伝処理、IV コードエンコード |
| [generation/algorithm/nature-sync.md](./generation/algorithm/nature-sync.md) | 性格シンクロ判定 |
| [generation/algorithm/needle.md](./generation/algorithm/needle.md) | 連続針計算、パターン検索、逆算 |
| [generation/algorithm/pid-shiny.md](./generation/algorithm/pid-shiny.md) | PID生成・色違い判定 |
| [generation/flows/egg.md](./generation/flows/egg.md) | 孵化個体生成フロー |
| [generation/flows/pokemon-static.md](./generation/flows/pokemon-static.md) | 固定シンボル生成フロー |
| [generation/flows/pokemon-wild.md](./generation/flows/pokemon-wild.md) | 野生個体生成フロー |
| [datetime-search/base.md](./datetime-search/base.md) | 起動時刻検索 共通基盤 |
| [datetime-search/mtseed.md](./datetime-search/mtseed.md) | MT Seed 起動時刻検索 |
| [datetime-search/egg.md](./datetime-search/egg.md) | 孵化起動時刻検索 |
| [datetime-search/worker-interface.md](./datetime-search/worker-interface.md) | 起動時刻検索 Worker インタフェース |
| [datetime-search/gpu-kernel.md](./datetime-search/gpu-kernel.md) | 起動時刻検索 GPU カーネル |
| [seed-search/mtseed.md](./seed-search/mtseed.md) | MTSeed 逆算検索 |
| [misc/needle-search.md](./misc/needle-search.md) | レポート針検索 |
| [gpu/api.md](./gpu/api.md) | GPU API (wgpu/WebGPU) |
| [gpu/device-context.md](./gpu/device-context.md) | GPU 汎用基盤 |

## 9. 関連ドキュメント

- [mig_001: Worker アーキテクチャ設計](../mig_001/worker-architecture.md)
