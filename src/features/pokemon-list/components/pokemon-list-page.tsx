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
import { DataTable } from '@/components/data-display/data-table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { useTrainer } from '@/hooks/use-trainer';
import { useUiStore } from '@/stores/settings/ui';
import { usePokemonList } from '../hooks/use-pokemon-list';
import { validatePokemonListForm, DEFAULT_ENCOUNTER_PARAMS } from '../types';
import type { PokemonListValidationErrorCode, EncounterParamsOutput } from '../types';
import { SeedInputSection, type SeedInputMode } from '@/components/forms/seed-input-section';
import { PokemonParamsForm } from './pokemon-params-form';
import { PokemonFilterForm } from './pokemon-filter-form';
import { createPokemonResultColumns } from './pokemon-result-columns';
import type { StatDisplayMode } from '@/lib/game-data-names';
import { ResultDetailDialog } from './result-detail-dialog';
import { ExportToolbar } from '@/components/data-display/export-toolbar';
import { useExport } from '@/hooks/use-export';
import { createPokemonListExportColumns } from '@/services/export-columns';
import type {
  GenerationConfig,
  PokemonFilter,
  PokemonGenerationParams,
  SeedOrigin,
  StatsFilter,
  UiPokemonData,
} from '@/wasm/wasm_pkg.js';
import { estimatePokemonListResults } from '@/services/search-estimation';

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

function PokemonListPage(): ReactElement {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);

  // DS 設定 / トレーナー情報
  const { config: dsConfig, gameStart } = useDsConfigReadonly();
  const { tid, sid } = useTrainer();

  // Seed 入力
  const [seedInputMode, setSeedInputMode] = useState<SeedInputMode>('import');
  const [seedOrigins, setSeedOrigins] = useState<SeedOrigin[]>([]);

  // エンカウント設定 (PokemonParamsForm の controlled state)
  const [encounterParams, setEncounterParams] =
    useState<EncounterParamsOutput>(DEFAULT_ENCOUNTER_PARAMS);

  // フィルタ
  const [filter, setFilter] = useState<PokemonFilter | undefined>();
  const [statsFilter, setStatsFilter] = useState<StatsFilter | undefined>();

  // 生成フック
  const { isLoading, isInitialized, progress, uiResults, error, generate, cancel } = usePokemonList(
    dsConfig.version,
    language
  );

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
          filter,
        },
        encounterParams.slots.length > 0
      ),
    [seedInputMode, seedOrigins, encounterParams, filter]
  );

  // バリデーションメッセージ
  const validationMessages = useMemo(
    (): Record<PokemonListValidationErrorCode, string> => ({
      SEEDS_EMPTY: t`Select or enter at least one seed`,
      SEEDS_INVALID: t`One or more seeds are invalid`,
      ENCOUNTER_SLOTS_EMPTY: t`Select a location or Pokémon`,
      ADVANCE_RANGE_INVALID: t`Max advance must be ≥ start offset`,
      OFFSET_NEGATIVE: t`Start offset must be ≥ 0`,
    }),
    [t]
  );

  // 詳細ダイアログ
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<UiPokemonData | undefined>();

  // ステータス/IV 表示切替
  const [statMode, setStatMode] = useState<StatDisplayMode>('stats');

  const handleSelectResult = useCallback((result: UiPokemonData) => {
    setSelectedResult(result);
    setDetailOpen(true);
  }, []);

  const columns = useMemo(
    () =>
      createPokemonResultColumns({
        onSelect: handleSelectResult,
        statMode,
        locale: language,
      }),
    [handleSelectResult, statMode, language]
  );

  // エクスポート
  const exportColumns = useMemo(() => createPokemonListExportColumns(statMode), [statMode]);
  const exportActions = useExport({
    data: uiResults,
    columns: exportColumns,
    featureId: 'pokemon-list',
    statMode,
  });

  // statsFilter を PokemonFilter.stats に統合
  const mergedFilter = useMemo((): PokemonFilter | undefined => {
    if (!filter && !statsFilter) return;
    return {
      iv: filter?.iv,
      natures: filter?.natures,
      gender: filter?.gender,
      ability_slot: filter?.ability_slot,
      shiny: filter?.shiny,
      species_ids: filter?.species_ids,
      level_range: filter?.level_range,
      stats: statsFilter,
    };
  }, [filter, statsFilter]);

  // 確認ダイアログ
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    estimatedCount: number;
  }>({ open: false, estimatedCount: 0 });

  // 生成実行
  const handleGenerateExecution = useCallback(() => {
    const fullGenConfig: GenerationConfig = {
      version: dsConfig.version,
      game_start: gameStart,
      user_offset: encounterParams.genConfig.user_offset,
      max_advance: encounterParams.genConfig.max_advance,
    };

    const params: PokemonGenerationParams = {
      trainer: { tid: tid ?? 0, sid: sid ?? 0 },
      encounter_type: encounterParams.encounterType,
      encounter_method: encounterParams.encounterMethod,
      lead_ability: encounterParams.leadAbility,
      slots: encounterParams.slots,
    };

    generate(seedOrigins, params, fullGenConfig, mergedFilter);
  }, [dsConfig.version, gameStart, encounterParams, tid, sid, seedOrigins, mergedFilter, generate]);

  // 見積もり → 確認 → 実行
  const handleGenerate = useCallback(() => {
    const estimation = estimatePokemonListResults(
      seedOrigins.length,
      encounterParams.genConfig.max_advance,
      encounterParams.genConfig.user_offset,
      mergedFilter
    );
    if (estimation.exceedsThreshold) {
      setConfirmDialog({ open: true, estimatedCount: estimation.estimatedCount });
    } else {
      handleGenerateExecution();
    }
  }, [
    seedOrigins.length,
    encounterParams.genConfig.max_advance,
    encounterParams.genConfig.user_offset,
    mergedFilter,
    handleGenerateExecution,
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
              onSearch={handleGenerate}
              onCancel={cancel}
            />
          </div>

          <SeedInputSection
            featureId="pokemon-list"
            mode={seedInputMode}
            onModeChange={setSeedInputMode}
            origins={seedOrigins}
            onOriginsChange={setSeedOrigins}
            disabled={isLoading}
          />

          <PokemonParamsForm
            value={encounterParams}
            onChange={setEncounterParams}
            version={dsConfig.version}
            disabled={isLoading}
          />

          <PokemonFilterForm
            value={filter}
            onChange={setFilter}
            statsFilter={statsFilter}
            onStatsFilterChange={setStatsFilter}
            statMode={statMode}
            availableSpecies={encounterParams.availableSpecies}
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
              <Trans>Results</Trans>: {uiResults.length.toLocaleString()}
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
              <ExportToolbar resultCount={uiResults.length} exportActions={exportActions} />
            </div>
          </div>
          <DataTable
            columns={columns}
            data={uiResults}
            className="flex-1"
            emptyMessage={t`No results found. Configure parameters and start generating.`}
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
          onSearch={handleGenerate}
          onCancel={cancel}
        />
      </div>

      <SearchConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        estimatedCount={confirmDialog.estimatedCount}
        onConfirm={() => {
          setConfirmDialog({ open: false, estimatedCount: 0 });
          handleGenerateExecution();
        }}
      />
    </>
  );
}

export { PokemonListPage };
