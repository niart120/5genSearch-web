import { createWonderCardDatetimeSearchTasks } from '@/services/search-tasks';
import type { SupportedLocale } from '@/i18n';
import { useWonderCardExecution } from '@/features/wondercard-list/hooks/use-wondercard-execution';
import { useWonderCardSearchStore } from '../store';
import { getWonderCardSearchContext, type WonderCardSearchRequest } from '../types';

function createTasks(request: WonderCardSearchRequest, workers: number) {
  const { params, genConfig, filter } = request.settings;
  return createWonderCardDatetimeSearchTasks(
    getWonderCardSearchContext(request),
    params,
    genConfig,
    filter,
    workers
  );
}

export function useWonderCardSearch(locale: SupportedLocale) {
  const results = useWonderCardSearchStore((s) => s.results);
  const { startResults, appendResults } = useWonderCardSearchStore.getState();
  return useWonderCardExecution(locale, results, startResults, appendResults, createTasks);
}
