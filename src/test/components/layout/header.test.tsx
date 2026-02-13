import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { Header } from '@/components/layout/header';
import { useUiStore, getUiInitialState } from '@/stores/settings/ui';

describe('Header', () => {
  beforeEach(() => {
    setupTestI18n('en');
    localStorage.clear();
    useUiStore.setState(getUiInitialState());
  });

  it('タイトル "5genSearch" が表示される', () => {
    render(
      <I18nTestWrapper>
        <Header />
      </I18nTestWrapper>
    );
    expect(screen.getByRole('heading', { name: '5genSearch' })).toBeInTheDocument();
  });

  it('onMenuClick が渡された場合、ハンバーガーボタンが表示される', () => {
    const handleMenuClick = vi.fn();
    render(
      <I18nTestWrapper>
        <Header onMenuClick={handleMenuClick} />
      </I18nTestWrapper>
    );
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
  });

  it('onMenuClick が未指定の場合、ハンバーガーボタンは表示されない', () => {
    render(
      <I18nTestWrapper>
        <Header />
      </I18nTestWrapper>
    );
    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument();
  });

  it('ハンバーガーボタンクリックで onMenuClick が呼ばれる', async () => {
    const user = userEvent.setup();
    const handleMenuClick = vi.fn();
    render(
      <I18nTestWrapper>
        <Header onMenuClick={handleMenuClick} />
      </I18nTestWrapper>
    );

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(handleMenuClick).toHaveBeenCalledOnce();
  });

  it('LanguageToggle と ThemeToggle が表示される', () => {
    render(
      <I18nTestWrapper>
        <Header />
      </I18nTestWrapper>
    );
    // ThemeToggle has aria-label "Toggle theme"
    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument();
    // LanguageToggle has aria-label containing "Switch language"
    expect(screen.getByRole('button', { name: /Switch language/i })).toBeInTheDocument();
  });

  describe('カテゴリナビゲーション (PC 版)', () => {
    it('3 カテゴリが描画される', () => {
      render(
        <I18nTestWrapper>
          <Header />
        </I18nTestWrapper>
      );
      const nav = screen.getByRole('navigation', { name: 'Category navigation' });
      const buttons = nav.querySelectorAll('button');
      expect(buttons).toHaveLength(4);
    });

    it('Search, Generation, Tools ラベルが表示される', () => {
      render(
        <I18nTestWrapper>
          <Header />
        </I18nTestWrapper>
      );
      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Generation' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tools' })).toBeInTheDocument();
    });

    it('アクティブカテゴリに aria-current が設定される', () => {
      render(
        <I18nTestWrapper>
          <Header />
        </I18nTestWrapper>
      );
      const searchButton = screen.getByRole('button', { name: 'Search' });
      expect(searchButton).toHaveAttribute('aria-current', 'true');

      const generationButton = screen.getByRole('button', { name: 'Generation' });
      expect(generationButton).not.toHaveAttribute('aria-current');
    });

    it('クリックでカテゴリが切り替わる', async () => {
      const user = userEvent.setup();
      render(
        <I18nTestWrapper>
          <Header />
        </I18nTestWrapper>
      );

      await user.click(screen.getByRole('button', { name: 'Generation' }));
      expect(useUiStore.getState().activeCategory).toBe('generation');
    });
  });
});
