import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Radix UI Select が jsdom に存在しない Pointer Capture API を使用するためポリフィル
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  // Radix UI Select は scrollIntoView を使用する
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

describe('Select', () => {
  it('トリガーが描画される', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="選択してください" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('クリックでドロップダウンが開く', async () => {
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="選択" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="bw">BW</SelectItem>
          <SelectItem value="bw2">BW2</SelectItem>
        </SelectContent>
      </Select>
    );
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'BW' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'BW2' })).toBeInTheDocument();
  });

  it('アイテム選択で onValueChange が発火する', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <Select onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="選択" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="bw">BW</SelectItem>
          <SelectItem value="bw2">BW2</SelectItem>
        </SelectContent>
      </Select>
    );
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'BW' }));
    expect(handleChange).toHaveBeenCalledWith('bw');
  });
});
