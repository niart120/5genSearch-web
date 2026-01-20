# 起動時刻検索 GPU カーネル設計

datetime-search 専用の GPU シェーダー・分割戦略設計。

## 1. 概要

### 1.1 対象範囲

本ドキュメントでは datetime-search 固有の GPU 計算ロジックを定義:

- 分割戦略（セグメント → ディスパッチ → ワークグループ）
- WGSL シェーダー（SHA-1 計算、日時メッセージ構築、Seed 照合）
- Rust 側のディスパッチ制御

GPU 汎用基盤（デバイスコンテキスト、制限値導出）は [gpu/device-context.md](../gpu/device-context.md) を参照。

### 1.2 アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DatetimeSearcherGpu (WASM)                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │ GpuDeviceContext│  │ DispatchPlanner  │  │ DatetimeSearchPipeline│  │
│  │ (汎用基盤)       │→│ (本ドキュメント)  │→│ (本ドキュメント)       │  │
│  └─────────────────┘  └──────────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓ wgpu Dispatch
┌─────────────────────────────────────────────────────────────────────────┐
│ GPU Hardware                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ datetime_search.wgsl                                            │   │
│  │  - SHA-1 計算                                                   │   │
│  │  - 日時 → メッセージ構築                                        │   │
│  │  - Seed 照合                                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. 分割戦略

### 2.1 分割階層

```
探索空間
  └─ セグメント (Timer0 × VCount × KeyCode の組み合わせ)
       └─ ディスパッチ (max_messages_per_dispatch 単位)
            └─ ワークグループ (workgroup_size スレッド)
                 └─ スレッド (1秒 = 1メッセージ)
```

### 2.2 セグメント定義

```rust
/// セグメント識別子
///
/// Timer0/VCount/KeyCode の組み合わせを一意に識別。
/// CPU 経路と共通の識別子形式を使用。
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct SegmentId {
    pub timer0: u16,
    pub vcount: u8,
    pub key_code: u32,
}

impl SegmentId {
    pub fn new(timer0: u16, vcount: u8, key_code: u32) -> Self {
        Self { timer0, vcount, key_code }
    }
}

/// GPU 検索セグメント
#[derive(Clone, Debug)]
pub struct GpuSegment {
    pub id: SegmentId,
    /// このセグメント内の総時刻数（秒単位）
    pub total_seconds: u32,
    /// 処理済み時刻数
    pub processed_seconds: u32,
}

impl GpuSegment {
    pub fn remaining(&self) -> u32 {
        self.total_seconds.saturating_sub(self.processed_seconds)
    }

    pub fn is_complete(&self) -> bool {
        self.processed_seconds >= self.total_seconds
    }
}
```

### 2.3 ディスパッチチャンク

```rust
/// 1回のディスパッチで処理する単位
#[derive(Clone, Debug)]
pub struct DispatchChunk {
    pub segment_id: SegmentId,
    /// セグメント内での開始オフセット（秒）
    pub offset: u32,
    /// 処理する時刻数
    pub count: u32,
    /// ワークグループ数
    pub workgroup_count: u32,
}
```

### 2.4 ディスパッチプランナー

```rust
use crate::gpu::SearchJobLimits;

/// ディスパッチプランナー
///
/// セグメント列を受け取り、制限値に従ってチャンクを生成。
pub struct DispatchPlanner {
    segments: Vec<GpuSegment>,
    current_index: usize,
    limits: SearchJobLimits,
}

impl DispatchPlanner {
    pub fn new(segments: Vec<GpuSegment>, limits: SearchJobLimits) -> Self {
        Self {
            segments,
            current_index: 0,
            limits,
        }
    }

    /// 次のディスパッチチャンクを取得
    pub fn next_chunk(&mut self) -> Option<DispatchChunk> {
        loop {
            let segment = self.segments.get_mut(self.current_index)?;

            if segment.is_complete() {
                self.current_index += 1;
                continue;
            }

            let remaining = segment.remaining();
            let count = remaining.min(self.limits.max_messages_per_dispatch);
            let workgroup_count = count.div_ceil(self.limits.workgroup_size);

            let chunk = DispatchChunk {
                segment_id: segment.id.clone(),
                offset: segment.processed_seconds,
                count,
                workgroup_count,
            };

            segment.processed_seconds += count;
            return Some(chunk);
        }
    }

    /// 進捗率を取得 (0.0 - 1.0)
    pub fn progress(&self) -> f64 {
        let total: u64 = self.segments.iter().map(|s| s.total_seconds as u64).sum();
        let done: u64 = self.segments.iter().map(|s| s.processed_seconds as u64).sum();
        if total == 0 { 1.0 } else { done as f64 / total as f64 }
    }
}
```

### 2.5 パイプライン深度制御

```rust
use std::collections::VecDeque;

/// ディスパッチスロット
///
/// GPU バッファを保持し、再利用可能。
pub struct DispatchSlot {
    pub id: usize,
    pub state_buffer: wgpu::Buffer,
    pub constants_buffer: wgpu::Buffer,
    pub output_buffer: wgpu::Buffer,
    pub readback_buffer: wgpu::Buffer,
}

/// 実行中ディスパッチの追跡情報
struct InFlightDispatch {
    slot_id: usize,
    chunk: DispatchChunk,
}

/// パイプライン深度制御
///
/// 複数ディスパッチの同時実行を管理。
pub struct FlightController {
    slots: Vec<DispatchSlot>,
    available: VecDeque<usize>,
    in_flight: VecDeque<InFlightDispatch>,
}

impl FlightController {
    pub fn new(slots: Vec<DispatchSlot>) -> Self {
        let available = (0..slots.len()).collect();
        Self {
            slots,
            available,
            in_flight: VecDeque::new(),
        }
    }

    /// 利用可能なスロットを取得
    pub fn acquire(&mut self) -> Option<&mut DispatchSlot> {
        let id = self.available.pop_front()?;
        Some(&mut self.slots[id])
    }

    /// ディスパッチを発行したことを記録
    pub fn submit(&mut self, slot_id: usize, chunk: DispatchChunk) {
        self.in_flight.push_back(InFlightDispatch { slot_id, chunk });
    }

    /// 完了したディスパッチを回収（FIFO順）
    pub fn complete(&mut self) -> Option<(usize, DispatchChunk)> {
        let dispatch = self.in_flight.pop_front()?;
        self.available.push_back(dispatch.slot_id);
        Some((dispatch.slot_id, dispatch.chunk))
    }

    /// 実行中のディスパッチ数
    pub fn in_flight_count(&self) -> usize {
        self.in_flight.len()
    }

    /// 利用可能なスロットがあるか
    pub fn has_available(&self) -> bool {
        !self.available.is_empty()
    }
}
```

## 3. シェーダー設計

### 3.1 バインドグループレイアウト

```wgsl
// datetime_search.wgsl

// Group 0: ディスパッチ単位で変化するデータ
@group(0) @binding(0) var<storage, read> dispatch: DispatchState;
@group(0) @binding(1) var<storage, read_write> output: MatchOutput;

// Group 1: セグメント単位で変化するデータ
@group(1) @binding(0) var<uniform> segment: SegmentConstants;

// Group 2: 検索全体で固定のデータ
@group(2) @binding(0) var<uniform> search: SearchConstants;
@group(2) @binding(1) var<storage, read> targets: TargetSeeds;

struct DispatchState {
    /// 処理する時刻数
    count: u32,
    /// セグメント内開始オフセット
    offset: u32,
    /// 結果バッファ容量
    capacity: u32,
    _pad: u32,
}

struct MatchOutput {
    match_count: atomic<u32>,
    records: array<MatchRecord>,
}

struct MatchRecord {
    offset: u32,
    seed: u32,
}

struct SegmentConstants {
    /// Timer0 (big-endian packed with VCount)
    timer0_vcount: u32,
    /// KeyInput (big-endian)
    key_input: u32,
    _pad0: u32,
    _pad1: u32,
}

struct SearchConstants {
    // Nazo 値 (5 words)
    nazo: array<u32, 5>,
    // MAC アドレス由来
    mac_low: u32,
    mac_high_gxstat: u32,
    // ハードウェア種別 (frame 値)
    frame: u32,
    // 時刻範囲
    year_base: u32,
    day_of_year_base: u32,
    day_of_week_base: u32,
    hour_start: u32,
    hour_count: u32,
    minute_start: u32,
    minute_count: u32,
    second_start: u32,
    second_count: u32,
}

struct TargetSeeds {
    count: u32,
    seeds: array<u32>,
}
```

### 3.2 BCD 変換

```wgsl
/// 0-99 を BCD に変換 (例: 23 → 0x23)
fn to_bcd(value: u32) -> u32 {
    let tens = value / 10u;
    let ones = value % 10u;
    return (tens << 4u) | ones;
}
```

### 3.3 日時計算

```wgsl
struct DateTime {
    year: u32,
    month: u32,
    day: u32,
    hour: u32,
    minute: u32,
    second: u32,
    day_of_week: u32,
}

fn is_leap_year(year: u32) -> bool {
    return (year % 4u == 0u && year % 100u != 0u) || (year % 400u == 0u);
}

fn days_in_month(month: u32, leap: bool) -> u32 {
    switch month {
        case 2u: { return select(28u, 29u, leap); }
        case 4u, 6u, 9u, 11u: { return 30u; }
        default: { return 31u; }
    }
}

fn compute_datetime(offset: u32) -> DateTime {
    // 時刻計算
    let secs_per_minute = search.second_count;
    let secs_per_hour = search.minute_count * secs_per_minute;
    let secs_per_day = search.hour_count * secs_per_hour;

    let day_offset = offset / secs_per_day;
    let time_in_day = offset % secs_per_day;

    let hour_idx = time_in_day / secs_per_hour;
    let minute_idx = (time_in_day % secs_per_hour) / secs_per_minute;
    let second_idx = time_in_day % secs_per_minute;

    let hour = search.hour_start + hour_idx;
    let minute = search.minute_start + minute_idx;
    let second = search.second_start + second_idx;

    // 日付計算
    var year = search.year_base;
    var doy = search.day_of_year_base + day_offset;
    let dow = (search.day_of_week_base + day_offset) % 7u;

    // 年跨ぎ
    loop {
        let year_days = select(365u, 366u, is_leap_year(year));
        if doy < year_days { break; }
        doy -= year_days;
        year += 1u;
    }

    // 月日計算
    let leap = is_leap_year(year);
    var month = 1u;
    loop {
        let mdays = days_in_month(month, leap);
        if doy < mdays { break; }
        doy -= mdays;
        month += 1u;
    }

    return DateTime(year, month, doy + 1u, hour, minute, second, dow);
}
```

### 3.4 SHA-1 メッセージ構築

```wgsl
/// DS 起動時刻から SHA-1 メッセージ (16 words) を構築
fn build_message(dt: DateTime) -> array<u32, 16> {
    var m: array<u32, 16>;

    // Words 0-4: Nazo 値
    m[0] = search.nazo[0];
    m[1] = search.nazo[1];
    m[2] = search.nazo[2];
    m[3] = search.nazo[3];
    m[4] = search.nazo[4];

    // Word 5: Timer0/VCount
    m[5] = segment.timer0_vcount;

    // Words 6-7: MAC + GXStat
    m[6] = search.mac_low;
    m[7] = search.mac_high_gxstat;

    // Word 8: 日付 (BCD)
    let year_bcd = to_bcd(dt.year % 100u);
    let month_bcd = to_bcd(dt.month);
    let day_bcd = to_bcd(dt.day);
    m[8] = (year_bcd << 24u) | (month_bcd << 16u) | (day_bcd << 8u) | dt.day_of_week;

    // Word 9: 時刻 (BCD) + frame
    let hour_bcd = to_bcd(dt.hour);
    let minute_bcd = to_bcd(dt.minute);
    let second_bcd = to_bcd(dt.second);
    m[9] = (hour_bcd << 24u) | (minute_bcd << 16u) | (second_bcd << 8u) | search.frame;

    // Words 10-12
    m[10] = 0u;
    m[11] = 0u;
    m[12] = segment.key_input;

    // Padding
    m[13] = 0x80000000u;
    m[14] = 0u;
    m[15] = 416u;  // bit length

    return m;
}
```

### 3.5 SHA-1 計算

```wgsl
fn rotl(x: u32, n: u32) -> u32 {
    return (x << n) | (x >> (32u - n));
}

fn sha1(msg: array<u32, 16>) -> array<u32, 5> {
    // 16-word circular buffer
    var w: array<u32, 16> = msg;

    var a = 0x67452301u;
    var b = 0xEFCDAB89u;
    var c = 0x98BADCFEu;
    var d = 0x10325476u;
    var e = 0xC3D2E1F0u;

    for (var i = 0u; i < 80u; i++) {
        let idx = i & 15u;

        // Message schedule expansion
        if i >= 16u {
            w[idx] = rotl(
                w[(i - 3u) & 15u] ^ w[(i - 8u) & 15u] ^ w[(i - 14u) & 15u] ^ w[idx],
                1u
            );
        }

        var f: u32;
        var k: u32;
        if i < 20u {
            f = (b & c) | ((~b) & d);
            k = 0x5A827999u;
        } else if i < 40u {
            f = b ^ c ^ d;
            k = 0x6ED9EBA1u;
        } else if i < 60u {
            f = (b & c) | (b & d) | (c & d);
            k = 0x8F1BBCDCu;
        } else {
            f = b ^ c ^ d;
            k = 0xCA62C1D6u;
        }

        let temp = rotl(a, 5u) + f + e + k + w[idx];
        e = d;
        d = c;
        c = rotl(b, 30u);
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

### 3.6 MT Seed 計算

```wgsl
fn swap_endian(v: u32) -> u32 {
    return ((v & 0xFFu) << 24u) |
           ((v & 0xFF00u) << 8u) |
           ((v & 0xFF0000u) >> 8u) |
           ((v >> 24u) & 0xFFu);
}

/// SHA-1 ハッシュから MT Seed を計算
///
/// 64bit LCG: result = (h1:h0) * 0x5D588B656C078965 + 0x269EC3
/// 上位 32bit を返す
fn compute_mt_seed(h: array<u32, 5>) -> u32 {
    let lo = swap_endian(h[0]);
    let hi = swap_endian(h[1]);

    // 64bit multiplication (upper 32 bits only)
    let mul_lo = 0x6C078965u;
    let mul_hi = 0x5D588B65u;

    // lo * mul_lo の上位
    let p0_hi = mulHigh(lo, mul_lo);
    // lo * mul_hi の下位
    let p1_lo = lo * mul_hi;
    // hi * mul_lo の下位
    let p2_lo = hi * mul_lo;

    // 加算 (carry 無視で十分な精度)
    return p0_hi + p1_lo + p2_lo;
}
```

### 3.7 Seed 照合

```wgsl
fn match_seed(seed: u32) -> bool {
    for (var i = 0u; i < targets.count; i++) {
        if targets.seeds[i] == seed {
            return true;
        }
    }
    return false;
}
```

### 3.8 エントリポイント

```wgsl
override WORKGROUP_SIZE: u32 = 256u;

@compute @workgroup_size(WORKGROUP_SIZE)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = gid.x;
    if idx >= dispatch.count {
        return;
    }

    let offset = dispatch.offset + idx;
    let dt = compute_datetime(offset);
    let msg = build_message(dt);
    let hash = sha1(msg);
    let seed = compute_mt_seed(hash);

    if !match_seed(seed) {
        return;
    }

    let slot = atomicAdd(&output.match_count, 1u);
    if slot < dispatch.capacity {
        output.records[slot] = MatchRecord(offset, seed);
    }
}
```

## 4. パイプライン構築

### 4.1 シェーダーモジュール

```rust
use wgpu::ShaderModuleDescriptor;

const SHADER_SOURCE: &str = include_str!("datetime_search.wgsl");

pub fn create_shader_module(device: &wgpu::Device) -> wgpu::ShaderModule {
    device.create_shader_module(ShaderModuleDescriptor {
        label: Some("datetime_search"),
        source: wgpu::ShaderSource::Wgsl(SHADER_SOURCE.into()),
    })
}
```

### 4.2 バインドグループレイアウト

```rust
pub fn create_bind_group_layouts(device: &wgpu::Device) -> [wgpu::BindGroupLayout; 3] {
    // Group 0: ディスパッチ単位
    let dispatch_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
        label: Some("dispatch"),
        entries: &[
            wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Storage { read_only: true },
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            },
            wgpu::BindGroupLayoutEntry {
                binding: 1,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Storage { read_only: false },
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            },
        ],
    });

    // Group 1: セグメント単位
    let segment_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
        label: Some("segment"),
        entries: &[
            wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            },
        ],
    });

    // Group 2: 検索全体
    let search_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
        label: Some("search"),
        entries: &[
            wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            },
            wgpu::BindGroupLayoutEntry {
                binding: 1,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Storage { read_only: true },
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            },
        ],
    });

    [dispatch_layout, segment_layout, search_layout]
}
```

## 5. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [../gpu/device-context.md](../gpu/device-context.md) | GPU 汎用基盤（デバイスコンテキスト、制限値導出） |
| [worker-interface.md](./worker-interface.md) | Worker ↔ WASM インタフェース |
| [base.md](./base.md) | 起動時刻検索 共通基盤 |
