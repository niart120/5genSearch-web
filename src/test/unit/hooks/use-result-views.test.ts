import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useResultViews } from '@/hooks/use-result-views';

interface RawResult {
  id: number;
}

interface UiResult {
  label: string;
}

interface HookProps {
  rawResults: readonly RawResult[];
  resolutionKey: string;
}

function createResolver() {
  return vi.fn((rawResults: RawResult[]): UiResult[] =>
    rawResults.map((raw) => ({ label: `result-${raw.id}` }))
  );
}

describe('useResultViews', () => {
  it('raw と解決済み ui を入力順で一対一に組み立てる', () => {
    const first = { id: 1 };
    const second = { id: 2 };
    const resolveBatch = createResolver();

    const { result } = renderHook(() =>
      useResultViews({
        rawResults: [first, second],
        resolutionKey: 'ja',
        resolveBatch,
      })
    );

    expect(resolveBatch).toHaveBeenCalledOnce();
    expect(resolveBatch).toHaveBeenCalledWith([first, second]);
    expect(result.current).toEqual([
      { raw: first, ui: { label: 'result-1' } },
      { raw: second, ui: { label: 'result-2' } },
    ]);
    expect(result.current[0]?.raw).toBe(first);
    expect(result.current[1]?.raw).toBe(second);
  });

  it('同じ解決キーでは追加された参照だけを batch 解決する', () => {
    const first = { id: 1 };
    const second = { id: 2 };
    const resolveBatch = createResolver();
    const { result, rerender } = renderHook(
      ({ rawResults, resolutionKey }: HookProps) =>
        useResultViews({ rawResults, resolutionKey, resolveBatch }),
      {
        initialProps: {
          rawResults: [first],
          resolutionKey: 'ja',
        },
      }
    );

    const firstUi = result.current[0]?.ui;
    resolveBatch.mockClear();
    rerender({ rawResults: [first, second], resolutionKey: 'ja' });

    expect(resolveBatch).toHaveBeenCalledOnce();
    expect(resolveBatch).toHaveBeenCalledWith([second]);
    expect(result.current[0]?.ui).toBe(firstUi);
    expect(result.current.map(({ raw }) => raw)).toEqual([first, second]);
  });

  it('並べ替えと部分集合ではキャッシュ済み ui を入力順に再構成する', () => {
    const first = { id: 1 };
    const second = { id: 2 };
    const third = { id: 3 };
    const resolveBatch = createResolver();
    const { result, rerender } = renderHook(
      ({ rawResults, resolutionKey }: HookProps) =>
        useResultViews({ rawResults, resolutionKey, resolveBatch }),
      {
        initialProps: {
          rawResults: [first, second, third],
          resolutionKey: 'ja',
        },
      }
    );

    const secondUi = result.current[1]?.ui;
    const firstUi = result.current[0]?.ui;
    resolveBatch.mockClear();
    rerender({ rawResults: [second, first], resolutionKey: 'ja' });

    expect(resolveBatch).not.toHaveBeenCalled();
    expect(result.current).toEqual([
      { raw: second, ui: secondUi },
      { raw: first, ui: firstUi },
    ]);
  });

  it('同じ raw 参照の重複を batch 入力から除き、出力では元の件数を保つ', () => {
    const first = { id: 1 };
    const second = { id: 2 };
    const resolveBatch = createResolver();

    const { result } = renderHook(() =>
      useResultViews({
        rawResults: [first, first, second, first],
        resolutionKey: 'ja',
        resolveBatch,
      })
    );

    expect(resolveBatch).toHaveBeenCalledWith([first, second]);
    expect(result.current).toHaveLength(4);
    expect(result.current.map(({ raw }) => raw)).toEqual([first, first, second, first]);
    expect(result.current[0]?.ui).toBe(result.current[1]?.ui);
    expect(result.current[0]?.ui).toBe(result.current[3]?.ui);
  });

  it('解決キーが変わると同じ raw 参照も全件再解決する', () => {
    const first = { id: 1 };
    const second = { id: 2 };
    const resolveBatch = createResolver();
    const { result, rerender } = renderHook(
      ({ rawResults, resolutionKey }: HookProps) =>
        useResultViews({ rawResults, resolutionKey, resolveBatch }),
      {
        initialProps: {
          rawResults: [first, second],
          resolutionKey: 'ja',
        },
      }
    );

    const previousUi = result.current[0]?.ui;
    resolveBatch.mockClear();
    rerender({ rawResults: [first, second], resolutionKey: 'en' });

    expect(resolveBatch).toHaveBeenCalledOnce();
    expect(resolveBatch).toHaveBeenCalledWith([first, second]);
    expect(result.current[0]?.ui).not.toBe(previousUi);
  });

  it('値が同じでも別の raw オブジェクト参照は新規に解決する', () => {
    const original = { id: 1 };
    const replacement = { id: 1 };
    const resolveBatch = createResolver();
    const { rerender } = renderHook(
      ({ rawResults, resolutionKey }: HookProps) =>
        useResultViews({ rawResults, resolutionKey, resolveBatch }),
      {
        initialProps: {
          rawResults: [original],
          resolutionKey: 'ja',
        },
      }
    );

    resolveBatch.mockClear();
    rerender({ rawResults: [replacement], resolutionKey: 'ja' });

    expect(resolveBatch).toHaveBeenCalledWith([replacement]);
  });

  it('解決入力が同じ再レンダーでは ResultView 配列の参照を維持する', () => {
    const first = { id: 1 };
    const rawResults = [first];
    const resolveBatch = createResolver();
    const { result, rerender } = renderHook(
      ({ renderCount }: { renderCount: number }) => {
        void renderCount;
        return useResultViews({ rawResults, resolutionKey: 'ja', resolveBatch });
      },
      { initialProps: { renderCount: 0 } }
    );
    const initialResult = result.current;

    rerender({ renderCount: 1 });

    expect(result.current).toBe(initialResult);
  });

  it('入力が空なら resolver を呼ばず空配列を返す', () => {
    const resolveBatch = createResolver();

    const { result } = renderHook(() =>
      useResultViews({ rawResults: [], resolutionKey: 'ja', resolveBatch })
    );

    expect(resolveBatch).not.toHaveBeenCalled();
    expect(result.current).toEqual([]);
  });

  it('resolver の戻り値件数が未解決 raw の件数と異なる場合は例外にする', () => {
    const first = { id: 1 };
    const second = { id: 2 };
    const resolveBatch = vi.fn((_rawResults: RawResult[]): UiResult[] => [{ label: 'only-one' }]);

    expect(() =>
      renderHook(() =>
        useResultViews({
          rawResults: [first, second],
          resolutionKey: 'ja',
          resolveBatch,
        })
      )
    ).toThrowError(/same number of results/);
  });
});
