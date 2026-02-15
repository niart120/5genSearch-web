/**
 * SearchConfirmationDialog コンポーネントテスト
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchConfirmationDialog } from '@/components/forms/search-confirmation-dialog';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';

function renderDialog(props: Partial<Parameters<typeof SearchConfirmationDialog>[0]> = {}) {
  const onOpenChange = props.onOpenChange ?? vi.fn();
  const onConfirm = props.onConfirm ?? vi.fn();
  return {
    onOpenChange,
    onConfirm,
    ...render(
      <I18nTestWrapper>
        <SearchConfirmationDialog
          open={props.open ?? true}
          onOpenChange={onOpenChange}
          estimatedCount={props.estimatedCount ?? 100_000}
          onConfirm={onConfirm}
        />
      </I18nTestWrapper>
    ),
  };
}

describe('SearchConfirmationDialog', () => {
  beforeEach(() => {
    setupTestI18n('en');
  });

  it('推定件数がカンマ区切りで表示される', () => {
    renderDialog({ estimatedCount: 100_000 });
    expect(screen.getByText(/100,000/)).toBeDefined();
  });

  it('続行ボタンクリック時に onConfirm が呼ばれる', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });

    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('キャンセルボタンクリック時に onOpenChange(false) が呼ばれる', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
