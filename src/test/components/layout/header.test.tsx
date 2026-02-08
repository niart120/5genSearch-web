import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { Header } from '@/components/layout/header';

describe('Header', () => {
  beforeEach(() => {
    setupTestI18n('en');
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
});
