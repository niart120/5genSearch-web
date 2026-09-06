import type {
  EggFilter,
  EggGenerationParams,
  EncounterSlotConfig,
  EncounterType,
  IvFilter,
  PokemonFilter,
  PokemonDatetimeSearchFilter,
  StatsFilter,
} from '@/wasm/wasm_pkg.js';
import { IV_STAT_KEYS, type StatDisplayMode } from './game-data-names';

export type IvStatKey = (typeof IV_STAT_KEYS)[number];
export interface IvFilterInput extends IvFilter {
  enabledStats?: Partial<Record<IvStatKey, boolean>>;
  powerEnabled?: boolean;
}
export interface PokemonFilterInput extends PokemonFilter {
  iv: IvFilterInput | undefined;
  enabled?: boolean;
  levelEnabled?: boolean;
}
export interface PokemonSearchFilterInput extends PokemonDatetimeSearchFilter {
  levelEnabled?: boolean;
}
export interface EggFilterInput extends EggFilter {
  iv: IvFilterInput | undefined;
  enabled?: boolean;
  marginEnabled?: boolean;
}

export const DEFAULT_IV_RANGES: IvFilter = {
  hp: [0, 31],
  atk: [0, 31],
  def: [0, 31],
  spa: [0, 31],
  spd: [0, 31],
  spe: [0, 31],
};

export function isIvRangeEnabled(iv: IvFilterInput, key: IvStatKey): boolean {
  return iv.enabledStats?.[key] ?? !(iv[key][0] === 0 && iv[key][1] >= 31);
}

export function normalizeIvFilter(iv?: IvFilterInput): IvFilter | undefined {
  if (!iv) return;
  const result: IvFilter = {
    ...DEFAULT_IV_RANGES,
    hidden_power_types: iv.hidden_power_types?.length ? iv.hidden_power_types : undefined,
    hidden_power_min_power:
      (iv.powerEnabled ?? iv.hidden_power_min_power !== undefined)
        ? iv.hidden_power_min_power
        : undefined,
  };
  for (const key of IV_STAT_KEYS) {
    result[key] = isIvRangeEnabled(iv, key) ? [iv[key][0], Math.min(31, iv[key][1])] : [0, 31];
  }
  return IV_STAT_KEYS.some((key) => result[key][0] !== 0 || result[key][1] !== 31) ||
    result.hidden_power_types ||
    result.hidden_power_min_power !== undefined
    ? result
    : undefined;
}

export interface PokemonFilterContext {
  encounterType: EncounterType;
  slots: EncounterSlotConfig[];
}

export function getPokemonFilterVisibility(
  context: PokemonFilterContext,
  result?: PokemonFilter['encounter_result_filter']
) {
  const type = context.encounterType;
  const fixed = ['StaticSymbol', 'StaticStarter', 'StaticFossil', 'StaticEvent', 'Roamer'].includes(
    type
  );
  const itemResult = type === 'DustCloud' || type === 'PokemonShadow';
  const encounterResult = itemResult || type === 'Fishing';
  const appliedResult =
    encounterResult && (result !== 'ItemOnly' || itemResult) ? result : undefined;
  const pokemon = appliedResult !== 'ItemOnly';
  const slot = context.slots.length === 1 ? context.slots[0] : undefined;
  return {
    pokemon,
    species: pokemon && !fixed && type !== 'HiddenGrotto',
    level: pokemon && !fixed,
    gender:
      pokemon &&
      !(fixed && slot && ['Genderless', 'MaleOnly', 'FemaleOnly'].includes(slot.gender_ratio)),
    ability: pokemon && type !== 'HiddenGrotto',
    shiny:
      pokemon && !(fixed && context.slots.length > 0 && context.slots.every((s) => s.shiny_locked)),
    encounterResult,
    special: [
      'ShakingGrass',
      'DustCloud',
      'PokemonShadow',
      'SurfingBubble',
      'FishingBubble',
    ].includes(type),
    appliedResult,
  };
}

export function normalizePokemonSearchFilter(
  input: Partial<PokemonSearchFilterInput>,
  context: PokemonFilterContext
): PokemonDatetimeSearchFilter {
  const visible = getPokemonFilterVisibility(context);
  return {
    species_ids: visible.species ? input.species_ids : undefined,
    level_range:
      visible.level && (input.levelEnabled ?? input.level_range !== undefined)
        ? input.level_range
        : undefined,
    gender: visible.gender ? input.gender : undefined,
    ability_slot:
      visible.ability && input.ability_slot !== 'Hidden' ? input.ability_slot : undefined,
    shiny: visible.shiny ? input.shiny : undefined,
    natures: input.natures,
  };
}

export function normalizePokemonFilter(
  input: Partial<PokemonFilterInput> | undefined,
  stats: StatsFilter | undefined,
  context: PokemonFilterContext,
  mode: StatDisplayMode
): PokemonFilter | undefined {
  if (input?.enabled === false) return;
  const visible = getPokemonFilterVisibility(context, input?.encounter_result_filter);
  const attributes = normalizePokemonSearchFilter(input ?? {}, context);
  const result: PokemonFilter = {
    ...attributes,
    iv: visible.pokemon && mode === 'ivs' ? normalizeIvFilter(input?.iv) : undefined,
    stats: visible.pokemon && mode === 'stats' ? stats : undefined,
    held_item_slots: undefined,
    encounter_result_filter: visible.appliedResult,
    special_encounter_triggered: visible.special ? input?.special_encounter_triggered : undefined,
  };
  if (!visible.pokemon) {
    result.species_ids = undefined;
    result.level_range = undefined;
    result.gender = undefined;
    result.ability_slot = undefined;
    result.shiny = undefined;
    result.natures = undefined;
  }
  return Object.values(result).some((v) => v !== undefined) ? result : undefined;
}

export function getEggFilterVisibility(params: EggGenerationParams, mode?: StatDisplayMode) {
  return {
    hiddenAbility: !params.uses_ditto && params.female_ability_slot === 'Hidden',
    margin: params.consider_npc,
    iv: mode !== 'stats',
    stats: mode === 'stats' && params.species_id !== undefined,
  };
}

export function normalizeEggFilter(
  input: Partial<EggFilterInput> | undefined,
  stats: StatsFilter | undefined,
  params: EggGenerationParams,
  mode?: StatDisplayMode
): EggFilter | undefined {
  if (input?.enabled === false) return;
  const visible = getEggFilterVisibility(params, mode);
  const result: EggFilter = {
    iv: visible.iv ? normalizeIvFilter(input?.iv) : undefined,
    stats: visible.stats ? stats : undefined,
    natures: input?.natures,
    gender: input?.gender,
    ability_slot:
      input?.ability_slot === 'Hidden' && !visible.hiddenAbility ? undefined : input?.ability_slot,
    shiny: input?.shiny,
    min_margin_frames:
      visible.margin && (input?.marginEnabled ?? input?.min_margin_frames !== undefined)
        ? input?.min_margin_frames
        : undefined,
  };
  return Object.values(result).some((v) => v !== undefined) ? result : undefined;
}
