/** 確定した候補との積集合。変更がなければ入力の参照を維持する。 */
export function retainAvailableSelections<T>(
  selected: T[] | undefined,
  candidates: Iterable<T>
): T[] | undefined {
  if (!selected?.length) return undefined;
  const available = new Set(candidates);
  const retained = selected.filter((value) => available.has(value));
  return retained.length === selected.length
    ? selected
    : retained.length > 0
      ? retained
      : undefined;
}
