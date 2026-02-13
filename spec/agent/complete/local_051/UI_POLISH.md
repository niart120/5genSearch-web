# UI 軽微修正 仕様書

## 1. 概要

### 1.1 目的

design-notes.md に蓄積された UI 関連の軽微な改善項目 4 件を一括対応する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| design-notes | `spec/agent/notes/design-notes.md`。実装中の設計メモを蓄積するファイル |
| dev-journal | design-notes のリネーム後の名称 |
| WelcomePage | メインコンテンツ未実装時に表示する暫定ページ |
| テーマトグル | ヘッダーに配置されたライト/ダークモード切り替えボタン |
| 言語トグル | ヘッダーに配置された言語切り替えボタン |

### 1.3 背景・問題

1. **design-notes.md のリネーム**: `design-system.md` (UI デザインシステム仕様) との名称類似により混乱リスクがある
2. **言語切り替えボタンの表記**: 大文字 `"JA"` / `"EN"` を使用中だが BCP 47 準拠の小文字 `"ja"` / `"en"` の方が標準的
3. **テーマ切り替え UI**: 3 状態サイクル (light → dark → system) のうち system と dark の見た目の差が曖昧
4. **メインコンテンツ未実装時の空画面**: PC 版では sidebar + 空白、モバイル版では完全な空画面が表示される

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| リネーム | ドキュメント名の混同解消 |
| 言語表記 | BCP 47 準拠による一貫性 |
| テーマ | 状態の曖昧さ解消、操作の簡素化 |
| WelcomePage | 未実装状態での UX 改善 |

### 1.5 着手条件

- なし（既存の Phase 2 完了済み機能に対する修正のため即時着手可能）

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `spec/agent/notes/design-notes.md` | リネーム | → `spec/agent/notes/dev-journal.md` |
| `.github/instructions/design-notes.instructions.md` | 修正 | ファイルパス参照を更新 |
| `src/components/layout/language-toggle.tsx` | 修正 | `toUpperCase()` → 小文字表示 |
| `src/test/components/layout/language-toggle.test.tsx` | 修正 | テストの期待値を小文字に更新 |
| `src/stores/settings/ui.ts` | 修正 | `Theme` 型から `'system'` を除去、デフォルト値を動的決定 |
| `src/hooks/use-ui-settings.ts` | 変更なし | 型変更に追従（自動） |
| `src/components/layout/theme-toggle.tsx` | 修正 | 2 状態トグル (light ↔ dark) に変更 |
| `src/main.tsx` | 修正 | `system` テーマ関連ロジックの除去、初回ブラウザ検出ロジック追加 |
| `src/test/unit/stores/ui.test.ts` | 修正 | テストを 2 状態テーマに合わせて更新 |
| `src/test/components/layout/header.test.tsx` | 修正 | aria-label の期待値更新 |
| `src/components/layout/welcome-page.tsx` | 新規 | 暫定メインコンテンツ |
| `src/app.tsx` | 修正 | `WelcomePage` を children に配置 |

## 3. 設計方針

### 3.1 design-notes.md リネーム

ファイルを `dev-journal.md` にリネームし、`design-notes.instructions.md` 内のパス参照を更新する。
`applyTo: spec/agent/notes/**` のグロブパターンはディレクトリ単位のため変更不要。

### 3.2 言語トグルの小文字化

`language.toUpperCase()` の呼び出しを除去し、`language` をそのまま表示する。
`SupportedLocale` 型 (`'ja' | 'en'`) は既に小文字のため、Store 側の変更は不要。

### 3.3 テーマトグルの 2 状態化

#### 設計判断

- `Theme` 型を `'light' | 'dark'` の 2 値に変更する
- `'system'` オプションは廃止し、初回アクセス時（localStorage に値がない場合）にブラウザの `prefers-color-scheme` から初期値を決定する
- 以降はユーザーの明示的な選択 (light ↔ dark) を localStorage に永続化する

#### Store の変更

`Theme` 型を `'light' | 'dark'` に縮小し、デフォルト値をブラウザの `prefers-color-scheme` から動的に決定する。persist の `version` は変更しない (リリース前のためマイグレーションは不要)。localStorage に旧 `'system'` が残っている場合は Zustand の shallow merge により `DEFAULT_STATE.theme` で上書きされる。

```typescript
type Theme = 'light' | 'dark';

function getSystemTheme(): Theme {
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

const DEFAULT_STATE: UiState = {
  language: 'ja',
  theme: getSystemTheme(),
};
```

#### main.tsx の変更

- `resolveTheme()` 関数を削除（不要になる）
- `applyTheme()` の引数型を `'light' | 'dark'` に変更
- OS カラースキーム変更のイベントリスナーを削除

#### コンポーネントの変更

```typescript
// 2 状態トグル
const THEME_CYCLE = ['light', 'dark'] as const;

const Icon = theme === 'dark' ? Moon : Sun;
```

`Monitor` アイコンの import を削除する。

### 3.4 WelcomePage

Phase 3 (検索機能実装) までの暫定表示コンポーネント。
i18n 対応し、モバイルユーザー向けにサイドバーの開き方を案内する。

```tsx
function WelcomePage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md space-y-4 px-6 text-center">
        <h2 className="text-lg font-semibold">
          <Trans>5genSearch</Trans>
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans>
            Pokemon BW/BW2 RNG seed search tool.
          </Trans>
        </p>
        {/* モバイルのみ表示: サイドバーの案内 */}
        <p className="text-xs text-muted-foreground lg:hidden">
          <Trans>
            Tap the menu icon at the top left to configure search settings.
          </Trans>
        </p>
      </div>
    </div>
  );
}
```

## 4. 実装仕様

### 4.1 design-notes.md リネーム

```bash
git mv spec/agent/notes/design-notes.md spec/agent/notes/dev-journal.md
```

`.github/instructions/design-notes.instructions.md` 内のパス参照を更新:

```markdown
# 変更前
- `spec/agent/notes/design-notes.md` に時系列で追記する

# 変更後
- `spec/agent/notes/dev-journal.md` に時系列で追記する
```

### 4.2 言語トグル

`src/components/layout/language-toggle.tsx`:

```tsx
// 変更前
{language.toUpperCase()}

// 変更後
{language}
```

aria-label は変更なし（既に適切な文言で実装済み）。

### 4.3 テーマトグル

`src/stores/settings/ui.ts`:

```typescript
type Theme = 'light' | 'dark';

function getSystemTheme(): Theme {
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

const DEFAULT_STATE: UiState = {
  language: 'ja',
  theme: getSystemTheme(),
};

export const useUiStore = create<UiState & UiActions>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        ...DEFAULT_STATE,
        setLanguage: (language) => set({ language }),
        setTheme: (theme) => set({ theme }),
        reset: () => set(DEFAULT_STATE),
      }),
      {
        name: 'ui-settings',
        version: 1,
      }
    )
  )
);
```

`src/components/layout/theme-toggle.tsx`:

```tsx
import { Sun, Moon } from 'lucide-react';
import { useUiSettings } from '@/hooks/use-ui-settings';

const THEME_CYCLE = ['light', 'dark'] as const;

function ThemeToggle() {
  const { theme, setTheme } = useUiSettings();

  const handleClick = () => {
    const currentIndex = THEME_CYCLE.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIndex]);
  };

  const Icon = theme === 'dark' ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      aria-label="Toggle theme"
    >
      <Icon className="size-4" />
    </button>
  );
}

export { ThemeToggle };
```

`src/main.tsx` の変更:

```typescript
// resolveTheme 関数を削除

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

// Apply theme before render to prevent flash
applyTheme(useUiStore.getState().theme);

// ... (locale setup, sync setup)

// Subscribe to theme changes
useUiStore.subscribe(
  (state) => state.theme,
  (theme) => applyTheme(theme)
);

// OS カラースキーム変更リスナーを削除
```

### 4.4 WelcomePage

`src/components/layout/welcome-page.tsx` を新規作成し、`src/app.tsx` の children に配置する。

```tsx
// src/app.tsx
import { WelcomePage } from '@/components/layout/welcome-page';

// ResponsiveContainer の children として配置
<ResponsiveContainer
  sidebarContent={sidebarContent}
  sidebarOpen={sidebarOpen}
  onSidebarOpenChange={setSidebarOpen}
>
  <WelcomePage />
</ResponsiveContainer>
```

Phase 3 でルーティング導入時に `WelcomePage` を適切なページに置換する。

## 5. テスト方針

### 5.1 ユニットテスト

| テスト | 検証内容 |
|--------|----------|
| `ui.test.ts` | デフォルト theme が `'light'` または `'dark'` (system 非存在) |
| `ui.test.ts` | `setTheme('dark')` / `setTheme('light')` の動作 |
| `ui.test.ts` | `reset()` 後の theme がブラウザ設定に基づく値 |

### 5.2 コンポーネントテスト

| テスト | 検証内容 |
|--------|----------|
| `language-toggle.test.tsx` | ボタン表示が小文字 `"ja"` / `"en"` |
| `theme-toggle.test.tsx` | 2 状態のみサイクル (light → dark → light) |
| `header.test.tsx` | `aria-label="Toggle theme"` の存在 (変更なし) |
| `welcome-page.test.tsx` (新規) | アプリ名と説明文の描画 |
| `welcome-page.test.tsx` (新規) | モバイル向けガイドテキストの存在 |

## 6. 実装チェックリスト

- [x] `spec/agent/notes/design-notes.md` → `dev-journal.md` にリネーム
- [x] `.github/instructions/design-notes.instructions.md` のパス参照を更新
- [x] `dev-journal.md` 内の自己参照リンクを更新
- [x] `src/components/layout/language-toggle.tsx`: `toUpperCase()` 除去
- [x] `src/test/components/layout/language-toggle.test.tsx`: 期待値を小文字に更新
- [x] `src/stores/settings/ui.ts`: `Theme` 型を 2 値化 (version 変更なし)
- [x] `src/components/layout/theme-toggle.tsx`: 2 状態トグルに変更
- [x] `src/main.tsx`: `resolveTheme` 削除、OS リスナー削除
- [x] `src/test/unit/stores/ui.test.ts`: テスト更新
- [x] `src/components/layout/welcome-page.tsx`: 新規作成
- [x] `src/app.tsx`: `WelcomePage` を children に配置
- [x] `src/test/components/layout/welcome-page.test.tsx`: 新規作成
- [x] i18n メッセージカタログ更新 (`pnpm lingui:extract`)
- [x] 全テスト通過確認 (`pnpm test:run`)
