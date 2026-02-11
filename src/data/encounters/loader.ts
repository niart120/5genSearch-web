/**
 * Encounter registry loader.
 *
 * Loads generated JSON files via import.meta.glob (eager) at build time
 * and provides lookup APIs for encounter data.
 */

import type { EncounterLocationsJson, EncounterSlotJson } from './schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegistryEntry {
  displayNameKey: string;
  slots: EncounterSlotJson[];
}

/** version_method -> normalizedLocationKey -> RegistryEntry */
type Registry = Record<string, Record<string, RegistryEntry>>;

// ---------------------------------------------------------------------------
// Location key normalization
// ---------------------------------------------------------------------------

export function normalizeLocationKey(location: string): string {
  return location
    .trim()
    .replaceAll(/[\u3000\s]+/g, '')
    .replaceAll(/[‐‑‒–—−\-.]/g, '');
}

// ---------------------------------------------------------------------------
// Registry initialization
// ---------------------------------------------------------------------------

let registry: Registry | undefined;

function initRegistry(): Registry {
  const modules = import.meta.glob('./generated/v1/**/*.json', {
    eager: true,
  }) as Record<string, { default: EncounterLocationsJson } | EncounterLocationsJson>;

  const acc: Registry = {};
  for (const [, mod] of Object.entries(modules)) {
    const data: EncounterLocationsJson =
      'default' in (mod as object)
        ? (mod as { default: EncounterLocationsJson }).default
        : (mod as EncounterLocationsJson);

    const key = `${data.version}_${data.method}`;
    if (!acc[key]) acc[key] = {};

    for (const [locKey, payload] of Object.entries(data.locations)) {
      const normalizedKey = normalizeLocationKey(locKey);
      acc[key][normalizedKey] = {
        displayNameKey: payload.displayNameKey,
        slots: payload.slots,
      };
    }
  }
  return acc;
}

function ensureRegistry(): Registry {
  if (!registry) {
    registry = initRegistry();
  }
  return registry;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get encounter slots for a specific version/location/method combination.
 */
export function getEncounterSlots(
  version: string,
  location: string,
  method: string
): EncounterSlotJson[] | undefined {
  const reg = ensureRegistry();
  const key = `${version}_${method}`;
  const bucket = reg[key];
  if (!bucket) return undefined;

  const normalizedLoc = normalizeLocationKey(location);
  const entry = bucket[normalizedLoc];
  return entry?.slots;
}

/**
 * List all locations for a given version and method.
 */
export function listLocations(
  version: string,
  method: string
): Array<{ key: string; displayNameKey: string }> {
  const reg = ensureRegistry();
  const key = `${version}_${method}`;
  const bucket = reg[key];
  if (!bucket) return [];

  return Object.entries(bucket).map(([locKey, entry]) => ({
    key: locKey,
    displayNameKey: entry.displayNameKey,
  }));
}

/**
 * Get the full registry entry for a location.
 */
export function getLocationEntry(
  version: string,
  location: string,
  method: string
): RegistryEntry | undefined {
  const reg = ensureRegistry();
  const key = `${version}_${method}`;
  const bucket = reg[key];
  if (!bucket) return undefined;

  const normalizedLoc = normalizeLocationKey(location);
  return bucket[normalizedLoc];
}
