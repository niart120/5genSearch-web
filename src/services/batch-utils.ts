/**
 * バッチ結果処理ユーティリティ
 *
 * Worker から返却されるバッチ結果を flat 化する共通ヘルパー。
 */

/**
 * バッチ結果配列を flat 化する
 *
 * Worker から返却される `unknown[][]` を型ガードしつつ flat にする。
 * 各バッチの最初の要素で型を判定し、該当する型の配列として push する。
 *
 * @param results - Worker から返却されたバッチ結果配列
 * @param typeGuard - 型ガード関数 (first element をチェック)
 * @returns flat 化された結果配列
 */
export function flattenBatchResults<T>(
  results: unknown[][],
  typeGuard: (value: unknown) => boolean
): T[] {
  const flat: T[] = [];
  for (const batch of results) {
    if (Array.isArray(batch) && batch.length > 0) {
      const first = batch[0];
      if (typeGuard(first)) {
        flat.push(...(batch as unknown as T[]));
      }
    }
  }
  return flat;
}

/**
 * GeneratedPokemonData 型ガード
 */
export function isGeneratedPokemonData(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'core' in value &&
    'advance' in value
  );
}

/**
 * GeneratedEggData 型ガード
 */
export function isGeneratedEggData(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'core' in value &&
    'advance' in value
  );
}
