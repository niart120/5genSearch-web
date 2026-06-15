/**
 * 針検索 — WASM 統合テスト
 */

import { describe, it, expect } from 'vitest';
import {
  get_needle_pattern_at,
  search_needle_pattern,
  resolve_seeds,
} from '../../wasm/wasm_pkg.js';
import type {
  SeedOrigin,
  NeedleSearchResult,
  GenerationConfig,
  NeedleDirection,
} from '../../wasm/wasm_pkg.js';

const DIRECTION_NAMES: readonly NeedleDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function toNeedleDirection(value: number): NeedleDirection {
  const direction = DIRECTION_NAMES[value];
  if (direction === undefined) {
    throw new Error(`Invalid needle direction: ${value}`);
  }
  return direction;
}

describe('Needle Search Integration', () => {
  /**
   * 既知の Seed で search_needle_pattern を呼び出し、
   * 結果が NeedleSearchResult[] 型であることを検証する。
   */
  it('search_needle_pattern returns NeedleSearchResult[] for a known seed', () => {
    // 既知の Seed を直接指定して SeedOrigin を生成
    const origins = resolve_seeds({
      type: 'Seeds',
      seeds: [0x12_34_56_78_9a_bc_de_f0n],
    });
    expect(origins.length).toBeGreaterThan(0);

    const origin: SeedOrigin = origins[0];
    const pattern: NeedleDirection[] = ['N', 'E', 'S'];

    const config: GenerationConfig = {
      version: 'Black',
      game_start: {
        start_mode: 'Continue',
        save: 'WithSave',
        memory_link: 'Disabled',
        shiny_charm: 'NotObtained',
      },
      user_offset: 0,
      max_advance: 500,
    };

    const results: NeedleSearchResult[] = search_needle_pattern([origin], pattern, config);

    // 結果が配列であること
    expect(Array.isArray(results)).toBe(true);

    // 結果がある場合、各要素の構造を検証
    for (const r of results) {
      expect(r.advance).toBeTypeOf('number');
      expect(r.advance).toBeGreaterThanOrEqual(0);
      expect(r.source).toBeDefined();
    }
  });

  it('empty pattern throws an error', () => {
    const origins = resolve_seeds({
      type: 'Seeds',
      seeds: [0xab_cd_ef_01_23_45_67_89n],
    });
    expect(origins.length).toBeGreaterThan(0);

    const config: GenerationConfig = {
      version: 'White',
      game_start: {
        start_mode: 'Continue',
        save: 'WithSave',
        memory_link: 'Disabled',
        shiny_charm: 'NotObtained',
      },
      user_offset: 0,
      max_advance: 100,
    };

    expect(() => search_needle_pattern([origins[0]], [], config)).toThrow();
  });

  it('returns the advance at the end of the observed pattern', () => {
    const seed = 0x12_34_56_78_9a_bc_de_f0n;
    const origins = resolve_seeds({
      type: 'Seeds',
      seeds: [seed],
    });
    expect(origins.length).toBeGreaterThan(0);

    const targetAdvance = 10;
    const patternLength = 3;
    // Black / Continue / WithSave での calculate_game_offset(seed) 期待値。
    const gameOffset = 42;
    const pattern = Array.from(
      get_needle_pattern_at(seed, gameOffset + targetAdvance, patternLength),
      toNeedleDirection
    );

    const config: GenerationConfig = {
      version: 'Black',
      game_start: {
        start_mode: 'Continue',
        save: 'WithSave',
        memory_link: 'Disabled',
        shiny_charm: 'NotObtained',
      },
      user_offset: targetAdvance,
      max_advance: targetAdvance + patternLength - 1,
    };

    const results = search_needle_pattern([origins[0]], pattern, config);

    expect(results).toHaveLength(1);
    expect(results[0].advance).toBe(targetAdvance + patternLength - 1);
  });
});
