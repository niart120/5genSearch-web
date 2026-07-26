import { useEffect } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EggListPage } from '@/features/egg-list/components/egg-list-page';
import { getEggListInitialState, useEggListStore } from '@/features/egg-list/store';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import type { SeedOrigin } from '@/wasm/wasm_pkg.js';

const { generateMock } = vi.hoisted(() => ({
  generateMock: vi.fn(),
}));

const ORIGINS: SeedOrigin[] = [{ Seed: { base_seed: 1n, mt_seed: 1 } }];

vi.mock('@/features/egg-list/hooks/use-egg-list', () => ({
  useEggList: () => ({
    isLoading: false,
    isInitialized: true,
    progress: undefined,
    uiResults: [],
    error: undefined,
    generate: generateMock,
    cancel: vi.fn(),
  }),
}));

vi.mock('@/components/forms/seed-input-section', () => ({
  SeedInputSection: ({ onOriginsChange }: { onOriginsChange: (origins: SeedOrigin[]) => void }) => {
    useEffect(() => onOriginsChange(ORIGINS), [onOriginsChange]);
    return <div />;
  },
}));

vi.mock('@/components/forms/egg-params-form', () => ({
  EggParamsForm: () => <div />,
}));

vi.mock('@/components/forms/egg-filter-form', () => ({
  EggFilterForm: () => <div />,
}));

vi.mock('@/components/data-display', () => ({
  DataTable: () => <div />,
  ADVANCE_ASC_SORTING: [],
}));

vi.mock('@/features/egg-list/components/egg-result-columns', () => ({
  createEggResultColumns: vi.fn(() => []),
}));

vi.mock('@/features/egg-list/components/result-detail-dialog', () => ({
  ResultDetailDialog: () => <></>,
}));

vi.mock('@/components/data-display/export-toolbar', () => ({
  ExportToolbar: () => <></>,
}));

vi.mock('@/hooks/use-export', () => ({
  useExport: () => ({ exportData: vi.fn() }),
}));

vi.mock('@/services/export-columns', () => ({
  createEggListExportColumns: vi.fn(() => []),
}));

vi.mock('@/services/search-estimation', () => ({
  estimateEggListResults: vi.fn(() => ({
    exceedsThreshold: false,
    estimatedCount: 1,
  })),
}));

describe('EggListPage', () => {
  beforeEach(() => {
    setupTestI18n('ja');
    generateMock.mockReset();
    useEggListStore.setState(getEggListInitialState());
  });

  it('再検索時は変更後の生成条件を generate へ渡す', () => {
    render(
      <I18nTestWrapper>
        <EggListPage />
      </I18nTestWrapper>
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Search/i })[0]);
    act(() => {
      useEggListStore.getState().setGenConfig({ user_offset: 7, max_advance: 30 });
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Search/i })[0]);

    expect(generateMock.mock.lastCall?.[2]).toEqual(expect.objectContaining({ user_offset: 7 }));
  });
});
