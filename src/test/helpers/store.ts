/**
 * Zustand persist middleware テスト用ヘルパー
 *
 * 全 Feature Store テストで共通する partialize 関数の取得・実行ボイラープレートを集約する。
 */

/**
 * Zustand persist middleware の partialize 関数を実行し、永続化対象の state を返す。
 *
 * @throws partialize が未定義の場合
 */
export function getPartializedState<S>(store: { getState: () => S }): Record<string, unknown> {
  const persist = (
    store as unknown as {
      persist: {
        getOptions: () => {
          partialize?: (state: Record<string, unknown>) => Record<string, unknown>;
        };
      };
    }
  ).persist;
  const options = persist.getOptions();
  const state = store.getState();
  const partialized = options.partialize?.(state as unknown as Record<string, unknown>);
  if (!partialized) {
    throw new Error('partialize is not defined');
  }
  return partialized;
}
