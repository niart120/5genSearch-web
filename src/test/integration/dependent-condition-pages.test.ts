import { createElement } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PokemonListPage } from '@/features/pokemon-list/components/pokemon-list-page';
import { PokemonSearchPage } from '@/features/pokemon-search/components/pokemon-search-page';
import { WonderCardListPage } from '@/features/wondercard-list/components/wondercard-list-page';
import { WonderCardSearchPage } from '@/features/wondercard-search/components/wondercard-search-page';
import { usePokemonListStore, getPokemonListInitialState } from '@/features/pokemon-list/store';
import {
  usePokemonSearchStore,
  getPokemonSearchInitialState,
} from '@/features/pokemon-search/store';
import {
  useWonderCardListStore,
  getWonderCardListInitialState,
} from '@/features/wondercard-list/store';
import {
  useWonderCardSearchStore,
  getWonderCardSearchInitialState,
} from '@/features/wondercard-search/store';
import { DEFAULT_ENCOUNTER_PARAMS } from '@/features/pokemon-list/types';
import { EMPTY_POKEMON_SEARCH_FILTER } from '@/features/pokemon-search/types';
import { useDsConfigStore, getDsConfigInitialState } from '@/stores/settings/ds-config';
import { useUiStore } from '@/stores/settings/ui';
import { hasCurrentEncounterSlots } from '@/lib/encounter-slot-context';
import { loadWonderCards } from '@/data/wondercards/loader';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';

beforeEach(() => {
  setupTestI18n('en');
  useUiStore.setState({ language: 'en' });
  useDsConfigStore.setState(structuredClone(getDsConfigInitialState()));
  useDsConfigStore.getState().setConfig({ version: 'Black2' });
  usePokemonListStore.setState(getPokemonListInitialState());
  usePokemonSearchStore.setState({ ...getPokemonSearchInitialState(), mode: 'pokemon' });
  useWonderCardListStore.setState(getWonderCardListInitialState());
  useWonderCardSearchStore.setState(getWonderCardSearchInitialState());
});
afterEach(cleanup);

describe.each([false, true])('実データによる依存条件の切替 search=%s', (search) => {
  it('電気石の洞穴の B2 → B と場所変更で種族選択を更新する', async () => {
    const store = search ? usePokemonSearchStore : usePokemonListStore;
    store
      .getState()
      .setEncounterParams({ ...DEFAULT_ENCOUNTER_PARAMS, locationKey: 'chargestone_cave_1f' });
    store.getState().setFilter({
      ...EMPTY_POKEMON_SEARCH_FILTER,
      iv: undefined,
      stats: undefined,
      held_item_slots: undefined,
      encounter_result_filter: undefined,
      species_ids: [299, 525],
      level_range: [90, 100],
    });
    render(createElement(search ? PokemonSearchPage : PokemonListPage), {
      wrapper: I18nTestWrapper,
    });
    const ready = async () =>
      waitFor(
        () =>
          expect(
            hasCurrentEncounterSlots(
              store.getState().encounterParams,
              useDsConfigStore.getState().config.version
            )
          ).toBe(true),
        { timeout: 15_000 }
      );
    await ready();
    expect(store.getState().filter?.species_ids).toEqual([299, 525]);
    act(() => useDsConfigStore.getState().setConfig({ version: 'Black' }));
    await ready();
    expect(store.getState().filter?.species_ids).toEqual([525]);
    expect(store.getState().filter?.level_range).toEqual([90, 100]);
    expect(screen.queryByText('#299')).toBeNull();
    act(() => store.getState().setEncounterParams((prev) => ({ ...prev, locationKey: 'route_1' })));
    await ready();
    expect(store.getState().filter?.species_ids).toBeUndefined();
    act(() => {
      useDsConfigStore.getState().setConfig({ version: 'Black2' });
      store
        .getState()
        .setEncounterParams((prev) => ({ ...prev, locationKey: 'chargestone_cave_1f' }));
    });
    await ready();
    expect(store.getState().filter?.species_ids).toBeUndefined();
  });

  it('配達カードの共通候補は保持し、バージョン・リージョンの候補外は解除する', async () => {
    const store = search ? useWonderCardSearchStore : useWonderCardListStore;
    const cards = await loadWonderCards('ja', 'Black2');
    const exclusive = cards.find(
      (card) => !card.versions.includes('Black') && card.kind === 'pokemon'
    );
    const common = cards.find((card) => card.versions.includes('Black') && card.kind === 'pokemon');
    if (!exclusive || !common) throw new Error('Expected both exclusive and shared real cards');
    store.getState().setInputs({ cardId: common.id });
    render(createElement(search ? WonderCardSearchPage : WonderCardListPage), {
      wrapper: I18nTestWrapper,
    });
    await waitFor(() => expect(store.getState().selection?.version).toBe('Black2'));
    act(() => useDsConfigStore.getState().setConfig({ version: 'Black' }));
    await waitFor(() => expect(store.getState().selection?.version).toBe('Black'));
    expect(store.getState().inputs.cardId).toBe(common.id);
    act(() => useDsConfigStore.getState().setConfig({ version: 'Black2' }));
    await waitFor(() => expect(store.getState().selection?.version).toBe('Black2'));
    act(() => store.getState().setInputs({ cardId: exclusive.id }));
    await waitFor(() => expect(store.getState().selection?.card.id).toBe(exclusive.id));
    act(() => useDsConfigStore.getState().setConfig({ version: 'Black' }));
    await waitFor(() => expect(store.getState().inputs.cardId).toBe(''));
    expect(store.getState().selection).toBeUndefined();
    act(() => store.getState().setInputs({ cardId: common.id }));
    await waitFor(() => expect(store.getState().selection?.card.id).toBe(common.id));
    act(() => useDsConfigStore.getState().setConfig({ region: 'Usa' }));
    await waitFor(() => expect(store.getState().inputs.cardId).toBe(''));
    expect(store.getState().selection).toBeUndefined();
    expect(screen.queryByText(/unavailable for the selected ROM/)).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Wonder Card' }).textContent).toBe(
      'Select a Wonder Card'
    );
  });
});
