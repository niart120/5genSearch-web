/**
 * MT Seed 起動時刻検索フック
 *
 * WASM タスク生成 → WorkerPool 実行 → 結果収集を統合する。
 * 結果は Feature Store に同期し、Feature 切替後も保持される。
 */

import { useCallback, useEffect, useRef } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { createMtseedDatetimeSearchTasks } from '@/services/search-tasks';
import { useDatetimeSearchStore } from '../store';
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

/** 検索結果を SeedOrigin[] にフラット化 */
function flattenSeedOrigins(batches: unknown[][]): SeedOrigin[] {
  const flat: SeedOrigin[] = [];
  for (const batch of batches) {
    if (Array.isArray(batch) && batch.length > 0) {
      const first = batch[0];
      if (first && typeof first === 'object' && ('Startup' in first || 'Seed' in first)) {
        flat.push(...(batch as SeedOrigin[]));
      }
    }
  }
  return flat;
}

/**
 * MT Seed 起動時刻検索を実行するカスタムフック
 */
export function useDatetimeSearch(): UseDatetimeSearchReturn {
  const useGpu = useDatetimeSearchStore((s) => s.useGpu);
  const config = useSearchConfig(useGpu);
  const search = useSearch(config);

  // Store actions
  const setResults = useDatetimeSearchStore((s) => s.setResults);
  const clearResults = useDatetimeSearchStore((s) => s.clearResults);
  const storedResults = useDatetimeSearchStore((s) => s.results);

  // mount 直後の空配列で Store 上書きを防止
  const searchActiveRef = useRef(false);

  const startSearch = useCallback(
    (context: DatetimeSearchContext, targetSeeds: MtSeed[]) => {
      searchActiveRef.current = true;
      clearResults();
      if (useGpu) {
        const gpuTask: GpuMtseedSearchTask = {
          kind: 'gpu-mtseed',
          context,
          targetSeeds,
        };
        search.start([gpuTask]);
      } else {
        const workerCount = config.workerCount ?? navigator.hardwareConcurrency ?? 4;
        const tasks = createMtseedDatetimeSearchTasks(context, targetSeeds, workerCount);
        search.start(tasks);
      }
    },
    [useGpu, config.workerCount, search, clearResults]
  );

  // 結果同期
  useEffect(() => {
    if (!searchActiveRef.current) return;
    const flat = flattenSeedOrigins(search.results);
    setResults(flat);
  }, [search.results, setResults]);

  // 検索完了時にフラグリセット
  useEffect(() => {
    if (searchActiveRef.current && !search.isLoading) {
      searchActiveRef.current = false;
    }
  }, [search.isLoading]);

  return {
    isLoading: search.isLoading,
    isInitialized: search.isInitialized,
    progress: search.progress,
    results: storedResults,
    error: search.error,
    startSearch,
    cancel: search.cancel,
  };
}
