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
- **CPU最適化**: portable-simd (x86-64 SIMD, WebAssembly SIMD)
- **GPU計算**: wgpu (WebGPU)
- **Formatter**: rustfmt
- **静的解析**: clippy
- **テスト**: cargo test + wasm-pack test

### 並列化

- **Worker構成**: Web Workers + 独立WASMインスタンス
- **SharedArrayBuffer**: 不使用 (GitHub Pages + iOS制約)
- **wasm threads**: 不使用 (上記と同様)

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
- フォーマット: `pnpm format` / `pnpm format:check` / `pnpm format:ts` / `pnpm format:check:ts` / `cargo fmt --check`
- 型チェック: `pnpm exec tsc -b --noEmit`
- ベンチマーク: `cargo bench --package wasm-pkg` / `cargo bench --package wasm-pkg --features gpu`

## コミットルール

- [Conventional Commits](https://www.conventionalcommits.org/) に準拠する
- フォーマット: `<type>(<scope>): <subject>`
  - `<scope>` は省略可
- 許可される type:
  - `feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`
- subject は日本語で記述・末尾句点なし

### type の選択基準

- 変更の動機 (Why) に基づいて type を選択する。変更の形式 (What) ではない
  - バグ報告・不具合への対応 → `fix` (たとえ実装上はカラム追加等の「追加」であっても)
  - ユーザ要望・企画起点の新機能 → `feat`
- type は release-please のバージョン自動判定に直結する (`feat` → minor, `fix` → patch)
  - 意図しないバージョン bump を防ぐため、マージ前に prefix の妥当性を確認すること

## シェルの前提

- コマンド例は **PowerShell（pwsh）構文**で書くこと。
- **bash / zsh / sh 前提のコマンドは出さない**（例: `export`, `VAR=value cmd`, `&&` 連結前提、`sed -i`, `cp -r`, `rm -rf` などのUnix系定番をそのまま出さない）。
- Windows 組み込みコマンドでも良いが、基本は **PowerShell のコマンドレット**を優先する。
