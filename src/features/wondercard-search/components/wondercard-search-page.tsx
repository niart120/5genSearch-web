import { useState, useMemo, useCallback } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { SearchControls } from '@/components/forms/search-controls';
import { SearchConfirmationDialog } from '@/components/forms/search-confirmation-dialog';
import { commitActiveInput } from '@/components/forms/input-helpers';
import { DataTable } from '@/components/data-display';
import { ExportToolbar } from '@/components/data-display/export-toolbar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useExport } from '@/hooks/use-export';
import { useUiStore } from '@/stores/settings/ui';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import { useTrainerStore } from '@/stores/settings/trainer';
import { WonderCardParamsForm } from '@/features/wondercard-list/components/wondercard-params-form';
import { WonderCardFilterForm } from '@/features/wondercard-list/components/wondercard-filter-form';
import { ResultDetailDialog } from '@/features/wondercard-list/components/result-detail-dialog';
import { useWonderCardForm } from '@/features/wondercard-list/hooks/use-wondercard-form';
import { buildWonderCardRunSettings } from '@/features/wondercard-list/request';
import type { GeneratedWonderCardData } from '@/wasm/wasm_pkg.js';
import type { WonderCardResultView } from '@/lib/result-view';
import { useWonderCardSearchStore } from '../store';
import { useWonderCardSearch } from '../hooks/use-wondercard-search';
import { createWonderCardSearchExportColumns } from '@/services/export-columns';
import { SearchContextForm } from '@/components/forms/search-context-form';
import { Button } from '@/components/ui/button';
import { navigateToWonderCardListFromSearch } from '@/lib/navigate';
import { estimateWonderCardDatetimeSearchResults } from '@/services/search-estimation';
import {
  getWonderCardSearchContext,
  validateWonderCardSearchRange,
  type WonderCardSearchRequest,
  type WonderCardSearchValidationCode,
} from '../types';
import {
  createWonderCardSearchColumns,
  WONDERCARD_SEARCH_SORTING,
} from './wondercard-search-columns';

export function WonderCardSearchPage() {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const inputs = useWonderCardSearchStore((s) => s.inputs);
  const storedSelection = useWonderCardSearchStore((s) => s.selection);
  const resultRequest = useWonderCardSearchStore((s) => s.resultRequest);
  const formRevision = useWonderCardSearchStore((s) => s.formRevision);
  const { setInputs, setSelection } = useWonderCardSearchStore.getState();
  const form = useWonderCardForm(inputs, storedSelection, setSelection);
  const { isLoading, isInitialized, progress, results, error, execute, cancel } =
    useWonderCardSearch(language);
  const statMode = inputs.statMode;
  const dateRange = useWonderCardSearchStore((s) => s.dateRange);
  const timeRange = useWonderCardSearchStore((s) => s.timeRange);
  const keySpec = useWonderCardSearchStore((s) => s.keySpec);
  const ranges = useDsConfigStore((s) => s.ranges);
  const { setDateRange, setTimeRange, setKeySpec } = useWonderCardSearchStore.getState();
  const rangeCodes = validateWonderCardSearchRange({ dateRange, timeRange, keySpec }, ranges);
  const messages: Record<WonderCardSearchValidationCode, string> = {
    DATE_RANGE_INVALID: t`Enter a valid date range within 2000–2099`,
    TIME_RANGE_INVALID: t`Time range is invalid`,
    STARTUP_RANGE_INVALID: t`Set a valid Timer0 / VCount range`,
  };
  const errors = [...form.errors, ...rangeCodes.map((code) => messages[code])];
  const isValid = form.isValid && rangeCodes.length === 0;
  const [selectedRaw, setSelectedRaw] = useState<GeneratedWonderCardData>();
  const [detailOpen, setDetailOpen] = useState(false);
  const selected = useMemo(
    () => results.find((row) => row.raw === selectedRaw),
    [results, selectedRaw]
  );
  const onSelect = useCallback((row: WonderCardResultView) => {
    setSelectedRaw(row.raw);
    setDetailOpen(true);
  }, []);
  const columns = useMemo(
    () => createWonderCardSearchColumns({ onSelect, statMode, locale: language }),
    [onSelect, statMode, language]
  );
  const exportColumns = useMemo(() => createWonderCardSearchExportColumns(statMode), [statMode]);
  const exportActions = useExport({
    data: results,
    columns: exportColumns,
    featureId: 'wondercard-search',
    statMode,
    versionOverride: resultRequest?.settings.genConfig.version,
    gameStartOverride: resultRequest?.settings.genConfig.game_start,
    contextOverride: resultRequest?.settings,
  });
  const [confirmation, setConfirmation] = useState<{
    request: WonderCardSearchRequest;
    estimatedCount: number;
  }>();
  const [requestError, setRequestError] = useState<Error>();
  const handleSearch = useCallback(() => {
    commitActiveInput();
    setRequestError(undefined);
    try {
      const state = useWonderCardSearchStore.getState();
      const ds = useDsConfigStore.getState();
      const settings = buildWonderCardRunSettings(
        state.inputs,
        state.selection,
        ds,
        useTrainerStore.getState()
      );
      if (!settings) return;
      if (validateWonderCardSearchRange(state, ds.ranges).length > 0) return;
      const request: WonderCardSearchRequest = structuredClone({
        settings,
        dateRange: state.dateRange,
        timeRange: state.timeRange,
        keySpec: state.keySpec,
      });
      const estimation = estimateWonderCardDatetimeSearchResults(
        getWonderCardSearchContext(request),
        settings.genConfig,
        settings.filter,
        settings.card.fixedIvs
      );
      if (estimation.exceedsThreshold)
        setConfirmation({ request, estimatedCount: estimation.estimatedCount });
      else execute(request);
    } catch (error) {
      setRequestError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [execute]);
  const controls = {
    isLoading,
    isInitialized,
    isValid,
    progress,
    error: requestError ?? error,
    onSearch: handleSearch,
    onCancel: cancel,
  };
  return (
    <>
      <FeaturePageLayout className="pb-32 lg:pb-4">
        <FeaturePageLayout.Controls>
          <div className="hidden lg:flex lg:flex-col lg:gap-2">
            <SearchControls layout="desktop" {...controls} />
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
          <WonderCardParamsForm
            value={inputs}
            onChange={setInputs}
            selection={form.selection}
            disabled={isLoading}
            syncKey={formRevision}
          />
          <WonderCardFilterForm
            value={inputs}
            onChange={setInputs}
            context={form.context}
            disabled={isLoading}
          />
          {errors.length > 0 ? (
            <ul className="space-y-0.5 text-xs text-destructive">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : undefined}
        </FeaturePageLayout.Controls>
        <FeaturePageLayout.Results>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              <Trans>Results</Trans>: {results.length.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <Label htmlFor="wondercard-search-stat-mode" className="text-xs">
                IV
              </Label>
              <Switch
                id="wondercard-search-stat-mode"
                checked={statMode === 'stats'}
                onCheckedChange={(checked) => setInputs({ statMode: checked ? 'stats' : 'ivs' })}
                disabled={isLoading}
              />
              <Label htmlFor="wondercard-search-stat-mode" className="text-xs">
                <Trans>Stats</Trans>
              </Label>
              <ExportToolbar resultCount={results.length} exportActions={exportActions} />
            </div>
          </div>
          <DataTable
            columns={columns}
            data={results}
            className="flex-1"
            emptyMessage={t`No results found. Configure parameters and start searching.`}
            getRowId={(_row, index) => String(index)}
            initialSorting={WONDERCARD_SEARCH_SORTING}
          />
          <ResultDetailDialog open={detailOpen} onOpenChange={setDetailOpen} result={selected}>
            <Button
              disabled={!selected || !resultRequest}
              onClick={() => {
                if (selected && resultRequest)
                  navigateToWonderCardListFromSearch(selected.raw.source, resultRequest);
              }}
            >
              <Trans>Check in Deliveryman list</Trans>
            </Button>
          </ResultDetailDialog>
        </FeaturePageLayout.Results>
      </FeaturePageLayout>
      <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-border bg-background p-3 lg:hidden">
        <SearchControls layout="mobile" {...controls} />
      </div>
      <SearchConfirmationDialog
        open={confirmation !== undefined}
        onOpenChange={(open) => {
          if (!open) setConfirmation(undefined);
        }}
        estimatedCount={confirmation?.estimatedCount ?? 0}
        onConfirm={() => {
          const request = confirmation?.request;
          setConfirmation(undefined);
          if (request) execute(request);
        }}
      />
    </>
  );
}
