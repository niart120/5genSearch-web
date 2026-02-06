import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@lingui/react';
import { i18n, activateLocale } from './i18n';
import { useUiStore } from './stores/settings/ui';
import { setupStoreSyncSubscriptions } from './stores/sync';
import './index.css';
import App from './App.tsx';

async function bootstrap() {
  const initialLocale = useUiStore.getState().language;
  await activateLocale(initialLocale);

  setupStoreSyncSubscriptions();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider i18n={i18n}>
        <App />
      </I18nProvider>
    </StrictMode>
  );
}

bootstrap();
