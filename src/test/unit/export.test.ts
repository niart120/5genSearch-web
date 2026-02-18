/**
 * エクスポートコアロジックのユニットテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  escapeCsvField,
  toCsv,
  toTsv,
  toJson,
  filterColumns,
  generateExportFilename,
  buildExportMeta,
  VERSION_MAP,
  HARDWARE_MAP,
} from '@/services/export';
import type { ExportColumn, ExportMeta } from '@/services/export';
import { createPokemonListExportColumns } from '@/services/export-columns';
import type { DsConfig, GameStartConfig, Timer0VCountRange } from '@/wasm/wasm_pkg';

// ---------------------------------------------------------------------------
// テスト用型・データ
// ---------------------------------------------------------------------------

interface TestRow {
  name: string;
  value: number;
}

const TEST_COLUMNS: ExportColumn<TestRow>[] = [
  { key: 'name', header: 'Name', accessor: (r) => r.name },
  { key: 'value', header: 'Value', accessor: (r) => String(r.value) },
];

const TEST_ROWS: TestRow[] = [
  { name: 'Alpha', value: 1 },
  { name: 'Beta', value: 2 },
];

function createTestDsConfig(overrides: Partial<DsConfig> = {}): DsConfig {
  return {
    version: 'Black',
    region: 'Jpn',
    hardware: 'DsLite',
    mac: [0x00, 0x09, 0xbf, 0xaa, 0xbb, 0xcc],
    ...overrides,
  };
}

function createTestGameStart(): GameStartConfig {
  return {
    start_mode: 'Continue',
    save: 'NoSave',
    memory_link: 'Disabled',
    shiny_charm: 'NotObtained',
  };
}

function createTestRanges(): Timer0VCountRange[] {
  return [{ timer0_min: 0x06_10, timer0_max: 0x06_30, vcount_min: 0x50, vcount_max: 0x60 }];
}

// ---------------------------------------------------------------------------
// escapeCsvField
// ---------------------------------------------------------------------------

describe('escapeCsvField', () => {
  it('エスケープ不要な値はそのまま返す', () => {
    expect(escapeCsvField('hello')).toBe('hello');
    expect(escapeCsvField('12345')).toBe('12345');
    expect(escapeCsvField('')).toBe('');
  });

  it('カンマを含む値をダブルクオートで囲む', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
  });

  it('ダブルクオートを含む値を "" でエスケープして囲む', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('改行を含む値をダブルクオートで囲む', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsvField('line1\r\nline2')).toBe('"line1\r\nline2"');
  });
});

// ---------------------------------------------------------------------------
// toCsv
// ---------------------------------------------------------------------------

describe('toCsv', () => {
  it('ヘッダーとデータ行を正しく生成する', () => {
    const csv = toCsv(TEST_ROWS, TEST_COLUMNS);
    const lines = csv.split('\r\n');
    // BOM + header
    expect(lines[0]).toBe('\uFEFFName,Value');
    expect(lines[1]).toBe('Alpha,1');
    expect(lines[2]).toBe('Beta,2');
  });

  it('先頭に BOM が付与される', () => {
    const csv = toCsv(TEST_ROWS, TEST_COLUMNS);
    expect(csv.charAt(0)).toBe('\uFEFF');
  });

  it('カンマを含む値をエスケープする', () => {
    const rows = [{ name: 'A,B', value: 3 }];
    const csv = toCsv(rows, TEST_COLUMNS);
    expect(csv).toContain('"A,B"');
  });

  it('ダブルクオートを含む値を正しくエスケープする', () => {
    const rows = [{ name: 'say "hi"', value: 4 }];
    const csv = toCsv(rows, TEST_COLUMNS);
    expect(csv).toContain('"say ""hi"""');
  });

  it('空データで正しく動作する', () => {
    const csv = toCsv([], TEST_COLUMNS);
    expect(csv).toBe('\uFEFFName,Value\r\n');
  });
});

// ---------------------------------------------------------------------------
// toTsv
// ---------------------------------------------------------------------------

describe('toTsv', () => {
  it('タブ区切りで正しく生成する', () => {
    const tsv = toTsv(TEST_ROWS, TEST_COLUMNS);
    const lines = tsv.split('\n');
    expect(lines[0]).toBe('Name\tValue');
    expect(lines[1]).toBe('Alpha\t1');
    expect(lines[2]).toBe('Beta\t2');
  });

  it('BOM なし LF 改行', () => {
    const tsv = toTsv(TEST_ROWS, TEST_COLUMNS);
    expect(tsv.charAt(0)).not.toBe('\uFEFF');
    expect(tsv).not.toContain('\r\n');
  });
});

// ---------------------------------------------------------------------------
// toJson
// ---------------------------------------------------------------------------

describe('toJson', () => {
  const meta: ExportMeta = {
    exportedAt: '2025-01-01T00:00:00.000Z',
    feature: 'test',
    totalResults: 2,
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
      { timer0Min: 0x06_10, timer0Max: 0x06_30, vcountMin: 0x50, vcountMax: 0x60 },
    ],
  };

  it('meta + results 構造が正しい', () => {
    const json = toJson(TEST_ROWS, TEST_COLUMNS, meta);
    const parsed = JSON.parse(json);
    expect(parsed.meta).toBeDefined();
    expect(parsed.results).toBeDefined();
    expect(parsed.results).toHaveLength(2);
  });

  it('results の各行が key-value オブジェクト', () => {
    const json = toJson(TEST_ROWS, TEST_COLUMNS, meta);
    const parsed = JSON.parse(json);
    expect(parsed.results[0]).toEqual({ name: 'Alpha', value: '1' });
    expect(parsed.results[1]).toEqual({ name: 'Beta', value: '2' });
  });

  it('meta.dsConfig が正しく出力される', () => {
    const json = toJson(TEST_ROWS, TEST_COLUMNS, meta);
    const parsed = JSON.parse(json);
    expect(parsed.meta.dsConfig.version).toBe('Black');
    expect(parsed.meta.dsConfig.macAddress).toBe('00:09:bf:aa:bb:cc');
  });

  it('meta.gameStart が正しく出力される', () => {
    const json = toJson(TEST_ROWS, TEST_COLUMNS, meta);
    const parsed = JSON.parse(json);
    expect(parsed.meta.gameStart.startMode).toBe('Continue');
    expect(parsed.meta.gameStart.save).toBe('NoSave');
  });

  it('meta.timer0VCountRanges が正しく出力される', () => {
    const json = toJson(TEST_ROWS, TEST_COLUMNS, meta);
    const parsed = JSON.parse(json);
    expect(parsed.meta.timer0VCountRanges).toHaveLength(1);
    expect(parsed.meta.timer0VCountRanges[0].timer0Min).toBe(0x06_10);
  });

  it('meta.includeDetails が正しく反映される', () => {
    const metaWithDetails = { ...meta, includeDetails: true };
    const json = toJson(TEST_ROWS, TEST_COLUMNS, metaWithDetails);
    const parsed = JSON.parse(json);
    expect(parsed.meta.includeDetails).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// filterColumns
// ---------------------------------------------------------------------------

describe('filterColumns', () => {
  const columnsWithDetail: ExportColumn<TestRow>[] = [
    { key: 'name', header: 'Name', accessor: (r) => r.name },
    { key: 'value', header: 'Value', accessor: (r) => String(r.value) },
    { key: 'detail', header: 'Detail', accessor: () => 'x', detailOnly: true },
  ];

  it('includeDetails=false で detailOnly 列を除外する', () => {
    const filtered = filterColumns(columnsWithDetail, false);
    expect(filtered).toHaveLength(2);
    expect(filtered.every((c) => !c.detailOnly)).toBe(true);
  });

  it('includeDetails=true で全列を含む', () => {
    const filtered = filterColumns(columnsWithDetail, true);
    expect(filtered).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// generateExportFilename
// ---------------------------------------------------------------------------

describe('generateExportFilename', () => {
  beforeEach(() => {
    // 2025-06-15 14:30:45
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 15, 14, 30, 45));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('各セグメントが正しくマッピングされる', () => {
    const config = createTestDsConfig();
    const filename = generateExportFilename(config, 'csv');
    // 250615143045_b1_jpn_dsL_0009BFAABBCC.csv
    expect(filename).toBe('250615143045_b1_jpn_dsL_0009bfaabbcc.csv');
  });

  it('全 version マッピング', () => {
    const versions = Object.entries(VERSION_MAP) as [keyof typeof VERSION_MAP, string][];
    for (const [version, expected] of versions) {
      const config = createTestDsConfig({ version });
      const filename = generateExportFilename(config, 'csv');
      expect(filename).toContain(`_${expected}_`);
    }
  });

  it('全 hardware マッピング', () => {
    const hardwares = Object.entries(HARDWARE_MAP) as [keyof typeof HARDWARE_MAP, string][];
    for (const [hardware, expected] of hardwares) {
      const config = createTestDsConfig({ hardware });
      const filename = generateExportFilename(config, 'csv');
      expect(filename).toContain(`_${expected}_`);
    }
  });

  it('json 拡張子', () => {
    const config = createTestDsConfig();
    const filename = generateExportFilename(config, 'json');
    expect(filename).toMatch(/\.json$/);
  });
});

// ---------------------------------------------------------------------------
// buildExportMeta
// ---------------------------------------------------------------------------

describe('buildExportMeta', () => {
  it('DS 設定が正しく変換される', () => {
    const meta = buildExportMeta({
      feature: 'pokemon-list',
      totalResults: 10,
      includeDetails: false,
      config: createTestDsConfig(),
      gameStart: createTestGameStart(),
      ranges: createTestRanges(),
    });
    expect(meta.dsConfig.version).toBe('Black');
    expect(meta.dsConfig.macAddress).toBe('00:09:bf:aa:bb:cc');
  });

  it('GameStartConfig が正しく変換される', () => {
    const meta = buildExportMeta({
      feature: 'pokemon-list',
      totalResults: 10,
      includeDetails: false,
      config: createTestDsConfig(),
      gameStart: createTestGameStart(),
      ranges: createTestRanges(),
    });
    expect(meta.gameStart.startMode).toBe('Continue');
    expect(meta.gameStart.save).toBe('NoSave');
    expect(meta.gameStart.memoryLink).toBe('Disabled');
  });

  it('Timer0/VCount 範囲が正しく変換される', () => {
    const meta = buildExportMeta({
      feature: 'pokemon-list',
      totalResults: 10,
      includeDetails: false,
      config: createTestDsConfig(),
      gameStart: createTestGameStart(),
      ranges: createTestRanges(),
    });
    expect(meta.timer0VCountRanges).toHaveLength(1);
    expect(meta.timer0VCountRanges[0].timer0Min).toBe(0x06_10);
    expect(meta.timer0VCountRanges[0].timer0Max).toBe(0x06_30);
    expect(meta.timer0VCountRanges[0].vcountMin).toBe(0x50);
    expect(meta.timer0VCountRanges[0].vcountMax).toBe(0x60);
  });

  it('statMode が設定される', () => {
    const meta = buildExportMeta({
      feature: 'pokemon-list',
      totalResults: 10,
      includeDetails: false,
      statMode: 'ivs',
      config: createTestDsConfig(),
      gameStart: createTestGameStart(),
      ranges: createTestRanges(),
    });
    expect(meta.statMode).toBe('ivs');
  });
});

// ---------------------------------------------------------------------------
// pokemon-list columns — statMode
// ---------------------------------------------------------------------------

describe('createPokemonListExportColumns', () => {
  it('statMode=ivs で IV 列が primary', () => {
    const columns = createPokemonListExportColumns('ivs');
    // primary columns (H, A, B, C, D, S) should NOT be detailOnly
    const hpCol = columns.find((c) => c.key === 'hp');
    expect(hpCol).toBeDefined();
    expect(hpCol!.detailOnly).toBeUndefined();

    // alternate stats columns should be detailOnly
    const hpAlt = columns.find((c) => c.key === 'hp_alt');
    expect(hpAlt).toBeDefined();
    expect(hpAlt!.detailOnly).toBe(true);
    expect(hpAlt!.header).toContain('Stats');
  });

  it('statMode=stats で Stats 列が primary', () => {
    const columns = createPokemonListExportColumns('stats');
    // primary columns should NOT be detailOnly
    const hpCol = columns.find((c) => c.key === 'hp');
    expect(hpCol).toBeDefined();
    expect(hpCol!.detailOnly).toBeUndefined();

    // alternate IV columns should be detailOnly
    const hpAlt = columns.find((c) => c.key === 'hp_alt');
    expect(hpAlt).toBeDefined();
    expect(hpAlt!.detailOnly).toBe(true);
    expect(hpAlt!.header).toContain('IV');
  });
});
