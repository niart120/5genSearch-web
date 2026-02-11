import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isLocationBasedEncounter, listLocations, listSpecies } from '@/data/encounters/helpers';
import {
  listLocations as listLocationsFromRegistry,
  getEncounterSlots,
  listStaticEncounterEntries,
} from '@/data/encounters/loader';
import type { EncounterSlotJson, EncounterSpeciesEntryJson } from '@/data/encounters/schema';

vi.mock('@/data/encounters/loader');

const mockListLocations = vi.mocked(listLocationsFromRegistry);
const mockGetEncounterSlots = vi.mocked(getEncounterSlots);
const mockListStaticEntries = vi.mocked(listStaticEncounterEntries);

const makeSlot = (overrides: Partial<EncounterSlotJson> = {}): EncounterSlotJson => ({
  speciesId: 504,
  rate: 20,
  levelRange: { min: 2, max: 4 },
  genderRatio: 'F1M1',
  hasHeldItem: false,
  ...overrides,
});

const makeStaticEntry = (
  overrides: Partial<EncounterSpeciesEntryJson> = {}
): EncounterSpeciesEntryJson => ({
  id: 'reshiram-n-castle',
  displayNameKey: 'reshiram_n_castle',
  speciesId: 643,
  level: 50,
  genderRatio: 'Genderless',
  ...overrides,
});

describe('isLocationBasedEncounter', () => {
  it('returns true for all EncounterMethodKey values', () => {
    const wildMethods = [
      'Normal',
      'ShakingGrass',
      'DustCloud',
      'PokemonShadow',
      'Surfing',
      'SurfingBubble',
      'Fishing',
      'FishingBubble',
    ] as const;

    for (const method of wildMethods) {
      expect(isLocationBasedEncounter(method)).toBe(true);
    }
  });

  it('returns false for all StaticEncounterTypeKey values', () => {
    const staticTypes = [
      'StaticSymbol',
      'StaticStarter',
      'StaticFossil',
      'StaticEvent',
      'Roamer',
      'HiddenGrotto',
    ] as const;

    for (const method of staticTypes) {
      expect(isLocationBasedEncounter(method)).toBe(false);
    }
  });
});

describe('listLocations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns locations from loader', () => {
    const locations = [
      { key: 'route_1', displayNameKey: 'route_1' },
      { key: 'route_2', displayNameKey: 'route_2' },
    ];
    mockListLocations.mockReturnValue(locations);

    const result = listLocations('B', 'Normal');

    expect(result).toEqual(locations);
    expect(mockListLocations).toHaveBeenCalledWith('B', 'Normal');
  });

  it('returns empty array when no locations exist', () => {
    mockListLocations.mockReturnValue([]);

    const result = listLocations('B', 'DustCloud');

    expect(result).toEqual([]);
  });

  it('caches results for repeated calls', () => {
    const locations = [{ key: 'route_3', displayNameKey: 'route_3' }];
    mockListLocations.mockReturnValue(locations);

    const first = listLocations('W', 'Fishing');
    const second = listLocations('W', 'Fishing');

    expect(first).toBe(second);
    expect(mockListLocations).toHaveBeenCalledTimes(1);
  });
});

describe('listSpecies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates single species correctly (location)', () => {
    mockGetEncounterSlots.mockReturnValue([makeSlot()]);

    const result = listSpecies('B', 'Normal', 'route_10');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      kind: 'location',
      speciesId: 504,
      firstSlotIndex: 0,
      appearances: 1,
      totalRate: 20,
      minLevel: 2,
      maxLevel: 4,
    });
  });

  it('sums rates and counts appearances for duplicate species', () => {
    mockGetEncounterSlots.mockReturnValue([
      makeSlot({ speciesId: 504, rate: 20, levelRange: { min: 2, max: 4 } }),
      makeSlot({ speciesId: 506, rate: 10, levelRange: { min: 3, max: 5 } }),
      makeSlot({ speciesId: 504, rate: 10, levelRange: { min: 5, max: 7 } }),
    ]);

    const result = listSpecies('B', 'Normal', 'route_11');

    const species504 = result.find((s) => s.kind === 'location' && s.speciesId === 504);
    expect(species504).toEqual({
      kind: 'location',
      speciesId: 504,
      firstSlotIndex: 0,
      appearances: 2,
      totalRate: 30,
      minLevel: 2,
      maxLevel: 7,
    });
  });

  it('computes min/max level range across appearances', () => {
    mockGetEncounterSlots.mockReturnValue([
      makeSlot({ speciesId: 504, levelRange: { min: 10, max: 15 } }),
      makeSlot({ speciesId: 504, levelRange: { min: 5, max: 20 } }),
      makeSlot({ speciesId: 504, levelRange: { min: 8, max: 12 } }),
    ]);

    const result = listSpecies('B', 'Normal', 'route_12');

    const opt = result[0];
    expect(opt.kind).toBe('location');
    if (opt.kind === 'location') {
      expect(opt.minLevel).toBe(5);
      expect(opt.maxLevel).toBe(20);
    }
  });

  it('sorts by totalRate descending then speciesId ascending', () => {
    mockGetEncounterSlots.mockReturnValue([
      makeSlot({ speciesId: 506, rate: 10 }),
      makeSlot({ speciesId: 504, rate: 20 }),
      makeSlot({ speciesId: 508, rate: 20 }),
    ]);

    const result = listSpecies('B', 'Normal', 'route_13');

    expect(result.map((s) => (s.kind === 'location' ? s.speciesId : -1))).toEqual([504, 508, 506]);
  });

  it('returns empty array when no slots found', () => {
    mockGetEncounterSlots.mockReturnValue(undefined as unknown as EncounterSlotJson[]);

    const result = listSpecies('B', 'Normal', 'route_14');

    expect(result).toEqual([]);
  });

  it('caches results for repeated calls (location)', () => {
    mockGetEncounterSlots.mockReturnValue([makeSlot()]);

    const first = listSpecies('W', 'Normal', 'route_15');
    const second = listSpecies('W', 'Normal', 'route_15');

    expect(first).toBe(second);
    expect(mockGetEncounterSlots).toHaveBeenCalledTimes(1);
  });

  it('returns static entries with kind: static', () => {
    mockListStaticEntries.mockReturnValue([
      makeStaticEntry({ id: 'reshiram-n-castle', speciesId: 643, level: 50 }),
      makeStaticEntry({ id: 'cobalion-guidance', speciesId: 638, level: 42 }),
    ]);

    const result = listSpecies('B', 'StaticSymbol');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      kind: 'static',
      id: 'reshiram-n-castle',
      speciesId: 643,
      level: 50,
      genderRatio: 'Genderless',
    });
  });

  it('returns empty array for static type with no data', () => {
    mockListStaticEntries.mockReturnValue([]);

    const result = listSpecies('B', 'StaticEvent');

    expect(result).toEqual([]);
  });

  it('caches results for repeated calls (static)', () => {
    mockListStaticEntries.mockReturnValue([makeStaticEntry()]);

    const first = listSpecies('W', 'StaticFossil');
    const second = listSpecies('W', 'StaticFossil');

    expect(first).toBe(second);
    expect(mockListStaticEntries).toHaveBeenCalledTimes(1);
  });

  it('includes isShinyLocked in static entries', () => {
    mockListStaticEntries.mockReturnValue([makeStaticEntry({ isShinyLocked: true })]);

    const result = listSpecies('B2', 'StaticSymbol');

    expect(result[0].kind).toBe('static');
    if (result[0].kind === 'static') {
      expect(result[0].isShinyLocked).toBe(true);
    }
  });
});
