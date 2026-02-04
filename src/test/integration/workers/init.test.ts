/**
 * Worker 初期化テスト
 *
 * Browser Mode で実行される統合テスト。
 * Worker の初期化と WASM ロードが正常に動作することを検証する。
 */

import { describe, it, expect } from 'vitest';
import { testWorkerInitialization, getWasmBytes } from '../helpers/worker-test-utils';

describe('Worker Initialization', () => {
  it('should fetch WASM bytes successfully', async () => {
    const bytes = await getWasmBytes();

    expect(bytes).toBeInstanceOf(ArrayBuffer);
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it('should initialize CPU worker with WASM', async () => {
    const result = await testWorkerInitialization();

    expect(result).toBe(true);
  });

  it('should handle multiple worker initializations', async () => {
    // 複数の Worker を同時に初期化
    const results = await Promise.all([
      testWorkerInitialization(),
      testWorkerInitialization(),
      testWorkerInitialization(),
    ]);

    expect(results).toEqual([true, true, true]);
  });
});
