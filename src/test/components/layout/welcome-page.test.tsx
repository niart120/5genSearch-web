import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { WelcomePage } from '@/components/layout/welcome-page';

describe('WelcomePage', () => {
  beforeEach(() => {
    setupTestI18n('en');
  });

  it('アプリ名が表示される', () => {
    render(
      <I18nTestWrapper>
        <WelcomePage />
      </I18nTestWrapper>
    );
    expect(screen.getByRole('heading', { name: '5genSearch' })).toBeInTheDocument();
  });

  it('説明文が表示される', () => {
    render(
      <I18nTestWrapper>
        <WelcomePage />
      </I18nTestWrapper>
    );
    expect(screen.getByText('Pokemon BW/BW2 RNG seed search tool.')).toBeInTheDocument();
  });

  it('モバイル向けガイドテキストが存在する', () => {
    render(
      <I18nTestWrapper>
        <WelcomePage />
      </I18nTestWrapper>
    );
    expect(
      screen.getByText('Tap the menu icon at the top left to configure search settings.')
    ).toBeInTheDocument();
  });
});
