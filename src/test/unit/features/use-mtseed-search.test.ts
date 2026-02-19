/**
 * useMtseedSearch Hook — Store 差分同期テスト
 *
 * useSearch (WorkerPool) をモックし、
 * Hook ↔ Store 間の結果差分同期ロジックを検証する。
 *
 * WorkerPool 系 Hook (datetime-search, mtseed-search, egg-search,
 * tid-adjust, pokemon-list, egg-list) は全て同一の差分同期パターンを持つ。
 * 本テストは useMtseedSearch を代表として検証する。
 *
 * 検証項目 (STATE_PERSISTENCE.md §5.2):
 *   - 検索結果の Store 同期: 検索完了後に Store に結果が書き込まれること
 *   - mount 直後の上書き防止: remount 時に Store の既存結果が空配列で上書きされないこと
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMtseedSearchStore, getMtseedSearchInitialState } from '@/features/mtseed-search/store';
import type { UseSearchResult } from '@/hooks/use-search';
import type { MtseedResult } from '@/wasm/wasm_pkg.js';

/* ------------------------------------------------------------------ */
/*  useSearch モック                                                    */
/* ------------------------------------------------------------------ */

const mockStart = vi.fn();
const mockCancel = vi.fn();

function createMockSearchReturn(overrides: Partial<UseSearchResult> = {}): UseSearchResult {
  return {
    isLoading: false,
    isInitialized: true,
    progress: undefined,
    results: [],
    error: undefined,
    start: mockStart,
    cancel: mockCancel,
    ...overrides,
  };
}

let currentMockSearch = createMockSearchReturn();

vi.mock('@/hooks/use-search', () => ({
  useSearch: () => currentMockSearch,
  useSearchConfig: vi.fn(() => ({ useGpu: false })),
}));

// search-tasks は WASM を import するため丸ごとモック
vi.mock('@/services/search-tasks', () => ({
  createMtseedIvSearchTasks: vi.fn(() => []),
}));

// flattenBatchResults + isMtseedResult は実装をそのまま使う (純粋関数)
// → vi.mock 不要

import { useMtseedSearch } from '@/features/mtseed-search/hooks/use-mtseed-search';

/* ------------------------------------------------------------------ */
/*  テストデータ                                                        */
/* ------------------------------------------------------------------ */

function createMockMtseedResult(seed: number): MtseedResult {
  return {
    seed,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  } as MtseedResult;
}

const MOCK_CONTEXT = {
  iv_filter: {
    hp: [31, 31],
    atk: [31, 31],
    def: [31, 31],
    spa: [31, 31],
    spd: [31, 31],
    spe: [31, 31],
  },
  mt_advances: 0,
  is_roamer: false,
};

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('useMtseedSearch — Store differential sync', () => {
  beforeEach(() => {
    localStorage.clear();
    useMtseedSearchStore.setState(getMtseedSearchInitialState());
    mockStart.mockReset();
    mockCancel.mockReset();
    currentMockSearch = createMockSearchReturn();
  });

  it('should sync batch results to Store via appendResults', () => {
    const { result, rerender } = renderHook(() => useMtseedSearch());

    // 検索開始 — startSearch 内で searchActiveRef = true, clearResults()
    act(() => {
      result.current.startSearch(MOCK_CONTEXT as never);
    });
    expect(useMtseedSearchStore.getState().results).toEqual([]);

    // Worker からバッチ結果到着をシミュレート
    const batch1 = [createMockMtseedResult(100), createMockMtseedResult(200)];
    currentMockSearch = createMockSearchReturn({
      isLoading: true,
      results: [batch1],
    });
    rerender();

    expect(useMtseedSearchStore.getState().results).toHaveLength(2);
    expect(useMtseedSearchStore.getState().results).toEqual(batch1);

    // 2 番目のバッチ到着 — 差分のみ追記
    const batch2 = [createMockMtseedResult(300)];
    currentMockSearch = createMockSearchReturn({
      isLoading: true,
      results: [batch1, batch2],
    });
    rerender();

    expect(useMtseedSearchStore.getState().results).toHaveLength(3);
    expect(useMtseedSearchStore.getState().results).toEqual([...batch1, ...batch2]);
  });

  it('should reflect stored results in Hook return value', () => {
    const { result, rerender } = renderHook(() => useMtseedSearch());

    act(() => {
      result.current.startSearch(MOCK_CONTEXT as never);
    });

    const batch = [createMockMtseedResult(42)];
    currentMockSearch = createMockSearchReturn({
      isLoading: false,
      results: [batch],
    });
    rerender();

    // Hook の results は Store 経由
    expect(result.current.results).toEqual(batch);
  });

  it('should not overwrite Store results on mount without active search (上書き防止)', () => {
    // Store に結果をあらかじめ配置
    const preExisting = [createMockMtseedResult(999)];
    useMtseedSearchStore.getState().setResults(preExisting);
    expect(useMtseedSearchStore.getState().results).toEqual(preExisting);

    // Hook をマウント — startSearch は呼ばない
    currentMockSearch = createMockSearchReturn({ results: [] });
    const { result } = renderHook(() => useMtseedSearch());

    // searchActiveRef = false のため useEffect が Store を上書きしない
    expect(useMtseedSearchStore.getState().results).toEqual(preExisting);
    expect(result.current.results).toEqual(preExisting);
  });

  it('should not overwrite Store on remount after search completion', () => {
    // 1st mount: 検索実行
    const { result, rerender, unmount } = renderHook(() => useMtseedSearch());

    act(() => {
      result.current.startSearch(MOCK_CONTEXT as never);
    });

    const batch = [createMockMtseedResult(500)];
    currentMockSearch = createMockSearchReturn({
      isLoading: false,
      results: [batch],
    });
    rerender();
    expect(useMtseedSearchStore.getState().results).toEqual(batch);

    // Unmount (Feature 切替をシミュレート)
    unmount();

    // 2nd mount: 新しい Hook インスタンス (検索は開始しない)
    currentMockSearch = createMockSearchReturn({ results: [] });
    const { result: result2 } = renderHook(() => useMtseedSearch());

    // Store の結果は保持
    expect(useMtseedSearchStore.getState().results).toEqual(batch);
    expect(result2.current.results).toEqual(batch);
  });

  it('should clear Store when new search starts', () => {
    // Store に既存結果をセット
    useMtseedSearchStore.getState().setResults([createMockMtseedResult(1)]);

    const { result } = renderHook(() => useMtseedSearch());

    // 新規検索開始 — clearResults() が呼ばれる
    act(() => {
      result.current.startSearch(MOCK_CONTEXT as never);
    });

    expect(useMtseedSearchStore.getState().results).toEqual([]);
  });

  it('should delegate start to useSearch.start', () => {
    const { result } = renderHook(() => useMtseedSearch());

    act(() => {
      result.current.startSearch(MOCK_CONTEXT as never);
    });

    expect(mockStart).toHaveBeenCalledTimes(1);
  });
});
