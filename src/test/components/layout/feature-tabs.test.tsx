import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { FeatureTabs } from '@/components/layout/feature-tabs';
import { Tabs } from '@/components/ui/tabs';
import { useUiStore, getUiInitialState } from '@/stores/settings/ui';

function renderFeatureTabs() {
  const activeFeature = useUiStore.getState().activeFeature;
  return render(
    <I18nTestWrapper>
      <Tabs value={activeFeature}>
        <FeatureTabs />
      </Tabs>
    </I18nTestWrapper>
  );
}

describe('FeatureTabs', () => {
  beforeEach(() => {
    setupTestI18n('en');
    localStorage.clear();
    useUiStore.setState(getUiInitialState());
  });

  it('search カテゴリでポケモン・タマゴ・配達員のタブが順に表示される', () => {
    renderFeatureTabs();
    expect(screen.getByRole('tab', { name: 'Pokemon' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Egg' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Pokemon',
      'Egg',
      'Deliveryman',
    ]);
  });

  it('generation カテゴリでポケモン・タマゴ・配達員のタブが順に表示される', () => {
    useUiStore.setState({ activeCategory: 'generation' });
    renderFeatureTabs();
    expect(screen.getByRole('tab', { name: 'Pokemon' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Egg' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Pokemon',
      'Egg',
      'Deliveryman',
    ]);
  });

  it('tools カテゴリで 3 つのタブが表示される', () => {
    useUiStore.setState({ activeCategory: 'tools' });
    renderFeatureTabs();
    expect(screen.getByRole('tab', { name: 'MT Seed Search' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'TID Adjust' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Needle' })).toBeInTheDocument();
  });
});
