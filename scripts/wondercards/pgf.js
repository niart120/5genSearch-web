import {
  EXCEPTIONS,
  EXCLUSION_REASONS,
  LANGUAGES,
  VERSION_ORDER,
  VERSION_TOKENS,
} from './config.js';

const NATURES = [
  'Hardy',
  'Lonely',
  'Brave',
  'Adamant',
  'Naughty',
  'Bold',
  'Docile',
  'Relaxed',
  'Impish',
  'Lax',
  'Timid',
  'Hasty',
  'Serious',
  'Jolly',
  'Naive',
  'Modest',
  'Mild',
  'Quiet',
  'Bashful',
  'Rash',
  'Calm',
  'Gentle',
  'Sassy',
  'Careful',
  'Quirky',
];
const IV_OFFSETS = { hp: 0x43, atk: 0x44, def: 0x45, spa: 0x47, spd: 0x48, spe: 0x46 };

export function cardMetadata(relativePath, exceptions = EXCEPTIONS) {
  const match = /^([^/]+)\/([^/]+)\.pgf$/.exec(relativePath);
  if (!match || !Object.hasOwn(LANGUAGES, match[1]))
    throw new Error(`Invalid card path: ${relativePath}`);
  const override = exceptions[relativePath];
  if (override && (!override.reason?.trim() || !URL.canParse(override.reference))) {
    throw new Error(`Exception needs reason and reference: ${relativePath}`);
  }
  const language = override?.language ?? LANGUAGES[match[1]];
  if (!Object.values(LANGUAGES).includes(language))
    throw new Error(`Invalid language: ${relativePath}`);
  if (override?.exclude) return { language, reason: override.reason };
  // ソフト指定はカード番号に続く独立トークン。配布名中の B/W は参照しない。
  const token = /^\S+\s+(\S+)(?:\s|$)/.exec(match[2])?.[1];
  const versions =
    override?.versions ??
    (Object.hasOwn(VERSION_TOKENS, token) ? VERSION_TOKENS[token] : undefined);
  if (
    !versions?.length ||
    versions.some((v) => !VERSION_ORDER.includes(v)) ||
    new Set(versions).size !== versions.length
  ) {
    throw new Error(`Unknown or invalid version token: ${relativePath}`);
  }
  const slug = match[2]
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
  const id = override?.id ?? `${language}-${slug}`;
  if (!slug || !new RegExp(`^${language}-[\\p{L}\\p{N}]+(?:-[\\p{L}\\p{N}]+)*$`, 'u').test(id)) {
    throw new Error(`Invalid explicit card ID: ${relativePath}`);
  }
  return { language, id, versions: VERSION_ORDER.filter((v) => versions.includes(v)) };
}

/** 第5世代のタイトルを復号する。未解決の専用文字を置換して隠さない。 */
export function decodeTitle(bytes) {
  if (bytes.length % 2 !== 0) throw new Error('Invalid title byte length');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let title = '';
  for (let offset = 0; offset < bytes.length; offset += 2) {
    const code = view.getUint16(offset, true);
    // PKHeX StringConverter5 と同様に 0000 / FFFF を終端とする。
    if (code === 0xffff || code === 0) break;
    if (code === 0x246d || code === 0x246e) {
      title += code === 0x246d ? '♂' : '♀';
    } else {
      if (
        code < 0x20 ||
        (code >= 0x7f && code <= 0x9f) ||
        (code >= 0xd800 && code <= 0xf8ff) ||
        (code >= 0xfdd0 && code <= 0xfdef) ||
        code >= 0xfffd
      ) {
        throw new Error(`Unsupported title code: 0x${code.toString(16)}`);
      }
      title += String.fromCharCode(code);
    }
  }
  if (!title.trim()) throw new Error('Empty card title');
  return title;
}

/** I/O を行わず、1枚のカードを変換する。非対応の新規条件は必ず失敗させる。 */
export function parsePgf(bytes, relativePath, exceptions = EXCEPTIONS) {
  if (bytes.length !== 0xcc) throw new Error(`Invalid PGF size (${bytes.length}): ${relativePath}`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const metadata = cardMetadata(relativePath, exceptions);
  const type = bytes[0xb3];
  if (![1, 2, 3].includes(type)) throw new Error(`Unknown card type ${type}: ${relativePath}`);
  if (metadata.reason) return metadata;
  if (type !== 1)
    return {
      language: metadata.language,
      reason: EXCLUSION_REASONS[type === 2 ? 'item' : 'power'],
    };
  const fail = (message) => {
    throw new Error(`${message}: ${relativePath}`);
  };
  const speciesId = view.getUint16(0x1a, true);
  const level = bytes[0x5b];
  const nature = bytes[0x34];
  const gender = bytes[0x35];
  const ability = bytes[0x36];
  const shiny = bytes[0x37];
  const egg = bytes[0x5c];
  if (speciesId < 1 || speciesId > 649) fail('Invalid species');
  if (level > 100) fail('Invalid level');
  if (nature !== 0xff && nature > 24) fail('Unknown nature');
  if (gender > 2) fail('Unknown gender');
  if (ability > 4) fail('Unknown ability');
  if (shiny > 2) fail('Unknown shiny policy');
  if (egg > 1) fail('Unknown egg flag');
  const fixedIvs = {};
  for (const [stat, offset] of Object.entries(IV_OFFSETS)) {
    const value = bytes[offset];
    if (value !== 0xff) {
      if (value > 31) fail(`Invalid ${stat} IV`);
      fixedIvs[stat] = value;
    }
  }
  if (view.getUint32(8, true) !== 0) fail('Unsupported fixed PID; explicit exclusion required');
  if (level === 0) fail('Unsupported random level; explicit exclusion required');
  if (bytes[0x1c] !== 0) fail('Unsupported form; explicit exclusion required');
  if (ability === 4) fail('Unsupported random hidden ability; explicit exclusion required');
  let cardTitle;
  try {
    cardTitle = decodeTitle(bytes.subarray(0x60, 0xaa));
  } catch (error) {
    fail(error.message);
  }
  const entry = {
    id: metadata.id,
    cardTitle,
    versions: metadata.versions,
    kind: egg ? 'egg' : 'pokemon',
    ...(!egg && { trainer: { tid: view.getUint16(0, true), sid: view.getUint16(2, true) } }),
    speciesId,
    level,
    fixedIvs,
    ...(nature !== 0xff && { fixedNature: NATURES[nature] }),
    ...(gender !== 2 && { fixedGender: ['Male', 'Female'][gender] }),
    ...(ability !== 3 && { fixedAbilitySlot: ['First', 'Second', 'Hidden'][ability] }),
    shinyPolicy: ['Never', 'Random', 'Always'][shiny],
  };
  return { language: metadata.language, entry };
}
