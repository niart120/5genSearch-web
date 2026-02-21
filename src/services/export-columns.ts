/**
 * feature 別エクスポート列定義
 *
 * 各 feature に対応するエクスポート用列定義を提供する。
 * CSV ヘッダーは英語固定 (機械可読性を優先)。
 */

import {
  formatDatetime,
  formatGender,
  formatKeyCode,
  formatShiny,
  formatAbilitySlot,
  toHex,
  toBigintHex,
} from '@/lib/format';
import { getNeedleArrow, getNatureName } from '@/lib/game-data-names';
import type { StatDisplayMode } from '@/lib/game-data-names';
import type { SupportedLocale } from '@/i18n';
import type { ExportColumn } from './export';
import type {
  EggDatetimeSearchResult,
  MtseedResult,
  SeedOrigin,
  TrainerInfoSearchResult,
  UiEggData,
  UiPokemonData,
} from '@/wasm/wasm_pkg';

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

function createPokemonListExportColumns(statMode: StatDisplayMode): ExportColumn<UiPokemonData>[] {
  const isStatsMode = statMode === 'stats';
  const statLabels = ['H', 'A', 'B', 'C', 'D', 'S'] as const;
  const ivKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

  const baseColumns: ExportColumn<UiPokemonData>[] = [
    { key: 'advance', header: 'Advance', accessor: (r) => String(r.advance) },
    { key: 'needle', header: 'Needle', accessor: (r) => getNeedleArrow(r.needle_direction) },
    { key: 'species', header: 'Species', accessor: (r) => r.species_name },
    { key: 'nature', header: 'Nature', accessor: (r) => r.nature_name },
    { key: 'ability', header: 'Ability', accessor: (r) => r.ability_name },
    { key: 'gender', header: 'Gender', accessor: (r) => r.gender_symbol },
    { key: 'shiny', header: 'Shiny', accessor: (r) => r.shiny_symbol },
  ];

  // Primary stat columns (based on current statMode)
  const primaryStatColumns: ExportColumn<UiPokemonData>[] = statLabels.map((label, i) => ({
    key: ivKeys[i],
    header: label,
    accessor: (r: UiPokemonData) => (isStatsMode ? r.stats[i] : r.ivs[i]),
  }));

  const trailingColumns: ExportColumn<UiPokemonData>[] = [
    { key: 'hidden_power', header: 'Hidden Power', accessor: (r) => r.hidden_power_type },
    { key: 'level', header: 'Lv', accessor: (r) => String(r.level) },
    { key: 'pid', header: 'PID', accessor: (r) => r.pid },
    { key: 'sync', header: 'Sync', accessor: (r) => (r.sync_applied ? '〇' : '×') },
    { key: 'held_item', header: 'Held item', accessor: (r) => r.held_item_name ?? '' },
  ];

  // Detail-only columns
  const detailColumns: ExportColumn<UiPokemonData>[] = [
    { key: 'base_seed', header: 'Base Seed', accessor: (r) => r.base_seed, detailOnly: true },
    { key: 'mt_seed', header: 'MT Seed', accessor: (r) => r.mt_seed, detailOnly: true },
    {
      key: 'datetime',
      header: 'Date/Time',
      accessor: (r) => r.datetime_iso ?? '',
      detailOnly: true,
    },
    { key: 'timer0', header: 'Timer0', accessor: (r) => r.timer0 ?? '', detailOnly: true },
    { key: 'vcount', header: 'VCount', accessor: (r) => r.vcount ?? '', detailOnly: true },
    { key: 'key_input', header: 'Key input', accessor: (r) => r.key_input ?? '', detailOnly: true },
  ];

  // Alternate stat columns (opposite of current statMode)
  const altStatColumns: ExportColumn<UiPokemonData>[] = statLabels.map((label, i) => ({
    key: `${ivKeys[i]}_alt`,
    header: `${label}(${isStatsMode ? 'IV' : 'Stats'})`,
    accessor: (r: UiPokemonData) => (isStatsMode ? r.ivs[i] : r.stats[i]),
    detailOnly: true,
  }));

  const moreDetailColumns: ExportColumn<UiPokemonData>[] = [
    {
      key: 'hidden_power_power',
      header: 'Hidden Power (Power)',
      accessor: (r) => r.hidden_power_power,
      detailOnly: true,
    },
    {
      key: 'moving_encounter',
      header: 'Moving encounter',
      accessor: (r) => r.moving_encounter_guaranteed ?? '',
      detailOnly: true,
    },
    {
      key: 'special_encounter',
      header: 'Special encounter',
      accessor: (r) => r.special_encounter_triggered ?? '',
      detailOnly: true,
    },
    {
      key: 'special_direction',
      header: 'Special direction',
      accessor: (r) => r.special_encounter_direction ?? '',
      detailOnly: true,
    },
    {
      key: 'encounter_result',
      header: 'Encounter result',
      accessor: (r) => r.encounter_result,
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

function createEggListExportColumns(statMode: StatDisplayMode): ExportColumn<UiEggData>[] {
  const isStatsMode = statMode === 'stats';
  const statLabels = ['H', 'A', 'B', 'C', 'D', 'S'] as const;
  const ivKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

  const baseColumns: ExportColumn<UiEggData>[] = [
    { key: 'advance', header: 'Advance', accessor: (r) => String(r.advance) },
    { key: 'needle', header: 'Needle', accessor: (r) => getNeedleArrow(r.needle_direction) },
    { key: 'nature', header: 'Nature', accessor: (r) => r.nature_name },
    { key: 'ability', header: 'Ability', accessor: (r) => r.ability_name },
    { key: 'gender', header: 'Gender', accessor: (r) => r.gender_symbol },
    { key: 'shiny', header: 'Shiny', accessor: (r) => r.shiny_symbol },
  ];

  const primaryStatColumns: ExportColumn<UiEggData>[] = statLabels.map((label, i) => ({
    key: ivKeys[i],
    header: label,
    accessor: (r: UiEggData) => (isStatsMode ? r.stats[i] : r.ivs[i]),
  }));

  const trailingColumns: ExportColumn<UiEggData>[] = [
    { key: 'hidden_power', header: 'Hidden Power', accessor: (r) => r.hidden_power_type },
    { key: 'pid', header: 'PID', accessor: (r) => r.pid },
    {
      key: 'margin_frames',
      header: 'Margin',
      accessor: (r) => (r.margin_frames === undefined ? '-' : String(r.margin_frames)),
    },
  ];

  const detailColumns: ExportColumn<UiEggData>[] = [
    { key: 'species', header: 'Species', accessor: (r) => r.species_name ?? '', detailOnly: true },
    { key: 'base_seed', header: 'Base Seed', accessor: (r) => r.base_seed, detailOnly: true },
    { key: 'mt_seed', header: 'MT Seed', accessor: (r) => r.mt_seed, detailOnly: true },
    {
      key: 'datetime',
      header: 'Date/Time',
      accessor: (r) => r.datetime_iso ?? '',
      detailOnly: true,
    },
    { key: 'timer0', header: 'Timer0', accessor: (r) => r.timer0 ?? '', detailOnly: true },
    { key: 'vcount', header: 'VCount', accessor: (r) => r.vcount ?? '', detailOnly: true },
    { key: 'key_input', header: 'Key input', accessor: (r) => r.key_input ?? '', detailOnly: true },
  ];

  const altStatColumns: ExportColumn<UiEggData>[] = statLabels.map((label, i) => ({
    key: `${ivKeys[i]}_alt`,
    header: `${label}(${isStatsMode ? 'IV' : 'Stats'})`,
    accessor: (r: UiEggData) => (isStatsMode ? r.ivs[i] : r.stats[i]),
    detailOnly: true,
  }));

  const moreDetailColumns: ExportColumn<UiEggData>[] = [
    {
      key: 'hidden_power_power',
      header: 'Hidden Power (Power)',
      accessor: (r) => r.hidden_power_power,
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
      header: 'Key',
      accessor: (r) => {
        const s = getStartup(r);
        return s ? formatKeyCode(s.condition.key_code) : '';
      },
    },
    {
      key: 'base_seed',
      header: 'Base Seed',
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

function createEggSearchExportColumns(
  locale: SupportedLocale
): ExportColumn<EggDatetimeSearchResult>[] {
  const ivKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
  const statLabels = ['H', 'A', 'B', 'C', 'D', 'S'] as const;

  const getEggStartup = (r: EggDatetimeSearchResult) => getStartup(r.egg.source);

  const baseColumns: ExportColumn<EggDatetimeSearchResult>[] = [
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
      accessor: (r) => getNatureName(r.egg.core.nature, locale),
    },
  ];

  const ivColumns: ExportColumn<EggDatetimeSearchResult>[] = statLabels.map((label, i) => ({
    key: ivKeys[i],
    header: label,
    accessor: (r: EggDatetimeSearchResult) =>
      String(r.egg.core.ivs[ivKeys[i] as keyof typeof r.egg.core.ivs]),
  }));

  const trailingColumns: ExportColumn<EggDatetimeSearchResult>[] = [
    {
      key: 'ability',
      header: 'Ability',
      accessor: (r) => formatAbilitySlot(r.egg.core.ability_slot),
    },
    { key: 'gender', header: 'Gender', accessor: (r) => formatGender(r.egg.core.gender) },
    { key: 'shiny', header: 'Shiny', accessor: (r) => formatShiny(r.egg.core.shiny_type) },
    { key: 'advance', header: 'Advance', accessor: (r) => String(r.egg.advance) },
    {
      key: 'margin',
      header: 'Margin',
      accessor: (r) => (r.egg.margin_frames === undefined ? '-' : String(r.egg.margin_frames)),
    },
  ];

  const detailColumns: ExportColumn<EggDatetimeSearchResult>[] = [
    {
      key: 'base_seed',
      header: 'Base Seed',
      accessor: (r) => toBigintHex(getBaseSeed(r.egg.source), 16),
      detailOnly: true,
    },
    {
      key: 'key_input',
      header: 'Key input',
      accessor: (r) => {
        const s = getEggStartup(r);
        return s ? formatKeyCode(s.condition.key_code) : '';
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
    { key: 'tid', header: 'TID', accessor: (r) => String(r.trainer.tid) },
    { key: 'sid', header: 'SID', accessor: (r) => String(r.trainer.sid) },
    {
      key: 'shiny',
      header: 'Shiny',
      accessor: (r) => (r.shiny_type ? formatShiny(r.shiny_type) : ''),
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
