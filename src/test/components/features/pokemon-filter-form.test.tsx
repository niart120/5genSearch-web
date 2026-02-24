import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { useUiStore } from '@/stores/settings/ui';
import type { PokemonFilter } from '@/wasm/wasm_pkg.js';

// WASM を jsdom 環境でロードできないためスタブ化
vi.mock('@/wasm/wasm_pkg.js', () => ({
  get_species_name: vi.fn(() => 'Bulbasaur'),
}));

// モック後にインポート
const { PokemonFilterForm } =
  await import('@/features/pokemon-list/components/pokemon-filter-form');

const DEFAULT_FILTER: PokemonFilter = {
  iv: undefined,
  natures: undefined,
  gender: undefined,
  ability_slot: undefined,
  shiny: undefined,
  species_ids: undefined,
  level_range: undefined,
  held_item_slots: undefined,
  encounter_result_filter: undefined,
  stats: undefined,
};

function renderFilterForm(props: Partial<Parameters<typeof PokemonFilterForm>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  const onStatsFilterChange = props.onStatsFilterChange ?? vi.fn();
  return {
    onChange,
    onStatsFilterChange,
    ...render(
      <I18nTestWrapper>
        <PokemonFilterForm
          value={DEFAULT_FILTER}
          onChange={onChange}
          statsFilter={undefined}
          onStatsFilterChange={onStatsFilterChange}
          statMode="ivs"
          availableSpecies={[]}
          encounterType={props.encounterType ?? 'Normal'}
          {...props}
        />
      </I18nTestWrapper>
    ),
  };
}

/** 折りたたみを開く */
async function openFilter(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText('Filter'));
}

describe('PokemonFilterForm', () => {
  beforeEach(() => {
    act(() => {
      setupTestI18n('ja');
      useUiStore.setState({ language: 'ja' });
    });
  });

  it('レベル範囲入力がフィルタ展開時に表示される', async () => {
    const user = userEvent.setup();
    renderFilterForm();
    await openFilter(user);
    expect(screen.getByLabelText('level-min')).toBeInTheDocument();
    expect(screen.getByLabelText('level-max')).toBeInTheDocument();
  });

  it('レベル範囲の値変更で onChange が [min, max] を返す', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilterForm({ onChange });
    await openFilter(user);

    const minInput = screen.getByLabelText('level-min');
    await user.clear(minInput);
    await user.type(minInput, '10');
    await user.tab(); // blur で emit

    // onChange が level_range を含むフィルタで呼ばれた
    const lastCall = onChange.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const filter = lastCall![0] as PokemonFilter | undefined;
    expect(filter?.level_range).toBeDefined();
  });

  it('encounterType=Surfing で持ち物フィルタが表示される', async () => {
    const user = userEvent.setup();
    renderFilterForm({ encounterType: 'Surfing' });
    await openFilter(user);
    expect(screen.getByLabelText('held-item-slot-select-trigger')).toBeInTheDocument();
  });

  it('encounterType=Normal で持ち物フィルタが非表示', async () => {
    const user = userEvent.setup();
    renderFilterForm({ encounterType: 'Normal' });
    await openFilter(user);
    expect(screen.queryByLabelText('held-item-slot-select-trigger')).not.toBeInTheDocument();
  });

  it('encounterType=DustCloud でエンカウント結果フィルタが表示される', async () => {
    const user = userEvent.setup();
    renderFilterForm({ encounterType: 'DustCloud' });
    await openFilter(user);
    expect(screen.getByText('Encounter result')).toBeInTheDocument();
  });

  it('encounterType=Fishing でエンカウント結果フィルタが表示される', async () => {
    const user = userEvent.setup();
    renderFilterForm({ encounterType: 'Fishing' });
    await openFilter(user);
    expect(screen.getByText('Encounter result')).toBeInTheDocument();
  });

  it('encounterType=Normal でエンカウント結果フィルタが非表示', async () => {
    const user = userEvent.setup();
    renderFilterForm({ encounterType: 'Normal' });
    await openFilter(user);
    expect(screen.queryByText('Encounter result')).not.toBeInTheDocument();
  });
});
