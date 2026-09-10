import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WonderCardListPage } from '@/features/wondercard-list/components/wondercard-list-page';
import { WonderCardSearchPage } from '@/features/wondercard-search/components/wondercard-search-page';
import {
  useWonderCardListStore,
  getWonderCardListInitialState,
} from '@/features/wondercard-list/store';
import {
  useWonderCardSearchStore,
  getWonderCardSearchInitialState,
} from '@/features/wondercard-search/store';
import { useDsConfigStore, getDsConfigInitialState } from '@/stores/settings/ds-config';
import { useTrainerStore } from '@/stores/settings/trainer';
import { useSearchResultsStore } from '@/stores/search/results';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { UI_CARD, UI_EGG_CARD, UI_ORIGIN } from '@/test/fixtures/wondercards/ui';
import { serializeSeedOrigin } from '@/services/seed-origin-serde';
import { loadWonderCards } from '@/data/wondercards/loader';

const state = vi.hoisted(() => ({ execute: vi.fn(), loading: false, results: [] }));
vi.mock('@/features/wondercard-list/hooks/use-wondercard-list', () => ({
  useWonderCardList: () => ({
    execute: state.execute,
    isLoading: state.loading,
    isInitialized: true,
    results: state.results,
    cancel: vi.fn(),
  }),
}));
vi.mock('@/features/wondercard-search/hooks/use-wondercard-search', () => ({
  useWonderCardSearch: () => ({
    execute: state.execute,
    isLoading: state.loading,
    isInitialized: true,
    results: state.results,
    cancel: vi.fn(),
  }),
}));
vi.mock('@/wasm/wasm_pkg.js', () => ({
  get_species_name: () => 'Pikachu',
  get_species_gender_ratio: () => 'F1M1',
  resolve_seeds: () => [],
}));
vi.mock('@/data/wondercards/loader', () => ({
  getWonderCardLanguage: (region: string) => (region === 'Jpn' ? 'ja' : 'en'),
  loadWonderCards: vi.fn(),
}));

function searchButton() {
  return screen.getAllByRole('button', { name: /^Search$/ })[0];
}
function renderPage(search: boolean) {
  return render(
    <I18nTestWrapper>{search ? <WonderCardSearchPage /> : <WonderCardListPage />}</I18nTestWrapper>
  );
}

beforeEach(() => {
  setupTestI18n('en');
  state.execute.mockReset();
  state.loading = false;
  useSearchResultsStore.getState().clearResults();
  useDsConfigStore.setState(structuredClone(getDsConfigInitialState()));
  useTrainerStore.getState().reset();
  useWonderCardListStore.setState(getWonderCardListInitialState());
  useWonderCardListStore.getState().setSeedInputMode('import');
  useWonderCardListStore
    .getState()
    .setSeedInput((s) => ({ ...s, importText: JSON.stringify([serializeSeedOrigin(UI_ORIGIN)]) }));
  useWonderCardSearchStore.setState({
    ...getWonderCardSearchInitialState(),
    dateRange: {
      start_year: 2010,
      start_month: 9,
      start_day: 18,
      end_year: 2010,
      end_month: 9,
      end_day: 18,
    },
    timeRange: {
      hour_start: 0,
      hour_end: 0,
      minute_start: 0,
      minute_end: 0,
      second_start: 0,
      second_end: 0,
    },
  });
  vi.mocked(loadWonderCards).mockReset().mockResolvedValue([UI_CARD, UI_EGG_CARD]);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  Element.prototype.scrollIntoView = vi.fn();
});

describe.each([false, true])('配達員画面 search=%s', (search) => {
  const store = search ? useWonderCardSearchStore : useWonderCardListStore;
  it('未選択では実行を無効にし、検索可能な選択欄からカードを選ぶと有効にする', async () => {
    renderPage(search);
    expect(searchButton()).toBeDisabled();
    const combo = screen.getByRole('combobox', { name: 'Wonder Card' });
    await waitFor(() => expect(combo).toBeEnabled());
    const user = userEvent.setup();
    await user.click(combo);
    await user.type(screen.getByPlaceholderText('Search Wonder Cards...'), 'Pikachu');
    await user.click(screen.getByRole('option', { name: 'Pikachu（Pikachu）' }));
    await waitFor(() => expect(searchButton()).toBeEnabled());
    expect(store.getState().inputs.cardId).toBe(UI_CARD.id);
    expect(screen.queryByRole('group', { name: 'Recipient' })).not.toBeInTheDocument();
    fireEvent.click(searchButton());
    expect(state.execute.mock.lastCall?.[0].settings.params.trainer).toEqual(UI_CARD.trainer);
  });
  it('配布タマゴの空欄を拒否し、0 と 65535 を共通トレーナー入力に同期する', async () => {
    store.getState().setInputs({ cardId: UI_EGG_CARD.id });
    renderPage(search);
    const recipient = await screen.findByRole('group', { name: 'Recipient' });
    expect(searchButton()).toBeDisabled();
    const tid = within(recipient).getByLabelText('TID');
    const sid = within(recipient).getByLabelText('SID');
    fireEvent.change(tid, { target: { value: '0' } });
    fireEvent.change(sid, { target: { value: '65535' } });
    await waitFor(() => expect(searchButton()).toBeEnabled());
    expect(useTrainerStore.getState().tid).toBe(0);
    fireEvent.change(tid, { target: { value: '-1' } });
    expect(searchButton()).toBeDisabled();
    fireEvent.change(tid, { target: { value: '0' } });
    fireEvent.click(searchButton());
    expect(state.execute.mock.lastCall?.[0].settings.params.trainer).toEqual({
      tid: 0,
      sid: 65_535,
    });
    fireEvent.change(sid, { target: { value: '' } });
    expect(useTrainerStore.getState().sid).toBeUndefined();
    expect(searchButton()).toBeDisabled();
  });
  it('未確定の消費上限を確認用要求に含め、確認中の入力・ROM・受取人変更を実行に混ぜない', async () => {
    store.getState().setInputs({ cardId: UI_EGG_CARD.id });
    useTrainerStore.getState().setTrainer(0, 0);
    renderPage(search);
    await waitFor(() => expect(searchButton()).toBeEnabled());
    const advance = screen.getByRole('spinbutton', { name: 'Max advance' });
    act(() => advance.focus());
    fireEvent.change(advance, { target: { value: '50000' } });
    fireEvent.pointerDown(searchButton());
    fireEvent.click(searchButton());
    expect(state.execute).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await act(async () => {
      store
        .getState()
        .setInputs({ cardId: UI_CARD.id, genConfig: { user_offset: 0, max_advance: 2 } });
      useTrainerStore.getState().setTrainer(11, 22);
      useDsConfigStore.getState().setConfig({ version: 'White2' });
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(state.execute.mock.lastCall?.[0].settings).toMatchObject({
      card: { id: UI_EGG_CARD.id },
      params: { trainer: { tid: 0, sid: 0 } },
      genConfig: { version: 'Black', max_advance: 50_000 },
    });
  });
  it('実行中は受取人・カード・消費範囲・Filter・表示モードの編集を無効にする', async () => {
    state.loading = true;
    store.getState().setInputs({ cardId: UI_EGG_CARD.id });
    renderPage(search);
    const recipient = await screen.findByRole('group', { name: 'Recipient' });
    expect(within(recipient).getByLabelText('TID')).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Wonder Card' })).toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: 'Max advance' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset filter' })).toBeDisabled();
    expect(screen.getAllByRole('switch').every((s) => s.hasAttribute('disabled'))).toBe(true);
  });
});
