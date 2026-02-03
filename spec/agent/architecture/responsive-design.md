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

1. **基本**: Tailwind ブレークポイントによる単一コンポーネント内分岐
2. **複雑なレイアウト差異**: レスポンシブ HOC / Container で差し替え

### 2.3 判断基準

| 条件 | アプローチ |
|-----|----------|
| 表示/非表示の切り替えのみ | Tailwind `hidden md:block` |
| スタイルの差異 (余白、サイズ) | Tailwind ブレークポイント |
| レイアウト構造が異なる | Container コンポーネント分離 |

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
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  
  return matches;
}

// 使用例
function ResultsView({ results }: Props) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  return isDesktop 
    ? <ResultsTable results={results} />
    : <ResultsCards results={results} />;
}
```

## 6. 機能別対応方針

| 機能 | PC 表示 | モバイル表示 |
|-----|--------|-------------|
| DS 設定 | サイドバー常設 | ドロワー or 別ページ |
| 検索フォーム | 横並び入力 | 縦積み入力 |
| 検索結果 | テーブル (横スクロール可) | カード形式 |
| 進捗表示 | インライン | フローティング |
| エクスポート | ボタン | FAB or メニュー内 |

## 7. 入力 UI の考慮

### 7.1 モバイル特有の課題

| 課題 | 対策 |
|-----|------|
| 数値入力が煩雑 | Native number input + ステッパー |
| 日付入力 | Native date picker 優先 |
| 複数選択 | チェックボックスリスト or タグ選択 |
| MAC アドレス入力 | 6分割入力 or QR スキャン (将来) |

### 7.2 タッチ操作

- タップ領域は最低 44x44px
- スワイプジェスチャーは必須機能には使わない

## 8. テスト方針

### 8.1 ブレークポイントテスト

- [ ] 320px (iPhone SE)
- [ ] 375px (iPhone 12)
- [ ] 768px (iPad)
- [ ] 1024px (iPad Pro / 小型PC)
- [ ] 1440px (一般的なPC)

### 8.2 検証ツール

- Chrome DevTools Device Mode
- 実機確認 (iOS Safari, Android Chrome)

## 9. 検討事項

- [ ] 現行アプリのレスポンシブ実装確認
- [ ] 結果テーブルの横スクロール vs カード切り替え判断
- [ ] PWA 対応の必要性
