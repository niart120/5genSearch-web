---
name: pr-merge-cleanup
description: Create, merge, and clean up a GitHub pull request for the current non-main branch. Use when Codex is asked to push the current branch, create a PR, fill the PR template, squash merge it to main, sync local main, and delete local or remote merged branches.
---

# PR作成・マージ・クリーンアップ

作業ブランチの変更をPR経由でリモートにマージし、ローカルへの引き戻しと不要ブランチの削除までを一括実行する。

### 前提条件

- GitHub への push 権限を持つこと
- 作業ブランチで全てのコミットが完了していること
- CIが必要な場合は事前にパスしていること

### 実行手順

1. **ブランチ確認**
   - `git branch --show-current` で現在のブランチ名を取得
   - `main` ブランチの場合は処理を中断

2. **リモートへプッシュ**
   - `git push -u origin <ブランチ名>` でリモートにプッシュ

3. **リポジトリ情報取得**
   - `git remote get-url origin` からowner/repo を抽出
   - 利用可能な GitHub MCP または `gh auth status` で認証ユーザーを確認

4. **PR作成**
   - 利用可能な GitHub MCP または `gh pr create` でPRを作成
   - タイトル: ブランチ名から推測、または直近のコミットメッセージを使用
   - 本文: `.github/PULL_REQUEST_TEMPLATE.md` の構成に従って生成する
     - `git log --oneline main..HEAD` の出力を Commit Log セクションに含める
     - 実行した検証コマンドとその結果を Testing セクションに含める

5. **PRマージ**
   - 利用可能な GitHub MCP または `gh pr merge --squash` で squash マージを実行
   - マージ方法: `squash`（1コミットに集約）

6. **ローカル同期**
   - `git switch main` でmainに切り替え
   - `git pull origin main` で最新を取得

7. **ブランチ削除**
   - `git branch -d <ブランチ名>` でローカルブランチを削除
   - `git push origin --delete <ブランチ名>` でリモートブランチを削除

### エラー時の対応

- プッシュ失敗 (pre-push hook): hook が出力したエラーメッセージに従い対処する
  - oxlint / clippy エラー: 該当箇所のコードを修正し、再コミット後に再プッシュ
  - tsc 型エラー: 型定義を修正し、再コミット後に再プッシュ
  - フォーマット差分: `pnpm format` を実行し、再コミット後に再プッシュ
- プッシュ失敗 (その他): リモートとの差分を確認し報告
- PR作成失敗: 既存PRの有無を確認
- マージ失敗: コンフリクトやCI失敗を報告
- ブランチ削除失敗: 残存ブランチを報告

### 実行結果の報告

- PR番号とURL
- マージコミットSHA
- 削除したブランチ名（ローカル・リモート）

### 依頼例

```
現在の作業ブランチの変更をGitHub PR経由でmainにマージしてください。

1. 現在のブランチ名を確認し、mainでないことを確認
2. ブランチをリモートにプッシュ
3. PRを作成（タイトルはブランチ名ベース、本文はコミット要約）
4. PRをsquashマージ
5. ローカルのmainを最新化
6. ローカル・リモートの作業ブランチを削除

各ステップの結果を報告してください。
```
