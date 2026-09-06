import { normalizePokemonFilter } from '@/lib/search-filter-context';
import { hasCurrentEncounterSlots } from '@/lib/encounter-slot-context';
/**
 * ポケモンリスト生成ページコンポーネント
 *
 * Seed + エンカウント条件からポケモン個体を一括生成し、一覧表示する。
 * FeaturePageLayout による Controls / Results 2 ペイン構成。
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { SearchControls } from '@/components/forms/search-controls';
import { SearchConfirmationDialog } from '@/components/forms/search-confirmation-dialog';
import { DataTable, ADVANCE_ASC_SORTING } from '@/components/data-display';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { useTrainerStore } from '@/stores/settings/trainer';
import { useDsConfigStore } from '@/stores/settings/ds-config';
import { useUiStore } from '@/stores/settings/ui';
import { usePokemonList } from '../hooks/use-pokemon-list';
import { usePokemonListStore } from '../store';
import { validatePokemonListForm } from '../types';
import type { PokemonListValidationErrorCode } from '../types';
import { SeedInputSection } from '@/components/forms/seed-input-section';
import { PokemonParamsForm } from './pokemon-params-form';
import { PokemonFilterForm } from './pokemon-filter-form';
import { createPokemonResultColumns } from './pokemon-result-columns';
import { ResultDetailDialog } from './result-detail-dialog';
import { ExportToolbar } from '@/components/data-display/export-toolbar';
import { useExport } from '@/hooks/use-export';
import { createPokemonListExportColumns } from '@/services/export-columns';
import type {
  GenerationConfig,
  GeneratedPokemonData,
  PokemonFilter,
  PokemonGenerationParams,
  SeedOrigin,
} from '@/wasm/wasm_pkg.js';
import type { PokemonListResultView } from '@/lib/result-view';
import { estimatePokemonListResults } from '@/services/search-estimation';

interface PokemonListRequest {
  origins: SeedOrigin[];
  params: PokemonGenerationParams;
  genConfig: GenerationConfig;
  filter: PokemonFilter | undefined;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

function PokemonListPage(): ReactElement {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);

  // DS 設定 / トレーナー情報
  const { config: dsConfig } = useDsConfigReadonly();

  // Seed 入力 (SeedOrigin は非永続化)
  const seedInputMode = usePokemonListStore((s) => s.seedInputMode);
  const setSeedInputMode = usePokemonListStore((s) => s.setSeedInputMode);
  const seedInput = usePokemonListStore((s) => s.seedInput);
  const setSeedInput = usePokemonListStore((s) => s.setSeedInput);
  const seedOrigins = usePokemonListStore((s) => s.seedOrigins);
  const setSeedOrigins = usePokemonListStore((s) => s.setSeedOrigins);

  // エンカウント設定 (Feature Store)
  const encounterParams = usePokemonListStore((s) => s.encounterParams);
  const setEncounterParams = usePokemonListStore((s) => s.setEncounterParams);

  // フィルタ (Feature Store)
  const filter = usePokemonListStore((s) => s.filter);
  const setFilter = usePokemonListStore((s) => s.setFilter);
  const statsFilter = usePokemonListStore((s) => s.statsFilter);
  const setStatsFilter = usePokemonListStore((s) => s.setStatsFilter);
  const formRevision = usePokemonListStore((s) => s.formRevision);
  const statMode = usePokemonListStore((s) => s.statMode);
  const setStatMode = usePokemonListStore((s) => s.setStatMode);

  // 生成フック
  const {
    isLoading,
    isInitialized,
    progress,
    results,
    resultEncounterType,
    resultVersion,
    error,
    generate,
    cancel,
  } = usePokemonList(language);

  // バリデーション
  const validation = useMemo(
    () =>
      validatePokemonListForm(
        {
          seedInputMode,
          seedOrigins,
          encounterType: encounterParams.encounterType,
          encounterMethod: encounterParams.encounterMethod,
          genConfig: encounterParams.genConfig,
          filter: normalizePokemonFilter(filter, statsFilter, encounterParams, statMode),
        },
        hasCurrentEncounterSlots(encounterParams, dsConfig.version)
      ),
    [seedInputMode, seedOrigins, encounterParams, filter, statsFilter, statMode, dsConfig.version]
  );

  // バリデーションメッセージ
  const validationMessages = useMemo(
    (): Record<PokemonListValidationErrorCode, string> => ({
      SEEDS_EMPTY: t`Select or enter at least one seed`,
      SEEDS_INVALID: t`One or more seeds are invalid`,
      ENCOUNTER_SLOTS_EMPTY: t`Select a location or Pokémon`,
      ADVANCE_RANGE_INVALID: t`Min advance must be ≤ max advance`,
      OFFSET_NEGATIVE: t`Min advance must be ≥ 0`,
    }),
    [t]
  );

  // 詳細ダイアログ
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRawResult, setSelectedRawResult] = useState<GeneratedPokemonData | undefined>();
  const selectedResult = useMemo(
    () => results.find((result) => result.raw === selectedRawResult),
    [results, selectedRawResult]
  );

  const handleSelectResult = useCallback((result: PokemonListResultView) => {
    setSelectedRawResult(result.raw);
    setDetailOpen(true);
  }, []);

  const columns = useMemo(
    () =>
      createPokemonResultColumns({
        onSelect: handleSelectResult,
        statMode,
        locale: language,
        resultEncounterType,
      }),
    [handleSelectResult, statMode, language, resultEncounterType]
  );

  // エクスポート
  const exportColumns = useMemo(() => createPokemonListExportColumns(statMode), [statMode]);
  const exportActions = useExport({
    data: results,
    columns: exportColumns,
    featureId: 'pokemon-list',
    statMode,
    versionOverride: resultVersion,
  });

  // 確認ダイアログ
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    estimatedCount: number;
    request: PokemonListRequest | undefined;
  }>({ open: false, estimatedCount: 0, request: undefined });

  const createGenerateRequest = useCallback((): PokemonListRequest | undefined => {
    const state = usePokemonListStore.getState();
    const form = structuredClone({
      seedInputMode: state.seedInputMode,
      seedOrigins: state.seedOrigins,
      encounterParams: state.encounterParams,
      filter: state.filter,
      statsFilter: state.statsFilter,
      statMode: state.statMode,
    });
    const origins = structuredClone(form.seedOrigins);
    const appliedFilter = normalizePokemonFilter(
      form.filter,
      form.statsFilter,
      form.encounterParams,
      form.statMode
    );
    const currentValidation = validatePokemonListForm(
      {
        seedInputMode: form.seedInputMode,
        seedOrigins: origins,
        encounterType: form.encounterParams.encounterType,
        encounterMethod: form.encounterParams.encounterMethod,
        genConfig: form.encounterParams.genConfig,
        filter: appliedFilter,
      },
      hasCurrentEncounterSlots(form.encounterParams, useDsConfigStore.getState().config.version)
    );
    if (!currentValidation.isValid) return;

    const currentDsState = useDsConfigStore.getState();
    const dsState = structuredClone({
      config: currentDsState.config,
      gameStart: currentDsState.gameStart,
    });
    const trainer = useTrainerStore.getState();
    const fullGenConfig: GenerationConfig = {
      version: dsState.config.version,
      game_start: dsState.gameStart,
      user_offset: form.encounterParams.genConfig.user_offset,
      max_advance: form.encounterParams.genConfig.max_advance,
    };

    const params: PokemonGenerationParams = {
      trainer: { tid: trainer.tid ?? 0, sid: trainer.sid ?? 0 },
      encounter_type: form.encounterParams.encounterType,
      encounter_method: form.encounterParams.encounterMethod,
      lead_ability: form.encounterParams.leadAbility,
      slots: form.encounterParams.slots,
    };

    return {
      origins,
      params,
      genConfig: fullGenConfig,
      filter: appliedFilter,
    };
  }, []);

  // 見積もり → 確認 → 実行
  const handleGenerate = useCallback(() => {
    const request = createGenerateRequest();
    if (!request) return;

    const estimation = estimatePokemonListResults(
      request.origins.length,
      request.genConfig.max_advance,
      request.genConfig.user_offset,
      request.filter
    );
    if (estimation.exceedsThreshold) {
      setConfirmDialog({ open: true, estimatedCount: estimation.estimatedCount, request });
    } else {
      generate(request.origins, request.params, request.genConfig, request.filter);
    }
  }, [createGenerateRequest, generate]);

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
              onSearch={handleGenerate}
              onCancel={cancel}
            />
          </div>

          <SeedInputSection
            key={formRevision}
            featureId="pokemon-list"
            mode={seedInputMode}
            onModeChange={setSeedInputMode}
            origins={seedOrigins}
            onOriginsChange={setSeedOrigins}
            input={seedInput}
            onInputChange={setSeedInput}
            disabled={isLoading}
          />

          <PokemonParamsForm
            value={encounterParams}
            onChange={setEncounterParams}
            version={dsConfig.version}
            syncKey={formRevision}
            disabled={isLoading}
          />

          <PokemonFilterForm
            value={filter}
            onChange={setFilter}
            statsFilter={statsFilter}
            onStatsFilterChange={setStatsFilter}
            statMode={statMode}
            availableSpecies={encounterParams.availableSpecies}
            slots={
              hasCurrentEncounterSlots(encounterParams, dsConfig.version)
                ? encounterParams.slots
                : []
            }
            encounterType={encounterParams.encounterType}
            syncKey={formRevision}
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
            <div className="flex items-center gap-2">
              <Label htmlFor="stat-mode-toggle" className="text-xs text-muted-foreground">
                IV
              </Label>
              <Switch
                id="stat-mode-toggle"
                checked={statMode === 'stats'}
                onCheckedChange={(checked) => setStatMode(checked ? 'stats' : 'ivs')}
              />
              <Label htmlFor="stat-mode-toggle" className="text-xs text-muted-foreground">
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
          onSearch={handleGenerate}
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
            generate(request.origins, request.params, request.genConfig, request.filter);
          }
        }}
      />
    </>
  );
}

export { PokemonListPage };
