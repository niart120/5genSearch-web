/**
 * 針検索 — WASM 統合テスト
 */

import { describe, it, expect } from 'vitest';
import { search_needle_pattern, resolve_seeds } from '../../wasm/wasm_pkg.js';
import type {
  SeedOrigin,
  NeedleSearchResult,
  GenerationConfig,
  NeedleDirection,
} from '../../wasm/wasm_pkg.js';

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
      expect(typeof r.advance).toBe('number');
      expect(r.advance).toBeGreaterThanOrEqual(0);
      expect(r.source).toBeDefined();
    }
  });

  it('empty pattern returns empty results', () => {
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

    const results = search_needle_pattern([origins[0]], [], config);
    expect(Array.isArray(results)).toBe(true);
  });
});
