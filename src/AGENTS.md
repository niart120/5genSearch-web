# Frontend TypeScript Guide

## Scope

- `src` 配下の TypeScript / React 実装と関連テストに適用する。
- フロントエンドのディレクトリ構成は `spec/agent/architecture/frontend-structure.md` を参照する。

## Rules

- TypeScript strict mode を前提にする。
- `class` 利用は最小化し、関数型の実装を優先する。
- `any`、`unknown`、型アサーションの多用を避ける。
- React は function-based components と Hooks を使用する。
- oxlint / oxfmt の設定に従う。
- `null` は原則使わず `undefined` を採用する。
  - 省略可能な値は `foo?: T` または `foo: T | undefined` で表現する。
  - 外部 API、永続化、JSON 由来の `null` は境界で `undefined` に正規化する。
- `@ts-ignore` / `@ts-expect-error` は、外部制約などの理由を説明できる場合だけ使う。

## State Persistence

- 公開前の `persist` 破壊的変更では migration を行わず、localStorage クリアで対応する。
- 公開後の `persist` 破壊的変更では `name` 変更または `version` + `migrate` を使う。

## Test Placement

| 分類 | 対象 | 実行環境 | ディレクトリ |
|------|------|----------|--------------|
| ユニットテスト | 純粋な TypeScript ロジック | jsdom | `src/test/unit/` |
| 統合テスト | WASM / Web Worker 連携 | Vitest Browser Mode (headless Chromium) | `src/test/integration/` |
| コンポーネントテスト | React コンポーネント | jsdom | `src/test/components/` |

- コンポーネントテストは Vitest の `unit` project で実行される。
- ユニットテストは外部依存を持たない純粋なロジックを優先し、モックは最小限にする。
- 統合テストは WASM 初期化、Web Worker 通信、ブラウザ API を含む連携を検証する。

## Test Writing Rules

- `describe` / `it` を使用する。`test` も可。
- テスト名は検証している振る舞いが分かる表現にする。
- AAA パターン (Arrange, Act, Assert) を意識する。
- 1 テスト 1 アサーションを基本にし、複雑な複数アサーションは避ける。
- `null` を前提にせず、未設定値の検証では `toBeUndefined()` を使う。
- WebGPU 関連のテストは GPU が利用できない環境でスキップする。

```typescript
const hasGPU = !!navigator.gpu;

describe.skipIf(!hasGPU)('WebGPU Tests', () => {
  // GPU が利用可能な環境でのみ実行する。
});
```

## Commands

```powershell
pnpm test
pnpm test:run
pnpm test:coverage
pnpm test -- --project unit
pnpm test -- --project integration
```
