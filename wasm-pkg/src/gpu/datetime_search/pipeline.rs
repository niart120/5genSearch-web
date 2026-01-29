//! GPU 検索パイプライン
//!
//! wgpu パイプライン・バッファ管理を行う。

#![allow(clippy::cast_possible_truncation)]
#![allow(clippy::cast_lossless)]
#![allow(clippy::unreadable_literal)]

use wgpu::util::DeviceExt;

use crate::datetime_search::MtseedDatetimeSearchParams;
use crate::types::{Datetime, Hardware, MtSeed, RomRegion, RomVersion, StartupCondition};

use super::super::context::GpuDeviceContext;
use super::super::limits::SearchJobLimits;

/// ワークグループサイズのプレースホルダー
const WORKGROUP_SIZE_PLACEHOLDER: &str = "WORKGROUP_SIZE_PLACEHOLDER";

/// GPU 検索パイプライン
#[allow(dead_code)]
pub struct SearchPipeline {
    device: wgpu::Device,
    queue: wgpu::Queue,
    pipeline: wgpu::ComputePipeline,
    bind_group_layout: wgpu::BindGroupLayout,
    /// ターゲット Seed バッファ
    target_buffer: wgpu::Buffer,
    /// 定数バッファ
    constants_buffer: wgpu::Buffer,
    /// ディスパッチ状態バッファ
    dispatch_state_buffer: wgpu::Buffer,
    /// 結果バッファ
    output_buffer: wgpu::Buffer,
    /// 結果読み出し用ステージングバッファ
    staging_buffer: wgpu::Buffer,
    /// ワークグループサイズ
    workgroup_size: u32,
    /// 検索制限
    limits: SearchJobLimits,
    /// 検索定数 (シェーダー用)
    search_constants: SearchConstants,
    /// 起動条件 (結果復元用)
    condition: StartupCondition,
    /// ターゲット Seed 数
    target_count: u32,
}

/// シェーダー定数 (GPU バッファにコピー)
#[repr(C)]
#[derive(Clone, Copy, Debug, bytemuck::Pod, bytemuck::Zeroable)]
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
}

/// ディスパッチ状態 (GPU バッファにコピー)
#[repr(C)]
#[derive(Clone, Copy, Debug, bytemuck::Pod, bytemuck::Zeroable)]
struct DispatchState {
    message_count: u32,
    base_second_offset: u32,
    candidate_capacity: u32,
    padding: u32,
}

/// マッチレコード (GPU から読み出し)
#[repr(C)]
#[derive(Clone, Copy, Debug, bytemuck::Pod, bytemuck::Zeroable)]
struct MatchRecord {
    message_index: u32,
    seed: u32,
}

impl SearchPipeline {
    /// パイプラインを作成
    #[allow(clippy::unnecessary_wraps)]
    pub fn new(
        ctx: &GpuDeviceContext,
        params: &MtseedDatetimeSearchParams,
    ) -> Result<Self, String> {
        let device = ctx.device().clone();
        let queue = ctx.queue().clone();
        let limits = SearchJobLimits::from_device_limits(ctx.limits(), ctx.gpu_profile());

        // シェーダーモジュール作成
        let shader_source = include_str!("shader.wgsl");
        let shader_code = shader_source.replace(
            WORKGROUP_SIZE_PLACEHOLDER,
            &limits.workgroup_size.to_string(),
        );

        let module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("mtseed-datetime-search"),
            source: wgpu::ShaderSource::Wgsl(shader_code.into()),
        });

        // バインドグループレイアウト
        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("mtseed-datetime-search-layout"),
            entries: &[
                // binding 0: DispatchState (storage, read)
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
                // binding 1: SearchConstants (uniform)
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // binding 2: TargetSeeds (storage, read)
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // binding 3: MatchOutput (storage, read_write)
                wgpu::BindGroupLayoutEntry {
                    binding: 3,
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

        // パイプライン作成
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("mtseed-datetime-search-pipeline-layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("mtseed-datetime-search-pipeline"),
            layout: Some(&pipeline_layout),
            module: &module,
            entry_point: Some("sha1_generate"),
            compilation_options: wgpu::PipelineCompilationOptions::default(),
            cache: None,
        });

        // 検索定数を構築
        let search_constants = Self::build_constants(params);

        // バッファ作成
        let target_buffer = Self::create_target_buffer(&device, &params.target_seeds);
        let constants_buffer = Self::create_constants_buffer(&device, &search_constants);
        let dispatch_state_buffer = Self::create_dispatch_state_buffer(&device);
        let output_buffer = Self::create_output_buffer(&device, limits.candidate_capacity);
        let staging_buffer = Self::create_staging_buffer(&device, limits.candidate_capacity);

        Ok(Self {
            device,
            queue,
            pipeline,
            bind_group_layout,
            target_buffer,
            constants_buffer,
            dispatch_state_buffer,
            output_buffer,
            staging_buffer,
            workgroup_size: limits.workgroup_size,
            limits,
            search_constants,
            condition: params.condition,
            target_count: params.target_seeds.len() as u32,
        })
    }

    /// 検索定数を構築
    fn build_constants(params: &MtseedDatetimeSearchParams) -> SearchConstants {
        let ds = &params.ds;
        let condition = params.condition;
        let time_range = &params.time_range;
        let search_range = &params.search_range;

        // Timer0/VCount をバイトスワップ
        let timer0 = condition.timer0;
        let vcount = condition.vcount;
        let timer0_vcount_swapped = swap_bytes_u32(u32::from(timer0) | (u32::from(vcount) << 16));

        // MAC 下位4バイト
        let mac_lower = u32::from(ds.mac[2]) << 24
            | u32::from(ds.mac[3]) << 16
            | u32::from(ds.mac[4]) << 8
            | u32::from(ds.mac[5]);

        // データ7: (VFrame << 24) | (GxStat << 16) | MAC下位2バイト
        // VFrame = 8 (固定), GxStat = 6 (固定)
        let data7 = (8u32 << 24) | (6u32 << 16) | u32::from(ds.mac[4]) << 8 | u32::from(ds.mac[5]);
        let data7_swapped = swap_bytes_u32(data7);

        // キー入力
        let key_code = condition.key_code;
        let key_input_swapped = swap_bytes_u32(key_code.0);

        // ハードウェアタイプ
        let hardware_type = match ds.hardware {
            Hardware::Ds => 0,
            Hardware::DsLite => 1,
            Hardware::Dsi => 2,
            Hardware::Dsi3ds => 3,
        };

        // 開始年・通算日・曜日を計算
        let start_year = u32::from(search_range.start_year);
        let start_day_of_year = day_of_year(
            search_range.start_year,
            search_range.start_month,
            search_range.start_day,
        );
        let start_day_of_week = day_of_week(
            search_range.start_year,
            search_range.start_month,
            search_range.start_day,
        );

        // NAZO 値 (ROM バージョン・リージョン依存)
        let nazo = get_nazo_values(ds.version, ds.region, ds.hardware);

        // 時刻範囲
        let hour_range_start = u32::from(time_range.hour_start);
        let hour_range_count = u32::from(time_range.hour_end) - hour_range_start + 1;
        let minute_range_start = u32::from(time_range.minute_start);
        let minute_range_count = u32::from(time_range.minute_end) - minute_range_start + 1;
        let second_range_start = u32::from(time_range.second_start);
        let second_range_count = u32::from(time_range.second_end) - second_range_start + 1;

        SearchConstants {
            timer0_vcount_swapped,
            mac_lower,
            data7_swapped,
            key_input_swapped,
            hardware_type,
            start_year,
            start_day_of_year,
            start_day_of_week,
            hour_range_start,
            hour_range_count,
            minute_range_start,
            minute_range_count,
            second_range_start,
            second_range_count,
            nazo0: nazo[0],
            nazo1: nazo[1],
            nazo2: nazo[2],
            nazo3: nazo[3],
            nazo4: nazo[4],
            reserved0: 0,
        }
    }

    /// ターゲット Seed バッファを作成
    fn create_target_buffer(device: &wgpu::Device, seeds: &[MtSeed]) -> wgpu::Buffer {
        // バッファ構造: [count: u32, values: array<u32>]
        let mut data = Vec::with_capacity(1 + seeds.len());
        data.push(seeds.len() as u32);
        for seed in seeds {
            data.push(seed.0);
        }

        device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("target-seeds-buffer"),
            contents: bytemuck::cast_slice(&data),
            usage: wgpu::BufferUsages::STORAGE,
        })
    }

    /// 定数バッファを作成
    fn create_constants_buffer(device: &wgpu::Device, constants: &SearchConstants) -> wgpu::Buffer {
        device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("search-constants-buffer"),
            contents: bytemuck::bytes_of(constants),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        })
    }

    /// ディスパッチ状態バッファを作成
    fn create_dispatch_state_buffer(device: &wgpu::Device) -> wgpu::Buffer {
        device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("dispatch-state-buffer"),
            size: std::mem::size_of::<DispatchState>() as u64,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        })
    }

    /// 結果バッファを作成
    fn create_output_buffer(device: &wgpu::Device, capacity: u32) -> wgpu::Buffer {
        // 構造: [match_count: u32, records: array<MatchRecord>]
        let size = 4 + capacity as u64 * std::mem::size_of::<MatchRecord>() as u64;
        device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("match-output-buffer"),
            size,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        })
    }

    /// ステージングバッファを作成
    fn create_staging_buffer(device: &wgpu::Device, capacity: u32) -> wgpu::Buffer {
        let size = 4 + capacity as u64 * std::mem::size_of::<MatchRecord>() as u64;
        device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("staging-buffer"),
            size,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        })
    }

    /// バインドグループを作成
    fn create_bind_group(&self) -> wgpu::BindGroup {
        self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("mtseed-datetime-search-bind-group"),
            layout: &self.bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: self.dispatch_state_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: self.constants_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: self.target_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: self.output_buffer.as_entire_binding(),
                },
            ],
        })
    }

    /// GPU ディスパッチ実行
    ///
    /// # Returns
    /// `(matches, processed_count)`
    pub async fn dispatch(&self, max_count: u32, offset: u32) -> (Vec<MatchResult>, u32) {
        let count = max_count.min(self.limits.max_messages_per_dispatch);
        if count == 0 {
            return (vec![], 0);
        }

        // ディスパッチ状態を更新
        let dispatch_state = DispatchState {
            message_count: count,
            base_second_offset: offset,
            candidate_capacity: self.limits.candidate_capacity,
            padding: 0,
        };
        self.queue.write_buffer(
            &self.dispatch_state_buffer,
            0,
            bytemuck::bytes_of(&dispatch_state),
        );

        // 出力バッファをクリア (match_count = 0)
        let zero_count: [u32; 1] = [0];
        self.queue
            .write_buffer(&self.output_buffer, 0, bytemuck::cast_slice(&zero_count));

        // コマンドエンコード
        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor::default());
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor::default());
            pass.set_pipeline(&self.pipeline);
            pass.set_bind_group(0, &self.create_bind_group(), &[]);
            let workgroup_count = count.div_ceil(self.workgroup_size);
            pass.dispatch_workgroups(workgroup_count, 1, 1);
        }

        // 結果コピー
        encoder.copy_buffer_to_buffer(
            &self.output_buffer,
            0,
            &self.staging_buffer,
            0,
            self.staging_buffer.size(),
        );

        self.queue.submit(std::iter::once(encoder.finish()));

        // 結果読み出し
        let matches = self.read_results(offset).await;

        (matches, count)
    }

    /// 結果を読み出し
    async fn read_results(&self, base_offset: u32) -> Vec<MatchResult> {
        let buffer_slice = self.staging_buffer.slice(..);
        let (tx, rx) = futures_channel::oneshot::channel();

        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            let _ = tx.send(result);
        });

        self.device.poll(wgpu::Maintain::Wait);

        if rx.await.ok().and_then(Result::ok).is_none() {
            return vec![];
        }

        let data = buffer_slice.get_mapped_range();
        let match_count = u32::from_le_bytes([data[0], data[1], data[2], data[3]]);
        let record_count = match_count.min(self.limits.candidate_capacity) as usize;

        let mut matches = Vec::with_capacity(record_count);
        for i in 0..record_count {
            let offset = 4 + i * std::mem::size_of::<MatchRecord>();
            let record: MatchRecord = bytemuck::pod_read_unaligned(&data[offset..offset + 8]);

            // メッセージインデックスから日時を復元
            let total_offset = base_offset + record.message_index;
            let datetime = self.offset_to_datetime(total_offset);

            matches.push(MatchResult {
                datetime,
                mt_seed: MtSeed(record.seed),
            });
        }

        drop(data);
        self.staging_buffer.unmap();

        matches
    }

    /// オフセットから日時を復元
    fn offset_to_datetime(&self, offset: u32) -> Datetime {
        let c = &self.search_constants;
        let combos_per_day =
            c.hour_range_count.max(1) * c.minute_range_count.max(1) * c.second_range_count.max(1);

        let day_offset = offset / combos_per_day;
        let remainder = offset % combos_per_day;

        let entries_per_hour = c.minute_range_count.max(1) * c.second_range_count.max(1);
        let hour_index = remainder / entries_per_hour;
        let remainder2 = remainder % entries_per_hour;
        let minute_index = remainder2 / c.second_range_count.max(1);
        let second_index = remainder2 % c.second_range_count.max(1);

        let hour = (c.hour_range_start + hour_index) as u8;
        let minute = (c.minute_range_start + minute_index) as u8;
        let second = (c.second_range_start + second_index) as u8;

        // 年・月・日を計算
        let (year, month, day) = offset_to_date(c.start_year, c.start_day_of_year, day_offset);

        Datetime {
            year,
            month,
            day,
            hour,
            minute,
            second,
        }
    }

    /// ターゲット Seed 数を取得
    #[allow(dead_code)]
    pub fn target_count(&self) -> u32 {
        self.target_count
    }

    /// 起動条件を取得
    pub fn condition(&self) -> StartupCondition {
        self.condition
    }
}

/// マッチ結果 (パイプライン内部用)
pub struct MatchResult {
    pub datetime: Datetime,
    pub mt_seed: MtSeed,
}

// ===== ヘルパー関数 =====

/// バイトスワップ (リトルエンディアン → ビッグエンディアン)
fn swap_bytes_u32(v: u32) -> u32 {
    v.swap_bytes()
}

/// 閏年判定
fn is_leap_year(year: u32) -> bool {
    year.is_multiple_of(4) && (!year.is_multiple_of(100) || year.is_multiple_of(400))
}

/// 年内通算日を計算 (1-indexed)
fn day_of_year(year: u16, month: u8, day: u8) -> u32 {
    let is_leap = is_leap_year(u32::from(year));
    let days_in_months: [u32; 12] = if is_leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };

    let mut doy = u32::from(day);
    for &days in days_in_months.iter().take(month as usize - 1) {
        doy += days;
    }
    doy
}

/// 曜日を計算 (0: 日曜 - 6: 土曜)
/// Zeller の公式を使用
#[allow(clippy::cast_sign_loss)]
fn day_of_week(year: u16, month: u8, day: u8) -> u32 {
    let y = if month <= 2 {
        i32::from(year) - 1
    } else {
        i32::from(year)
    };
    let m = if month <= 2 {
        i32::from(month) + 12
    } else {
        i32::from(month)
    };
    let d = i32::from(day);

    let h = (d + (13 * (m + 1)) / 5 + y + y / 4 - y / 100 + y / 400) % 7;
    // Zeller の結果 (0: 土曜) を (0: 日曜) に変換
    ((h + 6) % 7) as u32
}

/// オフセットから年月日を復元
fn offset_to_date(start_year: u32, start_day_of_year: u32, day_offset: u32) -> (u16, u8, u8) {
    let mut year = start_year;
    let mut doy = start_day_of_year + day_offset;

    loop {
        let year_length = if is_leap_year(year) { 366 } else { 365 };
        if doy <= year_length {
            break;
        }
        doy -= year_length;
        year += 1;
    }

    let days_in_months: [u32; 12] = if is_leap_year(year) {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };

    let mut month = 1u8;
    for days in days_in_months {
        if doy <= days {
            break;
        }
        doy -= days;
        month += 1;
    }

    (year as u16, month, doy as u8)
}

/// NAZO 値を取得 (既存実装を流用)
#[allow(clippy::match_same_arms)]
fn get_nazo_values(version: RomVersion, region: RomRegion, hardware: Hardware) -> [u32; 5] {
    // NAZO 値は ROM バージョン・リージョン・ハードウェアによって異なる
    // 詳細は core/sha1.rs の get_nazo_values を参照
    let base: [u32; 5] = match (version, region) {
        (RomVersion::Black, RomRegion::Jpn) => {
            [0x02215F10, 0x02215F30, 0x02761150, 0x00000000, 0x02761150]
        }
        (RomVersion::White, RomRegion::Jpn) => {
            [0x02215F30, 0x02215F50, 0x02761150, 0x00000000, 0x02761150]
        }
        (RomVersion::Black2, RomRegion::Jpn) => {
            [0x0209A8DC, 0x0209A8FC, 0x027AA5A8, 0x00000000, 0x027AA5A8]
        }
        (RomVersion::White2, RomRegion::Jpn) => {
            [0x0209A8FC, 0x0209A91C, 0x027AA5A8, 0x00000000, 0x027AA5A8]
        }
        // その他のリージョンはデフォルト値を使用
        _ => [0x02215F10, 0x02215F30, 0x02761150, 0x00000000, 0x02761150],
    };

    // DSi/3DS の場合はオフセットを適用
    match hardware {
        Hardware::Dsi | Hardware::Dsi3ds => [
            base[0].wrapping_add(0x0000_FA00),
            base[1].wrapping_add(0x0000_FA00),
            base[2].wrapping_add(0x0000_FA00),
            base[3],
            base[4].wrapping_add(0x0000_FA00),
        ],
        _ => base,
    }
}
