# ポケモン BW/BW2 乱数調整 WebApp

## はじめに

ユーザとの対話は日本語で行うこと。

## プロジェクト概要

ポケットモンスター ブラック・ホワイト/ブラック2・ホワイト2の乱数調整を行うwebアプリケーション

**参照**: https://github.com/niart120/pokemon-gen5-initseed のリアーキテクチャを目的とする

## 技術スタック

### フロントエンド

- **フレームワーク**: React 19 + TypeScript + Vite
- **状態管理**: Zustand
- **UIコンポーネント**: Radix UI + Tailwind CSS
- **テスト**: Vitest + Playwright
- **Linter/Formatter**: ESLint + Prettier

### 計算エンジン (Rust/WASM)

- **ビルド**: wasm-pack + wasm-bindgen
- **型共有**: tsify + serde + serde-wasm-bindgen
- **CPU最適化**: SIMD128
- **GPU計算**: wgpu (WebGPU)
- **Formatter**: rustfmt
- **静的解析**: clippy
- **テスト**: cargo test + wasm-pack test

### 並列化

- **Worker構成**: Web Workers + 独立WASMインスタンス
- **SharedArrayBuffer**: 不使用 (GitHub Pages + iOS制約)
- **wasm threads**: 不使用 (上記と同様)

## アーキテクチャ原則

- **本番・開発コードの分離**: 本番環境に不要なコードを含めない
- **依存関係の整理**: 循環依存や不適切な依存を避ける
- **テスト環境の整備**: 開発効率を高める包括的テストシステム

## コーディング規約

- TypeScript strict mode 使用
  - class利用最小化 (関数型プログラミング推奨)
  - 型定義を厳密に行う (any, unknown, 型アサーションの多用禁止)
- React function-based components 使用
  - React Hooks 使用
- ESLint/Prettier設定に準拠
- 技術文書は事実ベース・簡潔に記述
- t_wada氏が推奨するテスト駆動開発(TDD)指針/コーディング指針を遵守
  - Code → How
  - Tests → What
  - Commits → Why
  - Comments → Why not

## よく使うコマンド

- 開発サーバ: `pnpm dev`
- ビルド: `pnpm build` / `pnpm build:wasm` / `pnpm build:wasm:dev`
- テスト: `pnpm test` / `pnpm test:run` / `pnpm test:coverage` / `pnpm test:wasm` / `cargo test`
- テスト (GPU含む): `cargo test --features gpu`
- Lint: `pnpm lint` / `cargo clippy --all-targets -- -D warnings`
- Lint (GPU含む): `cargo clippy --all-targets --features gpu -- -D warnings`
- フォーマット: `pnpm format` / `pnpm format:check` / `cargo fmt --check`
- 型チェック: `pnpm exec tsc --noEmit`
- ベンチマーク: `cargo bench --package wasm-pkg` / `cargo bench --package wasm-pkg --features gpu`

## TypeScript テスト方針

### テスト分類

| 分類 | 対象 | 実行環境 | ディレクトリ |
|------|------|----------|--------------|
| ユニットテスト | 純粋な TS ロジック | jsdom | `src/test/unit/` |
| 統合テスト | WASM / Web Worker | Browser Mode (headless Chromium) | `src/test/integration/` |
| コンポーネントテスト | React コンポーネント | jsdom | `src/test/components/` |

### 配置ルール

- **unit/**: 外部依存なし、モック最小限、高速実行
- **integration/**: WASM / Worker / ブラウザ API を使用するテスト
- **components/**: React コンポーネントの描画・操作テスト

### CI 環境での制約

- GPU なし環境でのテスト
- WebGPU 関連テストは `describe.skipIf(!navigator.gpu)` でスキップ

## シェルの前提

- コマンド例は **PowerShell（pwsh）構文**で書くこと。
- **bash / zsh / sh 前提のコマンドは出さない**（例: `export`, `VAR=value cmd`, `&&` 連結前提、`sed -i`, `cp -r`, `rm -rf` などのUnix系定番をそのまま出さない）。
- Windows 組み込みコマンドでも良いが、基本は **PowerShell のコマンドレット**を優先する。
