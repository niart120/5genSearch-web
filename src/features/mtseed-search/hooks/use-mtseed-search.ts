/**
 * MT Seed IV 全探索フック
 *
 * WASM タスク生成 → WorkerPool 実行 → 結果収集を統合する。
 */

import { useCallback, useMemo } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { createMtseedIvSearchTasks } from '@/services/search-tasks';
import { flattenBatchResults, isMtseedResult } from '@/services/batch-utils';
import type { MtseedSearchContext, MtseedResult } from '@/wasm/wasm_pkg.js';
import type { AggregatedProgress } from '@/services/progress';
import type { GpuMtseedIvSearchTask } from '@/workers/types';

interface UseMtseedSearchReturn {
  isLoading: boolean;
  isInitialized: boolean;
  progress: AggregatedProgress | undefined;
  results: MtseedResult[];
  error: Error | undefined;
  startSearch: (context: MtseedSearchContext) => void;
  cancel: () => void;
}

/**
 * MT Seed IV 全探索を実行するカスタムフック
 *
 * @param useGpu GPU Worker を使用するか
 */
export function useMtseedSearch(useGpu: boolean): UseMtseedSearchReturn {
  const config = useSearchConfig(useGpu);
  const search = useSearch(config);

  const startSearch = useCallback(
    (context: MtseedSearchContext) => {
      if (useGpu) {
        const gpuTask: GpuMtseedIvSearchTask = {
          kind: 'gpu-mtseed-iv',
          context,
        };
        search.start([gpuTask]);
      } else {
        const workerCount = config.workerCount ?? navigator.hardwareConcurrency ?? 4;
        const tasks = createMtseedIvSearchTasks(context, workerCount);
        search.start(tasks);
      }
    },
    [useGpu, config.workerCount, search]
  );

  const results = useMemo(
    () => flattenBatchResults<MtseedResult>(search.results, isMtseedResult),
    [search.results]
  );

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
