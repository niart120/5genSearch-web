# Seed テンプレート機能 仕様書

## 1. 概要

### 1.1 目的

起動時刻検索 (datetime-search) にて、よく使われる MT Seed の組み合わせをテンプレートとして事前定義し、ワンクリックで Target Seeds 入力欄に反映する機能を実装する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| Seed テンプレート | 特定の条件（バージョン・カテゴリ・IV パターン）に対応する MT Seed の定義済みリスト |
| TemplateVersion | テンプレートの対象バージョン軸。`BW` (Black/White) と `BW2` (Black2/White2) の 2 値 |
| TemplateCategory | テンプレートの種別。`stationary` (固定・野生)、`roamer` (徘徊)、`egg` (孵化) の 3 値 |
| Target Seeds | 起動時刻検索の対象 MT Seed 入力欄 (textarea ベース、改行区切り 16 進数) |

### 1.3 背景・問題

起動時刻検索 (local_054) では、検索対象の MT Seed をユーザーが手動で入力する必要がある。ポケモン BW/BW2 の乱数調整では、6V 個体や特定の IV パターン (5VA0, V0VVV0, めざ氷 等) に対応する既知の MT Seed が存在し、これらは乱数調整コミュニティで広く共有されている。

リファレンス実装 (niart120/pokemon-gen5-initseed) では `src/data/seed-templates.ts` に定義済みテンプレートを持ち、`TemplateSelectionDialog` でユーザーが選択・適用する機能を提供していた。本 spec ではこの機能を本リポジトリのアーキテクチャに合わせて再実装する。

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| 入力の効率化 | 既知の MT Seed を手動入力する手間を解消 |
| 入力ミスの低減 | 検証済みの Seed 値をテンプレートから供給 |
| 初心者の導線 | 何を検索すべきか分からないユーザーに典型的な選択肢を提示 |

### 1.5 着手条件

- [x] 起動時刻検索 (local_054) 完了
- [x] TargetSeedsInput コンポーネント完了

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `src/data/seed-templates.ts` | 新規 | テンプレートデータ定義 (型 + 定数) |
| `src/features/datetime-search/components/template-selection-dialog.tsx` | 新規 | テンプレート選択ダイアログ |
| `src/features/datetime-search/components/datetime-search-page.tsx` | 変更 | テンプレートボタン追加 + ダイアログ統合 |
| `src/features/datetime-search/index.ts` | 変更 | re-export 追加 (必要に応じて) |
| `src/test/unit/seed-templates.test.ts` | 新規 | テンプレートデータの整合性テスト |
| `src/test/components/template-selection-dialog.test.tsx` | 新規 | ダイアログ操作テスト |

## 3. 設計方針

### 3.1 テンプレートデータ

テンプレートデータは `src/data/seed-templates.ts` に配置する。静的データ層 (`data/`) に置くことで、feature から独立した参照が可能になる (将来的に他の機能から参照する場合に備える)。

バージョン軸は DS 設定の `RomVersion` (`Black | White | Black2 | White2`) から `TemplateVersion` (`BW | BW2`) に集約してフィルタする。

テンプレート名・説明はロケール別 (`Record<SupportedLocale, string>`) で保持する。`game-data-names.ts` のパターンに従い、ゲーム固有の用語 (IV パターン名、エンカウント種別名) を言語別に管理する。

### 3.2 UI 構成

テンプレート選択 UI は `datetime-search` feature 内に閉じる。`DatetimeSearchPage` がテンプレートボタンを TargetSeedsInput の周辺に配置し、ダイアログの開閉を管理する。

#### レイアウト (DatetimeSearchPage Controls ペイン内)

```
├ SearchContextForm
├ TargetSeedsInput
│ └ (既存のまま)
├ [Template] ボタン    ← 新規: TargetSeedsInput の直下に配置
├ バリデーションエラー
```

テンプレートボタンは TargetSeedsInput と同じ Controls カラム内に配置し、検索中 (`isLoading`) は `disabled` とする。

#### TemplateSelectionDialog

```
┌──────────────────────────────────────────┐
│  Seed テンプレートの選択                    │
│  ──────────────────────────────────────── │
│  種別: [すべて ▼]                          │
│                                          │
│  ☐ BW 固定・野生 6V       (5 seeds)       │
│     BW 標準（消費0）6V                     │
│  ☐ BW 固定・野生 5VA0     (3 seeds)       │
│     ...                                  │
│                                          │
│  ☐ BW 徘徊 6V             (5 seeds)       │
│     ...                                  │
│                                          │
│  ─ 条件に一致するテンプレートがない場合 ─    │
│                                          │
│            [キャンセル]  [適用 (N)]         │
└──────────────────────────────────────────┘
```

- カテゴリフィルタ: `all | stationary | roamer | egg` のドロップダウン
- バージョンフィルタ: DS 設定の `version` から自動判定 (ユーザー操作不要)
- 複数テンプレートを Checkbox で選択可
- 「適用」ボタンに選択中の Seed 総数を表示
- 「適用」ボタン押下で選択中テンプレートの Seed を統合 (重複排除) し、Target Seeds 入力欄のテキストを **置換** する

### 3.3 適用挙動

テンプレート適用時は Target Seeds textarea の既存テキストを **クリアして置換** する。

```typescript
// 適用時の処理イメージ (DatetimeSearchPage 内)
const handleTemplateApply = (seeds: MtSeed[]) => {
  const text = seeds.map((s) => toHex(s, 8)).join('\n');
  setTargetSeedsRaw(text);
};
```

### 3.4 状態管理

| 状態 | 管理方式 | 永続化 | 理由 |
|------|---------|--------|------|
| ダイアログ開閉 | `useState` (DatetimeSearchPage) | なし | 一時的な UI 状態 |
| 選択中テンプレート | `useState` (TemplateSelectionDialog) | なし | ダイアログ内の一時状態 |
| カテゴリフィルタ | `useState` (TemplateSelectionDialog) | なし | ダイアログ内の一時状態 |

Store に追加する項目はない。テンプレート選択は一時的な操作であり、適用結果は既存の `targetSeedsRaw` (ローカル state) に反映される。

### 3.5 バリデーション

テンプレートデータ自体のバリデーションはテストで担保する。UI 上のバリデーションは不要 (テンプレート適用後は既存の `parseTargetSeeds` + `validateMtseedSearchForm` が機能する)。

| 検証項目 | 検証方法 | 実施タイミング |
|---------|---------|-------------|
| Seed 値の範囲 ($0 \le \text{seed} \le \text{0xFFFFFFFF}$) | ユニットテスト | CI |
| Seed 配列が空でないこと | ユニットテスト | CI |
| テンプレート名が全ロケールで定義済み | ユニットテスト | CI |
| バージョン・カテゴリの値が有効 | TypeScript 型チェック | コンパイル時 |

### 3.6 翻訳方針

| 対象 | 方式 | 理由 |
|------|------|------|
| ダイアログ UI ラベル (タイトル, ボタン等) | Lingui `<Trans>` / `t` | UI テキストの標準方式 |
| テンプレート名・説明 | `Record<SupportedLocale, string>` | `game-data-names.ts` パターンに従い、ゲーム固有用語を言語別に管理 |
| カテゴリラベル | `Record<SupportedLocale, string>` | 同上 |

### 3.7 将来拡張

本 spec の範囲外だが、以下の拡張を見据えた設計とする:

- ユーザー定義テンプレートの追加 (Store 永続化)
- テンプレートのインポート/エクスポート
- 他の検索機能 (egg-search 等) からの参照

現時点では事前定義テンプレートのみを扱い、上記は必要になった段階で検討する。

## 4. 実装仕様

### 4.1 テンプレートデータ型 (`src/data/seed-templates.ts`)

```typescript
import type { SupportedLocale } from '@/i18n';
import type { RomVersion } from '@/wasm/wasm_pkg';

/** テンプレート対応バージョン */
export type TemplateVersion = 'BW' | 'BW2';

/** テンプレート種別 */
export type TemplateCategory = 'stationary' | 'roamer' | 'egg';

/** カテゴリフィルタ (UI 用、'all' を含む) */
export type TemplateCategoryFilter = 'all' | TemplateCategory;

/** Seed テンプレート定義 */
export interface SeedTemplate {
  /** 一意識別子 (例: 'bw-stationary-6v') */
  id: string;
  /** テンプレート表示名 (ロケール別) */
  name: Record<SupportedLocale, string>;
  /** テンプレート説明 (ロケール別) */
  description: Record<SupportedLocale, string>;
  /** 対応バージョン */
  version: TemplateVersion;
  /** 種別 */
  category: TemplateCategory;
  /** MT Seed 値の配列 (32bit 整数) */
  seeds: number[];
}

/**
 * RomVersion → TemplateVersion 変換
 */
export function toTemplateVersion(version: RomVersion): TemplateVersion {
  switch (version) {
    case 'Black':
    case 'White':
      return 'BW';
    case 'Black2':
    case 'White2':
      return 'BW2';
  }
}

/**
 * カテゴリフィルタのラベル
 */
export const TEMPLATE_CATEGORY_LABELS: Record<
  TemplateCategoryFilter,
  Record<SupportedLocale, string>
> = {
  all: { ja: 'すべて', en: 'All' },
  stationary: { ja: '固定・野生', en: 'Stationary/Wild' },
  roamer: { ja: '徘徊', en: 'Roamer' },
  egg: { ja: '孵化', en: 'Egg' },
};

/**
 * 定義済み Seed テンプレート
 *
 * リファレンス実装 (niart120/pokemon-gen5-initseed) の
 * 定義済みテンプレートを移植。
 */
export const SEED_TEMPLATES: SeedTemplate[] = [
  // --- BW 固定・野生 ---
  {
    id: 'bw-stationary-6v',
    name: { ja: 'BW 固定・野生 6V', en: 'BW Stationary/Wild 6V' },
    description: {
      ja: 'ブラック・ホワイト 標準（消費0）6V（5種類）',
      en: 'Black/White Standard (0 advances) 6V — 5 seeds',
    },
    version: 'BW',
    category: 'stationary',
    seeds: [0x14b11ba6, 0x8a30480d, 0x9e02b0ae, 0xadfa2178, 0xfc4aa3ac],
  },
  {
    id: 'bw-stationary-5va0',
    name: { ja: 'BW 固定・野生 5VA0', en: 'BW Stationary/Wild 5VA0' },
    description: {
      ja: 'ブラック・ホワイト 標準（消費0）5VA0（3種類）',
      en: 'Black/White Standard (0 advances) 5VA0 — 3 seeds',
    },
    version: 'BW',
    category: 'stationary',
    seeds: [0x4bd26fc3, 0xc59a441a, 0xdfe7ebf2],
  },
  {
    id: 'bw-stationary-v0vvv0',
    name: { ja: 'BW 固定・野生 V0VVV0', en: 'BW Stationary/Wild V0VVV0' },
    description: {
      ja: 'ブラック・ホワイト 標準（消費0）V0VVV0（2種類）',
      en: 'Black/White Standard (0 advances) V0VVV0 — 2 seeds',
    },
    version: 'BW',
    category: 'stationary',
    seeds: [0x0b5a81f0, 0x5d6f6d1d],
  },
  {
    id: 'bw-stationary-v2uvvv-ice',
    name: {
      ja: 'BW 固定・野生 V2UVVV めざ氷',
      en: 'BW Stationary/Wild V2UVVV HP Ice',
    },
    description: {
      ja: 'ブラック・ホワイト 標準（消費0）V2UVVV めざ氷（7種類）',
      en: 'Black/White Standard (0 advances) V2UVVV HP Ice — 7 seeds',
    },
    version: 'BW',
    category: 'stationary',
    seeds: [
      0x01117891, 0x2277228b, 0xa38fbaaf, 0xa49fdc53,
      0xaf3ffbbf, 0xf0ee8f20, 0xf62667ee,
    ],
  },
  // --- BW 徘徊 ---
  {
    id: 'bw-roamer-6v',
    name: { ja: 'BW 徘徊 6V', en: 'BW Roamer 6V' },
    description: {
      ja: 'ブラック・ホワイト 徘徊（消費1）6V（5種類）',
      en: 'Black/White Roamer (1 advance) 6V — 5 seeds',
    },
    version: 'BW',
    category: 'roamer',
    seeds: [0x35652a5f, 0x4707f449, 0x7541aad0, 0xbee598a7, 0xeaa27a05],
  },
  {
    id: 'bw-roamer-v2uvvv-ice',
    name: { ja: 'BW 徘徊 V2UVVV めざ氷', en: 'BW Roamer V2UVVV HP Ice' },
    description: {
      ja: 'ブラック・ホワイト 徘徊（消費1）V2UVVV めざ氷（6種類）',
      en: 'Black/White Roamer (1 advance) V2UVVV HP Ice — 6 seeds',
    },
    version: 'BW',
    category: 'roamer',
    seeds: [0x5f3de7ef, 0x7f1983d4, 0xb8500799, 0xc18aa384, 0xc899e66e, 0xd8bfc637],
  },
  {
    id: 'bw-roamer-u2uuuv-flying',
    name: { ja: 'BW 徘徊 U2UUUV めざ飛', en: 'BW Roamer U2UUUV HP Flying' },
    description: {
      ja: 'ブラック・ホワイト 徘徊（消費1）U2UUUV めざ飛（5種類）',
      en: 'Black/White Roamer (1 advance) U2UUUV HP Flying — 5 seeds',
    },
    version: 'BW',
    category: 'roamer',
    seeds: [0x4a28cbe0, 0x5b41c530, 0xa359c930, 0xc8175b8b, 0xdafa8540],
  },
  // --- BW2 固定・野生 ---
  {
    id: 'bw2-stationary-6v',
    name: { ja: 'BW2 固定・野生 6V', en: 'BW2 Stationary/Wild 6V' },
    description: {
      ja: 'ブラック2・ホワイト2（消費2）6V（6種類）',
      en: 'Black2/White2 (2 advances) 6V — 6 seeds',
    },
    version: 'BW2',
    category: 'stationary',
    seeds: [0x31c26de4, 0x519a0c07, 0xc28a882e, 0xdfe7ebf2, 0xe34372ae, 0xed01c9c2],
  },
  {
    id: 'bw2-stationary-5va0',
    name: { ja: 'BW2 固定・野生 5VA0', en: 'BW2 Stationary/Wild 5VA0' },
    description: {
      ja: 'ブラック2・ホワイト2（消費2）5VA0（10種類）',
      en: 'Black2/White2 (2 advances) 5VA0 — 10 seeds',
    },
    version: 'BW2',
    category: 'stationary',
    seeds: [
      0x14719922, 0x634cc2b0, 0x71afc896, 0x88efdec2, 0xaa333835,
      0xabd93e44, 0xadd877c4, 0xb32b6b02, 0xc31ddef7, 0xd286653c,
    ],
  },
  {
    id: 'bw2-stationary-v0vvv0',
    name: { ja: 'BW2 固定・野生 V0VVV0', en: 'BW2 Stationary/Wild V0VVV0' },
    description: {
      ja: 'ブラック2・ホワイト2（消費2）V0VVV0（4種類）',
      en: 'Black2/White2 (2 advances) V0VVV0 — 4 seeds',
    },
    version: 'BW2',
    category: 'stationary',
    seeds: [0x54f39e0f, 0x6338dded, 0x7bf8cd77, 0xf9c432eb],
  },
  {
    id: 'bw2-stationary-v2uvvv-ice',
    name: {
      ja: 'BW2 固定・野生 V2UVVV めざ氷',
      en: 'BW2 Stationary/Wild V2UVVV HP Ice',
    },
    description: {
      ja: 'ブラック2・ホワイト2（消費2）V2UVVV めざ氷（8種類）',
      en: 'Black2/White2 (2 advances) V2UVVV HP Ice — 8 seeds',
    },
    version: 'BW2',
    category: 'stationary',
    seeds: [
      0x03730f34, 0x2c9d32bf, 0x3f37a9b9, 0x440cb317,
      0x6728fdbf, 0x7240a4ae, 0x9bfb3d33, 0xff1df7dc,
    ],
  },
  // --- BW 孵化 ---
  {
    id: 'bw-egg-6v',
    name: { ja: 'BW 孵化 6V', en: 'BW Egg 6V' },
    description: {
      ja: 'ブラック・ホワイト 孵化（消費7）6V（5種類）',
      en: 'Black/White Egg (7 advances) 6V — 5 seeds',
    },
    version: 'BW',
    category: 'egg',
    seeds: [0xccda2eaf, 0x95943c17, 0x9e443917, 0x288144c5, 0x8b39431b],
  },
  {
    id: 'bw-egg-5va0',
    name: { ja: 'BW 孵化 5VA0', en: 'BW Egg 5VA0' },
    description: {
      ja: 'ブラック・ホワイト 孵化（消費7）5VA0（2種類）',
      en: 'Black/White Egg (7 advances) 5VA0 — 2 seeds',
    },
    version: 'BW',
    category: 'egg',
    seeds: [0x25b4c159, 0xc825a2f0],
  },
  {
    id: 'bw-egg-5vs0',
    name: { ja: 'BW 孵化 5VS0', en: 'BW Egg 5VS0' },
    description: {
      ja: 'ブラック・ホワイト 孵化（消費7）5VS0（8種類）',
      en: 'Black/White Egg (7 advances) 5VS0 — 8 seeds',
    },
    version: 'BW',
    category: 'egg',
    seeds: [
      0x479b959f, 0xe1c396fb, 0x08cbe836, 0x33ac78ee,
      0x50b3ec3d, 0x26f4371b, 0x435e8bb3, 0x52e6fe61,
    ],
  },
  {
    id: 'bw-egg-v0vvv0',
    name: { ja: 'BW 孵化 V0VVV0', en: 'BW Egg V0VVV0' },
    description: {
      ja: 'ブラック・ホワイト 孵化（消費7）V0VVV0（4種類）',
      en: 'Black/White Egg (7 advances) V0VVV0 — 4 seeds',
    },
    version: 'BW',
    category: 'egg',
    seeds: [0x63e3d233, 0x6737b419, 0xb4f1c576, 0xee571eec],
  },
  {
    id: 'bw-egg-v2uvvv-ice',
    name: { ja: 'BW 孵化 V2UVVV めざ氷', en: 'BW Egg V2UVVV HP Ice' },
    description: {
      ja: 'ブラック・ホワイト 孵化（消費7）V2UVVV めざ氷（1種類）',
      en: 'Black/White Egg (7 advances) V2UVVV HP Ice — 1 seed',
    },
    version: 'BW',
    category: 'egg',
    seeds: [0xd07de3a6],
  },
];
```

### 4.2 TemplateSelectionDialog (`features/datetime-search/components/template-selection-dialog.tsx`)

```typescript
import type { MtSeed, RomVersion } from '@/wasm/wasm_pkg';

interface TemplateSelectionDialogProps {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** 開閉状態の変更コールバック */
  onOpenChange: (open: boolean) => void;
  /** テンプレート適用コールバック (統合済み Seed 配列) */
  onApply: (seeds: MtSeed[]) => void;
  /** 現在の ROM バージョン (フィルタ用) */
  currentVersion: RomVersion;
}
```

実装ポイント:

1. Radix `Dialog` を使用
2. `currentVersion` を `toTemplateVersion()` で変換し、一致する `TemplateVersion` のテンプレートのみ表示
3. カテゴリフィルタは Radix `Select` で実装
4. 各テンプレートは `Checkbox` + `Label` で表示。Seed 数をバッジで表示
5. 「適用」ボタンは選択が 0 件のとき `disabled`
6. 適用時、選択テンプレートの Seed を `Set` で統合 (重複排除) → 配列化して `onApply` を呼び出し
7. ダイアログを閉じた時点で選択状態をリセットする
8. テンプレート名・説明は `useLingui` から取得した locale で `Record` から引く

```typescript
// フィルタロジック
const filteredTemplates = useMemo(() => {
  const tv = toTemplateVersion(currentVersion);
  return SEED_TEMPLATES.filter((t) => {
    if (t.version !== tv) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return true;
  });
}, [currentVersion, categoryFilter]);

// 適用時
const handleApply = () => {
  const merged = new Set<number>();
  for (const tpl of SEED_TEMPLATES) {
    if (selectedIds.has(tpl.id)) {
      for (const seed of tpl.seeds) merged.add(seed);
    }
  }
  onApply(Array.from(merged));
  onOpenChange(false);
};
```

### 4.3 DatetimeSearchPage 変更

`datetime-search-page.tsx` に以下を追加する:

1. テンプレートダイアログの開閉状態 (`useState`)
2. テンプレートボタン (TargetSeedsInput の下)
3. テンプレート適用ハンドラ (`handleTemplateApply`)
4. `TemplateSelectionDialog` の描画

```typescript
// 追加する状態
const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

// テンプレート適用
const handleTemplateApply = useCallback(
  (seeds: MtSeed[]) => {
    const text = seeds.map((s) => toHex(s, 8)).join('\n');
    setTargetSeedsRaw(text);
  },
  [setTargetSeedsRaw],
);
```

```tsx
{/* Controls ペイン内: TargetSeedsInput の直下 */}
<TargetSeedsInput
  value={targetSeedsRaw}
  onChange={setTargetSeedsRaw}
  parsedSeeds={parsedSeeds.seeds}
  errors={translatedParseErrors}
  disabled={isLoading}
/>
<Button
  variant="outline"
  size="sm"
  onClick={() => setTemplateDialogOpen(true)}
  disabled={isLoading}
>
  <Trans>Template</Trans>
</Button>

{/* ダイアログ */}
<TemplateSelectionDialog
  open={templateDialogOpen}
  onOpenChange={setTemplateDialogOpen}
  onApply={handleTemplateApply}
  currentVersion={dsConfig.version}
/>
```

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/`)

| テスト | 検証内容 |
|--------|---------|
| `seed-templates.test.ts` | テンプレートデータの整合性: 全テンプレートの Seed が $0 \le \text{seed} \le \text{0xFFFFFFFF}$、seeds 配列が空でないこと、`id` の一意性、`name`/`description` が全ロケールで定義済み |
| `seed-templates.test.ts` | `toTemplateVersion`: `Black` → `BW`, `White` → `BW`, `Black2` → `BW2`, `White2` → `BW2` |

### 5.2 コンポーネントテスト (`src/test/components/`)

| テスト | 検証内容 |
|--------|---------|
| `template-selection-dialog.test.tsx` | ダイアログ表示時にテンプレート一覧が描画される |
| `template-selection-dialog.test.tsx` | Checkbox 選択 → 「適用」ボタン押下で `onApply` が正しい Seed 配列を返す |
| `template-selection-dialog.test.tsx` | カテゴリフィルタ変更でテンプレート一覧がフィルタされる |
| `template-selection-dialog.test.tsx` | 選択なし状態で「適用」ボタンが `disabled` |

## 6. 実装チェックリスト

### データ層

- [ ] `src/data/seed-templates.ts` — テンプレートデータ定義 (型 + 定数 + ヘルパー)

### Feature: datetime-search

- [ ] `features/datetime-search/components/template-selection-dialog.tsx` — テンプレート選択ダイアログ
- [ ] `features/datetime-search/components/datetime-search-page.tsx` — テンプレートボタン追加 + ダイアログ統合

### テスト

- [ ] `test/unit/seed-templates.test.ts` — テンプレートデータ整合性 + `toTemplateVersion`
- [ ] `test/components/template-selection-dialog.test.tsx` — ダイアログ操作テスト

### 翻訳

- [ ] `i18n/locales/ja/messages.po` — 日本語翻訳追加 (lingui:extract → 翻訳記入)
- [ ] `i18n/locales/en/messages.po` — 英語翻訳確認 (ソースメッセージで自動適用)
