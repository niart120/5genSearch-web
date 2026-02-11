import { describe, it, expect } from 'vitest';
import { toEncounterSlotConfigFromEntry } from '@/data/encounters/converter';
import type { EncounterSpeciesEntryJson } from '@/data/encounters/schema';

const makeEntry = (
  overrides: Partial<EncounterSpeciesEntryJson> = {}
): EncounterSpeciesEntryJson => ({
  id: 'reshiram-n-castle',
  displayNameKey: 'reshiram_n_castle',
  speciesId: 643,
  level: 50,
  genderRatio: 'Genderless',
  ...overrides,
});

describe('toEncounterSlotConfigFromEntry', () => {
  it('sets level_min and level_max to the same value', () => {
    const result = toEncounterSlotConfigFromEntry(makeEntry({ level: 42 }));

    expect(result.level_min).toBe(42);
    expect(result.level_max).toBe(42);
  });

  it('passes through genderRatio from the entry', () => {
    const result = toEncounterSlotConfigFromEntry(makeEntry({ genderRatio: 'F1M7' }));

    expect(result.gender_ratio).toBe('F1M7');
  });

  it('passes through Genderless ratio', () => {
    const result = toEncounterSlotConfigFromEntry(makeEntry({ genderRatio: 'Genderless' }));

    expect(result.gender_ratio).toBe('Genderless');
  });

  it('defaults shiny_locked to false when not specified', () => {
    const entry = makeEntry();
    delete entry.isShinyLocked;

    const result = toEncounterSlotConfigFromEntry(entry);

    expect(result.shiny_locked).toBe(false);
  });

  it('sets shiny_locked to true when entry specifies it', () => {
    const result = toEncounterSlotConfigFromEntry(makeEntry({ isShinyLocked: true }));

    expect(result.shiny_locked).toBe(true);
  });

  it('sets has_held_item to false', () => {
    const result = toEncounterSlotConfigFromEntry(makeEntry());

    expect(result.has_held_item).toBe(false);
  });

  it('maps speciesId to species_id', () => {
    const result = toEncounterSlotConfigFromEntry(makeEntry({ speciesId: 638 }));

    expect(result.species_id).toBe(638);
  });
});
