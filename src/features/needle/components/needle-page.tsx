/**
 * 針読みページコンポーネント
 *
 * 観測した針パターンから消費位置を特定する。
 * メインスレッド同期実行のため SearchControls/進捗バーは使用せず、
 * 自動検索トグル + 検索ボタンで制御する。
 */

import { useMemo, useCallback, useEffect, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { DataTable, ADVANCE_ASC_SORTING } from '@/components/data-display';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { NumField } from '@/components/ui/spinner-num-field';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { useSearchResultsStore } from '@/stores/search/results';
import { resolveSeedOrigins } from '@/services/seed-resolve';
import { keyCodeToKeyInput } from '@/lib/format';
import { SeedInput } from './seed-input';
import { NeedleInput } from './needle-input';
import { createNeedleResultColumns } from './needle-result-columns';
import { useNeedleSearch } from '../hooks/use-needle-search';
import { useNeedleStore } from '../store';
import { validateNeedleForm, parseNeedlePattern, type NeedleValidationErrorCode } from '../types';
import type { GenerationConfig } from '@/wasm/wasm_pkg.js';

/** Hex パターン (最大 16 桁) */
const LCG_SEED_RE = /^[\da-fA-F]{1,16}$/;

function NeedlePage(): ReactElement {
  const { t } = useLingui();
  const { config: dsConfig, ranges, gameStart } = useDsConfigReadonly();

  // フォーム状態 (Feature Store)
  const seedMode = useNeedleStore((s) => s.seedMode);
  const setSeedMode = useNeedleStore((s) => s.setSeedMode);
  const datetime = useNeedleStore((s) => s.datetime);
  const setDatetime = useNeedleStore((s) => s.setDatetime);
  const keyInput = useNeedleStore((s) => s.keyInput);
  const setKeyInput = useNeedleStore((s) => s.setKeyInput);
  const seedHex = useNeedleStore((s) => s.seedHex);
  const setSeedHex = useNeedleStore((s) => s.setSeedHex);
  const patternRaw = useNeedleStore((s) => s.patternRaw);
  const setPatternRaw = useNeedleStore((s) => s.setPatternRaw);
  const userOffset = useNeedleStore((s) => s.userOffset);
  const setUserOffset = useNeedleStore((s) => s.setUserOffset);
  const maxAdvance = useNeedleStore((s) => s.maxAdvance);
  const setMaxAdvance = useNeedleStore((s) => s.setMaxAdvance);
  const autoSearch = useNeedleStore((s) => s.autoSearch);
  const setAutoSearch = useNeedleStore((s) => s.setAutoSearch);

  // pendingDetailOrigins の自動消費 (needle ページ分)
  useEffect(() => {
    const store = useSearchResultsStore.getState();
    const detail = store.pendingDetailOrigins['needle'];
    if (detail) {
      store.clearPendingDetailOrigin('needle');
      if ('Startup' in detail) {
        const hex = detail.Startup.base_seed.toString(16).toUpperCase().padStart(16, '0');
        setDatetime(detail.Startup.datetime);
        setKeyInput(keyCodeToKeyInput(detail.Startup.condition.key_code));
        setSeedHex(hex);
        setSeedMode('datetime');
      } else {
        const hex = detail.Seed.base_seed.toString(16).toUpperCase().padStart(16, '0');
        setSeedHex(hex);
        setSeedMode('seed');
      }
    }
  }, [setDatetime, setKeyInput, setSeedHex, setSeedMode]);

  // seedOrigins は入力状態から導出 (初回レンダーから計算される)
  const seedOrigins = useMemo(() => {
    if (seedMode === 'seed') {
      if (!seedHex || !LCG_SEED_RE.test(seedHex)) return [];
      const value = BigInt('0x' + seedHex);
      return [{ Seed: { base_seed: value, mt_seed: Number(value & 0xff_ff_ff_ffn) } }];
    }
    // datetime mode
    try {
      return resolveSeedOrigins({
        type: 'Startup',
        ds: dsConfig,
        datetime,
        ranges,
        key_input: keyInput,
      });
    } catch {
      return [];
    }
  }, [seedMode, seedHex, dsConfig, datetime, ranges, keyInput]);

  // 検索フック
  const { results, error, search, clear } = useNeedleSearch();

  // バリデーション
  const validation = useMemo(
    () => validateNeedleForm({ seedOrigins, patternRaw, userOffset, maxAdvance }),
    [seedOrigins, patternRaw, userOffset, maxAdvance]
  );

  const validationMessages = useMemo(
    (): Record<NeedleValidationErrorCode, string> => ({
      SEED_EMPTY: t`Seed is not set`,
      PATTERN_EMPTY: t`Needle pattern is empty`,
      PATTERN_INVALID: t`Needle pattern must be digits 0-7`,
      OFFSET_NEGATIVE: t`Offset must be 0 or positive`,
      ADVANCE_RANGE_INVALID: t`Max advance must be ≥ offset`,
    }),
    [t]
  );

  // 列定義
  const columns = useMemo(() => createNeedleResultColumns(), []);

  // 検索実行
  const executeSearch = useCallback(() => {
    if (!validation.isValid || seedOrigins.length === 0) return;
    const pattern = parseNeedlePattern(patternRaw);
    if (!pattern) return;

    const config: GenerationConfig = {
      version: dsConfig.version,
      game_start: gameStart,
      user_offset: userOffset,
      max_advance: maxAdvance,
    };
    search(seedOrigins, pattern, config);
  }, [
    validation.isValid,
    seedOrigins,
    patternRaw,
    dsConfig.version,
    gameStart,
    userOffset,
    maxAdvance,
    search,
  ]);

  // 自動検索
  useEffect(() => {
    if (!autoSearch) return;
    if (!validation.isValid) {
      clear();
      return;
    }
    executeSearch();
  }, [autoSearch, validation.isValid, executeSearch, clear]);

  return (
    <>
      <FeaturePageLayout className="pb-32 lg:pb-4">
        <FeaturePageLayout.Controls>
          {/* PC: 検索ボタン + 自動検索トグル */}
          <div className="hidden lg:flex lg:min-h-9 lg:items-center lg:gap-3">
            <Button onClick={executeSearch} disabled={!validation.isValid} className="flex-1">
              <Trans>Search</Trans>
            </Button>
            <div className="flex items-center gap-1">
              <Switch
                checked={autoSearch}
                onCheckedChange={setAutoSearch}
                id="auto-search-desktop"
              />
              <Label htmlFor="auto-search-desktop" className="text-xs">
                <Trans>Auto</Trans>
              </Label>
            </div>
          </div>

          {/* Seed 入力 */}
          <SeedInput
            mode={seedMode}
            onModeChange={setSeedMode}
            datetime={datetime}
            onDatetimeChange={setDatetime}
            keyInput={keyInput}
            onKeyInputChange={setKeyInput}
            seedHex={seedHex}
            onSeedHexChange={setSeedHex}
          />

          {/* 針パターン入力 */}
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">
              <Trans>Needle Pattern</Trans>
            </h3>
            <NeedleInput value={patternRaw} onChange={setPatternRaw} />
          </section>

          {/* 消費数範囲 */}
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">
              <Trans>Advance Range</Trans>
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="user-offset" className="text-xs text-muted-foreground">
                  <Trans>Start offset</Trans>
                </Label>
                <NumField
                  id="user-offset"
                  value={userOffset}
                  onChange={setUserOffset}
                  defaultValue={0}
                  min={0}
                  max={99_999}
                  label={t`Start offset`}
                  className="w-20"
                />
              </div>
              <span className="mt-5 text-muted-foreground">–</span>
              <div className="flex flex-col gap-1">
                <Label htmlFor="max-advance" className="text-xs text-muted-foreground">
                  <Trans>Max advance</Trans>
                </Label>
                <NumField
                  id="max-advance"
                  value={maxAdvance}
                  onChange={setMaxAdvance}
                  defaultValue={30}
                  min={0}
                  max={99_999}
                  label={t`Max advance`}
                  className="w-20"
                />
              </div>
            </div>
          </section>

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
          <p className="text-xs text-muted-foreground">
            <Trans>Results</Trans>: {results.length.toLocaleString()}
          </p>
          {error ? <p className="text-xs text-destructive">{error}</p> : undefined}
          <DataTable
            columns={columns}
            data={results}
            className="flex-1"
            emptyMessage={t`No results`}
            getRowId={(_row, index) => String(index)}
            initialSorting={ADVANCE_ASC_SORTING}
          />
        </FeaturePageLayout.Results>
      </FeaturePageLayout>

      {/* モバイル: 下部固定バー */}
      <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-border bg-background p-3 lg:hidden">
        <div className="flex min-h-9 items-center gap-2">
          <Button
            onClick={executeSearch}
            disabled={!validation.isValid}
            size="sm"
            className="flex-1"
          >
            <Trans>Search</Trans>
          </Button>
          <div className="flex items-center gap-1">
            <Switch checked={autoSearch} onCheckedChange={setAutoSearch} id="auto-search-mobile" />
            <Label htmlFor="auto-search-mobile" className="text-xs">
              <Trans>Auto</Trans>
            </Label>
          </div>
        </div>
      </div>
    </>
  );
}

export { NeedlePage };
