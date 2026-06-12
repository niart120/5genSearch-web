import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dismissToast, getSnapshot } from '@/components/ui/toast-state';
import { AboutPage } from '@/features/about/components/about-page';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';

const resetAppStorageAndReloadMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/app-storage-reset', () => ({
  resetAppStorageAndReload: resetAppStorageAndReloadMock,
}));

function renderPage() {
  return render(
    <I18nTestWrapper>
      <AboutPage />
    </I18nTestWrapper>
  );
}

describe('AboutPage storage reset section', () => {
  beforeEach(() => {
    setupTestI18n('en');
    dismissToast();
    resetAppStorageAndReloadMock.mockReset();
    resetAppStorageAndReloadMock.mockReturnValue({
      ok: true,
      removedKeys: [],
      activeProfileCleared: false,
    });
  });

  it('保存データ初期化セクションと 2 つの初期化ボタンを表示する', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /reset saved data/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset settings and inputs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset all saved data/i })).toBeInTheDocument();
  });

  it('通常初期化の確認ダイアログを表示する', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /reset settings and inputs/i }));

    const dialog = screen.getByRole('alertdialog');
    expect(
      within(dialog).getByText(/active profile selection will be cleared/i)
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /reset settings and inputs/i })).toHaveClass(
      'bg-destructive'
    );
  });

  it('完全初期化の確認ダイアログを表示する', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /reset all saved data/i }));

    const dialog = screen.getByRole('alertdialog');
    expect(
      within(dialog).getByText(/profiles and all saved data will be deleted/i)
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /reset all/i })).toHaveClass(
      'bg-destructive'
    );
  });

  it('ページ上のトリガーボタンは控えめな outline 表現にする', () => {
    renderPage();

    const normalButton = screen.getByRole('button', { name: /reset settings and inputs/i });
    const hardButton = screen.getByRole('button', { name: /reset all saved data/i });

    expect(normalButton).toHaveClass('border');
    expect(normalButton).not.toHaveClass('bg-destructive');
    expect(hardButton).toHaveClass('border');
    expect(hardButton).toHaveClass('text-destructive');
    expect(hardButton).not.toHaveClass('bg-destructive');
  });

  it('確認すると mode 付きで初期化処理を呼ぶ', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /reset settings and inputs/i }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: /reset settings and inputs/i,
      })
    );

    expect(resetAppStorageAndReloadMock).toHaveBeenCalledWith('settings');
  });

  it('初期化失敗時は error toast の状態を更新する', async () => {
    const user = userEvent.setup();
    resetAppStorageAndReloadMock.mockReturnValue({
      ok: false,
      reason: 'storage-unavailable',
    });
    renderPage();

    await user.click(screen.getByRole('button', { name: /reset all saved data/i }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: /reset all/i })
    );

    expect(getSnapshot()).toMatchObject({
      title: 'Could not reset saved data',
      description: 'Could not access browser storage. Check browser settings.',
      variant: 'error',
    });
  });
});
