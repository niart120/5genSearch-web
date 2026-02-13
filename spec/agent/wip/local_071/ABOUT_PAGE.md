# About ページ 仕様書

## 1. 概要

### 1.1 目的

アプリケーションの概要・データ出典・ライセンス情報を集約する About ページを新設する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| Category | `navigation.ts` の第1層分類 (`search`, `generation`, `tools`) |
| FeatureId | 第2層の機能 ID。各 Category に複数紐づく |
| スタンドアロンページ | カテゴリ内の feature ではなく、独立したルートとして扱うページ |

### 1.3 背景・問題

- pokebook.jp の出典表記をフッターに配置していたが、常時表示による画面領域の圧迫が問題となりフッターを廃止した
- 出典・ライセンス・アプリ概要を掲載する場所が存在しない
- dev-journal (2026-02-11) に記録済み

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| 出典の明示 | pokebook.jp への適切なクレジット表示 |
| 画面領域確保 | フッター廃止後の代替として情報を About ページに集約 |

### 1.5 着手条件

- なし（独立タスク）

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/lib/navigation.ts` | 変更 | `Category` に `'about'` を追加、`CATEGORIES` に定義追加 |
| `src/features/about/components/about-page.tsx` | 新規 | About ページコンポーネント |
| `src/features/about/index.ts` | 新規 | barrel export |
| `src/components/layout/feature-content.tsx` | 変更 | `renderFeature` に `case 'about'` 追加 |
| `src/components/layout/bottom-nav.tsx` | 変更 | `CATEGORY_ICONS` に about 用アイコン追加 |
| `src/components/layout/navigation-labels.tsx` | 変更 | `CATEGORY_LABELS` に about ラベル追加 |
| `src/components/layout/header.tsx` | 変更 | PC 用カテゴリナビに about 追加 |
| `src/i18n/locales/ja/messages.po` | 変更 | About 関連翻訳追加 |
| `src/i18n/locales/en/messages.po` | 変更 | About 関連翻訳追加 |

## 3. 設計方針

### 3.1 ナビゲーション統合方式

About ページは既存カテゴリ (`search`, `generation`, `tools`) のいずれにも属さない。以下の2つの方式を検討する。

**方式 A: 独立カテゴリ**

- `Category` 型に `'about'` を追加
- BottomNav とヘッダーに4つ目のタブとして表示
- `features` は `['about']` のみ（FeatureTabs は非表示にする）

**方式 B: ヘッダーアイコン**

- ヘッダー右端（言語/テーマトグルの隣）に Info アイコンを配置
- カテゴリ・Feature とは独立したモーダルまたはオーバーレイで表示
- BottomNav には影響しない

**採用方針**: 方式 A を推奨する。理由:

- 既存のナビゲーション構造（`Category` → `FeatureId`）にそのまま乗せられる
- モーダルは長文コンテンツの表示に不向き
- モバイルの BottomNav でもアクセスしやすい

### 3.2 ページ構成

About ページに掲載するセクション:

1. **アプリ概要**: 対象タイトル（BW/BW2）と機能の説明
2. **データの出典**: pokebook.jp「ポケモンの友」
3. **ライセンス**: リポジトリの LICENSE ファイルへのリンク
4. **リポジトリリンク**: GitHub リポジトリ URL
5. **免責事項**: 非公式ツールである旨

### 3.3 FeatureTabs の扱い

About カテゴリには feature が1つしかないため、FeatureTabs（カテゴリ内のサブタブ）は非表示にする。`FeatureTabs` コンポーネントで `features.length <= 1` の場合に描画をスキップする。

## 4. 実装仕様

### 4.1 navigation.ts の変更

```ts
export type Category = 'search' | 'generation' | 'tools' | 'about';

export type FeatureId =
  | 'datetime-search'
  | 'egg-search'
  | 'pokemon-list'
  | 'egg-list'
  | 'mtseed-search'
  | 'tid-adjust'
  | 'needle'
  | 'about';

export const CATEGORIES: readonly CategoryDef[] = [
  // ... 既存3カテゴリ
  {
    id: 'about',
    features: ['about'],
    defaultFeature: 'about',
  },
] as const;
```

### 4.2 About ページコンポーネント

```tsx
// src/features/about/components/about-page.tsx
import { Trans } from '@lingui/react/macro';

export function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4">
      <section>
        <h2 className="text-lg font-semibold">
          <Trans>About this app</Trans>
        </h2>
        {/* アプリ概要 */}
      </section>

      <section>
        <h2 className="text-lg font-semibold">
          <Trans>Data sources</Trans>
        </h2>
        {/* 出典リンク */}
      </section>

      <section>
        <h2 className="text-lg font-semibold">
          <Trans>License</Trans>
        </h2>
        {/* ライセンス情報 */}
      </section>

      <section>
        <h2 className="text-lg font-semibold">
          <Trans>Disclaimer</Trans>
        </h2>
        {/* 免責事項 */}
      </section>
    </div>
  );
}
```

### 4.3 feature-content.tsx の変更

```tsx
case 'about':
  return <AboutPage />;
```

## 5. テスト方針

| テスト種別 | 対象 | 検証内容 |
|------------|------|----------|
| コンポーネントテスト | `AboutPage` | 各セクション見出しの描画、外部リンクの存在 |
| コンポーネントテスト | `BottomNav` | about カテゴリタブの描画・クリック遷移 |

## 6. 実装チェックリスト

- [ ] `navigation.ts` に `'about'` カテゴリ・Feature 追加
- [ ] `src/features/about/` ディレクトリ作成
- [ ] `AboutPage` コンポーネント実装
- [ ] `feature-content.tsx` に case 追加
- [ ] `bottom-nav.tsx` / `header.tsx` にアイコン・ラベル追加
- [ ] `navigation-labels.tsx` にラベル追加
- [ ] FeatureTabs の単一 feature 時の非表示対応
- [ ] i18n メッセージ追加 (`pnpm lingui:extract` → 翻訳 → `pnpm lingui:compile`)
- [ ] コンポーネントテスト追加
