/**
 * KeySpecSelector コンポーネントテスト
 */

import { render, screen, waitFor } from '@testing-library/react';
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

  it('ボタン未選択時はインジケータに "None" が表示される', () => {
    renderKeySpecSelector();
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('ボタンクリックでダイアログが開く', async () => {
    const user = userEvent.setup();
    renderKeySpecSelector();

    // ダイアログを開くボタンをクリック
    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    // ダイアログ内にチェックボックスが表示される
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(12);
  });

  it('ダイアログ内のボタンをトグルしてOKを押すと onChange が呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderKeySpecSelector({ onChange });

    // ダイアログを開く
    const editButton = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton);

    // ダイアログ内の A ボタンをトグル
    const aCheckbox = screen.getByRole('checkbox', { name: /Button A/i });
    await user.click(aCheckbox);

    // この時点では onChange は呼ばれない
    expect(onChange).not.toHaveBeenCalled();

    // OK ボタンをクリック
    const okButton = screen.getByRole('button', { name: 'OK' });
    await user.click(okButton);

    expect(onChange).toHaveBeenCalledWith({
      available_buttons: ['A'],
    });
  });

  it('選択済みボタンを解除してOKを押すと onChange が発火する', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderKeySpecSelector({
      value: { available_buttons: ['A', 'B'] },
      onChange,
    });

    // ダイアログを開く
    const editButton2 = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton2);

    const aCheckbox = screen.getByRole('checkbox', { name: /Button A/i });
    await user.click(aCheckbox);

    // OK ボタンをクリック
    const okButton = screen.getByRole('button', { name: 'OK' });
    await user.click(okButton);

    expect(onChange).toHaveBeenCalledWith({
      available_buttons: ['B'],
    });
  });

  it('disabled 時は編集ボタンが無効化される', () => {
    renderKeySpecSelector({ disabled: true });
    const editButton = screen.getByRole('button', { name: /Edit/i });
    expect(editButton).toBeDisabled();
  });

  it('ダイアログを閉じるとチェックボックスが非表示になる', async () => {
    const user = userEvent.setup();
    renderKeySpecSelector();

    // ダイアログを開く
    const editButton3 = screen.getByRole('button', { name: /Edit/i });
    await user.click(editButton3);
    expect(screen.getAllByRole('checkbox')).toHaveLength(12);

    // 閉じるボタンをクリック
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });
  });
});
