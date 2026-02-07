import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NatureSelect } from '@/components/forms/nature-select';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { useUiStore } from '@/stores/settings/ui';
import type { Nature } from '@/wasm/wasm_pkg';

function renderNatureSelect(props: Partial<Parameters<typeof NatureSelect>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  return {
    onChange,
    ...render(
      <I18nTestWrapper>
        <NatureSelect value={[]} onChange={onChange} {...props} />
      </I18nTestWrapper>
    ),
  };
}

describe('NatureSelect', () => {
  beforeEach(() => {
    setupTestI18n('ja');
    useUiStore.setState({ language: 'ja' });
  });

  it('選択数 0 のとき指定なしと表示される', () => {
    renderNatureSelect();
    expect(screen.getByText(/指定なし/)).toBeInTheDocument();
  });

  it('選択数が表示される', () => {
    const selected: Nature[] = ['Hardy', 'Bold', 'Timid'];
    renderNatureSelect({ value: selected });
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('チェックボックスのトグルで onChange が呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderNatureSelect({ onChange });

    // Popover を開く
    const trigger = screen.getByRole('button', { name: 'nature-select-trigger' });
    await user.click(trigger);

    // 性格名を探してクリック
    const hardy = screen.getByText('がんばりや');
    await user.click(hardy);

    expect(onChange).toHaveBeenCalledWith(['Hardy']);
  });

  it('全選択で 25 件選択される', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderNatureSelect({ onChange });

    const trigger = screen.getByRole('button', { name: 'nature-select-trigger' });
    await user.click(trigger);

    const selectAll = screen.getByText('全選択');
    await user.click(selectAll);

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(25);
  });

  it('全解除で 0 件になる', async () => {
    const user = userEvent.setup();
    const selected: Nature[] = ['Hardy', 'Bold'];
    const onChange = vi.fn();
    renderNatureSelect({ value: selected, onChange });

    const trigger = screen.getByRole('button', { name: 'nature-select-trigger' });
    await user.click(trigger);

    const clearAll = screen.getByText('全解除');
    await user.click(clearAll);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('ロケール切替で性格名が切り替わる', async () => {
    const user = userEvent.setup();
    useUiStore.setState({ language: 'en' });
    setupTestI18n('en');

    renderNatureSelect();

    const trigger = screen.getByRole('button', { name: 'nature-select-trigger' });
    await user.click(trigger);

    expect(screen.getByText('Hardy')).toBeInTheDocument();
    expect(screen.getByText('Adamant')).toBeInTheDocument();

    useUiStore.setState({ language: 'ja' });
  });
});
