/**
 * feature 別エクスポート列定義
 *
 * 各 feature に対応するエクスポート用列定義を提供する。
 * CSV ヘッダーは英語固定 (機械可読性を優先)。
 */

import { formatDatetime, formatKeyMask, formatShiny, toHex, toBigintHex } from '@/lib/format';
import { getNeedleArrow } from '@/lib/game-data-names';
import type { StatDisplayMode } from '@/lib/game-data-names';
import type {
  EggListResultView,
  EggSearchResultView,
  PokemonListResultView,
} from '@/lib/result-view';
import type { ExportColumn } from './export';
import type { MtseedResult, SeedOrigin, TrainerInfoSearchResult } from '@/wasm/wasm_pkg';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** SeedOrigin から Startup バリアントを抽出 */
function getStartup(origin: SeedOrigin) {
  if ('Startup' in origin) return origin.Startup;
  return;
}

/** SeedOrigin から base_seed を抽出 */
function getBaseSeed(origin: SeedOrigin): bigint {
  if ('Startup' in origin) return origin.Startup.base_seed;
  return origin.Seed.base_seed;
}

/** SeedOrigin から mt_seed を抽出 */
function getMtSeed(origin: SeedOrigin): number {
  if ('Startup' in origin) return origin.Startup.mt_seed;
  return origin.Seed.mt_seed;
}

// ---------------------------------------------------------------------------
// pokemon-list columns
// ---------------------------------------------------------------------------

function createPokemonListExportColumns(
  statMode: StatDisplayMode
): ExportColumn<PokemonListResultView>[] {
  const isStatsMode = statMode === 'stats';
  const statLabels = ['H', 'A', 'B', 'C', 'D', 'S'] as const;
  const ivKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

  const baseColumns: ExportColumn<PokemonListResultView>[] = [
    { key: 'advance', header: 'Advance', accessor: (r) => String(r.ui.advance) },
    {
      key: 'needle',
      header: 'Needle',
      accessor: (r) => getNeedleArrow(r.ui.needle_direction),
    },
    { key: 'species', header: 'Species', accessor: (r) => r.ui.species_name },
    { key: 'nature', header: 'Nature', accessor: (r) => r.ui.nature_name },
    { key: 'ability', header: 'Ability', accessor: (r) => r.ui.ability_name },
    { key: 'gender', header: 'Gender', accessor: (r) => r.ui.gender_symbol },
    { key: 'shiny', header: 'Shiny', accessor: (r) => r.ui.shiny_symbol },
  ];

  // Primary stat columns (based on current statMode)
  const primaryStatColumns: ExportColumn<PokemonListResultView>[] = statLabels.map((label, i) => ({
    key: ivKeys[i],
    header: label,
    accessor: (r: PokemonListResultView) => (isStatsMode ? r.ui.stats[i] : r.ui.ivs[i]),
  }));

  const trailingColumns: ExportColumn<PokemonListResultView>[] = [
    { key: 'hidden_power', header: 'Hidden Power', accessor: (r) => r.ui.hidden_power_type },
    { key: 'level', header: 'Lv', accessor: (r) => String(r.ui.level) },
    { key: 'pid', header: 'PID', accessor: (r) => r.ui.pid },
    { key: 'sync', header: 'Sync', accessor: (r) => (r.ui.sync_applied ? '〇' : '×') },
    { key: 'held_item', header: 'Held item', accessor: (r) => r.ui.held_item_name ?? '' },
  ];

  // Detail-only columns
  const detailColumns: ExportColumn<PokemonListResultView>[] = [
    { key: 'base_seed', header: 'LCG Seed', accessor: (r) => r.ui.base_seed, detailOnly: true },
    { key: 'mt_seed', header: 'MT Seed', accessor: (r) => r.ui.mt_seed, detailOnly: true },
    {
      key: 'datetime',
      header: 'Date/Time',
      accessor: (r) => r.ui.datetime_iso ?? '',
      detailOnly: true,
    },
    { key: 'timer0', header: 'Timer0', accessor: (r) => r.ui.timer0 ?? '', detailOnly: true },
    { key: 'vcount', header: 'VCount', accessor: (r) => r.ui.vcount ?? '', detailOnly: true },
    {
      key: 'key_input',
      header: 'Key input',
      accessor: (r) => r.ui.key_input ?? '',
      detailOnly: true,
    },
  ];

  // Alternate stat columns (opposite of current statMode)
  const altStatColumns: ExportColumn<PokemonListResultView>[] = statLabels.map((label, i) => ({
    key: `${ivKeys[i]}_alt`,
    header: `${label}(${isStatsMode ? 'IV' : 'Stats'})`,
    accessor: (r: PokemonListResultView) => (isStatsMode ? r.ui.ivs[i] : r.ui.stats[i]),
    detailOnly: true,
  }));

  const moreDetailColumns: ExportColumn<PokemonListResultView>[] = [
    {
      key: 'hidden_power_power',
      header: 'Hidden Power (Power)',
      accessor: (r) => r.ui.hidden_power_power,
      detailOnly: true,
    },
    {
      key: 'moving_encounter',
      header: 'Moving encounter',
      accessor: (r) => r.ui.moving_encounter_guaranteed ?? '',
      detailOnly: true,
    },
    {
      key: 'special_encounter',
      header: 'Special encounter',
      accessor: (r) => r.ui.special_encounter_triggered ?? '',
      detailOnly: true,
    },
    {
      key: 'special_direction',
      header: 'Special direction',
      accessor: (r) => r.ui.special_encounter_direction ?? '',
      detailOnly: true,
    },
    {
      key: 'encounter_result',
      header: 'Encounter result',
      accessor: (r) => r.ui.encounter_result,
      detailOnly: true,
    },
  ];

  return [
    ...baseColumns,
    ...primaryStatColumns,
    ...trailingColumns,
    ...detailColumns,
    ...altStatColumns,
    ...moreDetailColumns,
  ];
}

// ---------------------------------------------------------------------------
// egg-list columns
// ---------------------------------------------------------------------------

function createEggListExportColumns(statMode: StatDisplayMode): ExportColumn<EggListResultView>[] {
  const isStatsMode = statMode === 'stats';
  const statLabels = ['H', 'A', 'B', 'C', 'D', 'S'] as const;
  const ivKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

  const baseColumns: ExportColumn<EggListResultView>[] = [
    { key: 'advance', header: 'Advance', accessor: (r) => String(r.ui.advance) },
    {
      key: 'needle',
      header: 'Needle',
      accessor: (r) => getNeedleArrow(r.ui.needle_direction),
    },
    { key: 'nature', header: 'Nature', accessor: (r) => r.ui.nature_name },
    { key: 'ability', header: 'Ability', accessor: (r) => r.ui.ability_name },
    { key: 'gender', header: 'Gender', accessor: (r) => r.ui.gender_symbol },
    { key: 'shiny', header: 'Shiny', accessor: (r) => r.ui.shiny_symbol },
  ];

  const primaryStatColumns: ExportColumn<EggListResultView>[] = statLabels.map((label, i) => ({
    key: ivKeys[i],
    header: label,
    accessor: (r: EggListResultView) => (isStatsMode ? r.ui.stats[i] : r.ui.ivs[i]),
  }));

  const trailingColumns: ExportColumn<EggListResultView>[] = [
    { key: 'hidden_power', header: 'Hidden Power', accessor: (r) => r.ui.hidden_power_type },
    { key: 'pid', header: 'PID', accessor: (r) => r.ui.pid },
    {
      key: 'margin_frames',
      header: 'Margin',
      accessor: (r) => (r.ui.margin_frames === undefined ? '-' : String(r.ui.margin_frames)),
    },
  ];

  const detailColumns: ExportColumn<EggListResultView>[] = [
    {
      key: 'species',
      header: 'Species',
      accessor: (r) => r.ui.species_name ?? '',
      detailOnly: true,
    },
    { key: 'base_seed', header: 'LCG Seed', accessor: (r) => r.ui.base_seed, detailOnly: true },
    { key: 'mt_seed', header: 'MT Seed', accessor: (r) => r.ui.mt_seed, detailOnly: true },
    {
      key: 'datetime',
      header: 'Date/Time',
      accessor: (r) => r.ui.datetime_iso ?? '',
      detailOnly: true,
    },
    { key: 'timer0', header: 'Timer0', accessor: (r) => r.ui.timer0 ?? '', detailOnly: true },
    { key: 'vcount', header: 'VCount', accessor: (r) => r.ui.vcount ?? '', detailOnly: true },
    {
      key: 'key_input',
      header: 'Key input',
      accessor: (r) => r.ui.key_input ?? '',
      detailOnly: true,
    },
  ];

  const altStatColumns: ExportColumn<EggListResultView>[] = statLabels.map((label, i) => ({
    key: `${ivKeys[i]}_alt`,
    header: `${label}(${isStatsMode ? 'IV' : 'Stats'})`,
    accessor: (r: EggListResultView) => (isStatsMode ? r.ui.ivs[i] : r.ui.stats[i]),
    detailOnly: true,
  }));

  const moreDetailColumns: ExportColumn<EggListResultView>[] = [
    {
      key: 'hidden_power_power',
      header: 'Hidden Power (Power)',
      accessor: (r) => r.ui.hidden_power_power,
      detailOnly: true,
    },
  ];

  return [
    ...baseColumns,
    ...primaryStatColumns,
    ...trailingColumns,
    ...detailColumns,
    ...altStatColumns,
    ...moreDetailColumns,
  ];
}

// ---------------------------------------------------------------------------
// datetime-search columns
// ---------------------------------------------------------------------------

function createDatetimeSearchExportColumns(): ExportColumn<SeedOrigin>[] {
  return [
    {
      key: 'datetime',
      header: 'Date/Time',
      accessor: (r) => {
        const s = getStartup(r);
        return s ? formatDatetime(s.datetime) : '';
      },
    },
    {
      key: 'timer0',
      header: 'Timer0',
      accessor: (r) => {
        const s = getStartup(r);
        return s ? toHex(s.condition.timer0, 4) : '';
      },
    },
    {
      key: 'vcount',
      header: 'VCount',
      accessor: (r) => {
        const s = getStartup(r);
        return s ? toHex(s.condition.vcount, 2) : '';
      },
    },
    {
      key: 'key_input',
      header: 'Key input',
      accessor: (r) => {
        const s = getStartup(r);
        return s ? formatKeyMask(s.condition.key_mask) : '';
      },
    },
    {
      key: 'base_seed',
      header: 'LCG Seed',
      accessor: (r) => toBigintHex(getBaseSeed(r), 16),
    },
    {
      key: 'mt_seed',
      header: 'MT Seed',
      accessor: (r) => toHex(getMtSeed(r), 8),
    },
  ];
}

// ---------------------------------------------------------------------------
// egg-search columns
// ---------------------------------------------------------------------------

function createEggSearchExportColumns(): ExportColumn<EggSearchResultView>[] {
  const ivKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
  const statLabels = ['H', 'A', 'B', 'C', 'D', 'S'] as const;

  const getEggStartup = (r: EggSearchResultView) => getStartup(r.raw.egg.source);

  const baseColumns: ExportColumn<EggSearchResultView>[] = [
    {
      key: 'datetime',
      header: 'Date/Time',
      accessor: (r) => {
        const s = getEggStartup(r);
        return s ? formatDatetime(s.datetime) : '';
      },
    },
    {
      key: 'timer0',
      header: 'Timer0',
      accessor: (r) => {
        const s = getEggStartup(r);
        return s ? toHex(s.condition.timer0, 4) : '';
      },
    },
    {
      key: 'vcount',
      header: 'VCount',
      accessor: (r) => {
        const s = getEggStartup(r);
        return s ? toHex(s.condition.vcount, 2) : '';
      },
    },
    {
      key: 'nature',
      header: 'Nature',
      accessor: (r) => r.ui.nature_name,
    },
  ];

  const ivColumns: ExportColumn<EggSearchResultView>[] = statLabels.map((label, i) => ({
    key: ivKeys[i],
    header: label,
    accessor: (r: EggSearchResultView) => r.ui.ivs[i],
  }));

  const trailingColumns: ExportColumn<EggSearchResultView>[] = [
    { key: 'ability', header: 'Ability', accessor: (r) => r.ui.ability_name },
    { key: 'gender', header: 'Gender', accessor: (r) => r.ui.gender_symbol },
    { key: 'shiny', header: 'Shiny', accessor: (r) => r.ui.shiny_symbol },
    { key: 'advance', header: 'Advance', accessor: (r) => String(r.ui.advance) },
    {
      key: 'margin',
      header: 'Margin',
      accessor: (r) => (r.ui.margin_frames === undefined ? '-' : String(r.ui.margin_frames)),
    },
  ];

  const detailColumns: ExportColumn<EggSearchResultView>[] = [
    {
      key: 'base_seed',
      header: 'LCG Seed',
      accessor: (r) => toBigintHex(getBaseSeed(r.raw.egg.source), 16),
      detailOnly: true,
    },
    {
      key: 'key_input',
      header: 'Key input',
      accessor: (r) => {
        const s = getEggStartup(r);
        return s ? formatKeyMask(s.condition.key_mask) : '';
      },
      detailOnly: true,
    },
  ];

  return [...baseColumns, ...ivColumns, ...trailingColumns, ...detailColumns];
}

// ---------------------------------------------------------------------------
// mtseed-search columns
// ---------------------------------------------------------------------------

function createMtseedSearchExportColumns(): ExportColumn<MtseedResult>[] {
  const ivKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
  const statLabels = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'] as const;

  return [
    { key: 'seed', header: 'MT Seed', accessor: (r) => toHex(r.seed, 8) },
    ...statLabels.map(
      (label, i): ExportColumn<MtseedResult> => ({
        key: ivKeys[i],
        header: label,
        accessor: (r) => String(r.ivs[ivKeys[i] as keyof typeof r.ivs]),
      })
    ),
  ];
}

// ---------------------------------------------------------------------------
// tid-adjust columns
// ---------------------------------------------------------------------------

function createTidAdjustExportColumns(): ExportColumn<TrainerInfoSearchResult>[] {
  return [
    {
      key: 'datetime',
      header: 'Date/Time',
      accessor: (r) => {
        const s = getStartup(r.seed_origin);
        return s ? formatDatetime(s.datetime) : '';
      },
    },
    {
      key: 'timer0',
      header: 'Timer0',
      accessor: (r) => {
        const s = getStartup(r.seed_origin);
        return s ? toHex(s.condition.timer0, 4) : '';
      },
    },
    {
      key: 'vcount',
      header: 'VCount',
      accessor: (r) => {
        const s = getStartup(r.seed_origin);
        return s ? toHex(s.condition.vcount, 2) : '';
      },
    },
    {
      key: 'key_input',
      header: 'Key input',
      accessor: (r) => {
        const s = getStartup(r.seed_origin);
        return s ? formatKeyMask(s.condition.key_mask) : '';
      },
    },
    { key: 'tid', header: 'TID', accessor: (r) => String(r.trainer.tid) },
    { key: 'sid', header: 'SID', accessor: (r) => String(r.trainer.sid) },
    {
      key: 'shiny',
      header: 'Shiny',
      accessor: (r) => (r.shiny_type ? formatShiny(r.shiny_type) : ''),
    },
    {
      key: 'base_seed',
      header: 'LCG Seed',
      accessor: (r) => {
        const s = getStartup(r.seed_origin);
        return s ? toBigintHex(s.base_seed, 16) : '';
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  createPokemonListExportColumns,
  createEggListExportColumns,
  createDatetimeSearchExportColumns,
  createEggSearchExportColumns,
  createMtseedSearchExportColumns,
  createTidAdjustExportColumns,
};

/** 検索結果では起動条件を通常の出力にも含める。 */
export function createPokemonSearchExportColumns(
  statMode: StatDisplayMode
): ExportColumn<PokemonListResultView>[] {
  const columns = createPokemonListExportColumns(statMode);
  const startupKeys = new Set(['datetime', 'timer0', 'vcount', 'key_input']);
  return columns.map((column) => {
    if (column.key === 'datetime') {
      return {
        ...column,
        detailOnly: false,
        accessor: (row: PokemonListResultView) => {
          const startup = getStartup(row.raw.source);
          return startup ? formatDatetime(startup.datetime) : '';
        },
      };
    }
    return startupKeys.has(column.key) ? { ...column, detailOnly: false } : column;
  });
}
