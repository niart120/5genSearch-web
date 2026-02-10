import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Switch } from '@/components/ui/switch';

describe('Switch', () => {
  it('switch ロールで描画される', () => {
    render(<Switch aria-label="Toggle" />);
    expect(screen.getByRole('switch', { name: 'Toggle' })).toBeInTheDocument();
  });

  it('クリックで状態が切り替わる', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch aria-label="Toggle" onCheckedChange={handleChange} />);

    await user.click(screen.getByRole('switch'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('disabled 時はクリックしても状態が変わらない', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch aria-label="Toggle" disabled onCheckedChange={handleChange} />);

    await user.click(screen.getByRole('switch'));
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('checked=true で checked 状態になる', () => {
    render(<Switch aria-label="Toggle" checked />);
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('カスタム className が適用される', () => {
    render(<Switch aria-label="Toggle" className="custom-class" />);
    expect(screen.getByRole('switch').className).toContain('custom-class');
  });
});
