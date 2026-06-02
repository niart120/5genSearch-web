# Codex 対応移行 仕様書

## 1. 概要

### 1.1 目的

Copilot 中心の agent 設定を Codex 主体の repo-scoped surfaces に移行し、永続指示と再利用ワークフローの配置を明確にする。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| `AGENTS.md` | Codex が探索して読み込む永続指示ファイル |
| nested `AGENTS.md` | 対象ディレクトリ配下に限定して適用する Codex 指示 |
| skill | `.agents/skills/*/SKILL.md` に置く再利用可能な手順 |
| Copilot surfaces | `.github/copilot-instructions.md`、`.github/instructions`、`.github/prompts`、`.github/skills` |

### 1.3 背景・問題

既存設定は Copilot の `applyTo` 付き instructions、custom prompts、`.github/skills` を前提に分散していた。Codex では永続指示を `AGENTS.md` に集約し、再利用手順を skill として管理する方が探索仕様と一致する。

### 1.4 期待効果

| 項目 | 期待効果 |
|------|----------|
| 永続指示 | Codex が repo root と対象ディレクトリから規約を取得できる |
| ワークフロー | prompt ではなく skill として再利用できる |
| 保守性 | Copilot 専用設定と Codex 設定の重複を減らす |

### 1.5 着手条件

- 作業ブランチ `chore/codex-migration` で作業する。
- package API、React/Rust 実装、アプリ UI、ビルド成果物は変更しない。
- 次の仕様番号は `local_108` とする。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `AGENTS.md` | 追加 | repo-wide Codex 指示を追加 |
| `wasm-pkg/AGENTS.md` | 追加 | Rust/WASM 規約を nested 指示として追加 |
| `src/i18n/locales/AGENTS.md` | 追加 | 翻訳カタログ規約を nested 指示として追加 |
| `spec/agent/AGENTS.md` | 追加 | 仕様書、dev journal、Markdown 文体規約を nested 指示として追加 |
| `.agents/skills/**` | 追加・移動 | 既存 skill と prompt 由来 workflow を Codex skill 配置へ移設 |
| `.github/copilot-instructions.md` | 削除 | 内容を `AGENTS.md` へ統合 |
| `.github/instructions/*.instructions.md` | 削除 | 内容を root または nested `AGENTS.md` へ移行 |
| `.github/prompts/*.prompt.md` | 削除 | prompt workflow を `.agents/skills` へ skill 化 |
| `.github/skills/**` | 削除 | `.agents/skills/**` へ移設 |

## 3. 設計方針

- Codex が常時読むべき repo-wide 指示は root `AGENTS.md` に置く。
- 旧 `applyTo` の対象が明確な規約は nested `AGENTS.md` に分割する。
- 再利用ワークフローは custom prompt ではなく skill として管理する。
- 既存 Vercel skill は `skills` CLI で `vercel-labs/agent-skills` から更新し、`SKILL.md` frontmatter は Codex 向けに整理する。
- React Native skill はこの repo の通常作業では対象外であることを description に明記する。

## 4. 実装仕様

- `.github/skills/*` を `.agents/skills/*` に移動する。
- Vercel 系 skill は `node node_modules\skills\bin\cli.mjs add vercel-labs/agent-skills --agent codex --skill vercel-react-best-practices vercel-composition-patterns vercel-react-native-skills web-design-guidelines --yes` で更新する。
- `.github/prompts/pr-merge-cleanup.prompt.md` は `.agents/skills/pr-merge-cleanup/SKILL.md` に変換する。
- `.github/prompts/gh-pages-release.prompt.md` は `.agents/skills/gh-pages-release/SKILL.md` に変換する。
- 各 `SKILL.md` frontmatter は `name` と `description` のみにする。
- `.github/workflows` と `.github/PULL_REQUEST_TEMPLATE.md` は GitHub 運用 surface として残す。

## 5. テスト方針

- `git status --short --branch` で作業ブランチと変更範囲を確認する。
- `rg -n ".github/(instructions|prompts|skills)|copilot-instructions|AGENTS.md|.agents/skills" .` で参照漏れを確認する。
- skill frontmatter の基本妥当性を検証する。
- ドキュメントのみの変更のため、通常のビルド・テストは実行しない。

## 6. 実装チェックリスト

- [x] `chore/codex-migration` ブランチを作成する。
- [x] 既存 Copilot instructions と prompts を確認する。
- [x] `.github/skills` を `.agents/skills` へ移設する。
- [x] Vercel 系 skill を `vercel-labs/agent-skills` から更新する。
- [x] `.github/prompts` を Codex skills に変換する。
- [x] root と nested `AGENTS.md` を追加する。
- [x] Copilot 専用 instructions / prompts を削除する。
- [x] 移行内容を `local_108` に記録する。
