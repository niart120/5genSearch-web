/**
 * エクスポートコアロジック
 *
 * CSV / JSON / TSV 変換、ファイルダウンロード、クリップボードコピーの
 * 純粋関数を提供する。React / Store に依存しない。
 */

import { formatMacAddress, toBigintHex } from '@/lib/format';
import type {
  DsConfig,
  GameStartConfig,
  Hardware,
  RomRegion,
  RomVersion,
  SeedOrigin,
  Timer0VCountRange,
} from '@/wasm/wasm_pkg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** エクスポート列定義 */
interface ExportColumn<T> {
  /** CSV ヘッダー / JSON キー */
  key: string;
  /** 表示ラベル (CSV ヘッダー用) */
  header: string;
  /** データ抽出関数 */
  accessor: (row: T) => string;
  /** detail-only フラグ (true の場合 includeDetails=true 時のみ出力) */
  detailOnly?: boolean;
}

// ---------------------------------------------------------------------------
// JSON meta types
// ---------------------------------------------------------------------------

interface ExportDsConfig {
  version: string;
  region: string;
  hardware: string;
  macAddress: string;
}

interface ExportGameStart {
  startMode: string;
  save: string;
  memoryLink: string;
  shinyCharm: string;
}

interface ExportTimer0VCountRange {
  timer0Min: number;
  timer0Max: number;
  vcountMin: number;
  vcountMax: number;
}

interface ExportMeta {
  exportedAt: string;
  feature: string;
  totalResults: number;
  includeDetails: boolean;
  statMode?: 'ivs' | 'stats';
  dsConfig: ExportDsConfig;
  gameStart: ExportGameStart;
  timer0VCountRanges: ExportTimer0VCountRange[];
}

// ---------------------------------------------------------------------------
// Filename mapping
// ---------------------------------------------------------------------------

const VERSION_MAP: Record<RomVersion, string> = {
  Black: 'b1',
  White: 'w1',
  Black2: 'b2',
  White2: 'w2',
};

const REGION_MAP: Record<RomRegion, string> = {
  Jpn: 'jpn',
  Kor: 'kor',
  Usa: 'usa',
  Ger: 'ger',
  Fra: 'fra',
  Spa: 'spa',
  Ita: 'ita',
};

const HARDWARE_MAP: Record<Hardware, string> = {
  Ds: 'ods',
  DsLite: 'dsL',
  Dsi: 'dsi',
  Dsi3ds: '3ds',
};

// ---------------------------------------------------------------------------
// CSV / TSV / JSON conversion
// ---------------------------------------------------------------------------

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function toCsv<T>(rows: readonly T[], columns: ExportColumn<T>[]): string {
  const BOM = '\uFEFF';
  const header = columns.map((c) => escapeCsvField(c.header)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCsvField(c.accessor(row))).join(','))
    .join('\r\n');
  return `${BOM}${header}\r\n${body}`;
}

function toTsv<T>(rows: readonly T[], columns: ExportColumn<T>[]): string {
  const header = columns.map((c) => c.header).join('\t');
  const body = rows.map((row) => columns.map((c) => c.accessor(row)).join('\t')).join('\n');
  return `${header}\n${body}`;
}

function toJson<T>(rows: readonly T[], columns: ExportColumn<T>[], meta: ExportMeta): string {
  const results = rows.map((row) => {
    const obj: Record<string, string> = {};
    for (const col of columns) {
      obj[col.key] = col.accessor(row);
    }
    return obj;
  });
  return JSON.stringify({ meta, results }, undefined, 2);
}

// ---------------------------------------------------------------------------
// SeedOrigin JSON serialization
// ---------------------------------------------------------------------------

/**
 * SeedOrigin を JSON シリアライズ可能な形式に変換する。
 *
 * bigint (base_seed) を 16 桁ゼロパディング hex 文字列に変換し、
 * その他のフィールドはそのまま保持する。
 * 将来的な pokemon-list 側でのインポート (デシリアライズ) を想定した構造。
 */
function serializeSeedOrigin(origin: SeedOrigin): SerializedSeedOrigin {
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

/** SeedOrigin のシリアライズ済み型 (bigint → hex 文字列) */
type SerializedSeedOrigin =
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

/**
 * SeedOrigin[] を構造的にシリアライズした JSON を生成する。
 *
 * CSV/TSV 用の列定義とは独立した出力形式。
 * results 配列には SeedOrigin の構造がそのまま保持される。
 */
function toSeedOriginJson(rows: readonly SeedOrigin[], meta: ExportMeta): string {
  const results = rows.map((origin) => serializeSeedOrigin(origin));
  return JSON.stringify({ meta, results }, undefined, 2);
}

// ---------------------------------------------------------------------------
// Column filtering
// ---------------------------------------------------------------------------

function filterColumns<T>(columns: ExportColumn<T>[], includeDetails: boolean): ExportColumn<T>[] {
  if (includeDetails) return columns;
  return columns.filter((c) => !c.detailOnly);
}

// ---------------------------------------------------------------------------
// Meta construction
// ---------------------------------------------------------------------------

function buildExportMeta(options: {
  feature: string;
  totalResults: number;
  includeDetails: boolean;
  statMode?: 'ivs' | 'stats';
  config: DsConfig;
  gameStart: GameStartConfig;
  ranges: Timer0VCountRange[];
}): ExportMeta {
  return {
    exportedAt: new Date().toISOString(),
    feature: options.feature,
    totalResults: options.totalResults,
    includeDetails: options.includeDetails,
    statMode: options.statMode,
    dsConfig: {
      version: options.config.version,
      region: options.config.region,
      hardware: options.config.hardware,
      macAddress: formatMacAddress(options.config.mac),
    },
    gameStart: {
      startMode: options.gameStart.start_mode,
      save: options.gameStart.save,
      memoryLink: options.gameStart.memory_link,
      shinyCharm: options.gameStart.shiny_charm,
    },
    timer0VCountRanges: options.ranges.map((r) => ({
      timer0Min: r.timer0_min,
      timer0Max: r.timer0_max,
      vcountMin: r.vcount_min,
      vcountMax: r.vcount_max,
    })),
  };
}

// ---------------------------------------------------------------------------
// Filename generation
// ---------------------------------------------------------------------------

function generateExportFilename(config: DsConfig, ext: 'csv' | 'json'): string {
  const now = new Date();
  const ts = [
    String(now.getFullYear()).slice(2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  const ver = VERSION_MAP[config.version];
  const reg = REGION_MAP[config.region];
  const hw = HARDWARE_MAP[config.hardware];
  const mac = formatMacAddress(config.mac).replaceAll(':', '');
  return `${ts}_${ver}_${reg}_${hw}_${mac}.${ext}`;
}

// ---------------------------------------------------------------------------
// File download / Clipboard
// ---------------------------------------------------------------------------

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  escapeCsvField,
  toCsv,
  toTsv,
  toJson,
  toSeedOriginJson,
  serializeSeedOrigin,
  filterColumns,
  buildExportMeta,
  generateExportFilename,
  downloadFile,
  copyToClipboard,
  VERSION_MAP,
  REGION_MAP,
  HARDWARE_MAP,
};

export type {
  ExportColumn,
  ExportDsConfig,
  ExportGameStart,
  ExportTimer0VCountRange,
  ExportMeta,
  SerializedSeedOrigin,
};
