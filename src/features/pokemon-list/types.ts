import type {
  GenerationConfig,
  PokemonFilter,
  SeedOrigin,
  EncounterType,
  EncounterMethod,
  EncounterSlotConfig,
  LeadAbilityEffect,
} from '../../wasm/wasm_pkg.js';
import type { EncounterSpeciesOption } from '@/data/encounters/helpers';

/** Seed 入力モード */
export type SeedInputMode = 'search-results' | 'manual-seeds' | 'manual-startup';

/** PokemonParamsForm が親に報告するエンカウントパラメータ集約 */
export interface EncounterParamsOutput {
  encounterType: EncounterType;
  encounterMethod: EncounterMethod;
  slots: EncounterSlotConfig[];
  leadAbility: LeadAbilityEffect;
  availableSpecies: EncounterSpeciesOption[];
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
}

/** EncounterParamsOutput の初期値 */
export const DEFAULT_ENCOUNTER_PARAMS: EncounterParamsOutput = {
  encounterType: 'Normal',
  encounterMethod: 'Stationary',
  slots: [],
  leadAbility: 'None',
  availableSpecies: [],
  genConfig: { user_offset: 0, max_advance: 100 },
};

/** ステータスフィルター (クライアントサイド post-filter, 固定値指定) */
export interface StatsFilter {
  hp: number | undefined;
  atk: number | undefined;
  def: number | undefined;
  spa: number | undefined;
  spd: number | undefined;
  spe: number | undefined;
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
  if (form.genConfig.user_offset < 0) {
    errors.push('OFFSET_NEGATIVE');
  }
  if (form.genConfig.max_advance < form.genConfig.user_offset) {
    errors.push('ADVANCE_RANGE_INVALID');
  }

  return { errors, isValid: errors.length === 0 };
}
