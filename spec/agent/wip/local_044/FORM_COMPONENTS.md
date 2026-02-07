# フォーム部品 仕様書

## 1. 概要

### 1.1 目的

Phase 2 共通コンポーネントのうち、フォーム入力に特化した部品群を `src/components/forms/` に実装する。
各部品は WASM の型定義 (`wasm_pkg.d.ts`) と直接対応し、Phase 3 の機能実装 (DS 設定・起動時刻検索・個体生成・孵化検索等) で即座に利用可能な形を提供する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| フォーム部品 | `src/components/forms/` に配置する、特定のドメインデータ入力に特化したコンポーネント |
| UI 部品 | `src/components/ui/` に配置済みの汎用部品 (Button, Input, Label, Select, Checkbox, Tabs, Dialog) |
| WASM 型 | `src/wasm/wasm_pkg.d.ts` で定義された TypeScript 型。Rust 側の構造体・列挙体から tsify で導出 |
| blur 確定方式 | フォーカスアウト時にバリデーション・Store 反映を行う入力方式 (design-system.md Section 10.4) |
| Generated IDs | Lingui のメッセージ ID 自動生成方式。ソースメッセージは日本語で記述 |

### 1.3 背景・問題

- Phase 2 の UI 部品 (Button, Input, Label, Select, Checkbox, Tabs, Dialog) は実装済み
- Phase 3 の機能実装に着手するには、WASM 型と対応するドメイン固有の入力部品が必要
- implementation-roadmap.md Section 4.2 で定義された 6 つのフォーム部品が未実装

### 1.4 期待効果

| 指標 | 現状 | 目標 |
|------|------|------|
| フォーム部品数 | 0 | 6 (IvRangeInput, DateRangePicker, TimeRangePicker, MacAddressInput, NatureSelect, HiddenPowerSelect) |
| WASM 型との型安全な接続 | なし | 各部品が対応する WASM 型を直接入出力 |
| i18n 対応 | なし | 全ラベル・プレースホルダーを `<Trans>` / `t` で翻訳対象化 |

### 1.5 着手条件

- [x] UI 部品 (Button, Input, Label, Select, Checkbox) 実装済み (`src/components/ui/`)
- [x] デザイントークン設定済み (`src/index.css`)
- [x] `cn()` ユーティリティ定義済み (`src/lib/utils.ts`)
- [x] Lingui i18n 基盤構築済み (`src/i18n/`)
- [x] Zustand Store 実装済み (`src/stores/settings/`)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/components/forms/iv-range-input.tsx` | 新規 | IV 範囲入力コンポーネント |
| `src/components/forms/date-range-picker.tsx` | 新規 | 日付範囲選択コンポーネント |
| `src/components/forms/time-range-picker.tsx` | 新規 | 時刻範囲選択コンポーネント |
| `src/components/forms/mac-address-input.tsx` | 新規 | MAC アドレス入力コンポーネント |
| `src/components/forms/nature-select.tsx` | 新規 | 性格選択コンポーネント |
| `src/components/forms/hidden-power-select.tsx` | 新規 | めざパタイプ選択コンポーネント |
| `src/components/forms/index.ts` | 新規 | re-export |
| `src/test/components/forms/iv-range-input.test.tsx` | 新規 | IvRangeInput テスト |
| `src/test/components/forms/date-range-picker.test.tsx` | 新規 | DateRangePicker テスト |
| `src/test/components/forms/time-range-picker.test.tsx` | 新規 | TimeRangePicker テスト |
| `src/test/components/forms/mac-address-input.test.tsx` | 新規 | MacAddressInput テスト |
| `src/test/components/forms/nature-select.test.tsx` | 新規 | NatureSelect テスト |
| `src/test/components/forms/hidden-power-select.test.tsx` | 新規 | HiddenPowerSelect テスト |

## 3. 設計方針

### 3.1 コンポーネント設計原則

| 原則 | 説明 |
|------|------|
| WASM 型直結 | 各部品の `value` / `onChange` が WASM の型と直接対応する。変換レイヤーを挟まない |
| blur 確定方式 | design-system.md Section 10.4 に従い、数値入力は blur 時にバリデーション・確定する |
| ローカル state 分離 | 入力中のテキスト値を `useState` で保持し、blur 時に外部の `onChange` を呼び出す |
| UI 部品の再利用 | `src/components/ui/` の Input, Label, Select, Checkbox を内部で使用する |
| i18n 対応 | ラベル・プレースホルダーは `<Trans>` / `useLingui` マクロで翻訳対象とする |
| アクセシビリティ | 各入力要素に適切な `aria-label` / `htmlFor` を設定する |

### 3.2 共通の入力挙動 (design-system.md Section 10.4 準拠)

| タイミング | 挙動 |
|-----------|------|
| フォーカスイン | テキスト全選択 (`e.target.select()`) |
| 入力中 | 空欄を許容。デフォルト値へのフォールバックを行わない |
| フォーカスアウト (blur) | 空欄 → デフォルト値に復元。範囲外 → クランプして確定。`onChange` を呼び出す |

### 3.3 コンパクト設計 (design-system.md Section 6.3 準拠)

| 要素 | Tailwind クラス |
|------|----------------|
| 入力フィールド高さ | `h-8` |
| ラベル | `text-sm font-medium` |
| 補足テキスト | `text-xs text-muted-foreground` |
| コンポーネント間ギャップ | `gap-2` |
| 数値表示 | `font-mono tabular-nums` |

### 3.4 Store への接続方針

フォーム部品自体は Store に直接依存しない。`value` と `onChange` を props で受け取る制御コンポーネントとして設計し、呼び出し側 (Phase 3 の feature コンポーネント) が Store との接続を担う。

これにより:
- フォーム部品の再利用性が高まる (異なる Store や state に対して使用可能)
- テストが容易 (Store のモックが不要)
- 責務が明確 (表示・入力・バリデーションのみ担当)

## 4. 実装仕様

### 4.1 IvRangeInput

6 ステータス (H, A, B, C, D, S) の IV 範囲を入力するコンポーネント。

#### 4.1.1 対応する WASM 型

```typescript
// IvFilter (src/wasm/wasm_pkg.d.ts)
interface IvFilter {
  hp: [number, number];   // [min, max]
  atk: [number, number];
  def: [number, number];
  spa: [number, number];
  spd: [number, number];
  spe: [number, number];
  hidden_power_types?: HiddenPowerType[] | undefined;
  hidden_power_min_power?: number | undefined;
}
```

`hidden_power_types` と `hidden_power_min_power` は HiddenPowerSelect が担当するため、本コンポーネントの scope 外とする。

#### 4.1.2 Props

```typescript
interface IvRangeInputProps {
  /** 現在の IV フィルタ値 (6 ステータスの min/max) */
  value: Pick<IvFilter, 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'>;
  /** 値変更コールバック */
  onChange: (value: Pick<IvFilter, 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'>) => void;
  /**
   * 「不明(任意)」トグルを表示するかどうか。
   * true の場合、各ステータス行に Checkbox を表示し、
   * ON にすると max=32 (IV_VALUE_UNKNOWN を含む任意) として扱う。
   * 孵化検索で親個体値が不明なケースを想定した機能。
   */
  allowUnknown?: boolean;
  /** 無効化 */
  disabled?: boolean;
}
```

#### 4.1.3 UI 構成

**通常モード (`allowUnknown` 未指定または `false`):**

6 行 × 3 列のグリッドレイアウト。各行は [ラベル, min 入力, max 入力] で構成。

```
  ラベル    min    max
┌────────┬──────┬──────┐
│  H     │ [  0]│ [ 31]│
│  A     │ [  0]│ [ 31]│
│  B     │ [  0]│ [ 31]│
│  C     │ [  0]│ [ 31]│
│  D     │ [  0]│ [ 31]│
│  S     │ [  0]│ [ 31]│
└────────┴──────┴──────┘
```

**不明(任意)モード (`allowUnknown={true}`):**

6 行 × 4 列のグリッドレイアウト。各行は [ラベル, min 入力, max 入力, 不明チェック] で構成。

```
  ラベル    min    max    不明(任意)
┌────────┬──────┬──────┬──────────┐
│  H     │ [  0]│ [ 31]│ [☐]      │
│  A     │ [  0]│ [ 31]│ [☐]      │
│  B     │ [  0]│ [ 31]│ [☐]      │
│  C     │ [  0]│ [ 31]│ [☐]      │
│  D     │ [  0]│ [ 31]│ [☐]      │
│  S     │ [  0]│ [ 31]│ [☐]      │
└────────┴──────┴──────┴──────────┘
```

不明(任意) チェックが ON の場合:
- 該当ステータスの range は `[0, 32]` に設定される (`IV_VALUE_UNKNOWN = 32` を含む)
- min/max の入力フィールドを disabled にし、プレースホルダーに `?` を表示する
- `IvFilter.matches()` は `max=32` のとき `IV_VALUE_UNKNOWN (32)` の値も通過させる (Rust 側の既存実装で対応済み)

#### 4.1.4 入力仕様

| 項目 | 値 |
|------|-----|
| 入力タイプ | `type="text"` (IME 制御のため `inputMode="numeric"` を併用) |
| 有効値範囲 | 0 - 31 |
| デフォルト値 | min: 0, max: 31 |
| 表示幅 | 各フィールド `w-14` (3.5rem) |
| フォーカスイン | テキスト全選択 |
| blur 時バリデーション | 空欄 → デフォルト値復元。範囲外 → クランプ。min > max → min を max に合わせる |
| IME | `inputMode="numeric"` でモバイルでは数値キーボードを表示 |

##### 不明(任意) チェックボックス (`allowUnknown={true}` 時のみ表示)

| 項目 | 値 |
|------|-----|
| ラベル | ja: `不明(任意)` / en: `Unknown(Any)` (`<Trans>` で翻訳) |
| ON 時の動作 | 該当ステータスの range を `[0, 32]` に変更し、min/max 入力を disabled 化。プレースホルダーに `?` を表示 |
| OFF 時の動作 | 通常の range `[min, max]` (0-31) に戻す。直前の手入力値を復元する |
| `IV_VALUE_UNKNOWN` | Rust 側で `pub const IV_VALUE_UNKNOWN: u8 = 32` として定義 (`wasm-pkg/src/types/pokemon.rs`)。`IvFilter.matches()` は max=32 のとき value=32 を通過させる (Rust 側変更不要) |

#### 4.1.5 ステータスラベル

ステータスラベルはロケールに応じた省略表記を使用する。性格名・タイプ名と同様にゲームデータ辞書 (`game-data-names.ts`) で管理し、`<Trans>` は使用しない。

| キー | ja | en |
|------|-----|-----|
| `hp` | H | HP |
| `atk` | A | Atk |
| `def` | B | Def |
| `spa` | C | SpA |
| `spd` | D | SpD |
| `spe` | S | Spe |

この規約は IvRangeInput に限らず、IV やステータスに関わる全コンポーネントで統一する。

#### 4.1.6 実装例

```tsx
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getStatLabel, IV_STAT_KEYS } from '@/components/forms/game-data-names';
import { useUiSettingsStore } from '@/stores/settings/ui';
import type { IvFilter } from '@/wasm/wasm_pkg';

type IvStatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';

const IV_MIN = 0;
const IV_MAX = 31;
const IV_MAX_WITH_UNKNOWN = 32; // IV_VALUE_UNKNOWN を含む

interface IvRangeInputProps {
  value: Pick<IvFilter, 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'>;
  onChange: (value: Pick<IvFilter, 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'>) => void;
  allowUnknown?: boolean;
  disabled?: boolean;
}

function IvRangeInput({ value, onChange, allowUnknown, disabled }: IvRangeInputProps) {
  const language = useUiSettingsStore((s) => s.language);
  const gridCols = allowUnknown
    ? 'grid-cols-[auto_1fr_1fr_auto]'
    : 'grid-cols-[auto_1fr_1fr]';

  return (
    <div className={cn('grid items-center gap-x-2 gap-y-1', gridCols)}>
      {IV_STAT_KEYS.map((key) => {
        const isUnknown = value[key][1] === IV_MAX_WITH_UNKNOWN;
        return (
          <IvStatRow
            key={key}
            label={getStatLabel(key, language)}
            min={value[key][0]}
            max={value[key][1]}
            disabled={disabled || isUnknown}
            onMinChange={(min) => {
              const clamped = Math.min(min, value[key][1]);
              onChange({ ...value, [key]: [clamped, value[key][1]] });
            }}
            onMaxChange={(max) => {
              const clamped = Math.max(max, value[key][0]);
              onChange({ ...value, [key]: [value[key][0], clamped] });
            }}
            showUnknown={allowUnknown}
            isUnknown={isUnknown}
            onUnknownChange={(checked) => {
              onChange({
                ...value,
                [key]: checked ? [IV_MIN, IV_MAX_WITH_UNKNOWN] : [IV_MIN, IV_MAX],
              });
            }}
          />
        );
      })}
    </div>
  );
}
```

内部の `IvStatRow` コンポーネントは各行の min/max 入力を管理。ローカル state で入力テキストを保持し、blur 時にバリデーション・コールバック呼び出しを行う。`showUnknown` が `true` の場合は Checkbox を追加描画し、`isUnknown` が `true` の場合は min/max 入力を disabled にしてプレースホルダーに `?` を表示する。

---

### 4.2 DateRangePicker

日付範囲 (開始日〜終了日) を入力するコンポーネント。

#### 4.2.1 対応する WASM 型

```typescript
// DateRangeParams (src/wasm/wasm_pkg.d.ts)
interface DateRangeParams {
  start_year: number;   // 2000-2099
  start_month: number;  // 1-12
  start_day: number;    // 1-31
  end_year: number;     // 2000-2099
  end_month: number;    // 1-12
  end_day: number;      // 1-31
}
```

#### 4.2.2 Props

```typescript
interface DateRangePickerProps {
  /** 現在の日付範囲 */
  value: DateRangeParams;
  /** 値変更コールバック */
  onChange: (value: DateRangeParams) => void;
  /** 無効化 */
  disabled?: boolean;
}
```

#### 4.2.3 UI 構成

開始日と終了日を横に並べるレイアウト。各日付は年・月・日の 3 フィールドで構成。

```
  開始日                        終了日
┌──────┬────┬────┐    ┌──────┬────┬────┐
│[2000]│[ 1]│[ 1]│ 〜 │[2099]│[12]│[31]│
│  年  │ 月 │ 日 │    │  年  │ 月 │ 日 │
└──────┴────┴────┘    └──────┴────┴────┘
```

モバイル (`< md`) ではラベル「開始日」「終了日」を上に配置し、縦積みにする。

#### 4.2.4 入力仕様

| フィールド | 有効値 | デフォルト値 | 表示幅 |
|-----------|--------|------------|--------|
| 年 | 2000 - 2099 | start: 2000, end: 2099 | `w-16` (4rem) |
| 月 | 1 - 12 | start: 1, end: 12 | `w-12` (3rem) |
| 日 | 1 - 31 | start: 1, end: 31 | `w-12` (3rem) |

共通:
- `inputMode="numeric"` 指定
- フォーカスイン: テキスト全選択
- blur 時: 空欄 → デフォルト値復元。範囲外 → クランプ
- 日の上限は月に応じた補正を行わない (WASM 側で処理するため)。ただし、明らかに無効な値 (0 以下、32 以上) はクランプする

#### 4.2.5 フィールド間セパレータ

年月日の間にはセパレータ `/` を表示する。開始日と終了日の間には `〜` を表示する。

```tsx
<span className="text-sm text-muted-foreground">/</span>
<span className="text-sm text-muted-foreground">〜</span>
```

---

### 4.3 TimeRangePicker

1 日内の時刻範囲 (時:分:秒) を入力するコンポーネント。

#### 4.3.1 対応する WASM 型

```typescript
// TimeRangeParams (src/wasm/wasm_pkg.d.ts)
interface TimeRangeParams {
  hour_start: number;    // 0-23
  hour_end: number;      // 0-23
  minute_start: number;  // 0-59
  minute_end: number;    // 0-59
  second_start: number;  // 0-59
  second_end: number;    // 0-59
}
```

#### 4.3.2 Props

```typescript
interface TimeRangePickerProps {
  /** 現在の時刻範囲 */
  value: TimeRangeParams;
  /** 値変更コールバック */
  onChange: (value: TimeRangeParams) => void;
  /** 無効化 */
  disabled?: boolean;
}
```

#### 4.3.3 UI 構成

**時・分・秒はそれぞれ独立した範囲を持つ。** 検索対象は 3 軸の直積 (`hour_start〜hour_end × minute_start〜minute_end × second_start〜second_end`) で展開される。連続する時刻区間 (`HH:MM:SS 〜 HH:MM:SS`) ではない。

例: `時: 10〜12, 分: 20〜40, 秒: 0〜59` の場合、列挙される時刻は:
```
10:20:00, 10:20:01, ..., 10:20:59,
10:21:00, ..., 10:40:59,
11:20:00, ..., 11:40:59,
12:20:00, ..., 12:40:59
```
※ 10:41:00 や 11:00:00 は含まない (分の範囲 20〜40 の外)

このため、時・分・秒それぞれに開始・終了の 2 フィールドを持つ。

```
  時                   分                   秒
┌────┐ 〜 ┌────┐  ┌────┐ 〜 ┌────┐  ┌────┐ 〜 ┌────┐
│[ 0]│   │[23]│  │[ 0]│   │[59]│  │[ 0]│   │[59]│
└────┘   └────┘  └────┘   └────┘  └────┘   └────┘
```

モバイル (`< md`) では縦積み。

#### 4.3.4 入力仕様

| フィールド | 有効値 | デフォルト値 (開始) | デフォルト値 (終了) | 表示幅 |
|-----------|--------|-------------------|-------------------|--------|
| 時 | 0 - 23 | 0 | 23 | `w-12` (3rem) |
| 分 | 0 - 59 | 0 | 59 | `w-12` (3rem) |
| 秒 | 0 - 59 | 0 | 59 | `w-12` (3rem) |

時・分・秒それぞれが独立した start/end を持つ。WASM 型 `TimeRangeParams` の 6 フィールドと 1:1 で対応する。

共通:
- `inputMode="numeric"` 指定
- フォーカスイン: テキスト全選択
- blur 時: 空欄 → デフォルト値復元。範囲外 → クランプ

#### 4.3.5 フィールド間セパレータ

各軸 (時・分・秒) の start と end の間には `〜` を表示する。軸間の区切りには `:` を表示する。

```tsx
{/* 例: 時の範囲 */}
<span>時</span> [start] <span>〜</span> [end]
<span>:</span>
<span>分</span> [start] <span>〜</span> [end]
<span>:</span>
<span>秒</span> [start] <span>〜</span> [end]
```

#### 4.3.6 WASM 側の既知不整合

調査の結果、本プロジェクトの WASM 実装内で TimeRange の解釈に**不整合**が存在する。

| 実装箇所 | ファイル | 方式 | 正否 |
|---------|--------|------|------|
| GPU シェーダ | `wasm-pkg/src/gpu/datetime_search/shader.wgsl` | 独立軸の直積 (正しい) | OK |
| CPU テーブル構築 | `wasm-pkg/src/datetime_search/base.rs` `build_ranged_time_code_table()` | **連続区間** (`HH:MM:SS ~ HH:MM:SS`) | **BUG** |
| 有効秒数計算 | `wasm-pkg/src/types/search.rs` `count_valid_seconds()` | **連続区間** (`end_seconds - start_seconds + 1`) | **BUG** |

**CPU 側バグの詳細**: `build_ranged_time_code_table()` は hour の境界で minute/second の start/end を調整する実装になっている。例えば `hour=10, minute_start=20` のとき、`hour=11` では `minute_start=0` からイテレーションを開始する。これは連続区間の挙動であり、独立軸の直積 (全 hour で `minute_start=20` から開始すべき) とは異なる。

**`count_valid_seconds()` のバグ**: 正しい計算は `(hour_end - hour_start + 1) * (minute_end - minute_start + 1) * (second_end - second_start + 1)` だが、現実装は `(hour_end*3600 + minute_end*60 + second_end) - (hour_start*3600 + minute_start*60 + second_start) + 1` で連続区間の長さを返している。

**参考実装 (niart120/pokemon-gen5-initseed)** では `combosPerDay = hourRange.count * minuteRange.count * secondRange.count` として独立軸の直積を採用しており、そちらが正しい挙動。

**対応**: 本仕様書のスコープ外。別途 Rust 側修正の仕様書を作成して対応する必要がある。

---

### 4.4 MacAddressInput

DS 本体の MAC アドレスを入力するコンポーネント。

#### 4.4.1 対応する WASM 型

```typescript
// DsConfig.mac (src/wasm/wasm_pkg.d.ts)
interface DsConfig {
  mac: [number, number, number, number, number, number];
  // ...
}
```

各要素は 0-255 (1 バイト) の数値。表示は 16 進数 2 桁。

#### 4.4.2 Props

```typescript
interface MacAddressInputProps {
  /** 現在の MAC アドレス (6 バイト配列) */
  value: [number, number, number, number, number, number];
  /** 値変更コールバック */
  onChange: (value: [number, number, number, number, number, number]) => void;
  /** 無効化 */
  disabled?: boolean;
}
```

#### 4.4.3 UI 構成

6 つの 16 進数入力フィールドを `-` で区切って横並び。入力幅は最大 2 桁 (16 進数) のため、フィールド幅とギャップを最小限に押さえたコンパクトなレイアウトとする。

```
┌──┐-┌──┐-┌──┐-┌──┐-┌──┐-┌──┐
│00│ │00│ │00│ │00│ │00│ │00│
└──┘ └──┘ └──┘ └──┘ └──┘ └──┘
```

#### 4.4.4 入力仕様

| 項目 | 値 |
|------|-----|
| 入力タイプ | `type="text"` |
| 有効値 | 16 進数 00 - FF (大文字・小文字許容、表示は大文字) |
| デフォルト値 | 00 |
| 表示幅 | 各フィールド `w-10` (2.5rem)。`px-1` でパディングも最小化 |
| フィールド間ギャップ | `gap-1` (0.25rem)。セパレータ `-` の余白も最小限 |
| 最大文字数 | 2 (`maxLength={2}`) |
| フォーカスイン | テキスト全選択 |
| 入力フィルタ | 16 進数文字 (0-9, a-f, A-F) のみ許容 |
| blur 時 | 空欄 → `00`。無効な 16 進数 → `00`。1 桁 → 0 パディング (`"A"` → `"0A"`)。大文字に正規化 |
| 自動タブ移動 | 2 文字入力完了時に次のフィールドへ自動フォーカス移動 |

#### 4.4.5 表示形式

```tsx
<span className="font-mono tabular-nums uppercase">
  {byte.toString(16).padStart(2, '0').toUpperCase()}
</span>
```

#### 4.4.6 ペースト対応

MAC アドレスのペースト (`XX-XX-XX-XX-XX-XX` / `XX:XX:XX:XX:XX:XX` / `XXXXXXXXXXXX`) を検出し、6 フィールドに分配する。

```typescript
function parseMacAddress(input: string): [number, number, number, number, number, number] | null {
  const cleaned = input.replace(/[-:]/g, '');
  if (!/^[0-9a-fA-F]{12}$/.test(cleaned)) return null;
  return [
    parseInt(cleaned.slice(0, 2), 16),
    parseInt(cleaned.slice(2, 4), 16),
    parseInt(cleaned.slice(4, 6), 16),
    parseInt(cleaned.slice(6, 8), 16),
    parseInt(cleaned.slice(8, 10), 16),
    parseInt(cleaned.slice(10, 12), 16),
  ];
}
```

---

### 4.5 NatureSelect

ポケモンの性格を複数選択するコンポーネント。

#### 4.5.1 対応する WASM 型

```typescript
// Nature (src/wasm/wasm_pkg.d.ts)
type Nature =
  | 'Hardy' | 'Lonely' | 'Brave' | 'Adamant' | 'Naughty'
  | 'Bold' | 'Docile' | 'Relaxed' | 'Impish' | 'Lax'
  | 'Timid' | 'Hasty' | 'Serious' | 'Jolly' | 'Naive'
  | 'Modest' | 'Mild' | 'Quiet' | 'Bashful' | 'Rash'
  | 'Calm' | 'Gentle' | 'Sassy' | 'Careful' | 'Quirky';

// CoreDataFilter.natures (検索フィルタでの使用)
interface CoreDataFilter {
  natures: Nature[] | undefined;
  // ...
}
```

#### 4.5.2 Props

```typescript
interface NatureSelectProps {
  /** 選択中の性格リスト (空配列 = 条件なし) */
  value: Nature[];
  /** 値変更コールバック */
  onChange: (value: Nature[]) => void;
  /** 無効化 */
  disabled?: boolean;
}
```

#### 4.5.3 UI 構成

5×5 のチェックボックスグリッドを Popover 内に表示する。トリガーボタンに選択数を表示する。

**トリガー表示:**

```
┌─────────────────────────────────┐
│  性格 (3件選択中)            ▼  │
└─────────────────────────────────┘
```

選択数が 0 の場合は「指定なし」と表示する。

**Popover 内 (展開時):**

```
┌─────────────────────────────────────────┐
│ [全選択] [全解除]                         │
├─────────────────────────────────────────┤
│        無補正  ↑A    ↑B    ↑C    ↑D    ↑S │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ 無補正 [☑] がん [☐] さみ [☐] ゆう ...    │
│ ↓A    [☐] ずぶ [☐] すな [☐] のん ...    │
│ ↓B    [☐] おく [☐] せっ [☐] まじ ...    │
│ ↓C    [☐] ひか [☐] おっ [☐] れい ...    │
│ ↓D    [☐] おだ [☐] おと [☐] なま ...    │
│ ↓S    — (5行目は無し、Quirky で終了)      │
└─────────────────────────────────────────┘
```

性格の配列は 5×5 のマトリクスとして表示する。行は「ステータスが下がる性格」、列は「ステータスが上がる性格」に対応する。対角線上は無補正性格。

#### 4.5.4 性格データ定義

性格名はロケール依存 (ja/en)。Rust 側の `NATURE_NAMES_JA` / `NATURE_NAMES_EN` と同一の表示名をフロントエンドで定義する。

```typescript
const NATURE_NAMES_JA: Record<Nature, string> = {
  Hardy: 'がんばりや', Lonely: 'さみしがり', Brave: 'ゆうかん',
  Adamant: 'いじっぱり', Naughty: 'やんちゃ', Bold: 'ずぶとい',
  Docile: 'すなお', Relaxed: 'のんき', Impish: 'わんぱく',
  Lax: 'のうてんき', Timid: 'おくびょう', Hasty: 'せっかち',
  Serious: 'まじめ', Jolly: 'ようき', Naive: 'むじゃき',
  Modest: 'ひかえめ', Mild: 'おっとり', Quiet: 'れいせい',
  Bashful: 'てれや', Rash: 'うっかりや', Calm: 'おだやか',
  Gentle: 'おとなしい', Sassy: 'なまいき', Careful: 'しんちょう',
  Quirky: 'きまぐれ',
};

const NATURE_NAMES_EN: Record<Nature, string> = {
  Hardy: 'Hardy', Lonely: 'Lonely', Brave: 'Brave',
  // ...enum のバリアント名と同一
};
```

表示名は `i18n.locale` の値で切り替える。性格名自体は固定テキストのため `<Trans>` は使用せず、ロケールに応じた辞書を参照する。

#### 4.5.5 マトリクス配置順

性格は Nature enum のインデックス順 (0-24) で並ぶ。5×5 マトリクスの配置:

| | 列0 (↑Atk) | 列1 (↑Def) | 列2 (↑SpA) | 列3 (↑SpD) | 列4 (↑Spe) |
|---|---|---|---|---|---|
| **行0 (↓Atk)** | Hardy(0) | Lonely(1) | Brave(2) | Adamant(3) | Naughty(4) |
| **行1 (↓Def)** | Bold(5) | Docile(6) | Relaxed(7) | Impish(8) | Lax(9) |
| **行2 (↓SpA)** | Timid(10) | Hasty(11) | Serious(12) | Jolly(13) | Naive(14) |
| **行3 (↓SpD)** | Modest(15) | Mild(16) | Quiet(17) | Bashful(18) | Rash(19) |
| **行4 (↓Spe)** | Calm(20) | Gentle(21) | Sassy(22) | Careful(23) | Quirky(24) |

対角線 (Hardy, Docile, Serious, Bashful, Quirky) は能力補正なしの性格。

#### 4.5.6 Popover 実装

Popover は Radix UI の `@radix-ui/react-popover` を使用する。Phase 2 の UI 部品に Popover は含まれていないため、本タスクの依存パッケージとして追加する。

```bash
pnpm add @radix-ui/react-popover
```

---

### 4.6 HiddenPowerSelect

めざめるパワーのタイプを複数選択するコンポーネント。

#### 4.6.1 対応する WASM 型

```typescript
// HiddenPowerType (src/wasm/wasm_pkg.d.ts)
type HiddenPowerType =
  | 'Fighting' | 'Flying' | 'Poison' | 'Ground'
  | 'Rock' | 'Bug' | 'Ghost' | 'Steel'
  | 'Fire' | 'Water' | 'Grass' | 'Electric'
  | 'Psychic' | 'Ice' | 'Dragon' | 'Dark';

// IvFilter.hidden_power_types (フィルタでの使用)
interface IvFilter {
  hidden_power_types?: HiddenPowerType[] | undefined;
  // ...
}
```

#### 4.6.2 Props

```typescript
interface HiddenPowerSelectProps {
  /** 選択中のめざパタイプリスト (空配列 = 条件なし) */
  value: HiddenPowerType[];
  /** 値変更コールバック */
  onChange: (value: HiddenPowerType[]) => void;
  /** 無効化 */
  disabled?: boolean;
}
```

#### 4.6.3 UI 構成

トリガーボタン + Popover 内のチェックボックスリスト。

**トリガー表示:**

```
┌─────────────────────────────────┐
│  めざパ (2件選択中)          ▼  │
└─────────────────────────────────┘
```

選択数が 0 の場合は「指定なし」と表示する。

**Popover 内 (展開時):**

チェックボックスを 4 列 × 4 行のグリッドで表示する。

```
┌───────────────────────────────────────────────┐
│ [全選択] [全解除]                               │
├───────────────────────────────────────────────┤
│ [☐] かくとう  [☐] ひこう  [☐] どく    [☐] じめん │
│ [☐] いわ      [☐] むし    [☐] ゴースト [☐] はがね │
│ [☐] ほのお    [☐] みず    [☐] くさ     [☐] でんき │
│ [☐] エスパー  [☐] こおり  [☐] ドラゴン  [☐] あく  │
└───────────────────────────────────────────────┘
```

#### 4.6.4 タイプデータ定義

タイプ名はロケール依存 (ja/en)。Rust 側の `format_hidden_power_type` と同一の表示名を使用する。

```typescript
const HIDDEN_POWER_NAMES_JA: Record<HiddenPowerType, string> = {
  Fighting: 'かくとう', Flying: 'ひこう', Poison: 'どく',
  Ground: 'じめん', Rock: 'いわ', Bug: 'むし',
  Ghost: 'ゴースト', Steel: 'はがね', Fire: 'ほのお',
  Water: 'みず', Grass: 'くさ', Electric: 'でんき',
  Psychic: 'エスパー', Ice: 'こおり', Dragon: 'ドラゴン',
  Dark: 'あく',
};

const HIDDEN_POWER_NAMES_EN: Record<HiddenPowerType, string> = {
  Fighting: 'Fighting', Flying: 'Flying', Poison: 'Poison',
  Ground: 'Ground', Rock: 'Rock', Bug: 'Bug',
  Ghost: 'Ghost', Steel: 'Steel', Fire: 'Fire',
  Water: 'Water', Grass: 'Grass', Electric: 'Electric',
  Psychic: 'Psychic', Ice: 'Ice', Dragon: 'Dragon',
  Dark: 'Dark',
};
```

表示名は `i18n.locale` の値で切り替える。

#### 4.6.5 配列順

`HiddenPowerType` enum のインデックス順 (Fighting=0 〜 Dark=15) で 4×4 グリッドに配置する。

---

## 5. 共通ユーティリティ

### 5.1 数値入力ヘルパー

フォーム部品の blur 確定ロジックを共通化する。

```typescript
// src/components/forms/utils.ts

/** 数値入力の blur 時バリデーション */
function clampOrDefault(raw: string, options: {
  defaultValue: number;
  min: number;
  max: number;
}): number {
  const trimmed = raw.trim();
  if (trimmed === '') return options.defaultValue;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) return options.defaultValue;
  return Math.min(Math.max(Math.round(parsed), options.min), options.max);
}

/** フォーカスイン時のテキスト全選択 */
function handleFocusSelectAll(e: React.FocusEvent<HTMLInputElement>): void {
  e.target.select();
}
```

### 5.2 16 進数入力ヘルパー

MacAddressInput 用の 16 進数バリデーション。

```typescript
/** 16 進数文字列の blur 時バリデーション */
function parseHexByte(raw: string, defaultValue: number = 0): number {
  const trimmed = raw.trim();
  if (trimmed === '') return defaultValue;
  if (!/^[0-9a-fA-F]{1,2}$/.test(trimmed)) return defaultValue;
  return parseInt(trimmed, 16);
}

/** 数値を 16 進数 2 桁文字列に変換 */
function toHexString(value: number): string {
  return value.toString(16).padStart(2, '0').toUpperCase();
}
```

### 5.3 ゲームデータ名称辞書

NatureSelect / HiddenPowerSelect / IvRangeInput で使用するロケール依存の名称辞書を共通定義する。

```typescript
// src/components/forms/game-data-names.ts
import type { Nature, HiddenPowerType } from '@/wasm/wasm_pkg';
import type { SupportedLocale } from '@/i18n';

type IvStatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';

const IV_STAT_KEYS: IvStatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

/** ステータス省略ラベル (ja: H,A,B,C,D,S / en: HP,Atk,Def,SpA,SpD,Spe) */
function getStatLabel(stat: IvStatKey, locale: SupportedLocale): string;
function getNatureName(nature: Nature, locale: SupportedLocale): string;
function getHiddenPowerName(type: HiddenPowerType, locale: SupportedLocale): string;
```

#### ステータスラベル辞書

| stat key | ja | en |
|----------|-----|-----|
| `hp` | H | HP |
| `atk` | A | Atk |
| `def` | B | Def |
| `spa` | C | SpA |
| `spd` | D | SpD |
| `spe` | S | Spe |

辞書データは Rust 側の `NATURE_NAMES_JA` / `NATURE_NAMES_EN` および `format_hidden_power_type` と**同一の内容**を保持する。不整合を防ぐためテストで検証する (Section 6 参照)。

### 5.4 re-export

```typescript
// src/components/forms/index.ts
export { IvRangeInput } from './iv-range-input';
export type { IvRangeInputProps } from './iv-range-input';
export { DateRangePicker } from './date-range-picker';
export type { DateRangePickerProps } from './date-range-picker';
export { TimeRangePicker } from './time-range-picker';
export type { TimeRangePickerProps } from './time-range-picker';
export { MacAddressInput } from './mac-address-input';
export type { MacAddressInputProps } from './mac-address-input';
export { NatureSelect } from './nature-select';
export type { NatureSelectProps } from './nature-select';
export { HiddenPowerSelect } from './hidden-power-select';
export type { HiddenPowerSelectProps } from './hidden-power-select';
```

## 6. テスト方針

### 6.1 テスト環境

| 分類 | 実行環境 | 理由 |
|------|---------|------|
| コンポーネントテスト | jsdom (Vitest) | DOM 操作・イベントのテスト。WASM 不要 |

### 6.2 テスト対象

#### IvRangeInput

| テストケース | 検証内容 |
|-------------|---------|
| 初期値の表示 | 各ステータスの min/max が正しく表示される |
| 値変更 | min フィールドの入力 → blur → onChange が呼ばれ正しい値が渡る |
| 空欄 → デフォルト値 | blur 時に空欄がデフォルト値 (min: 0, max: 31) に復元される |
| 範囲外クランプ | 32 入力 → 31 にクランプ、-1 入力 → 0 にクランプ |
| min > max 補正 | min に max より大きい値が入力された場合の補正動作 |
| disabled 状態 | 全フィールドが無効化される |
| フォーカスイン全選択 | フォーカス時にテキストが全選択される || ステータスラベル (ja) | H, A, B, C, D, S が表示される |
| ステータスラベル (en) | HP, Atk, Def, SpA, SpD, Spe が表示される |
| 不明チェック非表示 | `allowUnknown` 未指定時に不明チェックボックスが表示されない |
| 不明チェック表示 | `allowUnknown={true}` 時に各行に不明チェックボックスが表示される |
| 不明 ON → range 変化 | チェック ON で onChange に `[0, 32]` が渡る |
| 不明 ON → 入力 disabled | チェック ON で min/max フィールドが無効化される |
| 不明 OFF → range 復元 | チェック OFF で range が `[0, 31]` に戻る |
#### DateRangePicker

| テストケース | 検証内容 |
|-------------|---------|
| 初期値の表示 | 年/月/日が正しく表示される |
| 年の範囲制限 | 1999 → 2000 にクランプ。2100 → 2099 にクランプ |
| 月の範囲制限 | 0 → 1、13 → 12 にクランプ |
| 日の範囲制限 | 0 → 1、32 → 31 にクランプ |
| 値変更コールバック | 各フィールドの変更が正しく反映される |

#### TimeRangePicker

| テストケース | 検証内容 |
|-------------|---------|
| 初期値の表示 | 時/分/秒の各 start/end が正しく表示される |
| 時の範囲制限 | -1 → 0、24 → 23 にクランプ |
| 分の範囲制限 | -1 → 0、60 → 59 にクランプ |
| 秒の範囲制限 | -1 → 0、60 → 59 にクランプ |
| 独立範囲の確認 | 時・分・秒それぞれに独立した start/end が設定できる |
| onChange の値 | 6 フィールド (hour_start, hour_end, minute_start, minute_end, second_start, second_end) が正しく渡る |
#### MacAddressInput

| テストケース | 検証内容 |
|-------------|---------|
| 初期値の表示 | 16 進数 2 桁で表示される |
| 16 進数入力 | `"FF"` → 255 として解釈 |
| 無効文字の処理 | `"GG"` → デフォルト値 (0) に復元 |
| ペースト: ハイフン区切り | `"00-1A-2B-3C-4D-5E"` → 6 フィールドに分配 |
| ペースト: コロン区切り | `"00:1A:2B:3C:4D:5E"` → 6 フィールドに分配 |
| ペースト: 連続 | `"001A2B3C4D5E"` → 6 フィールドに分配 |
| 自動タブ移動 | 2 文字入力で次フィールドへ移動 |
| 1 桁入力の 0 パディング | `"A"` → `"0A"` |

#### NatureSelect

| テストケース | 検証内容 |
|-------------|---------|
| 初期表示 | 選択数が表示される |
| 単一選択 | チェックボックスのトグルで onChange が呼ばれる |
| 全選択 | 「全選択」ボタンで 25 件選択 |
| 全解除 | 「全解除」ボタンで 0 件 |
| ロケール切替 | ja/en で性格名が切り替わる |

#### HiddenPowerSelect

| テストケース | 検証内容 |
|-------------|---------|
| 初期表示 | 選択数が表示される |
| 単一選択 | チェックボックスのトグルで onChange が呼ばれる |
| 全選択 / 全解除 | 16 件 / 0 件 |
| ロケール切替 | ja/en でタイプ名が切り替わる |

### 6.3 テストユーティリティ

テスト環境では i18n のセットアップに `src/test/helpers/i18n.tsx` (i18n-design.md Section 9.1 参照) を使用し、ソースメッセージ (日本語) でアサーションする。

## 7. 依存パッケージ

| パッケージ | 種別 | 用途 | 状態 |
|-----------|------|------|------|
| `@radix-ui/react-popover` | dependencies | NatureSelect / HiddenPowerSelect の Popover | **新規追加** |

既存の依存パッケージ (Radix UI, cva, lucide-react, Lingui 等) は Phase 1 / UI 部品タスクで導入済み。

## 8. 実装チェックリスト

- [ ] `@radix-ui/react-popover` パッケージ追加
- [ ] `src/components/forms/utils.ts` 共通ヘルパー作成
- [ ] `src/components/forms/game-data-names.ts` ゲームデータ名称辞書作成
- [ ] `src/components/forms/iv-range-input.tsx` 実装
- [ ] `src/components/forms/date-range-picker.tsx` 実装
- [ ] `src/components/forms/time-range-picker.tsx` 実装
- [ ] `src/components/forms/mac-address-input.tsx` 実装
- [ ] `src/components/forms/nature-select.tsx` 実装
- [ ] `src/components/forms/hidden-power-select.tsx` 実装
- [ ] `src/components/forms/index.ts` re-export 作成
- [ ] `src/test/components/forms/iv-range-input.test.tsx` テスト作成
- [ ] `src/test/components/forms/date-range-picker.test.tsx` テスト作成
- [ ] `src/test/components/forms/time-range-picker.test.tsx` テスト作成
- [ ] `src/test/components/forms/mac-address-input.test.tsx` テスト作成
- [ ] `src/test/components/forms/nature-select.test.tsx` テスト作成
- [ ] `src/test/components/forms/hidden-power-select.test.tsx` テスト作成
- [ ] 翻訳カタログ更新 (`lingui extract`)
- [ ] 型チェック通過 (`pnpm exec tsc --noEmit`)
- [ ] テスト通過 (`pnpm test:run`)
- [ ] Lint 通過 (`pnpm lint`)
