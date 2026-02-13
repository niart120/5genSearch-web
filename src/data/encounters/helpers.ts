/**
 * Unified encounter helpers for UI layer.
 *
 * Provides discriminated-union based API that handles both
 * location-based (wild) and static (fixed) encounters.
 *
 * All data-fetching functions are async because the underlying
 * loader lazily imports encounter JSON on demand.
 *
 * Caching is handled by the loader layer (per version×method).
 * This layer does not add a second cache — re-derivation cost
 * is negligible (O(slots), typically ~12 elements).
 */

import type { EncounterMethodKey, StaticEncounterTypeKey, GameVersion } from './schema';
import type { GenderRatio } from '../../wasm/wasm_pkg';
import {
  listLocations as listLocationsFromRegistry,
  getEncounterSlots,
  listStaticEncounterEntries,
} from './loader';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Discriminated union for encounter species options. */
export type EncounterSpeciesOption =
  | {
      kind: 'location';
      speciesId: number;
      firstSlotIndex: number;
      appearances: number;
      totalRate: number;
      minLevel: number;
      maxLevel: number;
    }
  | {
      kind: 'static';
      id: string;
      displayNameKey: string;
      speciesId: number;
      level: number;
      genderRatio: GenderRatio;
      isHiddenAbility?: boolean;
      isShinyLocked?: boolean;
    };

export interface LocationOption {
  key: string;
  displayNameKey: string;
}

// ---------------------------------------------------------------------------
// Location-based encounter type guard
// ---------------------------------------------------------------------------

const LOCATION_BASED_TYPES: ReadonlySet<string> = new Set<EncounterMethodKey>([
  'Normal',
  'ShakingGrass',
  'DustCloud',
  'PokemonShadow',
  'Surfing',
  'SurfingBubble',
  'Fishing',
  'FishingBubble',
]);

/**
 * Determine whether an encounter type is location-based (wild).
 * Acts as a type guard narrowing to EncounterMethodKey.
 */
export function isLocationBasedEncounter(
  encounterType: EncounterMethodKey | StaticEncounterTypeKey
): encounterType is EncounterMethodKey {
  return LOCATION_BASED_TYPES.has(encounterType);
}

// ---------------------------------------------------------------------------
// Public API (async)
// ---------------------------------------------------------------------------

/**
 * List encounter locations for a given version and wild encounter method.
 * Returns empty array for non-location-based types.
 */
export async function listLocations(
  version: GameVersion,
  method: EncounterMethodKey
): Promise<LocationOption[]> {
  return listLocationsFromRegistry(version, method);
}

/**
 * List species options for a given version and encounter type.
 *
 * For location-based types, `locationKey` is required and species
 * are aggregated across slots (kind: 'location').
 *
 * For static types, entries from the static registry are returned
 * directly (kind: 'static').
 */
export async function listSpecies(
  version: GameVersion,
  method: EncounterMethodKey | StaticEncounterTypeKey,
  locationKey?: string
): Promise<EncounterSpeciesOption[]> {
  return isLocationBasedEncounter(method)
    ? buildLocationSpecies(version, method, locationKey ?? '')
    : buildStaticSpecies(version, method);
}

// ---------------------------------------------------------------------------
// Internal builders
// ---------------------------------------------------------------------------

async function buildLocationSpecies(
  version: string,
  method: string,
  locationKey: string
): Promise<EncounterSpeciesOption[]> {
  const slots = await getEncounterSlots(version, locationKey, method);
  if (!slots) return [];

  const map = new Map<number, EncounterSpeciesOption & { kind: 'location' }>();

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
        kind: 'location',
        speciesId: slot.speciesId,
        firstSlotIndex: idx,
        appearances: 1,
        totalRate: slot.rate,
        minLevel: slot.levelRange.min,
        maxLevel: slot.levelRange.max,
      });
    }
  }

  return [...map.values()].toSorted(
    (a, b) => b.totalRate - a.totalRate || a.speciesId - b.speciesId
  );
}

async function buildStaticSpecies(
  version: string,
  method: string
): Promise<EncounterSpeciesOption[]> {
  const entries = await listStaticEncounterEntries(version, method);
  return entries.map((entry) => ({
    kind: 'static' as const,
    id: entry.id,
    displayNameKey: entry.displayNameKey,
    speciesId: entry.speciesId,
    level: entry.level,
    genderRatio: entry.genderRatio,
    isHiddenAbility: entry.isHiddenAbility,
    isShinyLocked: entry.isShinyLocked,
  }));
}
