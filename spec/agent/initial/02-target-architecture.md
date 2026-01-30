# 目標アーキテクチャ設計

計算ロジックをWASMに集約した新アーキテクチャの設計。

## 1. 設計目標

1. **計算ロジックの完全WASM化**: TypeScript側に計算コードを持たない
2. **明確なAPI境界**: WASM ↔ TypeScript間のインターフェースを厳格に定義
3. **データ所有権の明確化**: 静的データもWASM側で管理
4. **テスト容易性**: 各レイヤーが独立してテスト可能

## 2. 新レイヤー構成

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│                       (TypeScript)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    React    │  │   Zustand   │  │   UI Components     │  │
│  │  Components │  │    Store    │  │  (Radix UI)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│                       (TypeScript)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Service   │  │   Worker    │  │   Export/Import     │  │
│  │  Facade     │  │   Manager   │  │   Handlers          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      WASM API Layer                          │
│                       (TypeScript)                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Type-Safe WASM Bindings                     ││
│  │  - Request/Response types                                ││
│  │  - Error handling                                        ││
│  │  - Async wrapper                                         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Core Layer                             │
│                         (Rust)                               │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │  Seed Search  │  │  Generation   │  │   Data Store    │  │
│  │  - SHA-1      │  │  - LCG        │  │  - Species      │  │
│  │  - SIMD       │  │  - Encounter  │  │  - Encounters   │  │
│  │  - WebGPU     │  │  - Pokemon    │  │  - Constants    │  │
│  └───────────────┘  └───────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 3. レイヤー責務

### 3.1 Presentation Layer (TypeScript/React)

**責務**:

- ユーザー入力の受付
- 計算結果の表示
- UI状態管理 (Zustand)

**含まない**:

- 乱数計算
- Worker制御
- 処理のキック

### 3.2 WorkerService Layer (TypeScript)

**責務**:

- Worker生成・破棄
- 処理のキック
- 進捗・結果のハンドリング
- キャンセル制御
- Storeへの結果書き込み

**含まない**:

- UI状態
- ビジネスロジック

### 3.3 Core Layer (Rust/WASM)

**責務**:

- 全ての計算ロジック
- 静的データ管理
- 高速処理 (SIMD/WebGPU)

## 4. WASM API設計方針

### 4.1 型共有戦略 (tsify + serde)

Rust側の型定義からTypeScript型を自動生成:

```rust
use serde::{Deserialize, Serialize};
use tsify::Tsify;

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct BootTimingRequest {
    pub mac_address: [u8; 6],
    pub datetime: DateTime,
    pub timer0_range: (u16, u16),
    pub vcount_range: (u8, u8),
}

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct BootTimingResult {
    pub seeds: Vec<u64>,
    pub elapsed_ms: u32,
}
```

### 4.2 CPU/GPU経路分離

CPU/GPUは別APIとして提供（ユーザーがUIで選択）:

```rust
// CPU経路
pub fn search_boot_timing_cpu(request: BootTimingRequest) -> BootTimingResult;
pub fn search_initial_seed_cpu(request: InitialSeedRequest) -> InitialSeedResult;

// GPU経路 (wgpu)
pub fn search_boot_timing_gpu(request: BootTimingRequest, gpu: GpuContext) -> BootTimingResult;
pub fn search_initial_seed_gpu(request: InitialSeedRequest, gpu: GpuContext) -> InitialSeedResult;

// WebGPU可用性チェック
pub fn is_webgpu_available() -> bool;
```

### 4.2 出力: 構造化レスポンス

```rust
#[wasm_bindgen]
pub struct SearchResult {
    seeds: Vec<u64>,
    elapsed_ms: u32,
}

#[wasm_bindgen]
pub struct GenerationResult {
    pokemon: Vec<PokemonData>,
    total_advances: u32,
}

#[wasm_bindgen]
pub struct PokemonData {
    advance: u32,
    seed: u64,
    pid: u32,
    nature_id: u8,
    ability_slot: u8,
    encounter_slot: u8,
    level: u8,
    shiny_type: u8,  // 0: None, 1: Square, 2: Star
    sync_applied: bool,
    // 表示用データもWASM側で解決
    species_id: u16,
    species_name: String,  // ローカライズ済み
    nature_name: String,
    ability_name: String,
}
```

### 4.3 エラー型

```rust
#[wasm_bindgen]
pub enum WasmError {
    InvalidParameter,
    OutOfRange,
    DataNotFound,
    ComputationFailed,
}
```

## 5. データ管理

### 5.1 静的データのWASM埋め込み

現行: TypeScript側JSONファイル
目標: Rust側に埋め込み (build時生成 or include_bytes!)

```rust
// 種族データ
static SPECIES_DATA: &[SpeciesEntry] = include!("generated/species.rs");

// エンカウントテーブル
static ENCOUNTER_TABLES: &[EncounterTable] = include!("generated/encounters.rs");
```

### 5.2 利点

- データ転送コスト削減
- WASM内で完結した計算
- TypeScript側の軽量化

## 6. Worker設計

### 6.1 Worker種別

| Worker               | 用途                    | 備考    |
| -------------------- | ----------------------- | ------- |
| BootTimingWorker     | 起動時刻探索 (SHA-1)    | CPU版   |
| BootTimingWorkerGpu  | 起動時刻探索 (SHA-1)    | GPU版   |
| InitialSeedWorker    | 初期Seed (MT Seed) 探索 | CPU版   |
| InitialSeedWorkerGpu | 初期Seed (MT Seed) 探索 | GPU版   |
| GenerationWorker     | 乱数列生成              | CPUのみ |

### 6.2 メッセージプロトコル

```typescript
// Main → Worker
type WorkerRequest =
  | { type: 'init' }
  | { type: 'search'; id: string; params: SearchParams }
  | { type: 'generate'; id: string; params: GenerationParams }
  | { type: 'cancel'; id: string };

// Worker → Main
type WorkerResponse =
  | { type: 'ready' }
  | { type: 'progress'; id: string; percent: number; current: number }
  | { type: 'batch'; id: string; data: ResultBatch }
  | { type: 'complete'; id: string; reason: CompletionReason }
  | { type: 'error'; id: string; code: string; message: string }
  | { type: 'cancelled'; id: string };
```

## 7. 移行戦略

```
Phase 0: 基盤整備
Phase 1: Worker設計 + WASM API境界定義（同時実施）
Phase 2: コア機能実装（計算ロジック + 静的データ）
Phase 3: UI統合 + TypeScript計算ロジック削除
```

詳細は [04-migration-plan.md](04-migration-plan.md) を参照。
