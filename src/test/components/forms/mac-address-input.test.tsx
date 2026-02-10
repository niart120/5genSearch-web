import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MacAddressInput } from '@/components/forms/mac-address-input';

type MacAddress = [number, number, number, number, number, number];

const DEFAULT_VALUE: MacAddress = [0, 0, 0, 0, 0, 0];

function renderMac(props: Partial<Parameters<typeof MacAddressInput>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  return {
    onChange,
    ...render(<MacAddressInput value={DEFAULT_VALUE} onChange={onChange} {...props} />),
  };
}

describe('MacAddressInput', () => {
  it('初期値が 16 進数 2 桁で表示される', () => {
    renderMac({ value: [0, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e] });
    const inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('00');
    expect(inputs[1]).toHaveValue('1A');
    expect(inputs[2]).toHaveValue('2B');
  });

  it('16 進数入力が正しく解釈される', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderMac({ onChange });

    const inputs = screen.getAllByRole('textbox');
    await user.clear(inputs[0]);
    await user.type(inputs[0], 'FF');
    // 2 文字入力で auto-tab → blur が発火し onChange が呼ばれる

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1)![0];
    expect(lastCall[0]).toBe(255);
  });

  it('無効な 16 進数はデフォルト値に復元される', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderMac({ onChange });

    const inputs = screen.getAllByRole('textbox');
    await user.clear(inputs[0]);
    await user.type(inputs[0], 'GG');
    await user.tab();

    // GG は parseHexByte で除外されるが、入力フィルタで G は排除されるため空欄 → デフォルト 00
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1)![0];
    expect(lastCall[0]).toBe(0);
  });

  it('ペースト: ハイフン区切り', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderMac({ onChange });

    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.paste('00-1A-2B-3C-4D-5E');

    expect(onChange).toHaveBeenCalledWith([0, 26, 43, 60, 77, 94]);
  });

  it('ペースト: コロン区切り', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderMac({ onChange });

    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.paste('00:1A:2B:3C:4D:5E');

    expect(onChange).toHaveBeenCalledWith([0, 26, 43, 60, 77, 94]);
  });

  it('ペースト: 連続 12 桁', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderMac({ onChange });

    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.paste('001A2B3C4D5E');

    expect(onChange).toHaveBeenCalledWith([0, 26, 43, 60, 77, 94]);
  });

  it('1 桁入力が 0 パディングされる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderMac({ onChange });

    const inputs = screen.getAllByRole('textbox');
    await user.clear(inputs[0]);
    await user.type(inputs[0], 'A');
    await user.tab();

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1)![0];
    expect(lastCall[0]).toBe(10); // 0x0A
  });

  // TODO: auto-tab によるフォーカス移動の検証
  // jsdom + userEvent 環境では、コンポーネント内の focus() 呼び出しが
  // userEvent のフォーカス管理に上書きされるため toHaveFocus() で検証できない。
  // 実ブラウザ環境 (Playwright 等) での E2E テストで検証する。
  it.todo('2 文字入力で次フィールドにフォーカスが移動する');
});
