import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore, getUiInitialState } from '../../../stores/settings/ui';

const resetStore = () => {
  localStorage.clear();
  useUiStore.setState(getUiInitialState(), true);
};

describe('ui store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should have default settings', () => {
    const { language, theme } = useUiStore.getState();
    expect(language).toBe('ja');
    expect(theme).toBe('system');
  });

  it('should set language', () => {
    useUiStore.getState().setLanguage('en');
    const { language } = useUiStore.getState();
    expect(language).toBe('en');
  });

  it('should set theme', () => {
    useUiStore.getState().setTheme('dark');
    const { theme } = useUiStore.getState();
    expect(theme).toBe('dark');
  });

  it('should reset to default', () => {
    useUiStore.getState().setTheme('dark');
    useUiStore.getState().reset();
    const { theme } = useUiStore.getState();
    expect(theme).toBe('system');
  });
});
