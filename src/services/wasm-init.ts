/**
 * メインスレッド WASM 初期化 (シングルトン)
 *
 * メインスレッドで WASM 関数を呼ぶ前に await する。
 * Worker 内の初期化とは独立 — Worker は各自で initWasm を呼ぶ。
 */

import initWasm from '../wasm/wasm_pkg.js';

const WASM_URL = '/wasm/wasm_pkg_bg.wasm';

let initPromise: Promise<void> | undefined;

/**
 * メインスレッドで WASM を初期化する。
 *
 * 複数回呼び出しても初回のみ実行される (冪等)。
 * メインスレッドで WASM 関数を呼ぶ前に必ず await すること。
 */
export function initMainThreadWasm(): Promise<void> {
  if (initPromise === undefined) {
    initPromise = initWasm({ module_or_path: WASM_URL }).then(() => {});
  }
  return initPromise;
}
