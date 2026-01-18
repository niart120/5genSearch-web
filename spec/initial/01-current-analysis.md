# 現行アーキテクチャ分析

元リポジトリ pokemon-gen5-initseed の構成を分析し、リアーキテクチャの起点とする。

## 1. 概要

BW/BW2向け初期Seed探索Webアプリケーション。Rust+WebAssemblyによるSIMD最適化検索とReact UIを組み合わせた構成。

## 2. 現行レイヤー構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Layer      │    │  Service Layer  │    │   Data Layer    │
│  (TypeScript)   │    │  (TypeScript)   │    │  (TypeScript)   │
│                 │    │                 │    │                 │
│ - React         │ ←→ │ - Result Parser │ ←→ │ - Species Data  │
│   Components    │    │ - Data Manager  │    │ - Encounter     │
│ - Form Handling │    │ - UI Controller │    │   Tables        │
│ - State Mgmt    │    │ - Export Logic  │    │ - Static Data   │
│   (Zustand)     │    │                 │    │   (JSON)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  WASM Layer     │
                    │     (Rust)      │
                    │                 │
                    │ - 64bit LCG     │
                    │ - Pokemon Gen   │
                    │ - Encounter     │
                    │   Calculation   │
                    │ - Raw Data Gen  │
                    └─────────────────┘
```

## 3. 主要機能

### 3.1 初期Seed探索 (Search)

- SHA-1ベースの初期Seed探索
- SIMD128対応による高速化
- WebGPU実験パス

### 3.2 乱数列生成 (Generation)

- 64bit LCGによる乱数列列挙
- エンカウントポケモン属性計算
  - PID (性格値)
  - 性格
  - 特性スロット
  - 色違い判定
  - シンクロ適用

### 3.3 MT Seed探索

- 32bit全探索
- 個体値逆算

## 4. 現行の責務分離

### WASM側 (wasm-pkg/src/)

| モジュール              | 責務                     |
| ----------------------- | ------------------------ |
| lib.rs                  | WASMエントリーポイント   |
| personality_rng.rs      | 性格値乱数列エンジン     |
| encounter_calculator.rs | エンカウントスロット計算 |
| pokemon_generator.rs    | メイン生成エンジン       |
| pokemon_data.rs         | データ構造定義           |

### TypeScript側

| ディレクトリ        | 責務                 |
| ------------------- | -------------------- |
| src/components/     | Reactコンポーネント  |
| src/store/          | Zustand状態管理      |
| src/lib/core/       | WASM呼び出しラッパー |
| src/lib/generation/ | 生成結果パーサー     |
| src/workers/        | Web Worker処理       |
| src/data/           | 静的データ (JSON)    |

## 5. データフロー

### 5.1 Generation処理

```
UI入力 → Zustand Store → Worker → WASM
                                    ↓
UI表示 ← Zustand Store ← Worker ← RawPokemonData
```

### 5.2 WASM出力データ構造 (RawPokemonData)

```rust
pub struct RawPokemonData {
    personality_value: u32,      // PID
    encounter_slot_value: u32,   // スロット値
    nature_id: u32,              // 性格ID (0-24)
    sync_applied: bool,          // シンクロ適用
    advances: u32,               // 消費数
    level: u8,                   // レベル
    shiny_flag: bool,            // 色違い
    ability_slot: u8,            // 特性スロット
    gender_value: u8,            // 性別判定値
    rng_seed_used: u64,          // 使用Seed
    encounter_type: u32,         // エンカウント種別
}
```

## 6. 課題・改善点

### 6.1 レイヤー間責務の曖昧さ

- TypeScript側に一部計算ロジックが残存
- Result Parserでの種族名解決など

### 6.2 データ管理の分散

- エンカウントテーブルがTypeScript側JSON
- WASMでの参照時にデータ転送コスト

### 6.3 テスト環境

- WASM/Browser/Node の多層テスト構成が複雑

## 7. 参考資料

- [ポケモン第5世代乱数調整](https://rusted-coil.sakura.ne.jp/pokemon/ran/ran_5.htm)
- [エンカウントテーブル](https://pokebook.jp/)
- [補助資料](https://xxsakixx.com/)
