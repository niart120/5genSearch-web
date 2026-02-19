/**
 * MT Seed IV 全探索フック
 *
 * WASM タスク生成 → WorkerPool 実行 → 結果収集を統合する。
 * 結果は Feature Store に同期し、Feature 切替後も保持される。
 */

import { useCallback, useEffect, useRef } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { createMtseedIvSearchTasks } from '@/services/search-tasks';
import { flattenBatchResults, isMtseedResult } from '@/services/batch-utils';
import { useMtseedSearchStore } from '../store';
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
 */
export function useMtseedSearch(): UseMtseedSearchReturn {
  const useGpu = useMtseedSearchStore((s) => s.useGpu);
  const config = useSearchConfig(useGpu);
  const search = useSearch(config);

  // Store actions
  const setResults = useMtseedSearchStore((s) => s.setResults);
  const clearResults = useMtseedSearchStore((s) => s.clearResults);
  const storedResults = useMtseedSearchStore((s) => s.results);

  // mount 直後の空配列で Store 上書きを防止
  const searchActiveRef = useRef(false);

  const startSearch = useCallback(
    (context: MtseedSearchContext) => {
      searchActiveRef.current = true;
      clearResults();
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
    [useGpu, config.workerCount, search, clearResults]
  );

  // 結果同期
  useEffect(() => {
    if (!searchActiveRef.current) return;
    const flat = flattenBatchResults<MtseedResult>(search.results, isMtseedResult);
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
