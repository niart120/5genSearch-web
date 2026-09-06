//! GPU 検索パイプライン
//!
//! wgpu パイプライン・バッファ管理を行う。

use wgpu::util::DeviceExt;

use crate::core::datetime::{DatetimeSearchSpace, date_to_days, days_to_date};
use crate::core::sha1::{get_frame, get_nazo_values};
use crate::types::{Datetime, DsConfig, Hardware, LcgSeed, MtSeed, StartupCondition};

use super::super::context::GpuDeviceContext;
use super::super::limits::SearchJobLimits;

/// `GX_STAT` レジスタ値 (DS ハードウェア固有)
const GX_STAT: u32 = 0x0600_0000;

/// GPU 検索パイプライン
pub struct SearchPipeline {
    device: wgpu::Device,
    queue: wgpu::Queue,
    pipeline: wgpu::ComputePipeline,
    bind_group: wgpu::BindGroup,
    /// ディスパッチ状態バッファ
    dispatch_state_buffer: wgpu::Buffer,
    /// 結果バッファ
    output_buffer: wgpu::Buffer,
    /// ステージングバッファ
    staging_buffer: wgpu::Buffer,
    /// ワークグループサイズ
    workgroup_size: u32,
    /// 検索制限
    limits: SearchJobLimits,
    /// 候補番号と結果日時の対応を保証する探索空間
    search_space: DatetimeSearchSpace,
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
    base_candidate_index: u32,
    candidate_capacity: u32,
    padding: u32,
}

/// マッチレコード (GPU から読み出し)
#[repr(C)]
#[derive(Clone, Copy, Debug, bytemuck::Pod, bytemuck::Zeroable)]
struct MatchRecord {
    message_index: u32,
    h0: u32,
    h1: u32,
    padding: u32,
}

impl SearchPipeline {
    /// パイプラインを作成
    pub fn new(
        ctx: &GpuDeviceContext,
        ds: &DsConfig,
        target_seeds: &[MtSeed],
        condition: StartupCondition,
        space: &DatetimeSearchSpace,
    ) -> Self {
        let device = ctx.device().clone();
        let queue = ctx.queue().clone();
        let limits = SearchJobLimits::from_device_limits(ctx.limits(), ctx.gpu_profile());

        // シェーダーモジュール作成
        let shader_source = include_str!("shader.wgsl");
        let module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("mtseed-datetime-search"),
            source: wgpu::ShaderSource::Wgsl(shader_source.into()),
        });

        // パイプライン作成
        let (pipeline, bind_group_layout) = Self::create_pipeline(&device, &module, &limits);

        // 検索定数を構築
        let search_constants = Self::build_constants(ds, condition, space);

        // バッファ作成
        let target_buffer = Self::create_target_buffer(&device, target_seeds);
        let constants_buffer = Self::create_constants_buffer(&device, &search_constants);
        let dispatch_state_buffer = Self::create_dispatch_state_buffer(&device);
        let output_buffer = Self::create_output_buffer(&device, limits.candidate_capacity);
        let staging_buffer = Self::create_staging_buffer(&device, limits.candidate_capacity);

        // バインドグループ作成
        let bind_group = Self::create_bind_group(
            &device,
            &bind_group_layout,
            &dispatch_state_buffer,
            &constants_buffer,
            &target_buffer,
            &output_buffer,
        );

        Self {
            device,
            queue,
            pipeline,
            bind_group,
            dispatch_state_buffer,
            output_buffer,
            staging_buffer,
            workgroup_size: limits.workgroup_size,
            limits,
            search_space: space.clone(),
        }
    }

    /// コンピュートパイプラインとバインドグループレイアウトを作成
    fn create_pipeline(
        device: &wgpu::Device,
        module: &wgpu::ShaderModule,
        limits: &SearchJobLimits,
    ) -> (wgpu::ComputePipeline, wgpu::BindGroupLayout) {
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

        // パイプラインレイアウト
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("mtseed-datetime-search-pipeline-layout"),
            bind_group_layouts: &[&bind_group_layout],
            immediate_size: 0,
        });

        // コンピュートパイプライン
        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("mtseed-datetime-search-pipeline"),
            layout: Some(&pipeline_layout),
            module,
            entry_point: Some("sha1_generate"),
            compilation_options: wgpu::PipelineCompilationOptions {
                constants: &[
                    ("WORKGROUP_SIZE", f64::from(limits.workgroup_size)),
                    ("ITEMS_PER_THREAD", f64::from(limits.items_per_thread)),
                ],
                ..Default::default()
            },
            cache: None,
        });

        (pipeline, bind_group_layout)
    }

    /// バインドグループを作成
    fn create_bind_group(
        device: &wgpu::Device,
        layout: &wgpu::BindGroupLayout,
        dispatch_state_buffer: &wgpu::Buffer,
        constants_buffer: &wgpu::Buffer,
        target_buffer: &wgpu::Buffer,
        output_buffer: &wgpu::Buffer,
    ) -> wgpu::BindGroup {
        device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("mtseed-datetime-search-bind-group"),
            layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: dispatch_state_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: constants_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: target_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: output_buffer.as_entire_binding(),
                },
            ],
        })
    }

    /// 検索定数を構築
    fn build_constants(
        ds: &DsConfig,
        condition: StartupCondition,
        space: &DatetimeSearchSpace,
    ) -> SearchConstants {
        // Timer0/VCount をバイトスワップ
        let timer0_vcount_swapped =
            (u32::from(condition.timer0) | (u32::from(condition.vcount) << 16)).swap_bytes();

        // message[6]: MAC 下位 16bit (mac[4], mac[5]) - エンディアン変換なし
        let mac_lower = (u32::from(ds.mac[4]) << 8) | u32::from(ds.mac[5]);

        // message[7]: MAC 上位 32bit (mac[0..4] as little-endian) XOR GX_STAT XOR frame
        let frame = get_frame(ds.hardware, ds.version);
        let mac_upper = u32::from(ds.mac[0])
            | (u32::from(ds.mac[1]) << 8)
            | (u32::from(ds.mac[2]) << 16)
            | (u32::from(ds.mac[3]) << 24);
        let data7_swapped = (mac_upper ^ GX_STAT ^ u32::from(frame)).swap_bytes();

        // キー入力
        let key_input_swapped = condition.key_code().0.swap_bytes();

        // ハードウェアタイプ
        let hardware_type = match ds.hardware {
            Hardware::Ds => 0,
            Hardware::DsLite => 1,
            Hardware::Dsi => 2,
            Hardware::N3ds => 3,
        };

        let (anchor, _) = space.candidate_bounds();
        let (year, _, _) = days_to_date(anchor);
        let start_year = u32::from(year);
        let start_day_of_year = anchor - date_to_days(year, 1, 1) + 1;
        let start_day_of_week = (anchor + 6) % 7;

        // NAZO 値 (ROM バージョン・リージョン・ハードウェア依存)
        let nazo = get_nazo_values(ds);

        let (starts, counts) = space.axes();
        let [hour_range_start, minute_range_start, second_range_start] = starts.map(u32::from);
        let [hour_range_count, minute_range_count, second_range_count] = counts.map(u32::from);

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
            // NAZO 値にエンディアン変換を適用 (CPU 側と同様)
            nazo0: nazo.values[0].swap_bytes(),
            nazo1: nazo.values[1].swap_bytes(),
            nazo2: nazo.values[2].swap_bytes(),
            nazo3: nazo.values[3].swap_bytes(),
            nazo4: nazo.values[4].swap_bytes(),
            reserved0: 0,
        }
    }

    /// ターゲット Seed バッファを作成
    #[allow(clippy::cast_possible_truncation)] // seeds.len() は u32 範囲内
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
        let size = 4 + u64::from(capacity) * std::mem::size_of::<MatchRecord>() as u64;
        device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("output-buffer"),
            size,
            usage: wgpu::BufferUsages::STORAGE
                | wgpu::BufferUsages::COPY_SRC
                | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        })
    }

    /// ステージングバッファを作成
    fn create_staging_buffer(device: &wgpu::Device, capacity: u32) -> wgpu::Buffer {
        let size = 4 + u64::from(capacity) * std::mem::size_of::<MatchRecord>() as u64;
        device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("staging-buffer"),
            size,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        })
    }

    /// GPU ディスパッチ実行
    ///
    /// # Returns
    /// `(matches, processed_count)`
    pub async fn dispatch(
        &self,
        max_count: u32,
        offset: u32,
    ) -> Result<(Vec<MatchResult>, u32), String> {
        let count = max_count.min(self.limits.max_messages_per_dispatch);
        if count == 0 {
            return Ok((vec![], 0));
        }

        let (_, bounds) = self.search_space.candidate_bounds();
        if offset < bounds.start || offset.checked_add(count).is_none_or(|end| end > bounds.end) {
            return Err("Dispatch outside candidate interval".into());
        }
        // ディスパッチ状態を更新
        let dispatch_state = DispatchState {
            message_count: count,
            base_candidate_index: offset,
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
            pass.set_bind_group(0, &self.bind_group, &[]);
            // ITEMS_PER_THREAD 個のアイテムを 1 スレッドが処理するため、
            // 必要スレッド数はアイテム数 / ITEMS_PER_THREAD
            let threads_needed = count.div_ceil(self.limits.items_per_thread);
            let workgroup_count = threads_needed.div_ceil(self.workgroup_size);
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

        // 結果を読み出し
        let matches = self.read_results(offset, count).await?;

        Ok((matches, count))
    }

    /// 結果を読み出し（非同期ポーリング）
    #[allow(clippy::cast_possible_truncation)] // match_count は capacity 以下
    async fn read_results(
        &self,
        base_offset: u32,
        dispatch_count: u32,
    ) -> Result<Vec<MatchResult>, String> {
        let buffer_slice = self.staging_buffer.slice(..);

        let (tx, rx) = futures_channel::oneshot::channel();

        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            let _ = tx.send(result);
        });

        // WASM: Poll で定期的にチェック + await で制御をイベントループに戻す
        // Native: Wait でブロッキング待機
        #[cfg(target_arch = "wasm32")]
        self.device
            .poll(wgpu::PollType::Poll)
            .map_err(|error| format!("GPU polling failed: {error}"))?;

        #[cfg(not(target_arch = "wasm32"))]
        self.device
            .poll(wgpu::PollType::wait_indefinitely())
            .map_err(|error| format!("GPU polling failed: {error}"))?;

        // rx.await: WASM では wasm_bindgen_futures が適切にポーリングする
        if rx.await.ok().and_then(Result::ok).is_none() {
            return Err("GPU result buffer mapping failed".into());
        }

        let data = buffer_slice.get_mapped_range();
        let match_count = u32::from_le_bytes([data[0], data[1], data[2], data[3]]);
        let record_count = match_count.min(self.limits.candidate_capacity) as usize;

        let result = (|| {
            let mut matches = Vec::with_capacity(record_count);
            for i in 0..record_count {
                let offset = 4 + i * std::mem::size_of::<MatchRecord>();
                let record: MatchRecord = bytemuck::pod_read_unaligned(&data[offset..offset + 16]);

                // メッセージインデックスから日時を復元
                let datetime =
                    self.result_datetime(base_offset, dispatch_count, record.message_index)?;

                // h0, h1 から LcgSeed を構築 (HashValues::to_lcg_seed と同じ計算)
                let h0_swapped = record.h0.swap_bytes();
                let h1_swapped = record.h1.swap_bytes();
                let lcg_seed = LcgSeed::new((u64::from(h1_swapped) << 32) | u64::from(h0_swapped));

                matches.push(MatchResult { datetime, lcg_seed });
            }

            Ok(matches)
        })();

        drop(data);
        self.staging_buffer.unmap();

        result
    }

    fn result_datetime(&self, base: u32, count: u32, index: u32) -> Result<Datetime, String> {
        if index >= count {
            return Err("GPU record outside dispatch".into());
        }
        base.checked_add(index)
            .and_then(|i| self.search_space.datetime_at(i))
            .ok_or_else(|| "GPU record outside candidate interval".into())
    }
}

/// マッチ結果 (パイプライン内部用)
pub struct MatchResult {
    pub datetime: Datetime,
    pub lcg_seed: LcgSeed,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::datetime::END_SECONDS;
    use crate::core::sha1::{
        BaseMessageBuilder, build_date_code, build_time_code, calculate_pokemon_sha1,
    };
    use crate::types::{
        DatetimeSearchSpaceParams, KeyMask, RomRegion, RomVersion, TimeRangeParams,
    };

    #[test]
    #[ignore = "requires a real GPU; run explicitly with --ignored --nocapture"]
    fn gpu_measure_datetime_space() {
        use std::time::Instant;
        let ctx = pollster::block_on(GpuDeviceContext::new()).expect("GPU required");
        let ds = DsConfig {
            mac: [0, 9, 191, 18, 52, 86],
            hardware: Hardware::DsLite,
            version: RomVersion::Black,
            region: RomRegion::Jpn,
        };
        let condition = StartupCondition::new(3193, 90, KeyMask::NONE);
        for (label, start, end) in [("full", 0, 86400), ("partial", 39600, 43200)] {
            let space = DatetimeSearchSpace::try_from(DatetimeSearchSpaceParams {
                start_seconds: start,
                end_seconds: end,
                time_range: TimeRangeParams {
                    hour_start: 0,
                    hour_end: 23,
                    minute_start: 0,
                    minute_end: 59,
                    second_start: 0,
                    second_end: 59,
                },
            })
            .unwrap();
            for run in 0..5 {
                let start = Instant::now();
                let pipeline = SearchPipeline::new(&ctx, &ds, &[MtSeed::new(1)], condition, &space);
                let setup_ms = start.elapsed().as_secs_f64() * 1000.0;
                let (_, bounds) = space.candidate_bounds();
                let start = Instant::now();
                let mut current = bounds.start;
                while current < bounds.end {
                    let (_, count) = pollster::block_on(
                        pipeline.dispatch((bounds.end - current).min(1024), current),
                    )
                    .unwrap();
                    current += count;
                }
                println!(
                    "{label},{run},{setup_ms:.6},{:.6},{}",
                    start.elapsed().as_secs_f64() * 1000.0,
                    space.count()
                );
            }
        }
    }

    /// 実 GPU 必須。CI の非 GPU 環境では明示的に除外する。
    #[test]
    #[ignore = "requires a real GPU; run explicitly with --ignored --nocapture"]
    #[allow(clippy::too_many_lines)] // 境界ケースを同じ GPU と検証手順で比較する。
    fn gpu_matches_every_cpu_candidate_across_boundaries() {
        let ctx = pollster::block_on(GpuDeviceContext::new()).expect("GPU required");
        eprintln!("GPU profile: {:?}", ctx.gpu_profile());
        let dense = TimeRangeParams {
            hour_start: 0,
            hour_end: 23,
            minute_start: 0,
            minute_end: 59,
            second_start: 0,
            second_end: 59,
        };
        let sparse = TimeRangeParams {
            hour_start: 10,
            hour_end: 11,
            minute_start: 30,
            minute_end: 30,
            second_start: 0,
            second_end: 0,
        };
        let leap = date_to_days(2024, 2, 29) * 86400;
        let year = date_to_days(2023, 12, 31) * 86400;
        for hardware in [Hardware::DsLite, Hardware::N3ds] {
            let ds = DsConfig {
                mac: [0, 9, 191, 18, 52, 86],
                hardware,
                version: RomVersion::Black,
                region: RomRegion::Jpn,
            };
            for (start, end, time) in [
                (0, 7, dense.clone()),
                (11 * 3600, 12 * 3600, sparse.clone()),
                (leap - 3, leap + 4, dense.clone()),
                (leap + 86397, leap + 86404, dense.clone()),
                (year + 86397, year + 86404, dense.clone()),
                (END_SECONDS - 7, END_SECONDS, dense.clone()),
                (43200, 43207, dense.clone()),
            ] {
                let space = DatetimeSearchSpace::try_from(DatetimeSearchSpaceParams {
                    start_seconds: start,
                    end_seconds: end,
                    time_range: time,
                })
                .unwrap();
                for timer0 in [0xC79, 0xC7A] {
                    let condition = StartupCondition::new(timer0, 0x5A, KeyMask::NONE);
                    // スカラー SHA-1 と通常生成用 BCD 変換を独立の参照にする。
                    let expected: Vec<_> = space
                        .iter()
                        .map(|date| {
                            let mut builder = BaseMessageBuilder::new(
                                &get_nazo_values(&ds),
                                ds.mac,
                                condition.vcount,
                                condition.timer0,
                                condition.key_code(),
                                get_frame(ds.hardware, ds.version),
                            );
                            builder.set_datetime(
                                build_date_code(date.year, date.month, date.day),
                                build_time_code(
                                    date.hour,
                                    date.minute,
                                    date.second,
                                    matches!(hardware, Hardware::DsLite),
                                ),
                            );
                            (
                                date,
                                calculate_pokemon_sha1(builder.message()).to_lcg_seed(),
                            )
                        })
                        .collect();
                    let seeds: Vec<_> = expected
                        .iter()
                        .map(|(_, seed)| seed.derive_mt_seed())
                        .collect();
                    let pipeline = SearchPipeline::new(&ctx, &ds, &seeds, condition, &space);
                    let (_, bounds) = space.candidate_bounds();
                    let mut actual = Vec::new();
                    let mut current = bounds.start;
                    while current < bounds.end {
                        let count = (bounds.end - current).min(3);
                        let (matches, processed) =
                            pollster::block_on(pipeline.dispatch(count, current)).unwrap();
                        assert_eq!(processed, count);
                        actual.extend(matches.into_iter().map(|m| (m.datetime, m.lcg_seed)));
                        current += processed;
                    }
                    actual
                        .sort_by_key(|(d, _)| (d.year, d.month, d.day, d.hour, d.minute, d.second));
                    assert_eq!(
                        actual, expected,
                        "start={start}, end={end}, hardware={hardware:?}"
                    );
                    assert!(pipeline.result_datetime(bounds.start, 1, 1).is_err());
                    assert!(pipeline.result_datetime(bounds.end, 1, 0).is_err());
                    assert!(pipeline.result_datetime(u32::MAX, 2, 1).is_err());
                    assert!(pollster::block_on(pipeline.dispatch(1, bounds.end)).is_err());
                    assert_eq!(
                        pollster::block_on(pipeline.dispatch(0, bounds.end))
                            .unwrap()
                            .1,
                        0
                    );
                }
            }
        }
    }
}
