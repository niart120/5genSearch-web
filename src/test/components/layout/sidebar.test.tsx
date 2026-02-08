import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { Sidebar } from '@/components/layout/sidebar';

describe('Sidebar', () => {
  beforeEach(() => {
    setupTestI18n('en');
  });

  it('見出し "Settings" が表示される', () => {
    render(
      <I18nTestWrapper>
        <Sidebar />
      </I18nTestWrapper>
    );
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('children が描画される', () => {
    render(
      <I18nTestWrapper>
        <Sidebar>
          <p>Test content</p>
        </Sidebar>
      </I18nTestWrapper>
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('children が空でもエラーにならない', () => {
    render(
      <I18nTestWrapper>
        <Sidebar />
      </I18nTestWrapper>
    );
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('className が適用される', () => {
    const { container } = render(
      <I18nTestWrapper>
        <Sidebar className="custom-class" />
      </I18nTestWrapper>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
