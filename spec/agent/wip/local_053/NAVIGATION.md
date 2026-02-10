# ナビゲーション 仕様書

## 1. 概要

### 1.1 目的

アプリケーションの機能切り替え構造を実装する。2 層ナビゲーション (カテゴリ + 機能タブ) により Phase 3 の全機能を分類・配置する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| カテゴリ (Category) | 第 1 層のナビゲーション単位。検索・個体生成・ツールの 3 分類 |
| 機能 (Feature) | 第 2 層のナビゲーション単位。各カテゴリ内に 1 つ以上存在する |
| CategoryNav | PC 向け第 1 層ナビゲーション。Header 直下の水平タブバー |
| BottomNav | モバイル向け第 1 層ナビゲーション。画面下部のアイコン付きナビバー |
| FeatureTabs | 第 2 層ナビゲーション。メインエリア上部のインラインタブ |
| FeatureContent | アクティブ機能に応じたコンテンツを描画するルーティングコンポーネント |

### 1.3 背景・問題

Phase 3 では複数の検索・生成機能を順次実装する。現状のアプリは `WelcomePage` のみを描画しており、機能間の切り替え構造が存在しない。各機能を実装する前に、共通のナビゲーション基盤を整備する必要がある。

URL ルーティング (`react-router` 等) は以下の理由で不採用:

- GitHub Pages SPA 制約 (`HashRouter` か `404.html` ハックが必要)
- 検索パラメータが多く URL 共有の実用性が低い
- 参照実装 (niart120/pokemon-gen5-initseed) も `appStore.activeTab` による状態管理のみ
- 外部依存の追加を回避

代替として Zustand persist による状態ベースのナビゲーションを採用する。リロード時にアクティブなカテゴリ・機能が自動復帰する。

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| 機能配置の拡張性 | Phase 3 全機能 (7 機能) をカテゴリ分類下に配置可能 |
| PC / モバイル対応 | PC: Header 直下タブ / モバイル: ボトムアイコンナビ |
| カテゴリ別機能記憶 | 最後に使った機能をカテゴリ単位で記憶し復帰 |
| インクリメンタルな機能追加 | 未実装機能はプレースホルダ表示。定義追加のみで配置可能 |

### 1.5 着手条件

- [x] Phase 1 基盤 (Worker, Store, i18n, デザインシステム) 完了
- [x] Phase 2 共通コンポーネント完了
- [x] DS 設定 (Phase 3.1) 完了

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `src/lib/navigation.ts` | 新規 | カテゴリ / 機能定義、マッピングユーティリティ (アイコン定義を含まない) |
| `src/stores/settings/ui.ts` | 変更 | ナビゲーション状態追加 (`activeCategory`, `activeFeature`, `featureMemory`) |
| `src/hooks/use-ui-settings.ts` | 変更 | ナビゲーション用セレクタ追加 |
| `src/components/layout/category-nav.tsx` | 新規 | PC 向けカテゴリタブ (Header 直下) |
| `src/components/layout/bottom-nav.tsx` | 新規 | モバイル向けボトムナビゲーション |
| `src/components/layout/feature-tabs.tsx` | 新規 | 第 2 層機能切り替えタブ |
| `src/components/layout/feature-content.tsx` | 新規 | アクティブ機能のコンテンツ描画ルーター |
| `src/components/layout/placeholder-page.tsx` | 新規 | 未実装機能のプレースホルダページ |
| `src/components/layout/responsive-container.tsx` | 変更 | `topContent` プロップ追加 (FeatureTabs 配置用) |
| `src/app.tsx` | 変更 | ナビゲーション構造の統合 |
| `src/components/layout/welcome-page.tsx` | 削除 | PlaceholderPage に置換 |

## 3. 設計方針

### 3.1 ナビゲーション構造

2 層構成:

- **第 1 層 (カテゴリ)**: 機能群の大分類。PC では Header 直下の水平タブ、モバイルではボトムナビ
- **第 2 層 (機能タブ)**: カテゴリ内の機能切り替え。メインエリア上部のインラインタブ

### 3.2 カテゴリ・機能一覧

| カテゴリ | カテゴリ ID | 機能 | 機能 ID | アイコン |
|---------|------------|------|---------|---------|
| 検索 | `search` | 起動時刻検索 | `datetime-search` | `Search` |
| | | 孵化検索 | `egg-search` | |
| 個体生成 | `generation` | 個体生成リスト | `generation-list` | `ListOrdered` |
| | | 孵化個体生成 | `egg-generation` | |
| ツール | `tools` | MT Seed 検索 | `mtseed-search` | `Wrench` |
| | | TID 調整 | `tid-adjust` | |
| | | 針読み | `needle` | |

各カテゴリのデフォルト機能: `datetime-search`, `generation-list`, `mtseed-search`。

### 3.3 状態管理

| 状態 | 型 | 永続化 | 備考 |
|------|-----|--------|------|
| `activeCategory` | `Category` | localStorage | 現在選択中のカテゴリ |
| `activeFeature` | `FeatureId` | localStorage | 現在選択中の機能 |
| `featureMemory` | `Partial<Record<Category, FeatureId>>` | localStorage | カテゴリ別に最後に選択した機能を記憶 |

カテゴリ切替時の挙動:

- `setActiveCategory(c)` → `featureMemory[c]` があればその機能に復帰、なければデフォルト機能を表示
- `setActiveFeature(f)` → `featureMemory[currentCategory] = f` を記録

### 3.4 レイアウト構成

#### PC (`lg` 以上)

```
┌──────────────────────────────────────────────┐
│ Header                                       │
├──────────────────────────────────────────────┤
│ CategoryNav: [検索 | 個体生成 | ツール]        │
├───────────┬──────────────────────────────────┤
│ Sidebar   │ FeatureTabs: [起動時刻 | 孵化]    │
│ (DS 設定) │ ┌────────────────────────────────┐│
│           │ │ FeatureContent                 ││
│           │ │ (scroll area)                  ││
│           │ └────────────────────────────────┘│
└───────────┴──────────────────────────────────┘
```

#### モバイル (`lg` 未満)

```
┌──────────────────────────┐
│ Header [☰ DS 設定]       │
├──────────────────────────┤
│ FeatureTabs: [起動時刻 | 孵化] │
├──────────────────────────┤
│                          │
│ FeatureContent           │
│ (scroll area)            │
│                          │
├──────────────────────────┤
│ BottomNav: 🔍 📋 🔧     │
└──────────────────────────┘
```

#### 高さ配分 (100dvh)

| 要素 | PC | モバイル |
|------|-----|---------|
| Header | 48px (`h-12`) | 48px |
| CategoryNav | ~40px (`h-10`) | なし (BottomNav で代替) |
| FeatureTabs | ~36px | ~36px |
| FeatureContent | 残り全域 (`flex-1`) | 残り全域 |
| BottomNav | なし | ~56px (`h-14`) |

PC 最小想定 (768px): 48 + 40 + 36 = 124px 固定 → コンテンツ 644px。
モバイル最小想定 (iPhone SE 667px): 48 + 36 + 56 = 140px 固定 → コンテンツ 527px。

### 3.5 ResponsiveContainer の変更方針

`<main>` 要素内を `flex-col` 構成に変更し、`FeatureTabs` をスクロール領域の外側 (固定) に配置する。

変更前:

```tsx
<main className="flex-1 overflow-y-auto">
  <div className="px-4 py-4 lg:px-6">{children}</div>
</main>
```

変更後:

```tsx
<main className="flex flex-1 flex-col overflow-hidden">
  {topContent && <div className="shrink-0">{topContent}</div>}
  <div className="flex-1 overflow-y-auto">
    <div className="px-4 py-4 lg:px-6">{children}</div>
  </div>
</main>
```

`topContent` プロップに `FeatureTabs` を渡すことで、タブがスクロールせず固定される。

### 3.6 翻訳方針

カテゴリ名・機能名は Lingui `<Trans>` マクロで管理する。ナビゲーション定義 (`lib/navigation.ts`) にはラベル文字列を含めず、コンポーネント層で翻訳を適用する。

## 4. 実装仕様

### 4.1 ナビゲーション定義 (`lib/navigation.ts`)

```typescript
/** 第 1 層: カテゴリ */
export type Category = 'search' | 'generation' | 'tools';

/** 第 2 層: 機能 ID */
export type FeatureId =
  | 'datetime-search'
  | 'egg-search'
  | 'generation-list'
  | 'egg-generation'
  | 'mtseed-search'
  | 'tid-adjust'
  | 'needle';

export interface CategoryDef {
  readonly id: Category;
  readonly features: readonly FeatureId[];
  readonly defaultFeature: FeatureId;
}

export const CATEGORIES: readonly CategoryDef[] = [
  {
    id: 'search',
    features: ['datetime-search', 'egg-search'],
    defaultFeature: 'datetime-search',
  },
  {
    id: 'generation',
    features: ['generation-list', 'egg-generation'],
    defaultFeature: 'generation-list',
  },
  {
    id: 'tools',
    features: ['mtseed-search', 'tid-adjust', 'needle'],
    defaultFeature: 'mtseed-search',
  },
] as const;

/** Category ID → CategoryDef */
export function getCategoryDef(id: Category): CategoryDef {
  const def = CATEGORIES.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown category: ${id}`);
  return def;
}

/** FeatureId → 所属 Category */
export function getCategoryByFeature(featureId: FeatureId): Category {
  const cat = CATEGORIES.find((c) => c.features.includes(featureId));
  if (!cat) throw new Error(`Unknown feature: ${featureId}`);
  return cat.id;
}

/** Category のデフォルト Feature を取得 */
export function getDefaultFeature(category: Category): FeatureId {
  return getCategoryDef(category).defaultFeature;
}
```

### 4.2 Store 変更 (`stores/settings/ui.ts`)

既存の `UiState` / `UiActions` にナビゲーション状態を追加する。

```typescript
import type { Category, FeatureId } from '../../lib/navigation';
import { getDefaultFeature } from '../../lib/navigation';

interface UiState {
  language: SupportedLocale;
  theme: Theme;
  activeCategory: Category;
  activeFeature: FeatureId;
  featureMemory: Partial<Record<Category, FeatureId>>;
}

interface UiActions {
  setLanguage: (language: SupportedLocale) => void;
  setTheme: (theme: Theme) => void;
  setActiveCategory: (category: Category) => void;
  setActiveFeature: (feature: FeatureId) => void;
  reset: () => void;
}

const DEFAULT_STATE: UiState = {
  language: 'ja',
  theme: getSystemTheme(),
  activeCategory: 'search',
  activeFeature: 'datetime-search',
  featureMemory: {},
};
```

アクション実装:

```typescript
setActiveCategory: (category) =>
  set((state) => ({
    activeCategory: category,
    activeFeature:
      state.featureMemory[category] ?? getDefaultFeature(category),
  })),

setActiveFeature: (feature) =>
  set((state) => ({
    activeFeature: feature,
    featureMemory: {
      ...state.featureMemory,
      [state.activeCategory]: feature,
    },
  })),
```

persist の `name`・`version` は据え置き。公開前のため migration は一切行わない (後方互換な追加のみ)。

### 4.3 CategoryNav (`components/layout/category-nav.tsx`)

PC 向けの第 1 層ナビゲーション。Header 直下に水平配置。

```typescript
function CategoryNav(): ReactElement;
```

| 項目 | 仕様 |
|------|------|
| HTML 構造 | `<nav aria-label="Category navigation">` + `<button>` per category |
| 表示制御 | `className="hidden lg:flex"` (PC のみ) |
| 各ボタン | カテゴリ名テキスト。アイコンは任意 |
| アクティブ状態 | `aria-current="true"` + 視覚的ハイライト (下線 or 背景色) |
| クリック | `setActiveCategory(category.id)` 呼び出し |
| 高さ | `h-10` (40px)。`border-b border-border` で下辺罫線 |
| Store 接続 | `useUiStore` から `activeCategory` / `setActiveCategory` を取得 |

### 4.4 BottomNav (`components/layout/bottom-nav.tsx`)

モバイル向けの第 1 層ナビゲーション。画面下部に固定配置。

```typescript
function BottomNav(): ReactElement;
```

| 項目 | 仕様 |
|------|------|
| HTML 構造 | `<nav aria-label="Category navigation">` + `<button>` per category |
| 表示制御 | `className="flex lg:hidden"` (モバイルのみ) |
| 各ボタン | アイコン + ラベル (小テキスト) の縦積み。カテゴリ → アイコンのマッピングはコンポーネント内で定義 |
| アクティブ状態 | `aria-current="true"` + テキスト/アイコン色変更 (`text-primary` vs `text-muted-foreground`) |
| クリック | `setActiveCategory(category.id)` 呼び出し |
| 高さ | `h-14` (56px)。`border-t border-border` で上辺罫線 |
| レイアウト | 3 カテゴリを均等配分 (`flex justify-around`) |

### 4.5 FeatureTabs (`components/layout/feature-tabs.tsx`)

第 2 層のインラインタブ。アクティブカテゴリの機能一覧を表示する。

```typescript
function FeatureTabs(): ReactElement | null;
```

| 項目 | 仕様 |
|------|------|
| UI 部品 | Radix `TabsList` + `TabsTrigger` (親の `Tabs` コンテキストを使用。`Tabs` ルートは App.tsx に配置) |
| タブ項目 | `getCategoryDef(activeCategory).features` を `map` |
| 非表示条件 | カテゴリ内の機能数が 1 の場合 `return null` |
| スタイル | `border-b border-border` で下辺罫線 |
| Store 接続 | `useUiStore` から `activeCategory` を取得。値同期は親 `Tabs` が担当 |

### 4.6 FeatureContent (`components/layout/feature-content.tsx`)

`activeFeature` に応じた機能ページコンポーネントを描画する。

```typescript
function FeatureContent(): ReactElement;
```

- Radix `TabsContent` を使用し、各機能に対応するパネルを描画する
- 親の `Tabs` コンテキストにより、`activeFeature` に一致する `TabsContent` のみがマウントされる
- 初期実装時点では全機能に `PlaceholderPage` を描画
- 各機能 spec 実装時に、対応する `TabsContent` 内を実際のページコンポーネントに差し替え

```tsx
import { CATEGORIES } from '@/lib/navigation';
import { TabsContent } from '@/components/ui/tabs';

// 初期実装 (本 spec 範囲)
function FeatureContent(): ReactElement {
  return (
    <>
      {CATEGORIES.flatMap((cat) =>
        cat.features.map((featureId) => (
          <TabsContent key={featureId} value={featureId} className="mt-0">
            {/* 各機能 spec で順次差し替え */}
            <PlaceholderPage featureId={featureId} />
          </TabsContent>
        ))
      )}
    </>
  );
}
```

### 4.7 PlaceholderPage (`components/layout/placeholder-page.tsx`)

未実装機能の仮表示ページ。

```typescript
interface PlaceholderPageProps {
  featureId: FeatureId;
}

function PlaceholderPage({ featureId }: PlaceholderPageProps): ReactElement;
```

- 機能名と「この機能は準備中です」メッセージを表示
- `<Trans>` でローカライズ対応

### 4.8 App.tsx 変更

```tsx
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeFeature = useUiStore((s) => s.activeFeature);
  const setActiveFeature = useUiStore((s) => s.setActiveFeature);

  const sidebarContent = (
    <div className="space-y-6">
      <DsConfigForm />
      <GameStartConfigForm />
    </div>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <CategoryNav />
      <Tabs
        value={activeFeature}
        onValueChange={(v) => setActiveFeature(v as FeatureId)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <ResponsiveContainer
          sidebarContent={sidebarContent}
          sidebarOpen={sidebarOpen}
          onSidebarOpenChange={setSidebarOpen}
          topContent={<FeatureTabs />}
        >
          <FeatureContent />
        </ResponsiveContainer>
      </Tabs>
      <BottomNav />
      <Toaster />
    </div>
  );
}
```

主な変更点:

1. `WelcomePage` → `FeatureContent` に差し替え
2. `CategoryNav` を Header 直下に追加 (PC のみ表示)
3. `BottomNav` を最下部に追加 (モバイルのみ表示)
4. `ResponsiveContainer` に `topContent={<FeatureTabs />}` を渡す
5. `Tabs` で `ResponsiveContainer` をラップし、`FeatureTabs` (TabsList) と `FeatureContent` (TabsContent) を Radix コンテキストで接続

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/`)

| テスト | 検証内容 |
|--------|---------|
| `navigation.test.ts` | `getCategoryDef`, `getCategoryByFeature`, `getDefaultFeature` の正当性。不正 ID でのエラー |
| `ui-store-navigation.test.ts` | `setActiveCategory` でのカテゴリ切替 + `featureMemory` 復帰。`setActiveFeature` での `featureMemory` 記録。デフォルト状態の検証 |

### 5.2 コンポーネントテスト (`src/test/components/`)

| テスト | 検証内容 |
|--------|---------|
| `category-nav.test.tsx` | 3 カテゴリ描画。クリックで `setActiveCategory` 呼出。アクティブ状態の視覚反映 |
| `bottom-nav.test.tsx` | 3 カテゴリのアイコン + ラベル描画。クリックイベント |
| `feature-tabs.test.tsx` | カテゴリに応じたタブ描画。タブ切替で `setActiveFeature` 呼出。機能 1 つの場合は非表示 |
| `feature-content.test.tsx` | 各 `FeatureId` に対応するコンテンツ描画 (初期は全 `PlaceholderPage`) |

## 6. 実装チェックリスト

### 定義・状態

- [ ] `lib/navigation.ts` — カテゴリ / 機能定義 + ユーティリティ関数 (アイコン定義を含まない)
- [ ] `stores/settings/ui.ts` — ナビゲーション状態追加 (name・version 据え置き)
- [ ] `hooks/use-ui-settings.ts` — ナビゲーションセレクタ追加

### レイアウトコンポーネント

- [ ] `components/layout/category-nav.tsx` — PC カテゴリタブ
- [ ] `components/layout/bottom-nav.tsx` — モバイルボトムナビ
- [ ] `components/layout/feature-tabs.tsx` — 機能切り替えタブ
- [ ] `components/layout/feature-content.tsx` — コンテンツルーティング
- [ ] `components/layout/placeholder-page.tsx` — 未実装機能プレースホルダ
- [ ] `components/layout/responsive-container.tsx` — `topContent` プロップ追加
- [ ] `components/layout/welcome-page.tsx` — 削除

### 統合

- [ ] `app.tsx` — ナビゲーション構造統合

### テスト

- [ ] `test/unit/navigation.test.ts` — 定義ユーティリティ
- [ ] `test/unit/ui-store-navigation.test.ts` — Store ナビゲーション状態
- [ ] `test/components/category-nav.test.tsx` — PC カテゴリタブ
- [ ] `test/components/bottom-nav.test.tsx` — モバイルボトムナビ
- [ ] `test/components/feature-tabs.test.tsx` — 機能タブ
- [ ] `test/components/feature-content.test.tsx` — コンテンツルーティング

### 後続タスク (アーキテクチャドキュメント更新)

- [ ] `spec/agent/architecture/responsive-design.md` — レイアウト図・`ResponsiveContainerProps` 定義の更新
- [ ] `welcome-page.tsx` 削除後に `lingui extract` で未使用翻訳キーを確認・整理
