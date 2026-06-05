/**
 * 各 feature ページの初期値コンポーネントテスト
 *
 * WASM 依存の hooks・services をモックし、初期表示の default 値を検証する。
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { getSearchResultsInitialState, useSearchResultsStore } from '@/stores/search/results';
import { getNeedleInitialState, useNeedleStore } from '@/features/needle/store';
import type { SeedOrigin } from '@/wasm/wasm_pkg.js';

// ---------------------------------------------------------------------------
// Global mocks
// ---------------------------------------------------------------------------

// WASM を jsdom 環境でロードできないため全関数をスタブ化
vi.mock('@/wasm/wasm_pkg.js', () => ({
  search_needle_pattern: vi.fn(() => []),
  get_species_name: vi.fn(() => 'Bulbasaur'),
  init: vi.fn(),
}));

// Workers / search hooks を一括モック
vi.mock('@/features/needle/hooks/use-needle-search', () => ({
  useNeedleSearch: () => ({
    results: [],
    error: undefined,
    search: vi.fn(),
    clear: vi.fn(),
  }),
}));

vi.mock('@/features/mtseed-search/hooks/use-mtseed-search', () => ({
  useMtseedSearch: () => ({
    isLoading: false,
    isInitialized: true,
    progress: undefined,
    results: [],
    error: undefined,
    startSearch: vi.fn(),
    cancel: vi.fn(),
  }),
}));

vi.mock('@/services/seed-resolve', () => ({
  resolveSeedOrigins: vi.fn(() => []),
}));

vi.mock('@/services/search-estimation', () => ({
  estimateMtseedSearchResults: vi.fn(),
  estimateDatetimeSearchResults: vi.fn(),
  estimateEggSearchResults: vi.fn(),
  countKeyCombinations: vi.fn(() => 1),
}));

vi.mock('@/lib/iv-tooltip', () => ({
  getStandardContexts: vi.fn(() => []),
}));

vi.mock('@/lib/navigate', () => ({
  navigateToDatetimeSearch: vi.fn(),
  navigateWithSeedOrigins: vi.fn(),
}));

vi.mock('@/hooks/use-export', () => ({
  useExport: () => ({
    exportData: vi.fn(),
  }),
}));

vi.mock('@/services/export-columns', () => ({
  createMtseedSearchExportColumns: vi.fn(() => []),
}));

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  setupTestI18n();
  useSearchResultsStore.setState(getSearchResultsInitialState());
  useNeedleStore.setState(getNeedleInitialState());
});

// ---------------------------------------------------------------------------
// needle-page: maxAdvance の初期値
// ---------------------------------------------------------------------------

describe('NeedlePage 初期表示', () => {
  it('maxAdvance の初期値が 30 である', async () => {
    const { NeedlePage } = await import('@/features/needle/components/needle-page');
    render(
      <I18nTestWrapper>
        <NeedlePage />
      </I18nTestWrapper>
    );

    // NumField id="max-advance" の input 要素を探す
    const input = document.querySelector<HTMLInputElement>('#max-advance');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('30');
  });

  it('mount 後に pendingDetailOrigins needle が入ると LCG Seed 入力へ反映される', async () => {
    const { NeedlePage } = await import('@/features/needle/components/needle-page');
    render(
      <I18nTestWrapper>
        <NeedlePage />
      </I18nTestWrapper>
    );

    const origin: SeedOrigin = {
      Seed: {
        base_seed: 0xab_cd_ef_01_23_45_67_89n,
        mt_seed: 0x23_45_67_89,
      },
    };
    act(() => {
      useSearchResultsStore.getState().setPendingDetailOrigin(origin);
    });

    const input = await screen.findByLabelText('LCG Seed (Hex)');
    await waitFor(() => expect((input as HTMLInputElement).value).toBe('ABCDEF0123456789'));
    expect(useSearchResultsStore.getState().pendingDetailOrigins['needle']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// mtseed-search-page: useGpu の初期値
// ---------------------------------------------------------------------------

describe('MtseedSearchPage 初期表示', () => {
  it('GPU スイッチが ON (checked) である', async () => {
    const { MtseedSearchPage } =
      await import('@/features/mtseed-search/components/mtseed-search-page');
    render(
      <I18nTestWrapper>
        <MtseedSearchPage />
      </I18nTestWrapper>
    );

    // SearchControls の GPU スイッチ (id="gpu-toggle") を確認
    const gpuSwitch = document.querySelector('#gpu-toggle');
    expect(gpuSwitch).not.toBeNull();
    expect(gpuSwitch?.getAttribute('aria-checked')).toBe('true');
  });
});
