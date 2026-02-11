import type {
  GenerationConfig,
  PokemonFilter,
  SeedOrigin,
  EncounterType,
  EncounterMethod,
} from '../../wasm/wasm_pkg.js';

/** Seed 入力モード */
export type SeedInputMode = 'search-results' | 'manual-seeds' | 'manual-startup';

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
