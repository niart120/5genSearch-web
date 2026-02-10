import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { BottomNav } from '@/components/layout/bottom-nav';
import { useUiStore, getUiInitialState } from '@/stores/settings/ui';

describe('BottomNav', () => {
  beforeEach(() => {
    setupTestI18n('en');
    localStorage.clear();
    useUiStore.setState(getUiInitialState());
  });

  it('3 カテゴリが描画される', () => {
    render(
      <I18nTestWrapper>
        <BottomNav />
      </I18nTestWrapper>
    );
    const nav = screen.getByRole('navigation', { name: 'Category navigation' });
    const buttons = nav.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
  });

  it('各カテゴリのラベルが表示される', () => {
    render(
      <I18nTestWrapper>
        <BottomNav />
      </I18nTestWrapper>
    );
    expect(screen.getByRole('button', { name: /Search/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generation/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tools/ })).toBeInTheDocument();
  });

  it('アクティブカテゴリに aria-current が設定される', () => {
    render(
      <I18nTestWrapper>
        <BottomNav />
      </I18nTestWrapper>
    );
    const searchButton = screen.getByRole('button', { name: /Search/ });
    expect(searchButton).toHaveAttribute('aria-current', 'true');
  });

  it('クリックでカテゴリが切り替わる', async () => {
    const user = userEvent.setup();
    render(
      <I18nTestWrapper>
        <BottomNav />
      </I18nTestWrapper>
    );

    await user.click(screen.getByRole('button', { name: /Tools/ }));
    expect(useUiStore.getState().activeCategory).toBe('tools');
  });
});
