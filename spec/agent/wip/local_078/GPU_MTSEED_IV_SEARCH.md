# GPU MT Seed IV 全探索 仕様書

## 1. 概要

### 1.1 目的

MT Seed IV 全探索 (`MtseedSearcher`) の GPU 版経路を実装する。CPU 版では $2^{32}$ 個の Seed をシーケンシャルに MT19937 初期化・Twist・IV 抽出・フィルタリングしているが、GPU Compute Shader で並列処理することでスループットを大幅に改善する。

併せて、CPU 版 `MtseedSearcher` がスカラー版 `Mt19937` のみを使用している問題を修正し、SIMD 版 `Mt19937x4` による 4 系統並列処理に移行する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| MT Seed IV 全探索 | 0〜$2^{32}-1$ の全 MT Seed に対して MT19937 を初期化し、指定オフセット後に生成される IV がフィルタ条件を満たす Seed を列挙する処理 |
| MT19937 | Mersenne Twister 乱数生成器。624 ワードの状態配列を初期化し、Twist 変換後に Tempering を適用して 32bit 乱数を出力する |
| Twist | MT19937 の状態配列 624 ワードを一括更新する操作 |
| Tempering | MT19937 の状態値にビット演算を適用して出力を均一化する操作 |
| IV | 個体値 (Individual Values)。HP/Atk/Def/SpA/SpD/Spe の 6 ステータス、各 0-31 |
| `MtseedSearcher` | 既存 CPU 版の全探索実装 (`wasm-pkg/src/misc/mtseed_search.rs`) |
| `GpuMtseedSearchIterator` | 本仕様で新設する GPU 版の全探索イテレータ |
| `Mt19937x4` | MT19937 の SIMD 実装。4 つの異なる Seed を同時に処理する |
| `IvFilter` | IV の範囲条件 + めざパ条件を表すフィルタ型 |
| roamer | 徘徊ポケモン。IV 生成順が HABDSC → HABCDS に並び替えされる特殊モード |
| `ITEMS_PER_THREAD` | 1 GPU スレッドが処理する Seed 数。既存 `datetime_search` シェーダーと同様の方式 |

### 1.3 背景・問題

CPU 版 `MtseedSearcher` は `generate_rng_ivs_with_offset()` 経由でスカラー版 `Mt19937` を使用している。`Mt19937x4` (Portable SIMD, 4 系統並列) が `core/mt/simd.rs` に実装済みだが、`MtseedSearcher` では未使用。WASM SIMD128 はモダンブラウザで広くサポートされているため、フォールバック不要で SIMD 版に移行できる。

現状のベンチマーク結果は約 10,000 Seed/batch で約 52ms/batch (≈192K Seed/s/core)。8 Worker 並列でも全探索に約 2,800 秒を要する。SIMD 化により CPU パスのスループットは理論上約 4 倍に向上する。

GPU は大量の独立した Seed に対して MT19937 の初期化・Twist・IV 抽出を並列実行でき、かつ状態配列がレジスタ/ローカルメモリに収まるサイズ (624 × 4 = 2,496 bytes) であるため、高い並列度での活用が期待できる。

### 1.4 期待効果

| 項目 | CPU (8 Worker, スカラー) | CPU (8 Worker, SIMD) | GPU (推定) |
|------|--------------------------|----------------------|------------|
| スループット | ~1.5M Seed/s | ~6M Seed/s | 100M+ Seed/s |
| 全探索所要時間 | ~2,800 秒 | ~700 秒 | ~40 秒以下 |

### 1.5 着手条件

- 既存 GPU datetime_search パス (`gpu/datetime_search/`) が安定稼働していること
- `MtseedSearcher` の CPU 版テストがパスしていること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/gpu/mod.rs` | 修正 | `mtseed_search` サブモジュール宣言・re-export 追加 |
| `wasm-pkg/src/gpu/mtseed_search/mod.rs` | 新規 | モジュール宣言 |
| `wasm-pkg/src/gpu/mtseed_search/shader.wgsl` | 新規 | MT19937 初期化・Twist・IV 抽出・フィルタリングシェーダー |
| `wasm-pkg/src/gpu/mtseed_search/pipeline.rs` | 新規 | Compute Pipeline 構築・バッファ管理・dispatch |
| `wasm-pkg/src/gpu/mtseed_search/iterator.rs` | 新規 | `GpuMtseedSearchIterator` (AsyncIterator パターン) |
| `wasm-pkg/src/lib.rs` | 修正 | `GpuMtseedSearchIterator`, `GpuMtseedSearchBatch` の re-export |
| `wasm-pkg/src/types/search.rs` | 修正 | `GpuMtseedSearchBatch` 型追加 |
| `wasm-pkg/src/generation/algorithm/iv.rs` | 修正 | `generate_rng_ivs_with_offset_x4` (SIMD 版) 追加 |
| `wasm-pkg/src/misc/mtseed_search.rs` | 修正 | `MtseedSearcher` を `Mt19937x4` ベースに変更 |
| `wasm-pkg/benches/gpu_mtseed_search.rs` | 新規 | GPU 版ベンチマーク (criterion) |
| `wasm-pkg/Cargo.toml` | 修正 | `[[bench]]` エントリ追加 |
| `src/workers/gpu.worker.ts` | 修正 | `gpu-mtseed-iv` タスク種別の追加・ハンドリング |
| `src/workers/types.ts` | 修正 | `GpuMtseedIvSearchTask` 型追加、`SearchTask` union 拡張 |

## 3. 設計方針

### 3.1 アルゴリズム概要

1 GPU スレッドが 1 つの MT Seed に対して以下を実行する:

1. **MT19937 初期化**: `state[0] = seed; state[i] = 1812433253 * (state[i-1] ^ (state[i-1] >> 30)) + i` (i = 1..623)
2. **Twist**: 624 ワードの状態配列を一括更新
3. **Offset 消費**: `offset` 回分の乱数を消費 (Tempering を適用して破棄)
4. **IV 抽出**: 6 回の Tempering を適用し、各出力の上位 5bit を IV として抽出
5. **Roamer 処理** (条件付き): IV の並び順を HABDSC → HABCDS に変換
6. **フィルタリング**: IV が `IvFilter` 条件を満たす場合、結果バッファに書き込み

### 3.2 シェーダー設計

#### 3.2.1 バッファ構造

```
@group(0) @binding(0) var<storage, read>       state:      DispatchState;
@group(0) @binding(1) var<uniform>              constants:  SearchConstants;
@group(0) @binding(2) var<storage, read_write>  output:     MatchOutputBuffer;
```

既存 `datetime_search` シェーダーの 4 binding 構成とは異なり、ターゲット Seed バッファが不要なため 3 binding に簡素化する。

#### 3.2.2 `DispatchState`

```wgsl
struct DispatchState {
    /// 処理する Seed 数
    seed_count: u32,
    /// 開始 Seed 値
    base_seed: u32,
    /// 候補バッファ容量
    candidate_capacity: u32,
    /// パディング
    padding: u32,
};
```

#### 3.2.3 `SearchConstants`

```wgsl
struct SearchConstants {
    /// MT オフセット (IV 生成開始位置)
    mt_offset: u32,
    /// roamer モード (0: 通常, 1: 徘徊)
    is_roamer: u32,
    /// IV 範囲 (各 8bit: min << 8 | max をパック)
    iv_hp: u32,
    iv_atk: u32,
    iv_def: u32,
    iv_spa: u32,
    iv_spd: u32,
    iv_spe: u32,
    /// 予約
    reserved0: u32,
    reserved1: u32,
};
```

IV 範囲は各ステータスの `(min, max)` を 1 ワードにパックする: `(min << 16) | max`。GPU 側では `(value >= (packed >> 16)) && (value <= (packed & 0xFFFF))` で判定する。

めざパタイプ・威力フィルタは GPU 側では適用しない。GPU 側は IV 範囲フィルタのみで候補を絞り込み、めざパ条件は CPU 側で後処理する。理由:
- めざパタイプは 16 種の配列マッチングが必要で GPU 向きでない
- 候補数は IV 範囲フィルタで十分に絞り込まれる (6V で $2^{32}$ 中 ~4000 件)

#### 3.2.4 `MatchOutputBuffer`

```wgsl
struct MatchRecord {
    /// MT Seed 値
    seed: u32,
    /// IV (パック形式: hp | atk<<5 | def<<10 | spa<<15 | spd<<20 | spe<<25)
    ivs_packed: u32,
};

struct MatchOutputBuffer {
    /// マッチ数 (atomic)
    match_count: atomic<u32>,
    /// マッチレコード配列
    records: array<MatchRecord>,
};
```

IV を 32bit にパック (各 5bit × 6 = 30bit) することで 1 レコード 8 bytes に収め、バッファ効率を高める。

#### 3.2.5 MT19937 のメモリレイアウト

MT19937 の状態配列 624 ワード (2,496 bytes) はスレッドローカルな `var<function>` として配置する。WGSL の `var<function>` はプライベートメモリ (レジスタまたはスピルメモリ) に割り当てられる。

```wgsl
var<function> mt_state: array<u32, 624>;
```

624 ワードはレジスタに収まらない可能性が高く、スピルメモリ (VRAM ローカル) に配置される。このため 1 スレッドあたりのメモリ消費が大きく、同時実行スレッド数が制限される可能性がある。ただし、各スレッドの計算量 (init 624 回 + twist 624 回 + offset + tempering 6 回) は十分に大きいため、メモリレイテンシを隠蔽できると見込む。

#### 3.2.6 `ITEMS_PER_THREAD`

既存 `datetime_search` と同様に、1 スレッドが `ITEMS_PER_THREAD` 個の連続 Seed を処理するループを内包する。MT Seed IV 検索は SHA-1 より計算量が大きいため、値は控えめに設定する:

| GPU 種別 | `ITEMS_PER_THREAD` | 根拠 |
|----------|-------------------|------|
| Discrete | 8 | MT19937 init+twist が SHA-1 より重いため、SHA-1 版 (32) より小さく |
| Integrated | 4 | |
| Mobile | 2 | watchdog timeout を考慮 |

### 3.3 パイプライン設計

既存 `datetime_search/pipeline.rs` のパターンを踏襲する:

1. `SearchPipeline::new()` でシェーダーモジュール・パイプライン・バッファを作成
2. `dispatch()` で `DispatchState` を更新し、GPU ディスパッチを実行
3. staging buffer 経由で結果を CPU に読み出し
4. パック IV をアンパックし `MtseedResult` に変換

### 3.4 イテレータ設計

`GpuMtseedSearchIterator` は `GpuDatetimeSearchIterator` と同じ AsyncIterator パターンを使用する:

```rust
#[wasm_bindgen]
impl GpuMtseedSearchIterator {
    #[wasm_bindgen(js_name = "create")]
    pub async fn create(context: MtseedSearchContext) -> Result<Self, String>;

    #[wasm_bindgen]
    pub async fn next(&mut self) -> Option<GpuMtseedSearchBatch>;

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool;

    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64;
}
```

全 Seed 空間 $2^{32}$ を `max_messages_per_dispatch` ごとのチャンクに分割し、`next()` 呼び出しごとに 1 ディスパッチを実行する。

### 3.5 結果型

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, large_number_types_as_bigints)]
pub struct GpuMtseedSearchBatch {
    /// フィルタ条件を満たした候補
    pub candidates: Vec<MtseedResult>,
    /// 進捗率 (0.0 - 1.0)
    pub progress: f64,
    /// 処理済み Seed 数
    pub processed: u64,
    /// 総 Seed 数
    pub total: u64,
}
```

GPU 側は IV 範囲フィルタのみで候補を絞り込むため、めざパ条件がある場合は `candidates` を受け取った後に CPU 側 (`IvFilter::matches`) で追加フィルタリングする。この後処理はイテレータ内部で行い、呼び出し側には最終結果のみを返す。

### 3.6 レイヤー構成

```
Worker (TypeScript)
  └─ GpuMtseedSearchIterator (Rust/WASM, #[wasm_bindgen])
       ├─ GpuDeviceContext (共通)
       ├─ SearchJobLimits (共通)
       └─ SearchPipeline (GPU Compute)
            └─ shader.wgsl (WGSL)
```

### 3.7 Worker 統合

GPU Worker (`src/workers/gpu.worker.ts`) に `gpu-mtseed-iv` タスク種別を追加する。既存の `gpu-mtseed` (datetime search) と同じフローで処理する:

1. `GpuMtseedSearchIterator.create(context)` でイテレータ作成
2. `next()` ループで進捗報告・結果送信
3. 完了時に `done` 応答

### 3.8 SearchJobLimits の調整

MT Seed IV 検索は MT19937 の init + twist が SHA-1 より計算コストが高い。`ITEMS_PER_THREAD` を小さめに設定する以外に、`SearchJobLimits` の既存パラメータはそのまま使用する。`items_per_thread` の値はシェーダー側の `override` 定数として注入するため、`SearchJobLimits` に新しいフィールドは追加せず、パイプライン作成時に検索種別に応じた値を使用する。

### 3.9 CPU 版 `MtseedSearcher` の SIMD 化

既存の `MtseedSearcher` はスカラー版 `Mt19937` を使用しているが、`core/mt/simd.rs` に実装済みの `Mt19937x4` (Portable SIMD, `std::simd::u32x4`) に移行する。WASM SIMD128 はモダンブラウザで広くサポートされているため、スカラー版へのフォールバック実装は不要。

#### 3.9.1 変更方針

1. `generation/algorithm/iv.rs` に `generate_rng_ivs_with_offset_x4` を追加
2. `MtseedSearcher::next_batch()` を 4 Seed 単位で処理するように変更
3. 端数処理: 残り Seed 数が 4 未満の場合は最後のチャンクを 4 に padding (ダミー Seed で埋め、結果は無視)

#### 3.9.2 `generate_rng_ivs_with_offset_x4`

```rust
/// 4 つの MT Seed に対して同時に IV を生成する (SIMD)
pub fn generate_rng_ivs_with_offset_x4(
    seeds: [MtSeed; 4],
    offset: u32,
    is_roamer: bool,
) -> [Ivs; 4] {
    let mut mt = Mt19937x4::new(seeds);
    mt.discard(offset);

    // 6 回の乱数生成 (各呼び出しで 4 レーン分が一度に得られる)
    let raw: [[u32; 4]; 6] = std::array::from_fn(|_| mt.next_u32x4());

    // raw[stat_idx][lane_idx] → 各レーンごとに IV を組み立て
    std::array::from_fn(|lane| {
        let iv_arr: [u8; 6] = std::array::from_fn(|stat| extract_iv(raw[stat][lane]));
        if is_roamer {
            reorder_for_roamer(iv_arr)
        } else {
            Ivs::from(iv_arr)
        }
    })
}
```

#### 3.9.3 `MtseedSearcher::next_batch()` の変更

```rust
// 変更前: 1 Seed ずつ処理
for seed in start..end {
    let ivs = generate_rng_ivs_with_offset(seed, offset, is_roamer);
    if filter.matches(&ivs) { results.push(...); }
}

// 変更後: 4 Seed 単位で処理
for base in (start..end).step_by(4) {
    let seeds: [MtSeed; 4] = std::array::from_fn(|i| {
        let s = base + i as u32;
        if s < end { s } else { 0 }  // padding
    });
    let ivs_x4 = generate_rng_ivs_with_offset_x4(seeds, offset, is_roamer);
    for (i, ivs) in ivs_x4.iter().enumerate() {
        let s = base + i as u32;
        if s < end && filter.matches(ivs) {
            results.push(MtseedResult { seed: s, ivs: *ivs });
        }
    }
}
```

## 4. 実装仕様

### 4.1 シェーダー (`shader.wgsl`)

ファイルパス: `wasm-pkg/src/gpu/mtseed_search/shader.wgsl`

```wgsl
// MT Seed IV 全探索シェーダー
//
// MT19937 を初期化・Twist し、指定オフセット後の IV を抽出・フィルタリングする。

override WORKGROUP_SIZE: u32 = 64u;
override ITEMS_PER_THREAD: u32 = 1u;

// ===== バッファ構造体 =====

struct DispatchState {
    seed_count: u32,
    base_seed: u32,
    candidate_capacity: u32,
    padding: u32,
};

struct SearchConstants {
    mt_offset: u32,
    is_roamer: u32,
    iv_hp: u32,
    iv_atk: u32,
    iv_def: u32,
    iv_spa: u32,
    iv_spd: u32,
    iv_spe: u32,
    reserved0: u32,
    reserved1: u32,
};

struct MatchRecord {
    seed: u32,
    ivs_packed: u32,
};

struct MatchOutputBuffer {
    match_count: atomic<u32>,
    records: array<MatchRecord>,
};

@group(0) @binding(0) var<storage, read> state: DispatchState;
@group(0) @binding(1) var<uniform> constants: SearchConstants;
@group(0) @binding(2) var<storage, read_write> output_buffer: MatchOutputBuffer;

// ===== MT19937 定数 =====

const MT_N: u32 = 624u;
const MT_M: u32 = 397u;
const MATRIX_A: u32 = 0x9908B0DFu;
const UPPER_MASK: u32 = 0x80000000u;
const LOWER_MASK: u32 = 0x7FFFFFFFu;
const INIT_MULT: u32 = 1812433253u;

// ===== MT19937 関数 =====

fn mt_init(mt: ptr<function, array<u32, 624>>, seed: u32) {
    (*mt)[0] = seed;
    for (var i = 1u; i < MT_N; i = i + 1u) {
        let prev = (*mt)[i - 1u];
        (*mt)[i] = INIT_MULT * (prev ^ (prev >> 30u)) + i;
    }
}

fn mt_twist(mt: ptr<function, array<u32, 624>>) {
    for (var i = 0u; i < MT_N; i = i + 1u) {
        let x = ((*mt)[i] & UPPER_MASK) | ((*mt)[(i + 1u) % MT_N] & LOWER_MASK);
        var x_a = x >> 1u;
        if ((x & 1u) != 0u) {
            x_a = x_a ^ MATRIX_A;
        }
        (*mt)[i] = (*mt)[(i + MT_M) % MT_N] ^ x_a;
    }
}

fn mt_temper(value: u32) -> u32 {
    var y = value;
    y = y ^ (y >> 11u);
    y = y ^ ((y << 7u) & 0x9D2C5680u);
    y = y ^ ((y << 15u) & 0xEFC60000u);
    y = y ^ (y >> 18u);
    return y;
}

fn extract_iv(tempered: u32) -> u32 {
    return tempered >> 27u;
}

fn check_iv_range(value: u32, packed_range: u32) -> bool {
    let min_val = packed_range >> 16u;
    let max_val = packed_range & 0xFFFFu;
    return value >= min_val && value <= max_val;
}

// ===== メインカーネル =====

@compute @workgroup_size(WORKGROUP_SIZE)
fn mt_iv_search(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let base_idx = global_id.x * ITEMS_PER_THREAD;

    for (var item_k = 0u; item_k < ITEMS_PER_THREAD; item_k = item_k + 1u) {
        let idx = base_idx + item_k;
        if (idx >= state.seed_count) {
            return;
        }

        let seed = state.base_seed + idx;

        // MT19937 初期化
        var mt: array<u32, 624>;
        mt_init(&mt, seed);

        // Twist
        mt_twist(&mt);

        // Offset 消費
        var mt_index = 0u;
        for (var i = 0u; i < constants.mt_offset; i = i + 1u) {
            mt_index = mt_index + 1u;
        }

        // IV 抽出 (6回)
        var ivs: array<u32, 6>;
        for (var i = 0u; i < 6u; i = i + 1u) {
            ivs[i] = extract_iv(mt_temper(mt[mt_index]));
            mt_index = mt_index + 1u;
        }

        // Roamer 並び替え (HABDSC → HABCDS)
        if (constants.is_roamer != 0u) {
            let tmp_spa = ivs[3];
            let tmp_spd = ivs[4];
            let tmp_spe = ivs[5];
            ivs[3] = tmp_spd;  // spa ← spd位置の値 (D)
            ivs[4] = tmp_spe;  // spd ← spe位置の値 (S)
            ivs[5] = tmp_spa;  // spe ← spa位置の値 (C)
        }

        // IV フィルタリング
        if (!check_iv_range(ivs[0], constants.iv_hp)) { continue; }
        if (!check_iv_range(ivs[1], constants.iv_atk)) { continue; }
        if (!check_iv_range(ivs[2], constants.iv_def)) { continue; }
        if (!check_iv_range(ivs[3], constants.iv_spa)) { continue; }
        if (!check_iv_range(ivs[4], constants.iv_spd)) { continue; }
        if (!check_iv_range(ivs[5], constants.iv_spe)) { continue; }

        // パック IV
        let packed = ivs[0]
                   | (ivs[1] << 5u)
                   | (ivs[2] << 10u)
                   | (ivs[3] << 15u)
                   | (ivs[4] << 20u)
                   | (ivs[5] << 25u);

        // 結果書き込み
        let match_idx = atomicAdd(&output_buffer.match_count, 1u);
        if (match_idx < state.candidate_capacity) {
            output_buffer.records[match_idx].seed = seed;
            output_buffer.records[match_idx].ivs_packed = packed;
        }
    }
}
```

### 4.2 パイプライン (`pipeline.rs`)

ファイルパス: `wasm-pkg/src/gpu/mtseed_search/pipeline.rs`

既存 `datetime_search/pipeline.rs` と同等の構造。主な差分:

- binding 数が 4 → 3 (ターゲット Seed バッファ不要)
- `SearchConstants` の内容が IV フィルタ中心
- 結果読み出し時に packed IV をアンパック → `Ivs` に変換
- めざパフィルタは CPU 側で後処理

```rust
/// シェーダー定数 (GPU バッファにコピー)
#[repr(C)]
#[derive(Clone, Copy, Debug, bytemuck::Pod, bytemuck::Zeroable)]
struct SearchConstants {
    mt_offset: u32,
    is_roamer: u32,
    iv_hp: u32,     // (min << 16) | max
    iv_atk: u32,
    iv_def: u32,
    iv_spa: u32,
    iv_spd: u32,
    iv_spe: u32,
    reserved0: u32,
    reserved1: u32,
}

/// ディスパッチ状態
#[repr(C)]
#[derive(Clone, Copy, Debug, bytemuck::Pod, bytemuck::Zeroable)]
struct DispatchState {
    seed_count: u32,
    base_seed: u32,
    candidate_capacity: u32,
    padding: u32,
}

/// マッチレコード (GPU → CPU)
#[repr(C)]
#[derive(Clone, Copy, Debug, bytemuck::Pod, bytemuck::Zeroable)]
struct MatchRecord {
    seed: u32,
    ivs_packed: u32,
}
```

### 4.3 イテレータ (`iterator.rs`)

ファイルパス: `wasm-pkg/src/gpu/mtseed_search/iterator.rs`

```rust
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct GpuMtseedSearchIterator {
    pipeline: SearchPipeline,
    iv_filter: IvFilter,  // めざパ後処理用 (全条件)
    mt_offset: u32,
    is_roamer: bool,
    current_seed: u64,    // 半開区間の現在位置
    total: u64,           // = 0x1_0000_0000
    limits: SearchJobLimits,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl GpuMtseedSearchIterator {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(js_name = "create"))]
    pub async fn create(context: MtseedSearchContext) -> Result<Self, String> {
        let gpu_ctx = GpuDeviceContext::new().await?;
        let limits = SearchJobLimits::from_device_limits(gpu_ctx.limits(), gpu_ctx.gpu_profile());
        let pipeline = SearchPipeline::new(&gpu_ctx, &context);
        Ok(Self {
            pipeline,
            iv_filter: context.iv_filter.clone(),
            mt_offset: context.mt_offset,
            is_roamer: context.is_roamer,
            current_seed: 0,
            total: 0x1_0000_0000,
            limits,
        })
    }

    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub async fn next(&mut self) -> Option<GpuMtseedSearchBatch> {
        if self.is_done() { return None; }
        let remaining = self.total - self.current_seed;
        let to_process = (self.limits.max_messages_per_dispatch as u64).min(remaining) as u32;

        let (mut candidates, processed) = self.pipeline
            .dispatch(to_process, self.current_seed as u32)
            .await;

        self.current_seed += u64::from(processed);

        // めざパフィルタ後処理
        if self.iv_filter.hidden_power_types.is_some()
           || self.iv_filter.hidden_power_min_power.is_some()
        {
            candidates.retain(|c| self.iv_filter.matches(&c.ivs));
        }

        Some(GpuMtseedSearchBatch {
            candidates,
            progress: self.progress(),
            processed: self.current_seed,
            total: self.total,
        })
    }

    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter))]
    pub fn is_done(&self) -> bool {
        self.current_seed >= self.total
    }

    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(getter))]
    pub fn progress(&self) -> f64 {
        self.current_seed as f64 / self.total as f64
    }
}
```

### 4.4 lib.rs 変更

```rust
// gpu モジュールの re-export に追加
#[cfg(feature = "gpu")]
pub use gpu::{
    GpuDatetimeSearchIterator, GpuDeviceContext, GpuKind, GpuProfile, GpuSearchBatch,
    GpuMtseedSearchIterator, GpuMtseedSearchBatch,
    SearchJobLimits,
};
```

### 4.5 GPU Worker 変更 (`gpu.worker.ts`)

```typescript
// GpuMtseedSearchIterator のインポート追加
import {
  GpuDatetimeSearchIterator,
  GpuMtseedSearchIterator,
  health_check,
} from '../wasm/wasm_pkg.js';

// start ハンドラ内で gpu-mtseed-iv タスクを処理
case 'start': {
  if (data.task.kind === 'gpu-mtseed') {
    await runGpuSearch(data.taskId, data.task);
  } else if (data.task.kind === 'gpu-mtseed-iv') {
    await runGpuMtseedSearch(data.taskId, data.task);
  } else {
    // error
  }
}
```

### 4.6 Worker Types 変更 (`types.ts`)

```typescript
/**
 * GPU MT Seed IV 全探索タスク
 */
export interface GpuMtseedIvSearchTask {
  kind: 'gpu-mtseed-iv';
  context: MtseedSearchContext;
}

// SearchTask union に追加
export type SearchTask =
  | EggDatetimeSearchTask
  | MtseedDatetimeSearchTask
  | GpuMtseedSearchTask
  | GpuMtseedIvSearchTask   // 追加
  | MtseedSearchTask
  | TrainerInfoSearchTask
  | PokemonListTask
  | EggListTask;
```

### 4.7 `ITEMS_PER_THREAD` の SearchJobLimits 対応

パイプライン作成時に検索種別ごとの `ITEMS_PER_THREAD` を使用する。`SearchJobLimits` に新設する `mtseed_items_per_thread()` メソッドで管理する:

```rust
impl SearchJobLimits {
    pub fn mtseed_items_per_thread(&self) -> u32 {
        // MT init+twist は SHA-1 より重いため、
        // datetime_search 用の items_per_thread より小さい値にする
        match self.items_per_thread {
            32 => 8,   // Discrete: 32 → 8
            16 => 4,   // Integrated: 16 → 4
            _  => 2,   // Mobile/Unknown: 4 → 2
        }
    }
}
```

## 5. テスト方針

### 5.1 Rust ユニットテスト

| テスト | 検証内容 |
|--------|----------|
| `test_gpu_mtseed_search_any_filter` | `IvFilter::any()` で小範囲 (e.g. Seed 0-999) を検索し、全 Seed が候補に含まれることを確認 |
| `test_gpu_mtseed_search_6v` | `IvFilter::six_v()` で全探索し、CPU 版と同じ結果が得られることを確認 |
| `test_gpu_mtseed_search_known_seed` | 既知の Seed (e.g. `0x1A2B3C4D` → 特定 IV) に対して結果が一致することを確認 |
| `test_gpu_mtseed_search_roamer` | roamer モードで CPU 版と同じ並び替え結果が得られることを確認 |
| `test_gpu_mtseed_search_with_offset` | offset != 7 で CPU 版と一致することを確認 |
| `test_gpu_mtseed_search_progress` | `progress()` が 0.0 → 1.0 に単調増加することを確認 |
| `test_gpu_mtseed_search_hidden_power_filter` | めざパフィルタ (CPU 後処理) が正しく動作することを確認 |

### 5.2 CPU SIMD ユニットテスト

| テスト | 検証内容 |
|--------|----------|
| `test_generate_rng_ivs_with_offset_x4_matches_scalar` | `generate_rng_ivs_with_offset_x4` の出力がスカラー版 `generate_rng_ivs_with_offset` × 4 と完全一致すること |
| `test_generate_rng_ivs_with_offset_x4_roamer` | roamer モードでスカラー版と一致すること |
| `test_mtseed_searcher_simd_consistency` | SIMD 化後の `MtseedSearcher` が変更前と同じ結果を返すこと (Seed 0〜65535 で検証) |

### 5.3 Rust 統合テスト

| テスト | 検証内容 |
|--------|----------|
| `test_gpu_vs_cpu_mtseed_search_consistency` | Seed 0〜65535 の範囲で GPU 版と CPU 版 (`MtseedSearcher`) の結果が完全一致することを確認 |

### 5.4 GPU テスト実行条件

GPU テストは `#[cfg(feature = "gpu")]` で Gate し、GPU が利用できない環境では自動スキップする:

```rust
#[test]
fn test_gpu_mtseed_search_known_seed() {
    let result = pollster::block_on(GpuMtseedSearchIterator::create(...));
    let Ok(mut iterator) = result else {
        eprintln!("GPU not available, skipping test");
        return;
    };
    // ...
}
```

### 5.5 ベンチマーク (criterion)

```rust
// benches/gpu_mtseed_search.rs
#![cfg(feature = "gpu")]

fn bench_gpu_mtseed_search(c: &mut Criterion) {
    let mut group = c.benchmark_group("gpu_mtseed_search");
    // GPU 全探索は 1 走行あたり約 1 分。collect 側告知の overhead もあるため
    // measurement_time + sample_size を十分に確保する
    group.measurement_time(Duration::from_secs(120));
    group.sample_size(10);
    // iter_custom で 1 回の全探索を測定 (gpu_datetime_search.rs の run_full_search パターンと同様)
}
```

GPU 全探索 ($2^{32}$ Seed) は 1 走行あたり約 60 秒を要するため:
- `measurement_time(Duration::from_secs(120))`: criterion のウォームアップ + 測定に十分な時間を確保
- `sample_size(10)`: 統計的に十分でありつつ、総実行時間を約 10〒15 分に抑える

### 5.6 TypeScript 統合テスト

| テスト | 検証内容 | 環境 |
|--------|----------|------|
| `GpuMtseedSearchIterator.create` | WASM 経由でイテレータ作成が成功すること | Browser Mode |
| GPU Worker `gpu-mtseed-iv` | Worker 経由で検索が完了し、結果が返ること | Browser Mode |

GPU テストは `describe.skipIf(!navigator.gpu)` でスキップ。

## 6. 実装チェックリスト

### GPU 経路

- [ ] WGSL シェーダー (`wasm-pkg/src/gpu/mtseed_search/shader.wgsl`) 作成
- [ ] パイプライン (`wasm-pkg/src/gpu/mtseed_search/pipeline.rs`) 実装
- [ ] イテレータ (`wasm-pkg/src/gpu/mtseed_search/iterator.rs`) 実装
- [ ] モジュール宣言 (`wasm-pkg/src/gpu/mtseed_search/mod.rs`) 作成
- [ ] `wasm-pkg/src/gpu/mod.rs` にサブモジュール追加・re-export
- [ ] `SearchJobLimits` に `mtseed_items_per_thread()` メソッド追加
- [ ] `GpuMtseedSearchBatch` 型定義 (`wasm-pkg/src/types/search.rs`)
- [ ] `wasm-pkg/src/lib.rs` に re-export 追加
- [ ] Rust ユニットテスト (iterator.rs 内)
- [ ] GPU vs CPU 整合性テスト
- [ ] ベンチマーク (`wasm-pkg/benches/gpu_mtseed_search.rs`) 作成
- [ ] `Cargo.toml` に `[[bench]]` エントリ追加

### CPU SIMD 化

- [ ] `generate_rng_ivs_with_offset_x4` 追加 (`wasm-pkg/src/generation/algorithm/iv.rs`)
- [ ] `MtseedSearcher::next_batch()` を `Mt19937x4` ベースに変更 (`wasm-pkg/src/misc/mtseed_search.rs`)
- [ ] CPU SIMD ユニットテスト (スカラー版との結果一致検証)

### Worker 統合

- [ ] `src/workers/types.ts` に `GpuMtseedIvSearchTask` 型追加
- [ ] `src/workers/gpu.worker.ts` に `gpu-mtseed-iv` ハンドリング追加

### 検証

- [ ] `cargo clippy --all-targets --features gpu -- -D warnings` パス
- [ ] `cargo test --features gpu` パス (GPU 環境)
- [ ] `cargo test` パス (GPU なし環境)
