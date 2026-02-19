/**
 * 孵化起動時刻検索ページコンポーネント
 *
 * 目的の孵化個体を得るための DS 起動日時・条件を逆引きする。
 * FeaturePageLayout による Controls / Results 2 ペイン構成。
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { SearchContextForm } from '@/components/forms/search-context-form';
import { SearchControls } from '@/components/forms/search-controls';
import { SearchConfirmationDialog } from '@/components/forms/search-confirmation-dialog';
import { DataTable } from '@/components/data-display/data-table';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { useTrainer } from '@/hooks/use-trainer';
import { useUiStore } from '@/stores/settings/ui';
import { useEggSearch } from '../hooks/use-egg-search';
import { useEggSearchStore } from '../store';
import { validateEggSearchForm } from '../types';
import type { EggValidationErrorCode } from '../types';
import { EggParamsForm } from '@/components/forms/egg-params-form';
import { EggFilterForm } from '@/components/forms/egg-filter-form';
import { createEggResultColumns } from './egg-result-columns';
import { ResultDetailDialog } from './result-detail-dialog';
import { ExportToolbar } from '@/components/data-display/export-toolbar';
import { useExport } from '@/hooks/use-export';
import { createEggSearchExportColumns } from '@/services/export-columns';
import { estimateEggSearchResults, countKeyCombinations } from '@/services/search-estimation';
import type {
  DatetimeSearchContext,
  EggGenerationParams,
  GenerationConfig,
  EggDatetimeSearchResult,
} from '@/wasm/wasm_pkg.js';

/* ------------------------------------------------------------------ */
/*  EggSearchPage                                                       */
/* ------------------------------------------------------------------ */

function EggSearchPage(): ReactElement {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);

  // DS 設定 (サイドバーで管理済み)
  const { config: dsConfig, ranges, gameStart } = useDsConfigReadonly();

  // トレーナー情報
  const { tid, sid } = useTrainer();

  // フォーム状態 (Feature Store)
  const dateRange = useEggSearchStore((s) => s.dateRange);
  const setDateRange = useEggSearchStore((s) => s.setDateRange);
  const timeRange = useEggSearchStore((s) => s.timeRange);
  const setTimeRange = useEggSearchStore((s) => s.setTimeRange);
  const keySpec = useEggSearchStore((s) => s.keySpec);
  const setKeySpec = useEggSearchStore((s) => s.setKeySpec);
  const eggParams = useEggSearchStore((s) => s.eggParams);
  const setEggParams = useEggSearchStore((s) => s.setEggParams);
  const genConfigPartial = useEggSearchStore((s) => s.genConfig);
  const setGenConfigPartial = useEggSearchStore((s) => s.setGenConfig);
  const filter = useEggSearchStore((s) => s.filter);
  const setFilter = useEggSearchStore((s) => s.setFilter);

  // 検索フック
  const { isLoading, isInitialized, progress, results, error, startSearch, cancel } =
    useEggSearch();

  // バリデーション
  const validation = useMemo(
    () =>
      validateEggSearchForm({
        dateRange,
        timeRange,
        keySpec,
        eggParams,
        genConfig: genConfigPartial,
        filter,
      }),
    [dateRange, timeRange, keySpec, eggParams, genConfigPartial, filter]
  );

  // i18n: バリデーションエラーコード → 翻訳済みメッセージ
  const validationMessages = useMemo(
    (): Record<EggValidationErrorCode, string> => ({
      DATE_RANGE_INVALID: t`Start date must be on or before end date`,
      TIME_RANGE_INVALID: t`Time range is invalid`,
      ADVANCE_RANGE_INVALID: t`Max advance must be ≥ start offset`,
      OFFSET_NEGATIVE: t`Start offset must be ≥ 0`,
      IV_OUT_OF_RANGE: t`IVs must be in the range 0 to 31`,
    }),
    [t]
  );

  // 詳細ダイアログ
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<EggDatetimeSearchResult | undefined>();

  const handleSelectResult = useCallback((result: EggDatetimeSearchResult) => {
    setSelectedResult(result);
    setDetailOpen(true);
  }, []);

  const columns = useMemo(
    () => createEggResultColumns(language, handleSelectResult),
    [language, handleSelectResult]
  );

  // エクスポート
  const exportColumns = useMemo(() => createEggSearchExportColumns(language), [language]);
  const exportActions = useExport({
    data: results,
    columns: exportColumns,
    featureId: 'egg-search',
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

    // トレーナー情報を反映
    const paramsWithTrainer: EggGenerationParams = {
      ...eggParams,
      trainer: { tid: tid ?? 0, sid: sid ?? 0 },
    };

    const fullGenConfig: GenerationConfig = {
      version: dsConfig.version,
      game_start: gameStart,
      user_offset: genConfigPartial.user_offset,
      max_advance: genConfigPartial.max_advance,
    };

    startSearch(context, paramsWithTrainer, fullGenConfig, filter);
  }, [
    dsConfig,
    dateRange,
    timeRange,
    ranges,
    keySpec,
    eggParams,
    tid,
    sid,
    gameStart,
    genConfigPartial,
    filter,
    startSearch,
  ]);

  // 見積もり → 確認 → 実行
  const handleSearch = useCallback(() => {
    const estimation = estimateEggSearchResults(
      dateRange,
      timeRange,
      ranges,
      keyCombinationCount,
      filter,
      eggParams.masuda_method
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
    filter,
    eggParams.masuda_method,
    handleSearchExecution,
  ]);

  return (
    <>
      <FeaturePageLayout className="pb-32 lg:pb-4">
        <FeaturePageLayout.Controls>
          {/* PC: 検索コントロール */}
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

          <EggParamsForm
            value={eggParams}
            genConfig={genConfigPartial}
            onChange={setEggParams}
            onGenConfigChange={setGenConfigPartial}
            disabled={isLoading}
          />

          <EggFilterForm value={filter} onChange={setFilter} disabled={isLoading} showReset />

          {/* バリデーションエラー */}
          {validation.errors.length > 0 ? (
            <ul className="text-xs text-destructive space-y-0.5">
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
            emptyMessage={t`No results found. Configure parameters and start searching.`}
            getRowId={(_row, index) => String(index)}
          />
          <ResultDetailDialog
            open={detailOpen}
            onOpenChange={setDetailOpen}
            result={selectedResult}
          />
        </FeaturePageLayout.Results>
      </FeaturePageLayout>

      {/* モバイル: 下部固定 検索バー */}
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

export { EggSearchPage };
