/**
 * EmptyState コンポーネントテスト
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/data-display/empty-state';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';

beforeAll(() => {
  setupTestI18n('en');
});

describe('EmptyState', () => {
  it('デフォルトメッセージを表示する', () => {
    render(
      <I18nTestWrapper>
        <EmptyState />
      </I18nTestWrapper>
    );

    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('カスタムメッセージを表示する', () => {
    render(
      <I18nTestWrapper>
        <EmptyState message="検索を実行してください" />
      </I18nTestWrapper>
    );

    expect(screen.getByText('検索を実行してください')).toBeInTheDocument();
  });
});
