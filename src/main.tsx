import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@lingui/react';
import { i18n, activateLocale } from './i18n';
import { useUiStore } from './stores/settings/ui';
import { setupStoreSyncSubscriptions } from './stores/sync';
import './index.css';
import App from './app.tsx';

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

// Apply theme before render to prevent flash
applyTheme(useUiStore.getState().theme);

const initialLocale = useUiStore.getState().language;
await activateLocale(initialLocale);

setupStoreSyncSubscriptions();

// Subscribe to theme changes
useUiStore.subscribe(
  (state) => state.theme,
  (theme) => applyTheme(theme)
);

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
