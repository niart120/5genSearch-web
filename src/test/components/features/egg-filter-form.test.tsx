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

describe('EggFilterForm', () => {
  beforeEach(() => {
    act(() => {
      setupTestI18n('ja');
      useUiStore.setState({ language: 'ja' });
    });
  });

  it('折りたたみヘッダーが表示される', () => {
    renderFilterForm();
    expect(screen.getByText('Filter (optional)')).toBeInTheDocument();
  });

  it('shiny セレクトが表示される', async () => {
    const user = userEvent.setup();
    renderFilterForm();
    // 折りたたみを開く
    await user.click(screen.getByText('Filter (optional)'));
    expect(screen.getByText('Shiny')).toBeInTheDocument();
  });

  it('shiny 初期値が反映される', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilterForm({
      value: { ...DEFAULT_FILTER, shiny: 'Star' },
      onChange,
    });
    await user.click(screen.getByText('Filter (optional)'));
    // Radix Select の combobox に現在値が表示される
    const comboboxes = screen.getAllByRole('combobox');
    const shinyCombobox = comboboxes.find((el) => el.textContent?.includes('☆'));
    expect(shinyCombobox).toBeDefined();
  });

  it('min_margin_frames の入力フィールドが表示される', async () => {
    const user = userEvent.setup();
    renderFilterForm();
    await user.click(screen.getByText('Filter (optional)'));
    expect(screen.getByLabelText('Min margin frames')).toBeInTheDocument();
  });

  it('min_margin_frames 変更で onChange が呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilterForm({ onChange });
    await user.click(screen.getByText('Filter (optional)'));

    const marginInput = screen.getByLabelText('Min margin frames');
    await user.clear(marginInput);
    await user.type(marginInput, '5');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ min_margin_frames: 5 }));
  });

  it('IV フィルターに任意 (allowUnknown) チェックボックスが表示される', async () => {
    const user = userEvent.setup();
    renderFilterForm();
    await user.click(screen.getByText('Filter (optional)'));

    // allowUnknown=true により 6 stat 分の unknown チェックボックスが表示される
    const unknownCheckboxes = screen.getAllByRole('checkbox', { name: /unknown/ });
    expect(unknownCheckboxes).toHaveLength(6);
  });
});
