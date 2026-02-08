/**
 * SearchProgress コンポーネントテスト
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchProgress, type SearchProgressData } from '@/components/data-display/search-progress';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';

beforeAll(() => {
  setupTestI18n('en');
});

const createProgress = (overrides: Partial<SearchProgressData> = {}): SearchProgressData => ({
  percentage: 50,
  elapsedMs: 30_000,
  estimatedRemainingMs: 30_000,
  throughput: 5000,
  totalProcessed: 5000,
  totalCount: 10_000,
  ...overrides,
});

describe('SearchProgress', () => {
  it('進捗バーと統計情報がレンダリングされる', () => {
    const progress = createProgress();

    render(
      <I18nTestWrapper>
        <SearchProgress progress={progress} />
      </I18nTestWrapper>
    );

    // 進捗率
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    // 件数
    expect(screen.getByText('5,000 / 10,000')).toBeInTheDocument();
    // 経過時間・残り時間・スループット
    expect(screen.getByText(/Elapsed/)).toBeInTheDocument();
    expect(screen.getByText(/Remaining/)).toBeInTheDocument();
    expect(screen.getByText('5.0K/s')).toBeInTheDocument();
  });

  it('0% の状態が正しく表示される', () => {
    const progress = createProgress({
      percentage: 0,
      elapsedMs: 0,
      estimatedRemainingMs: 60_000,
      throughput: 0,
      totalProcessed: 0,
      totalCount: 10_000,
    });

    render(
      <I18nTestWrapper>
        <SearchProgress progress={progress} />
      </I18nTestWrapper>
    );

    expect(screen.getByText('0.0%')).toBeInTheDocument();
    expect(screen.getByText('0 / 10,000')).toBeInTheDocument();
  });

  it('100% の状態が正しく表示される', () => {
    const progress = createProgress({
      percentage: 100,
      elapsedMs: 60_000,
      estimatedRemainingMs: 0,
      throughput: 10_000,
      totalProcessed: 10_000,
      totalCount: 10_000,
    });

    render(
      <I18nTestWrapper>
        <SearchProgress progress={progress} />
      </I18nTestWrapper>
    );

    expect(screen.getByText('100.0%')).toBeInTheDocument();
    expect(screen.getByText('10,000 / 10,000')).toBeInTheDocument();
  });
});
