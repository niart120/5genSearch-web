import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import type { ReactNode } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export function setupTestI18n(locale: string = 'ja'): void {
  i18n.load(locale, {});
  i18n.activate(locale);
}

export function I18nTestWrapper({ children }: { children: ReactNode }) {
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
