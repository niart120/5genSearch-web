---
name: gh-pages-release
description: release-please PR の確認・バージョン決定・マージによるリリース実行
argument-hint: releaseType=patch|minor|major
agent: agent
tools:
  [
    'vscode',
    'execute',
    'read',
    'edit',
    'search',
    'github/list_pull_requests',
    'github/pull_request_read',
    'github/update_pull_request',
    'github/merge_pull_request',
    'github/list_tags',
    'github/get_me',
    'github/search_repositories',
    'todo',
  ]
---

## リリース実行プロンプト

目的: release-please が作成したリリース PR を確認し、ユーザ指定のバージョン種別でリリースを実行する。

### 入力

- ${input:releaseType} — `patch` / `minor` / `major`

### 前提条件

- main ブランチに未リリースのコミットが存在すること
- release-please によるリリース PR が存在すること
- CI が通過していること

### 実行手順

1. **差分取得**
   - `git fetch origin` で最新を取得
   - `git log --oneline --no-merges <最新タグ>..origin/main` で未リリースの変更一覧を表示
   - 変更を `Added / Changed / Fixed / Removed` に分類してユーザに提示

2. **release-please PR の確認**
   - `mcp_github_list_pull_requests` で `release-please` ラベルまたはタイトルに "release" を含む PR を検索
   - PR が存在しない場合、main への push 後に release-please が PR を作成するまで待つ旨を通知して中断
   - PR の CHANGELOG ドラフト内容を表示

3. **バージョン判定**
   - release-please が自動判定したバージョンと、ユーザ指定の `releaseType` を照合
   - 不一致の場合:
     - PR 本文に `Release-As: X.Y.Z` ヘッダを `mcp_github_update_pull_request` で追加
     - 追加後、release-please が PR を更新するのを待つ (手動で retrigger が必要な場合はその旨通知)
   - 一致の場合: そのまま続行

4. **変更規模の妥当性チェック**
   - 変更内容と指定バージョンの整合性を確認
   - 乖離が大きい場合 (例: 破壊的変更があるのに patch) はユーザに警告し確認を求める

5. **PR マージ**
   - `mcp_github_merge_pull_request` でマージを実行
   - マージ方法: merge commit (release-please のデフォルト)

6. **結果確認**
   - マージ後、release-please がタグと GitHub Release を作成したことを確認
   - CI → CD パイプラインが起動したことを通知
   - デプロイ先 URL を表示: `https://niart120.github.io/5genSearch-web/`

### 中断条件

- release-please PR が存在しない
- CI が失敗している
- 変更規模とリリース種別の乖離が大きく、ユーザが続行を拒否した

### プロンプト本文

あなたはリリースアシスタントです。上記の手順に従い、release-please が作成したリリース PR を確認し、ユーザ指定のバージョン種別 (${input:releaseType}) でリリースを実行してください。各段階で状態を検査し、問題があれば中止して詳細報告を行ってください。
