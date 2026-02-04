# TypeScript テスト戦略 仕様書

## 1. 概要

### 1.1 目的

TypeScript 側のテスト方針を確立し、テストディレクトリ構成・実行環境・カバレッジ方針を整理する。

### 1.2 背景・問題

現状の課題：

1. **テストディレクトリ構成が未整理**: `src/test/` 配下の分類が不明確
2. **WASM / Web Worker テスト環境**: jsdom 環境では `fetch` や `WebAssembly` が正常動作しない
3. **テスト方針の文書化不足**: どのレイヤーで何をテストするか明確でない
4. **指示ファイル未整備**: `copilot-instructions.md` / `instructions/typescript.instructions.md` にテスト関連の記述がない

### 1.3 期待効果

| 項目 | 効果 |
|------|------|
| テスト分類の明確化 | 適切なテストを適切な環境で実行 |
| WASM テストの安定化 | Browser Mode (headless) による実ブラウザ環境でのテスト |
| 開発効率向上 | テスト方針が明確になり迷いがなくなる |

## 2. スコープ

### 2.1 対象

- TypeScript テストの全体方針策定
- テストディレクトリ構成の設計
- Vitest Browser Mode (headless) の導入
- 既存 WASM テストの Browser Mode 対応
- テスト関連の指示ファイル整備

### 2.2 対象外

- Rust 側のテスト (`cargo test` / `wasm-pack test`)
- E2E テスト (Playwright) の詳細設計（Browser Mode 用に Playwright は導入するが、E2E 方針は別途）

## 3. 設計

### 3.1 テスト分類

| 分類 | 対象 | 実行環境 | ディレクトリ |
|------|------|----------|--------------|
| ユニットテスト | 純粋な TypeScript ロジック | Node.js (jsdom) | `src/test/unit/` |
| 統合テスト | WASM / Web Worker 連携 | Browser Mode (headless) | `src/test/integration/` |
| コンポーネントテスト | React コンポーネント | jsdom | `src/test/components/` |

### 3.2 配置ルール

#### unit/ (ユニットテスト)

- 純粋な TypeScript ロジックのテスト
- 外部依存（WASM, Worker, ネットワーク）を持たない
- モック不要、または最小限のモックで完結
- 実行速度が速い（数ms〜数十ms/テスト）

#### integration/ (統合テスト)

- WASM モジュールの初期化・呼び出しテスト
- Web Worker との通信テスト
- ブラウザ API（fetch, WebAssembly 等）を使用するテスト
- headless ブラウザ環境で実行

#### components/ (コンポーネントテスト)

- React コンポーネントの描画・操作テスト
- Testing Library を使用
- jsdom 環境で実行

### 3.3 実行環境

| 環境 | 用途 | 設定 |
|------|------|------|
| jsdom | DOM 操作を含むユニットテスト・コンポーネントテスト | デフォルト |
| Browser Mode (headless) | WASM / Web Worker 統合テスト | Vitest Browser Mode + Playwright (chromium) |

### 3.4 ブラウザ選択

- **標準**: Chromium のみ
- **CI**: Chromium のみ（GPU なし環境）

#### GPU テストに関する注意

- CI 環境では GPU が利用できない
- WebGPU 関連のテストは CI ではスキップまたはモック化
- GPU 依存テストには `describe.skipIf` または環境変数による分岐を使用

### 3.5 ディレクトリ構成

```
src/test/
├── setup.ts              # 共通セットアップ (jsdom 用)
├── setup.browser.ts      # Browser Mode 用セットアップ
├── unit/                 # ユニットテスト
│   └── *.test.ts
├── integration/          # 統合テスト (WASM / Worker)
│   └── *.test.ts
└── components/           # React コンポーネントテスト
    └── *.test.tsx
```

### 3.6 カバレッジ方針

- **Provider**: v8
- **閾値**: 設定しない（測定可能な状態を維持）
- **除外対象**: `node_modules/`, `src/test/`, `*.d.ts`, `*.config.*`, `**/index.ts`

## 4. 実装タスク

### 4.1 テスト環境整備

- [ ] Vitest Browser Mode 導入 (`@vitest/browser`, `playwright`)
- [ ] テストディレクトリ構成の整理
- [ ] 既存テストの適切なディレクトリへの移動
- [ ] `wasm-binding.test.ts` の Browser Mode 対応

### 4.2 設定ファイル更新

- [ ] `vitest.config.ts` の Browser Mode 設定追加（Workspace 構成）
- [ ] テストパターン (`include`) の更新

### 4.3 指示ファイル整備

- [ ] `.github/copilot-instructions.md` にテスト方針を追記
- [ ] `.github/instructions/typescript.instructions.md` を新規作成

## 5. 実装チェックリスト

- [x] Vitest Browser Mode 動作確認
- [x] WASM テストが Browser Mode (headless) で正常動作
- [x] ディレクトリ構成の整理完了
- [x] 指示ファイルの整備完了
- [x] 全テストパス確認

## 6. 備考

### 6.1 Vitest Browser Mode 設定例 (Vitest 4.x)

```typescript
// vitest.config.ts (projects 構成)
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/test/unit/**/*.test.ts', 'src/test/components/**/*.test.tsx'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
          include: ['src/test/integration/**/*.test.ts'],
          setupFiles: ['./src/test/setup.browser.ts'],
        },
      },
    ],
  },
});
```

> **注意**: Vitest 4.x では `workspace` は deprecated。`projects` 設定を使用する。

### 6.2 WASM テスト修正例

```typescript
// Before: Node.js での読み込み (fs/promises 使用)
import { readFile } from 'fs/promises';
const wasmBuffer = await readFile(wasmPath);
await init({ module_or_path: wasmBuffer });

// After: Browser Mode での読み込み (fetch ベース)
await init();
```

### 6.3 GPU テストスキップ例

```typescript
const hasGPU = !!navigator.gpu;

describe.skipIf(!hasGPU)('WebGPU Tests', () => {
  // GPU が利用可能な環境でのみ実行
});
```

### 6.4 関連ドキュメント

- [Vitest Browser Mode](https://vitest.dev/guide/browser/)
- [Vitest Projects](https://vitest.dev/guide/projects.html)
- [Playwright](https://playwright.dev/)
