import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PokemonSearchPage } from '@/features/pokemon-search/components/pokemon-search-page';
import {
  usePokemonSearchStore,
  getPokemonSearchInitialState,
} from '@/features/pokemon-search/store';
import { EMPTY_POKEMON_SEARCH_FILTER } from '@/features/pokemon-search/types';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import { useTrainerStore } from '@/stores/settings/trainer';
import { createPokemonSearchRequest } from '@/test/helpers/pokemon-search';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { encounterSlotKey } from '@/lib/encounter-slot-context';
import { Timer0VCountSection } from '@/features/ds-config/components/timer0-vcount-section';

const state = vi.hoisted(() => ({
  loading: false,
  start: vi.fn(),
  estimate: vi.fn(),
}));
vi.mock('@/features/pokemon-search/hooks/use-pokemon-search', () => ({
  usePokemonSearch: () => ({
    isLoading: state.loading,
    isInitialized: true,
    progress: undefined,
    results: [],
    error: undefined,
    startSearch: state.start,
    cancel: vi.fn(),
  }),
}));
vi.mock('@/wasm/wasm_pkg.js', () => ({ get_species_name: String }));
vi.mock('@/features/pokemon-list/components/pokemon-params-form', () => ({
  PokemonParamsForm: () => <div>Target settings</div>,
}));
vi.mock('@/hooks/use-export', () => ({ useExport: () => ({ exportData: vi.fn() }) }));
vi.mock('@/components/data-display/export-toolbar', () => ({ ExportToolbar: () => <></> }));
vi.mock('@/services/search-estimation', () => ({
  estimatePokemonDatetimeSearchResults: state.estimate,
}));

function renderPage() {
  return render(
    <I18nTestWrapper>
      <PokemonSearchPage />
    </I18nTestWrapper>
  );
}
function searchButton() {
  return screen.getAllByRole('button', { name: /^Search$/ })[0];
}

describe('PokemonSearchPage', () => {
  beforeEach(() => {
    setupTestI18n('ja');
    state.loading = false;
    state.start.mockReset();
    state.estimate.mockReset().mockReturnValue({ exceedsThreshold: false, estimatedCount: 168 });
    const request = createPokemonSearchRequest();
    usePokemonSearchStore.setState({
      ...getPokemonSearchInitialState(),
      mode: 'pokemon',
      dateRange: request.context.date_range,
      timeRange: request.context.time_range,
      keySpec: request.context.key_spec,
      encounterParams: {
        ...request.encounterParams,
        slotsContextKey: encounterSlotKey(request.encounterParams, request.genConfig.version),
      },
    });
    useDsConfigStore.setState({
      config: request.context.ds,
      ranges: request.context.ranges,
      gameStart: request.genConfig.game_start,
    });
    useTrainerStore.getState().reset();
  });

  it('レベル逆転は入力欄だけに表示し、検索停止と他のエラー表示を維持する', () => {
    const store = usePokemonSearchStore.getState();
    store.setEncounterParams((previous) => {
      const next = { ...previous, encounterType: 'Normal' as const };
      return { ...next, slotsContextKey: encounterSlotKey(next, 'Black') };
    });
    store.setFilter({ ...EMPTY_POKEMON_SEARCH_FILTER, level_range: [50, 10], shiny: 'Shiny' });
    renderPage();
    expect(screen.getAllByText('Min must be less than or equal to max')).toHaveLength(1);
    expect(
      screen.queryByText('Min level must be less than or equal to max level')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Set TID to search for shiny Pokémon')).toBeInTheDocument();
    expect(searchButton()).toBeDisabled();
    fireEvent.click(searchButton());
    expect(state.start).not.toHaveBeenCalled();
    act(() => {
      useTrainerStore.getState().setTrainer(0, 0);
      store.setFilter({ ...EMPTY_POKEMON_SEARCH_FILTER, level_range: [10, 50] });
    });
    expect(screen.queryByText('Min must be less than or equal to max')).not.toBeInTheDocument();
    expect(searchButton()).toBeEnabled();
  });

  it.each(['date', 'time'] as const)('%s の逆転は入力欄だけに表示する', (field) => {
    const store = usePokemonSearchStore.getState();
    if (field === 'date') store.setDateRange({ ...store.dateRange, start_year: 2025 });
    else store.setTimeRange({ ...store.timeRange, hour_start: 1, hour_end: 0 });
    renderPage();
    const message =
      field === 'date'
        ? 'Enter a valid date range with the start on or before the end'
        : 'Min must be less than or equal to max';
    expect(screen.getAllByText(message)).toHaveLength(1);
    expect(screen.queryByText('Time range is invalid')).not.toBeInTheDocument();
    expect(searchButton()).toBeDisabled();
  });

  it('手動Timer0の逆転はサイドバーだけに表示し、空範囲のエラーは一覧に残す', () => {
    useDsConfigStore.setState({
      timer0Auto: false,
      ranges: [{ timer0_min: 2, timer0_max: 1, vcount_min: 96, vcount_max: 96 }],
    });
    renderPage();
    render(
      <I18nTestWrapper>
        <Timer0VCountSection />
      </I18nTestWrapper>
    );
    expect(screen.getAllByText('Min must be less than or equal to max')).toHaveLength(1);
    expect(screen.queryByText('Set a valid Timer0 / VCount range')).not.toBeInTheDocument();
    expect(searchButton()).toBeDisabled();
    act(() => useDsConfigStore.setState({ ranges: [] }));
    expect(screen.getByText('Set a valid Timer0 / VCount range')).toBeInTheDocument();
    expect(searchButton()).toBeDisabled();
  });

  it('searches without MT Seed or trainer IDs and commits edited dates before snapshotting', () => {
    renderPage();
    expect(screen.queryByLabelText('MT Seed')).not.toBeInTheDocument();
    expect(screen.queryByText(/GPU/)).not.toBeInTheDocument();
    const year = screen.getByLabelText('date-start year');
    year.focus();
    fireEvent.change(year, { target: { value: '2023' } });
    fireEvent.pointerDown(searchButton());
    fireEvent.click(searchButton());
    expect(state.start).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          date_range: expect.objectContaining({ start_year: 2023 }),
        }),
        pokemonParams: expect.objectContaining({ trainer: { tid: 0, sid: 0 } }),
      })
    );
  });

  it('色違いブロック対象では保存した条件を除外し、未設定IDでも検索できる', () => {
    const store = usePokemonSearchStore.getState();
    store.setEncounterParams((previous) => ({
      ...previous,
      slots: previous.slots.map((slot) => ({ ...slot, shiny_locked: true })),
    }));
    store.setFilter({
      ...EMPTY_POKEMON_SEARCH_FILTER,
      shiny: 'Shiny',
      gender: 'Male',
      species_ids: [25],
      level_range: [90, 1],
      ability_slot: 'Hidden',
    });
    renderPage();
    expect(searchButton()).toBeEnabled();
    fireEvent.click(searchButton());
    expect(state.start.mock.lastCall?.[0].filter).toEqual(EMPTY_POKEMON_SEARCH_FILTER);
    expect(usePokemonSearchStore.getState().filter.shiny).toBe('Shiny');
  });

  it('変更した対象のスロットが未取得なら検索を開始しない', () => {
    usePokemonSearchStore
      .getState()
      .setEncounterParams((previous) => ({ ...previous, staticEntryId: 'victini' }));
    renderPage();
    expect(searchButton()).toBeDisabled();
    fireEvent.click(searchButton());
    expect(state.start).not.toHaveBeenCalled();
  });

  it('blocks a shiny search before confirmation for each missing ID but permits zero IDs', () => {
    usePokemonSearchStore.getState().setFilter({ ...EMPTY_POKEMON_SEARCH_FILTER, shiny: 'Shiny' });
    renderPage();
    expect(screen.getByText('Set TID to search for shiny Pokémon')).toBeInTheDocument();
    expect(screen.getByText('Set SID to search for shiny Pokémon')).toBeInTheDocument();
    expect(searchButton()).toBeDisabled();
    fireEvent.click(searchButton());
    expect(state.estimate).not.toHaveBeenCalled();
    act(() => useTrainerStore.getState().setTrainer(0, 0));
    expect(searchButton()).toBeEnabled();
    fireEvent.click(searchButton());
    expect(state.start).toHaveBeenCalledOnce();
  });

  it('executes the confirmed snapshot even when inputs and common settings change', () => {
    state.estimate.mockReturnValue({ exceedsThreshold: true, estimatedCount: 60_000 });
    renderPage();
    fireEvent.click(searchButton());
    expect(state.start).not.toHaveBeenCalled();
    act(() => {
      usePokemonSearchStore
        .getState()
        .setFilter({ ...EMPTY_POKEMON_SEARCH_FILTER, shiny: 'Shiny' });
      usePokemonSearchStore
        .getState()
        .setEncounterParams((previous) => ({ ...previous, staticEntryId: 'edited' }));
      useTrainerStore.getState().setTrainer(123, 456);
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(state.start).toHaveBeenCalledWith(
      expect.objectContaining({
        pokemonParams: expect.objectContaining({ trainer: { tid: 0, sid: 0 } }),
        encounterParams: expect.objectContaining({ staticEntryId: 'cobalion' }),
        filter: EMPTY_POKEMON_SEARCH_FILTER,
      })
    );
  });

  it('resets only the six search filters and retains filters on target changes', () => {
    usePokemonSearchStore.getState().setFilter({
      ...EMPTY_POKEMON_SEARCH_FILTER,
      species_ids: [25],
      natures: ['Jolly'],
      level_range: [42, 42],
      shiny: 'Star',
      gender: 'Male',
      ability_slot: 'First',
    });
    renderPage();
    const before = usePokemonSearchStore.getState();
    act(() => before.setEncounterParams((previous) => ({ ...previous, availableSpecies: [] })));
    expect(usePokemonSearchStore.getState().filter.species_ids).toEqual([25]);
    fireEvent.click(screen.getByRole('button', { name: 'Reset filter' }));
    const after = usePokemonSearchStore.getState();
    expect(after.filter).toEqual(EMPTY_POKEMON_SEARCH_FILTER);
    expect(after.dateRange).toEqual(before.dateRange);
    expect(after.encounterParams.genConfig).toEqual(before.encounterParams.genConfig);
    expect(after.encounterParams.staticEntryId).toBe('cobalion');
  });

  it('shows full mode names and disables switching and resetting during search', () => {
    state.loading = true;
    renderPage();
    expect(screen.getByRole('tab', { name: 'Search by IVs (MT Seed)' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Search by shininess / nature' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset filter' })).toBeDisabled();
    fireEvent.click(screen.getByRole('tab', { name: 'Search by IVs (MT Seed)' }));
    expect(usePokemonSearchStore.getState().mode).toBe('pokemon');
  });
});
