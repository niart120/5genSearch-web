/**
 * KeyInputSelector コンポーネントテスト
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyInputSelector } from '@/components/forms/key-input-selector';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import type { KeyInput } from '@/wasm/wasm_pkg';

const DEFAULT_VALUE: KeyInput = { buttons: [] };

function renderKeyInputSelector(props: Partial<Parameters<typeof KeyInputSelector>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  return {
    onChange,
    ...render(
      <I18nTestWrapper>
        <KeyInputSelector value={DEFAULT_VALUE} onChange={onChange} {...props} />
      </I18nTestWrapper>
    ),
  };
}

describe('KeyInputSelector', () => {
  beforeEach(() => {
    setupTestI18n('ja');
  });

  it('インジケータ行に選択中ボタンのテキストが表示される', () => {
    renderKeyInputSelector({ value: { buttons: ['A', 'Start'] } });
    expect(screen.getByText('A + Start')).toBeInTheDocument();
  });

  it('ボタン未選択時はインジケータに "None" が表示される', () => {
    renderKeyInputSelector();
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('ダイアログを開くと 12 個のチェックボックスが表示される', async () => {
    const user = userEvent.setup();
    renderKeyInputSelector();

    const openButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(openButton);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(12);
  });

  it('ダイアログ内のボタンをトグルすると onChange が呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderKeyInputSelector({ onChange });

    const openButton2 = screen.getByRole('button', { name: /Edit/i });
    await user.click(openButton2);

    const aCheckbox = screen.getByRole('checkbox', { name: /Button A/i });
    await user.click(aCheckbox);

    expect(onChange).toHaveBeenCalledWith({ buttons: ['A'] });
  });

  it('選択済みボタンを解除すると onChange が発火する', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderKeyInputSelector({
      value: { buttons: ['A', 'B'] },
      onChange,
    });

    const openButton3 = screen.getByRole('button', { name: /Edit/i });
    await user.click(openButton3);

    const aCheckbox = screen.getByRole('checkbox', { name: /Button A/i });
    await user.click(aCheckbox);

    expect(onChange).toHaveBeenCalledWith({ buttons: ['B'] });
  });

  it('disabled 時は編集ボタンが無効化される', () => {
    renderKeyInputSelector({ disabled: true });
    const openButton4 = screen.getByRole('button', { name: /Edit/i });
    expect(openButton4).toBeDisabled();
  });

  it('ダイアログを閉じるとチェックボックスが非表示になる', async () => {
    const user = userEvent.setup();
    renderKeyInputSelector();

    // ダイアログを開く
    const openButton5 = screen.getByRole('button', { name: /Edit/i });
    await user.click(openButton5);
    expect(screen.getAllByRole('checkbox')).toHaveLength(12);

    // 閉じるボタンをクリック
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });
  });
});
