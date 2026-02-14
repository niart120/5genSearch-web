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
    /// 1 スレッドあたりの処理アイテム数
    ///
    /// 値を増やすとディスパッチ回数が減り、WASM 非同期境界オーバーヘッドを削減できる。
    /// GPU 側は各スレッドがこの値だけループして SHA-1 を計算する。
    pub items_per_thread: u32,
    /// 1 ディスパッチあたりの最大メッセージ数
    ///
    /// `workgroup_size * max_workgroups * items_per_thread`
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

        // 1 スレッドあたりの処理アイテム数
        // ディスパッチ回数を削減し WASM 非同期オーバーヘッドを抑制するために
        // 各スレッドが複数アイテムを処理する。
        // GPU watchdog timeout を考慮し、GPU 種別ごとに値を調整:
        //   Discrete: 余裕があるため最大化 → ~6 ディスパッチ/100年
        //   Integrated: CPU 共有帯域を考慮 → ~12 ディスパッチ/100年
        //   Mobile: watchdog が厳しい (iOS ~2-3s) → ~94 ディスパッチ/100年
        let items_per_thread: u32 = match profile.kind {
            GpuKind::Discrete => 32,
            GpuKind::Integrated => 16,
            GpuKind::Mobile | GpuKind::Unknown => 4,
        };

        let max_messages_per_dispatch = workgroup_size * max_workgroups * items_per_thread;

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
            items_per_thread,
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
            items_per_thread: 1,
            max_messages_per_dispatch: 128 * 1024,
            candidate_capacity: 1024,
            max_dispatches_in_flight: 1,
        }
    }

    /// MT Seed IV 検索用の `ITEMS_PER_THREAD` を返す
    ///
    /// MT19937 の init (624 乗算) + twist (624 反復) は
    /// SHA-1 (80 ラウンド) より計算コストが高いため、
    /// `datetime_search` 用より小さい値にする。
    pub fn mtseed_items_per_thread(&self, profile: &GpuProfile) -> u32 {
        match profile.kind {
            GpuKind::Discrete => 8,
            GpuKind::Integrated => 4,
            GpuKind::Mobile | GpuKind::Unknown => 2,
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
        assert_eq!(limits.items_per_thread, 1);
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
        assert_eq!(limits.items_per_thread, 32);
        assert_eq!(limits.max_messages_per_dispatch, 256 * 65535 * 32);
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
        assert_eq!(limits.items_per_thread, 4);
        assert_eq!(limits.max_messages_per_dispatch, 128 * 4096 * 4);
        assert_eq!(limits.max_dispatches_in_flight, 1);
    }
}
