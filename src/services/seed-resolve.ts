/**
 * Seed 解決ユーティリティ
 *
 * SeedSpec を SeedOrigin[] に変換する共通ヘルパー。
 */

import { initMainThreadWasm } from './wasm-init';
import { resolve_seeds } from '@/wasm/wasm_pkg.js';
import type { SeedSpec, SeedOrigin } from '@/wasm/wasm_pkg.js';

/**
 * SeedSpec を SeedOrigin[] に変換する
 *
 * メインスレッドの WASM 初期化が必要。
 */
export async function resolveSeedOrigins(spec: SeedSpec): Promise<SeedOrigin[]> {
  await initMainThreadWasm();
  return resolve_seeds(spec);
}
