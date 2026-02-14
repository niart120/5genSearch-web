/**
 * NeedleInput — コンポーネントテスト
 *
 * 方向ボタン押下、テキスト入力フィルタリング、Back/Clear 操作を検証する。
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll, type Mock } from 'vitest';
import { NeedleInput } from '@/features/needle/components/needle-input';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';

function renderNeedleInput(props: Partial<Parameters<typeof NeedleInput>[0]> = {}) {
  const onChange = (props.onChange ?? vi.fn()) as Mock<(value: string) => void>;
  return {
    onChange,
    ...render(
      <I18nTestWrapper>
        <NeedleInput value={props.value ?? ''} onChange={onChange} {...props} />
      </I18nTestWrapper>
    ),
  };
}

describe('NeedleInput', () => {
  beforeAll(() => {
    setupTestI18n('en');
  });
  /* ------------------------------------------------------------------ */
  /*  方向ボタン                                                          */
  /* ------------------------------------------------------------------ */

  it('方向ボタン押下で対応する数字が末尾に追加される', async () => {
    const user = userEvent.setup();
    const { onChange } = renderNeedleInput({ value: '2' });

    // ↑ ボタン (digit=0) を押す
    const upButton = screen.getByRole('button', { name: 'Direction ↑' });
    await user.click(upButton);

    expect(onChange).toHaveBeenCalledWith('20');
  });

  it('→ ボタンは digit=2 を追加する', async () => {
    const user = userEvent.setup();
    const { onChange } = renderNeedleInput({ value: '' });

    const rightButton = screen.getByRole('button', { name: 'Direction →' });
    await user.click(rightButton);

    expect(onChange).toHaveBeenCalledWith('2');
  });

  it('↙ ボタンは digit=5 を追加する', async () => {
    const user = userEvent.setup();
    const { onChange } = renderNeedleInput({ value: '01' });

    const swButton = screen.getByRole('button', { name: 'Direction ↙' });
    await user.click(swButton);

    expect(onChange).toHaveBeenCalledWith('015');
  });

  /* ------------------------------------------------------------------ */
  /*  テキスト入力                                                        */
  /* ------------------------------------------------------------------ */

  it('0-7 以外の文字は onChange 呼び出し時に除外される', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    // controlled component: value は外部から渡すため空文字固定
    render(
      <I18nTestWrapper>
        <NeedleInput value="" onChange={onChange} />
      </I18nTestWrapper>
    );

    const input = screen.getByPlaceholderText('24267');

    // "2" を入力 → フィルタ後 "2" で onChange 呼び出し
    await user.type(input, '2');
    expect(onChange).toHaveBeenLastCalledWith('2');

    // "9" を入力 → フィルタで除外 → onChange("") 呼び出し
    await user.type(input, '9');
    expect(onChange).toHaveBeenLastCalledWith('');

    // "a" を入力 → フィルタで除外 → onChange("") 呼び出し
    await user.type(input, 'a');
    expect(onChange).toHaveBeenLastCalledWith('');

    // "5" を入力 → フィルタ後 "5" で onChange 呼び出し
    await user.type(input, '5');
    expect(onChange).toHaveBeenLastCalledWith('5');
  });

  /* ------------------------------------------------------------------ */
  /*  Back / Clear ボタン                                                */
  /* ------------------------------------------------------------------ */

  it('Back ボタンは末尾 1 文字を削除する', async () => {
    const user = userEvent.setup();
    const { onChange } = renderNeedleInput({ value: '246' });

    const backButton = screen.getByRole('button', { name: /Back/i });
    await user.click(backButton);

    expect(onChange).toHaveBeenCalledWith('24');
  });

  it('Clear ボタンは空文字にリセットする', async () => {
    const user = userEvent.setup();
    const { onChange } = renderNeedleInput({ value: '246' });

    const clearButton = screen.getByRole('button', { name: /Clear/i });
    await user.click(clearButton);

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('値が空のとき Back / Clear ボタンは disabled', () => {
    renderNeedleInput({ value: '' });

    const backButton = screen.getByRole('button', { name: /Back/i });
    const clearButton = screen.getByRole('button', { name: /Clear/i });

    expect(backButton).toBeDisabled();
    expect(clearButton).toBeDisabled();
  });

  /* ------------------------------------------------------------------ */
  /*  矢印表示 (read-only)                                               */
  /* ------------------------------------------------------------------ */

  it('有効な数字列に対応する矢印がリードオンリー欄に表示される', () => {
    renderNeedleInput({ value: '204' });

    // 2=→, 0=↑, 4=↓
    const arrowInput = screen.getByDisplayValue('→,↑,↓');
    expect(arrowInput).toHaveAttribute('readonly');
  });

  it('空文字のとき矢印表示は空', () => {
    renderNeedleInput({ value: '' });

    // read-only 欄は空
    const inputs = screen.getAllByRole('textbox');
    const arrowInput = inputs.find((el) => el.hasAttribute('readonly'));
    expect(arrowInput).toBeDefined();
    expect(arrowInput!).toHaveValue('');
  });

  /* ------------------------------------------------------------------ */
  /*  disabled                                                           */
  /* ------------------------------------------------------------------ */

  it('disabled 時は全方向ボタンが disabled', () => {
    renderNeedleInput({ value: '1', disabled: true });

    const buttons = screen.getAllByRole('button');
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
    }
  });
});
