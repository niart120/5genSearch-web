import { beforeEach, describe, expect, it } from 'vitest';
import {
  getPokemonSearchInitialState,
  usePokemonSearchStore,
} from '@/features/pokemon-search/store';
import {
  getDatetimeSearchInitialState,
  useDatetimeSearchStore,
} from '@/features/datetime-search/store';
import { usePokemonListStore, getPokemonListInitialState } from '@/features/pokemon-list/store';
import { validatePokemonSearchForm } from '@/features/pokemon-search/types';
import { createPokemonSearchRequest } from '@/test/helpers/pokemon-search';
import { createPokemonListResultView } from '@/test/helpers/pokemon-result-view';
import { estimatePokemonDatetimeSearchResults } from '@/services/search-estimation';
import { navigateToPokemonListFromSearch, navigateToDatetimeSearch } from '@/lib/navigate';
import { useSearchResultsStore } from '@/stores/search/results';
import { getPartializedState } from '@/test/helpers/store';
import {
  createPokemonSearchExportColumns,
  createPokemonListExportColumns,
} from '@/services/export-columns';
import { filterColumns, toCsv } from '@/services/export';

describe('Pokemon search state and contracts', () => {
  beforeEach(() => {
    localStorage.clear();
    usePokemonSearchStore.setState(getPokemonSearchInitialState());
    useDatetimeSearchStore.setState(getDatetimeSearchInitialState());
    usePokemonListStore.setState(getPokemonListInitialState());
  });

  it('keeps inputs and results separate across modes and persists only inputs', async () => {
    const request = createPokemonSearchRequest();
    const raw = createPokemonListResultView().raw;
    const store = usePokemonSearchStore.getState();
    store.setMode('pokemon');
    store.setDateRange(request.context.date_range);
    store.startResults(request);
    store.appendResults([raw]);
    store.setMode('iv');
    expect(useDatetimeSearchStore.getState().dateRange.start_year).toBe(2000);
    expect(usePokemonSearchStore.getState().results).toEqual([raw]);
    store.setMode('pokemon');
    const saved = getPartializedState(usePokemonSearchStore);
    expect(saved).not.toHaveProperty('results');
    expect(saved).not.toHaveProperty('resultRequest');
    await usePokemonSearchStore.persist.rehydrate();
    expect(usePokemonSearchStore.getState().mode).toBe('pokemon');
    expect(usePokemonSearchStore.getState().dateRange).toEqual(request.context.date_range);
  });

  it('snapshots the request and transfers one result without overwriting generation range or filters', () => {
    const request = createPokemonSearchRequest();
    usePokemonSearchStore.getState().startResults(request);
    request.encounterParams.staticEntryId = 'edited';
    const target = usePokemonListStore.getState();
    target.setEncounterParams((previous) => ({
      ...previous,
      genConfig: { user_offset: 100, max_advance: 200 },
    }));
    target.setStatsFilter({
      hp: 80,
      atk: undefined,
      def: undefined,
      spa: undefined,
      spd: undefined,
      spe: undefined,
    });
    const origin = createPokemonListResultView().raw.source;
    const snapshot = usePokemonSearchStore.getState().resultRequest;
    if (!snapshot) throw new Error('Missing snapshot');
    navigateToPokemonListFromSearch(origin, snapshot.encounterParams);
    expect(usePokemonListStore.getState().encounterParams.staticEntryId).toBe('cobalion');
    expect(usePokemonListStore.getState().encounterParams.genConfig).toEqual({
      user_offset: 100,
      max_advance: 200,
    });
    expect(usePokemonListStore.getState().statsFilter?.hp).toBe(80);
    expect(usePokemonListStore.getState().results).toEqual([]);
    expect(useSearchResultsStore.getState().consumePendingDetailOrigin('pokemon-list')).toEqual(
      origin
    );
  });

  it('MT Seed transfer selects the IV mode', () => {
    usePokemonSearchStore.getState().setMode('pokemon');
    navigateToDatetimeSearch([42]);
    expect(usePokemonSearchStore.getState().mode).toBe('iv');
    expect(useSearchResultsStore.getState().consumePendingTargetSeeds()).toEqual([42]);
  });

  it('requires each missing ID only for shiny conditions and accepts zero', () => {
    const request = createPokemonSearchRequest();
    const form = {
      dateRange: request.context.date_range,
      timeRange: request.context.time_range,
      keySpec: request.context.key_spec,
      encounterParams: request.encounterParams,
      filter: request.filter,
    };
    expect(validatePokemonSearchForm(form, {}, request.context.ranges)).toEqual([]);
    form.filter.shiny = 'Shiny';
    expect(validatePokemonSearchForm(form, {}, request.context.ranges)).toEqual([
      'TID_REQUIRED',
      'SID_REQUIRED',
    ]);
    expect(validatePokemonSearchForm(form, { tid: 0, sid: 0 }, request.context.ranges)).toEqual([]);
    form.filter.level_range = [42, 42];
    expect(validatePokemonSearchForm(form, { tid: 0, sid: 0 }, request.context.ranges)).toEqual([]);
    form.filter.level_range = [43, 42];
    expect(validatePokemonSearchForm(form, { tid: 0, sid: 0 }, request.context.ranges)).toEqual([
      'LEVEL_RANGE_INVALID',
    ]);
  });

  it('warns only above 50000 estimated matches and estimates zero-length ranges as zero', () => {
    const request = createPokemonSearchRequest();
    request.context.time_range.second_end = 0;
    expect(
      estimatePokemonDatetimeSearchResults(
        request.context,
        { ...request.genConfig, user_offset: 0, max_advance: 50_000 },
        request.filter
      ).exceedsThreshold
    ).toBe(false);
    expect(
      estimatePokemonDatetimeSearchResults(
        request.context,
        { ...request.genConfig, user_offset: 0, max_advance: 50_001 },
        request.filter
      ).exceedsThreshold
    ).toBe(true);
    expect(
      estimatePokemonDatetimeSearchResults(
        request.context,
        { ...request.genConfig, max_advance: 6 },
        request.filter
      ).estimatedCount
    ).toBe(0);
  });

  it.each(['ivs', 'stats'] as const)(
    'exports startup conditions with unchanged %s values',
    (mode) => {
      const view = createPokemonListResultView();
      const columns = createPokemonSearchExportColumns(mode);
      const normal = filterColumns(columns, false);
      expect(normal.map((column) => column.key)).toEqual(
        expect.arrayContaining(['datetime', 'timer0', 'vcount', 'key_input', 'advance'])
      );
      const existing = createPokemonListExportColumns(mode);
      for (const column of existing)
        expect(columns.find((item) => item.key === column.key)?.accessor(view)).toBe(
          column.accessor(view)
        );
      expect(toCsv([view], normal)).toContain('Date/Time');
    }
  );
});
