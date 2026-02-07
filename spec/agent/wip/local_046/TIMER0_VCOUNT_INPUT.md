# Timer0/VCount 範囲入力コンポーネント 仕様書

## 1. 概要

### 1.1 目的

DS 起動時に発生する Timer0 / VCount のハードウェア揺らぎ範囲を入力するフォームコンポーネントを実装する。検索パラメータの `Timer0VCountRange` に対応する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| Timer0 | DS 起動時の GX タイマーカウント値。16-bit (`0x0000`–`0xFFFF`)。個体差・起動タイミングで数値揺れする |
| VCount | DS 起動時の LCD 描画行カウント。8-bit (`0x00`–`0xFF`)。ROM バージョン/リージョンにより典型値が異なる |
| `Timer0VCountRange` | WASM 型。`{ timer0_min, timer0_max, vcount_min, vcount_max }` の 4 フィールド構造体 |
| calibration | ユーザが自身の DS 実機で Timer0 / VCount の揺れ幅を計測する作業 |
| ROM パラメータ | ROM バージョン × リージョンごとの典型的な Timer0 / VCount 値。参考実装では静的テーブルとして保持 |

### 1.3 背景・問題

- `DsConfigStore` は `ranges: Timer0VCountRange[]` を保持し、`setRanges()` で更新可能
- 現在このフィールドを編集する UI コンポーネントが存在しない
- デフォルト値 (`0x0C79`–`0x0C7A`, VCount `0x5E`) はハードコードされており、ROM バージョン変更に連動しない

### 1.4 期待効果

| 指標 | 現状 | 実装後 |
|------|------|--------|
| Timer0/VCount 入力手段 | なし | フォームコンポーネントで入力可能 |
| 入力バリデーション | なし | hex フォーマット + 範囲検証 |

### 1.5 着手条件

- [x] `Timer0VCountRange` WASM 型定義が存在する
- [x] `DsConfigStore` に `ranges` / `setRanges` が実装済み
- [x] `lib/hex.ts` に hex パースユーティリティの基盤が存在する
- [x] `components/forms/input-helpers.ts` にフォーム共通ヘルパーが存在する

### 1.6 スコープ

**本仕様の対象**:

- `Timer0VCountRangeInput` フォームコンポーネント（手動入力モード）
- `lib/hex.ts` の 16-bit 対応拡張

**本仕様の対象外** (将来の別チケット):

- Auto モード（ROM バージョン/リージョンから典型値を自動設定）
- ROM パラメータルックアップテーブル（TypeScript 側 or WASM 側）
- 複数 `Timer0VCountRange` の UI 上での追加/削除

Auto モードは ROM パラメータデータの管理方針が必要で、コンポーネント設計とは独立した設計判断のため分離する。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/lib/hex.ts` | 修正 | 16-bit hex パース/フォーマット関数を追加 |
| `src/components/forms/timer0-vcount-range-input.tsx` | 新規 | Timer0/VCount 範囲入力コンポーネント |
| `src/test/unit/hex.test.ts` | 修正 | 16-bit hex 関数のテスト追加 |
| `src/test/components/forms/timer0-vcount-range-input.test.tsx` | 新規 | コンポーネントテスト |
| `src/i18n/locales/ja.po` | 修正 | ラベル翻訳追加 |
| `src/i18n/locales/en.po` | 修正 | ラベル翻訳追加 |

## 3. 設計方針

### 3.1 コンポーネント設計

- **単一 `Timer0VCountRange` を編集するフォーム部品** として設計する
- 配列管理 (`Timer0VCountRange[]`) は親コンポーネントまたはストアの責務
- 参考実装と同様、手動入力モードでは単一の範囲を入力する

### 3.2 hex.ts 拡張方針

既存の 1-byte 関数 (`parseHexByte`, `toHexString`) と並列に、16-bit 関数を追加する。

| 用途 | 関数 | 入力 | 出力 |
|------|------|------|------|
| VCount (8-bit) | `parseHexByte` (既存) | `"5E"` | `94` |
| VCount (8-bit) | `toHexString` (既存) | `94` | `"5E"` |
| Timer0 (16-bit) | `parseHexWord` (新規) | `"0C79"` | `3193` |
| Timer0 (16-bit) | `toHexWordString` (新規) | `3193` | `"0C79"` |

### 3.3 入力動作パターン

参考実装および既存の `MacAddressInput` と統一する。

| イベント | 動作 |
|----------|------|
| `onChange` | hex 文字 (`[0-9a-fA-F]`) のみ許容。最大桁数でトリム (Timer0: 4 桁, VCount: 2 桁) |
| `onFocus` | テキスト全選択 (`handleFocusSelectAll`) |
| `onBlur` | hex パース → 範囲クランプ → 大文字フォーマット → `onChange` を発火 |

### 3.4 min/max 整合性の方針

`min > max` の入力は許容し、コンポーネント側では強制的にスワップしない。

- 理由: ユーザが min → max の順に入力途中の状態で `min > max` は自然に発生する
- 検索実行時のバリデーション（別レイヤー）で検証する

## 4. 実装仕様

### 4.1 `hex.ts` 追加関数

```typescript
/** 16 進数文字列を 2 バイト整数 (0–65535) にパースする */
function parseHexWord(raw: string, defaultValue: number = 0): number {
  const trimmed = raw.trim();
  if (trimmed === '') return defaultValue;
  if (!/^[0-9a-fA-F]{1,4}$/.test(trimmed)) return defaultValue;
  return parseInt(trimmed, 16);
}

/** 数値を 16 進数 4 桁の大文字文字列に変換する */
function toHexWordString(value: number): string {
  return value.toString(16).padStart(4, '0').toUpperCase();
}
```

### 4.2 コンポーネントインターフェース

```typescript
import type { Timer0VCountRange } from '@/wasm/wasm_pkg';

interface Timer0VCountRangeInputProps {
  /** 現在の Timer0/VCount 範囲 */
  value: Timer0VCountRange;
  /** 値変更コールバック */
  onChange: (value: Timer0VCountRange) => void;
  /** 無効化 (Auto モード時に使用) */
  disabled?: boolean;
}
```

### 4.3 レイアウト構造

```
┌─────────────────────────────────────┐
│ Timer0                              │
│ [Min: 0C79 ] ─ [Max: 0C7A ]        │
│                                     │
│ VCount                              │
│ [Min: 5E   ] ─ [Max: 5E   ]        │
└─────────────────────────────────────┘
```

- Timer0 行: 2 つの 4 桁 hex 入力 (`input[maxLength=4]`)
- VCount 行: 2 つの 2 桁 hex 入力 (`input[maxLength=2]`)
- 各行にラベル (Timer0 / VCount)、各入力に Min / Max サブラベル
- ラベルテキストは Lingui で国際化

### 4.4 内部状態管理

```typescript
// ローカル文字列状態 (入力中の表示用)
const [timer0Min, setTimer0Min] = useState(() => toHexWordString(value.timer0_min));
const [timer0Max, setTimer0Max] = useState(() => toHexWordString(value.timer0_max));
const [vcountMin, setVcountMin] = useState(() => toHexString(value.vcount_min));
const [vcountMax, setVcountMax] = useState(() => toHexString(value.vcount_max));
```

- `value` prop が外部から変更された場合は `useEffect` で同期
- `onBlur` で `parseHexWord` / `parseHexByte` → `onChange` 発火
- `onChange` (input) ではローカル状態のみ更新（hex 文字フィルタ適用）

### 4.5 バリデーション仕様

| フィールド | 許容文字 | 最大桁数 | 値域 | デフォルト値 |
|-----------|---------|---------|------|-------------|
| timer0_min | `[0-9a-fA-F]` | 4 | 0–65535 | 変更前の `value.timer0_min` |
| timer0_max | `[0-9a-fA-F]` | 4 | 0–65535 | 変更前の `value.timer0_max` |
| vcount_min | `[0-9a-fA-F]` | 2 | 0–255 | 変更前の `value.vcount_min` |
| vcount_max | `[0-9a-fA-F]` | 2 | 0–255 | 変更前の `value.vcount_max` |

blur 時に空欄または不正入力の場合はデフォルト値（変更前の値）にフォールバックする。

## 5. テスト方針

### 5.1 `hex.ts` ユニットテスト (`src/test/unit/hex.test.ts`)

| テストケース | 検証内容 |
|-------------|---------|
| `parseHexWord` — 有効な 1–4 桁 hex | 正しい数値を返す |
| `parseHexWord` — 空文字列 | デフォルト値を返す |
| `parseHexWord` — 不正文字列 | デフォルト値を返す |
| `parseHexWord` — 5 桁以上 | デフォルト値を返す |
| `toHexWordString` — 各種値 | 4 桁大文字 hex 文字列を返す |
| `toHexWordString` — 0 | `"0000"` を返す |
| `toHexWordString` — 0xFFFF | `"FFFF"` を返す |

### 5.2 コンポーネントテスト (`src/test/components/forms/timer0-vcount-range-input.test.tsx`)

| テストケース | 検証内容 |
|-------------|---------|
| 初期表示 | 4 フィールドに hex 値が表示される |
| Timer0 min 入力 → blur | `onChange` が正しい `Timer0VCountRange` で呼ばれる |
| Timer0 max 入力 → blur | 同上 |
| VCount min 入力 → blur | 同上 |
| VCount max 入力 → blur | 同上 |
| hex 以外の文字入力 | フィルタされて入力されない |
| Timer0 フィールドに 5 文字入力 | 4 文字でトリムされる |
| VCount フィールドに 3 文字入力 | 2 文字でトリムされる |
| 空欄で blur | 変更前の値にフォールバック |
| `value` prop の外部変更 | 表示が同期する |
| `disabled` prop | 全入力が無効化される |
| フォーカス時 | テキスト全選択される |

## 6. 実装チェックリスト

- [ ] `parseHexWord` / `toHexWordString` を `src/lib/hex.ts` に追加
- [ ] `hex.test.ts` に 16-bit hex テスト追加
- [ ] `Timer0VCountRangeInput` コンポーネント実装
- [ ] コンポーネントテスト実装
- [ ] i18n ラベル追加 (Timer0, VCount, Min, Max)
- [ ] 全テスト pass 確認
- [ ] `tsc --noEmit` / `pnpm lint` pass 確認

## 7. 設計メモ

### 7.1 Auto モードについて

参考実装 (niart120/pokemon-gen5-initseed) では ROM バージョン/リージョンごとの Timer0/VCount 典型値を静的テーブルとして保持し、Auto モードで自動設定する機能がある。

本実装では以下の理由で Auto モードを別チケットとする:

1. **データの管理場所**: WASM (Rust) 側には Timer0/VCount のデフォルト値テーブルが存在しない（Nazo 値のみ）。TypeScript 側に ROM パラメータテーブルを新設するか、WASM 側に追加するかの設計判断が必要
2. **コンポーネントの単一責務**: フォーム入力部品は「値の入力/編集」に専念し、「どこからデフォルト値を取得するか」はストア同期や wrapper の責務
3. **段階的実装**: 手動入力 → Auto モードの順で実装することで、Auto モードの仕様変更がフォーム部品に波及しない

Auto モード実装時は:

- `disabled` prop を活用して入力を無効化
- ストア同期 (`sync.ts`) または `useDsConfig` hook で version/region 変更 → `setRanges()` 連動
- ROM パラメータテーブルの設計（`src/data/rom-parameters.ts` or WASM 関数）

### 7.2 複数範囲について

WASM 型は `Timer0VCountRange[]`（配列）を受け付ける。これは VCount ごとに異なる Timer0 範囲を持つ ROM（例: BW2 GER, ITA）に対応するため。

手動入力では単一範囲のみ入力する設計とする。複数範囲が必要なケース（VCount ずれ）は Auto モードでのみ発生し、ROM パラメータテーブルから自動生成される想定。

コンポーネントの `onChange` は単一 `Timer0VCountRange` を返し、親側で `[range]` として配列化してストアに保存する。
