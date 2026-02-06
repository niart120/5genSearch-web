import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'ja' | 'en';

type Theme = 'light' | 'dark' | 'system';

interface UiState {
  language: Language;
  theme: Theme;
}

interface UiActions {
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  reset: () => void;
}

const DEFAULT_STATE: UiState = {
  language: 'ja',
  theme: 'system',
};

export const useUiStore = create<UiState & UiActions>()(
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
);

export const getUiInitialState = (): UiState => DEFAULT_STATE;
