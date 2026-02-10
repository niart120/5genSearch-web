# レスポンシブ対応

マルチデバイス対応の設計方針を定義する。

## 1. 設計目標

1. **PC・モバイル両対応**: 主要ユースケースを両デバイスでサポート
2. **一貫した UX**: デバイス間で操作体験の整合性を維持
3. **保守性**: コード重複を最小化

## 2. アプローチ選定

### 2.1 候補

| アプローチ | 説明 | メリット | デメリット |
|-----------|------|----------|------------|
| Tailwind ブレークポイント | 単一コンポーネント内で分岐 | 実装がシンプル | 複雑な分岐で可読性低下 |
| レスポンシブ HOC | レイアウトコンポーネントを差し替え | 構造の分離が明確 | 抽象化コスト |
| 別ページ/ルート | PC版・モバイル版を完全分離 | 最大の柔軟性 | コード重複が大きい |

### 2.2 採用方針

**ハイブリッドアプローチ**を採用：

1. **Tailwind ブレークポイント**: スタイル差異や軽量要素の表示/非表示
2. **`useMediaQuery` フック**: DOM 構造が大きく異なる場合の条件レンダリング、JS レベルの挙動分岐

### 2.3 判断基準

| 条件 | 手段 | 例 |
|-----|------|-----|
| スタイルの差異のみ (余白、サイズ、grid 列数) | Tailwind ブレークポイント | `px-4 lg:px-6`, `grid-cols-1 lg:grid-cols-2` |
| 軽量要素の表示/非表示 | Tailwind `hidden lg:block` | ハンバーガーボタン、PC 版 Sidebar |
| DOM 構造が異なり、両方レンダリングがコストになる | `useMediaQuery` で条件レンダリング | 検索結果テーブル ↔ カード |
| JS レベルの挙動分岐が必要 | `useMediaQuery` | モバイルで検索実行後に Sheet 自動閉じ 等 |

#### 選定理由

- **Tailwind 統一を不採用の理由**: 検索結果のテーブル/カード切替のように DOM 構造が完全に異なるケースで、両方をレンダリングして `hidden` で隠すのは DOM コストが大きい
- **`useMediaQuery` 統一を不採用の理由**: `px-4 lg:px-6` 程度の単純なスタイル差異まで JS 条件分岐にするのは冗長。ブレークポイント値の二重管理 (Tailwind 設定 + JS ハードコード) も生じる

## 3. ブレークポイント定義

Tailwind のデフォルトブレークポイントを使用：

| Prefix | 最小幅 | 対象デバイス |
|--------|-------|------------|
| (default) | 0px | モバイル |
| `sm` | 640px | 大型スマホ |
| `md` | 768px | タブレット |
| `lg` | 1024px | PC |
| `xl` | 1280px | 大型PC |

**設計原則**: モバイルファースト

## 4. レイアウトパターン

### 4.1 共通レイアウト

```
┌─────────────────────────────────────┐
│            Header                    │
├─────────────────────────────────────┤
│                                      │
│            Main Content              │
│                                      │
├─────────────────────────────────────┤
│            Footer (optional)         │
└─────────────────────────────────────┘
```

### 4.2 PC レイアウト

```
┌─ Header: 5genSearch [検索|個体生成|ツール] ja ◑ ────┐  ─┐
├──────────┬────────────────────────────────────────────┤   │
│          │ FeatureTabs                                    │   │
│ Settings ├──────────────────┬─────────────────────────┤   │
│ (Sidebar)│ Controls         │ Results                 │   │ 100dvh
│ 左端固定  │ (内部スクロール)  │ (DataTable)              │   │
│          │ lg:w-[28rem]     │ flex-1                  │   │
│          │                  │ (内部スクロール)          │   │
├──────────┴──────────────────┴─────────────────────────┤   │
│ Footer (optional)                                       │  ─┘
└───────────────────────────────────────────────────────┘
↑ Sidebar   ├─ Controls ─┤├── Results (flex-1) ──┤
             FeatureContent (残り幅全体)
```

カテゴリナビゲーション (検索 / 個体生成 / ツール) は Header 内に統合されている (`hidden lg:flex`)。
サイドバーはビューポート左端に固定され、メインコンテンツは残り幅を全て使用する。グローバルな `max-width` 制約は設けない。

FeatureContent 内部は `FeaturePageLayout` により Controls / Results の 2 ペインに分割される。詳細は [デザインシステム](./design-system.md) セクション 5.5.1 を参照。

### 4.3 モバイルレイアウト

```
┌─────────────────────────────────────┐
│            Header (☰ DS 設定)        │
├─────────────────────────────────────┤
│ FeatureTabs                          │
├─────────────────────────────────────┤
│                                      │
│         Main Content                 │
│         (scroll area)                │
│         pb-32 で下部バー分余白        │
│                                      │
├─────────────────────────────────────┤
│ BottomNav: 🔍 📋 🔧                │  h-14
├─────────────────────────────────────┤  ← fixed bottom-14
│ [検索] SearchProgress [GPU]        │  ← 固定検索バー (lg:hidden)
└─────────────────────────────────────┘
```

モバイルでは検索ボタン・SearchProgress を画面下部に固定配置する。`fixed bottom-14 left-0 right-0 z-40 lg:hidden` で BottomNav (`h-14`) の上に重ねる。コンテンツ側は `pb-32 lg:pb-4` でバーとの重なりを防止する。

## 5. コンポーネント設計

### 5.1 レスポンシブ Container パターン

```tsx
// components/layout/responsive-container.tsx
interface ResponsiveContainerProps {
  sidebarContent?: ReactNode;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  topContent?: ReactNode;
  children?: ReactNode;
}

function ResponsiveContainer({
  sidebarContent,
  sidebarOpen,
  onSidebarOpenChange,
  topContent,
  children,
}: ResponsiveContainerProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* PC: 固定 Sidebar (左端固定) */}
      {sidebarContent && (
        <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
          <Sidebar>{sidebarContent}</Sidebar>
        </aside>
      )}

      {/* モバイル: Sheet Sidebar */}
      {sidebarContent && (
        <Sheet open={sidebarOpen} onOpenChange={onSidebarOpenChange}>
          <SheetContent side="left" className="w-4/5 max-w-xs p-0">
            <Sidebar>{sidebarContent}</Sidebar>
          </SheetContent>
        </Sheet>
      )}

      <main className="flex flex-1 flex-col overflow-hidden">
        {topContent && <div className="shrink-0">{topContent}</div>}
        <div className="flex-1 overflow-y-auto lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden">
          <div className="px-4 py-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:px-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
```

#### 高さ制約の伝播 (PC)

PC 版 (`lg+`) ではビューポート高さ内にコンテンツを収めるため、flex チェーンで高さ制約を伝播する。モバイルでは `overflow-y-auto` で通常スクロールとなる。

```
ResponsiveContainer (overflow-hidden)
  └ scroll area (lg: flex min-h-0 flex-col overflow-hidden)
    └ content inner (lg: flex min-h-0 flex-1 flex-col)
      └ TabsContent (lg: flex min-h-0 flex-1 flex-col)
        └ FeaturePageLayout (lg: min-h-0 flex-1 flex-row)
          ├ Controls (lg:w-[28rem] overflow-y-auto)
          └ Results (min-h-0 flex-1 overflow-hidden)
```

`lg:` では各レイヤーが `min-h-0` + `flex-1` + `flex-col` を繰り返すことで、`overflow-hidden` のルートから Results まで高さ制約が到達する。モバイルではこれらの `lg:` クラスが非適用となり、`overflow-y-auto` で通常縦スクロールとなる。

> **設計注意**: `overflow-y-auto` の親要素内で `h-full` を使うと Chrome/Firefox で高さ制約が切れる問題がある。`lg:` では `h-full` ではなく `min-h-0 flex-1` で高さを制御すること。

### 5.2 FeaturePageLayout パターン

`FeaturePageLayout` は `FeatureContent` 内で使用され、Controls / Results の 2 ペイン構成を提供する Compound Component。

```tsx
// components/layout/feature-page-layout.tsx
const ControlsSlot = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn(
    'flex flex-col gap-4 lg:w-[28rem] lg:shrink-0 lg:overflow-y-auto lg:pr-2',
    className,
  )}>
    {children}
  </div>
);

const ResultsSlot = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-hidden', className)}>
    {children}
  </div>
);

function FeaturePageLayout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-4 p-4 lg:min-h-0 lg:flex-1 lg:flex-row', className)}>
      {children}
    </div>
  );
}

FeaturePageLayout.Controls = ControlsSlot;
FeaturePageLayout.Results = ResultsSlot;
```

| デバイス | 動作 |
|---------|------|
| PC (`lg+`) | `flex-row`: Controls (`lg:w-[28rem]` 固定幅) + Results (`flex-1`) の横 2 ペイン |
| モバイル (`< lg`) | `flex-col`: Controls → Results の縦積み。1 画面制約なし |

Controls ペインの幅は `lg:w-[28rem]` (28rem = 448px) で統一。

### 5.2.1 デュアルレンダーパターン

検索ボタン・進捗バーなど、PC とモバイルで配置が異なる要素は 2 箇所に描画する:

| デバイス | 配置 | CSS | 備考 |
|---------|------|-----|------|
| PC | Controls ペイン先頭 | `hidden lg:flex lg:flex-col lg:gap-2` | フロー内配置 |
| モバイル | 画面下部固定バー | `fixed bottom-14 left-0 right-0 z-40 lg:hidden` | BottomNav の上 |

ページコンポーネントは `FeaturePageLayout` に `className="pb-32 lg:pb-4"` を渡し、モバイルで固定バーとコンテンツが重ならないよう余白を確保する。

```tsx
// 使用例
function SomePage() {
  return (
    <>
      <FeaturePageLayout className="pb-32 lg:pb-4">
        <FeaturePageLayout.Controls>
          <div className="hidden lg:flex lg:flex-col lg:gap-2">
            <SearchButton />
            <SearchProgress />
          </div>
          {/* フォーム内容 */}
        </FeaturePageLayout.Controls>
        <FeaturePageLayout.Results>
          <DataTable />
        </FeaturePageLayout.Results>
      </FeaturePageLayout>

      {/* モバイル固定検索バー */}
      <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-border bg-background p-3 lg:hidden">
        <SearchProgress />
        <SearchButton />
      </div>
    </>
  );
}
```

### 5.3 条件付きレンダリング

```tsx
// hooks/use-media-query.ts
// useSyncExternalStore を使用。
// useState + useEffect パターンでは effect 内の setState が
// react-hooks/set-state-in-effect ルールに抵触するため。
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// 使用例
function ResultsView({ results }: Props) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  return isDesktop 
    ? <ResultsTable results={results} />
    : <ResultsCards results={results} />;
}
```

## 6. テスト方針

### 6.1 ブレークポイントテスト

- [ ] 320px (iPhone SE)
- [ ] 375px (iPhone 12)
- [ ] 768px (iPad)
- [ ] 1024px (iPad Pro / 小型PC)
- [ ] 1440px (一般的なPC)

### 6.2 検証ツール

- Chrome DevTools Device Mode
- 実機確認 (iOS Safari, Android Chrome)

## 7. 検討事項

- [ ] 結果テーブルの横スクロール vs カード切り替え判断
- [ ] PWA 対応の必要性
