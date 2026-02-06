# Rust (WASM) ディレクトリ構成

Rust/WASM パッケージ `wasm-pkg/` のディレクトリ構成を定義する。

## ディレクトリ構成

```
wasm-pkg/
├── Cargo.toml
├── rustfmt.toml
├── rust-toolchain.toml
├── src/
│   ├── lib.rs                      # エントリポイント (wasm-bindgen エクスポート集約)
│   │
│   ├── types/                      # 共通型定義 (tsify + serde による TS 型自動生成)
│   │   ├── mod.rs                  # re-export
│   │   ├── config.rs               # DS 設定、日時、ROM 情報
│   │   ├── filter.rs               # 検索フィルタ (IV, 性格, 色違い等)
│   │   ├── generation.rs           # 個体生成パラメータ、エンカウント情報
│   │   ├── keyinput.rs             # キー入力 (DsButton, KeySpec)
│   │   ├── needle.rs               # レポート針パターン
│   │   ├── pokemon.rs              # ポケモン基礎型 (IV, 性格, 性別等)
│   │   ├── search.rs               # 検索パラメータ・結果型
│   │   ├── seeds.rs                # Seed 型 (LcgSeed, MtSeed, SeedOrigin)
│   │   └── ui.rs                   # UI 表示用データ型 (UiPokemonData, UiEggData)
│   │
│   ├── core/                       # 計算コア (PRNG, Hash, ユーティリティ)
│   │   ├── mod.rs
│   │   ├── bcd.rs                  # BCD (Binary-Coded Decimal) 変換
│   │   ├── datetime_codes.rs       # 日時 → ハッシュ入力コード変換
│   │   ├── lcg.rs                  # Linear Congruential Generator
│   │   ├── needle.rs               # レポート針パターン計算
│   │   ├── offset.rs               # フレームオフセット計算
│   │   ├── seed_resolver.rs        # SeedSpec → SeedOrigin 解決
│   │   ├── mt/                     # Mersenne Twister (MT19937)
│   │   │   ├── mod.rs              # 共通インターフェース
│   │   │   ├── scalar.rs           # スカラー実装
│   │   │   └── simd.rs             # SIMD 実装
│   │   └── sha1/                   # SHA-1 ハッシュ
│   │       ├── mod.rs              # 共通インターフェース
│   │       ├── scalar.rs           # スカラー実装
│   │       ├── simd.rs             # SIMD 実装
│   │       ├── message.rs          # SHA-1 メッセージブロック構築
│   │       └── nazo.rs             # ナゾ値 (DS 固有パラメータ) 計算
│   │
│   ├── data/                       # 静的マスタデータ (自動生成)
│   │   ├── mod.rs                  # re-export
│   │   ├── abilities.rs            # 特性名テーブル
│   │   ├── items.rs                # アイテム名・持ち物テーブル
│   │   ├── names.rs                # 性格名・種族名テーブル
│   │   ├── species.rs              # 種族データ (種族値, タイプ等)
│   │   └── stats.rs                # ステータス計算
│   │
│   ├── generation/                 # 個体生成 (CPU)
│   │   ├── mod.rs                  # generate_pokemon_list, generate_egg_list エクスポート
│   │   ├── algorithm/              # 生成アルゴリズム部品
│   │   │   ├── mod.rs
│   │   │   ├── encounter.rs        # エンカウントスロット判定
│   │   │   ├── iv.rs               # 個体値生成
│   │   │   ├── nature.rs           # 性格決定
│   │   │   ├── npc.rs              # NPC 消費計算
│   │   │   └── pid.rs              # PID 生成
│   │   └── flows/                  # 生成フロー (エンカウント種別ごと)
│   │       ├── mod.rs
│   │       ├── egg.rs              # 卵生成フロー
│   │       ├── types.rs            # フロー共通型
│   │       ├── generator/          # ジェネレーター実装
│   │       │   ├── mod.rs
│   │       │   ├── egg.rs          # 卵ジェネレーター
│   │       │   └── pokemon.rs      # ポケモンジェネレーター
│   │       └── pokemon/            # エンカウント別ポケモン生成
│   │           ├── mod.rs
│   │           ├── normal.rs       # 通常エンカウント
│   │           ├── fishing.rs      # 釣り
│   │           ├── surfing.rs      # 波乗り
│   │           ├── phenomena.rs    # 揺れる草/砂煙/橋の影
│   │           └── static_encounter.rs  # 固定シンボル
│   │
│   ├── datetime_search/            # 起動時刻検索 (CPU)
│   │   ├── mod.rs                  # Searcher 公開、タスク生成関数
│   │   ├── base.rs                 # 共通検索ロジック
│   │   ├── egg.rs                  # EggDatetimeSearcher
│   │   ├── mtseed.rs              # MtseedDatetimeSearcher
│   │   └── trainer_info.rs         # TrainerInfoSearcher
│   │
│   ├── resolve/                    # 表示用データ解決
│   │   ├── mod.rs                  # resolve_pokemon_data_batch, resolve_egg_data_batch
│   │   ├── pokemon.rs             # GeneratedPokemonData → UiPokemonData
│   │   └── egg.rs                  # GeneratedEggData → UiEggData
│   │
│   ├── misc/                       # その他検索
│   │   ├── mod.rs
│   │   ├── mtseed_search.rs       # MtseedSearcher (IV 全探索)
│   │   └── needle_search.rs       # レポート針パターン検索
│   │
│   └── gpu/                        # GPU 計算 (datetime_search の GPU 経路)
│       ├── mod.rs                  # feature gate、公開 API
│       ├── context.rs              # wgpu デバイスコンテキスト管理
│       ├── limits.rs               # GPU リソース制限値
│       ├── profile.rs              # デバイスプロファイリング
│       └── datetime_search/        # 起動時刻検索 (GPU)
│           ├── mod.rs
│           ├── iterator.rs         # GpuDatetimeSearchIterator (AsyncIterator パターン)
│           ├── pipeline.rs         # Compute Pipeline 構築
│           └── shader.wgsl         # WGSL シェーダー
│
├── benches/                        # ベンチマーク
│   ├── datetime_search.rs
│   ├── generator.rs
│   ├── mtseed_search.rs
│   └── gpu_datetime_search.rs      # (gpu feature 必須)
│
├── tests/                          # 統合テスト
│   └── resolve_integration.rs
│
└── pkg/                            # wasm-pack 出力 (生成物、Git 管理外)
    ├── wasm_pkg.js
    ├── wasm_pkg.d.ts
    └── wasm_pkg_bg.wasm
```

## モジュール責務

| モジュール | 責務 |
|-----------|------|
| `lib.rs` | `#[wasm_bindgen]` エクスポート集約、モジュール宣言 |
| `types/` | tsify + serde による共通型定義。TypeScript 型の自動生成元 |
| `core/` | PRNG (MT, LCG)、SHA-1 ハッシュ、日時コード変換等の計算コア |
| `data/` | 静的マスタデータ (種族値、特性名、アイテム名等)。`scripts/generate-species-data.js` で自動生成 |
| `generation/` | Seed からポケモン/卵の個体データを生成 (CPU) |
| `datetime_search/` | 起動時刻検索 (CPU 経路)。Searcher 構造体 + タスク生成関数 |
| `resolve/` | 生成データ → UI 表示用データへの変換。`data/` の静的データを参照 |
| `misc/` | MtSeed IV 全探索、レポート針パターン検索 |
| `gpu/` | datetime_search の GPU 経路 (WebGPU / wgpu) |

### `core/` サブモジュール

| サブモジュール | 責務 |
|---------------|------|
| `mt/` | Mersenne Twister (MT19937)。scalar/simd 実装を提供 |
| `sha1/` | SHA-1 ハッシュ。scalar/simd 実装 + メッセージ構築 + ナゾ値計算 |
| `lcg.rs` | Linear Congruential Generator |
| `bcd.rs` | BCD (Binary-Coded Decimal) 変換 |
| `datetime_codes.rs` | 日時情報 → SHA-1 ハッシュ入力コードへの変換 |
| `needle.rs` | レポート針パターン計算ロジック |
| `offset.rs` | フレームオフセット計算 |
| `seed_resolver.rs` | `SeedSpec` → `SeedOrigin[]` 解決 |

`mt/` および `sha1/` は scalar/simd の2実装を持ち、共通インターフェースを `mod.rs` で提供する。

### `generation/` サブモジュール

| サブモジュール | 責務 |
|---------------|------|
| `algorithm/` | 個体生成アルゴリズム部品 (IV, 性格, PID, エンカウントスロット, NPC 消費) |
| `flows/` | エンカウント種別ごとの生成フロー (通常, 釣り, 波乗り, 揺れる草, 固定シンボル, 卵) |
| `flows/generator/` | ポケモン/卵ジェネレーター |

### `gpu/` サブモジュール

| サブモジュール | 責務 |
|---------------|------|
| `context.rs` | wgpu デバイス初期化・共通リソース管理 |
| `limits.rs` | GPU リソース制限値の管理 |
| `profile.rs` | デバイス性能プロファイリング |
| `datetime_search/` | 起動時刻検索の GPU 実装 (Iterator, Pipeline, Shader) |

## 依存関係

```
types/
  ↑
  ├── core/
  │     ↑
  │     ├── data/
  │     │     ↑
  │     │     └── resolve/
  │     │
  │     ├── generation/
  │     ├── datetime_search/
  │     ├── misc/
  │     └── gpu/
  │
  └── lib.rs (エクスポート集約)
```

- `types/` は他モジュールに依存しない
- `core/` は `types/` のみに依存
- `data/` は `types/` に依存 (種族値等の型を使用)
- `resolve/` は `data/` + `types/` に依存 (ID → 名前解決等)
- 機能モジュール (`generation/`, `datetime_search/`, `misc/`) は `types/` と `core/` に依存
- `gpu/` は `types/` + `core/` に依存 (`gpu` feature gate で条件付きコンパイル)

## Feature Flags

| Feature | 説明 | 依存 crate |
|---------|------|-----------|
| `console_error_panic_hook` | パニック時のコンソールエラー出力 (default) | `console_error_panic_hook` |
| `gpu` | GPU 計算経路 (WebGPU) | `wgpu`, `web-sys`, `bytemuck`, `futures-channel`, `js-sys` |

```toml
[features]
default = ["console_error_panic_hook"]
gpu = ["dep:wgpu", "dep:web-sys", "dep:bytemuck", "dep:futures-channel", "dep:js-sys"]
```

CPU 経路 (SIMD) は Rust nightly の `#![feature(portable_simd)]` で常時有効。feature flag による切り替えではない。

GPU 非対応環境では、フロントエンド側で `navigator.gpu` の有無を判定し CPU 経路へフォールバックする。

## 命名規則

| 対象 | 規則 | 例 |
|-----|------|-----|
| ディレクトリ | snake_case | `datetime_search/` |
| ファイル | snake_case | `seed_resolver.rs` |
| モジュール | snake_case | `mod datetime_search` |
| 構造体 | PascalCase | `EggDatetimeSearcher` |
| 関数 | snake_case | `generate_pokemon_list` |
| 定数 | SCREAMING_SNAKE_CASE | `IV_VALUE_UNKNOWN` |

## 関連ドキュメント

- [Worker 設計](./worker-design.md) — WASM API のフロントエンド呼び出し設計
- [フロントエンド構成](./frontend-structure.md) — TypeScript 型のインポート方針
