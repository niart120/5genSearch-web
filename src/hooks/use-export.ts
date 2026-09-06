/**
 * エクスポート操作フック
 *
 * ExportToolbar の状態管理とエクスポート実行を提供する。
 * DS 設定は useDsConfigReadonly から取得し、meta / ファイル名生成に使用する。
 */

import { useState, useCallback, useMemo } from 'react';
import { useLingui } from '@lingui/react/macro';
import { toast } from '@/components/ui/toast-state';
import { useDsConfigReadonly } from './use-ds-config';
import {
  toCsv,
  toTsv,
  toJson,
  filterColumns,
  buildExportMeta,
  generateExportFilename,
  downloadFile,
  copyToClipboard,
} from '@/services/export';
import type { ExportColumn, ExportMeta } from '@/services/export';
import type { DatetimeSearchContext, GameStartConfig, RomVersion } from '@/wasm/wasm_pkg';

interface UseExportOptions<T> {
  data: readonly T[];
  columns: ExportColumn<T>[];
  featureId: string;
  statMode?: 'ivs' | 'stats';
  /** JSON エクスポートのカスタムシリアライザー。指定時は列定義を使わずこの関数で出力生成 */
  jsonExporter?: (data: readonly T[], meta: ExportMeta) => string;
  /**
   * meta.gameStart に使用する GameStartConfig のオーバーライド。
   * feature-local な GameStartConfig をサイドバーの値の代わりに使用したい場合 (例: tid-adjust) に指定する。
   */
  gameStartOverride?: GameStartConfig;
  /** 結果生成時の ROM バージョン。現在のサイドバー設定より優先する。 */
  versionOverride?: RomVersion;
  /** 日時検索結果の本体設定・起動範囲を検索開始時の値に固定する。 */
  contextOverride?: Pick<DatetimeSearchContext, 'ds' | 'ranges'>;
}

interface UseExportReturn {
  downloadCsv: () => void;
  downloadJson: () => void;
  copyTsv: () => Promise<void>;
  includeDetails: boolean;
  setIncludeDetails: (value: boolean) => void;
  hasDetailColumns: boolean;
}

function useExport<T>(options: UseExportOptions<T>): UseExportReturn {
  const {
    data,
    columns,
    featureId,
    statMode,
    jsonExporter,
    gameStartOverride,
    versionOverride,
    contextOverride,
  } = options;
  const { t } = useLingui();
  const {
    config: storeConfig,
    ranges: storeRanges,
    gameStart: storeGameStart,
  } = useDsConfigReadonly();
  const config = contextOverride?.ds ?? storeConfig;
  const ranges = contextOverride?.ranges ?? storeRanges;
  const gameStart = gameStartOverride ?? storeGameStart;
  const exportConfig = useMemo(
    () => (versionOverride === undefined ? config : { ...config, version: versionOverride }),
    [config, versionOverride]
  );
  const [includeDetails, setIncludeDetails] = useState(false);

  const hasDetailColumns = useMemo(() => columns.some((c) => c.detailOnly), [columns]);

  const activeColumns = useMemo(
    () => filterColumns(columns, includeDetails),
    [columns, includeDetails]
  );

  const downloadCsv = useCallback(() => {
    try {
      const content = toCsv(data, activeColumns);
      const filename = generateExportFilename(exportConfig, 'csv');
      downloadFile(content, filename, 'text/csv;charset=utf-8');
      toast.success(t`Downloaded ${filename}`);
    } catch {
      toast.error(t`Export failed`);
    }
  }, [data, activeColumns, exportConfig, t]);

  const downloadJson = useCallback(() => {
    try {
      const meta = buildExportMeta({
        feature: featureId,
        totalResults: data.length,
        includeDetails,
        statMode,
        config: exportConfig,
        gameStart,
        ranges,
      });
      const content = jsonExporter ? jsonExporter(data, meta) : toJson(data, activeColumns, meta);
      const filename = generateExportFilename(exportConfig, 'json');
      downloadFile(content, filename, 'application/json;charset=utf-8');
      toast.success(t`Downloaded ${filename}`);
    } catch {
      toast.error(t`Export failed`);
    }
  }, [
    data,
    activeColumns,
    exportConfig,
    gameStart,
    ranges,
    featureId,
    includeDetails,
    statMode,
    jsonExporter,
    t,
  ]);

  const copyTsv = useCallback(async () => {
    try {
      const content = toTsv(data, activeColumns);
      await copyToClipboard(content);
      toast.success(t`Copied to clipboard`);
    } catch {
      toast.error(t`Export failed`);
    }
  }, [data, activeColumns, t]);

  return useMemo(
    () => ({
      downloadCsv,
      downloadJson,
      copyTsv,
      includeDetails,
      setIncludeDetails,
      hasDetailColumns,
    }),
    [downloadCsv, downloadJson, copyTsv, includeDetails, hasDetailColumns]
  );
}

export { useExport };
export type { UseExportOptions, UseExportReturn };
