/**
 * Encounter registry loader.
 *
 * Loads generated JSON files via import.meta.glob (lazy) and
 * provides async lookup APIs for encounter data (wild + static).
 * Each version × method combination is loaded on demand and cached.
 */

import type {
  EncounterLocationsJson,
  EncounterSlotJson,
  EncounterSpeciesEntryJson,
  EncounterSpeciesJson,
} from './schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegistryEntry {
  displayNameKey: string;
  slots: EncounterSlotJson[];
}

/** normalizedLocationKey -> RegistryEntry */
type RegistryBucket = Record<string, RegistryEntry>;

// ---------------------------------------------------------------------------
// Location key normalization
// ---------------------------------------------------------------------------

const RE_WHITESPACE = /[\u3000\s]+/g;
const RE_DASHES_DOTS = /[‐‑‒–—−\-.]/g;

export function normalizeLocationKey(location: string): string {
  return location.trim().replaceAll(RE_WHITESPACE, '').replaceAll(RE_DASHES_DOTS, '');
}

// ---------------------------------------------------------------------------
// Glob path parsing
// ---------------------------------------------------------------------------

const RE_MODULE_PATH = /\/v1\/(\w+)\/(\w+)\.json$/;

function parseModulePath(path: string): { version: string; method: string } | undefined {
  const match = path.match(RE_MODULE_PATH);
  if (!match) return undefined;
  return { version: match[1], method: match[2] };
}

// ---------------------------------------------------------------------------
// Dynamic import modules (lazy)
// ---------------------------------------------------------------------------

const generatedModules = import.meta.glob<EncounterLocationsJson>('./generated/v1/**/*.json', {
  import: 'default',
});

const staticModules = import.meta.glob<EncounterSpeciesJson>('./static/v1/**/*.json', {
  import: 'default',
});

// ---------------------------------------------------------------------------
// Registry cache + async loaders
// ---------------------------------------------------------------------------

const registryCache: Record<string, RegistryBucket> = {};

async function loadRegistryEntry(
  version: string,
  method: string
): Promise<RegistryBucket | undefined> {
  const key = `${version}_${method}`;
  if (registryCache[key]) return registryCache[key];

  const targetPath = Object.keys(generatedModules).find((path) => {
    const parsed = parseModulePath(path);
    return parsed?.version === version && parsed?.method === method;
  });
  if (!targetPath) return undefined;

  const data = await generatedModules[targetPath]();
  const bucket: RegistryBucket = {};
  for (const [locKey, payload] of Object.entries(data.locations)) {
    const normalizedKey = normalizeLocationKey(locKey);
    bucket[normalizedKey] = {
      displayNameKey: locKey,
      slots: payload.slots,
    };
  }
  registryCache[key] = bucket;
  return bucket;
}

/** version_method -> EncounterSpeciesEntryJson[] */
const staticRegistryCache: Record<string, EncounterSpeciesEntryJson[]> = {};

async function loadStaticRegistryEntry(
  version: string,
  method: string
): Promise<EncounterSpeciesEntryJson[]> {
  const key = `${version}_${method}`;
  if (staticRegistryCache[key]) return staticRegistryCache[key];

  const targetPath = Object.keys(staticModules).find((path) => {
    const parsed = parseModulePath(path);
    return parsed?.version === version && parsed?.method === method;
  });
  if (!targetPath) return [];

  const data = await staticModules[targetPath]();
  staticRegistryCache[key] = data.entries;
  return data.entries;
}

// ---------------------------------------------------------------------------
// Public API (async)
// ---------------------------------------------------------------------------

/**
 * Get encounter slots for a specific version/location/method combination.
 */
export async function getEncounterSlots(
  version: string,
  location: string,
  method: string
): Promise<EncounterSlotJson[] | undefined> {
  const bucket = await loadRegistryEntry(version, method);
  if (!bucket) return undefined;

  const normalizedLoc = normalizeLocationKey(location);
  const entry = bucket[normalizedLoc];
  return entry?.slots;
}

/**
 * List all locations for a given version and method.
 */
export async function listLocations(
  version: string,
  method: string
): Promise<Array<{ key: string; displayNameKey: string }>> {
  const bucket = await loadRegistryEntry(version, method);
  if (!bucket) return [];

  return Object.entries(bucket).map(([locKey, entry]) => ({
    key: locKey,
    displayNameKey: entry.displayNameKey,
  }));
}

/**
 * Get the full registry entry for a location.
 */
export async function getLocationEntry(
  version: string,
  location: string,
  method: string
): Promise<RegistryEntry | undefined> {
  const bucket = await loadRegistryEntry(version, method);
  if (!bucket) return undefined;

  const normalizedLoc = normalizeLocationKey(location);
  return bucket[normalizedLoc];
}

// ---------------------------------------------------------------------------
// Static encounter public API (async)
// ---------------------------------------------------------------------------

/**
 * List all static encounter entries for a given version and method.
 */
export async function listStaticEncounterEntries(
  version: string,
  method: string
): Promise<EncounterSpeciesEntryJson[]> {
  return loadStaticRegistryEntry(version, method);
}

/**
 * Get a single static encounter entry by id.
 */
export async function getStaticEncounterEntry(
  version: string,
  method: string,
  entryId: string
): Promise<EncounterSpeciesEntryJson | undefined> {
  const entries = await listStaticEncounterEntries(version, method);
  return entries.find((e) => e.id === entryId);
}
