import { describe, it, expect } from 'vitest';
import { getEncounterSlots, listLocations } from '@/data/encounters/loader';
import { toEncounterSlotConfigs } from '@/data/encounters/converter';
import { listEncounterLocations, listEncounterSpecies } from '@/data/encounters/helpers';

describe('Encounter Service Integration', () => {
  describe('registry initialization', () => {
    it('loads JSON via import.meta.glob', () => {
      const locations = listLocations('B', 'Normal');
      expect(locations.length).toBeGreaterThan(0);
    });

    it('loads all four game versions', () => {
      for (const version of ['B', 'W', 'B2', 'W2'] as const) {
        const locations = listLocations(version, 'Normal');
        expect(locations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getEncounterSlots', () => {
    it('returns slots for a known location', () => {
      const locations = listLocations('B', 'Normal');
      expect(locations.length).toBeGreaterThan(0);

      const firstLoc = locations[0];
      const slots = getEncounterSlots('B', firstLoc.key, 'Normal');
      expect(slots).toBeDefined();
      expect(slots!.length).toBeGreaterThan(0);
    });

    it('returns slots with valid structure', () => {
      const locations = listLocations('B', 'Normal');
      const firstLoc = locations[0];
      const slots = getEncounterSlots('B', firstLoc.key, 'Normal')!;

      for (const slot of slots) {
        expect(slot.speciesId).toBeTypeOf('number');
        expect(slot.rate).toBeTypeOf('number');
        expect(slot.levelRange.min).toBeTypeOf('number');
        expect(slot.levelRange.max).toBeTypeOf('number');
        expect(slot.levelRange.min).toBeLessThanOrEqual(slot.levelRange.max);
        expect(slot.genderRatio).toBeTypeOf('string');
        expect(slot.hasHeldItem).toBeTypeOf('boolean');
      }
    });

    it('returns undefined for unknown location', () => {
      const slots = getEncounterSlots('B', 'nonexistent_location', 'Normal');
      expect(slots).toBeUndefined();
    });
  });

  describe('listLocations', () => {
    it('returns non-empty list for known version and method', () => {
      const locations = listLocations('B', 'Normal');
      expect(locations.length).toBeGreaterThan(0);

      for (const loc of locations) {
        expect(loc.key).toBeTypeOf('string');
        expect(loc.key.length).toBeGreaterThan(0);
        expect(loc.displayNameKey).toBeTypeOf('string');
        expect(loc.displayNameKey.length).toBeGreaterThan(0);
      }
    });

    it('returns empty list for unknown method', () => {
      const locations = listLocations('B', 'UnknownMethod');
      expect(locations).toEqual([]);
    });
  });

  describe('converter pipeline', () => {
    it('converts real JSON slots to WASM format', () => {
      const locations = listLocations('B', 'Normal');
      const firstLoc = locations[0];
      const slots = getEncounterSlots('B', firstLoc.key, 'Normal')!;

      const configs = toEncounterSlotConfigs(slots);
      expect(configs).toHaveLength(slots.length);

      for (const [i, config] of configs.entries()) {
        expect(config.species_id).toBe(slots[i].speciesId);
        expect(config.level_min).toBe(slots[i].levelRange.min);
        expect(config.level_max).toBe(slots[i].levelRange.max);
        expect(config.gender_ratio).toBe(slots[i].genderRatio);
        expect(config.has_held_item).toBe(slots[i].hasHeldItem);
        expect(config.shiny_locked).toBe(false);
      }
    });
  });

  describe('helpers with real data', () => {
    it('listEncounterLocations returns location options', () => {
      const options = listEncounterLocations('B', 'Normal');
      expect(options.length).toBeGreaterThan(0);

      for (const opt of options) {
        expect(opt.key).toBeTypeOf('string');
        expect(opt.displayNameKey).toBeTypeOf('string');
      }
    });

    it('listEncounterSpecies aggregates species from real data', () => {
      const locations = listEncounterLocations('B', 'Normal');
      const firstLoc = locations[0];
      const species = listEncounterSpecies('B', 'Normal', firstLoc.key);
      expect(species.length).toBeGreaterThan(0);

      for (const sp of species) {
        expect(sp.speciesId).toBeTypeOf('number');
        expect(sp.speciesId).toBeGreaterThan(0);
        expect(sp.appearances).toBeGreaterThanOrEqual(1);
        expect(sp.totalRate).toBeGreaterThan(0);
        expect(sp.minLevel).toBeLessThanOrEqual(sp.maxLevel);
      }
    });
  });
});
