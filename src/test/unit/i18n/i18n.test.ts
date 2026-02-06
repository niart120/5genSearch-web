import { beforeEach, describe, expect, it } from 'vitest';
import {
  i18n,
  activateLocale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  isSupportedLocale,
} from '../../../i18n';

describe('i18n', () => {
  beforeEach(() => {
    // i18n の状態をリセット (空カタログで初期化)
    i18n.load('ja', {});
    i18n.activate('ja');
  });

  it('should have correct supported locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['ja', 'en']);
  });

  it('should have ja as default locale', () => {
    expect(DEFAULT_LOCALE).toBe('ja');
  });

  it('should validate supported locales', () => {
    expect(isSupportedLocale('ja')).toBe(true);
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('fr')).toBe(false);
    expect(isSupportedLocale('')).toBe(false);
  });

  it('should activate ja locale', async () => {
    await activateLocale('ja');
    expect(i18n.locale).toBe('ja');
  });

  it('should activate en locale', async () => {
    await activateLocale('en');
    expect(i18n.locale).toBe('en');
  });

  it('should switch locale', async () => {
    await activateLocale('ja');
    expect(i18n.locale).toBe('ja');

    await activateLocale('en');
    expect(i18n.locale).toBe('en');
  });
});
