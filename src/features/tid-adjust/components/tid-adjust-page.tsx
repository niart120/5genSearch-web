/**
 * ID 調整ページコンポーネント
 *
 * 指定した TID / SID / 光らせたい PID の条件を満たす DS 起動日時を探索し、
 * 結果をテーブル表示する。
 *
 * GameStartConfig はサイドバーの値を使用せず、Feature-local state で独立管理する。
 * - start_mode: 固定 NewGame (TrainerInfoSearcher のドメイン制約)
 * - shiny_charm: 固定 NotObtained (NewGame 開始時点では未取得)
 * - save / memory_link: ユーザ選択 (Timer0/VCount 分布に影響)
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { SearchContextForm } from '@/components/forms/search-context-form';
import { SearchControls } from '@/components/forms/search-controls';
import { SearchConfirmationDialog } from '@/components/forms/search-confirmation-dialog';
import { DataTable } from '@/components/data-display/data-table';
import { ExportToolbar } from '@/components/data-display/export-toolbar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import { useExport } from '@/hooks/use-export';
import { createTidAdjustExportColumns } from '@/services/export-columns';
import { estimateTidAdjustResults, countKeyCombinations } from '@/services/search-estimation';
import { TidAdjustForm } from './tid-adjust-form';
import { createTrainerInfoColumns } from './trainer-info-columns';
import { useTidAdjust } from '../hooks/use-tid-adjust';
import {
  validateTidAdjustForm,
  toTrainerInfoFilter,
  type TidAdjustValidationErrorCode,
} from '../types';
import type {
  DateRangeParams,
  TimeRangeParams,
  KeySpec,
  DatetimeSearchContext,
  GameStartConfig,
} from '@/wasm/wasm_pkg.js';

const DEFAULT_DATE_RANGE: DateRangeParams = {
  start_year: 2000,
  start_month: 1,
  start_day: 1,
  end_year: 2000,
  end_month: 1,
  end_day: 1,
};

const DEFAULT_TIME_RANGE: TimeRangeParams = {
  hour_start: 0,
  hour_end: 23,
  minute_start: 0,
  minute_end: 59,
  second_start: 0,
  second_end: 59,
};

const DEFAULT_KEY_SPEC: KeySpec = { available_buttons: [] };

/**
 * save と memory_link を統合したセーブ状態。
 * BW: 2 値 (NoSave / WithSave)
 * BW2: 3 値 (NoSave / WithSave / WithSaveMemoryLink)
 */
type SaveMode = 'NoSave' | 'WithSave' | 'WithSaveMemoryLink';

function toGameStartConfig(mode: SaveMode): GameStartConfig {
  return {
    start_mode: 'NewGame',
    shiny_charm: 'NotObtained',
    save: mode === 'NoSave' ? 'NoSave' : 'WithSave',
    memory_link: mode === 'WithSaveMemoryLink' ? 'Enabled' : 'Disabled',
  };
}

function TidAdjustPage(): ReactElement {
  const { t } = useLingui();
  const dsConfig = useDsConfigStore((s) => s.config);
  const ranges = useDsConfigStore((s) => s.ranges);
  const isBw2 = useDsConfigStore(
    (s) => s.config.version === 'Black2' || s.config.version === 'White2'
  );

  // フォーム状態
  const [dateRange, setDateRange] = useState<DateRangeParams>(DEFAULT_DATE_RANGE);
  const [timeRange, setTimeRange] = useState<TimeRangeParams>(DEFAULT_TIME_RANGE);
  const [keySpec, setKeySpec] = useState<KeySpec>(DEFAULT_KEY_SPEC);
  const [tid, setTid] = useState('');
  const [sid, setSid] = useState('');
  const [shinyPidRaw, setShinyPidRaw] = useState('');

  // GameStartConfig: サイドバーの値は使用しない (Feature-local state)
  const [saveMode, setSaveMode] = useState<SaveMode>('NoSave');

  // BW2 → BW 切替時: WithSaveMemoryLink → WithSave にフォールバック
  const effectiveSaveMode = !isBw2 && saveMode === 'WithSaveMemoryLink' ? 'WithSave' : saveMode;

  const tidGameStart = useMemo<GameStartConfig>(
    () => toGameStartConfig(effectiveSaveMode),
    [effectiveSaveMode]
  );

  // 検索フック (CPU 専用)
  const { isLoading, isInitialized, progress, results, error, startSearch, cancel } =
    useTidAdjust();

  // バリデーション
  const validation = useMemo(
    () => validateTidAdjustForm({ dateRange, timeRange, keySpec, tid, sid, shinyPidRaw }),
    [dateRange, timeRange, keySpec, tid, sid, shinyPidRaw]
  );

  const validationMessages = useMemo(
    (): Record<TidAdjustValidationErrorCode, string> => ({
      DATE_RANGE_INVALID: t`Start date must be on or before end date`,
      TIME_RANGE_INVALID: t`Time range is invalid`,
      TID_OUT_OF_RANGE: t`TID must be between 0 and 65535`,
      SID_OUT_OF_RANGE: t`SID must be between 0 and 65535`,
      SHINY_PID_INVALID: t`Shiny PID must be a hex value (0 to FFFFFFFF)`,
    }),
    [t]
  );

  // 列定義
  const columns = useMemo(() => createTrainerInfoColumns(), []);

  // エクスポート
  const exportColumns = useMemo(() => createTidAdjustExportColumns(), []);
  const exportActions = useExport({
    data: results,
    columns: exportColumns,
    featureId: 'tid-adjust',
  });

  // KeySpec 組み合わせ数
  const keyCombinationCount = useMemo(() => countKeyCombinations(keySpec), [keySpec]);

  // 確認ダイアログ
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    estimatedCount: number;
  }>({ open: false, estimatedCount: 0 });

  // 検索実行
  const handleSearchExecution = useCallback(() => {
    const context: DatetimeSearchContext = {
      ds: dsConfig,
      date_range: dateRange,
      time_range: timeRange,
      ranges,
      key_spec: keySpec,
    };
    const filter = toTrainerInfoFilter({ dateRange, timeRange, keySpec, tid, sid, shinyPidRaw });
    startSearch(context, filter, tidGameStart);
  }, [
    dsConfig,
    dateRange,
    timeRange,
    ranges,
    keySpec,
    tid,
    sid,
    shinyPidRaw,
    tidGameStart,
    startSearch,
  ]);

  // 見積もり → 確認 → 実行
  const handleSearch = useCallback(() => {
    // keySpec は toTrainerInfoFilter に必要 (keyCombinationCount とは別用途)
    const filter = toTrainerInfoFilter({ dateRange, timeRange, keySpec, tid, sid, shinyPidRaw });
    const estimation = estimateTidAdjustResults(
      dateRange,
      timeRange,
      ranges,
      keyCombinationCount,
      filter
    );
    if (estimation.exceedsThreshold) {
      setConfirmDialog({ open: true, estimatedCount: estimation.estimatedCount });
    } else {
      handleSearchExecution();
    }
  }, [
    dateRange,
    timeRange,
    ranges,
    keyCombinationCount,
    // keySpec は toTrainerInfoFilter の引数として必要
    keySpec,
    tid,
    sid,
    shinyPidRaw,
    handleSearchExecution,
  ]);

  return (
    <>
      <FeaturePageLayout className="pb-32 lg:pb-4">
        <FeaturePageLayout.Controls>
          {/* PC: 検索コントロール (GPU 非対応 — useGpu/onGpuChange 省略) */}
          <div className="hidden lg:flex lg:flex-col lg:gap-2">
            <SearchControls
              layout="desktop"
              isLoading={isLoading}
              isInitialized={isInitialized}
              isValid={validation.isValid}
              progress={progress}
              error={error}
              onSearch={handleSearch}
              onCancel={cancel}
            />
          </div>

          <SearchContextForm
            dateRange={dateRange}
            timeRange={timeRange}
            keySpec={keySpec}
            onDateRangeChange={setDateRange}
            onTimeRangeChange={setTimeRange}
            onKeySpecChange={setKeySpec}
            disabled={isLoading}
            keyCombinationCount={keyCombinationCount}
          />

          {/* セーブ状態 (サイドバーの値は使用しない) */}
          <Tabs value={effectiveSaveMode} onValueChange={(v) => setSaveMode(v as SaveMode)}>
            <TabsList className="w-full">
              <TabsTrigger value="NoSave" disabled={isLoading} className="flex-1">
                <Trans>No save</Trans>
              </TabsTrigger>
              <TabsTrigger value="WithSave" disabled={isLoading} className="flex-1">
                <Trans>With save</Trans>
              </TabsTrigger>
              {isBw2 ? (
                <TabsTrigger value="WithSaveMemoryLink" disabled={isLoading} className="flex-1">
                  <Trans>Memory Link</Trans>
                </TabsTrigger>
              ) : undefined}
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground">
            <Trans>This setting is independent of the sidebar.</Trans>
          </p>

          <TidAdjustForm
            tid={tid}
            sid={sid}
            shinyPidRaw={shinyPidRaw}
            onTidChange={setTid}
            onSidChange={setSid}
            onShinyPidChange={setShinyPidRaw}
            disabled={isLoading}
          />

          {/* バリデーションエラー */}
          {validation.errors.length > 0 ? (
            <ul className="space-y-0.5 text-xs text-destructive">
              {validation.errors.map((code) => (
                <li key={code}>{validationMessages[code]}</li>
              ))}
            </ul>
          ) : undefined}
        </FeaturePageLayout.Controls>

        <FeaturePageLayout.Results>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              <Trans>Results</Trans>: {results.length.toLocaleString()}
            </p>
            <ExportToolbar resultCount={results.length} exportActions={exportActions} />
          </div>
          <DataTable
            columns={columns}
            data={results}
            className="flex-1"
            emptyMessage={t`No results`}
            getRowId={(_row, index) => String(index)}
          />
        </FeaturePageLayout.Results>
      </FeaturePageLayout>

      {/* モバイル: 下部固定 検索バー (GPU 非対応) */}
      <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-border bg-background p-3 lg:hidden">
        <SearchControls
          layout="mobile"
          isLoading={isLoading}
          isInitialized={isInitialized}
          isValid={validation.isValid}
          progress={progress}
          error={error}
          onSearch={handleSearch}
          onCancel={cancel}
        />
      </div>

      <SearchConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        estimatedCount={confirmDialog.estimatedCount}
        onConfirm={() => {
          setConfirmDialog({ open: false, estimatedCount: 0 });
          handleSearchExecution();
        }}
      />
    </>
  );
}

export { TidAdjustPage };
