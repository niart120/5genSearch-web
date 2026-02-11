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
import { DataTable } from '@/components/data-display/data-table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { useTrainer } from '@/hooks/use-trainer';
import { useUiStore } from '@/stores/settings/ui';
import { usePokemonList } from '../hooks/use-pokemon-list';
import { validatePokemonListForm } from '../types';
import type { PokemonListValidationErrorCode, SeedInputMode, StatsFilter } from '../types';
import { SeedInputSection } from './seed-input-section';
import { PokemonParamsForm } from './pokemon-params-form';
import { PokemonFilterForm } from './pokemon-filter-form';
import { createPokemonResultColumns } from './pokemon-result-columns';
import type { StatDisplayMode } from './pokemon-result-columns';
import { ResultDetailDialog } from './result-detail-dialog';
import type { EncounterSpeciesOption } from '@/data/encounters/helpers';
import type {
  EncounterType,
  EncounterMethod,
  EncounterSlotConfig,
  GenerationConfig,
  PokemonFilter,
  PokemonGenerationParams,
  LeadAbilityEffect,
  SeedOrigin,
  UiPokemonData,
} from '@/wasm/wasm_pkg.js';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_GEN_CONFIG: Pick<GenerationConfig, 'user_offset' | 'max_advance'> = {
  user_offset: 0,
  max_advance: 100,
};

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
  const [seedInputMode, setSeedInputMode] = useState<SeedInputMode>('search-results');
  const [seedOrigins, setSeedOrigins] = useState<SeedOrigin[]>([]);

  // エンカウント設定
  const [encounterType, setEncounterType] = useState<EncounterType>('Normal');
  const [encounterMethod, setEncounterMethod] = useState<EncounterMethod>('Stationary');
  const [encounterSlots, setEncounterSlots] = useState<EncounterSlotConfig[]>([]);
  const [leadAbility, setLeadAbility] = useState<LeadAbilityEffect>('None');
  const [availableSpecies, setAvailableSpecies] = useState<EncounterSpeciesOption[]>([]);

  // 生成設定
  const [genConfigPartial, setGenConfigPartial] =
    useState<Pick<GenerationConfig, 'user_offset' | 'max_advance'>>(DEFAULT_GEN_CONFIG);

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
          encounterType,
          encounterMethod,
          genConfig: genConfigPartial,
          filter,
        },
        encounterSlots.length > 0
      ),
    [
      seedInputMode,
      seedOrigins,
      encounterType,
      encounterMethod,
      genConfigPartial,
      filter,
      encounterSlots.length,
    ]
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

  // クライアントサイド Stats フィルタ適用
  const filteredResults = useMemo(() => {
    if (!statsFilter) return uiResults;
    const keys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
    return uiResults.filter((r) =>
      keys.every((key, i) => {
        const v = Number(r.stats[i]);
        if (Number.isNaN(v)) return true; // '?' は通過
        return v >= statsFilter[key][0] && v <= statsFilter[key][1];
      })
    );
  }, [uiResults, statsFilter]);

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

  // 生成開始
  const handleGenerate = useCallback(() => {
    const fullGenConfig: GenerationConfig = {
      version: dsConfig.version,
      game_start: gameStart,
      user_offset: genConfigPartial.user_offset,
      max_advance: genConfigPartial.max_advance,
    };

    const params: PokemonGenerationParams = {
      trainer: { tid: tid ?? 0, sid: sid ?? 0 },
      encounter_type: encounterType,
      encounter_method: encounterMethod,
      lead_ability: leadAbility,
      slots: encounterSlots,
    };

    generate(seedOrigins, params, fullGenConfig, filter);
  }, [
    dsConfig.version,
    gameStart,
    genConfigPartial,
    tid,
    sid,
    encounterType,
    encounterMethod,
    leadAbility,
    encounterSlots,
    seedOrigins,
    filter,
    generate,
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
            mode={seedInputMode}
            onModeChange={setSeedInputMode}
            origins={seedOrigins}
            onOriginsChange={setSeedOrigins}
            disabled={isLoading}
          />

          <PokemonParamsForm
            encounterType={encounterType}
            encounterMethod={encounterMethod}
            genConfig={genConfigPartial}
            leadAbility={leadAbility}
            version={dsConfig.version}
            onEncounterTypeChange={setEncounterType}
            onEncounterMethodChange={setEncounterMethod}
            onGenConfigChange={setGenConfigPartial}
            onLeadAbilityChange={setLeadAbility}
            onSlotsChange={setEncounterSlots}
            onAvailableSpeciesChange={setAvailableSpecies}
            disabled={isLoading}
          />

          <PokemonFilterForm
            value={filter}
            onChange={setFilter}
            statsFilter={statsFilter}
            onStatsFilterChange={setStatsFilter}
            statMode={statMode}
            availableSpecies={availableSpecies}
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
          <DataTable
            columns={columns}
            data={filteredResults}
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
    </>
  );
}

export { PokemonListPage };
