import { describe, it, expect, beforeAll } from 'vitest';
import init, {
  health_check,
  resolve_seeds,
  generate_pokemon_list,
  generate_egg_list,
  resolve_pokemon_data_batch,
  resolve_egg_data_batch,
} from '@wasm';

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
});
