/**
 * MT Seed 起動時刻検索フック
 *
 * WASM タスク生成 → WorkerPool 実行 → 結果収集を統合する。
 */

import { useCallback, useMemo } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { initMainThreadWasm } from '@/services/wasm-init';
import { createMtseedDatetimeSearchTasks } from '@/services/search-tasks';
import type { DatetimeSearchContext, MtSeed, SeedOrigin } from '@/wasm/wasm_pkg.js';
import type { GpuMtseedSearchTask } from '@/workers/types';
import type { AggregatedProgress } from '@/services/progress';

interface UseDatetimeSearchReturn {
  isLoading: boolean;
  isInitialized: boolean;
  progress: AggregatedProgress | undefined;
  results: SeedOrigin[];
  error: Error | undefined;
  startSearch: (context: DatetimeSearchContext, targetSeeds: MtSeed[]) => void;
  cancel: () => void;
}

/**
 * MT Seed 起動時刻検索を実行するカスタムフック
 *
 * @param useGpu GPU Worker を使用するか
 */
export function useDatetimeSearch(useGpu: boolean): UseDatetimeSearchReturn {
  const config = useSearchConfig(useGpu);
  const search = useSearch(config);

  const startSearch = useCallback(
    (context: DatetimeSearchContext, targetSeeds: MtSeed[]) => {
      if (useGpu) {
        const gpuTask: GpuMtseedSearchTask = {
          kind: 'gpu-mtseed',
          context,
          targetSeeds,
        };
        search.start([gpuTask]);
      } else {
        const workerCount = config.workerCount ?? navigator.hardwareConcurrency ?? 4;
        void initMainThreadWasm().then(() => {
          const tasks = createMtseedDatetimeSearchTasks(context, targetSeeds, workerCount);
          search.start(tasks);
        });
      }
    },
    [useGpu, config.workerCount, search]
  );

  // 検索結果を SeedOrigin[] にフラット化
  const results = useMemo(() => {
    const flat: SeedOrigin[] = [];
    for (const batch of search.results) {
      // MtseedDatetime / GPU の結果は SeedOrigin[]
      if (Array.isArray(batch) && batch.length > 0) {
        const first = batch[0];
        if (first && ('Startup' in first || 'Seed' in first)) {
          flat.push(...(batch as SeedOrigin[]));
        }
      }
    }
    return flat;
  }, [search.results]);

  return {
    isLoading: search.isLoading,
    isInitialized: search.isInitialized,
    progress: search.progress,
    results,
    error: search.error,
    startSearch,
    cancel: search.cancel,
  };
}
