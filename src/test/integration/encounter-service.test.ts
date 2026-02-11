import { describe, it, expect } from 'vitest';
import {
  getEncounterSlots,
  listLocations as listLocationsFromLoader,
  listStaticEncounterEntries,
} from '@/data/encounters/loader';
import {
  toEncounterSlotConfigs,
  toEncounterSlotConfigFromEntry,
} from '@/data/encounters/converter';
import { listLocations, listSpecies, isLocationBasedEncounter } from '@/data/encounters/helpers';

describe('Encounter Service Integration', () => {
  describe('registry initialization', () => {
    it('loads wild encounter JSON via import.meta.glob', () => {
      const locations = listLocationsFromLoader('B', 'Normal');
      expect(locations.length).toBeGreaterThan(0);
    });

    it('loads all four game versions for wild encounters', () => {
      for (const version of ['B', 'W', 'B2', 'W2'] as const) {
        const locations = listLocationsFromLoader(version, 'Normal');
        expect(locations.length).toBeGreaterThan(0);
      }
    });

    it('loads static encounter JSON for StaticSymbol', () => {
      for (const version of ['B', 'W', 'B2', 'W2'] as const) {
        const entries = listStaticEncounterEntries(version, 'StaticSymbol');
        expect(entries.length).toBeGreaterThan(0);
      }
    });

    it('loads static encounter JSON for StaticStarter', () => {
      for (const version of ['B', 'W', 'B2', 'W2'] as const) {
        const entries = listStaticEncounterEntries(version, 'StaticStarter');
        expect(entries).toHaveLength(3);
      }
    });

    it('loads static encounter JSON for StaticFossil', () => {
      for (const version of ['B', 'W', 'B2', 'W2'] as const) {
        const entries = listStaticEncounterEntries(version, 'StaticFossil');
        expect(entries.length).toBeGreaterThan(0);
      }
    });

    it('loads Roamer data only for B and W', () => {
      for (const version of ['B', 'W'] as const) {
        const entries = listStaticEncounterEntries(version, 'Roamer');
        expect(entries).toHaveLength(1);
      }
      for (const version of ['B2', 'W2'] as const) {
        const entries = listStaticEncounterEntries(version, 'Roamer');
        expect(entries).toHaveLength(0);
      }
    });
  });

  describe('getEncounterSlots', () => {
    it('returns slots for a known location', () => {
      const locations = listLocationsFromLoader('B', 'Normal');
      expect(locations.length).toBeGreaterThan(0);

      const firstLoc = locations[0];
      const slots = getEncounterSlots('B', firstLoc.key, 'Normal');
      expect(slots).toBeDefined();
      expect(slots!.length).toBeGreaterThan(0);
    });

    it('returns slots with valid structure', () => {
      const locations = listLocationsFromLoader('B', 'Normal');
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

  describe('PokemonShadow encounter data', () => {
    it('PokemonShadow is a valid location-based encounter method', () => {
      expect(isLocationBasedEncounter('PokemonShadow')).toBe(true);
    });

    it('listLocations returns array (possibly empty) for PokemonShadow', () => {
      for (const version of ['B', 'W', 'B2', 'W2'] as const) {
        const locations = listLocationsFromLoader(version, 'PokemonShadow');
        expect(Array.isArray(locations)).toBe(true);
      }
    });
  });

  describe('listLocations (loader)', () => {
    it('returns non-empty list for known version and method', () => {
      const locations = listLocationsFromLoader('B', 'Normal');
      expect(locations.length).toBeGreaterThan(0);

      for (const loc of locations) {
        expect(loc.key).toBeTypeOf('string');
        expect(loc.key.length).toBeGreaterThan(0);
        expect(loc.displayNameKey).toBeTypeOf('string');
        expect(loc.displayNameKey.length).toBeGreaterThan(0);
      }
    });

    it('returns empty list for unknown method', () => {
      const locations = listLocationsFromLoader('B', 'UnknownMethod');
      expect(locations).toEqual([]);
    });
  });

  describe('converter pipeline', () => {
    it('converts real JSON slots to WASM format (wild)', () => {
      const locations = listLocationsFromLoader('B', 'Normal');
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

    it('converts real static entry to WASM format', () => {
      const entries = listStaticEncounterEntries('B', 'StaticSymbol');
      expect(entries.length).toBeGreaterThan(0);

      const config = toEncounterSlotConfigFromEntry(entries[0]);
      expect(config.species_id).toBe(entries[0].speciesId);
      expect(config.level_min).toBe(entries[0].level);
      expect(config.level_max).toBe(entries[0].level);
      expect(config.gender_ratio).toBe(entries[0].genderRatio);
      expect(config.has_held_item).toBe(false);
    });
  });

  describe('unified helpers with real data', () => {
    it('listLocations returns location options for wild encounters', () => {
      const options = listLocations('B', 'Normal');
      expect(options.length).toBeGreaterThan(0);

      for (const opt of options) {
        expect(opt.key).toBeTypeOf('string');
        expect(opt.displayNameKey).toBeTypeOf('string');
      }
    });

    it('listSpecies aggregates wild species from real data', () => {
      const locations = listLocations('B', 'Normal');
      const firstLoc = locations[0];
      const species = listSpecies('B', 'Normal', firstLoc.key);
      expect(species.length).toBeGreaterThan(0);

      for (const sp of species) {
        expect(sp.kind).toBe('location');
        if (sp.kind === 'location') {
          expect(sp.speciesId).toBeGreaterThan(0);
          expect(sp.appearances).toBeGreaterThanOrEqual(1);
          expect(sp.totalRate).toBeGreaterThan(0);
          expect(sp.minLevel).toBeLessThanOrEqual(sp.maxLevel);
        }
      }
    });

    it('listSpecies returns static entries for StaticSymbol', () => {
      const species = listSpecies('B', 'StaticSymbol');
      expect(species.length).toBeGreaterThan(0);

      for (const sp of species) {
        expect(sp.kind).toBe('static');
        if (sp.kind === 'static') {
          expect(sp.id).toBeTypeOf('string');
          expect(sp.speciesId).toBeGreaterThan(0);
          expect(sp.level).toBeGreaterThan(0);
          expect(sp.genderRatio).toBeTypeOf('string');
        }
      }
    });

    it('isLocationBasedEncounter distinguishes wild from static', () => {
      expect(isLocationBasedEncounter('Normal')).toBe(true);
      expect(isLocationBasedEncounter('StaticSymbol')).toBe(false);
      expect(isLocationBasedEncounter('Roamer')).toBe(false);
    });
  });
});
