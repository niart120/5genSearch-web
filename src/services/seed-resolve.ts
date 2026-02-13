/**
 * Seed 解決ユーティリティ
 *
 * SeedSpec を SeedOrigin[] に変換する共通ヘルパー。
 */

import { resolve_seeds } from '@/wasm/wasm_pkg.js';
import type { SeedSpec, SeedOrigin } from '@/wasm/wasm_pkg.js';

/**
 * SeedSpec を SeedOrigin[] に変換する
 */
export function resolveSeedOrigins(spec: SeedSpec): SeedOrigin[] {
  return resolve_seeds(spec);
}
