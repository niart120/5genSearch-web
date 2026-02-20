/**
 * フォームバリデーション共通ヘルパー
 *
 * 各 feature の validate 関数で共通する検証ロジックを集約する。
 */

import { IV_VALUE_UNKNOWN } from '@/lib/game-data-names';

/** offset / max_advance の共通バリデーションエラーコード */
export type GenConfigValidationErrorCode = 'OFFSET_NEGATIVE' | 'ADVANCE_RANGE_INVALID';

/**
 * GenerationConfig (user_offset / max_advance) の共通バリデーション
 *
 * - offset < 0 → `OFFSET_NEGATIVE`
 * - max_advance < offset → `ADVANCE_RANGE_INVALID`
 */
export function validateGenConfig(config: {
  user_offset: number;
  max_advance: number;
}): GenConfigValidationErrorCode[] {
  const errors: GenConfigValidationErrorCode[] = [];
  if (config.user_offset < 0) {
    errors.push('OFFSET_NEGATIVE');
  }
  if (config.max_advance < config.user_offset) {
    errors.push('ADVANCE_RANGE_INVALID');
  }
  return errors;
}

/**
 * IV 値が有効範囲内か判定 (0–31 または IV_VALUE_UNKNOWN)
 */
export function isIvValid(value: number): boolean {
  return (value >= 0 && value <= 31) || value === IV_VALUE_UNKNOWN;
}

// ---------------------------------------------------------------------------
// Profile JSON validation
// ---------------------------------------------------------------------------

import type { ProfileData } from '@/stores/settings/profile';
import type {
  DsConfig,
  GameStartConfig,
  Hardware,
  MemoryLinkState,
  RomRegion,
  RomVersion,
  SavePresence,
  ShinyCharmState,
  StartMode,
  Timer0VCountRange,
} from '@/wasm/wasm_pkg';

const PROFILE_SCHEMA = '5genSearch-profile-v1';

const VALID_HARDWARE: Hardware[] = ['Ds', 'DsLite', 'Dsi', 'Dsi3ds'];
const VALID_VERSION: RomVersion[] = ['Black', 'White', 'Black2', 'White2'];
const VALID_REGION: RomRegion[] = ['Jpn', 'Kor', 'Usa', 'Ger', 'Fra', 'Spa', 'Ita'];
const VALID_START_MODE: StartMode[] = ['NewGame', 'Continue'];
const VALID_SAVE: SavePresence[] = ['NoSave', 'WithSave'];
const VALID_MEMORY_LINK: MemoryLinkState[] = ['Disabled', 'Enabled'];
const VALID_SHINY_CHARM: ShinyCharmState[] = ['NotObtained', 'Obtained'];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isUint8(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 255;
}

function isUint16(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 65_535;
}

function isEnumValue<T extends string>(v: unknown, values: T[]): v is T {
  return typeof v === 'string' && (values as string[]).includes(v);
}

function validateDsConfig(obj: unknown): DsConfig | string {
  if (!isObject(obj)) return 'config must be an object';
  const { mac, hardware, version, region } = obj;
  if (!Array.isArray(mac) || mac.length !== 6 || !mac.every((v) => isUint8(v))) {
    return 'config.mac must be a 6-element array of 0-255 integers';
  }
  if (!isEnumValue(hardware, VALID_HARDWARE))
    return `config.hardware is invalid: ${String(hardware)}`;
  if (!isEnumValue(version, VALID_VERSION)) return `config.version is invalid: ${String(version)}`;
  if (!isEnumValue(region, VALID_REGION)) return `config.region is invalid: ${String(region)}`;
  return { mac: mac as DsConfig['mac'], hardware, version, region };
}

function validateRanges(obj: unknown): Timer0VCountRange[] | string {
  if (!Array.isArray(obj) || obj.length === 0) return 'ranges must be a non-empty array';
  const result: Timer0VCountRange[] = [];
  for (const [i, item] of obj.entries()) {
    if (!isObject(item)) return `ranges[${i}] must be an object`;
    const { timer0_min, timer0_max, vcount_min, vcount_max } = item;
    if (!isUint16(timer0_min)) return `ranges[${i}].timer0_min is invalid`;
    if (!isUint16(timer0_max)) return `ranges[${i}].timer0_max is invalid`;
    if (!isUint16(vcount_min)) return `ranges[${i}].vcount_min is invalid`;
    if (!isUint16(vcount_max)) return `ranges[${i}].vcount_max is invalid`;
    result.push({ timer0_min, timer0_max, vcount_min, vcount_max });
  }
  return result;
}

function validateGameStart(obj: unknown): GameStartConfig | string {
  if (!isObject(obj)) return 'gameStart must be an object';
  const { start_mode, save, memory_link, shiny_charm } = obj;
  if (!isEnumValue(start_mode, VALID_START_MODE))
    return `gameStart.start_mode is invalid: ${String(start_mode)}`;
  if (!isEnumValue(save, VALID_SAVE)) return `gameStart.save is invalid: ${String(save)}`;
  if (!isEnumValue(memory_link, VALID_MEMORY_LINK))
    return `gameStart.memory_link is invalid: ${String(memory_link)}`;
  if (!isEnumValue(shiny_charm, VALID_SHINY_CHARM))
    return `gameStart.shiny_charm is invalid: ${String(shiny_charm)}`;
  return { start_mode, save, memory_link, shiny_charm };
}

export type ProfileJsonResult =
  | { ok: true; name: string; data: ProfileData }
  | { ok: false; error: string };

/**
 * プロファイル JSON をバリデーションし、ProfileData に変換する。
 */
export function validateProfileJson(json: unknown): ProfileJsonResult {
  if (!isObject(json)) return { ok: false, error: 'Root must be an object' };
  if (json.$schema !== PROFILE_SCHEMA)
    return { ok: false, error: `$schema must be "${PROFILE_SCHEMA}"` };

  const name = json.name;
  if (typeof name !== 'string' || name.length === 0)
    return { ok: false, error: 'name is required' };

  const data = json.data;
  if (!isObject(data)) return { ok: false, error: 'data must be an object' };

  const configResult = validateDsConfig(data.config);
  if (typeof configResult === 'string') return { ok: false, error: configResult };

  const rangesResult = validateRanges(data.ranges);
  if (typeof rangesResult === 'string') return { ok: false, error: rangesResult };

  if (typeof data.timer0Auto !== 'boolean')
    return { ok: false, error: 'data.timer0Auto must be a boolean' };

  const gameStartResult = validateGameStart(data.gameStart);
  if (typeof gameStartResult === 'string') return { ok: false, error: gameStartResult };

  // tid / sid: optional (number | undefined)
  const tid = data.tid === undefined || data.tid === null ? undefined : data.tid;
  const sid = data.sid === undefined || data.sid === null ? undefined : data.sid;
  if (tid !== undefined && !isUint16(tid))
    return { ok: false, error: 'data.tid must be 0-65535 or undefined' };
  if (sid !== undefined && !isUint16(sid))
    return { ok: false, error: 'data.sid must be 0-65535 or undefined' };

  return {
    ok: true,
    name: name as string,
    data: {
      config: configResult,
      ranges: rangesResult,
      timer0Auto: data.timer0Auto as boolean,
      gameStart: gameStartResult,
      tid: tid as number | undefined,
      sid: sid as number | undefined,
    },
  };
}

export { PROFILE_SCHEMA };
