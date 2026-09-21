import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PokemonParamsForm } from '@/features/pokemon-list/components/pokemon-params-form';
import { DEFAULT_ENCOUNTER_PARAMS } from '@/features/pokemon-list/types';
import { usePokemonListStore, getPokemonListInitialState } from '@/features/pokemon-list/store';
import {
  usePokemonSearchStore,
  getPokemonSearchInitialState,
} from '@/features/pokemon-search/store';
import { useDsConfigStore, getDsConfigInitialState } from '@/stores/settings/ds-config';
import { encounterSlotKey, hasCurrentEncounterSlots } from '@/lib/encounter-slot-context';
import { listLocations, listSpecies } from '@/data/encounters/helpers';
import { getEncounterSlots, getStaticEncounterEntry } from '@/data/encounters/loader';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import type { EncounterSlotJson } from '@/data/encounters/schema';
import { EMPTY_POKEMON_SEARCH_FILTER } from '@/features/pokemon-search/types';
const EMPTY_FILTER = {
  ...EMPTY_POKEMON_SEARCH_FILTER,
  iv: undefined,
  stats: undefined,
  held_item_slots: undefined,
  encounter_result_filter: undefined,
};

vi.mock('@/wasm/wasm_pkg.js', () => ({ get_species_name: String }));
vi.mock('@/data/encounters/helpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/encounters/helpers')>()),
  listLocations: vi.fn(),
  listSpecies: vi.fn(),
}));
vi.mock('@/data/encounters/loader', () => ({
  getEncounterSlots: vi.fn(),
  getStaticEncounterEntry: vi.fn(),
}));

function slots(ids: number[]): EncounterSlotJson[] {
  return ids.map((speciesId) => ({
    speciesId,
    rate: 50,
    levelRange: { min: 10, max: 20 },
    genderRatio: 'F1M1',
    hasHeldItem: false,
  }));
}

describe.each([false, true])('候補と種族入力の連携 search=%s', (search) => {
  const store = search ? usePokemonSearchStore : usePokemonListStore;
  function Harness() {
    const listValue = usePokemonListStore((s) => s.encounterParams);
    const searchValue = usePokemonSearchStore((s) => s.encounterParams);
    const value = search ? searchValue : listValue;
    const version = useDsConfigStore((s) => s.config.version);
    return (
      <PokemonParamsForm
        value={value}
        onChange={store.getState().setEncounterParams}
        version={version}
      />
    );
  }
  function mount() {
    return render(<Harness />, { wrapper: I18nTestWrapper });
  }
  function selected() {
    return store.getState().filter?.species_ids;
  }
  async function ready() {
    await waitFor(() =>
      expect(
        hasCurrentEncounterSlots(
          store.getState().encounterParams,
          useDsConfigStore.getState().config.version
        )
      ).toBe(true)
    );
  }
  beforeEach(() => {
    setupTestI18n('en');
    useDsConfigStore.setState(structuredClone(getDsConfigInitialState()));
    useDsConfigStore.getState().setConfig({ version: 'Black2' });
    usePokemonListStore.setState(getPokemonListInitialState());
    usePokemonSearchStore.setState(getPokemonSearchInitialState());
    vi.mocked(listLocations)
      .mockReset()
      .mockResolvedValue([
        { key: 'cave', displayNameKey: 'Cave' },
        { key: 'other', displayNameKey: 'Other' },
      ]);
    vi.mocked(listSpecies).mockReset().mockResolvedValue([]);
    vi.mocked(getStaticEncounterEntry).mockReset();
    vi.mocked(getEncounterSlots)
      .mockReset()
      .mockImplementation(async (version, location) =>
        slots(version === 'B2' && location === 'cave' ? [299, 525] : [525])
      );
    store.getState().setEncounterParams({ ...DEFAULT_ENCOUNTER_PARAMS, locationKey: 'cave' });
    store.getState().setFilter({ ...EMPTY_FILTER, species_ids: [299, 525], level_range: [30, 40] });
  });
  it('バージョン変更で消えた種族のみ解除し、元に戻っても復元しない', async () => {
    mount();
    await ready();
    act(() => useDsConfigStore.getState().setConfig({ version: 'Black' }));
    await ready();
    expect(selected()).toEqual([525]);
    expect(store.getState().filter?.level_range).toEqual([30, 40]);
    act(() => useDsConfigStore.getState().setConfig({ version: 'Black2' }));
    await ready();
    expect(selected()).toEqual([525]);
  });
  it('場所変更でも同じ照合を行い、最新のフィルター入力を使用する', async () => {
    let complete: ((value: EncounterSlotJson[]) => void) | undefined;
    vi.mocked(getEncounterSlots).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        })
    );
    mount();
    await waitFor(() => expect(complete).toBeDefined());
    act(() => store.getState().setFilter({ ...EMPTY_FILTER, species_ids: [525] }));
    await act(async () => complete?.(slots([299, 525])));
    await ready();
    expect(selected()).toEqual([525]);
    act(() => store.getState().setEncounterParams((prev) => ({ ...prev, locationKey: 'other' })));
    await ready();
    expect(selected()).toEqual([525]);
  });
  it('親候補が消えたら未選択にし、子は有効な親の選択まで保持する', async () => {
    mount();
    await ready();
    vi.mocked(listLocations).mockResolvedValue([{ key: 'other', displayNameKey: 'Other' }]);
    act(() => useDsConfigStore.getState().setConfig({ version: 'Black' }));
    await waitFor(() => expect(store.getState().encounterParams.locationKey).toBe(''));
    expect(selected()).toEqual([299, 525]);
    expect(hasCurrentEncounterSlots(store.getState().encounterParams, 'Black')).toBe(false);
    act(() => store.getState().setEncounterParams((prev) => ({ ...prev, locationKey: 'other' })));
    await ready();
    expect(selected()).toEqual([525]);
  });
  it('固定へ移ると保持し、野生へ戻ったときの候補で照合する', async () => {
    mount();
    await ready();
    act(() =>
      store.getState().setEncounterParams((prev) => ({ ...prev, encounterType: 'StaticSymbol' }))
    );
    await waitFor(() =>
      expect(store.getState().encounterParams.slotsContextKey).toContain('StaticSymbol')
    );
    expect(selected()).toEqual([299, 525]);
    act(() => {
      useDsConfigStore.getState().setConfig({ version: 'Black' });
      store.getState().setEncounterParams((prev) => ({ ...prev, encounterType: 'Normal' }));
    });
    await ready();
    expect(selected()).toEqual([525]);
  });
  it('取得失敗では入力を保持し、正常終了した空の候補では解除する', async () => {
    vi.mocked(getEncounterSlots).mockRejectedValueOnce(new Error('offline'));
    const view = mount();
    await waitFor(() => expect(getEncounterSlots).toHaveBeenCalled());
    expect(selected()).toEqual([299, 525]);
    expect(hasCurrentEncounterSlots(store.getState().encounterParams, 'Black2')).toBe(false);
    view.unmount();
    vi.mocked(getEncounterSlots).mockResolvedValue([]);
    mount();
    await waitFor(() =>
      expect(store.getState().encounterParams.slotsContextKey).toBe(
        encounterSlotKey(store.getState().encounterParams, 'Black2')
      )
    );
    expect(selected()).toBeUndefined();
  });
  it('画面を再表示したときも現在の ROM と照合する', async () => {
    const view = mount();
    await ready();
    view.unmount();
    act(() => useDsConfigStore.getState().setConfig({ version: 'Black' }));
    mount();
    await ready();
    expect(selected()).toEqual([525]);
  });
  it('場所の取得失敗では親選択を解除しない', async () => {
    vi.mocked(listLocations).mockRejectedValueOnce(new Error('offline'));
    mount();
    await waitFor(() => expect(listLocations).toHaveBeenCalled());
    expect(store.getState().encounterParams.locationKey).toBe('cave');
    expect(getEncounterSlots).not.toHaveBeenCalled();
  });
  it('固定個体の候補外 ID を解除し、先頭候補を自動選択しない', async () => {
    vi.mocked(listSpecies).mockResolvedValue([
      {
        kind: 'static',
        id: 'valid',
        speciesId: 638,
        level: 42,
        genderRatio: 'Genderless',
        displayNameKey: 'Cobalion',
      },
    ]);
    store.getState().setEncounterParams({
      ...DEFAULT_ENCOUNTER_PARAMS,
      encounterType: 'StaticSymbol',
      staticEntryId: 'missing',
    });
    mount();
    await waitFor(() => expect(store.getState().encounterParams.staticEntryId).toBe(''));
    expect(getStaticEncounterEntry).not.toHaveBeenCalled();
    expect(selected()).toEqual([299, 525]);
  });
  it('バージョン間で共通する固定個体の選択を保持する', async () => {
    const entry = {
      id: 'valid',
      speciesId: 638,
      level: 42,
      genderRatio: 'Genderless' as const,
      displayNameKey: 'Cobalion',
    };
    vi.mocked(listSpecies).mockResolvedValue([{ kind: 'static', ...entry }]);
    vi.mocked(getStaticEncounterEntry).mockResolvedValue(entry);
    store.getState().setEncounterParams({
      ...DEFAULT_ENCOUNTER_PARAMS,
      encounterType: 'StaticSymbol',
      staticEntryId: 'valid',
    });
    mount();
    await ready();
    act(() => useDsConfigStore.getState().setConfig({ version: 'Black' }));
    await ready();
    expect(store.getState().encounterParams.staticEntryId).toBe('valid');
  });
  it('A → B → A の遅い旧応答で、現在の種族選択を解除しない', async () => {
    let completeOld: ((value: EncounterSlotJson[]) => void) | undefined;
    vi.mocked(getEncounterSlots).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeOld = resolve;
        })
    );
    mount();
    await waitFor(() => expect(completeOld).toBeDefined());
    act(() => useDsConfigStore.getState().setConfig({ version: 'Black' }));
    await ready();
    act(() => useDsConfigStore.getState().setConfig({ version: 'Black2' }));
    await ready();
    act(() => store.getState().setFilter({ ...EMPTY_FILTER, species_ids: [299] }));
    await act(async () => completeOld?.(slots([525])));
    expect(selected()).toEqual([299]);
  });
  it('永続化・復元では取得済み候補を再利用しない', async () => {
    mount();
    await ready();
    const state = store.getState();
    const saved = search
      ? usePokemonSearchStore.persist.getOptions().partialize?.(usePokemonSearchStore.getState())
      : usePokemonListStore.persist.getOptions().partialize?.(usePokemonListStore.getState());
    expect(saved?.encounterParams.slotsContextKey).toBeUndefined();
    const name = search ? 'feature:pokemon-search' : 'feature:pokemon-list';
    localStorage.setItem(
      name,
      JSON.stringify({
        state: { encounterParams: state.encounterParams, filter: state.filter },
        version: 3,
      })
    );
    await act(async () => {
      await store.persist.rehydrate();
    });
    expect(store.getState().encounterParams.slotsContextKey).toBeUndefined();
    expect(selected()).toEqual([299, 525]);
  });
});
