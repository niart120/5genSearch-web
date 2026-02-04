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
| WASM テストの安定化 | Browser Mode による実ブラウザ環境でのテスト |
| 開発効率向上 | テスト方針が明確になり迷いがなくなる |

## 2. スコープ

### 2.1 対象

- TypeScript テストの全体方針策定
- テストディレクトリ構成の設計
- Vitest Browser Mode の導入
- テスト関連の指示ファイル整備

### 2.2 対象外

- Rust 側のテスト (`cargo test` / `wasm-pack test`)
- E2E テスト (Playwright) の詳細設計

## 3. 設計

### 3.1 テスト分類

| 分類 | 対象 | 実行環境 | ディレクトリ |
|------|------|----------|--------------|
| ユニットテスト | 純粋な TypeScript ロジック | Node.js (jsdom) | `src/test/unit/` |
| 統合テスト | WASM / Web Worker 連携 | Browser Mode | `src/test/integration/` |
| コンポーネントテスト | React コンポーネント | jsdom | `src/test/components/` |

### 3.2 実行環境

| 環境 | 用途 | 設定 |
|------|------|------|
| jsdom | DOM 操作を含むユニットテスト | 現在のデフォルト |
| Browser Mode | WASM / Web Worker / WebGPU | Vitest Browser Mode (Playwright) |

### 3.3 ディレクトリ構成案

```
src/test/
├── setup.ts              # 共通セットアップ
├── unit/                 # ユニットテスト
│   └── *.test.ts
├── integration/          # 統合テスト (WASM / Worker)
│   └── *.test.ts
└── components/           # React コンポーネントテスト
    └── *.test.tsx
```

## 4. 実装タスク

### 4.1 テスト環境整備

- [ ] Vitest Browser Mode 導入 (`@vitest/browser`, `playwright`)
- [ ] テストディレクトリ構成の整理
- [ ] 既存テストの適切なディレクトリへの移動

### 4.2 設定ファイル更新

- [ ] `vitest.config.ts` の Browser Mode 設定追加
- [ ] テストパターン (`include`) の更新

### 4.3 指示ファイル整備

- [ ] `.github/copilot-instructions.md` にテスト方針を追記
- [ ] `.github/instructions/typescript.instructions.md` を新規作成（テスト規約含む）

## 5. 実装チェックリスト

- [ ] Vitest Browser Mode 動作確認
- [ ] WASM テストが Browser Mode で正常動作
- [ ] ディレクトリ構成の整理完了
- [ ] 指示ファイルの整備完了
- [ ] 全テストパス確認

## 6. 備考

### 6.1 Vitest Browser Mode 参考

```typescript
// vitest.config.ts (Browser Mode 設定例)
export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }],
    },
  },
});
```

### 6.2 関連ドキュメント

- [Vitest Browser Mode](https://vitest.dev/guide/browser/)
- [Playwright](https://playwright.dev/)
