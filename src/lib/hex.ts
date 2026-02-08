/** 16 進数文字列を 1 バイト整数 (0–255) にパースする */
function parseHexByte(raw: string, defaultValue: number = 0): number {
  const trimmed = raw.trim();
  if (trimmed === '') return defaultValue;
  if (!/^[0-9a-fA-F]{1,2}$/.test(trimmed)) return defaultValue;
  return Number.parseInt(trimmed, 16);
}

/** 16 進数文字列を 2 バイト整数 (0–65535) にパースする */
function parseHexWord(raw: string, defaultValue: number = 0): number {
  const trimmed = raw.trim();
  if (trimmed === '') return defaultValue;
  if (!/^[0-9a-fA-F]{1,4}$/.test(trimmed)) return defaultValue;
  return Number.parseInt(trimmed, 16);
}

/** 数値を指定桁数の 16 進数大文字文字列に変換する */
function toHex(value: number, digits: number): string {
  return value.toString(16).toUpperCase().padStart(digits, '0');
}

/** MAC アドレス文字列をパースして 6 バイト配列を返す。不正な形式なら undefined */
function parseMacAddress(
  input: string
): [number, number, number, number, number, number] | undefined {
  const cleaned = input.replaceAll(/[-:]/g, '');
  if (!/^[0-9a-fA-F]{12}$/.test(cleaned)) return undefined;
  return [
    Number.parseInt(cleaned.slice(0, 2), 16),
    Number.parseInt(cleaned.slice(2, 4), 16),
    Number.parseInt(cleaned.slice(4, 6), 16),
    Number.parseInt(cleaned.slice(6, 8), 16),
    Number.parseInt(cleaned.slice(8, 10), 16),
    Number.parseInt(cleaned.slice(10, 12), 16),
  ];
}

export { parseHexByte, parseHexWord, toHex, parseMacAddress };
