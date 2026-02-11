/**
 * Encounter slot JSON schema types.
 *
 * These types define the shape of the generated encounter JSON files
 * produced by `scripts/scrape-encounters.js`.
 */

export interface EncounterSlotJson {
  speciesId: number;
  rate: number;
  levelRange: { min: number; max: number };
  genderRatio: string;
  hasHeldItem: boolean;
}

export interface EncounterLocationPayload {
  displayNameKey: string;
  slots: EncounterSlotJson[];
}

export type GameVersion = 'B' | 'W' | 'B2' | 'W2';

export interface EncounterLocationsJson {
  version: GameVersion;
  method: string;
  source: { name: string; url: string; retrievedAt: string };
  locations: Record<string, EncounterLocationPayload>;
}
