import { useState } from 'react';
import { normalizePokemonFilter, type PokemonFilterInput } from '@/lib/search-filter-context';
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
  special_encounter_triggered: undefined,
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
  function Harness({ options }: { options: typeof resolvedProps }) {
    const [value, setValue] = useState<PokemonFilterInput | undefined>(options.value);
    const [previous, setPrevious] = useState(options.value);
    if (previous !== options.value) {
      setPrevious(options.value);
      setValue(options.value);
    }
    return (
      <PokemonFilterForm
        {...options}
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    );
  }
  const result = render(
    <I18nTestWrapper>
      <Harness options={resolvedProps} />
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
          <Harness options={nextProps} />
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

    await user.click(screen.getByRole('checkbox', { name: 'Enable level range' }));
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

  it('encounterType=Surfing でも持ち物フィルタが非表示', async () => {
    const user = userEvent.setup();
    renderFilterForm({ encounterType: 'Surfing' });
    await openFilter(user);
    expect(screen.queryByLabelText('held-item-slot-select-trigger')).not.toBeInTheDocument();
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

  it('特殊エンカウント種別で発生のみフィルタが表示される', async () => {
    const user = userEvent.setup();
    renderFilterForm({ encounterType: 'DustCloud' });
    await openFilter(user);

    expect(screen.getByRole('checkbox', { name: 'Special encounter only' })).toBeInTheDocument();
  });

  it('通常エンカウント種別では発生のみフィルタが表示されない', async () => {
    const user = userEvent.setup();
    renderFilterForm({ encounterType: 'Normal' });
    await openFilter(user);

    expect(
      screen.queryByRole('checkbox', { name: 'Special encounter only' })
    ).not.toBeInTheDocument();
  });

  it('発生のみの選択と解除を親のフィルタへ伝播する', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilterForm({ encounterType: 'DustCloud', onChange });
    await openFilter(user);

    const checkbox = screen.getByRole('checkbox', { name: 'Special encounter only' });
    await user.click(checkbox);

    const enabledFilter = onChange.mock.calls.at(-1)?.[0] as PokemonFilter | undefined;
    expect(enabledFilter?.special_encounter_triggered).toBe(true);

    await user.click(checkbox);

    const disabledFilter = onChange.mock.calls.at(-1)?.[0] as PokemonFilter | undefined;
    expect(disabledFilter?.special_encounter_triggered).toBeUndefined();
  });

  it('経路変更は保持した持ち物条件を変更せず、要求時に除外する', async () => {
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
    expect(screen.queryByLabelText('held-item-slot-select-trigger')).not.toBeInTheDocument();

    // encounterType を Normal に切り替え (持ち物フィルタが非表示になる)
    onChange.mockClear();
    await act(async () => {
      rerenderWith({ encounterType: 'Normal', value: initialFilter });
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(
      normalizePokemonFilter(
        initialFilter,
        undefined,
        { encounterType: 'Normal', slots: [] },
        'ivs'
      )
    ).toBeUndefined();
  });

  it('特殊エンカウント以外への変更で発生のみ条件を除外する', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const initialFilter: PokemonFilter = {
      ...DEFAULT_FILTER,
      special_encounter_triggered: true,
    };
    const { rerenderWith } = renderFilterForm({
      value: initialFilter,
      encounterType: 'DustCloud',
      onChange,
    });
    await openFilter(user);
    expect(screen.getByRole('checkbox', { name: 'Special encounter only' })).toBeChecked();

    onChange.mockClear();
    await act(async () => {
      rerenderWith({ encounterType: 'Normal', value: initialFilter });
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(
      normalizePokemonFilter(
        initialFilter,
        undefined,
        { encounterType: 'Normal', slots: [] },
        'ivs'
      )
    ).toBeUndefined();
  });

  it('syncKey 変更時は内部フィルタを外部値に同期する', async () => {
    const user = userEvent.setup();
    const initialFilter: PokemonFilter = {
      ...DEFAULT_FILTER,
      level_range: [10, 20],
    };
    const { rerenderWith } = renderFilterForm({
      value: initialFilter,
      syncKey: 0,
    });
    await openFilter(user);

    expect((screen.getByLabelText('level-min') as HTMLInputElement).value).toBe('10');

    rerenderWith({ value: undefined, syncKey: 1 });

    expect((screen.getByLabelText('level-min') as HTMLInputElement).value).toBe('1');
  });
});
