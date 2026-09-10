//! 日時を最大四件ずつ `SeedOrigin` に変換し、配達員のバッチへ供給する。

use std::collections::{HashSet, VecDeque};

use super::base::DatetimeHashGenerator;
use super::{calculate_time_chunks, expand_combinations};
use crate::core::datetime::DatetimeSearchSpace;
use crate::generation::flows::generator::wondercard::WonderCardBatchGenerator;
use crate::types::{
    CoreDataFilter, DatetimeSearchContext, GenerationConfig, SeedOrigin, StartupCondition,
    WonderCardDatetimeSearchParams, WonderCardParams,
};

pub(crate) struct WonderCardOrigins {
    datetime: DatetimeHashGenerator,
    pending: VecDeque<SeedOrigin>,
    condition: StartupCondition,
}

impl Iterator for WonderCardOrigins {
    type Item = SeedOrigin;

    fn next(&mut self) -> Option<Self::Item> {
        if self.pending.is_empty() {
            let (entries, len) = self.datetime.next_quad();
            self.pending
                .extend(
                    entries
                        .into_iter()
                        .take(usize::from(len))
                        .map(|(datetime, hash)| {
                            SeedOrigin::startup(hash.to_lcg_seed(), datetime, self.condition)
                        }),
                );
        }
        self.pending.pop_front()
    }
}

pub(crate) type WonderCardDatetimeSearcher = WonderCardBatchGenerator<WonderCardOrigins>;

pub(crate) fn create_searcher(
    params: WonderCardDatetimeSearchParams,
) -> Result<WonderCardDatetimeSearcher, String> {
    validate_config(&params.ds, &params.gen_config)?;
    if params.condition.key_mask.0 > 0xFFF {
        return Err("Invalid key mask".into());
    }
    let space = DatetimeSearchSpace::try_from(params.search_space)?;
    let origins = WonderCardOrigins {
        datetime: DatetimeHashGenerator::new(&params.ds, &space, params.condition),
        pending: VecDeque::with_capacity(4),
        condition: params.condition,
    };
    WonderCardBatchGenerator::new(
        origins,
        space.count(),
        params.wondercard_params,
        params.gen_config,
        params.filter,
    )
    .map_err(|e| e.to_string())
}

fn validate_config(ds: &crate::types::DsConfig, config: &GenerationConfig) -> Result<(), String> {
    if ds.version != config.version {
        return Err("ROM version mismatch".into());
    }
    config.game_start.validate(config.version)?;
    config.advance_count()?;
    Ok(())
}

/// 生成条件の検証は各 WASM オブジェクトが担当し、タスク分割では行わない。
pub(crate) fn build_tasks(
    context: &DatetimeSearchContext,
    wondercard_params: &WonderCardParams,
    gen_config: &GenerationConfig,
    filter: Option<&CoreDataFilter>,
    worker_count: u32,
) -> Result<Vec<WonderCardDatetimeSearchParams>, String> {
    validate_config(&context.ds, gen_config)?;
    let space = DatetimeSearchSpace::from_date_range(&context.date_range, &context.time_range)?;
    if worker_count == 0
        || context.ranges.is_empty()
        || context
            .ranges
            .iter()
            .any(|range| range.timer0_min > range.timer0_max || range.vcount_min > range.vcount_max)
    {
        return Err("Invalid startup ranges or worker count".into());
    }
    let mut combinations = expand_combinations(context);
    // 重なる範囲が指定されても同じ起動候補は一度だけ処理する。
    let mut seen = HashSet::new();
    combinations.retain(|c| seen.insert((c.timer0, c.vcount, c.key_mask.0)));
    let combo_count =
        u32::try_from(combinations.len()).map_err(|_| "Too many startup conditions")?;
    let spaces: Vec<_> = space
        .split(calculate_time_chunks(combo_count, worker_count)?)
        .into_iter()
        .filter(|part| part.count() > 0)
        .map(DatetimeSearchSpace::into_params)
        .collect();
    let mut tasks = Vec::new();
    for condition in combinations {
        for search_space in &spaces {
            tasks.push(WonderCardDatetimeSearchParams {
                ds: context.ds.clone(),
                search_space: search_space.clone(),
                condition,
                wondercard_params: wondercard_params.clone(),
                gen_config: gen_config.clone(),
                filter: filter.cloned(),
            });
        }
    }
    Ok(tasks)
}
