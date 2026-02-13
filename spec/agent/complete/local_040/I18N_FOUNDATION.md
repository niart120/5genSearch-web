# i18n 基盤実装 仕様書

## 1. 概要

### 1.1 目的

Lingui (`@lingui/core` + `@lingui/react`) を導入し、フロントエンドの国際化 (i18n) 基盤を構築する。Phase 2 以降のコンポーネント実装で翻訳を自然に組み込める状態を作る。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| カタログ | メッセージ ID と翻訳文のペアを格納するファイル。PO 形式で管理し、TS 形式にコンパイルして利用する |
| ソースロケール | ソースコード上のメッセージ記述言語。本 PJ では `ja` |
| マクロ | `@lingui/react/macro` の `<Trans>`, `useLingui` 等。ビルド時にメッセージ抽出用コードに展開される |
| Generated ID | ソースメッセージから自動生成される短いハッシュ ID |

### 1.3 背景・問題

- フロントエンド実装が Phase 2 (共通コンポーネント) に進む前に、i18n 基盤が必要
- WASM 側の `resolve` モジュールは既に `locale` パラメータで ja/en を切り替えており、フロントエンド側もこれに合わせる必要がある
- `useUiStore` に `language` フィールドは存在するが、i18n ライブラリとの接続がない

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| i18n 基盤の確立 | Phase 2 以降で `<Trans>` を使って翻訳対象を宣言的に記述可能 |
| WASM locale 統一 | UI テキストとポケモン名等のロケールが常に一致 |
| 開発ワークフロー整備 | `lingui extract` → 翻訳 → `lingui compile` のフローが利用可能 |
| テスト環境整備 | コンポーネントテストで `I18nProvider` を利用可能 |

### 1.5 着手条件

- local_038 (状態管理基盤) が完了していること (達成済み)
- local_039 (GameStartConfig 拡張) が完了していること (達成済み)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `package.json` | 変更 | Lingui 関連パッケージの追加、npm scripts 追加 |
| `lingui.config.ts` | 新規 | Lingui 設定ファイル |
| `vite.config.ts` | 変更 | `@lingui/vite-plugin` と Babel プラグイン追加 |
| `vitest.config.ts` | 変更 | Babel プラグイン追加 (マクロ展開対応) |
| `tsconfig.app.json` | 変更 | `@lingui/vite-plugin` の型定義追加 |
| `src/i18n/index.ts` | 新規 | i18n インスタンス生成・ロケール切替関数 |
| `src/i18n/locales/ja/messages.po` | 新規 | 日本語カタログ (初期は空) |
| `src/i18n/locales/en/messages.po` | 新規 | 英語カタログ (初期は空) |
| `src/main.tsx` | 変更 | `I18nProvider` でアプリをラップ、初期ロケール設定 |
| `src/App.tsx` | 変更 | 動作確認用の `<Trans>` 使用例を追加 |
| `src/stores/settings/ui.ts` | 変更 | `setLanguage` で `activateLocale` を呼び出す同期処理追加 |
| `src/hooks/use-ui-settings.ts` | 変更 | `activateLocale` 呼び出しの統合 |
| `src/test/helpers/i18n.tsx` | 新規 | テスト用 i18n セットアップヘルパー |
| `src/test/unit/i18n/i18n.test.ts` | 新規 | i18n 初期化・ロケール切替テスト |
| `src/test/unit/stores/ui.test.ts` | 変更 | 言語切替時の i18n 連携テスト追加 |
| `.github/instructions/i18n.instructions.md` | 新規 | 翻訳カタログ編集時のガイドライン (applyTo: `src/i18n/locales/**`) |

## 3. 設計方針

### 3.1 パッケージ構成

| パッケージ | 種別 | バージョン | 用途 |
|-----------|------|-----------|------|
| `@lingui/core` | dependencies | ^5 | ランタイム (i18n インスタンス管理) |
| `@lingui/react` | dependencies | ^5 | React バインディング (`I18nProvider`, `Trans`) |
| `@lingui/cli` | devDependencies | ^5 | メッセージ抽出・コンパイル CLI |
| `@lingui/vite-plugin` | devDependencies | ^5 | Vite 統合プラグイン |
| `@lingui/babel-plugin-lingui-macro` | devDependencies | ^5 | マクロ展開 Babel プラグイン |

### 3.2 動的カタログ読み込み

カタログは dynamic import で遅延読み込みする。これにより:

- 初期バンドルに全言語のカタログを含めない
- 言語切替時に必要なカタログのみを読み込む

```typescript
const { messages } = await import(`./locales/${locale}/messages.ts`);
```

### 3.3 Store ⇔ i18n 同期

`useUiStore` の `language` 変更をトリガーに `activateLocale` を呼び出す。同期は `subscribe` ベースで行い、Store 外のサイドエフェクトとして実装する。

```
useUiStore.subscribe(
  (state) => state.language,
  (language) => activateLocale(language)
)
```

これは `src/stores/sync.ts` の `setupStoreSyncSubscriptions` に追加する。

### 3.4 テスト戦略

| テスト種別 | 内容 | 環境 |
|-----------|------|------|
| ユニットテスト | `activateLocale` の動作、ロケール切替 | jsdom |
| Store テスト | `setLanguage` 時の i18n 連携 | jsdom |
| コンポーネントテスト | `I18nProvider` 経由の翻訳表示 | jsdom |

## 4. 実装仕様

### 4.1 `lingui.config.ts`

```typescript
import { defineConfig } from '@lingui/cli';

export default defineConfig({
  sourceLocale: 'ja',
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

### 4.2 `vite.config.ts`

```typescript
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

### 4.3 `vitest.config.ts`

unit プロジェクトの Vite 設定を継承するため、`vite.config.ts` の Babel プラグイン設定がそのまま適用される。追加設定は不要。

### 4.4 `src/i18n/index.ts`

```typescript
import { i18n } from '@lingui/core';

export const SUPPORTED_LOCALES = ['ja', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'ja';

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export async function activateLocale(locale: SupportedLocale): Promise<void> {
  const { messages } = await import(`./locales/${locale}/messages.ts`);
  i18n.load(locale, messages);
  i18n.activate(locale);
}

export { i18n };
```

### 4.5 `src/main.tsx`

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@lingui/react';
import { i18n, activateLocale } from './i18n';
import { useUiStore } from './stores/settings/ui';
import { setupStoreSyncSubscriptions } from './stores/sync';
import './index.css';
import App from './App.tsx';

async function bootstrap() {
  const initialLocale = useUiStore.getState().language;
  await activateLocale(initialLocale);

  setupStoreSyncSubscriptions();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider i18n={i18n}>
        <App />
      </I18nProvider>
    </StrictMode>
  );
}

bootstrap();
```

### 4.6 `src/stores/sync.ts`

```typescript
import { useUiStore } from './settings/ui';
import { activateLocale } from '../i18n';
import type { SupportedLocale } from '../i18n';

export function setupStoreSyncSubscriptions(): () => void {
  const cleanups: Array<() => void> = [];

  // language → i18n 同期
  const unsubLanguage = useUiStore.subscribe(
    (state) => state.language,
    async (language) => {
      await activateLocale(language as SupportedLocale);
    }
  );
  cleanups.push(unsubLanguage);

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
```

> Zustand v5 の `subscribe` はセレクタ付き購読に対応している。`subscribeWithSelector` ミドルウェアが必要な場合は Store 定義を調整する。

### 4.7 `src/stores/settings/ui.ts`

`Language` 型を `SupportedLocale` と統一する。

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SupportedLocale } from '../../i18n';

type Theme = 'light' | 'dark' | 'system';

interface UiState {
  language: SupportedLocale;
  theme: Theme;
}

interface UiActions {
  setLanguage: (language: SupportedLocale) => void;
  setTheme: (theme: Theme) => void;
  reset: () => void;
}

const DEFAULT_STATE: UiState = {
  language: 'ja',
  theme: 'system',
};

export const useUiStore = create<UiState & UiActions>()(
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
);

export const getUiInitialState = (): UiState => DEFAULT_STATE;
```

### 4.8 `src/test/helpers/i18n.tsx`

```tsx
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import type { ReactNode } from 'react';

export function setupTestI18n(locale: string = 'ja'): void {
  i18n.load(locale, {});
  i18n.activate(locale);
}

export function I18nTestWrapper({ children }: { children: ReactNode }) {
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
```

### 4.9 `src/test/unit/i18n/i18n.test.ts`

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { i18n, activateLocale, SUPPORTED_LOCALES, DEFAULT_LOCALE, isSupportedLocale } from '../../../i18n';

describe('i18n', () => {
  beforeEach(() => {
    // i18n の状態をリセット
  });

  it('should have correct supported locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['ja', 'en']);
  });

  it('should have ja as default locale', () => {
    expect(DEFAULT_LOCALE).toBe('ja');
  });

  it('should validate supported locales', () => {
    expect(isSupportedLocale('ja')).toBe(true);
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('fr')).toBe(false);
    expect(isSupportedLocale('')).toBe(false);
  });

  it('should activate ja locale', async () => {
    await activateLocale('ja');
    expect(i18n.locale).toBe('ja');
  });

  it('should activate en locale', async () => {
    await activateLocale('en');
    expect(i18n.locale).toBe('en');
  });

  it('should switch locale', async () => {
    await activateLocale('ja');
    expect(i18n.locale).toBe('ja');

    await activateLocale('en');
    expect(i18n.locale).toBe('en');
  });
});
```

### 4.10 初期カタログファイル

`lingui extract` を実行して空のカタログを生成する。初回は抽出対象がないため、ヘッダのみのファイルが生成される。

App.tsx に動作確認用の `<Trans>` を追加した状態で `lingui extract` を実行し、メッセージが抽出されることを確認する。

### 4.11 `.github/instructions/i18n.instructions.md`

翻訳カタログ (`src/i18n/locales/**`) を編集・レビューする際に適用されるインストラクションファイル。翻訳の一貫性を担保する目的で配置する。

```markdown
---
applyTo: src/i18n/locales/**
---

# 翻訳カタログ編集ガイド

(具体的な内容は Phase 2 以降の翻訳作業開始時に策定する)
```

記載すべき内容の候補:

- 用語集 (ポケモン関連の固有名詞・UI 用語の統一訳)
- 文体ルール (敬体/常体、句読点)
- PO ファイルの編集手順
- レビュー時のチェック観点

### 4.12 `tsconfig.app.json`

`compilerOptions.types` に Lingui の型定義を追加:

```jsonc
{
  "compilerOptions": {
    "types": ["vite/client", "@webgpu/types", "@lingui/vite-plugin/macros"]
  }
}
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト | 検証内容 | ファイル |
|-------|---------|---------|
| i18n 定数 | `SUPPORTED_LOCALES`, `DEFAULT_LOCALE` の値 | `src/test/unit/i18n/i18n.test.ts` |
| `isSupportedLocale` | サポートロケールの判定 | 同上 |
| `activateLocale` | ロケール切替後の `i18n.locale` | 同上 |
| ロケール切替 | ja → en → ja の切替 | 同上 |

### 5.2 Store テスト

| テスト | 検証内容 | ファイル |
|-------|---------|---------|
| `Language` 型統一 | `SupportedLocale` と一致すること | `src/test/unit/stores/ui.test.ts` |

### 5.3 結合確認

手動確認:

1. `pnpm dev` でアプリ起動
2. `<Trans>` で囲んだテキストが表示されること
3. `lingui extract` でメッセージが抽出されること
4. `lingui compile --typescript` でカタログが生成されること

## 6. 実装チェックリスト

- [x] Lingui パッケージのインストール (`@lingui/core`, `@lingui/react`, `@lingui/cli`, `@lingui/vite-plugin`, `@lingui/babel-plugin-lingui-macro`)
- [x] `lingui.config.ts` 作成
- [x] `vite.config.ts` に Lingui プラグイン追加
- [x] `tsconfig.app.json` に型定義追加
- [x] `src/i18n/index.ts` 作成
- [x] `src/main.tsx` を `I18nProvider` でラップ (非同期ブートストラップ化)
- [x] `src/stores/settings/ui.ts` の `Language` 型を `SupportedLocale` に統一
- [x] `src/stores/sync.ts` に language → i18n 同期を追加
- [x] `src/App.tsx` に動作確認用 `<Trans>` 追加
- [x] `lingui extract` で初期カタログ生成
- [x] `lingui compile --typescript` でコンパイル確認
- [x] `src/test/helpers/i18n.tsx` 作成
- [x] `src/test/unit/i18n/i18n.test.ts` 作成・テスト通過
- [x] `src/test/unit/stores/ui.test.ts` の型整合性確認
- [ ] `pnpm dev` で動作確認
- [x] `pnpm test:run` で全テスト通過
- [x] `.github/instructions/i18n.instructions.md` 作成
- [x] `pnpm lint` 通過
