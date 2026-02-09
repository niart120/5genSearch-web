/**
 * DS 設定機能の固有型定義
 *
 * WASM 由来の型 (DsConfig, GameStartConfig, Timer0VCountRange 等) は
 * '@/wasm/wasm_pkg' から直接 import する。ここには feature 固有の導出型のみ配置する。
 */

/** Select の選択肢データ */
interface SelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export type { SelectOption };
