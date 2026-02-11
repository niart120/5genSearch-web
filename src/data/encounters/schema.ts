/**
 * Encounter slot JSON schema types.
 *
 * These types define the shape of the generated encounter JSON files
 * produced by `scripts/scrape-encounters.js`.
 */

import type { GenderRatio } from '../../wasm/wasm_pkg';

export type EncounterMethodKey =
  | 'Normal'
  | 'ShakingGrass'
  | 'DustCloud'
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
