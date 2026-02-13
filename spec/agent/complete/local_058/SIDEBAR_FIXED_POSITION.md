# PC 版サイドバー固定配置 仕様書

## 1. 概要

### 1.1 目的

PC 版 (`lg+`) のサイドバー (DS 設定) をビューポート左端に固定し、メインコンテンツはサイドバー右側の残り幅を全て使う構成に変更する。ウィンドウ幅に関わらずサイドバーの左端位置が安定する操作体験を実現する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| サイドバー (Sidebar) | DS 設定と GameStartConfig を表示する左サイドパネル。PC 版で常時表示 |
| メインコンテンツ | FeatureTabs + 検索フォーム + 結果テーブルを含む右側の主要表示領域 |
| `ResponsiveContainer` | サイドバーとメインコンテンツを統合するレイアウトコンポーネント |

### 1.3 背景・問題

- 現在、サイドバーとメインコンテンツは `max-w-screen-xl mx-auto` (1280px 中央寄せ) のコンテナ内部に配置されている
- ウィンドウ幅が 1280px を超えると左右に余白が生まれ、サイドバーの左端位置がウィンドウ幅に応じて動的に右方向へ移動する
- VS Code のエクスプローラーや OS の設定画面と異なり、操作パネルの位置が安定せず、ユーザビリティが低下する
- 1920px (Full HD 100%) では左余白 320px、2560px (WQHD) では左余白 640px に達する

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| サイドバー位置の安定化 | ウィンドウ幅に関わらずサイドバーが左端に固定される |
| メインコンテンツの全幅活用 | メインコンテンツはサイドバー右側の残り幅を全て使い、テーブルやフォームの表示領域を最大化する |

### 1.5 着手条件

- [x] レイアウト基盤 (Phase 1.6) 完了
- [x] レスポンシブ対応 (Phase 2.3) 完了

## 2. 対象ファイル

### 2.1 実装ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `src/components/layout/responsive-container.tsx` | 変更 | 外枠の `max-w-screen-xl mx-auto` を削除し、サイドバーを左端固定化 |

### 2.2 アーキテクチャドキュメント

| ファイル | 変更箇所 | 変更内容 |
|---------|---------|---------|
| `spec/agent/architecture/responsive-design.md` | Section 4.2 PC レイアウト | レイアウト図のサイドバー配置を更新 |
| `spec/agent/architecture/responsive-design.md` | Section 5.1 ResponsiveContainer | コード例を更新 |
| `spec/agent/architecture/design-system.md` | Section 5.2 コンテンツ幅の制約 | `max-w-screen-xl` のグローバル制約を廃止し、コンポーネント単位の制約方針に変更 |
| `spec/agent/architecture/design-system.md` | Section 5.4 崩れ防止の方針 | 超広幅対策の記述を更新 |
| `spec/agent/architecture/design-system.md` | Section 5.5 PC 版 1 画面レイアウト | レイアウト図を更新 |

### 2.3 WIP 仕様書

| ファイル | 影響有無 | 変更内容 |
|---------|---------|---------|
| `spec/agent/wip/local_054/DATETIME_SEARCH.md` | 影響なし | FeatureContent 内の構成であり、外枠レイアウトの変更は影響しない |
| `spec/agent/wip/local_055/EGG_SEARCH.md` | 影響なし | 同上 |

## 3. 設計方針

### 3.1 レイアウト構造の変更

#### 変更前

```
┌─ max-w-screen-xl mx-auto ──────────────────┐
│ ┌─ aside ──┐ ┌─ main ────────────────────┐ │
│ │ Sidebar  │ │ FeatureTabs              │ │
│ │ (w-64)   │ │ Content (scroll)         │ │
│ └──────────┘ └───────────────────────────┘ │
└────────────────────────────────────────────┘
         ← mx-auto で左右均等余白 →
```

- `max-w-screen-xl mx-auto` がサイドバーを含む全体に適用されている
- ウィンドウ幅 > 1280px でサイドバーが画面中央方向に寄る

#### 変更後

```
┌─ aside ──┐ ┌─ main (flex-1) ──────────────────┐
│ Sidebar  │ │ FeatureTabs                        │
│ (w-64)   │ │ Content (scroll)                   │
│ 左端固定  │ │                                    │
└──────────┘ └──────────────────────────────────┘
↑ 常に左端    ← 残り幅を全て使用 →
```

- サイドバーは `max-width` コンテナの外に配置し、左端に固定
- メインコンテンツはグローバルな `max-width` 制約を持たず、`flex-1` で残り幅を全て使用
- VS Code / Slack / Discord 等のワークベンチ型アプリと同様の構成
- 個別コンポーネント (フォーム、テキスト段落等) が必要に応じて自身の `max-width` を設定する

### 3.2 実装アプローチの選択肢

#### A案: `ResponsiveContainer` 内部の構造変更

`max-w-screen-xl mx-auto` を外枠の `div` から `main` 要素に移動する。

```tsx
function ResponsiveContainer({ ... }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* PC: Sidebar — 左端固定 */}
      {sidebarContent && (
        <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
          <Sidebar>{sidebarContent}</Sidebar>
        </aside>
      )}

      {/* モバイル: Sheet Sidebar (変更なし) */}
      ...

      {/* メインコンテンツ — グローバル max-width なし */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {topContent && <div className="shrink-0">{topContent}</div>}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 lg:px-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
```

#### B案: レイアウトの分離 (`app.tsx` レベル)

サイドバーを `ResponsiveContainer` から分離し、`app.tsx` で直接配置する。

```tsx
// app.tsx
<div className="flex h-dvh flex-col overflow-hidden">
  <Header onMenuClick={() => setSidebarOpen(true)} />
  <CategoryNav />
  <Tabs ... className="flex flex-1 flex-col overflow-hidden">
    <div className="flex flex-1 overflow-hidden">
      {/* PC Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
        <Sidebar>{sidebarContent}</Sidebar>
      </aside>
      {/* Mobile Sheet */}
      <MobileSidebar ... />
      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <FeatureTabs />
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 lg:px-6">
            <FeatureContent />
          </div>
        </div>
      </main>
    </div>
  </Tabs>
  <BottomNav />
</div>
```

### 3.3 採用: A案

| 観点 | A案 | B案 |
|------|-----|-----|
| 変更範囲 | `responsive-container.tsx` のみ | `app.tsx` + `responsive-container.tsx` (分割) |
| 責務の維持 | `ResponsiveContainer` がレスポンシブ制御を一元管理 | レイアウト知識が `app.tsx` に漏れる |
| モバイル Sheet との整合 | Sheet 処理も `ResponsiveContainer` 内に残る | Sheet を別コンポーネントに分離する必要がある |

A案は `ResponsiveContainer` の内部構造のみの変更で完結し、外部インターフェース (`ResponsiveContainerProps`) に変更がない。

### 3.4 メインコンテンツの幅制約方針

ワークベンチ型アプリ (VS Code, Slack, Discord 等) に倣い、メインコンテンツにグローバルな `max-width` 制約を設けない。

| 項目 | 方針 | 備考 |
|------|------|------|
| メインコンテンツ全体 | `max-width` なし。`flex-1` で残り幅を全て使用 | テーブル・フォームの表示領域を最大化する |
| 個別コンポーネント | 必要に応じてコンポーネント単位で制約 | 例: フォームの `max-w-2xl`、テキスト段落の `max-w-prose` |

**理由**: 本アプリのメインコンテンツは検索フォームと結果テーブルで構成される。テーブルは幅が広いほど列の視認性が向上し、フォームは `grid-cols` で自然にレイアウトされるため、グローバルな幅制約は不要。

### 3.5 各ウィンドウ幅での挙動

| ウィンドウ幅 | サイドバー表示 | メインコンテンツ幅 | 右余白 |
|------------|--------------|-------------------|-------|
| < 1024px | 非表示 (Sheet) | 100% | なし |
| 1024px | 表示 (256px) | 768px (= 1024 - 256) | なし |
| 1280px | 表示 (256px) | 1024px | なし |
| 1536px | 表示 (256px) | 1280px | なし |
| 1920px | 表示 (256px) | 1664px | なし |
| 2560px | 表示 (256px) | 2304px | なし |

### 3.6 モバイル版への影響

モバイル版 (`< lg`) ではサイドバーが `hidden` のため、メインコンテンツが全幅を占有する。`max-w-screen-xl mx-auto` の削除は `< 1280px` の環境では視覚的変化なし。

## 4. 実装仕様

### 4.1 `responsive-container.tsx` の変更

```tsx
function ResponsiveContainer({
  sidebarContent,
  sidebarOpen,
  onSidebarOpenChange,
  topContent,
  children,
}: ResponsiveContainerProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* PC: Sidebar (max-width コンテナの外) */}
      {sidebarContent && (
        <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
          <Sidebar>{sidebarContent}</Sidebar>
        </aside>
      )}

      {/* モバイル: Sheet Sidebar */}
      {sidebarContent && (
        <Sheet open={sidebarOpen} onOpenChange={onSidebarOpenChange}>
          <SheetContent side="left" className="w-4/5 max-w-xs p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>
                <Trans>Settings</Trans>
              </SheetTitle>
            </SheetHeader>
            <Sidebar>{sidebarContent}</Sidebar>
          </SheetContent>
        </Sheet>
      )}

      {/* メインコンテンツ */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {topContent && <div className="shrink-0">{topContent}</div>}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 lg:px-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
```

変更点:

1. 外枠 `div` から `mx-auto max-w-screen-xl` を削除
2. `main` 内の `max-w-screen-xl` コンテナも不要。`flex-1` で残り幅を全て使用

## 5. テスト方針

### 5.1 検証方法

| 検証 | 方法 |
|------|------|
| レイアウト目視確認 | Chrome DevTools で 1024px / 1280px / 1920px / 2560px 幅に切り替えて確認 |
| サイドバー位置 | ウィンドウ幅を変えてもサイドバー左端が移動しないことを確認 |
| メインコンテンツ幅 | 全ブレークポイントでメインコンテンツが残り幅を全て使い切っていることを確認 |
| モバイル表示 | 1024px 未満でサイドバーが非表示、Sheet 動作に影響がないことを確認 |
| 既存テスト | `pnpm test:run` で全テスト通過を確認 |

### 5.2 ブレークポイントテスト (目視チェックリスト)

| 幅 | 確認項目 |
|-----|---------|
| 320px | サイドバー非表示。Sheet 正常動作 |
| 768px | サイドバー非表示。Sheet 正常動作 |
| 1024px | サイドバー左端固定表示。メインコンテンツが残り幅を占有 |
| 1280px | サイドバー左端固定。メインコンテンツ 1024px |
| 1536px | サイドバー左端固定。メインコンテンツ 1280px |
| 1920px | サイドバー左端固定。メインコンテンツ 1664px |

## 6. 実装チェックリスト

- [x] `responsive-container.tsx` の外枠 `div` から `mx-auto max-w-screen-xl` を削除
- [x] `responsive-design.md` Section 4.2 のレイアウト図を更新
- [x] `responsive-design.md` Section 5.1 のコード例を更新
- [x] `design-system.md` Section 5.2 の `max-w-screen-xl` 説明をコンポーネント単位の制約方針に修正
- [x] `design-system.md` Section 5.4 の超広幅対策を更新
- [x] `design-system.md` Section 5.5 のレイアウト図を更新
- [x] 各ブレークポイントでの目視確認完了
- [x] `pnpm test:run` で全テスト通過
