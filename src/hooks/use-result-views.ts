import { useMemo, useRef } from 'react';
import type { ResultView } from '@/lib/result-view';

const EMPTY_CACHE = Symbol('empty-result-view-cache');

export interface UseResultViewsOptions<TRaw extends object, TUi extends object> {
  rawResults: readonly TRaw[];
  resolutionKey: string;
  resolveBatch: (rawResults: TRaw[]) => TUi[];
}

interface ResolutionCache<TRaw extends object, TUi extends object> {
  resolutionKey: string;
  values: WeakMap<TRaw, TUi>;
}

export function useResultViews<TRaw extends object, TUi extends object>({
  rawResults,
  resolutionKey,
  resolveBatch,
}: UseResultViewsOptions<TRaw, TUi>): ResultView<TRaw, TUi>[] {
  const cacheRef = useRef<ResolutionCache<TRaw, TUi> | typeof EMPTY_CACHE>(EMPTY_CACHE);

  return useMemo(() => {
    if (cacheRef.current === EMPTY_CACHE || cacheRef.current.resolutionKey !== resolutionKey) {
      cacheRef.current = {
        resolutionKey,
        values: new WeakMap(),
      };
    }

    const cache = cacheRef.current.values;
    const unresolvedSet = new Set<TRaw>();

    for (const raw of rawResults) {
      if (!cache.has(raw)) {
        unresolvedSet.add(raw);
      }
    }

    const unresolved = [...unresolvedSet];

    if (unresolved.length > 0) {
      const resolved = resolveBatch(unresolved);

      if (resolved.length !== unresolved.length) {
        throw new Error(
          `resolveBatch must return the same number of results as its input (expected ${unresolved.length}, received ${resolved.length})`
        );
      }

      for (let index = 0; index < unresolved.length; index += 1) {
        cache.set(unresolved[index], resolved[index]);
      }
    }

    return rawResults.map((raw) => {
      const ui = cache.get(raw);

      if (ui === undefined) {
        throw new Error('Failed to resolve a result view');
      }

      return { raw, ui };
    });
  }, [rawResults, resolutionKey, resolveBatch]);
}
