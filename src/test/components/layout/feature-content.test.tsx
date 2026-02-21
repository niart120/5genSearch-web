import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { FeatureContent } from '@/components/layout/feature-content';
import { Tabs } from '@/components/ui/tabs';
import { useUiStore, getUiInitialState } from '@/stores/settings/ui';
import { useDsConfigStore, getDsConfigInitialState } from '@/stores/settings/ds-config';

// jsdom 環境では WASM バイナリをロードできないためモック
vi.mock('@/wasm/wasm_pkg.js', () => ({
  get_species_name: vi.fn((id: number) => `Species #${id}`),
  resolve_seeds: vi.fn(() => []),
}));

function renderFeatureContent(activeFeature: string) {
  return render(
    <I18nTestWrapper>
      <Tabs value={activeFeature}>
        <FeatureContent />
      </Tabs>
    </I18nTestWrapper>
  );
}

describe('FeatureContent', () => {
  beforeEach(() => {
    setupTestI18n('en');
    localStorage.clear();
    useUiStore.setState(getUiInitialState());
    useDsConfigStore.setState(getDsConfigInitialState());
  });

  it('datetime-search がアクティブのとき DatetimeSearchPage が表示される', () => {
    renderFeatureContent('datetime-search');
    // DatetimeSearchPage はフォームを含む — Search ボタンが表示される (PC + モバイル)
    const buttons = screen.getAllByRole('button', { name: /Search/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('egg-search がアクティブのとき EggSearchPage が表示される (BW)', () => {
    renderFeatureContent('egg-search');
    // EggSearchPage はフォームを含む — Search ボタンが表示される
    const buttons = screen.getAllByRole('button', { name: /Search/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('egg-search がアクティブで BW2 のとき placeholder が表示される', () => {
    useDsConfigStore.getState().setConfig({ version: 'Black2' });
    renderFeatureContent('egg-search');
    expect(screen.getByText(/only available in BW/i)).toBeInTheDocument();
  });

  it('egg-list がアクティブで BW2 のとき placeholder が表示される', () => {
    useDsConfigStore.getState().setConfig({ version: 'White2' });
    renderFeatureContent('egg-list');
    expect(screen.getByText(/only available in BW/i)).toBeInTheDocument();
  });

  it('mtseed-search がアクティブのとき MtseedSearchPage が表示される', () => {
    renderFeatureContent('mtseed-search');
    // MtseedSearchPage はフォームを含む — Search ボタンが表示される
    const buttons = screen.getAllByRole('button', { name: /Search/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('pokemon-list がアクティブのとき PokemonListPage が表示される', () => {
    renderFeatureContent('pokemon-list');
    // PokemonListPage はフォームを含む — Search ボタンが表示される
    const buttons = screen.getAllByRole('button', { name: /Search/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('egg-list がアクティブのとき EggListPage が表示される (BW)', () => {
    renderFeatureContent('egg-list');
    // EggListPage はフォームを含む — Search ボタンが表示される
    const buttons = screen.getAllByRole('button', { name: /Search/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});
