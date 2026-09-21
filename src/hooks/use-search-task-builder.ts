import { useCallback, useState } from 'react';
import type { SearchTask } from '@/workers/types';

/** WASM の同期例外も検索画面へ返し、構築失敗時に既存結果を消さない。 */
export function useSearchTaskBuilder() {
  const [error, setError] = useState<Error>();
  const buildTasks = useCallback((build: () => SearchTask[]): SearchTask[] | undefined => {
    setError(undefined);
    try {
      return build();
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
      return undefined;
    }
  }, []);
  return { buildTasks, error };
}
