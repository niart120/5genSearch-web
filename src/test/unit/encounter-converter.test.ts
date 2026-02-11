import { describe, it, expect } from 'vitest';
import { toEncounterSlotConfigs } from '@/data/encounters/converter';
import type { EncounterSlotJson } from '@/data/encounters/schema';

describe('toEncounterSlotConfigs', () => {
  it('converts a single slot correctly', () => {
    const slots: EncounterSlotJson[] = [
      {
        speciesId: 504,
        rate: 20,
        levelRange: { min: 2, max: 4 },
        genderRatio: 'F1M1',
        hasHeldItem: false,
      },
    ];

    const result = toEncounterSlotConfigs(slots);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      species_id: 504,
      level_min: 2,
      level_max: 4,
      gender_ratio: 'F1M1',
      has_held_item: false,
      shiny_locked: false,
    });
  });

  it('converts multiple slots preserving order', () => {
    const slots: EncounterSlotJson[] = [
      {
        speciesId: 504,
        rate: 20,
        levelRange: { min: 2, max: 4 },
        genderRatio: 'F1M1',
        hasHeldItem: false,
      },
      {
        speciesId: 506,
        rate: 20,
        levelRange: { min: 2, max: 4 },
        genderRatio: 'F1M3',
        hasHeldItem: true,
      },
    ];

    const result = toEncounterSlotConfigs(slots);

    expect(result).toHaveLength(2);
    expect(result[0].species_id).toBe(504);
    expect(result[0].gender_ratio).toBe('F1M1');
    expect(result[1].species_id).toBe(506);
    expect(result[1].gender_ratio).toBe('F1M3');
    expect(result[1].has_held_item).toBe(true);
  });

  it('preserves all GenderRatio values', () => {
    const ratios: import('@/wasm/wasm_pkg').GenderRatio[] = [
      'Genderless',
      'MaleOnly',
      'FemaleOnly',
      'F1M7',
      'F1M3',
      'F1M1',
      'F3M1',
    ];

    for (const ratio of ratios) {
      const slots: EncounterSlotJson[] = [
        {
          speciesId: 1,
          rate: 100,
          levelRange: { min: 1, max: 1 },
          genderRatio: ratio,
          hasHeldItem: false,
        },
      ];

      const result = toEncounterSlotConfigs(slots);
      expect(result[0].gender_ratio).toBe(ratio);
    }
  });

  it('always sets shiny_locked to false', () => {
    const slots: EncounterSlotJson[] = [
      {
        speciesId: 1,
        rate: 100,
        levelRange: { min: 5, max: 10 },
        genderRatio: 'F1M1',
        hasHeldItem: false,
      },
    ];

    const result = toEncounterSlotConfigs(slots);
    expect(result[0].shiny_locked).toBe(false);
  });

  it('returns empty array for empty input', () => {
    const result = toEncounterSlotConfigs([]);
    expect(result).toEqual([]);
  });
});
