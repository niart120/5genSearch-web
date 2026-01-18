# WASM API設計

TypeScript ↔ Rust/WASM 間のインターフェース仕様。

## 1. 設計原則

1. **単方向データフロー**: Request → WASM → Response
2. **自己完結性**: WASM側で全計算を完結
3. **型安全性**: tsify + serdeによる型自動生成
4. **ストリーミング対応**: 大量結果の分割転送
5. **CPU/GPU経路分離**: ユーザーがUI側で選択

## 2. 型共有 (tsify + serde)

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
    pub vframe_range: (u8, u8),
    pub gxstat: u8,
    pub key_input: u16,
}
```

利点:

- Rust側の型定義が単一の真実のソース
- TypeScript側での型定義重複を排除
- シリアライズ/デシリアライズの自動化

## 3. API一覧

### 3.1 起動時刻探索 (Boot Timing Search)

#### `search_boot_timing_cpu` / `search_boot_timing_gpu`

起動時刻探索 (SHA-1ベース)

```rust
// CPU版
pub fn search_boot_timing_cpu(request: BootTimingRequest) -> BootTimingResult;

// GPU版 (wgpu)
pub fn search_boot_timing_gpu(request: BootTimingRequest, gpu: GpuContext) -> BootTimingResult;

// Request (tsify生成)
interface BootTimingRequest {
  macAddress: Uint8Array;  // 6 bytes
  datetime: {
    year: number;    // 2000-2099
    month: number;   // 1-12
    day: number;     // 1-31
    hour: number;    // 0-23
    minute: number;  // 0-59
    second: number;  // 0-59
  };
  timer0Range: [number, number];  // u16
  vcountRange: [number, number];  // u8
  vframeRange: [number, number];  // u8
  gxstat: number;
  keyInput: number;
}

// Response
interface BootTimingResult {
  seeds: BigUint64Array;
  searchedCount: number;
  elapsedMs: number;
}
```

### 3.2 初期Seed探索 (Initial Seed / MT Seed Search)

#### `search_initial_seed_cpu` / `search_initial_seed_gpu`

MT Seed探索 (個体値逆算)

```rust
// CPU版
pub fn search_initial_seed_cpu(request: InitialSeedRequest) -> InitialSeedResult;

// GPU版 (wgpu)
pub fn search_initial_seed_gpu(request: InitialSeedRequest, gpu: GpuContext) -> InitialSeedResult;

// Request (tsify生成)
interface InitialSeedRequest {
  ivs: {
    hp: [number, number];   // min, max
    atk: [number, number];
    def: [number, number];
    spa: [number, number];
    spd: [number, number];
    spe: [number, number];
  };
  pokemon: string;  // species identifier
  method: 'wild' | 'roamer' | 'static';
}

// Response
interface MtSeedSearchResponse {
  seeds: Uint32Array;
  elapsedMs: number;
}
```

### 2.2 Generation API

#### `generate_pokemon_list`

乱数列からポケモンリスト生成

```rust
#[wasm_bindgen]
pub fn generate_pokemon_list(request: JsValue) -> Promise;

// Request
interface GenerationRequest {
  baseSeed: bigint;
  offset: number;
  maxAdvances: number;
  maxResults: number;

  encounterType: EncounterType;
  gameVersion: 'black' | 'white' | 'black2' | 'white2';

  trainerId: number;
  secretId: number;

  syncEnabled: boolean;
  syncNatureId?: number;  // 0-24

  // フィルタ (オプション)
  filter?: {
    onlyShiny?: boolean;
    natures?: number[];
    minLevel?: number;
    maxLevel?: number;
  };

  // 制御
  stopAtFirstShiny?: boolean;
  batchSize?: number;
}

// Response (ストリーミング用)
interface GenerationProgress {
  type: 'progress';
  currentAdvance: number;
  percent: number;
}

interface GenerationBatch {
  type: 'batch';
  pokemon: PokemonData[];
}

interface GenerationComplete {
  type: 'complete';
  totalGenerated: number;
  elapsedMs: number;
  reason: 'max-advances' | 'max-results' | 'first-shiny' | 'stopped';
}

// PokemonData (WASM側で完全解決)
interface PokemonData {
  advance: number;
  seed: bigint;

  // 基本属性
  pid: number;
  natureId: number;
  natureName: string;
  abilitySlot: number;
  abilityName: string;

  // エンカウント
  encounterSlot: number;
  speciesId: number;
  speciesName: string;
  level: number;

  // 色違い
  shinyType: 0 | 1 | 2;  // None, Square, Star

  // 性別
  genderValue: number;
  gender: 'male' | 'female' | 'genderless';

  // メタ
  syncApplied: boolean;
}
```

### 2.3 Data Query API

#### `get_encounter_table`

エンカウントテーブル取得

```rust
#[wasm_bindgen]
pub fn get_encounter_table(
  game_version: &str,
  location_id: u16,
  encounter_type: u8
) -> JsValue;

// Response
interface EncounterTable {
  locationId: number;
  locationName: string;
  encounterType: EncounterType;
  slots: EncounterSlot[];
}

interface EncounterSlot {
  index: number;
  speciesId: number;
  speciesName: string;
  probability: number;
  levelRange: [number, number];
}
```

#### `get_species_data`

種族データ取得

```rust
#[wasm_bindgen]
pub fn get_species_data(species_id: u16) -> JsValue;

// Response
interface SpeciesData {
  id: number;
  name: string;
  abilities: [string, string, string | null];  // ability1, ability2, hidden
  genderRatio: number;  // -1: genderless, 0-254: female threshold
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
}
```

#### `list_locations`

場所一覧取得

```rust
#[wasm_bindgen]
pub fn list_locations(game_version: &str) -> JsValue;

// Response
interface LocationList {
  locations: LocationEntry[];
}

interface LocationEntry {
  id: number;
  name: string;
  encounterTypes: EncounterType[];
}
```

## 3. 列挙型

```typescript
type EncounterType =
  | 'wild-grass'
  | 'wild-cave'
  | 'surf'
  | 'fishing-super'
  | 'fishing-good'
  | 'fishing-normal'
  | 'shaking-grass'
  | 'dust-cloud'
  | 'shadow'
  | 'bubble'
  | 'static-symbol'
  | 'roamer';

type GameVersion = 'black' | 'white' | 'black2' | 'white2';

type ShinyType = 0 | 1 | 2; // None, Square, Star
```

## 4. エラーハンドリング

```rust
#[wasm_bindgen]
pub struct WasmError {
    code: String,
    message: String,
    details: Option<JsValue>,
}

// エラーコード
const ERROR_CODES = {
  INVALID_PARAMETER: 'E001',
  OUT_OF_RANGE: 'E002',
  DATA_NOT_FOUND: 'E003',
  COMPUTATION_FAILED: 'E004',
  CANCELLED: 'E005',
} as const;
```

## 5. TypeScript型定義生成

wasm-bindgenのTypeScript出力を拡張:

```typescript
// generated/wasm-types.d.ts (自動生成)
export function search_initial_seed(
  request: InitialSeedSearchRequest
): Promise<InitialSeedSearchResponse>;
export function generate_pokemon_list(request: GenerationRequest): Promise<GenerationResult>;
// ...

// lib/wasm/index.ts (ラッパー)
import * as wasm from '../generated/wasm';

export async function searchInitialSeed(
  request: InitialSeedSearchRequest
): Promise<InitialSeedSearchResponse> {
  try {
    return await wasm.search_initial_seed(request);
  } catch (e) {
    throw parseWasmError(e);
  }
}
```

## 6. パフォーマンス考慮

### 6.1 バッチ転送

大量データは分割転送:

```rust
// 1000件ごとにJavaScript側へコールバック
pub fn generate_with_callback(
  request: JsValue,
  on_batch: &js_sys::Function,
  on_progress: &js_sys::Function,
) -> Promise;
```

### 6.2 SharedArrayBuffer対応 (将来)

Worker間でのゼロコピー転送:

```rust
pub fn generate_into_shared_buffer(
  request: JsValue,
  buffer: &js_sys::SharedArrayBuffer,
) -> Promise;
```

### 6.3 WebGPU連携

GPU計算パスの統合:

```rust
#[cfg(feature = "webgpu")]
pub fn search_initial_seed_gpu(
  request: JsValue,
  gpu_device: &web_sys::GpuDevice,
) -> Promise;
```
