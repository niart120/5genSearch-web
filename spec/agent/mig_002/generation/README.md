# 個体生成 (generation) 仕様書

LCG Seed からポケモン個体・孵化個体を生成する機能の仕様。

## 概要

### 責務

`generation/` モジュールは以下を担う:

- LCG Seed → Pokemon 個体生成
- LCG Seed → Egg 個体生成

Seed 検索 (datetime-search, mtseed-search) は別モジュールの責務。

### 計算フロー

```
LCG Seed (64-bit)
    │
    ├─→ [Pokemon] 乱数消費 → PID/性格/スロット等決定
    │         │
    │         └─→ MT Seed 導出 → IV 生成
    │
    └─→ [Egg] 乱数消費 → PID/性格/遺伝スロット決定
              │
              └─→ MT Seed 導出 → 乱数 IV 生成 → 遺伝適用
```

### core/lcg.rs との関係

```
core/lcg.rs
├── LCG パラメータ (mul: 0x5D588B656C078965, add: 0x269EC3)
├── next() - 状態遷移、上位32bit取得
├── advance(n) - n回ジャンプ (アフィン変換)
└── seed計算ユーティリティ

generation/
├── lcg.rs を使用した個体生成ロジック
├── PID/性格/色違い等のゲーム固有処理
└── エンカウント種別ごとのフロー制御
```

## ドキュメント構成

### 型定義・インタフェース

| ドキュメント | 内容 |
|-------------|------|
| [data-structures.md](./data-structures.md) | 入出力型定義 (Pokemon/Egg 共通・差分) |
| [resolution.md](./resolution.md) | 解決層設計 (WASM/Worker/Main 責務分担、UI表示データ階層) |
| [worker-interface.md](./worker-interface.md) | Worker ↔ WASM インタフェース (個体列挙 API) |

### アルゴリズム

| ドキュメント | 内容 |
|-------------|------|
| [algorithm/pid-shiny.md](./algorithm/pid-shiny.md) | PID 生成、ID 補正、色違い判定 |
| [algorithm/nature-sync.md](./algorithm/nature-sync.md) | 性格決定、シンクロ処理 |
| [algorithm/iv-inheritance.md](./algorithm/iv-inheritance.md) | IV 生成 (MT19937)、遺伝処理 |
| [algorithm/encounter-slots.md](./algorithm/encounter-slots.md) | エンカウントスロット決定 |

### 生成フロー

| ドキュメント | 内容 |
|-------------|------|
| [flows/pokemon-wild.md](./flows/pokemon-wild.md) | 野生ポケモン (草むら/なみのり/釣り/特殊) |
| [flows/pokemon-static.md](./flows/pokemon-static.md) | 固定シンボル/イベント/徘徊 |
| [flows/egg.md](./flows/egg.md) | 孵化個体 |

## 用語定義

| 用語 | 定義 |
|-----|------|
| LCG | Linear Congruential Generator (64-bit) |
| LCG Seed | LCG の状態値 (64-bit) |
| MT Seed | Mersenne Twister の初期化値 (32-bit)。LCG 1回消費後の上位32bit |
| PID | Personality ID (性格値)。32-bit |
| Advance | 乱数消費回数 |
| Game Offset | ゲーム起動条件による固定消費数 |
| User Offset | ユーザー指定の追加消費数 |

## 関連ドキュメント

- [WASM API 概要](../overview.md)
- [共通型定義](../common/types.md)
- [Rust 構成](../../architecture/rust-structure.md)
