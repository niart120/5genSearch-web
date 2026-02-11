import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listEncounterLocations, listEncounterSpecies } from '@/data/encounters/helpers';
import { listLocations, getEncounterSlots } from '@/data/encounters/loader';
import type { EncounterSlotJson } from '@/data/encounters/schema';

vi.mock('@/data/encounters/loader');

const mockListLocations = vi.mocked(listLocations);
const mockGetEncounterSlots = vi.mocked(getEncounterSlots);

const makeSlot = (overrides: Partial<EncounterSlotJson> = {}): EncounterSlotJson => ({
  speciesId: 504,
  rate: 20,
  levelRange: { min: 2, max: 4 },
  genderRatio: 'F1M1',
  hasHeldItem: false,
  ...overrides,
});

describe('listEncounterLocations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns locations from loader', () => {
    const locations = [
      { key: 'route_1', displayNameKey: 'route_1' },
      { key: 'route_2', displayNameKey: 'route_2' },
    ];
    mockListLocations.mockReturnValue(locations);

    const result = listEncounterLocations('B', 'Normal');

    expect(result).toEqual(locations);
    expect(mockListLocations).toHaveBeenCalledWith('B', 'Normal');
  });

  it('returns empty array when no locations exist', () => {
    mockListLocations.mockReturnValue([]);

    const result = listEncounterLocations('B', 'DustCloud');

    expect(result).toEqual([]);
  });

  it('caches results for repeated calls', () => {
    const locations = [{ key: 'route_3', displayNameKey: 'route_3' }];
    mockListLocations.mockReturnValue(locations);

    const first = listEncounterLocations('W', 'Fishing');
    const second = listEncounterLocations('W', 'Fishing');

    expect(first).toBe(second);
    expect(mockListLocations).toHaveBeenCalledTimes(1);
  });
});

describe('listEncounterSpecies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates single species correctly', () => {
    mockGetEncounterSlots.mockReturnValue([makeSlot()]);

    const result = listEncounterSpecies('B', 'Normal', 'route_10');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
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

    const result = listEncounterSpecies('B', 'Normal', 'route_11');

    const species504 = result.find((s) => s.speciesId === 504);
    expect(species504).toEqual({
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

    const result = listEncounterSpecies('B', 'Normal', 'route_12');

    expect(result[0].minLevel).toBe(5);
    expect(result[0].maxLevel).toBe(20);
  });

  it('sorts by totalRate descending then speciesId ascending', () => {
    mockGetEncounterSlots.mockReturnValue([
      makeSlot({ speciesId: 506, rate: 10 }),
      makeSlot({ speciesId: 504, rate: 20 }),
      makeSlot({ speciesId: 508, rate: 20 }),
    ]);

    const result = listEncounterSpecies('B', 'Normal', 'route_13');

    expect(result.map((s) => s.speciesId)).toEqual([504, 508, 506]);
  });

  it('returns empty array when no slots found', () => {
    mockGetEncounterSlots.mockReturnValue(undefined as unknown as EncounterSlotJson[]);

    const result = listEncounterSpecies('B', 'Normal', 'route_14');

    expect(result).toEqual([]);
  });

  it('caches results for repeated calls', () => {
    mockGetEncounterSlots.mockReturnValue([makeSlot()]);

    const first = listEncounterSpecies('W', 'Normal', 'route_15');
    const second = listEncounterSpecies('W', 'Normal', 'route_15');

    expect(first).toBe(second);
    expect(mockGetEncounterSlots).toHaveBeenCalledTimes(1);
  });
});
