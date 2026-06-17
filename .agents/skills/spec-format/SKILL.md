---
name: spec-format
description: Write, update, complete, or review repo-local specs under spec/agent. Use when Codex is asked for $spec-format, a 仕様書, 修正仕様書, Work Unit, spec/agent/wip/local_*, spec/agent/complete/local_*, implementation plan captured as a spec, or moving a validated spec from wip to complete.
---

# Spec Format

この repo の仕様書を `spec/agent` 配下に作成、更新、完了移動するための手順。

## Workflow

1. `AGENTS.md` と `spec/agent/AGENTS.md` を確認する。
2. 対象が TypeScript / React の場合は `src/AGENTS.md`、Rust/WASM の場合は `wasm-pkg/AGENTS.md` も確認する。
3. 新規仕様書なら `spec/agent/wip/` と `spec/agent/complete/` の `local_XXX` を確認し、次の番号を選ぶ。ユーザが番号を指定した場合はそれに従う。
4. 既存仕様書の更新なら、対象ファイルと関連実装を読んでから編集する。番号やファイル名を安易に変えない。
5. 詳細な構成は `references/template.md` を使う。必要な見出しを保ち、不要な説明文は実内容に置き換える。
6. 実装完了後の仕様書は、検証結果とチェックリストを更新してから `spec/agent/complete/local_XXX/` へ移動する。

## Rules

- 新規・着手中は `spec/agent/wip/local_XXX/`、完了済みは `spec/agent/complete/local_XXX/` に置く。
- ファイル名は `FEATURE_NAME.md` 形式の大文字スネークケースにする。
- 目的、背景、対象ファイル、設計方針、実装仕様、テスト方針、チェックリストを明示する。
- 用語定義、対象ファイル、性能要件、期待効果は表で書く。
- コード例は実装言語を指定したコードブロックにする。
- チェックリストは実作業の進捗に合わせて `[x]` に更新する。
- 仕様書だけの変更では、検証欄に `未実行（仕様書のみの変更）` と記録してよい。

## Completion

- 完了移動前に、仕様書のチェックリストと実装差分が一致しているか確認する。
- 実装で仕様が変わった場合は、実装に合わせて仕様書を更新する。
- `wip` から `complete` へ移動した場合は、古いパスへの参照が残っていないか `rg` で確認する。
