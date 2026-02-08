import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timer0VCountRangeInput } from '@/components/forms/timer0-vcount-range-input';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import type { Timer0VCountRange } from '@/wasm/wasm_pkg';

const DEFAULT_VALUE: Timer0VCountRange = {
  timer0_min: 0x0c79,
  timer0_max: 0x0c7a,
  vcount_min: 0x5e,
  vcount_max: 0x5e,
};

function renderComponent(props: Partial<Parameters<typeof Timer0VCountRangeInput>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  return {
    onChange,
    ...render(
      <I18nTestWrapper>
        <Timer0VCountRangeInput value={DEFAULT_VALUE} onChange={onChange} {...props} />
      </I18nTestWrapper>
    ),
  };
}

beforeEach(() => {
  setupTestI18n('ja');
});

describe('Timer0VCountRangeInput', () => {
  it('初期値が hex で表示される', () => {
    renderComponent();

    const timer0Min = screen.getByLabelText('Timer0 min');
    const timer0Max = screen.getByLabelText('Timer0 max');
    const vcountMin = screen.getByLabelText('VCount min');
    const vcountMax = screen.getByLabelText('VCount max');

    expect(timer0Min).toHaveValue('0C79');
    expect(timer0Max).toHaveValue('0C7A');
    expect(vcountMin).toHaveValue('5E');
    expect(vcountMax).toHaveValue('5E');
  });

  it('Timer0 min 入力 → blur で onChange が正しく呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderComponent({ onChange });

    const timer0Min = screen.getByLabelText('Timer0 min');
    await user.clear(timer0Min);
    await user.type(timer0Min, '0C80');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_VALUE,
      timer0_min: 0x0c80,
    });
  });

  it('Timer0 max 入力 → blur で onChange が正しく呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderComponent({ onChange });

    const timer0Max = screen.getByLabelText('Timer0 max');
    await user.clear(timer0Max);
    await user.type(timer0Max, 'FFFF');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_VALUE,
      timer0_max: 0xffff,
    });
  });

  it('VCount min 入力 → blur で onChange が正しく呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderComponent({ onChange });

    const vcountMin = screen.getByLabelText('VCount min');
    await user.clear(vcountMin);
    await user.type(vcountMin, '60');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_VALUE,
      vcount_min: 0x60,
    });
  });

  it('VCount max 入力 → blur で onChange が正しく呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderComponent({ onChange });

    const vcountMax = screen.getByLabelText('VCount max');
    await user.clear(vcountMax);
    await user.type(vcountMax, 'A0');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_VALUE,
      vcount_max: 0xa0,
    });
  });

  it('hex 以外の文字がフィルタされる', async () => {
    const user = userEvent.setup();
    renderComponent();

    const timer0Min = screen.getByLabelText('Timer0 min');
    await user.clear(timer0Min);
    await user.type(timer0Min, 'GZ1X');

    // G, Z, X はフィルタされ、有効な hex 文字 '1' のみ残る
    expect(timer0Min).toHaveValue('1');
  });

  it('Timer0 フィールドは 4 文字でトリムされる', async () => {
    const user = userEvent.setup();
    renderComponent();

    const timer0Min = screen.getByLabelText('Timer0 min');
    await user.clear(timer0Min);
    await user.type(timer0Min, 'ABCDE');

    expect(timer0Min).toHaveValue('ABCD');
  });

  it('VCount フィールドは 2 文字でトリムされる', async () => {
    const user = userEvent.setup();
    renderComponent();

    const vcountMin = screen.getByLabelText('VCount min');
    await user.clear(vcountMin);
    await user.type(vcountMin, 'ABC');

    expect(vcountMin).toHaveValue('AB');
  });

  it('空欄で blur すると変更前の値にフォールバックする', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderComponent({ onChange });

    const timer0Min = screen.getByLabelText('Timer0 min');
    await user.clear(timer0Min);
    await user.tab();

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_VALUE,
      timer0_min: DEFAULT_VALUE.timer0_min,
    });
    expect(timer0Min).toHaveValue('0C79');
  });

  it('value prop の外部変更で表示が同期する', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <I18nTestWrapper>
        <Timer0VCountRangeInput value={DEFAULT_VALUE} onChange={onChange} />
      </I18nTestWrapper>
    );

    const newValue: Timer0VCountRange = {
      timer0_min: 0x1000,
      timer0_max: 0x2000,
      vcount_min: 0x10,
      vcount_max: 0x20,
    };

    rerender(
      <I18nTestWrapper>
        <Timer0VCountRangeInput value={newValue} onChange={onChange} />
      </I18nTestWrapper>
    );

    expect(screen.getByLabelText('Timer0 min')).toHaveValue('1000');
    expect(screen.getByLabelText('Timer0 max')).toHaveValue('2000');
    expect(screen.getByLabelText('VCount min')).toHaveValue('10');
    expect(screen.getByLabelText('VCount max')).toHaveValue('20');
  });

  it('disabled prop で全入力が無効化される', () => {
    renderComponent({ disabled: true });

    expect(screen.getByLabelText('Timer0 min')).toBeDisabled();
    expect(screen.getByLabelText('Timer0 max')).toBeDisabled();
    expect(screen.getByLabelText('VCount min')).toBeDisabled();
    expect(screen.getByLabelText('VCount max')).toBeDisabled();
  });

  it('フォーカス時にテキスト全選択される', async () => {
    const user = userEvent.setup();
    renderComponent();

    const timer0Min = screen.getByLabelText('Timer0 min');
    await user.click(timer0Min);

    // フォーカス時に select() が呼ばれ、全テキストが選択状態になる
    expect(timer0Min).toHaveFocus();
    // window.getSelection で選択範囲を検証
    const input = timer0Min as HTMLInputElement;
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });
});
