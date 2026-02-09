import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { useUiStore } from '@/stores/settings/ui';

describe('LanguageToggle', () => {
  beforeEach(() => {
    useUiStore.getState().reset();
    setupTestI18n('ja');
  });

  it('現在の言語コードが表示される', () => {
    render(
      <I18nTestWrapper>
        <LanguageToggle />
      </I18nTestWrapper>
    );
    expect(screen.getByRole('button')).toHaveTextContent('ja');
  });

  it('クリックで言語が切り替わる (ja → en)', async () => {
    const user = userEvent.setup();
    render(
      <I18nTestWrapper>
        <LanguageToggle />
      </I18nTestWrapper>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('ja');

    await user.click(button);
    expect(button).toHaveTextContent('en');
    expect(useUiStore.getState().language).toBe('en');
  });

  it('2 回クリックで元に戻る (ja → en → ja)', async () => {
    const user = userEvent.setup();
    render(
      <I18nTestWrapper>
        <LanguageToggle />
      </I18nTestWrapper>
    );

    const button = screen.getByRole('button');
    await user.click(button);
    await user.click(button);
    expect(button).toHaveTextContent('ja');
    expect(useUiStore.getState().language).toBe('ja');
  });

  it('aria-label に切替先の言語が含まれる', () => {
    render(
      <I18nTestWrapper>
        <LanguageToggle />
      </I18nTestWrapper>
    );
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('English')
    );
  });
});
