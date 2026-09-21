/** 入力欄で説明するエラーは undefined とし、一覧では重複表示しない。検証結果自体は変更しない。 */
export function ValidationSummary<T extends string>({
  errors,
  messages,
}: {
  errors: readonly T[];
  messages: Record<T, string | undefined>;
}) {
  const entries = errors.flatMap((code) => {
    const message = messages[code];
    return message === undefined ? [] : [{ code, message }];
  });
  return entries.length > 0 ? (
    <ul className="space-y-0.5 text-xs text-destructive">
      {entries.map(({ code, message }) => (
        <li key={code}>{message}</li>
      ))}
    </ul>
  ) : undefined;
}
