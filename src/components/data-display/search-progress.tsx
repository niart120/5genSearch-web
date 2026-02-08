import { Trans } from '@lingui/react/macro';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatElapsedTime, formatRemainingTime, formatThroughput } from '@/lib/format';

/**
 * 検索進捗の入力データ型。
 * services/progress.ts の AggregatedProgress と互換性を持つ。
 */
interface SearchProgressData {
  /** 進捗率 (0-100) */
  percentage: number;
  /** 経過時間 (ms) */
  elapsedMs: number;
  /** 推定残り時間 (ms) */
  estimatedRemainingMs: number;
  /** スループット (処理数/秒) */
  throughput: number;
  /** 処理済み数 */
  totalProcessed: number;
  /** 総数 */
  totalCount: number;
}

interface SearchProgressProps {
  /** 進捗データ */
  progress: SearchProgressData;
  /** 追加クラス名 */
  className?: string;
}

function SearchProgress({ progress, className }: SearchProgressProps) {
  const { percentage, elapsedMs, estimatedRemainingMs, throughput, totalProcessed, totalCount } =
    progress;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{percentage.toFixed(1)}%</span>
        <span>
          {totalProcessed.toLocaleString()} / {totalCount.toLocaleString()}
        </span>
      </div>
      <Progress value={percentage} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <Trans>Elapsed</Trans>: {formatElapsedTime(elapsedMs)}
        </span>
        <span>
          <Trans>Remaining</Trans>: {formatRemainingTime(estimatedRemainingMs)}
        </span>
        <span>{formatThroughput(throughput)}</span>
      </div>
    </div>
  );
}

export { SearchProgress };
export type { SearchProgressData, SearchProgressProps };
