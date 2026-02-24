import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { useUiStore } from '@/stores/settings/ui';
import type { PokemonFilter, EncounterType } from '@/wasm/wasm_pkg.js';

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
  const resolvedProps = {
    value: DEFAULT_FILTER as PokemonFilter | undefined,
    onChange,
    statsFilter: undefined,
    onStatsFilterChange,
    statMode: 'ivs' as const,
    availableSpecies: [] as Parameters<typeof PokemonFilterForm>[0]['availableSpecies'],
    encounterType: 'Normal' as EncounterType,
    ...props,
  };
  const result = render(
    <I18nTestWrapper>
      <PokemonFilterForm {...resolvedProps} />
    </I18nTestWrapper>
  );
  return {
    onChange,
    onStatsFilterChange,
    ...result,
    /** encounterType 等の props を差し替えて再描画する */
    rerenderWith: (overrides: Partial<Parameters<typeof PokemonFilterForm>[0]>) => {
      const nextProps = { ...resolvedProps, ...overrides, onChange, onStatsFilterChange };
      result.rerender(
        <I18nTestWrapper>
          <PokemonFilterForm {...nextProps} />
        </I18nTestWrapper>
      );
    },
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

  it('encounterType 変更で非表示になったフィルタが undefined で伝播される', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // 持ち物フィルタが有効な Surfing で描画し、持ち物を選択する
    const initialFilter: PokemonFilter = {
      ...DEFAULT_FILTER,
      held_item_slots: ['Common'],
    };
    const { rerenderWith } = renderFilterForm({
      value: initialFilter,
      encounterType: 'Surfing',
      onChange,
    });
    await openFilter(user);
    expect(screen.getByLabelText('held-item-slot-select-trigger')).toBeInTheDocument();

    // encounterType を Normal に切り替え (持ち物フィルタが非表示になる)
    onChange.mockClear();
    await act(async () => {
      rerenderWith({ encounterType: 'Normal', value: initialFilter });
    });

    // onChange が呼ばれ、held_item_slots が undefined になっている
    const calls = onChange.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastFilter = calls.at(-1)![0] as PokemonFilter | undefined;
    expect(lastFilter?.held_item_slots).toBeUndefined();
  });
});
