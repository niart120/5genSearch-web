---
applyTo: 'src/**/*.{ts,tsx}'
---

# TypeScript コーディング規約

## ディレクトリ構成

フロントエンドのディレクトリ構成については下記仕様書を参照:

→ [spec/agent/architecture/frontend-structure.md](../../spec/agent/architecture/frontend-structure.md)

## ツールチェイン

- **TypeScript**: strict mode 有効
- **Linter**: ESLint (eslint.config.js)
- **Formatter**: Prettier (.prettierrc)

## 基本規約

- TypeScript strict mode 使用
- class 利用最小化（関数型プログラミング推奨）
- 型定義を厳密に行う（`any`, `unknown`, 型アサーションの多用禁止）
- React function-based components 使用
- React Hooks 使用
- ESLint/Prettier 設定に準拠

## 禁止事項

- `any` 型の安易な使用
- 型アサーション (`as`) の濫用
- `@ts-ignore` / `@ts-expect-error` の不必要な使用
- 未使用の import / 変数の放置

---

# TypeScript テスト規約

## テスト分類

| 分類 | 対象 | 実行環境 | ディレクトリ |
|------|------|----------|--------------|
| ユニットテスト | 純粋な TS ロジック | jsdom | `src/test/unit/` |
| 統合テスト | WASM / Web Worker 連携 | Browser Mode (headless) | `src/test/integration/` |
| コンポーネントテスト | React コンポーネント | jsdom | `src/test/components/` |

## 配置ルール

### unit/ (ユニットテスト)

- 純粋な TypeScript ロジックのテスト
- 外部依存（WASM, Worker, ネットワーク）を持たない
- モック不要、または最小限のモックで完結
- 実行速度が速い（数ms〜数十ms/テスト）

### integration/ (統合テスト)

- WASM モジュールの初期化・呼び出しテスト
- Web Worker との通信テスト
- ブラウザ API（fetch, WebAssembly 等）を使用するテスト
- headless Chromium 環境で実行

### components/ (コンポーネントテスト)

- React コンポーネントの描画・操作テスト
- Testing Library を使用
- jsdom 環境で実行

## テスト記述規約

- `describe` / `it` を使用（`test` も可）
- テスト名は「何をテストしているか」が明確に分かるように記述
- AAA パターン（Arrange-Act-Assert）を意識
- 1 テスト 1 アサーション を基本とする（複数でも可だが過度に複雑にしない）

## GPU テスト

- CI 環境では GPU が利用できない
- WebGPU 関連のテストは `describe.skipIf(!navigator.gpu)` でスキップ

```typescript
const hasGPU = !!navigator.gpu;
describe.skipIf(!hasGPU)('WebGPU Tests', () => {
  // GPU が利用可能な環境でのみ実行
});
```

## 実行コマンド

```powershell
# 全テスト実行
pnpm test

# 単発実行
pnpm test:run

# カバレッジ付き
pnpm test:coverage

# 特定テストのみ
pnpm test -- --project unit
pnpm test -- --project integration
```
