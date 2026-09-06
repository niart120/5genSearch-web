import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PokemonFilterForm } from '@/features/pokemon-list/components/pokemon-filter-form';
import { PokemonSearchFilterForm } from '@/features/pokemon-search/components/pokemon-search-filter-form';
import { EggFilterForm } from '@/components/forms/egg-filter-form';
import { MtseedSearchForm } from '@/features/mtseed-search/components/mtseed-search-form';
import { usePokemonListStore, getPokemonListInitialState } from '@/features/pokemon-list/store';
import { useEggListStore, getEggListInitialState } from '@/features/egg-list/store';
import { useEggSearchStore, getEggSearchInitialState } from '@/features/egg-search/store';
import { useMtseedSearchStore, getMtseedSearchInitialState } from '@/features/mtseed-search/store';
import {
  usePokemonSearchStore,
  getPokemonSearchInitialState,
} from '@/features/pokemon-search/store';
import {
  DEFAULT_IV_RANGES,
  normalizeIvFilter,
  normalizeEggFilter,
} from '@/lib/search-filter-context';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { useUiStore } from '@/stores/settings/ui';

vi.mock('@/wasm/wasm_pkg.js', () => ({ get_species_name: String }));
const iv = { ...DEFAULT_IV_RANGES, hp: [30, 31] as [number, number], hidden_power_min_power: 65 };
const emptyFilter = {
  iv,
  natures: undefined,
  gender: undefined,
  ability_slot: undefined,
  shiny: undefined,
  stats: undefined,
};
const cases = ['pokemon-list', 'egg-list', 'egg-search', 'mtseed-search'] as const;
type Feature = (typeof cases)[number];

function Harness({ feature }: { feature: Feature }) {
  const pokemon = usePokemonListStore();
  const egg = useEggListStore();
  const search = useEggSearchStore();
  const mt = useMtseedSearchStore();
  if (feature === 'pokemon-list')
    return (
      <PokemonFilterForm
        value={pokemon.filter}
        onChange={pokemon.setFilter}
        statsFilter={pokemon.statsFilter}
        onStatsFilterChange={pokemon.setStatsFilter}
        statMode={pokemon.statMode}
        availableSpecies={[]}
        encounterType="Normal"
      />
    );
  if (feature === 'egg-list')
    return (
      <EggFilterForm
        value={egg.filter}
        onChange={egg.setFilter}
        eggParams={egg.eggParams}
        statMode={egg.statMode}
        statsFilter={egg.statsFilter}
        onStatsFilterChange={egg.setStatsFilter}
        showToggle
        showReset
      />
    );
  if (feature === 'egg-search')
    return (
      <EggFilterForm
        value={search.filter}
        onChange={search.setFilter}
        eggParams={search.eggParams}
        showReset
      />
    );
  return (
    <MtseedSearchForm
      ivFilter={mt.ivFilter}
      onIvFilterChange={mt.setIvFilter}
      mtOffset={0}
      isRoamer={false}
      onMtOffsetChange={mt.setMtOffset}
      onRoamerChange={mt.setIsRoamer}
    />
  );
}
const readIv = (feature: Feature) =>
  feature === 'pokemon-list'
    ? usePokemonListStore.getState().filter?.iv
    : feature === 'egg-list'
      ? useEggListStore.getState().filter?.iv
      : feature === 'egg-search'
        ? useEggSearchStore.getState().filter?.iv
        : useMtseedSearchStore.getState().ivFilter;
const stores = {
  'pokemon-list': usePokemonListStore,
  'egg-list': useEggListStore,
  'egg-search': useEggSearchStore,
  'mtseed-search': useMtseedSearchStore,
};

describe('範囲の入力保持と再適用', () => {
  beforeEach(() => {
    setupTestI18n('en');
    useUiStore.setState({ language: 'en' });
    usePokemonListStore.setState({
      ...getPokemonListInitialState(),
      statMode: 'ivs',
      filter: {
        ...emptyFilter,
        species_ids: undefined,
        level_range: undefined,
        held_item_slots: undefined,
        encounter_result_filter: undefined,
      },
    });
    useEggListStore.setState({
      ...getEggListInitialState(),
      statMode: 'ivs',
      filter: { ...emptyFilter, min_margin_frames: undefined },
    });
    useEggSearchStore.setState({
      ...getEggSearchInitialState(),
      filter: { ...emptyFilter, min_margin_frames: undefined },
    });
    useMtseedSearchStore.setState({ ...getMtseedSearchInitialState(), ivFilter: iv });
    usePokemonSearchStore.setState(getPokemonSearchInitialState());
  });

  it.each(cases)(
    '%s: 任意→再読み込み→解除で [30,31] を復元し、めざパも独立して保持する',
    async (feature) => {
      const user = userEvent.setup();
      const mounted = render(
        <I18nTestWrapper>
          <Harness feature={feature} />
        </I18nTestWrapper>
      );
      if (feature !== 'mtseed-search') await user.click(screen.getByText('Filter'));
      const any = screen.getByRole('checkbox', { name: 'HP unknown' });
      await user.click(any);
      expect(screen.getByRole('textbox', { name: 'HP min' })).toBeDisabled();
      expect(readIv(feature)?.hp).toEqual([30, 31]);
      expect(normalizeIvFilter(readIv(feature))?.hp).toEqual([0, 31]);
      await user.click(screen.getByRole('checkbox', { name: 'Enable minimum Hidden Power power' }));
      expect(normalizeIvFilter(readIv(feature))).toBeUndefined();
      mounted.unmount();
      await act(() => stores[feature].persist.rehydrate());
      render(
        <I18nTestWrapper>
          <Harness feature={feature} />
        </I18nTestWrapper>
      );
      if (feature !== 'mtseed-search') await user.click(screen.getByText('Filter'));
      await user.click(screen.getByRole('checkbox', { name: 'HP unknown' }));
      expect(screen.getByRole('textbox', { name: 'HP min' })).toHaveValue('30');
      expect(normalizeIvFilter(readIv(feature))?.hp).toEqual([30, 31]);
      await user.click(screen.getByRole('checkbox', { name: 'Enable minimum Hidden Power power' }));
      expect(normalizeIvFilter(readIv(feature))?.hidden_power_min_power).toBe(65);
    }
  );

  it('ポケモン検索: レベルOFFと固定対象への変更を挟んでも範囲を保持する', async () => {
    const user = userEvent.setup();
    function Search() {
      const state = usePokemonSearchStore();
      const [fixed, setFixed] = useState(false);
      return (
        <>
          <button onClick={() => setFixed(!fixed)}>Target</button>
          <PokemonSearchFilterForm
            value={state.filter}
            onChange={state.setFilter}
            availableSpecies={[]}
            context={{ encounterType: fixed ? 'StaticSymbol' : 'Normal', slots: [] }}
          />
        </>
      );
    }
    usePokemonSearchStore
      .getState()
      .setFilter({ ...getPokemonSearchInitialState().filter, level_range: [30, 40] });
    render(
      <I18nTestWrapper>
        <Search />
      </I18nTestWrapper>
    );
    await user.click(screen.getByRole('checkbox', { name: 'Enable level range' }));
    expect(screen.getByLabelText('level-min')).toBeDisabled();
    await user.click(screen.getByText('Target'));
    expect(screen.queryByLabelText('level-min')).not.toBeInTheDocument();
    await user.click(screen.getByText('Target'));
    await user.click(screen.getByRole('checkbox', { name: 'Enable level range' }));
    expect(screen.getByLabelText('level-min')).toHaveValue(30);
    expect(screen.getByLabelText('level-max')).toHaveValue(40);
    await user.click(screen.getByRole('button', { name: 'Reset filter' }));
    expect(screen.getByLabelText('level-min')).toHaveValue(1);
    expect(screen.getByLabelText('level-min')).toBeDisabled();
  });

  it('タマゴ: NPC・親設定の切り替えでは入力を保持し、非表示中のリセットでは破棄する', async () => {
    const user = userEvent.setup();
    const store = useEggSearchStore.getState();
    store.setEggParams((prev) => ({ ...prev, consider_npc: true, female_ability_slot: 'Hidden' }));
    store.setFilter({
      ...emptyFilter,
      iv: undefined,
      ability_slot: 'Hidden',
      min_margin_frames: 7,
    });
    render(
      <I18nTestWrapper>
        <Harness feature="egg-search" />
      </I18nTestWrapper>
    );
    await user.click(screen.getByText('Filter'));
    const margin = screen.getByRole('spinbutton', { name: 'Min margin frames' });
    await user.click(screen.getByRole('checkbox', { name: 'Enable minimum margin frames' }));
    expect(margin).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'Enable minimum margin frames' }));
    expect(margin).toHaveValue(7);
    act(() => store.setEggParams((prev) => ({ ...prev, consider_npc: false, uses_ditto: true })));
    expect(screen.queryByRole('spinbutton', { name: 'Min margin frames' })).not.toBeInTheDocument();
    const hidden = useEggSearchStore.getState();
    expect(normalizeEggFilter(hidden.filter, undefined, hidden.eggParams)).toBeUndefined();
    expect(hidden.filter?.ability_slot).toBe('Hidden');
    await user.click(screen.getByRole('button', { name: 'Reset filter' }));
    act(() => store.setEggParams((prev) => ({ ...prev, consider_npc: true, uses_ditto: false })));
    expect(screen.getByRole('spinbutton', { name: 'Min margin frames' })).toHaveValue(0);
    expect(screen.getByRole('spinbutton', { name: 'Min margin frames' })).toBeDisabled();
    expect(useEggSearchStore.getState().filter).toBeUndefined();
  });

  it('個体値を編集中に任意を選んでも、blurで確定した値を保持する', async () => {
    const user = userEvent.setup();
    render(
      <I18nTestWrapper>
        <Harness feature="mtseed-search" />
      </I18nTestWrapper>
    );
    const min = screen.getByRole('textbox', { name: 'HP min' });
    await user.clear(min);
    await user.type(min, '29');
    await user.click(screen.getByRole('checkbox', { name: 'HP unknown' }));
    expect(readIv('mtseed-search')?.hp).toEqual([29, 31]);
    expect(normalizeIvFilter(readIv('mtseed-search'))?.hp).toEqual([0, 31]);
    await user.click(screen.getByRole('checkbox', { name: 'HP unknown' }));
    expect(min).toHaveValue('29');
  });
});
