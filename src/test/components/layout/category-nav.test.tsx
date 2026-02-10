import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { CategoryNav } from '@/components/layout/category-nav';
import { useUiStore, getUiInitialState } from '@/stores/settings/ui';

describe('CategoryNav', () => {
  beforeEach(() => {
    setupTestI18n('en');
    localStorage.clear();
    useUiStore.setState(getUiInitialState());
  });

  it('3 カテゴリが描画される', () => {
    render(
      <I18nTestWrapper>
        <CategoryNav />
      </I18nTestWrapper>
    );
    const nav = screen.getByRole('navigation', { name: 'Category navigation' });
    const buttons = nav.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
  });

  it('Search, Generation, Tools ラベルが表示される', () => {
    render(
      <I18nTestWrapper>
        <CategoryNav />
      </I18nTestWrapper>
    );
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tools' })).toBeInTheDocument();
  });

  it('アクティブカテゴリに aria-current が設定される', () => {
    render(
      <I18nTestWrapper>
        <CategoryNav />
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
        <CategoryNav />
      </I18nTestWrapper>
    );

    await user.click(screen.getByRole('button', { name: 'Generation' }));
    expect(useUiStore.getState().activeCategory).toBe('generation');
  });
});
