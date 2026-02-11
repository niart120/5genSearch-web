/**
 * Encounter slot JSON schema types.
 *
 * These types define the shape of the generated encounter JSON files
 * produced by `scripts/scrape-encounters.js`, and the static encounter
 * catalog JSON files under `static/v1/`.
 */

import type { EncounterType, GenderRatio } from '../../wasm/wasm_pkg';

// ---------------------------------------------------------------------------
// Wild encounter (location-based) types
// ---------------------------------------------------------------------------

export type EncounterMethodKey =
  | 'Normal'
  | 'ShakingGrass'
  | 'DustCloud'
  | 'PokemonShadow'
  | 'Surfing'
  | 'SurfingBubble'
  | 'Fishing'
  | 'FishingBubble';

export interface EncounterSlotJson {
  speciesId: number;
  rate: number;
  levelRange: { min: number; max: number };
  genderRatio: GenderRatio;
  hasHeldItem: boolean;
}

export interface EncounterLocationPayload {
  slots: EncounterSlotJson[];
}

export type GameVersion = 'B' | 'W' | 'B2' | 'W2';

export interface EncounterLocationsJson {
  version: GameVersion;
  method: EncounterMethodKey;
  source: { name: string; url: string; retrievedAt: string };
  locations: Record<string, EncounterLocationPayload>;
}

// ---------------------------------------------------------------------------
// Static encounter (fixed / event) types
// ---------------------------------------------------------------------------

export type StaticEncounterTypeKey =
  | 'StaticSymbol'
  | 'StaticStarter'
  | 'StaticFossil'
  | 'StaticEvent'
  | 'Roamer'
  | 'HiddenGrotto';

export interface EncounterSpeciesEntryJson {
  id: string;
  displayNameKey: string;
  speciesId: number;
  level: number;
  genderRatio: GenderRatio;
  isHiddenAbility?: boolean;
  isShinyLocked?: boolean;
}

export interface EncounterSpeciesJson {
  version: GameVersion;
  method: StaticEncounterTypeKey;
  source: { name: string; url: string; retrievedAt: string };
  entries: EncounterSpeciesEntryJson[];
}

// ---------------------------------------------------------------------------
// Compile-time subset constraints
// ---------------------------------------------------------------------------

// EncounterMethodKey / StaticEncounterTypeKey must be subsets of WASM EncounterType.
// If WASM adds/removes variants these lines will produce a compile error.
export type _AssertEncounterMethodSubset = EncounterMethodKey extends EncounterType ? true : never;
export type _AssertStaticEncounterSubset = StaticEncounterTypeKey extends EncounterType
  ? true
  : never;
