import { useRef, useCallback, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { EmptyState } from './empty-state';
import { remToPx } from '@/lib/format';
import { cn } from '@/lib/utils';

/** カード推定高さ: 7.5rem (root 16px 時 120px 相当) */
const DEFAULT_CARD_HEIGHT_REM = 7.5;
const DEFAULT_OVERSCAN = 4;

interface ResultCardListProps<TData> {
  /** 表示データ */
  data: TData[];

  /** カード 1 件分のレンダラー */
  renderCard: (item: TData, index: number) => ReactNode;

  /** カード推定高さ (rem)。デフォルト: 7.5 */
  cardHeightRem?: number;

  /** overscan 数。デフォルト: 4 */
  overscan?: number;

  /** コンテナの追加クラス名 */
  className?: string;

  /** 結果 0 件時のメッセージ */
  emptyMessage?: string;
}

function ResultCardList<TData>({
  data,
  renderCard,
  cardHeightRem = DEFAULT_CARD_HEIGHT_REM,
  overscan = DEFAULT_OVERSCAN,
  className,
  emptyMessage,
}: ResultCardListProps<TData>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardHeightPx = remToPx(cardHeightRem);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => containerRef.current,
    estimateSize: useCallback(() => cardHeightPx, [cardHeightPx]),
    overscan,
  });

  if (data.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const virtualItems = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  return (
    <div ref={containerRef} className={cn('overflow-auto', className)}>
      <div className="relative w-full" style={{ height: totalHeight }}>
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.index}
            className="absolute left-0 w-full"
            style={{
              top: virtualItem.start,
              height: virtualItem.size,
            }}
            ref={virtualizer.measureElement}
            data-index={virtualItem.index}
          >
            {renderCard(data[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export { ResultCardList };
export type { ResultCardListProps };
