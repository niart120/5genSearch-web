import { describe, it, expect, beforeAll } from 'vitest';
import init, {
  health_check,
  resolve_seeds,
  generate_pokemon_list,
  generate_egg_list,
  resolve_pokemon_data_batch,
  resolve_egg_data_batch,
  MtseedDatetimeSearcher,
} from '@wasm';
import type { MtseedDatetimeSearchParams } from '@wasm';

describe('WASM Binding Verification', () => {
  beforeAll(async () => {
    // Browser Mode では fetch ベースで WASM を読み込む
    await init();
  });

  describe('health_check', () => {
    it('should return ready message', () => {
      const result = health_check();
      expect(result).toBe('wasm-pkg is ready');
    });
  });

  describe('resolve_seeds', () => {
    it('should resolve seed from direct specification', () => {
      const spec = {
        type: 'Seeds' as const,
        seeds: [0x123456789abcdefn],
      };
      const origins = resolve_seeds(spec);
      expect(origins.length).toBe(1);
      expect(origins[0].Seed).toBeDefined();
    });
  });

  describe('generate_pokemon_list', () => {
    it('should be callable', () => {
      expect(typeof generate_pokemon_list).toBe('function');
    });
  });

  describe('generate_egg_list', () => {
    it('should be callable', () => {
      expect(typeof generate_egg_list).toBe('function');
    });
  });

  describe('resolve_pokemon_data_batch', () => {
    it('should be callable', () => {
      expect(typeof resolve_pokemon_data_batch).toBe('function');
    });
  });

  describe('resolve_egg_data_batch', () => {
    it('should be callable', () => {
      expect(typeof resolve_egg_data_batch).toBe('function');
    });
  });

  describe('MtseedDatetimeSearcher', () => {
    it('should create and search without panic', () => {
      const params: MtseedDatetimeSearchParams = {
        target_seeds: [0x32bf6858],
        ds: {
          mac: [0x8c, 0x56, 0xc5, 0x86, 0x15, 0x28] as [
            number,
            number,
            number,
            number,
            number,
            number,
          ],
          hardware: 'DsLite',
          version: 'Black',
          region: 'Jpn',
        },
        time_range: {
          hour_start: 18,
          hour_end: 18,
          minute_start: 0,
          minute_end: 30,
          second_start: 0,
          second_end: 59,
        },
        search_range: {
          start_year: 2010,
          start_month: 9,
          start_day: 18,
          start_second_offset: 0,
          range_seconds: 86400,
        },
        condition: {
          timer0: 0x0c79,
          vcount: 0x60,
          key_code: 0x2fff,
        },
      };

      const searcher = new MtseedDatetimeSearcher(params);
      expect(searcher.is_done).toBe(false);

      // 1 バッチ実行
      const batch = searcher.next_batch(100);
      expect(batch).toBeDefined();
      expect(batch.processed_count).toBeGreaterThan(0n);

      searcher.free();
    });
  });
});
