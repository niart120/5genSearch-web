# 針読み (Needle Search) 仕様書

## 1. 概要

### 1.1 目的

レポート針の観測パターンから現在の消費位置 (advance) を特定する。単一の初期 Seed (日時指定 or LCG Seed 直接指定) に対して、ユーザーが観測した針方向列を照合し、一致する消費位置をテーブル表示する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| NeedleDirection | レポート針の 8 方向 (`N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`)。数値 0-7 に対応 |
| NeedlePattern | `NeedleDirection[]` のラッパー。観測したレポート針の方向列 |
| NeedleSearchResult | 検索結果。`advance` (パターン末尾消費位置) + `source` (`SeedOrigin`) |
| GenerationConfig | 生成共通設定。`version` / `game_start` / `user_offset` / `max_advance` |
| SeedOrigin | 生成元情報。`Seed` (直接指定) または `Startup` (DS 起動条件付き) |
| SeedSpec | Seed 指定方法。`Seeds` (LCG Seed 直接指定) または `Startup` (DS 設定 + 日時) |
| advance | 乱数消費位置。`game_offset` (ROM バージョン・起動条件に依存する自動計算値) からの相対位置 |

### 1.3 背景・問題

ポケモン BW/BW2 の乱数調整では、ゲーム内のレポート針の向きが乱数消費に対応している。目的の個体を入手するには、針パターンを観測して現在の消費位置を特定し、目標の advance まで消費を合わせる必要がある。

リファレンス実装 (pokemon-gen5-initseed) では方向ボタンによる入力と数字列による入力の両方をサポートし、自動検索機能も備えている。本実装でもこれらを踏襲する。

### 1.4 期待効果

- 観測した針パターンから消費位置を即座に特定できる
- 入力変更時の自動検索により、針を 1 本追加するたびに結果が絞り込まれる
- 数字列の手打ち入力にも対応し、記録済みパターンの入力効率を向上する

### 1.5 着手条件

| 条件 | 状態 |
|------|------|
| WASM API (`search_needle_pattern`, `get_needle_pattern_at`) | 実装済み |
| WASM API (`resolve_seeds`) | 実装済み |
| TS サービス (`resolveSeedOrigins`) | 実装済み |
| `DatetimeInput` / `NumField` | 実装済み (本仕様で改修) |
| `DataTable` (仮想スクロールテーブル) | 実装済み |
| ナビゲーション (`'needle'` FeatureId) | 登録済み |
| `NEEDLE_ARROWS` / `getNeedleArrow()` | 実装済み |

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/features/needle/index.ts` | 新規 | 公開 API (re-export) |
| `src/features/needle/types.ts` | 新規 | フォーム状態型 + バリデーション + パターンパーサー |
| `src/features/needle/hooks/use-needle-search.ts` | 新規 | 針検索フック (メインスレッド同期実行) |
| `src/features/needle/components/needle-page.tsx` | 新規 | ページコンポーネント (FeaturePageLayout) |
| `src/features/needle/components/needle-input.tsx` | 新規 | 針パターン入力 UI (方向ボタン + テキスト入力) |
| `src/features/needle/components/needle-result-columns.tsx` | 新規 | DataTable 列定義 |
| `src/features/needle/components/seed-input.tsx` | 新規 | Seed 入力 UI (日時 / LCG Seed 2 モード) |
| `src/components/forms/datetime-input.tsx` | 修正 | DatetimeInput 改修 (Plan C: native date + spinner NumField) |
| `src/components/layout/feature-content.tsx` | 修正 | `'needle'` → `NeedlePage` マッピング追加 |

## 3. 設計方針

### 3.1 レイヤー構成

**Worker を使用しない**。`search_needle_pattern` はメインスレッドで同期実行される軽量 API であり（`spec/agent/architecture/worker-design.md` セクション 2.3 参照）、Worker 経由の非同期実行は不要。

```
UI (needle-page) → Hook (use-needle-search) → WASM (search_needle_pattern) [メインスレッド同期]
```

既存の `useSearch` / `WorkerPool` / `SearchControls` (進捗バー付き) は使用しない。代わりに自動検索トグル付きの即時実行パターンを採用する。

### 3.2 入出力

#### 入力

| 入力項目 | 型 | 提供元 | 説明 |
|----------|-----|--------|------|
| SeedOrigin | `SeedOrigin` | `SeedInput` (日時 or LCG Seed) | 単一の起動条件 |
| NeedlePattern | `NeedleDirection[]` | `NeedleInput` (方向ボタン or テキスト) | 観測した針パターン |
| GenerationConfig | `GenerationConfig` | DS 設定 Store + ローカル state | 生成共通設定 |

`GenerationConfig` の構成:

| フィールド | ソース | 説明 |
|---|---|---|
| `version` | `ds-config` Store (サイドバー) | ROM バージョン |
| `game_start` | `ds-config` Store (サイドバー `gameStart`) | 起動設定 |
| `user_offset` | ローカル state | 検索開始消費位置 |
| `max_advance` | ローカル state | 検索終了消費位置 |

ID 調整とは異なり、`GameStartConfig` はサイドバーの値をそのまま使用する。針読みは「つづきから」で使用する機能であり、サイドバーの `gameStart` が適用対象。

#### 出力

`NeedleSearchResult[]`:

| フィールド | 型 | 説明 |
|------------|-----|------|
| `advance` | `number` | パターン末尾消費位置 (`game_offset` からの相対) |
| `source` | `SeedOrigin` | 生成元情報 |

### 3.3 WASM API 対応

| WASM API | 実行場所 | 用途 |
|----------|----------|------|
| `search_needle_pattern(origins, pattern, config)` | メインスレッド | 針パターン検索。引数 `origins` は単一要素配列で渡す |
| `get_needle_pattern_at(seed_value, advance, count)` | メインスレッド | (将来用) 指定位置の針パターン取得 |
| `resolve_seeds(input)` | メインスレッド | SeedSpec → SeedOrigin[] 変換。日時モードで使用 |

### 3.4 既存 TS API 対応

| API | ファイル | 用途 |
|-----|----------|------|
| `DatetimeInput` / `NumField` | `components/forms/datetime-input.tsx` | 日時入力 (本仕様で改修) |
| `useDsConfigReadonly()` | `hooks/use-ds-config.ts` | DS 設定取得 |
| `resolveSeedOrigins()` | `services/seed-resolve.ts` | SeedSpec → SeedOrigin[] 変換 |
| `DataTable` | `components/data-display/data-table.tsx` | 結果テーブル |
| `NEEDLE_ARROWS` / `getNeedleArrow()` | `lib/game-data-names.ts` | 方向→矢印変換 |

### 3.5 GPU 対応

針検索は CPU メインスレッド同期実行。GPU バリアントは提供しない。

### 3.6 自動検索

入力変更 (針パターン・Seed・advance 範囲) のたびに `search_needle_pattern` を自動実行する。トグルで ON/OFF を切り替え可能。

- ON (デフォルト): 入力変更時に即座に検索実行、結果を自動更新
- OFF: 「検索」ボタンで手動実行

メインスレッド同期実行のため、進捗バーは不要。入力のたびに結果がリアクティブに更新される。単一 Seed に対する検索なので、パフォーマンス上の問題は想定しない。

## 4. 実装仕様

### 4.1 `types.ts` — フォーム状態型 + バリデーション + パターンパーサー

```typescript
import type { NeedleDirection, NeedlePattern, SeedOrigin } from '../../wasm/wasm_pkg.js';

/** Seed 入力モード */
export type SeedMode = 'datetime' | 'seed';

/** バリデーションエラーコード */
export type NeedleValidationErrorCode =
  | 'SEED_EMPTY'
  | 'PATTERN_EMPTY'
  | 'PATTERN_INVALID'
  | 'ADVANCE_RANGE_INVALID'
  | 'OFFSET_NEGATIVE';

/** 針読みフォーム状態 */
export interface NeedleFormState {
  seedMode: SeedMode;
  seedOrigin: SeedOrigin | undefined;
  patternRaw: string;
  userOffset: number;
  maxAdvance: number;
  autoSearch: boolean;
}

/** バリデーション結果 */
export interface NeedleValidationResult {
  errors: NeedleValidationErrorCode[];
  isValid: boolean;
}

/** 方向名 → NeedleDirection マップ */
const DIRECTION_NAMES: readonly NeedleDirection[] = [
  'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW',
];

/**
 * 数字列 → NeedleDirection[] にパース
 *
 * 入力形式: `"24267"` → 各桁を 0-7 として解釈
 * ユーザー入力は数字列 (0-7) のみを受け付ける。
 * 矢印表示は `directionsToArrows()` で別途生成する。
 *
 * @returns パース成功時は NeedleDirection[]、失敗時は undefined
 */
export function parseNeedlePattern(input: string): NeedleDirection[] | undefined {
  const trimmed = input.trim();
  if (trimmed.length === 0) return undefined;

  // 数字列判定 (0-7 のみで構成)
  if (!/^[0-7]+$/.test(trimmed)) return undefined;
  return trimmed.split('').map((ch) => DIRECTION_NAMES[Number(ch)]);
}

/**
 * NeedleDirection[] → カンマ区切り矢印表示文字列に変換
 *
 * read-only 欄の表示用。例: `['E', 'S', 'E']` → `"→,↓,→"`
 */
export function directionsToArrows(dirs: NeedleDirection[]): string {
  const ARROW_MAP: Record<NeedleDirection, string> = {
    N: '↑', NE: '↗', E: '→', SE: '↘',
    S: '↓', SW: '↙', W: '←', NW: '↖',
  };
  return dirs.map((d) => ARROW_MAP[d]).join(',');
}

/**
 * バリデーション
 */
export function validateNeedleForm(
  form: Pick<NeedleFormState, 'seedOrigin' | 'patternRaw' | 'userOffset' | 'maxAdvance'>
): NeedleValidationResult {
  const errors: NeedleValidationErrorCode[] = [];

  if (form.seedOrigin === undefined) {
    errors.push('SEED_EMPTY');
  }

  const parsed = parseNeedlePattern(form.patternRaw);
  if (form.patternRaw.trim().length === 0) {
    errors.push('PATTERN_EMPTY');
  } else if (!parsed) {
    errors.push('PATTERN_INVALID');
  }

  if (form.userOffset < 0) {
    errors.push('OFFSET_NEGATIVE');
  }
  if (form.maxAdvance < form.userOffset) {
    errors.push('ADVANCE_RANGE_INVALID');
  }

  return { errors, isValid: errors.length === 0 };
}
```

バリデーションルール:

| コード | 条件 |
|--------|------|
| `SEED_EMPTY` | SeedOrigin が未設定 |
| `PATTERN_EMPTY` | パターン入力が空 |
| `PATTERN_INVALID` | パターン入力が 0-7 の数字列でない |
| `OFFSET_NEGATIVE` | `user_offset` が負数 |
| `ADVANCE_RANGE_INVALID` | `max_advance < user_offset` |

パターンパーサーの受付形式:

| 入力例 | 解釈 |
|--------|------|
| `"24267"` | 各桁を 0-7 の NeedleDirection に変換: E, S, E, SW, NW |
| `""` | 空 (パターン未入力) → `undefined` |
| `"89"` | 無効 (0-7 の範囲外) → `undefined` |
| `"abc"` | 無効 (数字以外) → `undefined` |

ユーザー入力は数字列 (0-7) のみ。矢印表示は `directionsToArrows()` で read-only 欄に出力する。

### 4.2 `use-needle-search.ts` — 針検索フック

```typescript
import { useMemo, useCallback, useState } from 'react';
import { search_needle_pattern } from '@/wasm/wasm_pkg.js';
import type {
  SeedOrigin,
  NeedleSearchResult,
  GenerationConfig,
  NeedleDirection,
} from '@/wasm/wasm_pkg.js';
import { parseNeedlePattern, type NeedleFormState } from '../types';

interface UseNeedleSearchReturn {
  results: NeedleSearchResult[];
  error: string | undefined;
  search: (
    origin: SeedOrigin,
    pattern: NeedleDirection[],
    config: GenerationConfig,
  ) => void;
  clear: () => void;
}

export function useNeedleSearch(): UseNeedleSearchReturn {
  const [results, setResults] = useState<NeedleSearchResult[]>([]);
  const [error, setError] = useState<string | undefined>();

  const search = useCallback(
    (
      origin: SeedOrigin,
      pattern: NeedleDirection[],
      config: GenerationConfig,
    ) => {
      setError(undefined);
      try {
        // WASM API は Vec<SeedOrigin> を受け取るため単一要素配列で渡す
        const found = search_needle_pattern([origin], pattern, config);
        setResults(found);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        setResults([]);
      }
    },
    [],
  );

  const clear = useCallback(() => {
    setResults([]);
    setError(undefined);
  }, []);

  return { results, error, search, clear };
}
```

`useSearch` / `WorkerPool` は使用しない。状態は `useState` のみで管理する。

### 4.3 `needle-input.tsx` — 針パターン入力 UI

数字テキスト入力 (0-7) + 方向ボタン (入力補助) + read-only 矢印表示の 3 層で構成する。

```typescript
interface NeedleInputProps {
  value: string;                    // patternRaw (数字列: "24267")
  onChange: (value: string) => void;
  disabled?: boolean;
}
```

#### UI レイアウト

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌───┬───┬───┐   Needle Direction (Numeric):                   │
│  │ ↖ │ ↑ │ ↗ │   ┌────────────────────────────────────┐        │
│  ├───┼───┼───┤   │ 24267                              │        │
│  │ ← │   │ → │   └────────────────────────────────────┘        │
│  ├───┼───┼───┤   Needle Direction (Arrow):                     │
│  │ ↙ │ ↓ │ ↘ │   ┌────────────────────────────────────┐        │
│  └───┴───┴───┘   │ →,↓,→,↙,↖                         │ (r/o)  │
│                   └────────────────────────────────────┘        │
│                   [Back] [Clear]                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

- 左列: 方向ボタン (3×3 グリッド、中央空き)
- 右列: Numeric 入力 + Arrow 表示 (read-only) + 操作ボタン を縦に配置
- `flex` (横並び) で左右を配置し、方向ボタングリッドが中央に垂直整列する
- モバイルでもこのレイアウトを維持する (方向ボタンは固定幅、右列が伸縮)

動作:

- **数字テキスト入力** (primary): `inputMode="numeric"` の数字専用テキストボックス。0-7 の数字列を直接入力する。入力のたびにパース + read-only 矢印表示を更新
- **方向ボタン** (補助): 対応する数字 (0-7) を `value` 末尾に追記する入力補助。操作結果は数字テキスト入力に反映される
- **1つ戻る ボタン**: `value` の末尾 1 文字を削除
- **クリア ボタン**: `value` を空文字にリセット
- **i18n 対応**: `Back` / `Clear` は固定文字列にせず、`<Trans>` を用いた日英翻訳対象として実装する
- テキスト入力と方向ボタンは同一 state (`patternRaw`) を操作する
- **read-only 矢印欄**: `parseNeedlePattern(value)` で得た `NeedleDirection[]` を `directionsToArrows()` でカンマ区切り矢印文字列化して表示。パース失敗時は空欄

### 4.4 `seed-input.tsx` — Seed 入力 UI

`SeedInputSection` (3 モード: Startup / Seeds / 検索結果) は再利用しない。針読みでは単一の起動条件を指定すれば十分なため、軽量な専用コンポーネントを新設する。

#### Seed 入力モード

| モード | 入力 | SeedOrigin 変換方法 |
|--------|------|-------------------|
| `datetime` | 日時入力 (DatetimeInput) + DS 設定 (サイドバー) | `resolveSeedOrigins()` → 1 件取得 |
| `seed` | LCG Seed Hex 入力 (16 桁) | `SeedOrigin.Seed(value)` を直接構築 |

```typescript
interface SeedInputProps {
  mode: SeedMode;
  onModeChange: (mode: SeedMode) => void;
  seedOrigin: SeedOrigin | undefined;
  onSeedOriginChange: (origin: SeedOrigin | undefined) => void;
}
```

#### UI レイアウト

```
┌──────────────────────────────────────────────┐
│ [日時] [LCG Seed]  ← Tabs (Radix Tabs)      │
├──────────────────────────────────────────────┤
│ datetime タブ:                               │
│  日付: [  2025-01-15  ] ← <input type="date">│
│  時刻: [ H ] : [ M ] : [ S ] ← NumField     │
│  Key入力: [________]                         │
│                                              │
│ seed タブ:                                   │
│  LCG Seed: [________________] ← Hex 16桁    │
└──────────────────────────────────────────────┘
```

- `datetime` モード: `DatetimeInput` (改修後) + `keyInput` (既存) → DS 設定 (サイドバー) と組み合わせて `SeedSpec.Startup` を構築し、`resolveSeedOrigins()` で `SeedOrigin[]` (1 件) を取得。先頭要素を `seedOrigin` に設定
- `seed` モード: 16 進数入力 → `BigInt` → `SeedOrigin` の `Seed` variant を直接構築
- モード切替時は `seedOrigin` を `undefined` にリセット

### 4.5 DatetimeInput 改修 (Plan C)

`src/components/forms/datetime-input.tsx` を改修し、日付入力と時刻入力の UX を改善する。

#### 現状の問題

1. **スピナー未対応**: `inputMode="numeric"` を使用しているため、ネイティブスピナーが表示されない。微調整が煩雑
2. **`select()` 不安定**: 一部ブラウザ (iOS Safari 等) で `onFocus` の `select()` が効かない
3. **相関バリデーション未実装**: 「2月31日」等の無効日付を検出不能 (月ごとの日数上限が未連動)
4. **iOS 時刻入力**: `<input type="time">` は iOS Safari で秒フィールドが表示されない場合がある

#### 改修方針

| 部位 | 現行 | 改修後 |
|------|------|--------|
| 日付 (Y/M/D) | NumField × 3 | `<input type="date">` (ネイティブ) |
| 時刻 (H/M/S) | NumField × 3 | NumField × 3 + カスタムスピナー (上下ボタン) |

#### `<input type="date">` の設計

```typescript
<input
  type="date"
  min="2000-01-01"
  max="2099-12-31"
  value={dateString}        // "YYYY-MM-DD" 形式
  onChange={handleDateChange}
/>
```

- `min` / `max` で DS 対応年範囲 (2000-2099) を制限
- カレンダーピッカーが表示され、日付の整合性 (うるう年・月末) はブラウザが自動保証
- `onChange` 時に年・月・日を分解して既存の `DatetimeValue` に反映

#### カスタムスピナー付き NumField

```typescript
interface SpinnerNumFieldProps extends NumFieldProps {
  step?: number;  // default: 1
}
```

```
┌───────────────────┐
│ [▲]  23  [▼]      │   ← 時
│ [▲]  59  [▼]      │   ← 分
│ [▲]  30  [▼]      │   ← 秒
└───────────────────┘
```

- 上下ボタンで値を ±step 増減 (clamp: min-max 範囲内)
- キーボード入力 (数字直打ち) も従来通りサポート
- `select()` の不安定さはスピナーで代替操作路を確保することで実質的に解消

#### 後方互換性

`DatetimeInput` の外部インターフェース (`DatetimeInputProps`, `DatetimeValue`) は変更しない。内部レンダリングのみ改修するため、`SeedInputSection` 等の既存利用箇所には影響しない。

### 4.6 `needle-page.tsx` — ページコンポーネント

`FeaturePageLayout` (Controls / Results 2 ペイン) を使用。針検索はメインスレッド同期実行のため `SearchControls` (進捗バー付き) は使用せず、独自の検索ボタン + 自動検索トグルを Controls 内に配置する。

Controls 内の配置順:

1. 検索ボタン + 自動検索トグル
2. `SeedInput` (Seed 入力 2 モード: 日時 / LCG Seed)
3. `NeedleInput` (針パターン入力)
4. 消費数範囲入力 (user_offset / max_advance)
5. バリデーションエラー表示

Results 内:

1. 結果件数表示
2. `DataTable<NeedleSearchResult>` (仮想スクロール)

#### 自動検索の実装

```typescript
// autoSearch === true のとき、依存値変更で自動実行
useEffect(() => {
  if (!autoSearch) return;
  if (!validation.isValid) return;

  const pattern = parseNeedlePattern(patternRaw);
  if (!pattern) return;

  const config: GenerationConfig = {
    version: dsConfig.version,
    game_start: gameStart,
    user_offset: userOffset,
    max_advance: maxAdvance,
  };

  needleSearch.search(seedOrigin, pattern, config);
}, [autoSearch, seedOrigin, patternRaw, dsConfig.version, gameStart, userOffset, maxAdvance]);
```

`autoSearch` が OFF の場合は検索ボタンのクリックイベントで同じ処理を行う。

#### モバイル対応

モバイルでは検索ボタン + 自動検索トグルを下部固定バーに配置する (既存 feature と同じデュアルレンダーパターン)。ただし `SearchControls` は使用せず、独自の軽量バーを実装する。

```tsx
{/* モバイル: 下部固定バー */}
<div className="fixed bottom-14 left-0 right-0 z-40 border-t border-border bg-background p-3 lg:hidden">
  <div className="flex items-center gap-2">
    <Button onClick={handleSearch} disabled={!validation.isValid} size="sm" className="flex-1">
      <Trans>Search</Trans>
    </Button>
    <div className="flex items-center gap-1">
      <Switch checked={autoSearch} onCheckedChange={setAutoSearch} id="auto-search-mobile" />
      <Label htmlFor="auto-search-mobile" className="text-xs">
        <Trans>Auto</Trans>
      </Label>
    </div>
  </div>
</div>
```

### 4.7 `needle-result-columns.tsx` — テーブル列定義

| 列名 | ソース | フォーマット |
|------|--------|------------|
| Advance | `advance` | 10 進数 |
| Initial Seed | `source` → `base_seed` | 16 進数大文字 16 桁 |
| Date | `source.Startup?.datetime` | `YYYY/MM/DD` (Startup のみ) |
| Time | `source.Startup?.datetime` | `HH:MM:SS` (Startup のみ) |
| Timer0 | `source.Startup?.condition.timer0` | 16 進数大文字 (Startup のみ) |
| VCount | `source.Startup?.condition.vcount` | 16 進数大文字 (Startup のみ) |

`SeedOrigin` が `Seed` 型 (直接指定) の場合、Date / Time / Timer0 / VCount 列は空欄。`Startup` 型の場合に各値を表示する。単一 Seed に対する検索なので、全結果の source 列は同一値になる。

### 4.8 `feature-content.tsx` — ページマッピング追加

```typescript
import { NeedlePage } from '@/features/needle';

// renderFeature switch に追加
case 'needle': return <NeedlePage />;
```

### 4.9 状態管理

| 状態 | 管理場所 | 永続化 |
|------|----------|--------|
| DS 設定 (DsConfig, ranges, gameStart) | `ds-config` Store (サイドバー) | あり |
| Seed 入力モード / SeedOrigin | `needle-page.tsx` ローカル state | なし |
| 針パターン (patternRaw) | `needle-page.tsx` ローカル state | なし |
| 消費数範囲 (userOffset / maxAdvance) | `needle-page.tsx` ローカル state | なし |
| 自動検索トグル (autoSearch) | `needle-page.tsx` ローカル state | なし |
| 検索結果 | `use-needle-search.ts` 内部 state | なし |

新規 Store の追加は不要。サイドバーの `gameStart` をそのまま使用する (針読みは「つづきから」用途)。Seed 入力は単一の `SeedOrigin` を生成するのみで、複数 Seed のバッチ検索はサポートしない。

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/`)

| テスト | 対象 | 検証内容 |
|--------|------|----------|
| パターンパーサー (数字列) | `parseNeedlePattern()` | `"24267"` → `['E', 'S', 'E', 'SW', 'NW']` |
| パターンパーサー (空文字) | `parseNeedlePattern()` | `""` → `undefined` |
| パターンパーサー (不正入力) | `parseNeedlePattern()` | `"89"` → `undefined`、`"abc"` → `undefined` |
| 矢印変換 | `directionsToArrows()` | `['E', 'S', 'E']` → `"→,↓,→"` |
| バリデーション | `validateNeedleForm()` | Seed 未設定 → `SEED_EMPTY`、パターン空 → `PATTERN_EMPTY`、正常入力 → `isValid: true` |

### 5.2 統合テスト (`src/test/integration/`)

| テスト | 対象 | 検証内容 |
|--------|------|----------|
| WASM 連携 | `search_needle_pattern()` | 既知の Seed + パターンで検索し、結果が `NeedleSearchResult[]` 型であること。結果の `advance` が正の整数であること |

## 6. 実装チェックリスト

- [ ] `src/features/needle/types.ts` — フォーム状態型 + `parseNeedlePattern` + `directionsToArrows` + `validateNeedleForm`
- [ ] `src/features/needle/hooks/use-needle-search.ts` — 針検索フック
- [ ] `src/features/needle/components/needle-input.tsx` — 針パターン入力 UI
- [ ] `src/features/needle/components/seed-input.tsx` — Seed 入力 UI (2 モード)
- [ ] `src/features/needle/components/needle-result-columns.tsx` — テーブル列定義
- [ ] `src/features/needle/components/needle-page.tsx` — ページコンポーネント
- [ ] `src/features/needle/index.ts` — re-export
- [ ] `src/components/forms/datetime-input.tsx` — DatetimeInput 改修 (Plan C)
- [ ] `src/components/layout/feature-content.tsx` — ページマッピング追加
- [ ] `src/test/unit/needle-types.test.ts` — パーサー + バリデーション テスト
- [ ] `src/test/integration/needle-search.test.ts` — WASM 統合テスト
- [ ] 翻訳リソース更新 (`pnpm lingui:extract`)
