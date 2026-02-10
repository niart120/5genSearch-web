/**
 * TargetSeedsInput コンポーネントテスト
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TargetSeedsInput } from '@/components/forms/target-seeds-input';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';

function renderTargetSeedsInput(props: Partial<Parameters<typeof TargetSeedsInput>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  const defaults = {
    value: '',
    onChange,
    parsedSeeds: [],
    errors: [],
    ...props,
  };
  return {
    onChange,
    ...render(
      <I18nTestWrapper>
        <TargetSeedsInput {...defaults} />
      </I18nTestWrapper>
    ),
  };
}

describe('TargetSeedsInput', () => {
  beforeEach(() => {
    setupTestI18n('ja');
  });

  it('テキストエリアが表示される', () => {
    renderTargetSeedsInput();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('入力値が反映される', () => {
    renderTargetSeedsInput({ value: '1A2B3C4D' });
    expect(screen.getByRole('textbox')).toHaveValue('1A2B3C4D');
  });

  it('入力変更で onChange が発火する', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderTargetSeedsInput({ onChange });

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'AB');

    expect(onChange).toHaveBeenCalled();
  });

  it('パース済み件数が表示される', () => {
    renderTargetSeedsInput({ parsedSeeds: [0x12_34_56_78, 0xab_cd_ef_01] });
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('エラーが表示される', () => {
    renderTargetSeedsInput({
      errors: [{ line: 1, value: 'xyz', message: 'invalid hex' }],
    });
    expect(screen.getByText(/xyz/)).toBeInTheDocument();
  });

  it('disabled 時はテキストエリアが操作不可', () => {
    renderTargetSeedsInput({ disabled: true });
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
