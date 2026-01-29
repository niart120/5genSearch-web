//! GPU 検索ジョブ制限値
//!
//! デバイス制限から検索パラメータを導出する。

use super::profile::{GpuKind, GpuProfile};

/// GPU 検索ジョブの制限値
#[derive(Debug, Clone)]
pub struct SearchJobLimits {
    /// ワークグループサイズ (スレッド数/ワークグループ)
    pub workgroup_size: u32,
    /// 最大ワークグループ数 (1 ディスパッチあたり)
    pub max_workgroups: u32,
    /// 1 ディスパッチあたりの最大メッセージ数
    pub max_messages_per_dispatch: u32,
    /// 候補バッファ容量 (マッチ結果の最大数)
    pub candidate_capacity: u32,
    /// 同時実行可能なディスパッチ数
    pub max_dispatches_in_flight: u32,
}

impl SearchJobLimits {
    /// デバイス制限から導出
    pub fn from_device_limits(limits: &wgpu::Limits, profile: &GpuProfile) -> Self {
        let workgroup_size = match profile.kind {
            GpuKind::Discrete | GpuKind::Integrated => 256,
            GpuKind::Mobile | GpuKind::Unknown => 128,
        };

        let max_workgroups = limits.max_compute_workgroups_per_dimension.min(65535);

        let max_messages_per_dispatch = workgroup_size * max_workgroups;

        // 候補バッファ: 4KB (1024 レコード × 8 bytes)
        let candidate_capacity = 1024;

        let max_dispatches_in_flight = match profile.kind {
            GpuKind::Discrete => 4,
            GpuKind::Integrated => 2,
            GpuKind::Mobile | GpuKind::Unknown => 1,
        };

        Self {
            workgroup_size,
            max_workgroups,
            max_messages_per_dispatch,
            candidate_capacity,
            max_dispatches_in_flight,
        }
    }

    /// デフォルト制限 (保守的な値)
    pub fn default_conservative() -> Self {
        Self {
            workgroup_size: 128,
            max_workgroups: 1024,
            max_messages_per_dispatch: 128 * 1024,
            candidate_capacity: 1024,
            max_dispatches_in_flight: 1,
        }
    }
}

impl Default for SearchJobLimits {
    fn default() -> Self {
        Self::default_conservative()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_conservative() {
        let limits = SearchJobLimits::default_conservative();
        assert_eq!(limits.workgroup_size, 128);
        assert_eq!(limits.max_workgroups, 1024);
        assert_eq!(limits.candidate_capacity, 1024);
    }

    #[test]
    fn test_from_device_limits_discrete() {
        let wgpu_limits = wgpu::Limits {
            max_compute_workgroups_per_dimension: 65535,
            ..wgpu::Limits::default()
        };
        let profile = GpuProfile {
            kind: GpuKind::Discrete,
            name: "Test GPU".into(),
            vendor: "Test".into(),
            driver: "1.0".into(),
        };

        let limits = SearchJobLimits::from_device_limits(&wgpu_limits, &profile);
        assert_eq!(limits.workgroup_size, 256);
        assert_eq!(limits.max_workgroups, 65535);
        assert_eq!(limits.max_dispatches_in_flight, 4);
    }

    #[test]
    fn test_from_device_limits_mobile() {
        let wgpu_limits = wgpu::Limits {
            max_compute_workgroups_per_dimension: 4096,
            ..wgpu::Limits::default()
        };
        let profile = GpuProfile {
            kind: GpuKind::Mobile,
            name: "Mobile GPU".into(),
            vendor: "Test".into(),
            driver: "1.0".into(),
        };

        let limits = SearchJobLimits::from_device_limits(&wgpu_limits, &profile);
        assert_eq!(limits.workgroup_size, 128);
        assert_eq!(limits.max_workgroups, 4096);
        assert_eq!(limits.max_dispatches_in_flight, 1);
    }
}
