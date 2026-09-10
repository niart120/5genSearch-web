import { useState, useMemo, useCallback } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { SearchControls } from '@/components/forms/search-controls';
import { SearchConfirmationDialog } from '@/components/forms/search-confirmation-dialog';
import { commitActiveInput } from '@/components/forms/input-helpers';
import { DataTable, ADVANCE_ASC_SORTING } from '@/components/data-display';
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
import { useWonderCardListStore } from '../store';
import { useWonderCardList } from '../hooks/use-wondercard-list';
import { createWonderCardListExportColumns } from '@/services/export-columns';
import { SeedInputSection } from '@/components/forms/seed-input-section';
import { estimateWonderCardListResults } from '@/services/search-estimation';
import { createWonderCardResultColumns } from './wondercard-result-columns';
import type { WonderCardListRequest } from '../types';

export function WonderCardListPage() {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const inputs = useWonderCardListStore((s) => s.inputs);
  const storedSelection = useWonderCardListStore((s) => s.selection);
  const resultRequest = useWonderCardListStore((s) => s.resultRequest);
  const formRevision = useWonderCardListStore((s) => s.formRevision);
  const { setInputs, setSelection } = useWonderCardListStore.getState();
  const form = useWonderCardForm(inputs, storedSelection, setSelection);
  const { isLoading, isInitialized, progress, results, error, execute, cancel } =
    useWonderCardList(language);
  const statMode = inputs.statMode;
  const seedInputMode = useWonderCardListStore((s) => s.seedInputMode);
  const seedInput = useWonderCardListStore((s) => s.seedInput);
  const seedOrigins = useWonderCardListStore((s) => s.seedOrigins);
  const { setSeedInputMode, setSeedInput, setSeedOrigins } = useWonderCardListStore.getState();
  const errors = [
    ...form.errors,
    ...(seedOrigins.length === 0 ? [t`Select or enter at least one seed`] : []),
  ];
  const isValid = form.isValid && seedOrigins.length > 0;
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
    () => createWonderCardResultColumns({ onSelect, statMode, locale: language }),
    [onSelect, statMode, language]
  );
  const exportColumns = useMemo(() => createWonderCardListExportColumns(statMode), [statMode]);
  const exportActions = useExport({
    data: results,
    columns: exportColumns,
    featureId: 'wondercard-list',
    statMode,
    versionOverride: resultRequest?.settings.genConfig.version,
    gameStartOverride: resultRequest?.settings.genConfig.game_start,
    contextOverride: resultRequest?.settings,
  });
  const [confirmation, setConfirmation] = useState<{
    request: WonderCardListRequest;
    estimatedCount: number;
  }>();
  const [requestError, setRequestError] = useState<Error>();
  const handleSearch = useCallback(() => {
    commitActiveInput();
    setRequestError(undefined);
    try {
      const state = useWonderCardListStore.getState();
      const ds = useDsConfigStore.getState();
      const settings = buildWonderCardRunSettings(
        state.inputs,
        state.selection,
        ds,
        useTrainerStore.getState()
      );
      if (!settings) return;
      if (state.seedOrigins.length === 0) return;
      const request: WonderCardListRequest = structuredClone({
        settings,
        origins: state.seedOrigins,
      });
      const estimation = estimateWonderCardListResults(
        request.origins.length,
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
          <SeedInputSection
            key={formRevision}
            featureId="wondercard-list"
            mode={seedInputMode}
            onModeChange={setSeedInputMode}
            origins={seedOrigins}
            onOriginsChange={setSeedOrigins}
            input={seedInput}
            onInputChange={setSeedInput}
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
              <Label htmlFor="wondercard-list-stat-mode" className="text-xs">
                IV
              </Label>
              <Switch
                id="wondercard-list-stat-mode"
                checked={statMode === 'stats'}
                onCheckedChange={(checked) => setInputs({ statMode: checked ? 'stats' : 'ivs' })}
                disabled={isLoading}
              />
              <Label htmlFor="wondercard-list-stat-mode" className="text-xs">
                <Trans>Stats</Trans>
              </Label>
              <ExportToolbar resultCount={results.length} exportActions={exportActions} />
            </div>
          </div>
          <DataTable
            columns={columns}
            data={results}
            className="flex-1"
            emptyMessage={t`No results found. Configure parameters and start generating.`}
            getRowId={(_row, index) => String(index)}
            initialSorting={ADVANCE_ASC_SORTING}
          />
          <ResultDetailDialog
            open={detailOpen}
            onOpenChange={setDetailOpen}
            result={selected}
          ></ResultDetailDialog>
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
