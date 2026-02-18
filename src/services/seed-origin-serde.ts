/**
 * SeedOrigin のシリアライズ/デシリアライズ
 *
 * SeedOrigin (bigint 含む) ⇔ SerializedSeedOrigin (hex 文字列) 間の変換と、
 * JSON 文字列からの一括パースを提供する。React / Store に依存しない。
 */

import { toBigintHex } from '@/lib/format';
import type { SeedOrigin } from '@/wasm/wasm_pkg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** SeedOrigin のシリアライズ済み型 (bigint → hex 文字列) */
export type SerializedSeedOrigin =
  | { Seed: { base_seed: string; mt_seed: number } }
  | {
      Startup: {
        base_seed: string;
        mt_seed: number;
        datetime: {
          year: number;
          month: number;
          day: number;
          hour: number;
          minute: number;
          second: number;
        };
        condition: { timer0: number; vcount: number; key_code: number };
      };
    };

// ---------------------------------------------------------------------------
// Serialize / Deserialize
// ---------------------------------------------------------------------------

/** SeedOrigin → SerializedSeedOrigin */
export function serializeSeedOrigin(origin: SeedOrigin): SerializedSeedOrigin {
  if ('Seed' in origin) {
    return {
      Seed: {
        base_seed: toBigintHex(origin.Seed.base_seed, 16),
        mt_seed: origin.Seed.mt_seed,
      },
    };
  }
  return {
    Startup: {
      base_seed: toBigintHex(origin.Startup.base_seed, 16),
      mt_seed: origin.Startup.mt_seed,
      datetime: origin.Startup.datetime,
      condition: origin.Startup.condition,
    },
  };
}

/** SerializedSeedOrigin → SeedOrigin (hex → bigint 復元) */
export function deserializeSeedOrigin(serialized: SerializedSeedOrigin): SeedOrigin {
  if ('Seed' in serialized) {
    return {
      Seed: {
        base_seed: BigInt(`0x${serialized.Seed.base_seed}`),
        mt_seed: serialized.Seed.mt_seed,
      },
    };
  }
  return {
    Startup: {
      base_seed: BigInt(`0x${serialized.Startup.base_seed}`),
      mt_seed: serialized.Startup.mt_seed,
      datetime: serialized.Startup.datetime,
      condition: serialized.Startup.condition,
    },
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const HEX_RE = /^[\da-fA-F]{1,16}$/;

function isValidSerializedSeedOrigin(value: unknown): value is SerializedSeedOrigin {
  if (typeof value !== 'object' || value === null) return false;

  if ('Seed' in value) {
    const seed = (value as { Seed: unknown }).Seed;
    if (typeof seed !== 'object' || seed === null) return false;
    const s = seed as Record<string, unknown>;
    return (
      typeof s.base_seed === 'string' && HEX_RE.test(s.base_seed) && typeof s.mt_seed === 'number'
    );
  }

  if ('Startup' in value) {
    const startup = (value as { Startup: unknown }).Startup;
    if (typeof startup !== 'object' || startup === null) return false;
    const s = startup as Record<string, unknown>;
    if (typeof s.base_seed !== 'string' || !HEX_RE.test(s.base_seed)) return false;
    if (typeof s.mt_seed !== 'number') return false;
    if (typeof s.datetime !== 'object' || s.datetime === null) return false;
    if (typeof s.condition !== 'object' || s.condition === null) return false;

    const dt = s.datetime as Record<string, unknown>;
    const cond = s.condition as Record<string, unknown>;
    return (
      typeof dt.year === 'number' &&
      typeof dt.month === 'number' &&
      typeof dt.day === 'number' &&
      typeof dt.hour === 'number' &&
      typeof dt.minute === 'number' &&
      typeof dt.second === 'number' &&
      typeof cond.timer0 === 'number' &&
      typeof cond.vcount === 'number' &&
      typeof cond.key_code === 'number'
    );
  }

  return false;
}

// ---------------------------------------------------------------------------
// JSON parse
// ---------------------------------------------------------------------------

/**
 * JSON 文字列を SerializedSeedOrigin[] としてパースし、SeedOrigin[] を返す。
 *
 * 受け入れ形式:
 * - `SerializedSeedOrigin[]` (配列のみ)
 * - `{ results: SerializedSeedOrigin[], ... }` (meta 付きエクスポート形式)
 *
 * @throws パース失敗時またはバリデーション失敗時
 */
export function parseSerializedSeedOrigins(json: string): SeedOrigin[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON');
  }

  let items: unknown[];

  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (typeof parsed === 'object' && parsed !== null && 'results' in parsed) {
    const results = (parsed as { results: unknown }).results;
    if (!Array.isArray(results)) {
      throw new TypeError('Expected array or { results: [...] }');
    }
    items = results;
  } else {
    throw new TypeError('Expected array or { results: [...] }');
  }

  return items.map((item, index) => {
    if (!isValidSerializedSeedOrigin(item)) {
      throw new Error(`Invalid SeedOrigin at index ${index}`);
    }
    return deserializeSeedOrigin(item);
  });
}
