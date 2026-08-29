import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ResultDetailDialog } from '@/features/egg-search/components/result-detail-dialog';
import { useSearchResultsStore } from '@/stores/search/results';
import { createEggSearchResultView } from '@/test/helpers/egg-result-view';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';

describe('Egg Search result detail dialog', () => {
  beforeEach(() => {
    setupTestI18n('ja');
    useSearchResultsStore.getState().clearResults();
  });

  it('不明個体値を?として表示する', () => {
    const result = createEggSearchResultView();

    render(
      <I18nTestWrapper>
        <ResultDetailDialog open onOpenChange={vi.fn()} result={result} />
      </I18nTestWrapper>
    );

    expect(screen.getByText(/H:\?/)).toBeInTheDocument();
    expect(screen.queryByText(/H:32/)).not.toBeInTheDocument();
  });

  it('Seed入力への転記にはrawのSeedOriginを使う', () => {
    const result = createEggSearchResultView();

    render(
      <I18nTestWrapper>
        <ResultDetailDialog open onOpenChange={vi.fn()} result={result} />
      </I18nTestWrapper>
    );
    fireEvent.click(screen.getByRole('button', { name: /Copy to seed input/i }));

    expect(useSearchResultsStore.getState().pendingDetailOrigins['egg-list']).toEqual(
      result.raw.egg.source
    );
  });
});
