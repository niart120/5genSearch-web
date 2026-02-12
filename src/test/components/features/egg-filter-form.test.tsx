import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EggFilterForm } from '@/components/forms/egg-filter-form';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { useUiStore } from '@/stores/settings/ui';
import type { EggFilter } from '@/wasm/wasm_pkg.js';

const DEFAULT_FILTER: EggFilter = {
  iv: undefined,
  natures: undefined,
  gender: undefined,
  ability_slot: undefined,
  shiny: undefined,
  min_margin_frames: undefined,
};

function renderFilterForm(props: Partial<Parameters<typeof EggFilterForm>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  return {
    onChange,
    ...render(
      <I18nTestWrapper>
        <EggFilterForm value={DEFAULT_FILTER} onChange={onChange} {...props} />
      </I18nTestWrapper>
    ),
  };
}

/** 折りたたみを開く */
async function openFilter(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText('Filter'));
}

describe('EggFilterForm', () => {
  beforeEach(() => {
    act(() => {
      setupTestI18n('ja');
      useUiStore.setState({ language: 'ja' });
    });
  });

  it('折りたたみヘッダーが表示される', () => {
    renderFilterForm();
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('shiny セレクトが表示される', async () => {
    const user = userEvent.setup();
    renderFilterForm();
    await openFilter(user);
    expect(screen.getByText('Shiny')).toBeInTheDocument();
  });

  it('shiny 初期値が反映される', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilterForm({
      value: { ...DEFAULT_FILTER, shiny: 'Star' },
      onChange,
    });
    await openFilter(user);
    const comboboxes = screen.getAllByRole('combobox');
    const shinyCombobox = comboboxes.find((el) => el.textContent?.includes('☆'));
    expect(shinyCombobox).toBeDefined();
  });

  it('min_margin_frames の入力フィールドが表示される', async () => {
    const user = userEvent.setup();
    renderFilterForm();
    await openFilter(user);
    expect(screen.getByLabelText('Min margin frames')).toBeInTheDocument();
  });

  it('min_margin_frames 変更で onChange が呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilterForm({ onChange });
    await openFilter(user);

    const marginInput = screen.getByLabelText('Min margin frames');
    await user.clear(marginInput);
    await user.type(marginInput, '5');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ min_margin_frames: 5 }));
  });

  it('IV フィルターに任意 (allowUnknown) チェックボックスが表示される', async () => {
    const user = userEvent.setup();
    renderFilterForm();
    await openFilter(user);

    const unknownCheckboxes = screen.getAllByRole('checkbox', { name: /unknown/ });
    expect(unknownCheckboxes).toHaveLength(6);
  });

  // --- showReset ---

  it('showReset=false のとき Reset ボタンが表示されない', () => {
    renderFilterForm();
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
  });

  it('showReset=true のとき Reset ボタンが表示される', () => {
    renderFilterForm({ showReset: true });
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('Reset ボタンで onChange(undefined) が呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilterForm({
      value: { ...DEFAULT_FILTER, shiny: 'Star' },
      onChange,
      showReset: true,
    });

    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(onChange.mock.lastCall?.[0]).toBeUndefined();
  });

  // --- showToggle ---

  it('showToggle=false のとき Switch が表示されない', () => {
    renderFilterForm();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('showToggle=true のとき Switch が表示される', () => {
    renderFilterForm({ showToggle: true });
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('showToggle=true: value=undefined のとき Switch は OFF', () => {
    renderFilterForm({ value: undefined, showToggle: true });
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('showToggle=true: value 指定時は Switch ON', () => {
    renderFilterForm({
      value: { ...DEFAULT_FILTER, shiny: 'Star' },
      showToggle: true,
    });
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('showToggle: Switch OFF→ON で内部状態が復元される', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilterForm({
      value: { ...DEFAULT_FILTER, shiny: 'Star' },
      onChange,
      showToggle: true,
      showReset: true,
    });

    const toggle = screen.getByRole('switch');

    // ON → OFF: onChange(undefined)
    await user.click(toggle);
    expect(onChange.mock.lastCall?.[0]).toBeUndefined();

    // OFF → ON: onChange で内部保持値が復元 (shiny: 'Star')
    onChange.mockClear();
    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ shiny: 'Star' }));
  });

  it('showToggle: Switch OFF 時に子要素が opacity-50 になる', async () => {
    const user = userEvent.setup();
    renderFilterForm({ value: undefined, showToggle: true });

    await openFilter(user);
    const content = screen.getByText('Shiny').closest('.flex.flex-col.gap-3');
    expect(content?.className).toContain('opacity-50');
  });
});
