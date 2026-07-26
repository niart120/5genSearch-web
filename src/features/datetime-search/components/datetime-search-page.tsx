/**
 * 起動時刻検索ページコンポーネント
 *
 * MT Seed から DS 起動日時・条件を逆引きする。
 * FeaturePageLayout による Controls / Results 2 ペイン構成。
 */

import { useState, useMemo, useCallback, useEffect, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { SearchContextForm } from '@/components/forms/search-context-form';
import { SearchControls } from '@/components/forms/search-controls';
import { SearchConfirmationDialog } from '@/components/forms/search-confirmation-dialog';
import { TargetSeedsInput } from '@/components/forms/target-seeds-input';
import { Button } from '@/components/ui/button';
import { DataTable, DATETIME_ASC_SORTING } from '@/components/data-display';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import { useSearchResultsStore } from '@/stores/search/results';
import { toHex } from '@/lib/format';
import { useDatetimeSearch } from '../hooks/use-datetime-search';
import { useDatetimeSearchStore } from '../store';
import { parseTargetSeeds, validateMtseedSearchForm } from '../types';
import type { ValidationErrorCode, ParseErrorCode } from '../types';
import { createSeedOriginColumns } from './seed-origin-columns';
import { ResultDetailDialog } from './result-detail-dialog';
import { TemplateSelectionDialog } from './template-selection-dialog';
import { ExportToolbar } from '@/components/data-display/export-toolbar';
import { useExport } from '@/hooks/use-export';
import { createDatetimeSearchExportColumns } from '@/services/export-columns';
import { toSeedOriginJson } from '@/services/export';
import { navigateWithSeedOrigins } from '@/lib/navigate';
import { toast } from '@/components/ui/toast-state';
import { estimateDatetimeSearchResults, countKeyCombinations } from '@/services/search-estimation';
import { getStandardContexts } from '@/lib/iv-tooltip';
import type { DatetimeSearchContext, SeedOrigin } from '@/wasm/wasm_pkg.js';

interface DatetimeSearchRequest {
  context: DatetimeSearchContext;
  seeds: number[];
}

/* ------------------------------------------------------------------ */
/*  DatetimeSearchPage                                                 */
/* ------------------------------------------------------------------ */

function DatetimeSearchPage(): ReactElement {
  const { t } = useLingui();

  // DS 設定 (サイドバーで管理済み)
  const { config: dsConfig } = useDsConfigReadonly();

  // フォーム状態 (Feature Store)
  const dateRange = useDatetimeSearchStore((s) => s.dateRange);
  const setDateRange = useDatetimeSearchStore((s) => s.setDateRange);
  const timeRange = useDatetimeSearchStore((s) => s.timeRange);
  const setTimeRange = useDatetimeSearchStore((s) => s.setTimeRange);
  const keySpec = useDatetimeSearchStore((s) => s.keySpec);
  const setKeySpec = useDatetimeSearchStore((s) => s.setKeySpec);
  const targetSeedsRaw = useDatetimeSearchStore((s) => s.targetSeedsRaw);
  const setTargetSeedsRaw = useDatetimeSearchStore((s) => s.setTargetSeedsRaw);
  const useGpu = useDatetimeSearchStore((s) => s.useGpu);
  const setUseGpu = useDatetimeSearchStore((s) => s.setUseGpu);
  const pendingTargetSeeds = useSearchResultsStore((s) => s.pendingTargetSeeds);

  // MT Seed 検索からの連携: pendingTargetSeeds をフォームに反映
  useEffect(() => {
    if (pendingTargetSeeds.length === 0) return;
    const pending = useSearchResultsStore.getState().consumePendingTargetSeeds();
    if (pending.length > 0) {
      setTargetSeedsRaw(pending.map((s) => toHex(s, 8)).join('\n'));
    }
  }, [pendingTargetSeeds, setTargetSeedsRaw]);

  // 検索フック
  const { isLoading, isInitialized, progress, results, error, startSearch, cancel } =
    useDatetimeSearch();

  // パース + バリデーション
  const parsedSeeds = useMemo(() => parseTargetSeeds(targetSeedsRaw), [targetSeedsRaw]);
  const validation = useMemo(
    () => validateMtseedSearchForm({ dateRange, timeRange, keySpec, targetSeedsRaw }, parsedSeeds),
    [dateRange, timeRange, keySpec, targetSeedsRaw, parsedSeeds]
  );

  // i18n: バリデーションエラーコード → 翻訳済みメッセージ
  const validationMessages = useMemo(
    (): Record<ValidationErrorCode, string> => ({
      DATE_RANGE_INVALID: t`Start date must be on or before end date`,
      TIME_RANGE_INVALID: t`Time range is invalid`,
      SEEDS_EMPTY: t`Enter at least one MT Seed`,
      SEEDS_INVALID: t`MT Seed must be in the range 0 to FFFFFFFF`,
    }),
    [t]
  );

  // i18n: パースエラーコード → 翻訳済みメッセージ
  const parseErrorMessages = useMemo(
    (): Record<ParseErrorCode, string> => ({
      INVALID_HEX: t`Enter a hex value in the range 0 to FFFFFFFF`,
    }),
    [t]
  );

  const translatedParseErrors = useMemo(
    () =>
      parsedSeeds.errors.map((err) => ({
        line: err.line,
        value: err.value,
        message: parseErrorMessages[err.code],
      })),
    [parsedSeeds.errors, parseErrorMessages]
  );

  // テンプレートダイアログ
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // テンプレート適用
  const handleTemplateApply = useCallback(
    (seeds: number[]) => {
      const text = seeds.map((s) => toHex(s, 8)).join('\n');
      setTargetSeedsRaw(text);
    },
    [setTargetSeedsRaw]
  );

  // 詳細ダイアログ
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<SeedOrigin | undefined>();

  const handleSelectOrigin = useCallback((origin: SeedOrigin) => {
    setSelectedOrigin(origin);
    setDetailOpen(true);
  }, []);

  const contexts = useMemo(() => getStandardContexts(dsConfig.version), [dsConfig.version]);
  const columns = useMemo(
    () => createSeedOriginColumns(contexts, handleSelectOrigin),
    [contexts, handleSelectOrigin]
  );

  // エクスポート
  const exportColumns = useMemo(() => createDatetimeSearchExportColumns(), []);
  const exportActions = useExport({
    data: results,
    columns: exportColumns,
    featureId: 'datetime-search',
    jsonExporter: toSeedOriginJson,
  });

  // 転記: 全結果 → pokemon-list
  const handleTransferToPokemonList = useCallback(() => {
    navigateWithSeedOrigins(results, 'pokemon-list');
    toast.success(t`Transferred ${results.length} seeds`);
  }, [results, t]);

  // 確認ダイアログ
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    estimatedCount: number;
    request: DatetimeSearchRequest | undefined;
  }>({ open: false, estimatedCount: 0, request: undefined });

  const createSearchRequest = useCallback((): DatetimeSearchRequest | undefined => {
    const form = useDatetimeSearchStore.getState();
    const parsed = parseTargetSeeds(form.targetSeedsRaw);
    const currentValidation = validateMtseedSearchForm(
      {
        dateRange: form.dateRange,
        timeRange: form.timeRange,
        keySpec: form.keySpec,
        targetSeedsRaw: form.targetSeedsRaw,
      },
      parsed
    );
    if (!currentValidation.isValid) return;

    const dsState = useDsConfigStore.getState();
    const context: DatetimeSearchContext = {
      ds: { ...dsState.config, mac: [...dsState.config.mac] },
      date_range: { ...form.dateRange },
      time_range: { ...form.timeRange },
      ranges: dsState.ranges.map((range) => ({ ...range })),
      key_spec: { available_buttons: [...form.keySpec.available_buttons] },
    };
    return { context, seeds: [...parsed.seeds] };
  }, []);

  // 見積もり → 確認 → 実行
  const handleSearch = useCallback(() => {
    const request = createSearchRequest();
    if (!request) return;

    const estimation = estimateDatetimeSearchResults(
      request.context.date_range,
      request.context.time_range,
      request.context.ranges,
      countKeyCombinations(request.context.key_spec),
      request.seeds.length
    );
    if (estimation.exceedsThreshold) {
      setConfirmDialog({ open: true, estimatedCount: estimation.estimatedCount, request });
    } else {
      startSearch(request.context, request.seeds);
    }
  }, [createSearchRequest, startSearch]);

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
              useGpu={useGpu}
              onGpuChange={setUseGpu}
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
          />

          <section className="flex flex-col gap-2">
            <h3 id="mt-seed-heading" className="text-sm font-medium">
              <Trans>MT Seed</Trans>
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTemplateDialogOpen(true)}
              disabled={isLoading}
            >
              <Trans>Template</Trans>
            </Button>

            <TargetSeedsInput
              value={targetSeedsRaw}
              onChange={setTargetSeedsRaw}
              parsedSeeds={parsedSeeds.seeds}
              errors={translatedParseErrors}
              disabled={isLoading}
            />
          </section>

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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTransferToPokemonList}
                disabled={results.length === 0}
              >
                <Trans>Transfer to Pokemon list</Trans>
              </Button>
              <ExportToolbar resultCount={results.length} exportActions={exportActions} />
            </div>
          </div>
          <DataTable
            columns={columns}
            data={results}
            className="flex-1"
            emptyMessage={t`No results found. Please enter MT Seeds and start searching.`}
            getRowId={(_row, index) => String(index)}
            initialSorting={DATETIME_ASC_SORTING}
          />
          <ResultDetailDialog
            open={detailOpen}
            onOpenChange={setDetailOpen}
            seedOrigin={selectedOrigin}
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
          useGpu={useGpu}
          onGpuChange={setUseGpu}
          progress={progress}
          error={error}
          onSearch={handleSearch}
          onCancel={cancel}
        />
      </div>

      <SearchConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) =>
            open ? { ...prev, open } : { open, estimatedCount: 0, request: undefined }
          )
        }
        estimatedCount={confirmDialog.estimatedCount}
        onConfirm={() => {
          const request = confirmDialog.request;
          setConfirmDialog({ open: false, estimatedCount: 0, request: undefined });
          if (request) {
            startSearch(request.context, request.seeds);
          }
        }}
      />

      <TemplateSelectionDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onApply={handleTemplateApply}
        currentVersion={dsConfig.version}
      />
    </>
  );
}

export { DatetimeSearchPage };
