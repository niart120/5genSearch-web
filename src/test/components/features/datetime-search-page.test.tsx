import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatetimeSearchPage } from '@/features/datetime-search/components/datetime-search-page';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import {
  getDatetimeSearchInitialState,
  useDatetimeSearchStore,
} from '@/features/datetime-search/store';
import { getSearchResultsInitialState, useSearchResultsStore } from '@/stores/search/results';

vi.mock('@/features/datetime-search/hooks/use-datetime-search', () => ({
  useDatetimeSearch: () => ({
    isLoading: false,
    isInitialized: true,
    progress: undefined,
    results: [],
    error: undefined,
    startSearch: vi.fn(),
    cancel: vi.fn(),
  }),
}));

vi.mock('@/components/data-display', () => ({
  DataTable: () => <div data-testid="data-table" />,
  DATETIME_ASC_SORTING: [],
}));

vi.mock('@/features/datetime-search/components/seed-origin-columns', () => ({
  createSeedOriginColumns: vi.fn(() => []),
}));

vi.mock('@/features/datetime-search/components/result-detail-dialog', () => ({
  ResultDetailDialog: () => <></>,
}));

vi.mock('@/features/datetime-search/components/template-selection-dialog', () => ({
  TemplateSelectionDialog: () => <></>,
}));

vi.mock('@/components/data-display/export-toolbar', () => ({
  ExportToolbar: () => <></>,
}));

vi.mock('@/hooks/use-export', () => ({
  useExport: () => ({
    exportData: vi.fn(),
  }),
}));

vi.mock('@/services/export-columns', () => ({
  createDatetimeSearchExportColumns: vi.fn(() => []),
}));

vi.mock('@/services/search-estimation', () => ({
  estimateDatetimeSearchResults: vi.fn(() => ({
    exceedsThreshold: false,
    estimatedCount: 0,
  })),
  countKeyCombinations: vi.fn(() => 1),
}));

vi.mock('@/lib/iv-tooltip', () => ({
  getStandardContexts: vi.fn(() => []),
}));

describe('DatetimeSearchPage', () => {
  beforeEach(() => {
    setupTestI18n('ja');
    useDatetimeSearchStore.setState(getDatetimeSearchInitialState());
    useSearchResultsStore.setState(getSearchResultsInitialState());
  });

  it('mount 後に pendingTargetSeeds が入ると MT Seed 入力へ反映される', async () => {
    render(
      <I18nTestWrapper>
        <DatetimeSearchPage />
      </I18nTestWrapper>
    );

    act(() => {
      useSearchResultsStore.getState().setPendingTargetSeeds([0x12_34_ab_cd, 0x90_ab_cd_ef]);
    });

    const textarea = screen.getByLabelText('MT Seed') as HTMLTextAreaElement;
    await waitFor(() => expect(textarea.value).toBe('1234ABCD\n90ABCDEF'));
    expect(useSearchResultsStore.getState().pendingTargetSeeds).toEqual([]);
  });
});
