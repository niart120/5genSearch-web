import { describe, it, expect, beforeAll } from 'vitest';
import wasmInit, { get_species_name } from '../../wasm/wasm_pkg.js';

describe('get_species_name WASM export', () => {
  beforeAll(async () => {
    await wasmInit();
  });

  it('日本語ロケールで種族名を取得できる', () => {
    expect(get_species_name(25, 'ja')).toBe('ピカチュウ');
  });

  it('英語ロケールで種族名を取得できる', () => {
    expect(get_species_name(25, 'en')).toBe('Pikachu');
  });

  it('範囲外の species_id は "???" を返す', () => {
    expect(get_species_name(0, 'ja')).toBe('???');
    expect(get_species_name(650, 'en')).toBe('???');
  });
});
