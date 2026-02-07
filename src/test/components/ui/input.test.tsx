import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('デフォルトで描画される', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
  });

  it('placeholder が表示される', () => {
    render(<Input placeholder="Search..." />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('disabled 時は操作できない', () => {
    render(<Input disabled placeholder="disabled" />);
    const input = screen.getByPlaceholderText('disabled');
    expect(input).toBeDisabled();
  });

  it('type 属性が透過される', () => {
    render(<Input type="number" placeholder="num" />);
    const input = screen.getByPlaceholderText('num');
    expect(input).toHaveAttribute('type', 'number');
  });

  it('onChange イベントが発火する', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} placeholder="input" />);
    await user.type(screen.getByPlaceholderText('input'), 'abc');
    expect(handleChange).toHaveBeenCalledTimes(3);
  });
});
