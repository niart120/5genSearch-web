import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearchTaskBuilder } from '@/hooks/use-search-task-builder';
import { useEggSearch } from '@/features/egg-search/hooks/use-egg-search';
import { useDatetimeSearch } from '@/features/datetime-search/hooks/use-datetime-search';
import { useTidAdjust } from '@/features/tid-adjust/hooks/use-tid-adjust';
import { useEggSearchStore, getEggSearchInitialState } from '@/features/egg-search/store';
import {
  useDatetimeSearchStore,
  getDatetimeSearchInitialState,
} from '@/features/datetime-search/store';
import { useTidAdjustStore, getTidAdjustInitialState } from '@/features/tid-adjust/store';
import { getDsConfigInitialState } from '@/stores/settings/ds-config';
import {
  createEggSearchTasks,
  createMtseedDatetimeSearchTasks,
  createTrainerInfoSearchTasks,
} from '@/services/search-tasks';
import type { UseSearchResult } from '@/hooks/use-search';

const mock = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock('@/hooks/use-search', () => ({
  useSearch: (): UseSearchResult => ({
    isLoading: false,
    isInitialized: true,
    workerCount: 1,
    results: [],
    error: undefined,
    progress: undefined,
    start: mock.start,
    cancel: vi.fn(),
  }),
  useSearchConfig: () => ({ useGpu: false, workerCount: 1 }),
}));
vi.mock('@/services/search-tasks', () => ({
  createEggSearchTasks: vi.fn(),
  createMtseedDatetimeSearchTasks: vi.fn(),
  createTrainerInfoSearchTasks: vi.fn(),
}));
vi.mock('@/wasm/wasm_pkg.js', () => ({ resolve_egg_data_batch: () => [] }));

beforeEach(() => {
  mock.start.mockReset();
  useEggSearchStore.setState(getEggSearchInitialState());
  useDatetimeSearchStore.setState({ ...getDatetimeSearchInitialState(), useGpu: false });
  useTidAdjustStore.setState(getTidAdjustInitialState());
  for (const build of [
    createEggSearchTasks,
    createMtseedDatetimeSearchTasks,
    createTrainerInfoSearchTasks,
  ]) {
    vi.mocked(build)
      .mockReset()
      .mockImplementation(() => {
        throw new Error('Invalid time range');
      });
  }
});

describe('検索タスク生成の例外', () => {
  it('WASM の文字列例外を Error にし、再試行で解除する', () => {
    const { result } = renderHook(useSearchTaskBuilder);
    act(() => {
      result.current.buildTasks(() => {
        throw 'Invalid date';
      });
    });
    expect(result.current.error?.message).toBe('Invalid date');
    act(() => {
      result.current.buildTasks(() => []);
    });
    expect(result.current.error).toBeUndefined();
  });

  it('旧3画面も例外を表示し、失敗時に既存結果を消さない', () => {
    const ds = getDsConfigInitialState();
    const eggForm = getEggSearchInitialState();
    const context = {
      ds: ds.config,
      ranges: ds.ranges,
      date_range: eggForm.dateRange,
      time_range: eggForm.timeRange,
      key_spec: eggForm.keySpec,
    };
    const eggBefore = useEggSearchStore.getState().results;
    const datetimeBefore = useDatetimeSearchStore.getState().results;
    const tidBefore = useTidAdjustStore.getState().results;
    const egg = renderHook(() => useEggSearch('en'));
    const datetime = renderHook(useDatetimeSearch);
    const tid = renderHook(useTidAdjust);
    act(() => {
      egg.result.current.startSearch(
        context,
        eggForm.eggParams,
        { ...eggForm.genConfig, version: ds.config.version, game_start: ds.gameStart },
        eggForm.filter
      );
      datetime.result.current.startSearch(context, [0]);
      tid.result.current.startSearch(
        context,
        { tid: undefined, sid: undefined, shiny_pid: undefined },
        ds.gameStart
      );
    });
    expect([
      egg.result.current.error?.message,
      datetime.result.current.error?.message,
      tid.result.current.error?.message,
    ]).toEqual(['Invalid time range', 'Invalid time range', 'Invalid time range']);
    expect(mock.start).not.toHaveBeenCalled();
    expect(useEggSearchStore.getState().results).toBe(eggBefore);
    expect(useDatetimeSearchStore.getState().results).toBe(datetimeBefore);
    expect(useTidAdjustStore.getState().results).toBe(tidBefore);
  });
});
