import { useUiStore } from './settings/ui';
import { activateLocale } from '../i18n';
import type { SupportedLocale } from '../i18n';

export function setupStoreSyncSubscriptions(): () => void {
  const cleanups: Array<() => void> = [];

  // language → i18n 同期
  const unsubLanguage = useUiStore.subscribe(
    (state) => state.language,
    async (language) => {
      await activateLocale(language as SupportedLocale);
    }
  );
  cleanups.push(unsubLanguage);

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
