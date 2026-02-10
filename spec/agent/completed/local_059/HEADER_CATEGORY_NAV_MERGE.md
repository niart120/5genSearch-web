# PC 版 CategoryNav ヘッダー統合 仕様書

## 1. 概要

### 1.1 目的

PC 版 (`lg+`) で独立コンポーネントとして表示されている `CategoryNav` を `Header` に統合し、画面上部のナビゲーション帯を 3 段 (Header + CategoryNav + FeatureTabs) から 2 段 (Header + FeatureTabs) に削減する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| CategoryNav | カテゴリ切替 (検索 / 個体生成 / ツール) を行う水平ナビゲーション。PC 版で表示、モバイルでは非表示 |
| BottomNav | モバイル版でカテゴリ切替を行うフッターナビゲーション。PC 版では非表示 |
| FeatureTabs | カテゴリ内の機能切替タブ (起動時刻検索 / 孵化検索 等)。Radix Tabs の TabsList |
| Header | アプリ最上部のヘッダーバー。ブランド名 + ユーティリティ (言語・テーマ切替) |

### 1.3 背景・問題

- Header + CategoryNav + FeatureTabs の 3 段の水平バンドが画面上部に連続し、コンテンツ領域を圧迫する (Header 48px + CategoryNav 40px + FeatureTabs 36px = 124px)
- CategoryNav と FeatureTabs が視覚的に同じ「水平タブ」に見え、2 つの選択の親子関係をユーザが直感的に読み取りにくい
- GitHub (リポジトリ内タブ)、Jira (プロジェクト内タブ) など、一般的な Web アプリでは第 1 層ナビゲーションをヘッダーに統合し、コンテンツ内タブは 1 段のみとするパターンが主流

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| 画面上部の帯削減 | 3 段 → 2 段。40px のコンテンツ領域拡大 |
| ナビゲーション階層の明確化 | Header 内のカテゴリ選択 (第 1 層) とコンテンツ内の FeatureTabs (第 2 層) が視覚的に区別される |

### 1.5 着手条件

- [x] ナビゲーション構造 (local_053) 完了
- [x] サイドバー左端固定 (local_058) 完了

## 2. 対象ファイル

### 2.1 実装ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `src/components/layout/header.tsx` | 変更 | PC 版でカテゴリナビゲーションを Header 内に統合表示 |
| `src/components/layout/category-nav.tsx` | 削除 | 役割が Header に統合されるため不要 |
| `src/app.tsx` | 変更 | `<CategoryNav />` の呼び出しを削除。カテゴリ切替のコールバックを Header に渡す |
| `src/components/layout/navigation-labels.tsx` | 変更なし | `CATEGORY_LABELS` は Header から引き続き参照 |
| `src/components/layout/bottom-nav.tsx` | 変更なし | モバイル版のカテゴリ切替は BottomNav がそのまま担当 |

### 2.2 テストファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `src/test/components/layout/header.test.tsx` | 変更 | カテゴリナビゲーション表示のテスト追加 |
| `src/test/components/layout/category-nav.test.tsx` | 削除 | コンポーネント削除に伴い不要 |

### 2.3 アーキテクチャドキュメント

| ファイル | 変更箇所 | 変更内容 |
|---------|---------|---------|
| `spec/agent/architecture/responsive-design.md` | Section 4.2 PC レイアウト | レイアウト図から CategoryNav 行を削除、Header にカテゴリナビを含める |
| `spec/agent/architecture/design-system.md` | Section 5.5 PC 版 1 画面レイアウト | レイアウト図を更新 |
| `spec/agent/architecture/frontend-structure.md` | コンポーネント一覧 | `category-nav.tsx` 削除を反映 |

## 3. 設計方針

### 3.1 レイアウト構造の変更

#### 変更前 (3 段)

```
┌─ Header: 5genSearch ────────────── ja 🌙 ─┐  48px
├───────── 検索 │ 個体生成 │ ツール ─────────┤  40px  ← CategoryNav
├──────────┬─ 起動時刻検索 │ 孵化検索 ──────┤  36px  ← FeatureTabs
│ Sidebar  │ Content                        │
└──────────┴────────────────────────────────┘
```

#### 変更後 (2 段)

```
┌─ 5genSearch ─ 検索 │ 個体生成 │ ツール ── ja 🌙 ─┐  48px  ← Header + Category
├──────────┬─ 起動時刻検索 │ 孵化検索 ──────────────┤  36px  ← FeatureTabs
│ Sidebar  │ Content                                │
└──────────┴────────────────────────────────────────┘
```

- カテゴリナビゲーションを Header 内部に配置
- Header の高さは 48px を維持 (カテゴリ選択ボタンを既存ヘッダー要素と同じ行に並べる)
- FeatureTabs はメインコンテンツ内の唯一のタブとなり、役割が明確化

### 3.2 Header 内部のレイアウト

```
┌─────────────────────────────────────────────────┐
│ ☰ 5genSearch    [検索] [個体生成] [ツール]    ja 🌙 │
│ ↑ モバイルのみ    ↑ PC のみ (lg:flex)                │
└─────────────────────────────────────────────────┘
```

- 左: ハンバーガー (モバイルのみ) + ブランド名
- 中央: カテゴリ選択ボタン群 (PC のみ、`hidden lg:flex`)
- 右: 言語切替 + テーマ切替

### 3.3 モバイル版への影響

モバイル版では:
- Header: ブランド名 + ハンバーガー + ユーティリティ (変更なし)
- BottomNav: カテゴリ切替 (変更なし)
- FeatureTabs: 機能切替 (変更なし)

CategoryNav はモバイルで元々 `hidden` のため、削除による影響なし。

## 4. 実装仕様

### 4.1 `header.tsx` の変更

```tsx
interface HeaderProps {
  onMenuClick?: () => void;
}

function Header({ onMenuClick }: HeaderProps) {
  const activeCategory = useUiStore((s) => s.activeCategory);
  const setActiveCategory = useUiStore((s) => s.setActiveCategory);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 lg:px-6">
      {/* 左: ハンバーガー (モバイルのみ) + ブランド名 */}
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </button>
        )}
        <h1 className="text-sm font-medium">
          <Trans>5genSearch</Trans>
        </h1>
      </div>

      {/* 中央: カテゴリナビゲーション (PC のみ) */}
      <nav
        aria-label="Category navigation"
        className="hidden items-center gap-1 lg:flex"
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat.id === activeCategory;
          const Label = CATEGORY_LABELS[cat.id];
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'inline-flex h-8 items-center rounded-sm px-3 text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <Label />
            </button>
          );
        })}
      </nav>

      {/* 右: ユーティリティ */}
      <div className="flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
```

### 4.2 `app.tsx` の変更

```tsx
function App() {
  // ... 既存の state/store

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      {/* CategoryNav を削除 */}
      <Tabs ...>
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

### 4.3 `category-nav.tsx` の削除

コンポーネント全体を削除する。`CATEGORY_LABELS` と `CATEGORIES` は `navigation-labels.tsx` / `navigation.ts` に残るため、Header と BottomNav から引き続き参照可能。

## 5. テスト方針

### 5.1 変更対象テスト

| テスト | 変更内容 |
|--------|---------|
| `header.test.tsx` | PC 表示時にカテゴリナビゲーションが表示されることを検証。カテゴリクリックで切替が動作することを検証 |
| `category-nav.test.tsx` | ファイル削除 |

### 5.2 目視確認

| 幅 | 確認項目 |
|-----|---------|
| 375px | Header にカテゴリ表示なし。BottomNav でカテゴリ切替が動作 |
| 1024px | Header 内にカテゴリ表示。FeatureTabs がメインコンテンツ上部に1段のみ |
| 1920px | 同上。カテゴリ選択がヘッダー中央に表示 |

## 6. 実装チェックリスト

- [x] `header.tsx` にカテゴリナビゲーションを統合
- [x] `app.tsx` から `<CategoryNav />` を削除
- [x] `category-nav.tsx` を削除
- [x] `category-nav.test.tsx` を削除
- [x] `header.test.tsx` にカテゴリナビゲーションのテストを追加
- [x] `responsive-design.md` のレイアウト図を更新
- [x] `design-system.md` のレイアウト図を更新
- [x] `frontend-structure.md` のコンポーネント一覧を更新
- [x] 各ブレークポイントでの目視確認完了
- [x] `pnpm test:run` で全テスト通過
