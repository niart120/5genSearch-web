import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HiddenPowerSelect } from '@/components/forms/hidden-power-select';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { useUiStore } from '@/stores/settings/ui';
import type { HiddenPowerType } from '@/wasm/wasm_pkg';

function renderHiddenPowerSelect(props: Partial<Parameters<typeof HiddenPowerSelect>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  return {
    onChange,
    ...render(
      <I18nTestWrapper>
        <HiddenPowerSelect value={[]} onChange={onChange} {...props} />
      </I18nTestWrapper>
    ),
  };
}

describe('HiddenPowerSelect', () => {
  beforeEach(() => {
    setupTestI18n('ja');
    useUiStore.setState({ language: 'ja' });
  });

  it('選択数 0 のとき指定なしと表示される', () => {
    renderHiddenPowerSelect();
    expect(screen.getByText(/指定なし/)).toBeInTheDocument();
  });

  it('選択数が表示される', () => {
    const selected: HiddenPowerType[] = ['Fire', 'Ice'];
    renderHiddenPowerSelect({ value: selected });
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('チェックボックスのトグルで onChange が呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderHiddenPowerSelect({ onChange });

    const trigger = screen.getByRole('button', { name: 'hidden-power-select-trigger' });
    await user.click(trigger);

    const fire = screen.getByText('ほのお');
    await user.click(fire);

    expect(onChange).toHaveBeenCalledWith(['Fire']);
  });

  it('全選択で 16 件選択される', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderHiddenPowerSelect({ onChange });

    const trigger = screen.getByRole('button', { name: 'hidden-power-select-trigger' });
    await user.click(trigger);

    const selectAll = screen.getByText('全選択');
    await user.click(selectAll);

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(16);
  });

  it('全解除で 0 件になる', async () => {
    const user = userEvent.setup();
    const selected: HiddenPowerType[] = ['Fire', 'Ice'];
    const onChange = vi.fn();
    renderHiddenPowerSelect({ value: selected, onChange });

    const trigger = screen.getByRole('button', { name: 'hidden-power-select-trigger' });
    await user.click(trigger);

    const clearAll = screen.getByText('全解除');
    await user.click(clearAll);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('ロケール切替でタイプ名が切り替わる', async () => {
    const user = userEvent.setup();
    useUiStore.setState({ language: 'en' });
    setupTestI18n('en');

    renderHiddenPowerSelect();

    const trigger = screen.getByRole('button', { name: 'hidden-power-select-trigger' });
    await user.click(trigger);

    expect(screen.getByText('Fire')).toBeInTheDocument();
    expect(screen.getByText('Ice')).toBeInTheDocument();

    useUiStore.setState({ language: 'ja' });
  });
});
