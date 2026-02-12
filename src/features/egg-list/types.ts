/**
 * タマゴ個体生成機能の型定義
 */

import type {
  EggGenerationParams,
  GenerationConfig,
  EggFilter,
  SeedOrigin,
} from '../../wasm/wasm_pkg.js';
import type { SeedInputMode } from '@/components/forms/seed-input-section';
import type { StatsFixedValues } from '@/components/forms/stats-fixed-input';
import { validateGenConfig, isIvValid } from '@/lib/validation';

/** タマゴ生成フォーム状態 */
export interface EggListFormState {
  seedInputMode: SeedInputMode;
  seedOrigins: SeedOrigin[];
  eggParams: EggGenerationParams;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  filter: EggFilter | undefined;
  statsFilter: StatsFixedValues | undefined;
  speciesId: number | undefined;
}

/** バリデーションエラーコード */
export type EggListValidationErrorCode =
  | 'SEEDS_EMPTY'
  | 'ADVANCE_RANGE_INVALID'
  | 'OFFSET_NEGATIVE'
  | 'IV_OUT_OF_RANGE';

/** バリデーション結果 */
export interface EggListValidationResult {
  errors: EggListValidationErrorCode[];
  isValid: boolean;
}

export function validateEggListForm(
  form: EggListFormState
): EggListValidationResult {
  const errors: EggListValidationErrorCode[] = [];

  if (form.seedOrigins.length === 0) {
    errors.push('SEEDS_EMPTY');
  }
  errors.push(...validateGenConfig(form.genConfig));

  // 親個体値の範囲チェック
  const maleIvs = Object.values(form.eggParams.parent_male);
  const femaleIvs = Object.values(form.eggParams.parent_female);
  if (!maleIvs.every((v) => isIvValid(v)) || !femaleIvs.every((v) => isIvValid(v))) {
    errors.push('IV_OUT_OF_RANGE');
  }

  return { errors, isValid: errors.length === 0 };
}
