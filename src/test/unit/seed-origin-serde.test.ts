/**
 * seed-origin-serde ユニットテスト
 *
 * SeedOrigin ⇔ SerializedSeedOrigin 間の変換と JSON パースを検証する。
 */

import { describe, it, expect } from 'vitest';
import {
  serializeSeedOrigin,
  deserializeSeedOrigin,
  parseSerializedSeedOrigins,
} from '@/services/seed-origin-serde';
import type { SerializedSeedOrigin } from '@/services/seed-origin-serde';
import type { SeedOrigin } from '@/wasm/wasm_pkg';

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const SEED_ORIGIN: SeedOrigin = {
  Seed: {
    base_seed: 0x01_23_45_67_89_ab_cd_efn,
    mt_seed: 0x89_ab_cd_ef,
  },
};

const STARTUP_ORIGIN: SeedOrigin = {
  Startup: {
    base_seed: 0xfe_dc_ba_98_76_54_32_10n,
    mt_seed: 0x76_54_32_10,
    datetime: { year: 2025, month: 6, day: 15, hour: 12, minute: 30, second: 45 },
    condition: { timer0: 0x06_00, vcount: 0x5e, key_code: 0x00_00 },
  },
};

const ZERO_SEED_ORIGIN: SeedOrigin = {
  Seed: {
    base_seed: 0n,
    mt_seed: 0,
  },
};

// ---------------------------------------------------------------------------
// serializeSeedOrigin
// ---------------------------------------------------------------------------

describe('serializeSeedOrigin', () => {
  it('Seed バリアントの bigint を 16 桁 hex に変換する', () => {
    const result = serializeSeedOrigin(SEED_ORIGIN);
    expect(result).toEqual({
      Seed: {
        base_seed: '0123456789ABCDEF',
        mt_seed: 0x89_ab_cd_ef,
      },
    });
  });

  it('Startup バリアントの全フィールドを変換する', () => {
    const result = serializeSeedOrigin(STARTUP_ORIGIN);
    expect(result).toEqual({
      Startup: {
        base_seed: 'FEDCBA9876543210',
        mt_seed: 0x76_54_32_10,
        datetime: { year: 2025, month: 6, day: 15, hour: 12, minute: 30, second: 45 },
        condition: { timer0: 0x06_00, vcount: 0x5e, key_code: 0x00_00 },
      },
    });
  });

  it('base_seed=0 を 16 桁ゼロパディングする', () => {
    const result = serializeSeedOrigin(ZERO_SEED_ORIGIN);
    expect(result).toEqual({
      Seed: {
        base_seed: '0000000000000000',
        mt_seed: 0,
      },
    });
  });
});

// ---------------------------------------------------------------------------
// deserializeSeedOrigin
// ---------------------------------------------------------------------------

describe('deserializeSeedOrigin', () => {
  it('Seed バリアントの hex を bigint に復元する', () => {
    const serialized: SerializedSeedOrigin = {
      Seed: { base_seed: '0123456789ABCDEF', mt_seed: 0x89_ab_cd_ef },
    };
    const result = deserializeSeedOrigin(serialized);
    expect(result).toEqual(SEED_ORIGIN);
  });

  it('Startup バリアントの全フィールドを復元する', () => {
    const serialized: SerializedSeedOrigin = {
      Startup: {
        base_seed: 'FEDCBA9876543210',
        mt_seed: 0x76_54_32_10,
        datetime: { year: 2025, month: 6, day: 15, hour: 12, minute: 30, second: 45 },
        condition: { timer0: 0x06_00, vcount: 0x5e, key_code: 0x00_00 },
      },
    };
    const result = deserializeSeedOrigin(serialized);
    expect(result).toEqual(STARTUP_ORIGIN);
  });

  it('base_seed=0 のゼロパディング hex を復元する', () => {
    const serialized: SerializedSeedOrigin = {
      Seed: { base_seed: '0000000000000000', mt_seed: 0 },
    };
    const result = deserializeSeedOrigin(serialized);
    expect(result).toEqual(ZERO_SEED_ORIGIN);
  });
});

// ---------------------------------------------------------------------------
// ラウンドトリップ
// ---------------------------------------------------------------------------

describe('serialize → deserialize ラウンドトリップ', () => {
  it('Seed バリアントで元の値と一致する', () => {
    const roundTripped = deserializeSeedOrigin(serializeSeedOrigin(SEED_ORIGIN));
    expect(roundTripped).toEqual(SEED_ORIGIN);
  });

  it('Startup バリアントで元の値と一致する', () => {
    const roundTripped = deserializeSeedOrigin(serializeSeedOrigin(STARTUP_ORIGIN));
    expect(roundTripped).toEqual(STARTUP_ORIGIN);
  });

  it('base_seed=0 で元の値と一致する', () => {
    const roundTripped = deserializeSeedOrigin(serializeSeedOrigin(ZERO_SEED_ORIGIN));
    expect(roundTripped).toEqual(ZERO_SEED_ORIGIN);
  });
});

// ---------------------------------------------------------------------------
// parseSerializedSeedOrigins
// ---------------------------------------------------------------------------

describe('parseSerializedSeedOrigins', () => {
  it('SerializedSeedOrigin[] 配列をパースする', () => {
    const json = JSON.stringify([
      { Seed: { base_seed: '0123456789ABCDEF', mt_seed: 0x89_ab_cd_ef } },
    ]);
    const result = parseSerializedSeedOrigins(json);
    expect(result).toEqual([SEED_ORIGIN]);
  });

  it('{ results: [...] } 形式をパースする', () => {
    const json = JSON.stringify({
      meta: { exportedAt: '2025-01-01T00:00:00Z' },
      results: [
        { Seed: { base_seed: '0123456789ABCDEF', mt_seed: 0x89_ab_cd_ef } },
        {
          Startup: {
            base_seed: 'FEDCBA9876543210',
            mt_seed: 0x76_54_32_10,
            datetime: { year: 2025, month: 6, day: 15, hour: 12, minute: 30, second: 45 },
            condition: { timer0: 0x06_00, vcount: 0x5e, key_code: 0x00_00 },
          },
        },
      ],
    });
    const result = parseSerializedSeedOrigins(json);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(SEED_ORIGIN);
    expect(result[1]).toEqual(STARTUP_ORIGIN);
  });

  it('不正 JSON でエラーを投げる', () => {
    expect(() => parseSerializedSeedOrigins('{')).toThrow('Invalid JSON');
  });

  it('配列でも { results } でもない構造でエラーを投げる', () => {
    expect(() => parseSerializedSeedOrigins('"hello"')).toThrow(
      'Expected array or { results: [...] }'
    );
  });

  it('results がオブジェクトの場合にエラーを投げる', () => {
    expect(() => parseSerializedSeedOrigins('{ "results": {} }')).toThrow(
      'Expected array or { results: [...] }'
    );
  });

  it('不正な要素でインデックス付きエラーを投げる', () => {
    const json = JSON.stringify([
      { Seed: { base_seed: '0123456789ABCDEF', mt_seed: 0x89_ab_cd_ef } },
      { Invalid: {} },
    ]);
    expect(() => parseSerializedSeedOrigins(json)).toThrow('Invalid SeedOrigin at index 1');
  });

  it('base_seed が無効な hex の場合にエラーを投げる', () => {
    const json = JSON.stringify([{ Seed: { base_seed: 'ZZZZ', mt_seed: 0 } }]);
    expect(() => parseSerializedSeedOrigins(json)).toThrow('Invalid SeedOrigin at index 0');
  });

  it('空配列をパースして空配列を返す', () => {
    const result = parseSerializedSeedOrigins('[]');
    expect(result).toEqual([]);
  });
});
