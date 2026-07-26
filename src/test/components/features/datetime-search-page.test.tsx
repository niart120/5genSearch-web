import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatetimeSearchPage } from '@/features/datetime-search/components/datetime-search-page';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import {
  getDatetimeSearchInitialState,
  useDatetimeSearchStore,
} from '@/features/datetime-search/store';
import { getSearchResultsInitialState, useSearchResultsStore } from '@/stores/search/results';

const { startSearchMock, estimateDatetimeSearchResultsMock } = vi.hoisted(() => ({
  startSearchMock: vi.fn(),
  estimateDatetimeSearchResultsMock: vi.fn(),
}));

vi.mock('@/features/datetime-search/hooks/use-datetime-search', () => ({
  useDatetimeSearch: () => ({
    isLoading: false,
    isInitialized: true,
    progress: undefined,
    results: [],
    error: undefined,
    startSearch: startSearchMock,
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
  estimateDatetimeSearchResults: estimateDatetimeSearchResultsMock,
  countKeyCombinations: vi.fn(() => 1),
}));

vi.mock('@/lib/iv-tooltip', () => ({
  getStandardContexts: vi.fn(() => []),
}));

describe('DatetimeSearchPage', () => {
  beforeEach(() => {
    setupTestI18n('ja');
    startSearchMock.mockReset();
    estimateDatetimeSearchResultsMock.mockReset();
    estimateDatetimeSearchResultsMock.mockReturnValue({
      exceedsThreshold: false,
      estimatedCount: 0,
    });
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

  it('編集中の数値を確定してから最新条件で検索する', () => {
    render(
      <I18nTestWrapper>
        <DatetimeSearchPage />
      </I18nTestWrapper>
    );

    const startYear = screen.getByLabelText('date-start year');
    startYear.focus();
    fireEvent.change(startYear, { target: { value: '2024' } });
    fireEvent.pointerDown(screen.getAllByRole('button', { name: /Search/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /Search/i })[0]);

    expect(startSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        date_range: expect.objectContaining({ start_year: 2024 }),
      }),
      expect.any(Array)
    );
  });

  it('確認後も見積もり時に作成した検索要求を使用する', () => {
    estimateDatetimeSearchResultsMock.mockReturnValue({
      exceedsThreshold: true,
      estimatedCount: 1_000_000,
    });

    render(
      <I18nTestWrapper>
        <DatetimeSearchPage />
      </I18nTestWrapper>
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Search/i })[0]);

    act(() => {
      useDatetimeSearchStore.getState().setDateRange({
        ...useDatetimeSearchStore.getState().dateRange,
        start_year: 2025,
      });
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue|続行/i }));

    expect(startSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        date_range: expect.objectContaining({ start_year: 2000 }),
      }),
      expect.any(Array)
    );
  });
});
