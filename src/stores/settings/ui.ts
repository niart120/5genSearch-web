import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { SupportedLocale } from '../../i18n';
import type { Category, FeatureId } from '../../lib/navigation';
import { getDefaultFeature } from '../../lib/navigation';

type Theme = 'light' | 'dark';

function getSystemTheme(): Theme {
  if (typeof globalThis.matchMedia !== 'function') return 'light';
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface UiState {
  language: SupportedLocale;
  theme: Theme;
  activeCategory: Category;
  activeFeature: FeatureId;
  featureMemory: Partial<Record<Category, FeatureId>>;
}

interface UiActions {
  setLanguage: (language: SupportedLocale) => void;
  setTheme: (theme: Theme) => void;
  setActiveCategory: (category: Category) => void;
  setActiveFeature: (feature: FeatureId) => void;
  reset: () => void;
}

const DEFAULT_STATE: UiState = {
  language: 'ja',
  theme: getSystemTheme(),
  activeCategory: 'search',
  activeFeature: 'datetime-search',
  featureMemory: {},
};

export const useUiStore = create<UiState & UiActions>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        ...DEFAULT_STATE,
        setLanguage: (language) => set({ language }),
        setTheme: (theme) => set({ theme }),
        setActiveCategory: (category) =>
          set((state) => ({
            activeCategory: category,
            activeFeature: state.featureMemory[category] ?? getDefaultFeature(category),
          })),
        setActiveFeature: (feature) =>
          set((state) => ({
            activeFeature: feature,
            featureMemory: {
              ...state.featureMemory,
              [state.activeCategory]: feature,
            },
          })),
        reset: () => set(DEFAULT_STATE),
      }),
      {
        name: 'ui-settings',
        version: 2,
      }
    )
  )
);

export const getUiInitialState = (): UiState => DEFAULT_STATE;
