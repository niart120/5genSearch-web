import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Checkbox } from '@/components/ui/checkbox';

describe('Checkbox', () => {
  it('デフォルトで描画される', () => {
    render(<Checkbox aria-label="agree" />);
    expect(screen.getByRole('checkbox', { name: 'agree' })).toBeInTheDocument();
  });

  it('クリックで checked 状態が切り替わる', async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="toggle" />);
    const checkbox = screen.getByRole('checkbox', { name: 'toggle' });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('onCheckedChange が発火する', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Checkbox aria-label="check" onCheckedChange={handleChange} />);
    await user.click(screen.getByRole('checkbox', { name: 'check' }));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('disabled 時は操作できない', () => {
    render(<Checkbox aria-label="disabled" disabled />);
    expect(screen.getByRole('checkbox', { name: 'disabled' })).toBeDisabled();
  });
});
