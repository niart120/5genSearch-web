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
import type { ExportColumn } from '@/services/export';

interface UseExportOptions<T> {
  data: readonly T[];
  columns: ExportColumn<T>[];
  featureId: string;
  statMode?: 'ivs' | 'stats';
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
  const { data, columns, featureId, statMode } = options;
  const { t } = useLingui();
  const { config, ranges, gameStart } = useDsConfigReadonly();
  const [includeDetails, setIncludeDetails] = useState(false);

  const hasDetailColumns = useMemo(() => columns.some((c) => c.detailOnly), [columns]);

  const activeColumns = useMemo(
    () => filterColumns(columns, includeDetails),
    [columns, includeDetails]
  );

  const downloadCsv = useCallback(() => {
    try {
      const content = toCsv(data, activeColumns);
      const filename = generateExportFilename(config, 'csv');
      downloadFile(content, filename, 'text/csv;charset=utf-8');
      toast.success(t`Downloaded ${filename}`);
    } catch {
      toast.error(t`Export failed`);
    }
  }, [data, activeColumns, config, t]);

  const downloadJson = useCallback(() => {
    try {
      const meta = buildExportMeta({
        feature: featureId,
        totalResults: data.length,
        includeDetails,
        statMode,
        config,
        gameStart,
        ranges,
      });
      const content = toJson(data, activeColumns, meta);
      const filename = generateExportFilename(config, 'json');
      downloadFile(content, filename, 'application/json;charset=utf-8');
      toast.success(t`Downloaded ${filename}`);
    } catch {
      toast.error(t`Export failed`);
    }
  }, [data, activeColumns, config, gameStart, ranges, featureId, includeDetails, statMode, t]);

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
