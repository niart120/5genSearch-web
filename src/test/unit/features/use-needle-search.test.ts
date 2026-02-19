/**
 * use-needle-search Hook — Store 同期テスト
 *
 * search_needle_pattern (WASM) をモックし、
 * Hook ↔ Store 間の結果同期ロジックを検証する。
 *
 * 検証項目 (STATE_PERSISTENCE.md §5.2):
 *   - 検索結果の Store 同期
 *   - mount 直後の上書き防止
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNeedleStore, getNeedleInitialState } from '@/features/needle/store';

// WASM モック — search_needle_pattern をテスト側から制御
vi.mock('@/wasm/wasm_pkg.js', () => ({
  search_needle_pattern: vi.fn(),
}));

// モック関数を取得 (型安全)
import { search_needle_pattern } from '@/wasm/wasm_pkg.js';
import { useNeedleSearch } from '@/features/needle/hooks/use-needle-search';
import type { GenerationConfig, NeedleDirection, SeedOrigin } from '@/wasm/wasm_pkg.js';

const mockedSearch = vi.mocked(search_needle_pattern);

/* ------------------------------------------------------------------ */
/*  テストデータ                                                        */
/* ------------------------------------------------------------------ */

const MOCK_ORIGIN = { Seed: { base_seed: 0n, mt_seed: 0 } } as unknown as SeedOrigin;
const MOCK_PATTERN: NeedleDirection[] = ['N', 'E', 'S'];
const MOCK_CONFIG: GenerationConfig = {
  version: 'Black',
  game_start: {
    start_mode: 'Continue',
    save: 'WithSave',
    memory_link: 'Disabled',
    shiny_charm: 'NotObtained',
  },
  user_offset: 0,
  max_advance: 30,
};

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('useNeedleSearch — Store sync', () => {
  beforeEach(() => {
    localStorage.clear();
    useNeedleStore.setState(getNeedleInitialState());
    mockedSearch.mockReset();
  });

  it('should sync search results to Store', () => {
    const mockResults = [
      { advance: 5, direction: 'N', source: MOCK_ORIGIN },
      { advance: 10, direction: 'E', source: MOCK_ORIGIN },
    ];
    mockedSearch.mockReturnValue(mockResults as never);

    const { result } = renderHook(() => useNeedleSearch());

    act(() => {
      result.current.search([MOCK_ORIGIN], MOCK_PATTERN, MOCK_CONFIG);
    });

    // Hook の戻り値に反映
    expect(result.current.results).toEqual(mockResults);
    // Store にも同期済み
    expect(useNeedleStore.getState().results).toEqual(mockResults);
    expect(result.current.error).toBeUndefined();
  });

  it('should clear Store results on clear()', () => {
    const mockResults = [{ advance: 5, direction: 'N', source: MOCK_ORIGIN }];
    mockedSearch.mockReturnValue(mockResults as never);

    const { result } = renderHook(() => useNeedleSearch());

    act(() => {
      result.current.search([MOCK_ORIGIN], MOCK_PATTERN, MOCK_CONFIG);
    });
    expect(useNeedleStore.getState().results).toHaveLength(1);

    act(() => {
      result.current.clear();
    });
    expect(useNeedleStore.getState().results).toEqual([]);
    expect(result.current.error).toBeUndefined();
  });

  it('should set error and clear Store results on WASM error', () => {
    mockedSearch.mockImplementation(() => {
      throw new Error('WASM error');
    });

    const { result } = renderHook(() => useNeedleSearch());

    act(() => {
      result.current.search([MOCK_ORIGIN], MOCK_PATTERN, MOCK_CONFIG);
    });

    expect(result.current.error).toBe('WASM error');
    expect(useNeedleStore.getState().results).toEqual([]);
  });

  it('should preserve Store results on mount without search (上書き防止)', () => {
    // Store に結果をあらかじめ配置
    const preExisting = [{ advance: 99, direction: 'S', source: MOCK_ORIGIN }];
    useNeedleStore.getState().setResults(preExisting as never);

    // Hook をマウント — search() は呼ばない
    const { result } = renderHook(() => useNeedleSearch());

    // Store の既存結果が保持されていること
    expect(result.current.results).toEqual(preExisting);
    expect(useNeedleStore.getState().results).toEqual(preExisting);
  });
});
