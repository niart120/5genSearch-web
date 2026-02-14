/**
 * 起動時刻検索ページコンポーネント
 *
 * MT Seed から DS 起動日時・条件を逆引きする。
 * FeaturePageLayout による Controls / Results 2 ペイン構成。
 */

import { useState, useMemo, useCallback, useEffect, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { SearchContextForm } from '@/components/forms/search-context-form';
import { SearchControls } from '@/components/forms/search-controls';
import { TargetSeedsInput } from '@/components/forms/target-seeds-input';
import { DataTable } from '@/components/data-display/data-table';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { useSearchResultsStore } from '@/stores/search/results';
import { toHex } from '@/lib/format';
import { useDatetimeSearch } from '../hooks/use-datetime-search';
import { parseTargetSeeds, validateMtseedSearchForm } from '../types';
import type { ValidationErrorCode, ParseErrorCode } from '../types';
import { createSeedOriginColumns } from './seed-origin-columns';
import { ResultDetailDialog } from './result-detail-dialog';
import type {
  DateRangeParams,
  TimeRangeParams,
  KeySpec,
  DatetimeSearchContext,
  SeedOrigin,
} from '@/wasm/wasm_pkg.js';

const DEFAULT_DATE_RANGE: DateRangeParams = {
  start_year: 2000,
  start_month: 1,
  start_day: 1,
  end_year: 2000,
  end_month: 1,
  end_day: 1,
};

const DEFAULT_TIME_RANGE: TimeRangeParams = {
  hour_start: 0,
  hour_end: 23,
  minute_start: 0,
  minute_end: 59,
  second_start: 0,
  second_end: 59,
};

const DEFAULT_KEY_SPEC: KeySpec = { available_buttons: [] };

/* ------------------------------------------------------------------ */
/*  DatetimeSearchPage                                                 */
/* ------------------------------------------------------------------ */

function DatetimeSearchPage(): ReactElement {
  const { t } = useLingui();

  // DS 設定 (サイドバーで管理済み)
  const { config: dsConfig, ranges } = useDsConfigReadonly();

  // GPU トグル
  const [useGpu, setUseGpu] = useState(false);

  // フォーム状態
  const [dateRange, setDateRange] = useState<DateRangeParams>(DEFAULT_DATE_RANGE);
  const [timeRange, setTimeRange] = useState<TimeRangeParams>(DEFAULT_TIME_RANGE);
  const [keySpec, setKeySpec] = useState<KeySpec>(DEFAULT_KEY_SPEC);
  // MT Seed 検索からの連携: pendingTargetSeeds をフォームの初期値として反映
  const [targetSeedsRaw, setTargetSeedsRaw] = useState(() => {
    const pending = useSearchResultsStore.getState().pendingTargetSeeds;
    if (pending.length > 0) {
      return pending.map((s) => toHex(s, 8)).join('\n');
    }
    return '';
  });

  // 初回マウント時に pendingTargetSeeds を消費済みとしてクリア
  useEffect(() => {
    if (useSearchResultsStore.getState().pendingTargetSeeds.length > 0) {
      useSearchResultsStore.getState().clearPendingTargetSeeds();
    }
  }, []);

  // 検索フック
  const { isLoading, isInitialized, progress, results, error, startSearch, cancel } =
    useDatetimeSearch(useGpu);

  // パース + バリデーション
  const parsedSeeds = useMemo(() => parseTargetSeeds(targetSeedsRaw), [targetSeedsRaw]);
  const validation = useMemo(
    () => validateMtseedSearchForm({ dateRange, timeRange, keySpec, targetSeedsRaw }, parsedSeeds),
    [dateRange, timeRange, keySpec, targetSeedsRaw, parsedSeeds]
  );

  // i18n: バリデーションエラーコード → 翻訳済みメッセージ
  const validationMessages = useMemo(
    (): Record<ValidationErrorCode, string> => ({
      DATE_RANGE_INVALID: t`Start date must be on or before end date`,
      TIME_RANGE_INVALID: t`Time range is invalid`,
      SEEDS_EMPTY: t`Enter at least one MT Seed`,
      SEEDS_INVALID: t`MT Seed must be in the range 0 to FFFFFFFF`,
    }),
    [t]
  );

  // i18n: パースエラーコード → 翻訳済みメッセージ
  const parseErrorMessages = useMemo(
    (): Record<ParseErrorCode, string> => ({
      INVALID_HEX: t`Enter a hex value in the range 0 to FFFFFFFF`,
    }),
    [t]
  );

  const translatedParseErrors = useMemo(
    () =>
      parsedSeeds.errors.map((err) => ({
        line: err.line,
        value: err.value,
        message: parseErrorMessages[err.code],
      })),
    [parsedSeeds.errors, parseErrorMessages]
  );

  // 詳細ダイアログ
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<SeedOrigin | undefined>();

  const handleSelectOrigin = useCallback((origin: SeedOrigin) => {
    setSelectedOrigin(origin);
    setDetailOpen(true);
  }, []);

  const columns = useMemo(() => createSeedOriginColumns(handleSelectOrigin), [handleSelectOrigin]);

  // 検索開始
  const handleSearch = useCallback(() => {
    const context: DatetimeSearchContext = {
      ds: dsConfig,
      date_range: dateRange,
      time_range: timeRange,
      ranges,
      key_spec: keySpec,
    };
    startSearch(context, parsedSeeds.seeds);
  }, [dsConfig, dateRange, timeRange, ranges, keySpec, parsedSeeds.seeds, startSearch]);

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
              useGpu={useGpu}
              onGpuChange={setUseGpu}
              progress={progress}
              error={error}
              onSearch={handleSearch}
              onCancel={cancel}
            />
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

          <TargetSeedsInput
            value={targetSeedsRaw}
            onChange={setTargetSeedsRaw}
            parsedSeeds={parsedSeeds.seeds}
            errors={translatedParseErrors}
            disabled={isLoading}
          />

          {/* バリデーションエラー */}
          {validation.errors.length > 0 ? (
            <ul className="text-xs text-destructive space-y-0.5">
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
          <DataTable
            columns={columns}
            data={results}
            className="flex-1"
            emptyMessage={t`No results found. Please enter MT Seeds and start searching.`}
            getRowId={(_row, index) => String(index)}
          />
          <ResultDetailDialog
            open={detailOpen}
            onOpenChange={setDetailOpen}
            seedOrigin={selectedOrigin}
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
          useGpu={useGpu}
          onGpuChange={setUseGpu}
          progress={progress}
          error={error}
          onSearch={handleSearch}
          onCancel={cancel}
        />
      </div>
    </>
  );
}

export { DatetimeSearchPage };
