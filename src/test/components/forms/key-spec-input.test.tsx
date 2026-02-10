/**
 * KeySpecInput コンポーネントテスト
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeySpecInput } from '@/components/forms/key-spec-input';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import type { KeySpec } from '@/wasm/wasm_pkg';

const DEFAULT_VALUE: KeySpec = { available_buttons: [] };

function renderKeySpecInput(props: Partial<Parameters<typeof KeySpecInput>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  return {
    onChange,
    ...render(
      <I18nTestWrapper>
        <KeySpecInput value={DEFAULT_VALUE} onChange={onChange} {...props} />
      </I18nTestWrapper>
    ),
  };
}

describe('KeySpecInput', () => {
  beforeEach(() => {
    setupTestI18n('ja');
  });

  it('12 個のチェックボックスが表示される', () => {
    renderKeySpecInput();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(12);
  });

  it('初期状態で全てのチェックボックスが未選択', () => {
    renderKeySpecInput();
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked();
    }
  });

  it('ボタンを選択すると onChange が発火する', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderKeySpecInput({ onChange });

    const aCheckbox = screen.getByRole('checkbox', { name: /Button A/i });
    await user.click(aCheckbox);

    expect(onChange).toHaveBeenCalledWith({
      available_buttons: ['A'],
    });
  });

  it('選択済みボタンを解除すると onChange が発火する', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderKeySpecInput({
      value: { available_buttons: ['A', 'B'] },
      onChange,
    });

    const aCheckbox = screen.getByRole('checkbox', { name: /Button A/i });
    await user.click(aCheckbox);

    expect(onChange).toHaveBeenCalledWith({
      available_buttons: ['B'],
    });
  });

  it('disabled 時はチェックボックスが操作不可', () => {
    renderKeySpecInput({ disabled: true });
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toBeDisabled();
    }
  });

  it('combinationCount が表示される', () => {
    renderKeySpecInput({ combinationCount: 256 });
    expect(screen.getByText(/256/)).toBeInTheDocument();
  });
});
