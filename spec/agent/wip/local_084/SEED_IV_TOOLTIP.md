# Seed IV Tooltip 仕様書

## 1. 概要

### 1.1 目的

LCG Seed / MT Seed の表示箇所にホバーツールチップを追加し、そのシードから生成される個体値 (IV) スプレッドを即時確認できるようにする。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| LCG Seed | 64bit SHA-1 派生シード (`LcgSeed = bigint`) |
| MT Seed | 32bit MT19937 初期化シード (`MtSeed = number`) |
| MT Offset | IV 生成開始までの MT19937 消費数。バージョン・エンカウント種別に依存 |
| IV Spread | 6 ステータス (H/A/B/C/D/S) の個体値。MT19937 出力の上位 5bit (`value >>> 27`) |
| Compact Pattern | IV 値を 0-9, A-V の 1 文字で表現した 6 文字列 (0→`0`, 31→`V`) |
| Roamer | BW の徘徊ポケモン。IV 読み取り順が `H/A/B/S/C/D` に変更される |

### 1.3 背景・問題

- 検索結果の Seed 値だけでは、実際にどの IV が生成されるか直感的に分からない
- 特に MT Seed 検索 → 起動時刻検索のフローで、MT Seed の「質」を素早く判断したい
- リファレンス実装 (niart120/pokemon-gen5-initseed) にも同等機能が存在する

### 1.4 期待効果

| 指標 | 内容 |
|------|------|
| 操作効率 | Seed 値ホバーだけで IV を確認でき、詳細ダイアログを開く必要が減る |
| 判断精度 | バージョン別のオフセットに応じた IV を一覧表示し、使用可否を即時判断可能 |

### 1.5 着手条件

- `@radix-ui/react-tooltip` のインストール
- WASM 側に IV 計算関数の追加 (ビルド可能な環境)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/generation/algorithm/mod.rs` | 修正 | `generate_rng_ivs_with_offset` の可視性を `pub(crate)` → `pub` に変更 |
| `wasm-pkg/src/lib.rs` | 修正 | 既存内部関数の薄いラッパーを `#[wasm_bindgen]` 付きで追加 |
| `src/wasm/wasm_pkg.d.ts` | 自動生成 | 新関数の型定義追加 |
| `src/components/ui/tooltip.tsx` | 新規 | Radix UI Tooltip の shadcn/ui スタイルラッパー |
| `src/components/data-display/seed-iv-tooltip.tsx` | 新規 | Seed IV ツールチップ表示コンポーネント |
| `src/lib/iv-tooltip.ts` | 新規 | IV ツールチップのコンテキスト定義・フォーマット関数 |
| `src/features/mtseed-search/components/mtseed-result-columns.tsx` | 修正 | MT Seed セルにツールチップ追加 |
| `src/features/datetime-search/components/seed-origin-columns.tsx` | 修正 | Base Seed / MT Seed セルにツールチップ追加 |
| `src/features/pokemon-list/components/pokemon-result-columns.tsx` | 修正 | (seed 列があれば) ツールチップ追加 |
| `src/features/pokemon-list/components/result-detail-dialog.tsx` | 修正 | ツールチップ追加 + IV フォーマットを `getStatLabel` ベースに統一 |
| `src/features/egg-list/components/result-detail-dialog.tsx` | 修正 | 同上 |
| `src/components/forms/seed-input-section.tsx` | 修正 | manual-seeds 入力欄の解決済みシードにツールチップ追加 |
| `src/i18n/locales/ja/messages.po` | 修正 | 翻訳キー追加 |
| `src/i18n/locales/en/messages.po` | 修正 | 翻訳キー追加 |
| `src/test/unit/iv-tooltip.test.ts` | 新規 | IV フォーマット・コンテキスト選択のユニットテスト |
| `src/test/integration/iv-tooltip-wasm.test.ts` | 新規 | WASM `compute_iv_spread` の統合テスト |
| `src/test/components/seed-iv-tooltip.test.tsx` | 新規 | ツールチップコンポーネントの描画テスト |

## 3. 設計方針

### 3.1 入出力

#### WASM 関数: `compute_iv_spread` (既存内部関数のラッパー)

`generation::algorithm::iv::generate_rng_ivs_with_offset` が既に実装済み (`pub(crate)`)。
この関数を `lib.rs` で `#[wasm_bindgen]` 付きラッパーとしてエクスポートする。

```
既存関数シグネチャ:
  generate_rng_ivs_with_offset(seed: MtSeed, offset: u32, is_roamer: bool) -> Ivs

エクスポート名:
  compute_iv_spread(mt_seed: MtSeed, mt_offset: u32, is_roamer: bool) -> Ivs

入力:
  mt_seed: MtSeed (u32)   — MT19937 初期化シード
  mt_offset: u32          — IV 生成開始までの消費数 (0, 1, 2, 7)
  is_roamer: bool         — 徘徊ポケモンの IV 読み取り順を使うか

出力:
  Ivs { hp: u8, atk: u8, def: u8, spa: u8, spd: u8, spe: u8 }
```

既存関数の内部処理 (変更なし):
1. `Mt19937::new(seed)` で初期化
2. offset 回 `mt.next_u32()` を消費
3. `mt.next_u32() >> 27` を 6 回読み取り、IV を生成
4. 通常順: H/A/B/C/D/S、徘徊順: H/A/B/S/C/D (`reorder_for_roamer` で並び替え)

#### WASM 関数: `lcg_seed_to_mt_seed` (既存メソッドのラッパー)

`LcgSeed::derive_mt_seed()` が `core/lcg.rs` に実装済み。
TS 側で LCG Seed のツールチップを表示する際、まず MT Seed に変換してから `compute_iv_spread` を呼ぶ必要がある。

```
既存メソッド:
  LcgSeed::derive_mt_seed(&self) -> MtSeed

エクスポート名:
  lcg_seed_to_mt_seed(seed: LcgSeed) -> MtSeed
```

### 3.2 表示コンテキスト

バージョンとエンカウント種別に応じて表示内容を切り替える。

| コンテキスト | MT Offset | Roamer | 表示条件 |
|-------------|-----------|--------|----------|
| BW 固定・野生 (消費0) | 0 | false | Version が BW 系 |
| BW 徘徊 (消費1) | 1 | true | Version が BW 系 |
| BW2 固定・野生 (消費2) | 2 | false | Version が BW2 系 |
| タマゴ (消費7) | 7 | false | タマゴ関連機能 (egg-list, egg-search) |

表示ルール:
- 通常の機能 (pokemon-list, mtseed-search, datetime-search): バージョンに応じて BW or BW2 のコンテキストのみ表示
- タマゴ機能 (egg-list): バージョン別コンテキスト + タマゴコンテキスト (消費7) を追加表示
- Seed 入力フォーム: 現在選択中のバージョンに基づくコンテキスト表示

### 3.3 ツールチップ表示内容

各コンテキストにつき以下 3 行を表示:

```
BW 固定・野生 (消費0)           ← ラベル (i18n 対応)
H:31 A:31 B:31 C:31 D:31 S:31  ← IV Spread (ラベル付き, i18n 対応)
31-0-31-30-31-30                ← Compact Pattern (ハイフン区切り数値)
```

### 3.4 レイヤー構成

```
UI (Tooltip Component)
  └─ src/components/data-display/seed-iv-tooltip.tsx
       ├─ src/lib/iv-tooltip.ts (コンテキスト選択 + フォーマット)
       └─ WASM: compute_iv_spread() (IV 計算)
           └─ wasm-pkg/src/core/mt/scalar.rs
```

各 feature の列定義・詳細ダイアログは `SeedIvTooltip` コンポーネントで seed 値をラップするだけ。IV 計算ロジックは feature 側に持ち込まない。

### 3.5 パフォーマンス考慮

- DataTable のセルで WASM 関数を呼ぶため、ツールチップ表示時 (ホバー時) にのみ `compute_iv_spread` を呼び出す (遅延計算)
- MT19937 の初期化 + 数回の消費は数μs 程度であり、ホバー時の遅延は体感不能
- 列全体の事前計算やメモ化は不要 (テーブルの仮想スクロールにより表示行数は限定的)

## 4. 実装仕様

### 4.1 WASM ラッパー関数 (`wasm-pkg/src/lib.rs` に追加)

既存の `lib.rs` は `get_species_name`, `resolve_pokemon_data_batch` 等を
同パターンでエクスポートしている。それに倣い薄いラッパーを追加する。

```rust
use crate::generation::algorithm::iv::generate_rng_ivs_with_offset;

/// MT Seed と消費数から IV スプレッドを計算する。
///
/// 既存内部関数 `generate_rng_ivs_with_offset` の wasm-bindgen エクスポート。
///
/// # Arguments
/// * `mt_seed` - MT19937 初期化シード
/// * `mt_offset` - IV 生成開始までの消費数 (0, 1, 2, 7)
/// * `is_roamer` - true の場合 IV 読み取り順が H/A/B/S/C/D になる (BW 徘徊)
#[wasm_bindgen]
pub fn compute_iv_spread(mt_seed: MtSeed, mt_offset: u32, is_roamer: bool) -> Ivs {
    generate_rng_ivs_with_offset(mt_seed, mt_offset, is_roamer)
}

/// LCG Seed から MT Seed を導出する。
///
/// 既存メソッド `LcgSeed::derive_mt_seed()` の wasm-bindgen エクスポート。
#[wasm_bindgen]
pub fn lcg_seed_to_mt_seed(seed: LcgSeed) -> MtSeed {
    seed.derive_mt_seed()
}
```

`generate_rng_ivs_with_offset` の可視性変更が必要:

```rust
// wasm-pkg/src/generation/algorithm/mod.rs
// 変更前: pub(crate) use iv::{apply_inheritance, generate_rng_ivs_with_offset};
// 変更後:
pub use iv::generate_rng_ivs_with_offset;
pub(crate) use iv::apply_inheritance;
```

### 4.2 TypeScript: IV ツールチップユーティリティ

```typescript
// src/lib/iv-tooltip.ts

import type { RomVersion, Ivs } from '@/wasm/wasm_pkg.js';

/** IV ツールチップの表示コンテキスト */
export interface IvTooltipContext {
  /** i18n メッセージ ID に対応するキー */
  labelKey: IvTooltipLabelKey;
  /** MT19937 消費数 */
  mtOffset: number;
  /** 徘徊ポケモンの IV 読み取り順を使うか */
  isRoamer: boolean;
}

export type IvTooltipLabelKey = 'bw-wild' | 'bw-roamer' | 'bw2-wild' | 'egg';

/** バージョン系統判定 */
function isBw(version: RomVersion): boolean {
  return version === 'Black' || version === 'White';
}

/** 通常機能 (ポケモンリスト/検索) 向けコンテキスト */
export function getStandardContexts(version: RomVersion): IvTooltipContext[] {
  if (isBw(version)) {
    return [
      { labelKey: 'bw-wild', mtOffset: 0, isRoamer: false },
      { labelKey: 'bw-roamer', mtOffset: 1, isRoamer: true },
    ];
  }
  return [
    { labelKey: 'bw2-wild', mtOffset: 2, isRoamer: false },
  ];
}

/** タマゴ機能向けコンテキスト (通常 + 消費7) */
export function getEggContexts(version: RomVersion): IvTooltipContext[] {
  return [
    ...getStandardContexts(version),
    { labelKey: 'egg', mtOffset: 7, isRoamer: false },
  ];
}

/**
 * IV Spread の ラベル付き形式 (i18n 対応)
 * 既存の `getStatLabel()` / `IV_STAT_KEYS` を利用し、ロケールに応じて
 * "H:31 A:31 B:31 C:31 D:31 S:31" (ja) / "HP:31 Atk:31 ..." (en) を返す。
 */
export function formatIvSpread(ivs: Ivs, locale: SupportedLocale): string {
  return IV_STAT_KEYS
    .map((key) => `${getStatLabel(key, locale)}:${ivs[key]}`)
    .join(' ');
}

/**
 * Compact Pattern (ハイフン区切り数値)
 * 例: "31-0-31-30-31-30"
 *
 * 既存の `formatIvs` (format.ts) と同一形式。
 * ツールチップ内での使用には `formatIvs` を直接利用する。
 */
```

### 4.3 UI コンポーネント: Tooltip

`@radix-ui/react-tooltip` を shadcn/ui パターンでラップする。

```typescript
// src/components/ui/tooltip.tsx

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 ...',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
```

### 4.4 UI コンポーネント: SeedIvTooltip

```typescript
// src/components/data-display/seed-iv-tooltip.tsx

import { useMemo, type ReactElement, type ReactNode } from 'react';
import { useLingui } from '@lingui/react/macro';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  type IvTooltipContext,
  formatIvSpread,
} from '@/lib/iv-tooltip';
import { formatIvs } from '@/lib/format';
import { compute_iv_spread } from '@/wasm/wasm_pkg.js';

interface SeedIvTooltipProps {
  /** MT Seed (number)。LCG Seed の場合は呼び出し側で事前変換する */
  mtSeed: number;
  /** 表示するコンテキスト一覧 */
  contexts: IvTooltipContext[];
  /** ツールチップトリガーとなる子要素 */
  children: ReactNode;
}

function SeedIvTooltip({ mtSeed, contexts, children }: SeedIvTooltipProps): ReactElement {
  const { t } = useLingui();
  const language = useUiStore((s) => s.language);

  const entries = useMemo(
    () =>
      contexts.map((ctx) => {
        const ivs = compute_iv_spread(mtSeed, ctx.mtOffset, ctx.isRoamer);
        return {
          label: resolveLabel(ctx.labelKey, t),
          spread: formatIvSpread(ivs, language),
          pattern: formatIvs(ivs),
        };
      }),
    [mtSeed, contexts, t, language],
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" className="space-y-1 text-left">
        {entries.map((entry) => (
          <div key={entry.label} className="space-y-0.5">
            <div className="font-semibold leading-tight text-xs">{entry.label}</div>
            <div className="font-mono leading-tight text-xs">{entry.spread}</div>
            <div className="font-mono text-[10px] text-muted-foreground leading-tight">
              {entry.pattern}
            </div>
          </div>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

export { SeedIvTooltip };
export type { SeedIvTooltipProps };
```

`resolveLabel` は Lingui の `t` マクロで i18n キーに対応するラベルを返すヘルパー:

```typescript
function resolveLabel(key: IvTooltipLabelKey, t: ReturnType<typeof useLingui>['t']): string {
  switch (key) {
    case 'bw-wild':
      return t`BW Stationary/Wild (offset 0)`;
    case 'bw-roamer':
      return t`BW Roamer (offset 1)`;
    case 'bw2-wild':
      return t`BW2 Stationary/Wild (offset 2)`;
    case 'egg':
      return t`Egg (offset 7)`;
  }
}
```

### 4.5 既存コンポーネントへの統合

#### 4.5.1 DataTable セル (mtseed-result-columns.tsx)

MT Seed セルを `SeedIvTooltip` でラップする。`mtseed-search` 機能では `MtseedSearchContext.is_roamer` と `MtseedSearchContext.mt_offset` の値からバージョンを特定できないため、`useDsConfigReadonly()` から取得する。

```tsx
// cell 定義内
cell: ({ getValue }) => (
  <SeedIvTooltip mtSeed={row.original.seed} contexts={contexts}>
    <span className="font-mono">{getValue<string>()}</span>
  </SeedIvTooltip>
),
```

`contexts` は列定義の外で `useMemo` + `getStandardContexts(version)` で算出し、クロージャで参照する。

#### 4.5.2 DataTable セル (seed-origin-columns.tsx)

Base Seed と MT Seed の両セルにツールチップを追加する。

- **MT Seed**: `origin.Startup.mt_seed` (または `origin.Seed.mt_seed`) を直接使用
- **Base Seed**: `lcg_seed_to_mt_seed(origin.base_seed)` で MT Seed に変換してから使用

#### 4.5.3 DetailRow (pokemon-list / egg-list)

`DetailRow` を直接変更するのではなく、詳細ダイアログ内の Base Seed / MT Seed 行を `SeedIvTooltip` でラップする形で統合する。

```tsx
{/* Seed 情報 */}
<SeedIvTooltip mtSeed={parseMtSeed(result.mt_seed)} contexts={contexts}>
  <div>
    <DetailRow label="MT Seed" value={result.mt_seed} />
  </div>
</SeedIvTooltip>
```

egg-list の場合は `getEggContexts(version)` を使用する。

#### 4.5.4 Seed 入力フォーム (seed-input-section.tsx)

`manual-seeds` モードで LCG Seed が解決済みの場合、入力エリア下に解決結果の概要を表示する箇所があればツールチップを追加する。具体的な統合方法は、現行の `seed-input-section.tsx` の構造に応じて実装時に確定する。

### 4.6 状態管理

| 状態 | 管理方式 | 永続化 |
|------|----------|--------|
| ツールチップの開閉状態 | Radix UI 内部 (非制御) | 不要 |
| IV 計算結果 | `useMemo` (ホバー時に算出) | 不要 |
| バージョン情報 | `useDsConfigReadonly()` 経由で Store 参照 | 既存の persist |

新規 Store の追加は不要。

### 4.7 バリデーション

- MT Seed のバリデーションは既存の入力フォーム側で完結済み
- `compute_iv_spread` の引数は型レベルで制約されているため、追加バリデーション不要
- `mt_seed` 文字列 → `number` 変換が必要な箇所 (UiPokemonData / UiEggData) では `parseInt(hex, 16) >>> 0` を使用

### 4.8 翻訳キー

Lingui の `<Trans>` / `t` マクロを使用する。

| キー (msgid) | ja | en |
|-------------|----|----|
| `BW Stationary/Wild (offset 0)` | `BW 固定・野生 (消費0)` | `BW Stationary/Wild (offset 0)` |
| `BW Roamer (offset 1)` | `BW 徘徊 (消費1)` | `BW Roamer (offset 1)` |
| `BW2 Stationary/Wild (offset 2)` | `BW2 固定・野生 (消費2)` | `BW2 Stationary/Wild (offset 2)` |
| `Egg (offset 7)` | `タマゴ (消費7)` | `Egg (offset 7)` |

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/iv-tooltip.test.ts`)

| テスト | 検証内容 |
|--------|----------|
| `getStandardContexts` — BW 版 | `'Black'` → 2 コンテキスト (消費0, 消費1) |
| `getStandardContexts` — BW2 版 | `'Black2'` → 1 コンテキスト (消費2) |
| `getEggContexts` — BW 版 | 3 コンテキスト (消費0, 消費1, 消費7) |
| `getEggContexts` — BW2 版 | 2 コンテキスト (消費2, 消費7) |
| `formatIvSpread` (ja) | `{ hp: 31, atk: 0, ... }` → `"H:31 A:0 B:..."` |
| `formatIvSpread` (en) | `{ hp: 31, atk: 0, ... }` → `"HP:31 Atk:0 Def:..."` |
| `formatIvs` (Compact) | `{ hp: 31, atk: 0, ... }` → `"31-0-..."` |

### 5.2 統合テスト (`src/test/integration/iv-tooltip-wasm.test.ts`)

| テスト | 検証内容 |
|--------|----------|
| `compute_iv_spread` — 既知シード | MT Seed `0x00000000` / offset 0 → IV が既知の期待値と一致 |
| `compute_iv_spread` — roamer 順序 | offset 1, is_roamer=true → IV 順序が H/A/B/S/C/D で読み取られたことを確認 |
| `compute_iv_spread` — egg offset | offset 7 → 7 回消費後の IV |
| `lcg_seed_to_mt_seed` | 既知の LCG Seed → 期待する MT Seed |

### 5.3 コンポーネントテスト (`src/test/components/seed-iv-tooltip.test.tsx`)

| テスト | 検証内容 |
|--------|----------|
| ツールチップ表示 | トリガー要素ホバー時にツールチップコンテンツが DOM に出現 |
| コンテキスト行数 | BW 版: 2 コンテキスト分の行が表示 |

## 6. 実装チェックリスト

- [ ] `@radix-ui/react-tooltip` をインストール
- [ ] `src/components/ui/tooltip.tsx` を作成
- [ ] WASM: `generate_rng_ivs_with_offset` を `pub` に変更 (`algorithm/mod.rs`)
- [ ] WASM: `compute_iv_spread` ラッパーを `lib.rs` に追加
- [ ] WASM: `lcg_seed_to_mt_seed` ラッパーを `lib.rs` に追加
- [ ] WASM ビルド (`pnpm build:wasm`)
- [ ] `src/lib/iv-tooltip.ts` を作成
- [ ] `src/components/data-display/seed-iv-tooltip.tsx` を作成
- [ ] `mtseed-result-columns.tsx` にツールチップ統合
- [ ] `seed-origin-columns.tsx` にツールチップ統合
- [ ] `pokemon-list/result-detail-dialog.tsx` にツールチップ統合
- [ ] `egg-list/result-detail-dialog.tsx` にツールチップ統合
- [ ] `seed-input-section.tsx` にツールチップ統合
- [ ] 詳細ダイアログの IV フォーマット統一 (pokemon-list / egg-list を `getStatLabel` + i18n 対応に統一)
- [ ] `TooltipProvider` をアプリルート (`app.tsx` 等) に追加
- [ ] 翻訳キーを抽出・追加 (`pnpm lingui:extract`)
- [ ] ユニットテスト作成・実行
- [ ] 統合テスト作成・実行
- [ ] コンポーネントテスト作成・実行
- [ ] Lint・型チェック (`pnpm lint`, `pnpm exec tsc -b --noEmit`)
- [ ] WASM テスト (`cargo test`)
