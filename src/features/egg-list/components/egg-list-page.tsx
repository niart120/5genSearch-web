/**
 * タマゴ個体生成ページコンポーネント
 *
 * Seed + 孵化パラメータからタマゴ個体を一括生成し、一覧表示する。
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { SearchControls } from '@/components/forms/search-controls';
import { SearchConfirmationDialog } from '@/components/forms/search-confirmation-dialog';
import { DataTable, ADVANCE_ASC_SORTING } from '@/components/data-display';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUiStore } from '@/stores/settings/ui';
import { useTrainer } from '@/hooks/use-trainer';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { useEggList } from '../hooks/use-egg-list';
import { useEggListStore } from '../store';
import { validateEggListForm } from '../types';
import type { EggListValidationErrorCode } from '../types';
import { SeedInputSection } from '@/components/forms/seed-input-section';
import { EggParamsForm } from '@/components/forms/egg-params-form';
import { createEggResultColumns } from './egg-result-columns';
import { ResultDetailDialog } from './result-detail-dialog';
import { EggFilterForm } from '@/components/forms/egg-filter-form';
import { ExportToolbar } from '@/components/data-display/export-toolbar';
import { useExport } from '@/hooks/use-export';
import { createEggListExportColumns } from '@/services/export-columns';
import type {
  EggFilter,
  GenerationConfig,
  EggGenerationParams,
  SeedOrigin,
  UiEggData,
} from '@/wasm/wasm_pkg.js';
import { estimateEggListResults } from '@/services/search-estimation';

function EggListPage(): ReactElement {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const { tid, sid } = useTrainer();
  const { config: dsConfig, gameStart } = useDsConfigReadonly();

  // Seed 入力 (SeedOrigin は非永続化)
  const seedInputMode = useEggListStore((s) => s.seedInputMode);
  const setSeedInputMode = useEggListStore((s) => s.setSeedInputMode);
  const [seedOrigins, setSeedOrigins] = useState<SeedOrigin[]>([]);

  // パラメータ (Feature Store)
  const eggParams = useEggListStore((s) => s.eggParams);
  const setEggParams = useEggListStore((s) => s.setEggParams);
  const genConfig = useEggListStore((s) => s.genConfig);
  const setGenConfig = useEggListStore((s) => s.setGenConfig);
  const speciesId = useEggListStore((s) => s.speciesId);
  const setSpeciesId = useEggListStore((s) => s.setSpeciesId);

  // フィルタ (Feature Store)
  const filter = useEggListStore((s) => s.filter);
  const setFilter = useEggListStore((s) => s.setFilter);
  const statsFilter = useEggListStore((s) => s.statsFilter);
  const setStatsFilter = useEggListStore((s) => s.setStatsFilter);

  // 表示モード (Feature Store)
  const statMode = useEggListStore((s) => s.statMode);
  const setStatMode = useEggListStore((s) => s.setStatMode);

  // 生成フック
  const { isLoading, isInitialized, progress, uiResults, error, generate, cancel } = useEggList(
    language,
    speciesId
  );

  // バリデーション
  const validation = useMemo(
    () =>
      validateEggListForm({
        seedInputMode,
        seedOrigins,
        eggParams,
        genConfig,
        filter,
        statsFilter,
        speciesId,
      }),
    [seedInputMode, seedOrigins, eggParams, genConfig, filter, statsFilter, speciesId]
  );

  const [selectedResult, setSelectedResult] = useState<UiEggData | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);

  const handleSelectResult = useCallback((result: UiEggData) => {
    setSelectedResult(result);
    setDetailOpen(true);
  }, []);

  // statsFilter を EggFilter.stats に統合
  const mergedFilter = useMemo((): EggFilter | undefined => {
    if (!filter && !statsFilter) return;
    return {
      iv: filter?.iv,
      natures: filter?.natures,
      gender: filter?.gender,
      ability_slot: filter?.ability_slot,
      shiny: filter?.shiny,
      min_margin_frames: filter?.min_margin_frames,
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
    const paramsWithTrainer: EggGenerationParams = {
      ...eggParams,
      trainer: { tid: tid ?? 0, sid: sid ?? 0 },
      species_id: speciesId,
    };

    const fullGenConfig: GenerationConfig = {
      version: dsConfig.version,
      game_start: gameStart,
      user_offset: genConfig.user_offset,
      max_advance: genConfig.max_advance,
    };

    generate(seedOrigins, paramsWithTrainer, fullGenConfig, mergedFilter);
  }, [
    generate,
    seedOrigins,
    eggParams,
    genConfig,
    mergedFilter,
    tid,
    sid,
    speciesId,
    dsConfig.version,
    gameStart,
  ]);

  // 見積もり → 確認 → 実行
  const handleGenerate = useCallback(() => {
    const estimation = estimateEggListResults(
      seedOrigins.length,
      genConfig.max_advance,
      genConfig.user_offset,
      mergedFilter,
      eggParams.masuda_method
    );
    if (estimation.exceedsThreshold) {
      setConfirmDialog({ open: true, estimatedCount: estimation.estimatedCount });
    } else {
      handleGenerateExecution();
    }
  }, [
    seedOrigins.length,
    genConfig.max_advance,
    genConfig.user_offset,
    mergedFilter,
    eggParams.masuda_method,
    handleGenerateExecution,
  ]);

  const validationMessages = useMemo(
    (): Record<EggListValidationErrorCode, string> => ({
      SEEDS_EMPTY: t`No seeds specified`,
      ADVANCE_RANGE_INVALID: t`Advance range invalid`,
      OFFSET_NEGATIVE: t`Offset must be non-negative`,
      IV_OUT_OF_RANGE: t`Parent IV out of range`,
    }),
    [t]
  );

  const columns = useMemo(
    () =>
      createEggResultColumns({
        onSelect: handleSelectResult,
        statMode,
        locale: language,
      }),
    [handleSelectResult, statMode, language]
  );

  // エクスポート
  const exportColumns = useMemo(() => createEggListExportColumns(statMode), [statMode]);
  const exportActions = useExport({
    data: uiResults,
    columns: exportColumns,
    featureId: 'egg-list',
    statMode,
  });

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
            featureId="egg-list"
            mode={seedInputMode}
            onModeChange={setSeedInputMode}
            origins={seedOrigins}
            onOriginsChange={setSeedOrigins}
            disabled={isLoading}
          />

          <EggParamsForm
            value={eggParams}
            genConfig={genConfig}
            onChange={setEggParams}
            onGenConfigChange={setGenConfig}
            speciesId={speciesId}
            onSpeciesIdChange={setSpeciesId}
            disabled={isLoading}
          />

          <EggFilterForm
            value={filter}
            onChange={setFilter}
            statMode={statMode}
            statsFilter={statsFilter}
            onStatsFilterChange={setStatsFilter}
            disabled={isLoading}
            showToggle
            showReset
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

export { EggListPage };
