import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@lingui/react';
import { i18n, activateLocale } from './i18n';
import { useUiStore } from './stores/settings/ui';
import { setupStoreSyncSubscriptions } from './stores/sync';
import './index.css';
import App from './App.tsx';

function resolveTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

// Apply theme before render to prevent flash
applyTheme(useUiStore.getState().theme);

async function bootstrap() {
  const initialLocale = useUiStore.getState().language;
  await activateLocale(initialLocale);

  setupStoreSyncSubscriptions();

  // Subscribe to theme changes
  useUiStore.subscribe(
    (state) => state.theme,
    (theme) => applyTheme(theme)
  );

  // Listen for OS color scheme changes (for system mode)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useUiStore.getState();
    if (theme === 'system') applyTheme(theme);
  });

  const rootElement = document.querySelector('#root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <I18nProvider i18n={i18n}>
        <App />
      </I18nProvider>
    </StrictMode>
  );
}

bootstrap();
