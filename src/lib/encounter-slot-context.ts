import type { EncounterType, EncounterSlotConfig, RomVersion } from '@/wasm/wasm_pkg.js';

interface EncounterSelection {
  encounterType: EncounterType;
  locationKey: string;
  staticEntryId: string;
}

export function encounterSlotKey(selection: EncounterSelection, version: RomVersion): string {
  return JSON.stringify([
    version,
    selection.encounterType,
    selection.locationKey,
    selection.staticEntryId,
  ]);
}

export function hasCurrentEncounterSlots(
  selection: EncounterSelection & { slots: EncounterSlotConfig[]; slotsContextKey?: string },
  version: RomVersion
): boolean {
  return (
    selection.slots.length > 0 && selection.slotsContextKey === encounterSlotKey(selection, version)
  );
}
