import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWonderCardSelection } from '@/features/wondercard-list/hooks/use-wondercard-selection';
import {
  useWonderCardListStore,
  getWonderCardListInitialState,
} from '@/features/wondercard-list/store';
import { useDsConfigStore, getDsConfigInitialState } from '@/stores/settings/ds-config';
import { useTrainerStore } from '@/stores/settings/trainer';
import { useUiStore } from '@/stores/settings/ui';
import { resolveWonderCardSelection } from '@/features/wondercard-list/types';
import { loadWonderCards } from '@/data/wondercards/loader';
import type { WonderCardEntry } from '@/data/wondercards/schema';
import { UI_CARD, UI_EGG_CARD } from '@/test/fixtures/wondercards/ui';

vi.mock('@/data/wondercards/loader', () => ({
  getWonderCardLanguage: (region: string) => (region === 'Jpn' ? 'ja' : 'en'),
  loadWonderCards: vi.fn(),
}));
const load = vi.mocked(loadWonderCards);
function useSelection() {
  const inputs = useWonderCardListStore((s) => s.inputs);
  const stored = useWonderCardListStore((s) => s.selection);
  return useWonderCardSelection(
    inputs.cardId,
    stored,
    useWonderCardListStore.getState().setSelection
  );
}

describe('配達員カードの解決', () => {
  beforeEach(() => {
    useDsConfigStore.setState(structuredClone(getDsConfigInitialState()));
    useTrainerStore.getState().reset();
    useWonderCardListStore.setState(getWonderCardListInitialState());
    load.mockReset();
  });
  it('旧 ROM の遅い応答を捨て、表示言語の変更ではカタログを再取得しない', async () => {
    let completeOld: ((cards: WonderCardEntry[]) => void) | undefined;
    const old = new Promise<WonderCardEntry[]>((resolve) => {
      completeOld = resolve;
    });
    const english = { ...UI_CARD, id: 'english', language: 'en' as const };
    load.mockReturnValueOnce(old).mockResolvedValueOnce([english]);
    useWonderCardListStore.getState().setInputs({ cardId: UI_CARD.id });
    const { result } = renderHook(useSelection);
    expect(result.current.loading).toBe(true);
    act(() => {
      useDsConfigStore.getState().setConfig({ region: 'Usa', version: 'White2' });
      useWonderCardListStore.getState().setInputs({ cardId: english.id });
    });
    await waitFor(() => expect(result.current.selection?.card.id).toBe(english.id));
    await act(async () => {
      completeOld?.([UI_CARD]);
      await old;
    });
    act(() => useUiStore.getState().setLanguage('en'));
    expect(result.current.cards).toEqual([english]);
    expect(load.mock.calls).toEqual([
      ['ja', 'Black'],
      ['en', 'White2'],
    ]);
  });
  it('保存済み ID が不適合でも消さずに、再選択で解決する', async () => {
    load.mockResolvedValue([UI_CARD]);
    useWonderCardListStore.getState().setInputs({ cardId: 'missing' });
    const { result } = renderHook(useSelection);
    await waitFor(() => expect(result.current.unavailable).toBe(true));
    expect(useWonderCardListStore.getState().inputs.cardId).toBe('missing');
    act(() => useWonderCardListStore.getState().setInputs({ cardId: UI_CARD.id }));
    expect(result.current.selection?.params.trainer).toEqual(UI_CARD.trainer);
  });
  it('読み込み失敗を返し、旧カードを有効な選択にしない', async () => {
    load.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(useSelection);
    await waitFor(() => expect(result.current.error?.message).toBe('offline'));
    expect(result.current.selection).toBeUndefined();
  });
  it('転記カードを消費範囲の編集と受取人の空欄を挟んでも保持する', async () => {
    // 転記時と現在のカタログの定義が異なっても、同じカードの再現条件を優先する。
    load.mockResolvedValue([{ ...UI_EGG_CARD, level: 99 }]);
    useTrainerStore.getState().setTrainer(0, 65_535);
    useWonderCardListStore.setState({
      inputs: { ...getWonderCardListInitialState().inputs, cardId: UI_EGG_CARD.id },
      selection: resolveWonderCardSelection(UI_EGG_CARD, getDsConfigInitialState().config, {
        tid: 0,
        sid: 65_535,
      }),
    });
    const { result } = renderHook(useSelection);
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() =>
      useWonderCardListStore.getState().setInputs({ genConfig: { user_offset: 2, max_advance: 8 } })
    );
    expect(result.current.selection?.params.level).toBe(1);
    act(() => useTrainerStore.getState().setTid(undefined));
    expect(result.current.selection).toBeUndefined();
    act(() => useTrainerStore.getState().setTid(5));
    expect(result.current.selection?.params).toMatchObject({
      level: 1,
      trainer: { tid: 5, sid: 65_535 },
    });
  });
});
