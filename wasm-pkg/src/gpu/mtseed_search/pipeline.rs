//! GPU MT Seed IV 検索パイプライン
//!
//! wgpu パイプライン・バッファ管理を行う。

use wgpu::util::DeviceExt;

use crate::types::{Ivs, MtSeed, MtseedResult, MtseedSearchContext};

use super::super::context::GpuDeviceContext;
use super::super::limits::SearchJobLimits;

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
}

/// シェーダー定数 (GPU バッファにコピー)
#[repr(C)]
#[derive(Clone, Copy, Debug, bytemuck::Pod, bytemuck::Zeroable)]
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
}

/// ディスパッチ状態 (GPU バッファにコピー)
#[repr(C)]
#[derive(Clone, Copy, Debug, bytemuck::Pod, bytemuck::Zeroable)]
struct DispatchState {
    seed_count: u32,
    base_seed: u32,
    candidate_capacity: u32,
    padding: u32,
}

/// マッチレコード (GPU から読み出し)
#[repr(C)]
#[derive(Clone, Copy, Debug, bytemuck::Pod, bytemuck::Zeroable)]
struct MatchRecord {
    seed: u32,
    ivs_packed: u32,
}

impl SearchPipeline {
    /// パイプラインを作成
    pub fn new(
        ctx: &GpuDeviceContext,
        context: &MtseedSearchContext,
        items_per_thread: u32,
    ) -> Self {
        let device = ctx.device().clone();
        let queue = ctx.queue().clone();
        let mut limits = SearchJobLimits::from_device_limits(ctx.limits(), ctx.gpu_profile());

        // シェーダーオーバーライドと一致させる
        limits.items_per_thread = items_per_thread;
        limits.max_messages_per_dispatch =
            limits.workgroup_size * limits.max_workgroups * items_per_thread;

        // シェーダーモジュール作成
        let shader_source = include_str!("shader.wgsl");
        let module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("mtseed-iv-search"),
            source: wgpu::ShaderSource::Wgsl(shader_source.into()),
        });

        // パイプライン作成
        let (pipeline, bind_group_layout) =
            Self::create_pipeline(&device, &module, &limits, items_per_thread);

        // 検索定数を構築
        let search_constants = Self::build_constants(context);

        // バッファ作成
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
        }
    }

    /// コンピュートパイプラインとバインドグループレイアウトを作成
    fn create_pipeline(
        device: &wgpu::Device,
        module: &wgpu::ShaderModule,
        limits: &SearchJobLimits,
        items_per_thread: u32,
    ) -> (wgpu::ComputePipeline, wgpu::BindGroupLayout) {
        // バインドグループレイアウト (3 bindings)
        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("mtseed-iv-search-layout"),
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
                // binding 2: MatchOutput (storage, read_write)
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
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
            label: Some("mtseed-iv-search-pipeline-layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        // コンピュートパイプライン
        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("mtseed-iv-search-pipeline"),
            layout: Some(&pipeline_layout),
            module,
            entry_point: Some("mt_iv_search"),
            compilation_options: wgpu::PipelineCompilationOptions {
                constants: &[
                    (
                        String::from("WORKGROUP_SIZE"),
                        f64::from(limits.workgroup_size),
                    ),
                    (
                        String::from("ITEMS_PER_THREAD"),
                        f64::from(items_per_thread),
                    ),
                ]
                .into_iter()
                .collect(),
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
        output_buffer: &wgpu::Buffer,
    ) -> wgpu::BindGroup {
        device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("mtseed-iv-search-bind-group"),
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
                    resource: output_buffer.as_entire_binding(),
                },
            ],
        })
    }

    /// IV 範囲をパック (min << 16) | max
    fn pack_iv_range(range: (u8, u8)) -> u32 {
        (u32::from(range.0) << 16) | u32::from(range.1)
    }

    /// 検索定数を構築
    fn build_constants(context: &MtseedSearchContext) -> SearchConstants {
        let f = &context.iv_filter;
        SearchConstants {
            mt_offset: context.mt_offset,
            is_roamer: u32::from(context.is_roamer),
            iv_hp: Self::pack_iv_range(f.hp),
            iv_atk: Self::pack_iv_range(f.atk),
            iv_def: Self::pack_iv_range(f.def),
            iv_spa: Self::pack_iv_range(f.spa),
            iv_spd: Self::pack_iv_range(f.spd),
            iv_spe: Self::pack_iv_range(f.spe),
            reserved0: 0,
            reserved1: 0,
        }
    }

    /// 定数バッファを作成
    fn create_constants_buffer(device: &wgpu::Device, constants: &SearchConstants) -> wgpu::Buffer {
        device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("mtseed-iv-search-constants-buffer"),
            contents: bytemuck::bytes_of(constants),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        })
    }

    /// ディスパッチ状態バッファを作成
    fn create_dispatch_state_buffer(device: &wgpu::Device) -> wgpu::Buffer {
        device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("mtseed-iv-dispatch-state-buffer"),
            size: std::mem::size_of::<DispatchState>() as u64,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        })
    }

    /// 結果バッファを作成
    fn create_output_buffer(device: &wgpu::Device, capacity: u32) -> wgpu::Buffer {
        // 構造: [match_count: u32 (4 bytes aligned), padding: u32, records: array<MatchRecord>]
        // atomic<u32> は 4 bytes。MatchRecord は 8 bytes。
        // ただし WGSL の配列アライメント要件を満たすため、match_count の後ろに
        // パディングを置く必要はない (MatchRecord は 4-byte aligned)。
        // バッファサイズ: 4 (match_count) + capacity * 8 (records)
        let size = 4 + u64::from(capacity) * std::mem::size_of::<MatchRecord>() as u64;
        device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("mtseed-iv-output-buffer"),
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
            label: Some("mtseed-iv-staging-buffer"),
            size,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        })
    }

    /// GPU ディスパッチ実行
    ///
    /// # Returns
    /// `(candidates, processed_count)`
    pub async fn dispatch(&self, seed_count: u32, base_seed: u32) -> (Vec<MtseedResult>, u32) {
        let count = seed_count.min(self.limits.max_messages_per_dispatch);
        if count == 0 {
            return (vec![], 0);
        }

        // ディスパッチ状態を更新
        let dispatch_state = DispatchState {
            seed_count: count,
            base_seed,
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
        let candidates = self.read_results().await;

        (candidates, count)
    }

    /// 結果を読み出し（非同期ポーリング）
    #[allow(clippy::cast_possible_truncation)]
    async fn read_results(&self) -> Vec<MtseedResult> {
        let buffer_slice = self.staging_buffer.slice(..);

        let (tx, rx) = futures_channel::oneshot::channel();

        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            let _ = tx.send(result);
        });

        #[cfg(target_arch = "wasm32")]
        self.device.poll(wgpu::Maintain::Poll);

        #[cfg(not(target_arch = "wasm32"))]
        self.device.poll(wgpu::Maintain::Wait);

        if rx.await.ok().and_then(Result::ok).is_none() {
            return vec![];
        }

        let data = buffer_slice.get_mapped_range();
        let match_count = u32::from_le_bytes([data[0], data[1], data[2], data[3]]);
        let record_count = match_count.min(self.limits.candidate_capacity) as usize;

        let mut candidates = Vec::with_capacity(record_count);
        for i in 0..record_count {
            let offset = 4 + i * std::mem::size_of::<MatchRecord>();
            let record: MatchRecord = bytemuck::pod_read_unaligned(&data[offset..offset + 8]);

            // パック IV をアンパック
            let ivs = unpack_ivs(record.ivs_packed);

            candidates.push(MtseedResult {
                seed: MtSeed::new(record.seed),
                ivs,
            });
        }

        drop(data);
        self.staging_buffer.unmap();

        candidates
    }
}

/// パック IV をアンパック (各 5bit × 6 = 30bit)
fn unpack_ivs(packed: u32) -> Ivs {
    Ivs::new(
        (packed & 0x1F) as u8,
        ((packed >> 5) & 0x1F) as u8,
        ((packed >> 10) & 0x1F) as u8,
        ((packed >> 15) & 0x1F) as u8,
        ((packed >> 20) & 0x1F) as u8,
        ((packed >> 25) & 0x1F) as u8,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::IvFilter;

    #[test]
    fn test_pack_iv_range() {
        assert_eq!(SearchPipeline::pack_iv_range((0, 31)), 0x0000_001F);
        assert_eq!(SearchPipeline::pack_iv_range((31, 31)), 0x001F_001F);
        assert_eq!(SearchPipeline::pack_iv_range((10, 20)), 0x000A_0014);
    }

    #[test]
    fn test_unpack_ivs() {
        let packed = 31 | (30 << 5) | (29 << 10) | (28 << 15) | (27 << 20) | (26 << 25);
        let ivs = unpack_ivs(packed);
        assert_eq!(ivs.hp, 31);
        assert_eq!(ivs.atk, 30);
        assert_eq!(ivs.def, 29);
        assert_eq!(ivs.spa, 28);
        assert_eq!(ivs.spd, 27);
        assert_eq!(ivs.spe, 26);
    }

    #[test]
    fn test_unpack_ivs_zero() {
        let ivs = unpack_ivs(0);
        assert_eq!(ivs.hp, 0);
        assert_eq!(ivs.atk, 0);
        assert_eq!(ivs.def, 0);
        assert_eq!(ivs.spa, 0);
        assert_eq!(ivs.spd, 0);
        assert_eq!(ivs.spe, 0);
    }

    #[test]
    fn test_build_constants() {
        let context = MtseedSearchContext {
            iv_filter: IvFilter::six_v(),
            mt_offset: 7,
            is_roamer: false,
        };
        let constants = SearchPipeline::build_constants(&context);
        assert_eq!(constants.mt_offset, 7);
        assert_eq!(constants.is_roamer, 0);
        assert_eq!(constants.iv_hp, 0x001F_001F);
        assert_eq!(constants.iv_atk, 0x001F_001F);
    }

    #[test]
    fn test_build_constants_roamer() {
        let context = MtseedSearchContext {
            iv_filter: IvFilter::any(),
            mt_offset: 1,
            is_roamer: true,
        };
        let constants = SearchPipeline::build_constants(&context);
        assert_eq!(constants.mt_offset, 1);
        assert_eq!(constants.is_roamer, 1);
        assert_eq!(constants.iv_hp, 0x0000_001F);
    }
}
