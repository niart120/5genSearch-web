/**
 * Worker 初期化テスト
 *
 * Browser Mode で実行される統合テスト。
 * Worker の初期化と WASM ロードが正常に動作することを検証する。
 */

import { describe, it, expect } from 'vitest';
import { testWorkerInitialization } from '../helpers/worker-test-utils';

describe('Worker Initialization', () => {
  it('should initialize multiple workers in parallel', async () => {
    const results = await Promise.all([
      testWorkerInitialization(),
      testWorkerInitialization(),
      testWorkerInitialization(),
    ]);

    expect(results).toEqual([true, true, true]);
  });
});
