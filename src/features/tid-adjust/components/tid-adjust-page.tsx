/**
 * ID 調整ページコンポーネント
 *
 * 指定した TID / SID / 光らせたい PID の条件を満たす DS 起動日時を探索し、
 * 結果をテーブル表示する。
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FeaturePageLayout } from '@/components/layout/feature-page-layout';
import { SearchContextForm } from '@/components/forms/search-context-form';
import { SearchControls } from '@/components/forms/search-controls';
import { DataTable } from '@/components/data-display/data-table';
import { useDsConfigReadonly } from '@/hooks/use-ds-config';
import { TidAdjustForm } from './tid-adjust-form';
import { createTrainerInfoColumns } from './trainer-info-columns';
import { useTidAdjust } from '../hooks/use-tid-adjust';
import {
  validateTidAdjustForm,
  toTrainerInfoFilter,
  type TidAdjustValidationErrorCode,
} from '../types';
import type {
  DateRangeParams,
  TimeRangeParams,
  KeySpec,
  DatetimeSearchContext,
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

function TidAdjustPage(): ReactElement {
  const { t } = useLingui();
  const { config: dsConfig, ranges, gameStart } = useDsConfigReadonly();

  // フォーム状態
  const [dateRange, setDateRange] = useState<DateRangeParams>(DEFAULT_DATE_RANGE);
  const [timeRange, setTimeRange] = useState<TimeRangeParams>(DEFAULT_TIME_RANGE);
  const [keySpec, setKeySpec] = useState<KeySpec>(DEFAULT_KEY_SPEC);
  const [tid, setTid] = useState('');
  const [sid, setSid] = useState('');
  const [shinyPidRaw, setShinyPidRaw] = useState('');

  // 検索フック (CPU 専用)
  const { isLoading, isInitialized, progress, results, error, startSearch, cancel } =
    useTidAdjust();

  // バリデーション
  const validation = useMemo(
    () => validateTidAdjustForm({ dateRange, timeRange, keySpec, tid, sid, shinyPidRaw }),
    [dateRange, timeRange, keySpec, tid, sid, shinyPidRaw]
  );

  const validationMessages = useMemo(
    (): Record<TidAdjustValidationErrorCode, string> => ({
      DATE_RANGE_INVALID: t`Start date must be on or before end date`,
      TIME_RANGE_INVALID: t`Time range is invalid`,
      TID_OUT_OF_RANGE: t`TID must be between 0 and 65535`,
      SID_OUT_OF_RANGE: t`SID must be between 0 and 65535`,
      SHINY_PID_INVALID: t`Shiny PID must be a hex value (0 to FFFFFFFF)`,
    }),
    [t]
  );

  // 列定義
  const columns = useMemo(() => createTrainerInfoColumns(), []);

  // 検索開始
  const handleSearch = useCallback(() => {
    const context: DatetimeSearchContext = {
      ds: dsConfig,
      date_range: dateRange,
      time_range: timeRange,
      ranges,
      key_spec: keySpec,
    };
    const filter = toTrainerInfoFilter({ dateRange, timeRange, keySpec, tid, sid, shinyPidRaw });
    // TID/SID はニューゲーム開始時に決定されるため start_mode を強制的に NewGame にする
    const tidGameStart = { ...gameStart, start_mode: 'NewGame' as const };
    startSearch(context, filter, tidGameStart);
  }, [
    dsConfig,
    dateRange,
    timeRange,
    ranges,
    keySpec,
    tid,
    sid,
    shinyPidRaw,
    gameStart,
    startSearch,
  ]);

  return (
    <>
      <FeaturePageLayout className="pb-32 lg:pb-4">
        <FeaturePageLayout.Controls>
          {/* PC: 検索コントロール (GPU 非対応 — useGpu/onGpuChange 省略) */}
          <div className="hidden lg:flex lg:flex-col lg:gap-2">
            <SearchControls
              layout="desktop"
              isLoading={isLoading}
              isInitialized={isInitialized}
              isValid={validation.isValid}
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

          <TidAdjustForm
            tid={tid}
            sid={sid}
            shinyPidRaw={shinyPidRaw}
            onTidChange={setTid}
            onSidChange={setSid}
            onShinyPidChange={setShinyPidRaw}
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
          <p className="text-xs text-muted-foreground">
            <Trans>Results</Trans>: {results.length.toLocaleString()}
          </p>
          <DataTable
            columns={columns}
            data={results}
            className="flex-1"
            emptyMessage={t`No results`}
            getRowId={(_row, index) => String(index)}
          />
        </FeaturePageLayout.Results>
      </FeaturePageLayout>

      {/* モバイル: 下部固定 検索バー (GPU 非対応) */}
      <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-border bg-background p-3 lg:hidden">
        <SearchControls
          layout="mobile"
          isLoading={isLoading}
          isInitialized={isInitialized}
          isValid={validation.isValid}
          progress={progress}
          error={error}
          onSearch={handleSearch}
          onCancel={cancel}
        />
      </div>
    </>
  );
}

export { TidAdjustPage };
