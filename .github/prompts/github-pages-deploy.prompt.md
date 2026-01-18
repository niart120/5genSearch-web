---
name: 'github-pages-deploy'
description: 'Main でデプロイし docs/public 差分をコミット後プッシュする'
agent: agent
---

## GitHub Pages 更新プロンプト

目的: 現在作業中のブランチを `main` にマージし、`main` で `npm run deploy` など必要な手順を実行したうえで `docs/` または `public/` の差分をコミットする。

### 前提条件

- 目的の操作を行える push 権限を持っていること。PR ベースであれば手動 or 自動 PR 作成に切替が必要。
- 作業ブランチと `main` のワーキングツリーがクリーンであること。未コミット変更は `git status --porcelain` で確認し、必要なら `git stash` かコミット。
- `npm run deploy` が通る Node.js 環境。

### 実行時のチェックリスト（Agent が順に確認）

1. `git rev-parse --abbrev-ref HEAD` で現在のブランチ名を取得し、`main` だった場合は処理を中断。
2. `git status --porcelain` を実行し、出力が空であること。変更があればエラー報告と対処方法を提示。
3. `git fetch origin` → `git checkout main` → `git pull origin main` で `main` を最新化。
4. 作業ブランチに戻って `git merge --no-ff --no-edit <作業ブランチ>`（場合によっては `--no-commit` で事前確認）を実行し、競合があれば停止して一覧を報告。
5. `main` 上で以下を実行（必要に応じてコマンドを調整）。失敗時はログと原因を含むエラーメッセージを返す。
   ```powershell
   npm run deploy
   ```
6. `docs/` または `public/` の差分を確認し、存在すればコミット・push。例:
   ```powershell
   git status --porcelain docs/ public/
   git diff -- docs/ public/
   git add docs/ public/ || true
   git commit -m "chore(docs): update docs after deploy"
   git push origin main
   ```
7. 実行結果ログに、各コマンドと重要な出力、エラー情報、差分の有無を記録してユーザに報告。

### 安全策

- 自動マージ前に `git merge --no-ff --no-commit` を選び、問題ないことを確認してからコミット。
- 組織ルールで PR が必須ならここで PR を作成し、手動承認を待つ。
- CI が必要な場合、`main` でのデプロイ前にパイプラインが通ることを確認し、Agent に `CI pending` を知らせる。

### プロンプト本文（Agent に送る指示）

```
あなたはリポジトリアシスタントです。現在の作業ブランチ（`git rev-parse --abbrev-ref HEAD` の出力）から `main` へマージし、`main` 上でデプロイと docs/public 差分コミットを実行してください。上記の手順に従い、各段階で状態を検査し問題があれば中止して詳細報告を行い、PowerShell 環境でのコマンド出力と実行ログを収集して最終的な成功/失敗の要約を返してください。
```
