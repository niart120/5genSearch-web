/**
 * UI-facing helpers for encounter data.
 *
 * Provides aggregated views of encounter locations and species
 * for use in UI components (selectors, filters, etc.).
 */

import { listLocations, getEncounterSlots } from './loader';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EncounterLocationOption {
  key: string;
  displayNameKey: string;
}

export interface EncounterSpeciesOption {
  speciesId: number;
  firstSlotIndex: number;
  appearances: number;
  totalRate: number;
  minLevel: number;
  maxLevel: number;
}

// ---------------------------------------------------------------------------
// Caches
// ---------------------------------------------------------------------------

const cacheLocations = new Map<string, EncounterLocationOption[]>();
const cacheSpecies = new Map<string, EncounterSpeciesOption[]>();

function locCacheKey(version: string, method: string): string {
  return `L|${version}|${method}`;
}

function speciesCacheKey(version: string, method: string, locationKey: string): string {
  return `S|${version}|${method}|${locationKey}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List encounter locations for a given version and method.
 * Results are cached after first call.
 */
export function listEncounterLocations(version: string, method: string): EncounterLocationOption[] {
  const key = locCacheKey(version, method);
  const cached = cacheLocations.get(key);
  if (cached) return cached;

  const result = listLocations(version, method);
  cacheLocations.set(key, result);
  return result;
}

/**
 * List species options for a given version, method, and location.
 * Aggregates species across slots, computing total rate, appearances, and level range.
 */
export function listEncounterSpecies(
  version: string,
  method: string,
  locationKey: string
): EncounterSpeciesOption[] {
  const key = speciesCacheKey(version, method, locationKey);
  const cached = cacheSpecies.get(key);
  if (cached) return cached;

  const slots = getEncounterSlots(version, locationKey, method);
  if (!slots) return [];

  const map = new Map<number, EncounterSpeciesOption>();

  for (const [idx, slot] of slots.entries()) {
    const existing = map.get(slot.speciesId);
    if (existing) {
      existing.appearances += 1;
      existing.totalRate += slot.rate;
      if (slot.levelRange.min < existing.minLevel) {
        existing.minLevel = slot.levelRange.min;
      }
      if (slot.levelRange.max > existing.maxLevel) {
        existing.maxLevel = slot.levelRange.max;
      }
    } else {
      map.set(slot.speciesId, {
        speciesId: slot.speciesId,
        firstSlotIndex: idx,
        appearances: 1,
        totalRate: slot.rate,
        minLevel: slot.levelRange.min,
        maxLevel: slot.levelRange.max,
      });
    }
  }

  const result = [...map.values()].toSorted(
    (a, b) => b.totalRate - a.totalRate || a.speciesId - b.speciesId
  );

  cacheSpecies.set(key, result);
  return result;
}
