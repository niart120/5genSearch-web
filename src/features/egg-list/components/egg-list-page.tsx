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
import { DataTable } from '@/components/data-display/data-table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUiStore } from '@/stores/settings/ui';
import { useTrainer } from '@/hooks/use-trainer';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { useEggList } from '../hooks/use-egg-list';
import { validateEggListForm } from '../types';
import type { EggListValidationErrorCode } from '../types';
import type { StatDisplayMode } from '@/lib/game-data-names';
import { SeedInputSection, type SeedInputMode } from '@/components/forms/seed-input-section';
import { EggParamsForm } from '@/components/forms/egg-params-form';
import { createEggResultColumns } from './egg-result-columns';
import { ResultDetailDialog } from './result-detail-dialog';
import { EggFilterForm } from '@/components/forms/egg-filter-form';
import { ExportToolbar } from '@/components/data-display/export-toolbar';
import { useExport } from '@/hooks/use-export';
import { createEggListExportColumns } from '@/services/export-columns';
import type {
  GenerationConfig,
  EggFilter,
  EggGenerationParams,
  SeedOrigin,
  StatsFilter,
  UiEggData,
  Ivs,
} from '@/wasm/wasm_pkg.js';
import { estimateEggListResults } from '@/services/search-estimation';

const DEFAULT_IVS: Ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

const DEFAULT_EGG_PARAMS: EggGenerationParams = {
  trainer: { tid: 0, sid: 0 },
  everstone: 'None',
  female_ability_slot: 'First',
  uses_ditto: false,
  gender_ratio: 'F1M1',
  nidoran_flag: false,
  masuda_method: false,
  parent_male: { ...DEFAULT_IVS },
  parent_female: { ...DEFAULT_IVS },
  consider_npc: false,
  species_id: undefined,
};

const DEFAULT_GEN_CONFIG: Pick<GenerationConfig, 'user_offset' | 'max_advance'> = {
  user_offset: 0,
  max_advance: 100,
};

function EggListPage(): ReactElement {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const { tid, sid } = useTrainer();
  const { config: dsConfig, gameStart } = useDsConfigReadonly();

  // Seed 入力
  const [seedInputMode, setSeedInputMode] = useState<SeedInputMode>('manual-startup');
  const [seedOrigins, setSeedOrigins] = useState<SeedOrigin[]>([]);

  // パラメータ
  const [eggParams, setEggParams] = useState<EggGenerationParams>(DEFAULT_EGG_PARAMS);
  const [genConfig, setGenConfig] =
    useState<Pick<GenerationConfig, 'user_offset' | 'max_advance'>>(DEFAULT_GEN_CONFIG);
  const [speciesId, setSpeciesId] = useState<number | undefined>();

  // フィルタ
  const [filter, setFilter] = useState<EggFilter | undefined>();

  // 実ステータスフィルタ
  const [statsFilter, setStatsFilter] = useState<StatsFilter | undefined>();

  // 表示モード
  const [statMode, setStatMode] = useState<StatDisplayMode>('stats');

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
