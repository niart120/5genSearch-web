/**
 * Convert encounter data to WASM EncounterSlotConfig format.
 */

import type { EncounterSlotConfig } from '../../wasm/wasm_pkg';
import type { EncounterSlotJson, EncounterSpeciesEntryJson } from './schema';

/**
 * Convert an array of JSON encounter slots to WASM EncounterSlotConfig[].
 */
export function toEncounterSlotConfigs(slots: EncounterSlotJson[]): EncounterSlotConfig[] {
  return slots.map((slot) => ({
    species_id: slot.speciesId,
    level_min: slot.levelRange.min,
    level_max: slot.levelRange.max,
    gender_ratio: slot.genderRatio,
    has_held_item: slot.hasHeldItem,
    shiny_locked: false,
  }));
}

/**
 * Convert a single static encounter entry to a WASM EncounterSlotConfig.
 *
 * Static encounters always have level_min == level_max and no held item.
 * genderRatio is passed through from the JSON entry.
 */
export function toEncounterSlotConfigFromEntry(
  entry: EncounterSpeciesEntryJson
): EncounterSlotConfig {
  return {
    species_id: entry.speciesId,
    level_min: entry.level,
    level_max: entry.level,
    gender_ratio: entry.genderRatio,
    has_held_item: false,
    shiny_locked: entry.isShinyLocked ?? false,
  };
}
