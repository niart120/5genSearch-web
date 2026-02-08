# i18n 設計

フロントエンドの国際化 (i18n) 方針を定義する。

## 1. 設計目標

1. **型安全な翻訳**: コンパイル時に翻訳キーの誤りを検出する
2. **軽量**: ランタイムバンドルへの影響を最小化する
3. **WASM ロケール連携**: Rust 側 `resolve` モジュールの `locale` パラメータと統一する
4. **段階的導入**: Phase 2 (共通コンポーネント) 開始前に基盤を整備し、以降の機能実装で自然に利用する

## 2. ライブラリ選定

### 2.1 選定結果

**Lingui** (`@lingui/react` + `@lingui/core`) を採用する。

### 2.2 比較

| 基準 | react-i18next | Lingui | 判定 |
|------|---------------|--------|------|
| バンドルサイズ | ~13 kB gzipped (i18next + react-i18next) | ~3.3 kB gzipped (core + react) | Lingui |
| 型安全性 | 追加設定 (declaration merging) で実現 | マクロ展開時に検証。`compileNamespace: "ts"` で型付きカタログ | Lingui |
| Vite 統合 | 特別な設定不要 | `@lingui/vite-plugin` でカタログのオンザフライコンパイル | 引き分け |
| ICU MessageFormat | i18next-icu プラグインで追加 | ネイティブ対応 | Lingui |
| 翻訳ワークフロー | JSON ベース。エディタプラグイン豊富 | PO / JSON / TS 形式対応。CLI で extract → translate → compile | 引き分け |
| 学習コスト | エコシステムが大きく情報が多い | マクロ構文の理解が必要だが、JSX 内で自然に書ける | react-i18next |

Lingui を選定した理由:

1. **バンドルサイズ**: SPA + WASM の構成でランタイムの追加コストを最小化する必要がある。Lingui は core + react で約 3.3 kB と軽量
2. **型安全性**: `compileNamespace: "ts"` でカタログを TypeScript ファイルとして出力でき、コンパイル時に翻訳キーの不整合を検出可能
3. **マクロによる簡潔な記述**: `<Trans>` と `useLingui` マクロにより、翻訳対象を JSX/TS 内に自然に記述できる
4. **WASM locale との一貫性**: `i18n.locale` の値をそのまま WASM の `locale` パラメータに渡せる (`"ja"` / `"en"`)

## 3. 対応言語

| ロケールコード | 言語 | 役割 |
|-------------|------|------|
| `ja` | 日本語 | デフォルト言語 |
| `en` | 英語 | ソースロケール |

- `sourceLocale: "en"` とし、ソースコード上のメッセージは英語で記述する
- `ja.po` に日本語翻訳を記載する
- ブラウザの `navigator.language` を検出し、`en` 系であれば英語カタログを読み込む
- ユーザの明示的な言語選択は `useUiStore` の `language` フィールドで永続化する (既に実装済み)

## 4. メッセージ ID 方針

**Generated IDs (自動生成)** を採用する。

| 方針 | メリット | デメリット |
|-----|---------|----------|
| Generated IDs (採用) | 命名不要。重複自動マージ。バンドルサイズ小 | ID が短いハッシュになるため PO/カタログ上で直接の可読性が低い |
| Explicit IDs (不採用) | キーが安定。TMS 連携に強い | 命名規則の策定・維持コスト。キー重複のリスク |

このプロジェクトでは翻訳者 = 開発者自身であり、TMS 連携は不要。Generated IDs で運用コストを最小化する。

## 5. リソース形式

### 5.1 カタログ形式

- **抽出形式**: PO (`.po`) — Lingui CLI のデフォルト。差分管理に適する
- **コンパイル形式**: TypeScript (`.ts`) — `compileNamespace: "ts"` を指定

### 5.2 ディレクトリ構成

```
src/
├── i18n/
│   ├── index.ts              # i18n インスタンス生成・初期化
│   └── locales/
│       ├── ja/
│       │   └── messages.po   # 日本語カタログ (抽出)
│       │   └── messages.ts   # 日本語カタログ (コンパイル済み)
│       └── en/
│           └── messages.po   # 英語カタログ (抽出)
│           └── messages.ts   # 英語カタログ (コンパイル済み)
```

### 5.3 カタログ管理フロー

```
ソースコード (en でメッセージ記述)
        │
        ▼
  lingui extract     → src/i18n/locales/{locale}/messages.po を更新
        │
        ▼
  翻訳作業 (ja.po)   → 日本語翻訳を記入
        │
        ▼
  lingui compile     → src/i18n/locales/{locale}/messages.ts を生成
        │
        ▼
  Vite ビルド        → @lingui/vite-plugin がカタログをバンドル
```

開発時は `@lingui/vite-plugin` がカタログをオンザフライでコンパイルするため、`lingui compile` の手動実行は不要。

## 6. アーキテクチャ

### 6.1 i18n 初期化

```typescript
// src/i18n/index.ts
import { i18n } from '@lingui/core';

export const SUPPORTED_LOCALES = ['ja', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'ja';

export async function activateLocale(locale: SupportedLocale): Promise<void> {
  const { messages } = await import(`./locales/${locale}/messages.ts`);
  i18n.load(locale, messages);
  i18n.activate(locale);
}

export { i18n };
```

### 6.2 React 統合

```tsx
// src/main.tsx
import { I18nProvider } from '@lingui/react';
import { i18n, activateLocale } from './i18n';

// 初期ロケールの決定
const storedLocale = useUiStore.getState().language;
await activateLocale(storedLocale);

createRoot(document.getElementById('root')!).render(
  <I18nProvider i18n={i18n}>
    <App />
  </I18nProvider>
);
```

### 6.3 コンポーネントでの使用例

```tsx
import { Trans } from '@lingui/react/macro';
import { useLingui } from '@lingui/react/macro';

function SearchButton({ isSearching }: { isSearching: boolean }) {
  const { t } = useLingui();

  return (
    <button disabled={isSearching} aria-label={t`Start search`}>
      <Trans>Start search</Trans>
    </button>
  );
}
```

### 6.4 WASM locale 連携

```
useUiStore.language ──→ i18n.activate(locale)  (UI 翻訳)
         │
         └──────────→ WASM resolve 関数の locale 引数  (ポケモン名等)
```

`useUiStore` の `language` が変更された際:

1. `i18n.activate(locale)` で UI テキストを切り替え
2. WASM の `resolve_pokemon_data(data, version, locale)` に同じロケール値を渡す

これにより UI ラベルとポケモンデータの言語が常に一致する。

### 6.5 言語切替フロー

```
ユーザが言語を変更
        │
        ▼
useUiStore.setLanguage(locale)    ← 永続化 (localStorage)
        │
        ├──→ activateLocale(locale) → UI 再レンダリング
        │
        └──→ WASM 呼び出し時に locale を渡す
```

### 6.6 ブラウザ言語検出

初回アクセス時のみ `navigator.language` を参照し、ユーザが明示的に選択していない場合に適用する:

```typescript
function detectInitialLocale(): SupportedLocale {
  const stored = useUiStore.getState().language;
  if (stored) return stored;

  const browserLang = navigator.language.split('-')[0];
  return SUPPORTED_LOCALES.includes(browserLang as SupportedLocale)
    ? (browserLang as SupportedLocale)
    : DEFAULT_LOCALE;
}
```

実際には `useUiStore` はデフォルト値 `'ja'` を持つため、localStorage が空の初回アクセス時にこのデフォルトが使われる。ブラウザ言語検出を組み込む場合は Store の初期化ロジックを調整する。

## 7. 翻訳キー命名規則

Generated IDs を採用するため、開発者がキーを命名する必要はない。

ただし、以下のガイドラインに従う:

### 7.1 ソースメッセージの記述ルール

| ルール | 説明 | 例 |
|-------|------|-----|
| 英語で記述 | ソースロケールが `en` のため | `<Trans>Start search</Trans>` |
| UI コンテキストを含める | 同じ文言でも意味が異なる場合は `context` を付与 | `<Trans context="button">Start</Trans>` |
| 変数は ICU 構文 | 変数埋め込みは `{variable}` | `<Trans>{count} results</Trans>` |
| 複数形は `Plural` | 複数形処理は `Plural` マクロ | `<Plural value={count} one="# result" other="# results" />` |

### 7.2 翻訳対象の判断基準

翻訳リソースの管理先は以下の 3 層に分かれる。

| 管理先 | 対象 | ファイル | 選定理由 |
|-------|------|---------|---------|
| **Lingui (.po)** | UI ラベル・ボタン文言・エラーメッセージ・バリデーションメッセージ | `src/i18n/locales/{locale}/messages.po` | ユーザ向けテキストで、翻訳者が自由に訳文を決められるもの |
| **ゲームデータ辞書** | 性格名・タイプ名・ステータス略称など、ゲーム公式翻訳に一対一対応する固定語彙 | `src/lib/game-data-names.ts` | WASM 型 (`Nature`, `HiddenPowerType` 等) をキーとし、ロケール別の公式名称を `Record<SupportedLocale, string>` で保持する。翻訳者が訳を変える余地がなく、Lingui のメッセージ ID 体系と相性が悪いため独立管理 |
| **WASM resolve** | ポケモン名・特性名など、Rust 側データに含まれる語彙 | `wasm-pkg/src/resolve/` | データ量が大きく Rust 側でロケール分岐するほうが効率的 |

#### 判断フローチャート

```
テキストはユーザに表示されるか?
  ├─ No  → 翻訳不要 (技術的ログ・例外)
  └─ Yes → ゲーム公式翻訳に一対一対応する固定語彙か?
              ├─ Yes → データ量が大きく Rust 側に存在するか?
              │          ├─ Yes → WASM resolve
              │          └─ No  → ゲームデータ辞書 (game-data-names.ts)
              └─ No  → Lingui (.po)
```

#### 各管理先の具体例

| テキスト | 管理先 | 例 |
|---------|-------|----|
| ボタン・ラベル | Lingui | "Start search", "Select all", "Start date" |
| フォームエラー | Lingui | "Invalid value" |
| ステータス略称 | ゲームデータ辞書 | H/A/B/C/D/S (ja), HP/Atk/Def/SpA/SpD/Spe (en) |
| 性格名 (25 種) | ゲームデータ辞書 | がんばりや / Hardy |
| めざパタイプ名 (16 種) | ゲームデータ辞書 | ほのお / Fire |
| ポケモン名 | WASM resolve | ピカチュウ / Pikachu |
| 特性名 | WASM resolve | いかく / Intimidate |
| 技術ログ | 翻訳不要 | `console.error(...)` |

## 8. Vite 統合

### 8.1 パッケージ

| パッケージ | 種別 | 用途 |
|-----------|------|------|
| `@lingui/core` | dependencies | ランタイム (i18n インスタンス) |
| `@lingui/react` | dependencies | React バインディング (`I18nProvider`) |
| `@lingui/cli` | devDependencies | メッセージ抽出・コンパイル |
| `@lingui/vite-plugin` | devDependencies | Vite 統合 |
| `@lingui/babel-plugin-lingui-macro` | devDependencies | マクロ展開 (Babel プラグイン) |

### 8.2 設定ファイル

```typescript
// lingui.config.ts
import { defineConfig } from '@lingui/cli';

export default defineConfig({
  sourceLocale: 'en',
  locales: ['ja', 'en'],
  catalogs: [
    {
      path: '<rootDir>/src/i18n/locales/{locale}/messages',
      include: ['src'],
    },
  ],
  compileNamespace: 'ts',
});
```

```typescript
// vite.config.ts (更新)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { lingui } from '@lingui/vite-plugin';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['@lingui/babel-plugin-lingui-macro'],
      },
    }),
    lingui(),
    tsconfigPaths(),
  ],
});
```

### 8.3 npm scripts

```json
{
  "scripts": {
    "i18n:extract": "lingui extract",
    "i18n:compile": "lingui compile --typescript"
  }
}
```

## 9. テスト方針

### 9.1 コンポーネントテスト

テスト環境では `i18n` をセットアップし `I18nProvider` でラップする:

```typescript
// src/test/helpers/i18n.tsx
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';

export function setupTestI18n(locale: string = 'ja') {
  i18n.load(locale, {});
  i18n.activate(locale);
}

export function I18nTestWrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
```

翻訳を読み込まない場合、ソースメッセージ (英語) がそのまま表示される。テストではソースメッセージに対してアサーションする。

### 9.2 マクロのテスト互換性

Vitest (jsdom) 環境ではマクロ展開のために Babel 設定が必要。`vitest.config.ts` は Vite 設定を継承するため、`@lingui/babel-plugin-lingui-macro` が自動的に有効になる。

## 10. 依存関係

```
useUiStore (language)
      │
      ├──→ i18n/index.ts (activateLocale)
      │         │
      │         └──→ @lingui/core (i18n instance)
      │
      ├──→ main.tsx (I18nProvider)
      │
      └──→ WASM resolve 関数 (locale 引数)
```

## 11. 関連ドキュメント

- [フロントエンド構成](./frontend-structure.md) — `src/i18n/` の位置付け
- [状態管理方針](./state-management.md) — `useUiStore` の `language` フィールド
- [実装ロードマップ](./implementation-roadmap.md) — Phase 1: Section 3.4 i18n 基盤
