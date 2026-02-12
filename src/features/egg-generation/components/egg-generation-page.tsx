/**
 * タマゴ個体生成ページコンポーネント
 *
 * Seed + 孵化パラメータからタマゴ個体を一括生成し、一覧表示する。
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { SearchControls } from '@/components/forms/search-controls';
import { DataTable } from '@/components/data-display/data-table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTrainer } from '@/hooks/use-trainer';
import { useUiStore } from '@/stores/settings/ui';
import { useEggGeneration } from '../hooks/use-egg-generation';
import { validateEggGenerationForm } from '../types';
import type {
  EggGenerationValidationErrorCode,
  StatDisplayMode,
} from '../types';
import { SeedInputSection, type SeedInputMode } from '@/components/forms/seed-input-section';
import { EggParamsForm } from '@/components/forms/egg-params-form';
import type { StatsFixedValues } from '@/components/forms/stats-fixed-input';
import { filterByStats } from '@/lib/stats-filter';
import { createEggResultColumns } from './egg-result-columns';
import { ResultDetailDialog } from './result-detail-dialog';
import type {
  GenerationConfig,
  EggFilter,
  EggGenerationParams,
  SeedOrigin,
  UiEggData,
} from '@/wasm/wasm_pkg.js';

function EggGenerationPage(): ReactElement {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);
  const { tid, sid } = useTrainer();

  // Seed 入力
  const [seedInputMode, setSeedInputMode] = useState<SeedInputMode>('manual-startup');
  const [seedOrigins, setSeedOrigins] = useState<SeedOrigin[]>([]);

  // パラメータ
  const [eggParams, setEggParams] = useState<EggGenerationParams>({
    parent_male: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    parent_female: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    female_ability_slot: 'Slot1',
    everstone_plan: 'None',
    gender_ratio: 'Equal',
    uses_ditto: false,
    nidoran_flag: false,
    masuda_method: false,
    consider_npc: false,
  });
  const [genConfig, setGenConfig] = useState<Pick<GenerationConfig, 'user_offset' | 'max_advance'>>({
    user_offset: 0,
    max_advance: 100,
  });
  const [speciesId, setSpeciesId] = useState<number | undefined>();

  // フィルタ
  const [filter, setFilter] = useState<EggFilter | undefined>();
  const [statsFilter, setStatsFilter] = useState<StatsFixedValues | undefined>();

  // 表示モード
  const [statMode, setStatMode] = useState<StatDisplayMode>('stats');

  // 生成フック
  const { isLoading, isInitialized, progress, uiResults, error, generate, cancel } = useEggGeneration(
    language,
    speciesId
  );

  // バリデーション
  const validation = useMemo(
    () =>
      validateEggGenerationForm({
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

  // クライアントサイド Stats フィルタ適用
  const filteredResults = useMemo(
    () => filterByStats(uiResults, statsFilter),
    [uiResults, statsFilter]
  );

  const [selectedResult, setSelectedResult] = useState<UiEggData | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);

  const handleSelectResult = useCallback((result: UiEggData) => {
    setSelectedResult(result);
    setDetailOpen(true);
  }, []);

  const handleGenerate = useCallback(() => {
    generate(seedOrigins, eggParams, genConfig, filter);
  }, [generate, seedOrigins, eggParams, genConfig, filter]);

  const errorMessages = useMemo(() => {
    const messages: Record<EggGenerationValidationErrorCode, string> = {
      SEEDS_EMPTY: t`No seeds specified`,
      ADVANCE_RANGE_INVALID: t`Advance range invalid`,
      OFFSET_NEGATIVE: t`Offset must be non-negative`,
      IV_OUT_OF_RANGE: t`Parent IV out of range`,
    };
    return validation.errors.map((code) => messages[code]);
  }, [validation.errors, t]);

  const columns = useMemo(
    () =>
      createEggResultColumns({
        onSelect: handleSelectResult,
        statMode,
        locale: language,
      }),
    [handleSelectResult, statMode, language]
  );

  return (
    <FeaturePageLayout
      title={t`Egg generation`}
      description={t`Generate egg individuals from seed origins`}
      controls={
        <div className="flex flex-col gap-4">
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

          <SearchControls
            onStart={handleGenerate}
            onCancel={cancel}
            isLoading={isLoading}
            isInitialized={isInitialized}
            progress={progress}
            disabled={!validation.isValid}
            errorMessages={errorMessages}
          />
        </div>
      }
      results={
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <Trans>Results</Trans>: {filteredResults.length.toLocaleString()}
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
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error.message}</p>}

          <DataTable
            columns={columns}
            data={filteredResults}
            emptyMessage={t`No results`}
          />

          <ResultDetailDialog
            open={detailOpen}
            onOpenChange={setDetailOpen}
            result={selectedResult}
          />
        </div>
      }
    />
  );
}

export { EggGenerationPage };
