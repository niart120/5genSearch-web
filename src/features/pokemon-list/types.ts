import type {
  GenerationConfig,
  PokemonFilter,
  SeedOrigin,
  EncounterType,
  EncounterMethod,
  EncounterSlotConfig,
  LeadAbilityEffect,
} from '../../wasm/wasm_pkg.js';
import { validateGenConfig } from '@/lib/validation';
import { isIntegerRangeValid, isIvFilterRangeValid } from '@/lib/range-validation';
import type { EncounterSpeciesOption } from '@/data/encounters/helpers';
import type { SeedInputMode } from '@/components/forms/seed-input-section';

/** PokemonParamsForm が親に報告するエンカウントパラメータ集約 */
export interface EncounterParamsOutput {
  encounterType: EncounterType;
  encounterMethod: EncounterMethod;
  locationKey: string;
  staticEntryId: string;
  slots: EncounterSlotConfig[];
  slotsContextKey?: string;
  leadAbility: LeadAbilityEffect;
  availableSpecies: EncounterSpeciesOption[];
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
}

/** DEFAULT_ENCOUNTER_PARAMS の初期値 */
export const DEFAULT_ENCOUNTER_PARAMS: EncounterParamsOutput = {
  encounterType: 'Normal',
  encounterMethod: 'Stationary',
  locationKey: '',
  staticEntryId: '',
  slots: [],
  leadAbility: 'None',
  availableSpecies: [],
  genConfig: { user_offset: 0, max_advance: 30 },
};

/** 候補は永続化せず、復元時も現在のデータから取得し直す。 */
export function clearEncounterCandidates(params: EncounterParamsOutput): EncounterParamsOutput {
  return { ...params, slots: [], slotsContextKey: undefined, availableSpecies: [] };
}

/** ポケモンリスト生成フォーム状態 */
export interface PokemonListFormState {
  seedInputMode: SeedInputMode;
  seedOrigins: SeedOrigin[];
  encounterType: EncounterType;
  encounterMethod: EncounterMethod;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  filter: PokemonFilter | undefined;
}

/** バリデーションエラーコード */
export type PokemonListValidationErrorCode =
  | 'SEEDS_EMPTY'
  | 'ENCOUNTER_SLOTS_EMPTY'
  | 'ADVANCE_RANGE_INVALID'
  | 'OFFSET_NEGATIVE'
  | 'IV_RANGE_INVALID'
  | 'LEVEL_RANGE_INVALID'
  | 'SEEDS_INVALID';

/** バリデーション結果 */
export interface PokemonListValidationResult {
  errors: PokemonListValidationErrorCode[];
  isValid: boolean;
}

export function validatePokemonListForm(
  form: PokemonListFormState,
  hasSlots: boolean
): PokemonListValidationResult {
  const errors: PokemonListValidationErrorCode[] = [];

  if (form.seedOrigins.length === 0) {
    errors.push('SEEDS_EMPTY');
  }
  if (!hasSlots) {
    errors.push('ENCOUNTER_SLOTS_EMPTY');
  }
  errors.push(...validateGenConfig(form.genConfig));
  if (!isIvFilterRangeValid(form.filter?.iv)) errors.push('IV_RANGE_INVALID');
  const level = form.filter?.level_range;
  if (level && !isIntegerRangeValid(level[0], level[1], 1, 100)) errors.push('LEVEL_RANGE_INVALID');

  return { errors, isValid: errors.length === 0 };
}
