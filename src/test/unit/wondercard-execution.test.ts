import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWonderCardList } from '@/features/wondercard-list/hooks/use-wondercard-list';
import { useWonderCardSearch } from '@/features/wondercard-search/hooks/use-wondercard-search';
import {
  useWonderCardListStore,
  getWonderCardListInitialState,
} from '@/features/wondercard-list/store';
import {
  useWonderCardSearchStore,
  getWonderCardSearchInitialState,
} from '@/features/wondercard-search/store';
import { buildWonderCardRunSettings } from '@/features/wondercard-list/request';
import { resolveWonderCardSelection } from '@/features/wondercard-list/types';
import { getDsConfigInitialState } from '@/stores/settings/ds-config';
import { createWonderCardView, UI_CARD, UI_ORIGIN } from '../fixtures/wondercards/ui';
import type { UseSearchResult } from '@/hooks/use-search';
import type { GeneratedWonderCardData } from '@/wasm/wasm_pkg.js';
import {
  createWonderCardListTasks,
  createWonderCardDatetimeSearchTasks,
} from '@/services/search-tasks';

const mocked = vi.hoisted(() => ({ search: {} as UseSearchResult, config: vi.fn() }));
vi.mock('@/hooks/use-search', () => ({
  useSearch: () => mocked.search,
  useSearchConfig: mocked.config,
}));
vi.mock('@/services/search-tasks', () => ({
  createWonderCardListTasks: vi.fn(),
  createWonderCardDatetimeSearchTasks: vi.fn(),
}));
vi.mock('@/wasm/wasm_pkg.js', () => ({
  get_species_gender_ratio: () => 'F1M1',
  resolve_wondercard_data_batch: (data: GeneratedWonderCardData[], locale: string) =>
    data.map((r) => ({
      ...createWonderCardView().ui,
      advance: r.advance,
      species_name: locale === 'ja' ? 'ピカチュウ' : 'Pikachu',
    })),
}));

beforeEach(() => {
  useWonderCardListStore.setState(getWonderCardListInitialState());
  useWonderCardSearchStore.setState(getWonderCardSearchInitialState());
  mocked.search = {
    isLoading: false,
    isInitialized: true,
    workerCount: 2,
    results: [],
    error: undefined,
    progress: undefined,
    start: vi.fn(() => {
      mocked.search.isLoading = true;
      mocked.search.results = [];
    }),
    cancel: vi.fn(() => {
      mocked.search.isLoading = false;
    }),
  };
  mocked.config.mockReset();
  vi.mocked(createWonderCardListTasks).mockReset().mockReturnValue([]);
  vi.mocked(createWonderCardDatetimeSearchTasks).mockReset().mockReturnValue([]);
});

describe.each(['list', 'search'] as const)('配達員の %s 実行', (mode) => {
  const useRun = mode === 'list' ? useWonderCardList : useWonderCardSearch;
  const store = mode === 'list' ? useWonderCardListStore : useWonderCardSearchStore;
  const tasks = mode === 'list' ? createWonderCardListTasks : createWonderCardDatetimeSearchTasks;
  function request() {
    const ds = getDsConfigInitialState();
    const inputs = { ...getWonderCardListInitialState().inputs, cardId: UI_CARD.id };
    const settings = buildWonderCardRunSettings(
      inputs,
      resolveWonderCardSelection(UI_CARD, ds.config, { tid: 0, sid: 0 }),
      ds,
      { tid: 0, sid: 0 }
    )!;
    return { settings, origins: [UI_ORIGIN], ...getWonderCardSearchInitialState() };
  }
  it('既存結果を保持して表示し、バッチを一度ずつ追記し、中断・再表示・再実行できる', () => {
    const first = createWonderCardView().raw;
    store.getState().startResults(request());
    store.getState().appendResults([first]);
    const { result, rerender, unmount } = renderHook(() => useRun('en'));
    expect(result.current.results).toHaveLength(1);
    expect(mocked.config).toHaveBeenCalledWith(false);
    act(() => result.current.execute(request()));
    expect(result.current.results).toEqual([]);
    mocked.search.results = [[first]];
    rerender();
    expect(result.current.results).toHaveLength(1);
    mocked.search.results = [[first], [{ ...first, advance: 6 }]];
    rerender();
    rerender();
    expect(result.current.results.map((r) => r.raw.advance)).toEqual([5, 6]);
    act(() => result.current.cancel());
    rerender();
    unmount();
    const mounted = renderHook(() => useRun('ja'));
    expect(mounted.result.current.results.map((r) => r.ui.species_name)).toEqual([
      'ピカチュウ',
      'ピカチュウ',
    ]);
    act(() => mounted.result.current.execute(request()));
    mocked.search.results = [[{ ...first, advance: 7 }]];
    mounted.rerender();
    expect(store.getState().results.map((r) => r.advance)).toEqual([7]);
    mocked.search.error = new Error('worker failed');
    mocked.search.isLoading = false;
    mounted.rerender();
    expect(mounted.result.current.error?.message).toBe('worker failed');
    expect(store.getState().results).toHaveLength(1);
  });
  it('タスク構築に失敗した場合は旧結果を消さず、エラーとして表示する', () => {
    const original = request();
    store.getState().startResults(original);
    store.getState().appendResults([createWonderCardView().raw]);
    vi.mocked(tasks).mockImplementation(() => {
      throw new Error('invalid tasks');
    });
    const { result } = renderHook(() => useRun('en'));
    act(() => result.current.execute(request()));
    expect(result.current.error?.message).toBe('invalid tasks');
    expect(store.getState().resultRequest).toEqual(original);
    expect(store.getState().results).toHaveLength(1);
    expect(mocked.search.start).not.toHaveBeenCalled();
  });
});
