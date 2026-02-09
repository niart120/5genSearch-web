import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Toaster } from '@/components/ui/toast';
import { toast, dismissToast } from '@/components/ui/toast-state';

/**
 * Radix UI Toast uses requestAnimationFrame and internal timers.
 * We use fake timers to control auto-dismiss behavior.
 */

function renderToaster() {
  return render(<Toaster />);
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // jsdom does not implement matchMedia
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(min-width: 1024px)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onchange: undefined,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );

    // jsdom does not implement pointer capture (used by Radix toast swipe)
    if (!HTMLElement.prototype.hasPointerCapture) {
      HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
      HTMLElement.prototype.setPointerCapture = vi.fn();
      HTMLElement.prototype.releasePointerCapture = vi.fn();
    }

    // Reset internal state
    dismissToast();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('toast() で Toast が表示される', async () => {
    renderToaster();

    act(() => {
      toast({ title: 'Test notification' });
    });

    expect(screen.getByText('Test notification')).toBeInTheDocument();
  });

  it('variant ごとのスタイル適用 (success)', () => {
    renderToaster();

    act(() => {
      toast({ title: 'Success', variant: 'success' });
    });

    const toastElement = screen.getByText('Success').closest('[data-state]');
    expect(toastElement).toHaveClass('border-success');
  });

  it('variant ごとのスタイル適用 (error)', () => {
    renderToaster();

    act(() => {
      toast({ title: 'Error', variant: 'error' });
    });

    const toastElement = screen.getByText('Error').closest('[data-state]');
    expect(toastElement).toHaveClass('border-destructive');
  });

  it('variant ごとのスタイル適用 (warning)', () => {
    renderToaster();

    act(() => {
      toast({ title: 'Warning', variant: 'warning' });
    });

    const toastElement = screen.getByText('Warning').closest('[data-state]');
    expect(toastElement).toHaveClass('border-warning');
  });

  it('variant ごとのスタイル適用 (info)', () => {
    renderToaster();

    act(() => {
      toast({ title: 'Info' });
    });

    const toastElement = screen.getByText('Info').closest('[data-state]');
    expect(toastElement).toHaveClass('border-ring');
  });

  it('自動消滅 (info は 3 秒後に消える)', async () => {
    renderToaster();

    act(() => {
      toast({ title: 'Will auto dismiss' });
    });

    expect(screen.getByText('Will auto dismiss')).toBeInTheDocument();

    // Advance past the 3s duration
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText('Will auto dismiss')).not.toBeInTheDocument();
  });

  it('手動閉じ (error は自動消滅しない)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderToaster();

    act(() => {
      toast.error('Error message');
    });

    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Advance far beyond 3s — should still be visible
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Close via close button
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByText('Error message')).not.toBeInTheDocument();
  });

  it('単一表示 — 新しい Toast が既存を置換する', () => {
    renderToaster();

    act(() => {
      toast({ title: 'First' });
    });

    expect(screen.getByText('First')).toBeInTheDocument();

    act(() => {
      toast({ title: 'Second' });
    });

    expect(screen.queryByText('First')).not.toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('ショートハンド toast.success()', () => {
    renderToaster();

    act(() => {
      toast.success('Saved');
    });

    const toastElement = screen.getByText('Saved').closest('[data-state]');
    expect(toastElement).toHaveClass('border-success');
  });

  it('ショートハンド toast.error()', () => {
    renderToaster();

    act(() => {
      toast.error('Failed');
    });

    const toastElement = screen.getByText('Failed').closest('[data-state]');
    expect(toastElement).toHaveClass('border-destructive');
  });

  it('ショートハンド toast.warning()', () => {
    renderToaster();

    act(() => {
      toast.warning('Caution');
    });

    const toastElement = screen.getByText('Caution').closest('[data-state]');
    expect(toastElement).toHaveClass('border-warning');
  });

  it('description が表示される', () => {
    renderToaster();

    act(() => {
      toast({
        title: 'Error occurred',
        description: 'Check logs for details',
        variant: 'error',
      });
    });

    expect(screen.getByText('Error occurred')).toBeInTheDocument();
    expect(screen.getByText('Check logs for details')).toBeInTheDocument();
  });

  it('description なしの場合は副テキストが表示されない', () => {
    renderToaster();

    act(() => {
      toast({ title: 'No description' });
    });

    expect(screen.getByText('No description')).toBeInTheDocument();
    expect(screen.queryByText('Check logs for details')).not.toBeInTheDocument();
  });
});
