/**
 * search-tasks — splitOrigins / タスク生成関数のユニットテスト
 */

import { describe, it, expect, vi } from 'vitest';

// search-tasks.ts が WASM モジュールを import するためモック
vi.mock('@/wasm/wasm_pkg.js', () => ({}));

import { splitOrigins, createPokemonListTasks, createEggListTasks } from '@/services/search-tasks';
import type { SeedOrigin } from '@/wasm/wasm_pkg.js';

/** テスト用のダミー SeedOrigin を生成 */
function dummyOrigins(count: number): SeedOrigin[] {
  return Array.from({ length: count }, (_, i) => ({
    // SeedOrigin は Startup variant を持つ enum-like オブジェクト
    // ユニットテストではタスク分割ロジックのみ検証するため、構造は簡略化
    Startup: { mt_seed: i, datetime: '', timer0: 0, vcount: 0 },
  })) as unknown as SeedOrigin[];
}

// =============================================================================
// splitOrigins
// =============================================================================

describe('splitOrigins', () => {
  it('10 origins / 4 workers → [3, 3, 3, 1]', () => {
    const origins = dummyOrigins(10);
    const chunks = splitOrigins(origins, 4);
    expect(chunks).toHaveLength(4);
    expect(chunks.map((c) => c.length)).toEqual([3, 3, 3, 1]);
  });

  it('origins < workers → origins 数分のチャンク', () => {
    const origins = dummyOrigins(2);
    const chunks = splitOrigins(origins, 8);
    expect(chunks).toHaveLength(2);
    expect(chunks.every((c) => c.length === 1)).toBe(true);
  });

  it('空配列 → 空', () => {
    const chunks = splitOrigins([], 4);
    expect(chunks).toHaveLength(0);
  });

  it('origins === workers → 1件ずつ', () => {
    const origins = dummyOrigins(4);
    const chunks = splitOrigins(origins, 4);
    expect(chunks).toHaveLength(4);
    expect(chunks.every((c) => c.length === 1)).toBe(true);
  });

  it('全 origins の合計が元の件数と一致する', () => {
    const origins = dummyOrigins(17);
    const chunks = splitOrigins(origins, 5);
    const totalItems = chunks.reduce((sum, c) => sum + c.length, 0);
    expect(totalItems).toBe(17);
  });

  it('count <= 0 → 空', () => {
    const origins = dummyOrigins(5);
    expect(splitOrigins(origins, 0)).toHaveLength(0);
    expect(splitOrigins(origins, -1)).toHaveLength(0);
  });
});

// =============================================================================
// createPokemonListTasks
// =============================================================================

describe('createPokemonListTasks', () => {
  const dummyParams = {} as Parameters<typeof createPokemonListTasks>[1];
  const dummyConfig = {} as Parameters<typeof createPokemonListTasks>[2];

  it('origins > workerCount → 複数タスク生成', () => {
    const origins = dummyOrigins(10);
    const tasks = createPokemonListTasks(origins, dummyParams, dummyConfig, undefined, 4);
    expect(tasks.length).toBeGreaterThan(1);
    expect(tasks.every((t) => t.kind === 'pokemon-list')).toBe(true);
  });

  it('origins <= workerCount → 単一タスクにフォールバック', () => {
    const origins = dummyOrigins(3);
    const tasks = createPokemonListTasks(origins, dummyParams, dummyConfig, undefined, 8);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].origins).toHaveLength(3);
  });

  it('分割後の origins 合計が元と一致する', () => {
    const origins = dummyOrigins(100);
    const tasks = createPokemonListTasks(origins, dummyParams, dummyConfig, undefined, 6);
    const total = tasks.reduce((sum, t) => sum + t.origins.length, 0);
    expect(total).toBe(100);
  });
});

// =============================================================================
// createEggListTasks
// =============================================================================

describe('createEggListTasks', () => {
  const dummyParams = {} as Parameters<typeof createEggListTasks>[1];
  const dummyConfig = {} as Parameters<typeof createEggListTasks>[2];

  it('origins > workerCount → 複数タスク生成', () => {
    const origins = dummyOrigins(10);
    const tasks = createEggListTasks(origins, dummyParams, dummyConfig, undefined, 4);
    expect(tasks.length).toBeGreaterThan(1);
    expect(tasks.every((t) => t.kind === 'egg-list')).toBe(true);
  });

  it('origins <= workerCount → 単一タスクにフォールバック', () => {
    const origins = dummyOrigins(2);
    const tasks = createEggListTasks(origins, dummyParams, dummyConfig, undefined, 8);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].origins).toHaveLength(2);
  });

  it('分割後の origins 合計が元と一致する', () => {
    const origins = dummyOrigins(100);
    const tasks = createEggListTasks(origins, dummyParams, dummyConfig, undefined, 6);
    const total = tasks.reduce((sum, t) => sum + t.origins.length, 0);
    expect(total).toBe(100);
  });
});
