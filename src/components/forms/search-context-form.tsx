/**
 * 検索コンテキスト入力フォーム (共通)
 *
 * 日付範囲 / 時刻範囲 / キー入力仕様の入力を束ねる。
 * MT Seed 検索・孵化検索の両方で再利用する。
 * DS 設定 (DsConfig, Timer0VCountRange[]) はサイドバーで管理済みのため含めない。
 */

import { Trans } from '@lingui/react/macro';
import { DateRangePicker } from './date-range-picker';
import { TimeRangePicker } from './time-range-picker';
import { KeySpecSelector } from './key-spec-selector';
import type { DateRangeParams, TimeRangeParams, KeySpec } from '@/wasm/wasm_pkg';

interface SearchContextFormProps {
  dateRange: DateRangeParams;
  timeRange: TimeRangeParams;
  keySpec: KeySpec;
  onDateRangeChange: (range: DateRangeParams) => void;
  onTimeRangeChange: (range: TimeRangeParams) => void;
  onKeySpecChange: (spec: KeySpec) => void;
  disabled?: boolean;
}

function SearchContextForm({
  dateRange,
  timeRange,
  keySpec,
  onDateRangeChange,
  onTimeRangeChange,
  onKeySpecChange,
  disabled,
}: SearchContextFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">
          <Trans>Date range</Trans>
        </h3>
        <DateRangePicker value={dateRange} onChange={onDateRangeChange} disabled={disabled} />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">
          <Trans>Time range</Trans>
        </h3>
        <TimeRangePicker value={timeRange} onChange={onTimeRangeChange} disabled={disabled} />
      </section>

      <section>
        <KeySpecSelector value={keySpec} onChange={onKeySpecChange} disabled={disabled} />
      </section>
    </div>
  );
}

export type { SearchContextFormProps };
export { SearchContextForm };
