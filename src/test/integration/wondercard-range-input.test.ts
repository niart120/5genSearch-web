import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WonderCardListPage } from '@/features/wondercard-list/components/wondercard-list-page';
import { WonderCardSearchPage } from '@/features/wondercard-search/components/wondercard-search-page';
import {
  getWonderCardListInitialState,
  useWonderCardListStore,
} from '@/features/wondercard-list/store';
import {
  getWonderCardSearchInitialState,
  useWonderCardSearchStore,
} from '@/features/wondercard-search/store';
import { getDsConfigInitialState, useDsConfigStore } from '@/stores/settings/ds-config';
import { useUiStore } from '@/stores/settings/ui';
import { useSearchResultsStore } from '@/stores/search/results';
import { DEFAULT_IV_RANGES } from '@/lib/search-filter-context';
import { resolve_seeds } from '@/wasm/wasm_pkg.js';
import { serializeSeedOrigin } from '@/services/seed-origin-serde';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';

function searchButton() {
  const button = screen.getAllByRole('button', { name: /^Search$/ })[0];
  if (!(button instanceof HTMLButtonElement)) throw new Error('Search button is missing');
  return button;
}

beforeEach(() => {
  setupTestI18n('en');
  useUiStore.setState({ language: 'en' });
  useSearchResultsStore.getState().clearResults();
  useDsConfigStore.setState({
    ...structuredClone(getDsConfigInitialState()),
    ranges: [{ timer0_min: 0xc_68, timer0_max: 0xc_68, vcount_min: 0x5f, vcount_max: 0x5f }],
  });
  useWonderCardListStore.setState(getWonderCardListInitialState());
  useWonderCardSearchStore.setState({
    ...getWonderCardSearchInitialState(),
    dateRange: {
      start_year: 2012,
      start_month: 1,
      start_day: 3,
      end_year: 2012,
      end_month: 1,
      end_day: 3,
    },
    timeRange: {
      hour_start: 16,
      hour_end: 16,
      minute_start: 30,
      minute_end: 30,
      second_start: 30,
      second_end: 30,
    },
    keySpec: { available_buttons: [] },
  });
  useWonderCardListStore.getState().setSeedInputMode('import');
  useWonderCardListStore.getState().setSeedInput((input) => ({
    ...input,
    importText: JSON.stringify(
      resolve_seeds({ type: 'Seeds', seeds: [0n] }).map((origin) => serializeSeedOrigin(origin))
    ),
  }));
});

afterEach(cleanup);

describe.each([false, true])('配達員の入力から実 Worker への条件伝達 search=%s', (search) => {
  it('S を0固定から31固定へ変え、逆転中は検索を止め、確定後はS31のみを返す', async () => {
    const store = search ? useWonderCardSearchStore : useWonderCardListStore;
    store.getState().setInputs({
      cardId: 'ja-0064-bw-ながさき-metagross-jpn',
      genConfig: { user_offset: 0, max_advance: 255 },
      statMode: 'ivs',
      filter: {
        iv: { ...DEFAULT_IV_RANGES, spe: [0, 0], enabledStats: { spe: true } },
        stats: undefined,
        natures: undefined,
        gender: undefined,
        ability_slot: undefined,
        shiny: undefined,
      },
    });
    render(createElement(search ? WonderCardSearchPage : WonderCardListPage), {
      wrapper: I18nTestWrapper,
    });
    await waitFor(() => expect(searchButton().disabled).toBe(false), { timeout: 15_000 });
    const user = userEvent.setup();
    await user.click(screen.getByText('Filter'));
    const min = screen.getByRole('textbox', { name: 'Spe min' });
    const max = screen.getByRole('textbox', { name: 'Spe max' });
    await user.clear(min);
    await user.type(min, '31');
    await user.tab();
    expect(store.getState().inputs.filter?.iv?.spe).toEqual([31, 0]);
    expect(searchButton().disabled).toBe(true);
    expect(store.getState().resultRequest).toBeUndefined();
    await user.clear(max);
    await user.type(max, '31');
    await user.click(searchButton());
    await waitFor(
      () => {
        expect(store.getState().resultRequest?.settings.filter?.iv?.spe).toEqual([31, 31]);
        expect(store.getState().results.length).toBeGreaterThan(0);
        expect(screen.queryAllByRole('button', { name: /^Cancel$/ })).toHaveLength(0);
      },
      { timeout: 15_000 }
    );
    expect(store.getState().results.every((row) => row.core.ivs.spe === 31)).toBe(true);
  });
});
