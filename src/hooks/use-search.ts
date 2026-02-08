/**
 * 検索実行用カスタムフック
 *
 * WorkerPool を使用した検索の実行・進捗・結果・キャンセルを管理する。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WorkerPool, type WorkerPoolConfig, type SearchResult } from '../services/worker-pool';
import type { AggregatedProgress } from '../services/progress';
import type { SearchTask } from '../workers/types';

/**
 * useSearch の戻り値
 */
export interface UseSearchResult {
  /** 検索実行中かどうか */
  isLoading: boolean;
  /** WorkerPool が初期化済みかどうか */
  isInitialized: boolean;
  /** 集約された進捗情報 */
  progress: AggregatedProgress | null;
  /** 検索結果 (累積) */
  results: SearchResult[];
  /** エラー */
  error: Error | null;
  /** 検索を開始 */
  start: (tasks: SearchTask[]) => void;
  /** 検索をキャンセル */
  cancel: () => void;
}

/**
 * 検索実行用カスタムフック
 *
 * @param config WorkerPool の設定
 * @returns 検索状態と操作関数
 *
 * @example
 * ```tsx
 * const { isLoading, progress, results, start, cancel } = useSearch({ useGpu: false });
 *
 * const handleSearch = () => {
 *   const tasks = generateSearchTasks(params);
 *   start(tasks);
 * };
 * ```
 */
export function useSearch(config: WorkerPoolConfig): UseSearchResult {
  const poolRef = useRef<WorkerPool | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [progress, setProgress] = useState<AggregatedProgress | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // 設定変更時に WorkerPool を再作成
  useEffect(() => {
    const pool = new WorkerPool(config);
    poolRef.current = pool;

    // 初期化
    pool
      .initialize()
      .then(() => {
        setIsInitialized(true);
      })
      .catch((error) => {
        setError(error instanceof Error ? error : new Error(String(error)));
      });

    // コールバック登録
    const unsubProgress = pool.onProgress(setProgress);
    const unsubResult = pool.onResult((r) => {
      setResults((prev) => [...prev, r]);
    });
    const unsubComplete = pool.onComplete(() => {
      setIsLoading(false);
    });
    const unsubError = pool.onError((e) => {
      setError(e);
      setIsLoading(false);
    });

    // クリーンアップ
    return () => {
      unsubProgress();
      unsubResult();
      unsubComplete();
      unsubError();
      pool.dispose();
    };
  }, [config]);

  const start = useCallback(
    (tasks: SearchTask[]) => {
      if (!poolRef.current || !isInitialized) return;

      setIsLoading(true);
      setProgress(null);
      setResults([]);
      setError(null);

      poolRef.current.start(tasks);
    },
    [isInitialized]
  );

  const cancel = useCallback(() => {
    poolRef.current?.cancel();
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    isInitialized,
    progress,
    results,
    error,
    start,
    cancel,
  };
}

/**
 * 安定した config オブジェクトを作成するヘルパー
 *
 * useSearch に渡す config が毎レンダリングで新しいオブジェクトにならないようにする。
 *
 * @param useGpu GPU を使用するか
 * @param workerCount Worker 数
 * @returns 安定した config オブジェクト
 */
export function useSearchConfig(useGpu: boolean, workerCount?: number): WorkerPoolConfig {
  return useMemo(() => ({ useGpu, workerCount }), [useGpu, workerCount]);
}
