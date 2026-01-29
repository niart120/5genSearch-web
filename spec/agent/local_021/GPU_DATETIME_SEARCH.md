# GPU 起動時刻検索 (MT Seed) 仕様書

## 1. 概要

### 1.1 目的

WebGPU による GPU 並列計算で MT Seed 起動時刻検索を高速化する。現行の `MtseedDatetimeSearcher` (CPU 版) と同等の機能を GPU で実装し、検索速度を大幅に向上させる。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| MT Seed | MT19937 の初期化に使用される 32bit Seed。LCG Seed の上位 32bit から導出 |
| LCG Seed | 64bit 線形合同法の Seed。起動時刻パラメータから SHA-1 ハッシュで生成 |
| SHA-1 メッセージ | DS パラメータ・起動時刻を BCD 形式で構築した 13 ワード (52 bytes) のデータ |
| 起動時刻検索 | 指定 MT Seed に一致する LCG Seed を生成する起動時刻を探索する処理 |
| ワークグループ | GPU 計算シェーダーの実行単位。複数スレッドで構成 |
| ディスパッチ | GPU カーネルの実行命令。ワークグループ数を指定 |
| セグメント | Timer0 × VCount × KeyCode の組み合わせ単位 |
| 候補バッファ | GPU で検出したマッチ結果を格納するバッファ |

### 1.3 背景・問題

| 項目 | CPU 版の制約 | GPU 版の解決策 |
|------|-------------|---------------|
| 処理速度 | 単一 Worker で逐次処理 | 数千スレッドの並列 SHA-1 計算 |
| 検索範囲 | 1 日分で数秒〜数十秒 | 1 日分を 1 秒未満で処理可能 |
| スケーラビリティ | Worker 追加で線形向上のみ | GPU 性能に応じた自動最適化 |

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 検索速度 | CPU 比 10〜100 倍 (GPU 性能依存) |
| 応答性 | バックグラウンド実行でメインスレッド非ブロック |
| 省電力 | CPU 負荷軽減 (モバイル環境で有効) |

### 1.5 着手条件

- `datetime_search/mtseed.rs` (CPU 版) が完成していること
- WebGPU 対応ブラウザでの動作を前提とする
- GPU 非対応環境では CPU 版にフォールバック

---

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/lib/webgpu/kernel/mtseed-datetime-search.wgsl` | 新規 | SHA-1 計算シェーダー |
| `src/lib/webgpu/mtseed-datetime-search/types.ts` | 新規 | 型定義 |
| `src/lib/webgpu/mtseed-datetime-search/prepare-job.ts` | 新規 | ジョブ準備 |
| `src/lib/webgpu/mtseed-datetime-search/engine.ts` | 新規 | GPU エンジン |
| `src/lib/webgpu/mtseed-datetime-search/controller.ts` | 新規 | 進捗管理・コールバック |
| `src/lib/webgpu/utils/device-context.ts` | 変更 | 共通コンテキスト (既存活用) |
| `src/workers/mtseed-datetime-search-worker-gpu.ts` | 新規 | GPU Worker |

---

## 3. 設計方針

### 3.1 アーキテクチャ概要

```
[Main Thread]
    │
    ├─ MtseedDatetimeSearchParams (検索条件)
    │
    └─ Worker.postMessage()
           │
           ▼
[GPU Worker]
    │
    ├─ prepareSearchJob() → セグメント分割
    │
    ├─ GpuEngine.initialize() → デバイス・パイプライン初期化
    │
    └─ for each segment:
           │
           ├─ uniform バッファ書き込み
           │
           ├─ dispatch() → WGSL カーネル実行
           │
           ├─ 候補バッファ読み出し
           │
           └─ onResult() コールバック
```

### 3.2 セグメント分割戦略

参照実装と同様に、以下の組み合わせでセグメントを分割する:

```
セグメント = { timer0, vcount, keyCode, baseSecondOffset, messageCount }
```

1 セグメントあたりの `messageCount` はデバイス制限から導出:

```typescript
const maxMessagesPerDispatch = limits.workgroupSize * limits.maxWorkgroups;
```

### 3.3 データフロー

```
[TypeScript]                    [WGSL Shader]
    │                                │
    ├─ SearchConstants (uniform)  ──▶ constants
    │   ├─ timer0_vcount_swapped     ├─ メッセージ構築
    │   ├─ mac_lower                 │
    │   ├─ data7_swapped            │
    │   ├─ key_input_swapped        │
    │   ├─ hardware_type            │
    │   ├─ start_year               │
    │   ├─ start_day_of_year        │
    │   ├─ start_day_of_week        │
    │   ├─ hour/minute/second_range │
    │   └─ nazo[5]                  │
    │                                │
    ├─ DispatchState (storage)    ──▶ state
    │   ├─ message_count            ├─ global_id → 日時計算
    │   ├─ base_second_offset       │
    │   └─ candidate_capacity       │
    │                                │
    ├─ TargetSeeds (storage)      ──▶ target_seeds
    │   ├─ count                    ├─ マッチ判定
    │   └─ values[]                 │
    │                                │
    └─ MatchOutput (storage)      ◀── output_buffer
        ├─ match_count              └─ 結果書き込み
        └─ records[]
```

### 3.4 SHA-1 メッセージ構造

DS の起動時刻から生成される SHA-1 メッセージ (13 ワード = 52 bytes):

| Word | 内容 | 形式 |
|------|------|------|
| 0-4 | nazo 値 (ROM 依存) | u32 × 5 |
| 5 | timer0 << 16 \| vcount | swapped |
| 6 | mac_lower | swapped |
| 7 | data7 (MAC + frame) | swapped |
| 8 | 日付 (年月日曜日) | BCD |
| 9 | 時刻 (時分秒 + PM フラグ) | BCD |
| 10 | 0 | - |
| 11 | 0 | - |
| 12 | key_input | swapped |

パディング:

| Word | 内容 |
|------|------|
| 13 | 0x80000000 (パディング開始) |
| 14 | 0 |
| 15 | 0x000001A0 (メッセージ長 = 416 bits) |

### 3.5 GPU プロファイル

デバイス能力に応じた最適化パラメータ:

| プロファイル | workgroupSize | maxDispatchesInFlight |
|-------------|---------------|----------------------|
| Discrete | 256 | 4 |
| Integrated | 256 | 2 |
| Mobile | 128 | 1 |
| Unknown | 128 | 1 |

---

## 4. 実装仕様

### 4.1 WGSL シェーダー

#### 4.1.1 バインディング定義

```wgsl
// ワークグループサイズ (TypeScript 側で置換)
const WORKGROUP_SIZE: u32 = WORKGROUP_SIZE_PLACEHOLDERu;

struct DispatchState {
    message_count: u32,
    base_second_offset: u32,
    candidate_capacity: u32,
    padding: u32,
};

struct SearchConstants {
    timer0_vcount_swapped: u32,
    mac_lower: u32,
    data7_swapped: u32,
    key_input_swapped: u32,
    hardware_type: u32,
    start_year: u32,
    start_day_of_year: u32,
    start_day_of_week: u32,
    hour_range_start: u32,
    hour_range_count: u32,
    minute_range_start: u32,
    minute_range_count: u32,
    second_range_start: u32,
    second_range_count: u32,
    nazo0: u32,
    nazo1: u32,
    nazo2: u32,
    nazo3: u32,
    nazo4: u32,
    reserved0: u32,
};

struct TargetSeedBuffer {
    count: u32,
    values: array<u32>,
};

struct MatchRecord {
    message_index: u32,
    seed: u32,
};

struct MatchOutputBuffer {
    match_count: atomic<u32>,
    records: array<MatchRecord>,
};

@group(0) @binding(0) var<storage, read> state: DispatchState;
@group(0) @binding(1) var<uniform> constants: SearchConstants;
@group(0) @binding(2) var<storage, read> target_seeds: TargetSeedBuffer;
@group(0) @binding(3) var<storage, read_write> output_buffer: MatchOutputBuffer;
```

#### 4.1.2 BCD ルックアップテーブル

```wgsl
const BCD_LOOKUP: array<u32, 100> = array<u32, 100>(
    0x00u, 0x01u, 0x02u, 0x03u, 0x04u, 0x05u, 0x06u, 0x07u, 0x08u, 0x09u,
    0x10u, 0x11u, 0x12u, 0x13u, 0x14u, 0x15u, 0x16u, 0x17u, 0x18u, 0x19u,
    // ... (0-99)
    0x90u, 0x91u, 0x92u, 0x93u, 0x94u, 0x95u, 0x96u, 0x97u, 0x98u, 0x99u
);
```

#### 4.1.3 日時計算

```wgsl
fn is_leap_year(year: u32) -> bool {
    return (year % 4u == 0u) && ((year % 100u != 0u) || (year % 400u == 0u));
}

fn month_day_from_day_of_year(day_of_year: u32, leap: bool) -> vec2<u32> {
    // 月と日を返す (1-indexed)
    // ...
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn sha1_generate(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let global_linear_index = global_id.x;
    if (global_linear_index >= state.message_count) {
        return;
    }

    // 時刻範囲から日時を計算
    let combos_per_day = constants.hour_range_count 
                       * constants.minute_range_count 
                       * constants.second_range_count;
    let total_second_offset = state.base_second_offset + global_linear_index;

    let day_offset = total_second_offset / combos_per_day;
    let remainder = total_second_offset - day_offset * combos_per_day;

    // hour, minute, second を算出
    let entries_per_hour = constants.minute_range_count * constants.second_range_count;
    let hour_index = remainder / entries_per_hour;
    let remainder_after_hour = remainder - hour_index * entries_per_hour;
    let minute_index = remainder_after_hour / constants.second_range_count;
    let second_index = remainder_after_hour - minute_index * constants.second_range_count;

    let hour = constants.hour_range_start + hour_index;
    let minute = constants.minute_range_start + minute_index;
    let second = constants.second_range_start + second_index;

    // 年・月・日を計算
    var year = constants.start_year;
    var day_of_year = constants.start_day_of_year + day_offset;
    loop {
        let year_length = select(365u, 366u, is_leap_year(year));
        if (day_of_year <= year_length) { break; }
        day_of_year = day_of_year - year_length;
        year = year + 1u;
    }

    let leap = is_leap_year(year);
    let month_day = month_day_from_day_of_year(day_of_year, leap);
    let month = month_day.x;
    let day = month_day.y;

    let day_of_week = (constants.start_day_of_week + day_offset) % 7u;

    // BCD 形式で日時ワードを構築
    let year_mod = year % 100u;
    let date_word = (BCD_LOOKUP[year_mod] << 24u) |
                    (BCD_LOOKUP[month] << 16u) |
                    (BCD_LOOKUP[day] << 8u) |
                    BCD_LOOKUP[day_of_week];

    let is_pm = (constants.hardware_type <= 1u) && (hour >= 12u);
    let pm_flag = select(0u, 1u, is_pm);
    let time_word = (pm_flag << 30u) |
                    (BCD_LOOKUP[hour] << 24u) |
                    (BCD_LOOKUP[minute] << 16u) |
                    (BCD_LOOKUP[second] << 8u);

    // SHA-1 メッセージ構築
    var w: array<u32, 16>;
    w[0] = constants.nazo0;
    w[1] = constants.nazo1;
    w[2] = constants.nazo2;
    w[3] = constants.nazo3;
    w[4] = constants.nazo4;
    w[5] = constants.timer0_vcount_swapped;
    w[6] = constants.mac_lower;
    w[7] = constants.data7_swapped;
    w[8] = date_word;
    w[9] = time_word;
    w[10] = 0u;
    w[11] = 0u;
    w[12] = constants.key_input_swapped;
    w[13] = 0x80000000u;
    w[14] = 0u;
    w[15] = 0x000001A0u;

    // SHA-1 計算
    let hash = sha1_compress(w);

    // MT Seed = hash[0] (上位 32bit)
    let mt_seed = hash[0];

    // ターゲットとマッチ判定
    if (linear_search(mt_seed)) {
        let idx = atomicAdd(&output_buffer.match_count, 1u);
        if (idx < state.candidate_capacity) {
            output_buffer.records[idx].message_index = global_linear_index;
            output_buffer.records[idx].seed = mt_seed;
        }
    }
}
```

#### 4.1.4 SHA-1 圧縮関数

```wgsl
fn left_rotate(value: u32, amount: u32) -> u32 {
    return (value << amount) | (value >> (32u - amount));
}

fn sha1_compress(w_in: array<u32, 16>) -> array<u32, 5> {
    var w = w_in;
    var a: u32 = 0x67452301u;
    var b: u32 = 0xEFCDAB89u;
    var c: u32 = 0x98BADCFEu;
    var d: u32 = 0x10325476u;
    var e: u32 = 0xC3D2E1F0u;

    for (var i: u32 = 0u; i < 80u; i = i + 1u) {
        let w_index = i & 15u;
        var w_value: u32;
        if (i < 16u) {
            w_value = w[w_index];
        } else {
            w_value = left_rotate(
                w[(w_index + 13u) & 15u] ^
                w[(w_index + 8u) & 15u] ^
                w[(w_index + 2u) & 15u] ^
                w[w_index],
                1u
            );
            w[w_index] = w_value;
        }

        var f: u32;
        var k: u32;
        if (i < 20u) {
            f = (b & c) | ((~b) & d);
            k = 0x5A827999u;
        } else if (i < 40u) {
            f = b ^ c ^ d;
            k = 0x6ED9EBA1u;
        } else if (i < 60u) {
            f = (b & c) | (b & d) | (c & d);
            k = 0x8F1BBCDCu;
        } else {
            f = b ^ c ^ d;
            k = 0xCA62C1D6u;
        }

        let temp = left_rotate(a, 5u) + f + e + k + w_value;
        e = d;
        d = c;
        c = left_rotate(b, 30u);
        b = a;
        a = temp;
    }

    return array<u32, 5>(
        0x67452301u + a,
        0xEFCDAB89u + b,
        0x98BADCFEu + c,
        0x10325476u + d,
        0xC3D2E1F0u + e
    );
}
```

#### 4.1.5 線形探索

```wgsl
fn linear_search(code: u32) -> bool {
    for (var i = 0u; i < target_seeds.count; i = i + 1u) {
        if (target_seeds.values[i] == code) {
            return true;
        }
    }
    return false;
}
```

### 4.2 TypeScript 型定義

```typescript
// src/lib/webgpu/mtseed-datetime-search/types.ts

export interface MtseedDatetimeGpuJobLimits {
  workgroupSize: number;
  maxWorkgroups: number;
  candidateCapacityPerDispatch: number;
  maxDispatchesInFlight: number;
}

export interface MtseedDatetimeGpuSegment {
  id: string;
  timer0: number;
  vcount: number;
  keyCode: number;
  messageCount: number;
  baseSecondOffset: number;
  globalMessageOffset: number;
  workgroupCount: number;
  getUniformWords: () => Uint32Array;
}

export interface MtseedDatetimeGpuJob {
  segments: MtseedDatetimeGpuSegment[];
  targetSeeds: Uint32Array;
  summary: {
    totalMessages: number;
    totalSegments: number;
    targetSeedCount: number;
    rangeSeconds: number;
  };
  timePlan: {
    startDate: Date;
    combosPerDay: number;
  };
  conditions: MtseedDatetimeSearchParams;
}

export interface MtseedDatetimeGpuResult {
  mt_seed: number;
  lcg_seed: bigint;
  datetime: Date;
  timer0: number;
  vcount: number;
  keyCode: number;
}

export interface MtseedDatetimeGpuProgress {
  processedMessages: number;
  totalMessages: number;
  processedSegments: number;
  totalSegments: number;
  matchesFound: number;
}

export interface MtseedDatetimeGpuCallbacks {
  onProgress: (progress: MtseedDatetimeGpuProgress) => void;
  onResult: (result: MtseedDatetimeGpuResult) => void;
  onComplete: (message: string) => void;
  onError: (error: string, errorCode?: string) => void;
}
```

### 4.3 ジョブ準備

```typescript
// src/lib/webgpu/mtseed-datetime-search/prepare-job.ts

export function prepareMtseedDatetimeGpuJob(
  params: MtseedDatetimeSearchParams,
  limits: MtseedDatetimeGpuJobLimits
): MtseedDatetimeGpuJob {
  // 1. 時刻範囲を正規化
  const timePlan = resolveTimePlan(params.time_range, params.search_range);

  // 2. セグメント展開 (Timer0 × VCount × KeyCode)
  const segments: MtseedDatetimeGpuSegment[] = [];
  let globalMessageOffset = 0;

  for (const condition of expandConditions(params)) {
    const { timer0, vcount, keyCode } = condition;
    
    // メッセージ数を制限内で分割
    let remainingMessages = timePlan.totalCombos;
    let baseSecondOffset = 0;

    while (remainingMessages > 0) {
      const messageCount = Math.min(
        remainingMessages,
        limits.workgroupSize * limits.maxWorkgroups
      );
      const workgroupCount = Math.ceil(messageCount / limits.workgroupSize);

      segments.push({
        id: `${timer0}-${vcount}-${keyCode}-${baseSecondOffset}`,
        timer0,
        vcount,
        keyCode,
        messageCount,
        baseSecondOffset,
        globalMessageOffset,
        workgroupCount,
        getUniformWords: () => encodeSearchConstants({
          timer0,
          vcount,
          keyCode,
          params,
          timePlan,
        }),
      });

      globalMessageOffset += messageCount;
      baseSecondOffset += messageCount;
      remainingMessages -= messageCount;
    }
  }

  // 3. ターゲット Seed 配列
  const targetSeeds = new Uint32Array(params.target_seeds.map(s => s.value));

  return {
    segments,
    targetSeeds,
    summary: {
      totalMessages: globalMessageOffset,
      totalSegments: segments.length,
      targetSeedCount: targetSeeds.length,
      rangeSeconds: params.search_range.range_seconds,
    },
    timePlan: {
      startDate: timePlan.startDate,
      combosPerDay: timePlan.combosPerDay,
    },
    conditions: params,
  };
}
```

### 4.4 GPU エンジン

```typescript
// src/lib/webgpu/mtseed-datetime-search/engine.ts

export interface MtseedDatetimeGpuEngine {
  isAvailable: () => boolean;
  initialize: () => Promise<void>;
  deriveJobLimits: (preferences?: Partial<MtseedDatetimeGpuJobLimits>) 
    => MtseedDatetimeGpuJobLimits;
  dispatch: (segment: MtseedDatetimeGpuSegment) => Promise<Uint32Array>;
  destroy: () => void;
}

export function createMtseedDatetimeGpuEngine(): MtseedDatetimeGpuEngine {
  let device: GPUDevice | null = null;
  let pipeline: GPUComputePipeline | null = null;
  let bindGroupLayout: GPUBindGroupLayout | null = null;
  let targetSeedBuffer: GPUBuffer | null = null;

  return {
    isAvailable: () => typeof navigator !== 'undefined' && 'gpu' in navigator,

    async initialize() {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });
      if (!adapter) throw new Error('WebGPU adapter not found');

      device = await adapter.requestDevice();

      const module = device.createShaderModule({
        code: buildShaderSource(256), // workgroupSize
      });

      bindGroupLayout = device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
          { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        ],
      });

      pipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
        compute: { module, entryPoint: 'sha1_generate' },
      });
    },

    deriveJobLimits(preferences = {}) {
      const limits = device?.limits ?? {
        maxComputeWorkgroupSizeX: 256,
        maxComputeWorkgroupsPerDimension: 65535,
        maxStorageBufferBindingSize: 128 * 1024 * 1024,
      };

      return {
        workgroupSize: preferences.workgroupSize ?? 256,
        maxWorkgroups: Math.min(
          preferences.maxWorkgroups ?? limits.maxComputeWorkgroupsPerDimension,
          limits.maxComputeWorkgroupsPerDimension
        ),
        candidateCapacityPerDispatch: preferences.candidateCapacityPerDispatch ?? 4096,
        maxDispatchesInFlight: preferences.maxDispatchesInFlight ?? 2,
      };
    },

    async dispatch(segment: MtseedDatetimeGpuSegment) {
      if (!device || !pipeline || !bindGroupLayout) {
        throw new Error('Engine not initialized');
      }

      // バッファ作成・書き込み
      // ...

      // ディスパッチ実行
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(segment.workgroupCount);
      pass.end();

      // 結果読み出し
      // ...

      return matchResults;
    },

    destroy() {
      targetSeedBuffer?.destroy();
      device = null;
    },
  };
}
```

### 4.5 Worker 実装

```typescript
// src/workers/mtseed-datetime-search-worker-gpu.ts

import { createMtseedDatetimeGpuEngine } from '@/lib/webgpu/mtseed-datetime-search/engine';
import { prepareMtseedDatetimeGpuJob } from '@/lib/webgpu/mtseed-datetime-search/prepare-job';

const engine = createMtseedDatetimeGpuEngine();

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'START':
      await runSearch(payload);
      break;
    case 'STOP':
      // 停止処理
      break;
  }
};

async function runSearch(params: MtseedDatetimeSearchParams) {
  if (!engine.isAvailable()) {
    self.postMessage({ type: 'ERROR', error: 'WebGPU not available' });
    return;
  }

  try {
    await engine.initialize();
    const limits = engine.deriveJobLimits();
    const job = prepareMtseedDatetimeGpuJob(params, limits);

    let processedMessages = 0;
    let matchesFound = 0;

    for (const segment of job.segments) {
      const matches = await engine.dispatch(segment);

      // 結果を CPU で検証・変換
      for (const match of matches) {
        const result = verifyAndConvertMatch(match, segment, job);
        if (result) {
          self.postMessage({ type: 'RESULT', result });
          matchesFound++;
        }
      }

      processedMessages += segment.messageCount;
      self.postMessage({
        type: 'PROGRESS',
        progress: {
          processedMessages,
          totalMessages: job.summary.totalMessages,
          matchesFound,
        },
      });
    }

    self.postMessage({ type: 'COMPLETE', message: 'Search completed' });
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: String(error) });
  } finally {
    engine.destroy();
  }
}
```

---

## 5. テスト方針

### 5.1 ユニットテスト

| テストケース | 検証内容 |
|--------------|----------|
| `test_bcd_lookup` | BCD 変換テーブルの正確性 |
| `test_date_calculation` | 年月日・曜日計算の正確性 |
| `test_time_calculation` | 時分秒・PM フラグ計算の正確性 |
| `test_message_construction` | SHA-1 メッセージ構築の正確性 |
| `test_segment_split` | セグメント分割の正確性 |

### 5.2 統合テスト

| テストケース | 検証内容 |
|--------------|----------|
| `test_gpu_cpu_consistency` | GPU 結果と CPU 結果の一致 |
| `test_known_seed_detection` | 既知の MT Seed が正しく検出されること |
| `test_progress_callback` | 進捗コールバックの正確性 |

### 5.3 パフォーマンステスト

| テストケース | 検証内容 |
|--------------|----------|
| `bench_gpu_vs_cpu` | GPU / CPU 速度比較 |
| `bench_large_range` | 大規模検索範囲での性能 |

---

## 6. 実装チェックリスト

- [ ] `mtseed-datetime-search.wgsl` 作成
  - [ ] バインディング定義
  - [ ] BCD ルックアップテーブル
  - [ ] 日時計算関数
  - [ ] SHA-1 圧縮関数
  - [ ] 線形探索関数
  - [ ] メインエントリポイント
- [ ] `types.ts` 作成
  - [ ] ジョブ制限値型
  - [ ] セグメント型
  - [ ] 結果型
  - [ ] コールバック型
- [ ] `prepare-job.ts` 作成
  - [ ] 時刻範囲正規化
  - [ ] セグメント分割
  - [ ] uniform エンコード
- [ ] `engine.ts` 作成
  - [ ] デバイス初期化
  - [ ] パイプライン作成
  - [ ] バッファ管理
  - [ ] ディスパッチ実行
- [ ] `controller.ts` 作成
  - [ ] 進捗管理
  - [ ] 結果検証・変換
  - [ ] コールバック集約
- [ ] Worker 実装
  - [ ] メッセージハンドリング
  - [ ] エラーハンドリング
  - [ ] 停止処理
- [ ] ユニットテスト
- [ ] 統合テスト (CPU 結果との一致)
- [ ] パフォーマンステスト

---

## 7. 関連ドキュメント

| ドキュメント | 概要 |
|-------------|------|
| [local_007 (DEPRECATED)](../local_007/GPU_COMPUTE.md) | 旧 GPU 計算基盤仕様 (欠番) |
| [mig_002/gpu/device-context.md](../mig_002/gpu/device-context.md) | GPU デバイスコンテキスト設計 |
| [mig_002/gpu/api.md](../mig_002/gpu/api.md) | GPU API 設計 |
| [datetime_search/mtseed.rs](../../../wasm-pkg/src/datetime_search/mtseed.rs) | CPU 版実装 (参照) |
