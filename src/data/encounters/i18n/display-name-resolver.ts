/**
 * Display name resolver for encounter locations and methods.
 *
 * Resolves normalized keys to localized display names using the
 * curated display-names.json dictionary. Falls back to the raw key
 * when a translation is not found.
 */

import displayNames from './display-names.json';

type Locale = 'ja' | 'en';

interface LocalizedEntry {
  ja: string;
  en: string;
}

type DisplayNameDictionary = Record<string, LocalizedEntry>;

const locations = displayNames.locations as DisplayNameDictionary;
const methods = displayNames.methods as DisplayNameDictionary;

/**
 * Resolve a normalized location key to a localized display name.
 */
export function resolveLocationName(key: string, locale: Locale): string {
  return locations[key]?.[locale] ?? key;
}

/**
 * Resolve a method identifier to a localized display name.
 */
export function resolveMethodName(method: string, locale: Locale): string {
  return methods[method]?.[locale] ?? method;
}
