import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IvRangeInput } from '@/components/forms/iv-range-input';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { useUiStore } from '@/stores/settings/ui';

const DEFAULT_VALUE = {
  hp: [0, 31] as [number, number],
  atk: [0, 31] as [number, number],
  def: [0, 31] as [number, number],
  spa: [0, 31] as [number, number],
  spd: [0, 31] as [number, number],
  spe: [0, 31] as [number, number],
};

function renderIvRange(props: Partial<Parameters<typeof IvRangeInput>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  return {
    onChange,
    ...render(
      <I18nTestWrapper>
        <IvRangeInput value={DEFAULT_VALUE} onChange={onChange} {...props} />
      </I18nTestWrapper>
    ),
  };
}

describe('IvRangeInput', () => {
  beforeEach(() => {
    act(() => {
      setupTestI18n('ja');
      useUiStore.setState({ language: 'ja' });
    });
  });

  it('初期値が表示される', () => {
    renderIvRange();
    const minInputs = screen.getAllByRole('textbox', { name: /min/ });
    const maxInputs = screen.getAllByRole('textbox', { name: /max/ });
    expect(minInputs).toHaveLength(6);
    expect(maxInputs).toHaveLength(6);
    expect(minInputs[0]).toHaveValue('0');
    expect(maxInputs[0]).toHaveValue('31');
  });

  it('ステータスラベル (ja) が表示される', () => {
    renderIvRange();
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('ステータスラベル (en) が表示される', () => {
    act(() => {
      setupTestI18n('en');
      useUiStore.setState({ language: 'en' });
    });

    renderIvRange();
    expect(screen.getByText('HP')).toBeInTheDocument();
    expect(screen.getByText('Atk')).toBeInTheDocument();
    expect(screen.getByText('Def')).toBeInTheDocument();
    expect(screen.getByText('SpA')).toBeInTheDocument();
    expect(screen.getByText('SpD')).toBeInTheDocument();
    expect(screen.getByText('Spe')).toBeInTheDocument();

    act(() => {
      useUiStore.setState({ language: 'ja' });
    });
  });

  it('値変更で onChange が呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderIvRange({ onChange });

    const hpMin = screen.getByRole('textbox', { name: 'H min' });
    await user.clear(hpMin);
    await user.type(hpMin, '5');
    await user.tab();

    expect(onChange).toHaveBeenCalled();
    const lastArgs = onChange.mock.calls.at(-1);
    expect(lastArgs).toBeDefined();
    if (!lastArgs) return;
    const lastCall = lastArgs[0];
    expect(lastCall.hp[0]).toBe(5);
  });

  it('空欄はデフォルト値に復元される', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderIvRange({ onChange });

    const hpMin = screen.getByRole('textbox', { name: 'H min' });
    await user.clear(hpMin);
    await user.tab();

    expect(onChange).toHaveBeenCalled();
    const lastArgs = onChange.mock.calls.at(-1);
    expect(lastArgs).toBeDefined();
    if (!lastArgs) return;
    const lastCall = lastArgs[0];
    expect(lastCall.hp[0]).toBe(0);
  });

  it('範囲外の値はクランプされる (32 → 31)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderIvRange({ onChange });

    const hpMax = screen.getByRole('textbox', { name: 'H max' });
    await user.clear(hpMax);
    await user.type(hpMax, '32');
    await user.tab();

    expect(onChange).toHaveBeenCalled();
    const lastArgs = onChange.mock.calls.at(-1);
    expect(lastArgs).toBeDefined();
    if (!lastArgs) return;
    const lastCall = lastArgs[0];
    expect(lastCall.hp[1]).toBe(31);
  });

  it('負の値はクランプされる (-1 → 0)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderIvRange({ onChange });

    const hpMin = screen.getByRole('textbox', { name: 'H min' });
    await user.clear(hpMin);
    await user.type(hpMin, '-1');
    await user.tab();

    expect(onChange).toHaveBeenCalled();
    const lastArgs = onChange.mock.calls.at(-1);
    expect(lastArgs).toBeDefined();
    if (!lastArgs) return;
    const lastCall = lastArgs[0];
    expect(lastCall.hp[0]).toBe(0);
  });

  it('disabled で全フィールドが無効化される', () => {
    renderIvRange({ disabled: true });
    const allInputs = screen.getAllByRole('textbox');
    for (const input of allInputs) expect(input).toBeDisabled();
  });

  it('allowUnknown 未指定時に不明チェックボックスが表示されない', () => {
    renderIvRange();
    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes).toHaveLength(0);
  });

  it('allowUnknown={true} で不明チェックボックスが表示される', () => {
    renderIvRange({ allowUnknown: true });
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(6);
  });

  it('不明 ON で onChange に [0, 32] が渡る', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderIvRange({ allowUnknown: true, onChange });

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]); // HP の不明チェック

    expect(onChange).toHaveBeenCalled();
    const lastArgs = onChange.mock.calls.at(-1);
    expect(lastArgs).toBeDefined();
    if (!lastArgs) return;
    const lastCall = lastArgs[0];
    expect(lastCall.hp).toEqual([0, 32]);
  });

  it('不明 ON で min/max フィールドが disabled になる', () => {
    const unknownValue = {
      ...DEFAULT_VALUE,
      hp: [0, 32] as [number, number],
    };
    renderIvRange({ allowUnknown: true, value: unknownValue });

    const hpMin = screen.getByRole('textbox', { name: 'H min' });
    const hpMax = screen.getByRole('textbox', { name: 'H max' });
    expect(hpMin).toBeDisabled();
    expect(hpMax).toBeDisabled();
  });

  it('不明 OFF で range が [0, 31] に戻る', async () => {
    const user = userEvent.setup();
    const unknownValue = {
      ...DEFAULT_VALUE,
      hp: [0, 32] as [number, number],
    };
    const onChange = vi.fn();
    renderIvRange({ allowUnknown: true, value: unknownValue, onChange });

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]); // HP の不明チェック OFF

    expect(onChange).toHaveBeenCalled();
    const lastArgs = onChange.mock.calls.at(-1);
    expect(lastArgs).toBeDefined();
    if (!lastArgs) return;
    const lastCall = lastArgs[0];
    expect(lastCall.hp).toEqual([0, 31]);
  });
});
