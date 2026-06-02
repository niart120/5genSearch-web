# 5genSearch-web Codex Guide

## Communication

- ユーザとの対話は日本語で行う。
- 技術文書と回答は事実ベースで簡潔に書く。
- 絵文字、過剰な装飾、感嘆符の多用、根拠のない主観的評価を避ける。
- コマンド例は PowerShell 構文で書く。bash / zsh / sh 前提の構文は避ける。

## Project Overview

- ポケットモンスター ブラック・ホワイト/ブラック2・ホワイト2の乱数調整を行う Web アプリケーション。
- `https://github.com/niart120/pokemon-gen5-initseed` のリアーキテクチャを目的とする。
- フロントエンドは React 19 + TypeScript + Vite、状態管理は Zustand、UI は Radix UI + Tailwind CSS。
- 計算エンジンは Rust/WASM。`wasm-pack`、`wasm-bindgen`、`tsify`、`serde`、`wgpu` を使用する。
- GitHub Pages と iOS 制約を考慮し、SharedArrayBuffer と wasm threads は使用しない。

## Coding Rules

- TypeScript strict mode を前提にする。
- class 利用は最小化し、関数型の実装を優先する。
- `any`、`unknown`、型アサーションの多用を避ける。
- React は function-based components と Hooks を使用する。
- `null` は原則使わず `undefined` を採用する。外部 API、永続化、JSON 由来の `null` は境界で `undefined` に正規化する。
- oxlint / oxfmt の設定に従う。
- t_wada 氏の TDD 指針を意識する: Code は How、Tests は What、Commits は Why、Comments は Why not を表す。
- 永続化 (`persist`) の破壊的変更は、公開前は migration を行わず localStorage クリアで対応する。公開後は `name` 変更または `version` + `migrate` を使う。

## Documentation Rules

- Markdown は H1 をページタイトルに限定し、H2 / H3 を構造的に使う。
- ファイル名、コマンド、関数名はインラインコードで示す。
- コードブロックには言語指定を付ける。
- 外部リンクや関連資料はフル URL またはリポジトリ内パスで示す。
- 数式が必要な場合は KaTeX 記法を使う。
- 画像や図表には `alt` テキストを付ける。

## Common Commands

- 開発サーバ: `pnpm dev`
- ビルド: `pnpm build` / `pnpm build:wasm` / `pnpm build:wasm:dev`
- テスト: `pnpm test` / `pnpm test:run` / `pnpm test:coverage` / `pnpm test:wasm` / `cargo test`
- GPU テスト: `cargo test --features gpu`
- Lint: `pnpm lint` / `cargo clippy --all-targets -- -D warnings`
- GPU Lint: `cargo clippy --all-targets --features gpu -- -D warnings`
- フォーマット: `pnpm format` / `pnpm format:check` / `pnpm format:ts` / `pnpm format:check:ts` / `cargo fmt --check`
- 型チェック: `pnpm exec tsc -b --noEmit`
- ベンチマーク: `cargo bench --package wasm-pkg` / `cargo bench --package wasm-pkg --features gpu`

## Commit Rules

- Conventional Commits に準拠する。
- フォーマットは `<type>(<scope>): <subject>`。`<scope>` は省略可。
- 許可される type: `feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`
- subject は日本語で記述し、末尾に句点を付けない。
- type は変更の形式ではなく変更の動機で選ぶ。バグ対応は `fix`、ユーザ要望や企画起点の新機能は `feat`。
- release-please の自動バージョン判定に直結するため、マージ前に prefix の妥当性を確認する。

## Codex Surfaces

- 永続指示は `AGENTS.md` に置く。
- 対象ディレクトリ固有の規約は、そのディレクトリ配下の nested `AGENTS.md` に置く。
- 再利用可能な手順は `.agents/skills/*/SKILL.md` に置く。
- Copilot custom prompts は使わない。再利用ワークフローは skill 化する。
