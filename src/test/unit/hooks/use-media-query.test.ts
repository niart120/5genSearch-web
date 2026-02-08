import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMediaQuery } from '@/hooks/use-media-query';

describe('useMediaQuery', () => {
  let listeners: Array<() => void>;
  let mockMatches: boolean;

  beforeEach(() => {
    listeners = [];
    mockMatches = false;

    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: mockMatches,
        media: query,
        addEventListener: (_event: string, handler: () => void) => {
          listeners.push(handler);
        },
        removeEventListener: (_event: string, handler: () => void) => {
          listeners = listeners.filter((l) => l !== handler);
        },
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('初期状態で matchMedia の結果を返す', () => {
    mockMatches = true;
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(true);
  });

  it('初期状態で false を返す (条件不一致)', () => {
    mockMatches = false;
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);
  });

  it('メディアクエリの変更に追従する', () => {
    mockMatches = false;
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);

    // Simulate media query change
    mockMatches = true;
    act(() => {
      for (const listener of listeners) {
        listener();
      }
    });
    expect(result.current).toBe(true);
  });

  it('アンマウント時にリスナーが解除される', () => {
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(listeners).toHaveLength(1);
    unmount();
    expect(listeners).toHaveLength(0);
  });
});
