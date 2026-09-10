import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearch, useSearchConfig } from '@/hooks/use-search';
import { useResultViews } from '@/hooks/use-result-views';
import { flattenBatchResults, isGeneratedWonderCardData } from '@/services/batch-utils';
import { resolve_wondercard_data_batch } from '@/wasm/wasm_pkg.js';
import type { GeneratedWonderCardData } from '@/wasm/wasm_pkg.js';
import type { SearchTask } from '@/workers/types';
import type { SupportedLocale } from '@/i18n';

/** 両経路のバッチ同期と表示解決。実行要求の型と保存先は各 feature が決める。 */
export function useWonderCardExecution<TRequest>(
  locale: SupportedLocale,
  storedResults: GeneratedWonderCardData[],
  startResults: (request: TRequest) => void,
  appendResults: (results: GeneratedWonderCardData[]) => void,
  createTasks: (request: TRequest, workerCount: number) => SearchTask[]
) {
  const search = useSearch(useSearchConfig(false));
  const { results: batches, isLoading, start, workerCount } = search;
  const active = useRef(false);
  const previous = useRef(0);
  const [requestError, setRequestError] = useState<Error>();

  useEffect(() => {
    if (!active.current || previous.current >= batches.length) return;
    const items = flattenBatchResults<GeneratedWonderCardData>(
      batches.slice(previous.current),
      isGeneratedWonderCardData
    );
    previous.current = batches.length;
    if (items.length > 0) appendResults(items);
  }, [batches, appendResults]);
  useEffect(() => {
    if (!isLoading) active.current = false;
  }, [isLoading]);

  const resolveBatch = useCallback(
    (raw: GeneratedWonderCardData[]) => resolve_wondercard_data_batch(raw, locale),
    [locale]
  );
  const results = useResultViews({
    rawResults: storedResults,
    resolutionKey: locale,
    resolveBatch,
  });

  const execute = useCallback(
    (input: TRequest) => {
      setRequestError(undefined);
      try {
        const request = structuredClone(input);
        const tasks = createTasks(request, workerCount);
        active.current = true;
        previous.current = 0;
        startResults(request);
        start(tasks);
      } catch (error) {
        active.current = false;
        setRequestError(error instanceof Error ? error : new Error(String(error)));
      }
    },
    [createTasks, workerCount, startResults, start]
  );

  return {
    isLoading,
    isInitialized: search.isInitialized,
    progress: search.progress,
    error: requestError ?? search.error,
    results,
    execute,
    cancel: search.cancel,
  };
}
