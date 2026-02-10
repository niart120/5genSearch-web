import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { I18nTestWrapper, setupTestI18n } from '@/test/helpers/i18n';
import { FeatureContent } from '@/components/layout/feature-content';
import { Tabs } from '@/components/ui/tabs';
import { useUiStore, getUiInitialState } from '@/stores/settings/ui';

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

  it('datetime-search がアクティブのとき PlaceholderPage が表示される', () => {
    renderFeatureContent('datetime-search');
    expect(screen.getByText('Datetime Search')).toBeInTheDocument();
    expect(screen.getByText('This feature is under development.')).toBeInTheDocument();
  });

  it('egg-search がアクティブのとき PlaceholderPage が表示される', () => {
    renderFeatureContent('egg-search');
    expect(screen.getByText('Egg Search')).toBeInTheDocument();
  });

  it('mtseed-search がアクティブのとき PlaceholderPage が表示される', () => {
    renderFeatureContent('mtseed-search');
    expect(screen.getByText('MT Seed Search')).toBeInTheDocument();
  });

  it('generation-list がアクティブのとき PlaceholderPage が表示される', () => {
    renderFeatureContent('generation-list');
    expect(screen.getByText('Generation List')).toBeInTheDocument();
  });
});
