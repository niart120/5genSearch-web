/**
 * データ表示用フォーマッタ
 *
 * 表示用のフォーマット関数を集約する。
 * services/progress.ts から移動したフォーマッタを含む。
 */

import type { SupportedLocale } from '@/i18n';
import type { AggregatedProgress } from '@/services/progress';
import type {
  AbilitySlot,
  Datetime,
  DsButton,
  Gender,
  Ivs,
  KeyInput,
  ShinyType,
} from '@/wasm/wasm_pkg';

/**
 * rem 値をピクセル値に変換する。
 * ブラウザの root font-size を参照するため、ユーザーの文字サイズ設定に追従する。
 * @tanstack/react-virtual の estimateSize 等、px を要求する API 向け。
 */
function remToPx(rem: number): number {
  if (typeof document === 'undefined') {
    return rem * 16; // SSR / テスト環境フォールバック
  }
  const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  if (Number.isNaN(rootFontSize) || rootFontSize === 0) {
    return rem * 16; // jsdom 等でフォントサイズが取得できない場合のフォールバック
  }
  return rem * rootFontSize;
}

const pad = (n: number) => n.toString().padStart(2, '0');

/**
 * 経過時間をフォーマットする (mm:ss または hh:mm:ss)
 */
function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * bigint を 16 進数文字列に変換する (大文字、prefix なし)
 */
function toBigintHex(value: bigint, digits: number): string {
  return value.toString(16).toUpperCase().padStart(digits, '0');
}

/**
 * 件数をフォーマットする (例: "1,234 件" / "1,234 results")
 */
function formatResultCount(count: number, locale: SupportedLocale): string {
  const bcp47 = locale === 'ja' ? 'ja-JP' : 'en-US';
  const formatted = new Intl.NumberFormat(bcp47).format(count);
  return locale === 'ja' ? `${formatted} 件` : `${formatted} results`;
}

// --- 以下、services/progress.ts から移動 ---

/**
 * 進捗情報をフォーマット
 * (元: services/progress.ts)
 */
function formatProgress(progress: AggregatedProgress): string {
  const { percentage, throughput, estimatedRemainingMs, tasksCompleted, tasksTotal } = progress;

  const remainingSeconds = Math.ceil(estimatedRemainingMs / 1000);
  const throughputStr =
    throughput >= 1000 ? `${(throughput / 1000).toFixed(1)}K/s` : `${Math.round(throughput)}/s`;

  return `${percentage.toFixed(1)}% | ${throughputStr} | 残り ${remainingSeconds}s | タスク ${tasksCompleted}/${tasksTotal}`;
}

/**
 * 推定残り時間を人間が読みやすい形式にフォーマット
 * (元: services/progress.ts)
 */
function formatRemainingTime(ms: number): string {
  if (ms <= 0) return '0s';

  const seconds = Math.ceil(ms / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * スループットを人間が読みやすい形式にフォーマット
 * (元: services/progress.ts)
 */
function formatThroughput(throughput: number): string {
  if (throughput >= 1_000_000) {
    return `${(throughput / 1_000_000).toFixed(2)}M/s`;
  }
  if (throughput >= 1000) {
    return `${(throughput / 1000).toFixed(1)}K/s`;
  }
  return `${Math.round(throughput)}/s`;
}

/**
 * 数値を 16 進文字列にフォーマット (大文字、指定桁数ゼロ埋め)
 */
function toHex(value: number, digits: number): string {
  return value.toString(16).toUpperCase().padStart(digits, '0');
}

/**
 * WASM Datetime 型を表示文字列にフォーマット
 * 例: "2025/01/15 12:30:45"
 */
function formatDatetime(dt: Datetime): string {
  return `${dt.year}/${pad(dt.month)}/${pad(dt.day)} ${pad(dt.hour)}:${pad(dt.minute)}:${pad(dt.second)}`;
}

/**
 * ボタンビットマスク定義 (bit → 表示名、表示順固定)
 *
 * KeyCode = KeyMask XOR 0x2FFF
 * KeyMask のビット割り当て:
 *   bit0=A, bit1=B, bit2=Select, bit3=Start,
 *   bit4=→, bit5=←, bit6=↑, bit7=↓,
 *   bit8=R, bit9=L, bit10=X, bit11=Y
 */
const KEY_BUTTONS: readonly [number, string][] = [
  [0x00_01, 'A'],
  [0x00_02, 'B'],
  [0x04_00, 'X'],
  [0x08_00, 'Y'],
  [0x02_00, 'L'],
  [0x01_00, 'R'],
  [0x00_40, '↑'],
  [0x00_80, '↓'],
  [0x00_20, '←'],
  [0x00_10, '→'],
  [0x00_08, 'Start'],
  [0x00_04, 'Select'],
];

/**
 * KeyCode からボタン名リストを逆引き
 * 例: 0x2FFF → "なし", 0x2FFE → "A", 0x2FF6 → "A + Start"
 */
function formatKeyCode(keyCode: number): string {
  const mask = keyCode ^ 0x2f_ff;
  const pressed: string[] = [];
  for (const [bit, name] of KEY_BUTTONS) {
    if ((mask & bit) !== 0) pressed.push(name);
  }
  return pressed.length === 0 ? 'なし' : pressed.join(' + ');
}

/**
 * 性別を表示用文字列にフォーマット
 */
function formatGender(gender: Gender): string {
  switch (gender) {
    case 'Male': {
      return '♂';
    }
    case 'Female': {
      return '♀';
    }
    case 'Genderless': {
      return '-';
    }
  }
}

/**
 * 色違い種別を表示用文字列にフォーマット
 */
function formatShiny(shinyType: ShinyType): string {
  switch (shinyType) {
    case 'Star': {
      return '☆';
    }
    case 'Square': {
      return '◇';
    }
    case 'None': {
      return '';
    }
  }
}

/**
 * 色違い種別を表示用文字列にフォーマット (詳細ダイアログ用: None → "-")
 */
function formatShinyDetailed(shinyType: ShinyType): string {
  switch (shinyType) {
    case 'Star': {
      return '☆';
    }
    case 'Square': {
      return '◇';
    }
    case 'None': {
      return '-';
    }
  }
}

/**
 * 特性スロットを表示用文字列にフォーマット
 */
function formatAbilitySlot(slot: AbilitySlot): string {
  switch (slot) {
    case 'First': {
      return '1';
    }
    case 'Second': {
      return '2';
    }
    case 'Hidden': {
      return 'H';
    }
  }
}

/**
 * 個体値を "H-A-B-C-D-S" 形式にフォーマット
 */
function formatIvs(ivs: Ivs): string {
  return `${ivs.hp}-${ivs.atk}-${ivs.def}-${ivs.spa}-${ivs.spd}-${ivs.spe}`;
}

/**
 * MAC アドレスをコロン区切り文字列にフォーマット
 * 例: [0, 17, 34, 51, 68, 85] → "00:11:22:33:44:55"
 */
function formatMacAddress(mac: readonly number[]): string {
  return mac.map((b) => b.toString(16).padStart(2, '0')).join(':');
}

/**
 * KeyCode (number) → DsButton[] のビットマスク逆引きテーブル
 * formatKeyCode の KEY_BUTTONS と同一のビット割り当てだが DsButton 型を返す。
 */
const KEY_BUTTON_MAP: readonly [number, DsButton][] = [
  [0x00_01, 'A'],
  [0x00_02, 'B'],
  [0x04_00, 'X'],
  [0x08_00, 'Y'],
  [0x02_00, 'L'],
  [0x01_00, 'R'],
  [0x00_08, 'Start'],
  [0x00_04, 'Select'],
  [0x00_40, 'Up'],
  [0x00_80, 'Down'],
  [0x00_20, 'Left'],
  [0x00_10, 'Right'],
];

/**
 * KeyCode を KeyInput に変換する。
 * key_code → mask (XOR 0x2FFF) → 各ビットから DsButton を逆引き。
 */
function keyCodeToKeyInput(keyCode: number): KeyInput {
  const mask = keyCode ^ 0x2f_ff;
  const buttons: DsButton[] = [];
  for (const [bit, name] of KEY_BUTTON_MAP) {
    if ((mask & bit) !== 0) buttons.push(name);
  }
  return { buttons };
}

/**
 * DsButton の表示順序 (固定)
 * formatDsButtons でソートに使用する。
 */
const DISPLAY_ORDER: readonly DsButton[] = [
  'A',
  'B',
  'X',
  'Y',
  'L',
  'R',
  'Up',
  'Down',
  'Left',
  'Right',
  'Start',
  'Select',
];

/** DsButton の表示ラベルマッピング */
const BUTTON_LABELS: Record<DsButton, string> = {
  A: 'A',
  B: 'B',
  X: 'X',
  Y: 'Y',
  L: 'L',
  R: 'R',
  Start: 'Start',
  Select: 'Select',
  Up: '↑',
  Down: '↓',
  Left: '←',
  Right: '→',
};

/**
 * DsButton[] を表示用文字列にフォーマット
 * 例: ['A', 'Start'] → "A + Start", [] → ""
 *
 * 空配列時は空文字列を返す。表示用の「なし」等は呼び出し側で i18n 対応すること。
 */
function formatDsButtons(buttons: DsButton[]): string {
  if (buttons.length === 0) return '';
  const sorted = buttons.toSorted((a, b) => DISPLAY_ORDER.indexOf(a) - DISPLAY_ORDER.indexOf(b));
  return sorted.map((b) => BUTTON_LABELS[b]).join(' + ');
}

export {
  BUTTON_LABELS,
  DISPLAY_ORDER,
  remToPx,
  formatElapsedTime,
  toBigintHex,
  formatResultCount,
  formatProgress,
  formatRemainingTime,
  formatThroughput,
  toHex,
  formatDatetime,
  formatKeyCode,
  formatGender,
  formatShiny,
  formatShinyDetailed,
  formatAbilitySlot,
  formatIvs,
  formatMacAddress,
  keyCodeToKeyInput,
  formatDsButtons,
};
