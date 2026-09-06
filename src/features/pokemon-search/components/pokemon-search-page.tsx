import { normalizePokemonSearchFilter } from '@/lib/search-filter-context';
import { hasCurrentEncounterSlots } from '@/lib/encounter-slot-context';
import { useState, useMemo, useCallback } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { SearchControls } from '@/components/forms/search-controls';
import { SearchContextForm } from '@/components/forms/search-context-form';
import { SearchConfirmationDialog } from '@/components/forms/search-confirmation-dialog';
import { DataTable } from '@/components/data-display';
import { ExportToolbar } from '@/components/data-display/export-toolbar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { useExport } from '@/hooks/use-export';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import { useTrainerStore } from '@/stores/settings/trainer';
import { useUiStore } from '@/stores/settings/ui';
import { PokemonParamsForm } from '@/features/pokemon-list/components/pokemon-params-form';
import { ResultDetailDialog } from '@/features/pokemon-list/components/result-detail-dialog';
import { createPokemonSearchExportColumns } from '@/services/export-columns';
import { estimatePokemonDatetimeSearchResults } from '@/services/search-estimation';
import { navigateToPokemonListFromSearch } from '@/lib/navigate';
import type { GeneratedPokemonData } from '@/wasm/wasm_pkg.js';
import type { PokemonListResultView } from '@/lib/result-view';
import { usePokemonSearchStore } from '../store';
import { usePokemonSearch } from '../hooks/use-pokemon-search';
import {
  validatePokemonSearchForm,
  type PokemonSearchValidationCode,
  type PokemonSearchRequest,
} from '../types';
import { SearchModeTabs } from './search-mode-tabs';
import { PokemonSearchFilterForm } from './pokemon-search-filter-form';
import { createPokemonSearchColumns, POKEMON_SEARCH_SORTING } from './pokemon-search-columns';

export function PokemonSearchPage() {
  const { t } = useLingui();
  const language = useUiStore((state) => state.language);
  const { config: dsConfig, ranges } = useDsConfigReadonly();
  const tid = useTrainerStore((state) => state.tid);
  const sid = useTrainerStore((state) => state.sid);
  const dateRange = usePokemonSearchStore((state) => state.dateRange);
  const timeRange = usePokemonSearchStore((state) => state.timeRange);
  const keySpec = usePokemonSearchStore((state) => state.keySpec);
  const encounterParams = usePokemonSearchStore((state) => state.encounterParams);
  const filter = usePokemonSearchStore((state) => state.filter);
  const statMode = usePokemonSearchStore((state) => state.statMode);
  const resultRequest = usePokemonSearchStore((state) => state.resultRequest);
  const { setDateRange, setTimeRange, setKeySpec, setEncounterParams, setFilter, setStatMode } =
    usePokemonSearchStore.getState();
  const { isLoading, isInitialized, progress, results, error, startSearch, cancel } =
    usePokemonSearch(language);
  const [requestError, setRequestError] = useState<Error>();
  const validation = validatePokemonSearchForm(
    { dateRange, timeRange, keySpec, encounterParams, filter },
    { tid, sid },
    ranges
  );
  const messages: Record<PokemonSearchValidationCode, string> = {
    DATE_RANGE_INVALID: t`Enter a valid date range within 2000–2099`,
    TIME_RANGE_INVALID: t`Time range is invalid`,
    STARTUP_RANGE_INVALID: t`Set a valid Timer0 / VCount range`,
    ADVANCE_RANGE_INVALID: t`Max advance must be ≥ start offset`,
    ENCOUNTER_SLOTS_EMPTY: t`Select a location or Pokémon`,
    ENCOUNTER_UNSUPPORTED: t`This encounter type is not supported by Pokémon search`,
    LEVEL_RANGE_INVALID: t`Level range must be within 1–100`,
    TID_REQUIRED: t`Set TID to search for shiny Pokémon`,
    SID_REQUIRED: t`Set SID to search for shiny Pokémon`,
  };
  const [selectedRaw, setSelectedRaw] = useState<GeneratedPokemonData>();
  const [detailOpen, setDetailOpen] = useState(false);
  const selected = useMemo(
    () => results.find((result) => result.raw === selectedRaw),
    [results, selectedRaw]
  );
  const onSelect = useCallback((result: PokemonListResultView) => {
    setSelectedRaw(result.raw);
    setDetailOpen(true);
  }, []);
  const columns = useMemo(
    () => createPokemonSearchColumns({ onSelect, statMode, locale: language }),
    [onSelect, statMode, language]
  );
  const exportColumns = useMemo(() => createPokemonSearchExportColumns(statMode), [statMode]);
  const exportActions = useExport({
    data: results,
    columns: exportColumns,
    featureId: 'pokemon-search',
    statMode,
    versionOverride: resultRequest?.genConfig.version,
    gameStartOverride: resultRequest?.genConfig.game_start,
    contextOverride: resultRequest?.context,
  });
  const [confirmation, setConfirmation] = useState<{
    request: PokemonSearchRequest;
    estimatedCount: number;
  }>();
  const execute = useCallback(
    (request: PokemonSearchRequest) => {
      setRequestError(undefined);
      try {
        startSearch(request);
      } catch (error) {
        setRequestError(error instanceof Error ? error : new Error(String(error)));
      }
    },
    [startSearch]
  );
  const handleSearch = useCallback(() => {
    const state = usePokemonSearchStore.getState();
    const ds = useDsConfigStore.getState();
    const trainer = useTrainerStore.getState();
    if (validatePokemonSearchForm(state, trainer, ds.ranges).length > 0) return;
    const encounter = state.encounterParams;
    if (!hasCurrentEncounterSlots(encounter, ds.config.version)) return;
    const request: PokemonSearchRequest = structuredClone({
      context: {
        ds: ds.config,
        ranges: ds.ranges,
        date_range: state.dateRange,
        time_range: state.timeRange,
        key_spec: state.keySpec,
      },
      pokemonParams: {
        trainer: { tid: trainer.tid ?? 0, sid: trainer.sid ?? 0 },
        encounter_type: encounter.encounterType,
        encounter_method: encounter.encounterMethod,
        lead_ability: encounter.leadAbility,
        slots: encounter.slots,
      },
      genConfig: { version: ds.config.version, game_start: ds.gameStart, ...encounter.genConfig },
      filter: normalizePokemonSearchFilter(state.filter, encounter),
      encounterParams: encounter,
    });
    const estimate = estimatePokemonDatetimeSearchResults(
      request.context,
      request.genConfig,
      request.filter
    );
    if (estimate.exceedsThreshold)
      setConfirmation({ request, estimatedCount: estimate.estimatedCount });
    else execute(request);
  }, [execute]);
  const controlProps = {
    isLoading,
    isInitialized,
    isValid: validation.length === 0 && hasCurrentEncounterSlots(encounterParams, dsConfig.version),
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
            <SearchControls layout="desktop" {...controlProps} />
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
          <SearchModeTabs disabled={isLoading}>
            <PokemonParamsForm
              value={encounterParams}
              onChange={setEncounterParams}
              version={dsConfig.version}
              disabled={isLoading}
            />
            <PokemonSearchFilterForm
              context={{
                ...encounterParams,
                slots: hasCurrentEncounterSlots(encounterParams, dsConfig.version)
                  ? encounterParams.slots
                  : [],
              }}
              value={filter}
              onChange={setFilter}
              availableSpecies={encounterParams.availableSpecies}
              disabled={isLoading}
            />
          </SearchModeTabs>
          {validation.length > 0 ? (
            <ul className="space-y-0.5 text-xs text-destructive">
              {validation.map((code) => (
                <li key={code}>{messages[code]}</li>
              ))}
            </ul>
          ) : undefined}
        </FeaturePageLayout.Controls>
        <FeaturePageLayout.Results>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              <Trans>Results</Trans>: {results.length.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <Label htmlFor="search-stat-mode" className="text-xs">
                IV
              </Label>
              <Switch
                id="search-stat-mode"
                checked={statMode === 'stats'}
                onCheckedChange={(checked) => setStatMode(checked ? 'stats' : 'ivs')}
              />
              <Label htmlFor="search-stat-mode" className="text-xs">
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
            initialSorting={POKEMON_SEARCH_SORTING}
          />
          <ResultDetailDialog open={detailOpen} onOpenChange={setDetailOpen} result={selected}>
            <Button
              disabled={!selected || !resultRequest}
              onClick={() => {
                if (selected && resultRequest)
                  navigateToPokemonListFromSearch(
                    selected.raw.source,
                    resultRequest.encounterParams
                  );
              }}
            >
              <Trans>Check in Pokémon list</Trans>
            </Button>
          </ResultDetailDialog>
        </FeaturePageLayout.Results>
      </FeaturePageLayout>
      <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-border bg-background p-3 lg:hidden">
        <SearchControls layout="mobile" {...controlProps} />
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
