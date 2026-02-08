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
┌─────────────────────────────────────┐
│            Header                    │
├──────────┬──────────────────────────┤
│          │                          │
│ Settings │      Search Form         │
│ (Sidebar)│      Results Table       │
│          │                          │
└──────────┴──────────────────────────┘
```

### 4.3 モバイルレイアウト

```
┌─────────────────────────────────────┐
│            Header (Hamburger)        │
├─────────────────────────────────────┤
│         Search Form (Accordion)      │
├─────────────────────────────────────┤
│         Results (Cards/List)         │
└─────────────────────────────────────┘
```

## 5. コンポーネント設計

### 5.1 レスポンシブ Container パターン

```tsx
// components/layout/ResponsiveContainer.tsx
interface ResponsiveContainerProps {
  sidebar?: ReactNode;
  main: ReactNode;
}

function ResponsiveContainer({ sidebar, main }: ResponsiveContainerProps) {
  return (
    <div className="flex flex-col lg:flex-row">
      {/* モバイル: 非表示 or アコーディオン */}
      {sidebar && (
        <aside className="hidden lg:block lg:w-64 lg:shrink-0">
          {sidebar}
        </aside>
      )}
      <main className="flex-1">{main}</main>
    </div>
  );
}
```

### 5.2 条件付きレンダリング

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
