/**
 * SeedOrigin インポート統合テスト
 *
 * WASM の resolve_seeds で実際の SeedOrigin を生成し、
 * toSeedOriginJson → parseSerializedSeedOrigins のラウンドトリップを検証する。
 */

import { describe, it, expect } from 'vitest';
import { resolve_seeds } from '@/wasm/wasm_pkg.js';
import type {
  DsConfig,
  SeedOrigin,
  Datetime,
  KeyInput,
  Timer0VCountRange,
} from '@/wasm/wasm_pkg.js';
import { toSeedOriginJson } from '@/services/export';
import { parseSerializedSeedOrigins } from '@/services/seed-origin-serde';
import type { ExportMeta } from '@/services/export';

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const DS_CONFIG: DsConfig = {
  version: 'Black',
  region: 'Jpn',
  hardware: 'DsLite',
  mac: [0x00, 0x09, 0xbf, 0xaa, 0xbb, 0xcc],
};

const DATETIME: Datetime = {
  year: 2025,
  month: 1,
  day: 15,
  hour: 12,
  minute: 30,
  second: 45,
};

const KEY_INPUT: KeyInput = { buttons: [] };

const TIMER0_VCOUNT_RANGES: Timer0VCountRange[] = [
  { timer0_min: 0x06_10, timer0_max: 0x06_10, vcount_min: 0x5e, vcount_max: 0x5e },
];

function createMeta(totalResults: number): ExportMeta {
  return {
    exportedAt: new Date().toISOString(),
    feature: 'datetime-search',
    totalResults,
    includeDetails: false,
    dsConfig: {
      version: 'Black',
      region: 'Jpn',
      hardware: 'DsLite',
      macAddress: '00:09:bf:aa:bb:cc',
    },
    gameStart: {
      startMode: 'Continue',
      save: 'NoSave',
      memoryLink: 'Disabled',
      shinyCharm: 'NotObtained',
    },
    timer0VCountRanges: [
      { timer0Min: 0x06_10, timer0Max: 0x06_10, vcountMin: 0x5e, vcountMax: 0x5e },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SeedOrigin import round-trip (WASM)', () => {
  it('resolve_seeds で生成した SeedOrigin を JSON エクスポート → インポートでラウンドトリップできる', () => {
    const origins: SeedOrigin[] = resolve_seeds({
      type: 'Startup',
      ds: DS_CONFIG,
      datetime: DATETIME,
      ranges: TIMER0_VCOUNT_RANGES,
      key_input: KEY_INPUT,
    });

    expect(origins.length).toBeGreaterThan(0);

    // エクスポート
    const json = toSeedOriginJson(origins, createMeta(origins.length));

    // インポート (ラウンドトリップ)
    const imported = parseSerializedSeedOrigins(json);

    expect(imported).toHaveLength(origins.length);

    for (const [i, original] of origins.entries()) {
      const restored = imported[i];

      if ('Startup' in original) {
        expect('Startup' in restored).toBe(true);
        if ('Startup' in restored) {
          expect(restored.Startup.base_seed).toBe(original.Startup.base_seed);
          expect(restored.Startup.mt_seed).toBe(original.Startup.mt_seed);
          expect(restored.Startup.datetime).toEqual(original.Startup.datetime);
          expect(restored.Startup.condition).toEqual(original.Startup.condition);
        }
      } else {
        expect('Seed' in restored).toBe(true);
        if ('Seed' in restored) {
          expect(restored.Seed.base_seed).toBe(original.Seed.base_seed);
          expect(restored.Seed.mt_seed).toBe(original.Seed.mt_seed);
        }
      }
    }
  });

  it('Seed バリアントの SeedOrigin も正しくラウンドトリップできる', () => {
    // resolve_seeds は Startup を返すため、Seed バリアントは手動で構築
    const origins: SeedOrigin[] = [
      { Seed: { base_seed: 0x01_23_45_67_89_ab_cd_efn, mt_seed: 0x89_ab_cd_ef } },
      { Seed: { base_seed: 0n, mt_seed: 0 } },
    ];

    const json = toSeedOriginJson(origins, createMeta(origins.length));
    const imported = parseSerializedSeedOrigins(json);

    expect(imported).toHaveLength(2);
    expect(imported[0]).toEqual(origins[0]);
    expect(imported[1]).toEqual(origins[1]);
  });

  it('Startup と Seed が混在する配列を正しくラウンドトリップできる', () => {
    const wasmOrigins: SeedOrigin[] = resolve_seeds({
      type: 'Startup',
      ds: DS_CONFIG,
      datetime: DATETIME,
      ranges: TIMER0_VCOUNT_RANGES,
      key_input: KEY_INPUT,
    });

    const mixed: SeedOrigin[] = [
      ...wasmOrigins,
      { Seed: { base_seed: 0xde_ad_be_ef_ca_fe_ba_ben, mt_seed: 42 } },
    ];

    const json = toSeedOriginJson(mixed, createMeta(mixed.length));
    const imported = parseSerializedSeedOrigins(json);

    expect(imported).toHaveLength(mixed.length);

    // 最後の要素が Seed バリアントであることを確認
    const last = imported.at(-1)!;
    expect('Seed' in last).toBe(true);
    if ('Seed' in last) {
      expect(last.Seed.base_seed).toBe(0xde_ad_be_ef_ca_fe_ba_ben);
      expect(last.Seed.mt_seed).toBe(42);
    }
  });
});
