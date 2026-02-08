import type { ColumnDef, SortingState } from '@tanstack/react-table';

/**
 * DataTable の設定オプション
 */
interface DataTableOptions<TData> {
  /** 列定義 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Table の列定義は列ごとにアクセサの値型が異なるため、配列型の第2型引数は any が標準パターン
  columns: ColumnDef<TData, any>[];

  /** テーブルに表示するデータ */
  data: TData[];

  /** ソートの初期状態 */
  initialSorting?: SortingState;

  /** 仮想スクロールの行高さ (rem)。デフォルト: 2 (= h-8) */
  rowHeightRem?: number;

  /** 仮想スクロールの overscan 行数。デフォルト: 8 */
  overscan?: number;

  /**
   * 行のユニークキー取得関数。
   * 未指定時はインデックスを使用する。
   */
  getRowId?: (row: TData, index: number) => string;

  /**
   * テーブルコンテナの追加クラス名。
   * 高さ指定 (例: `h-96`, `flex-1`) は呼び出し側が担当する。
   */
  className?: string;

  /**
   * 結果が 0 件の場合に表示するメッセージ。
   * 未指定時は EmptyState のデフォルトを使用する。
   */
  emptyMessage?: string;
}

export type { DataTableOptions };
