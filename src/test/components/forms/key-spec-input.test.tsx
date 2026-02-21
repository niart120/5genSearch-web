/**
 * KeySpecSelector コンポーネントテスト (key-spec-input)
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeySpecSelector } from '@/components/forms/key-spec-selector';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import type { KeySpec } from '@/wasm/wasm_pkg';

const DEFAULT_VALUE: KeySpec = { available_buttons: [] };

function renderKeySpecSelector(props: Partial<Parameters<typeof KeySpecSelector>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  return {
    onChange,
    ...render(
      <I18nTestWrapper>
        <KeySpecSelector value={DEFAULT_VALUE} onChange={onChange} {...props} />
      </I18nTestWrapper>
    ),
  };
}

describe('KeySpecSelector', () => {
  beforeEach(() => {
    setupTestI18n('ja');
  });

  it('インジケータ行に選択中ボタンのテキストが表示される', () => {
    renderKeySpecSelector({ value: { available_buttons: ['A', 'Start'] } });
    expect(screen.getByText('A + Start')).toBeInTheDocument();
  });

  it('ボタン未選択時はインジケータに "なし" が表示される', () => {
    renderKeySpecSelector();
    expect(screen.getByText('なし')).toBeInTheDocument();
  });

  it('ダイアログを開くと 12 個のチェックボックスが表示される', async () => {
    const user = userEvent.setup();
    renderKeySpecSelector();

    const openButtons = screen.getAllByRole('button', { name: /Key input/i });
    await user.click(openButtons[0]);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(12);
  });

  it('ボタンを選択すると onChange が発火する', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderKeySpecSelector({ onChange });

    const openButtons = screen.getAllByRole('button', { name: /Key input/i });
    await user.click(openButtons[0]);

    const aCheckbox = screen.getByRole('checkbox', { name: /Button A/i });
    await user.click(aCheckbox);

    expect(onChange).toHaveBeenCalledWith({
      available_buttons: ['A'],
    });
  });

  it('選択済みボタンを解除すると onChange が発火する', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderKeySpecSelector({
      value: { available_buttons: ['A', 'B'] },
      onChange,
    });

    const openButtons = screen.getAllByRole('button', { name: /Key input/i });
    await user.click(openButtons[0]);

    const aCheckbox = screen.getByRole('checkbox', { name: /Button A/i });
    await user.click(aCheckbox);

    expect(onChange).toHaveBeenCalledWith({
      available_buttons: ['B'],
    });
  });

  it('disabled 時は編集ボタンが無効化される', () => {
    renderKeySpecSelector({ disabled: true });
    const openButtons = screen.getAllByRole('button', { name: /Key input/i });
    expect(openButtons[0]).toBeDisabled();
  });

  it('combinationCount が表示される', () => {
    renderKeySpecSelector({ combinationCount: 256 });
    expect(screen.getByText(/256/)).toBeInTheDocument();
  });
});
