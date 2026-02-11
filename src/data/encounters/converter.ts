/**
 * Convert EncounterSlotJson[] to EncounterSlotConfig[] (WASM input format).
 */

import type { EncounterSlotConfig, GenderRatio } from '../../wasm/wasm_pkg';
import type { EncounterSlotJson } from './schema';

const GENDER_RATIO_MAP: Record<string, GenderRatio> = {
  Genderless: 'Genderless',
  MaleOnly: 'MaleOnly',
  FemaleOnly: 'FemaleOnly',
  F1M7: 'F1M7',
  F1M3: 'F1M3',
  F1M1: 'F1M1',
  F3M1: 'F3M1',
};

function toGenderRatio(value: string): GenderRatio {
  return GENDER_RATIO_MAP[value] ?? 'F1M1';
}

/**
 * Convert an array of JSON encounter slots to WASM EncounterSlotConfig[].
 */
export function toEncounterSlotConfigs(slots: EncounterSlotJson[]): EncounterSlotConfig[] {
  return slots.map((slot) => ({
    species_id: slot.speciesId,
    level_min: slot.levelRange.min,
    level_max: slot.levelRange.max,
    gender_ratio: toGenderRatio(slot.genderRatio),
    has_held_item: slot.hasHeldItem,
    shiny_locked: false,
  }));
}
