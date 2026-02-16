# Seed テンプレート機能 仕様書

## 1. 概要

### 1.1 目的

起動時刻検索 (datetime-search) にて、よく使われる MT Seed の組み合わせをテンプレートとして事前定義し、ワンクリックで Target Seeds 入力欄に反映する機能を実装する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| Seed テンプレート | 特定の条件（バージョン・カテゴリ・IV パターン）に対応する MT Seed の定義済みリスト |
| TemplateVersion | テンプレートの対象バージョン軸。`BW` (Black/White) と `BW2` (Black2/White2) の 2 値 |
| TemplateCategory | テンプレートの種別。`stationary` (固定・野生) と `roamer` (徘徊) の 2 値 |
| IvPattern | IV パターンの表記。`V` = 31, 数字 = 固定値, `U` = 30。例: `V0VVV0` = 31-0-31-31-31-0 |
| Target Seeds | 起動時刻検索の対象 MT Seed 入力欄 (textarea ベース、改行区切り 16 進数) |

### 1.3 背景・問題

起動時刻検索 (local_054) では、検索対象の MT Seed をユーザーが手動で入力する必要がある。ポケモン BW/BW2 の乱数調整では、6V 個体や特定の IV パターンに対応する既知の MT Seed が存在し、これらは乱数調整コミュニティで広く共有されている。

リファレンス実装 (niart120/pokemon-gen5-initseed) では定義済みテンプレートを持ちユーザーが選択・適用する機能を提供していた。本 spec ではこの機能を本リポジトリのアーキテクチャに合わせて再構築する。

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

テンプレートデータは `src/data/seed-templates.ts` に配置する。静的データ層 (`data/`) に置くことで、feature から独立した参照が可能になる。

バージョン軸は DS 設定の `RomVersion` (`Black | White | Black2 | White2`) から `TemplateVersion` (`BW | BW2`) に集約してフィルタする。

テンプレート名・説明はロケール別 (`Record<SupportedLocale, string>`) で保持する。`game-data-names.ts` のパターンに従い、ゲーム固有の用語を言語別に管理する。

#### テンプレート対象範囲

孵化テンプレートは本 spec の対象外とする (需要が低いため)。対象は以下の 2 カテゴリ:

- **固定・野生 (stationary)**: `mt_offset=0` (BW) / `mt_offset=2` (BW2)、`is_roamer=false`
- **徘徊 (roamer)**: `mt_offset=1`、`is_roamer=true` (BW のみ)

#### パターン定義

各テンプレートは「IV パターン」と「検索条件」の組み合わせで定義される。Seed 値は `MtseedSearcher` (CPU) / `GpuMtseedSearchIterator` (GPU) による全探索で導出したものを使用する。

| ID | パターン名 | IV 条件 (H-A-B-C-D-S) | 備考 |
|----|-----------|----------------------|------|
| 6v | 6V | 31-31-31-31-31-31 | 理想個体 |
| 5va0 | 5VA0 | 31-0-31-31-31-31 | 特殊型 (A 最低) |
| 5vs0 | 5VS0 | 31-31-31-31-31-0 | トリル型 (S 最低) |
| v0vvv0 | V0VVV0 | 31-0-31-31-31-0 | 特殊トリル型 |
| hp-ice | めざ氷 | 31-2-30-31-31-31 | めざめるパワー氷 70 |
| hp-fire | めざ炎 | 31-2-31-30-31-30 | めざめるパワー炎 70 |
| hp-ground | めざ地面 | 31-2-31-30-30-31 | めざめるパワー地面 70 |
| hp-grass | めざ草 | 31-2-31-30-31-31 | めざめるパワー草 70 |

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
│     31-31-31-31-31-31                     │
│  ☐ BW 固定・野生 5VA0     (3 seeds)       │
│     31-0-31-31-31-31                      │
│  ☐ BW 固定・野生 5VS0     (4 seeds)       │
│     31-31-31-31-31-0                      │
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

- カテゴリフィルタ: `all | stationary | roamer` のドロップダウン
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
- 他の検索機能からの参照
- 孵化テンプレートの追加

現時点では事前定義テンプレートのみを扱い、上記は必要になった段階で検討する。

## 4. 実装仕様

### 4.1 テンプレートデータ型 (`src/data/seed-templates.ts`)

```typescript
import type { SupportedLocale } from '@/i18n';
import type { RomVersion } from '@/wasm/wasm_pkg';

/** テンプレート対応バージョン */
export type TemplateVersion = 'BW' | 'BW2';

/** テンプレート種別 */
export type TemplateCategory = 'stationary' | 'roamer';

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
};
```

### 4.2 テンプレートパターン一覧

以下は GPU 全探索 (`GpuMtseedSearchIterator`) で確認済みの Seed 値一覧。ID 命名は `{version}-{category}-{pattern}` 形式。

#### 4.2.1 BW 固定・野生 (`mt_offset=0`, `is_roamer=false`)

| ID | パターン | IV (H-A-B-C-D-S) | Seed 数 | Seeds |
|----|---------|-------------------|---------|-------|
| `bw-stationary-6v` | 6V | 31-31-31-31-31-31 | 5 | `14B11BA6`, `8A30480D`, `9E02B0AE`, `ADFA2178`, `FC4AA3AC` |
| `bw-stationary-5va0` | 5VA0 | 31-0-31-31-31-31 | 3 | `4BD26FC3`, `C59A441A`, `DFE7EBF2` |
| `bw-stationary-5vs0` | 5VS0 | 31-31-31-31-31-0 | 4 | `47F4E4DD`, `9F97B296`, `A4686420`, `D5678C32` |
| `bw-stationary-v0vvv0` | V0VVV0 | 31-0-31-31-31-0 | 2 | `0B5A81F0`, `5D6F6D1D` |
| `bw-stationary-hp-ice` | めざ氷 | 31-2-30-31-31-31 | 7 | `01117891`, `2277228B`, `A38FBAAF`, `A49FDC53`, `AF3FFBBF`, `F0EE8F20`, `F62667EE` |
| `bw-stationary-hp-fire` | めざ炎 | 31-2-31-30-31-30 | 3 | `B6594B3F`, `E5AE320C`, `ED81E12C` |
| `bw-stationary-hp-ground` | めざ地面 | 31-2-31-30-30-31 | 2 | `E612EDE1`, `FE841EB2` |
| `bw-stationary-hp-grass` | めざ草 | 31-2-31-30-31-31 | 3 | `85516C9E`, `A57DD3C3`, `A9A04E44` |

#### 4.2.2 BW 徘徊 (`mt_offset=1`, `is_roamer=true`)

| ID | パターン | IV (H-A-B-C-D-S) | Seed 数 | Seeds |
|----|---------|-------------------|---------|-------|
| `bw-roamer-6v` | 6V | 31-31-31-31-31-31 | 5 | `35652A5F`, `4707F449`, `7541AAD0`, `BEE598A7`, `EAA27A05` |
| `bw-roamer-hp-ice` | めざ氷 | 31-2-30-31-31-31 | 6 | `5F3DE7EF`, `7F1983D4`, `B8500799`, `C18AA384`, `C899E66E`, `D8BFC637` |
| `bw-roamer-hp-flying` | めざ飛 | 30-2-30-30-30-31 | 5 | `4A28CBE0`, `5B41C530`, `A359C930`, `C8175B8B`, `DAFA8540` |

#### 4.2.3 BW2 固定・野生 (`mt_offset=2`, `is_roamer=false`)

| ID | パターン | IV (H-A-B-C-D-S) | Seed 数 | Seeds |
|----|---------|-------------------|---------|-------|
| `bw2-stationary-6v` | 6V | 31-31-31-31-31-31 | 6 | `31C26DE4`, `519A0C07`, `C28A882E`, `DFE7EBF2`, `E34372AE`, `ED01C9C2` |
| `bw2-stationary-5va0` | 5VA0 | 31-0-31-31-31-31 | 10 | `14719922`, `634CC2B0`, `71AFC896`, `88EFDEC2`, `AA333835`, `ABD93E44`, `ADD877C4`, `B32B6B02`, `C31DDEF7`, `D286653C` |
| `bw2-stationary-5vs0` | 5VS0 | 31-31-31-31-31-0 | 4 | `6CCBF92D`, `88FF2415`, `AA2029BD`, `C31A4DEA` |
| `bw2-stationary-v0vvv0` | V0VVV0 | 31-0-31-31-31-0 | 4 | `54F39E0F`, `6338DDED`, `7BF8CD77`, `F9C432EB` |
| `bw2-stationary-hp-ice` | めざ氷 | 31-2-30-31-31-31 | 8 | `03730F34`, `2C9D32BF`, `3F37A9B9`, `440CB317`, `6728FDBF`, `7240A4AE`, `9BFB3D33`, `FF1DF7DC` |
| `bw2-stationary-hp-fire` | めざ炎 | 31-2-31-30-31-30 | 3 | `06FC78D5`, `0CE3E9D3`, `AA7AE044` |
| `bw2-stationary-hp-ground` | めざ地面 | 31-2-31-30-30-31 | 3 | `2FDC73A4`, `954952E5`, `D03B5325` |
| `bw2-stationary-hp-grass` | めざ草 | 31-2-31-30-31-31 | 4 | `83CAA3D2`, `8B16C992`, `A7CBE40F`, `C751621A` |

> 注: BW2 には徘徊ポケモンが存在しないため、roamer テンプレートは BW のみ。

### 4.3 TemplateSelectionDialog (`features/datetime-search/components/template-selection-dialog.tsx`)

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

### 4.4 DatetimeSearchPage 変更

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
