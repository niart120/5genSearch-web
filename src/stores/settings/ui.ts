import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { SupportedLocale } from '../../i18n';

type Theme = 'light' | 'dark' | 'system';

interface UiState {
  language: SupportedLocale;
  theme: Theme;
}

interface UiActions {
  setLanguage: (language: SupportedLocale) => void;
  setTheme: (theme: Theme) => void;
  reset: () => void;
}

const DEFAULT_STATE: UiState = {
  language: 'ja',
  theme: 'system',
};

export const useUiStore = create<UiState & UiActions>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        ...DEFAULT_STATE,
        setLanguage: (language) => set({ language }),
        setTheme: (theme) => set({ theme }),
        reset: () => set(DEFAULT_STATE),
      }),
      {
        name: 'ui-settings',
        version: 1,
      }
    )
  )
);

export const getUiInitialState = (): UiState => DEFAULT_STATE;
