import { useUiStore } from '../stores/settings/ui';

export function useUiSettings() {
  const language = useUiStore((s) => s.language);
  const theme = useUiStore((s) => s.theme);
  const setLanguage = useUiStore((s) => s.setLanguage);
  const setTheme = useUiStore((s) => s.setTheme);
  const reset = useUiStore((s) => s.reset);

  return { language, theme, setLanguage, setTheme, reset } as const;
}

export function useNavigation() {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const activeFeature = useUiStore((s) => s.activeFeature);
  const setActiveCategory = useUiStore((s) => s.setActiveCategory);
  const setActiveFeature = useUiStore((s) => s.setActiveFeature);

  return { activeCategory, activeFeature, setActiveCategory, setActiveFeature } as const;
}
