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

/** IV/ステータス表示モード */
export type StatDisplayMode = 'stats' | 'ivs';

/** タマゴ生成フォーム状態 */
export interface EggGenerationFormState {
  seedInputMode: SeedInputMode;
  seedOrigins: SeedOrigin[];
  eggParams: EggGenerationParams;
  genConfig: Pick<GenerationConfig, 'user_offset' | 'max_advance'>;
  filter: EggFilter | undefined;
  statsFilter: StatsFixedValues | undefined;
  speciesId: number | undefined;
}

/** バリデーションエラーコード */
export type EggGenerationValidationErrorCode =
  | 'SEEDS_EMPTY'
  | 'ADVANCE_RANGE_INVALID'
  | 'OFFSET_NEGATIVE'
  | 'IV_OUT_OF_RANGE';

/** バリデーション結果 */
export interface EggGenerationValidationResult {
  errors: EggGenerationValidationErrorCode[];
  isValid: boolean;
}

/**
 * IV 値が範囲内か検証 (0-31 または 32 = 不明)
 */
function isIvValid(value: number): boolean {
  return (value >= 0 && value <= 31) || value === 32;
}

export function validateEggGenerationForm(
  form: EggGenerationFormState
): EggGenerationValidationResult {
  const errors: EggGenerationValidationErrorCode[] = [];

  if (form.seedOrigins.length === 0) {
    errors.push('SEEDS_EMPTY');
  }
  if (form.genConfig.user_offset < 0) {
    errors.push('OFFSET_NEGATIVE');
  }
  if (form.genConfig.max_advance < form.genConfig.user_offset) {
    errors.push('ADVANCE_RANGE_INVALID');
  }

  // 親個体値の範囲チェック
  const maleIvs = Object.values(form.eggParams.parent_male);
  const femaleIvs = Object.values(form.eggParams.parent_female);
  if (!maleIvs.every(isIvValid) || !femaleIvs.every(isIvValid)) {
    errors.push('IV_OUT_OF_RANGE');
  }

  return { errors, isValid: errors.length === 0 };
}
