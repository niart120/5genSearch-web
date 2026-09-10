import { createWonderCardListTasks } from '@/services/search-tasks';
import type { SupportedLocale } from '@/i18n';
import { useWonderCardListStore } from '../store';
import type { WonderCardListRequest } from '../types';
import { useWonderCardExecution } from './use-wondercard-execution';

function createTasks(request: WonderCardListRequest, workers: number) {
  const { params, genConfig, filter } = request.settings;
  return createWonderCardListTasks(request.origins, params, genConfig, filter, workers);
}

export function useWonderCardList(locale: SupportedLocale) {
  const results = useWonderCardListStore((s) => s.results);
  const { startResults, appendResults } = useWonderCardListStore.getState();
  return useWonderCardExecution(locale, results, startResults, appendResults, createTasks);
}
