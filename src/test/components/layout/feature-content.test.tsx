import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { FeatureContent } from '@/components/layout/feature-content';
import { Tabs } from '@/components/ui/tabs';
import { useUiStore, getUiInitialState } from '@/stores/settings/ui';

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
  });

  it('datetime-search がアクティブのとき DatetimeSearchPage が表示される', () => {
    renderFeatureContent('datetime-search');
    // DatetimeSearchPage はフォームを含む — Search ボタンが表示される (PC + モバイル)
    const buttons = screen.getAllByRole('button', { name: /Search/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('egg-search がアクティブのとき EggSearchPage が表示される', () => {
    renderFeatureContent('egg-search');
    // EggSearchPage はフォームを含む — Search ボタンが表示される
    const buttons = screen.getAllByRole('button', { name: /Search/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('mtseed-search がアクティブのとき PlaceholderPage が表示される', () => {
    renderFeatureContent('mtseed-search');
    expect(screen.getByText('MT Seed Search')).toBeInTheDocument();
  });

  it('pokemon-list がアクティブのとき PokemonListPage が表示される', () => {
    renderFeatureContent('pokemon-list');
    // PokemonListPage はフォームを含む — Search ボタンが表示される
    const buttons = screen.getAllByRole('button', { name: /Search/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('egg-list がアクティブのとき EggListPage が表示される', () => {
    renderFeatureContent('egg-list');
    // EggListPage はフォームを含む — Search ボタンが表示される
    const buttons = screen.getAllByRole('button', { name: /Search/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});
