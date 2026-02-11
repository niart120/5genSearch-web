/**
 * Convert EncounterSlotJson[] to EncounterSlotConfig[] (WASM input format).
 */

import type { EncounterSlotConfig } from '../../wasm/wasm_pkg';
import type { EncounterSlotJson } from './schema';

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
