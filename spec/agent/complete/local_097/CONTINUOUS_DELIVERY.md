# 継続的デリバリ (CD) 仕様書

## 1. 概要

### 1.1 目的

GitHub Pages への自動デプロイパイプラインを構築し、リリース作業を自動化する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| CD | Continuous Delivery。コード変更がテスト済み成果物として自動的にデプロイ可能になる仕組み |
| release-please | Google 製の自動リリースツール。Conventional Commits を解析し、リリース PR・タグ・CHANGELOG を自動生成 |
| Conventional Commits | コミットメッセージの構造化規約。`feat:`, `fix:`, `docs:` 等のプレフィクスで変更種別を示す |
| GitHub Pages | GitHub リポジトリから静的サイトをホスティングするサービス |
| リリース prompt | VS Code Copilot Chat の prompt ファイル。リリース作業をエージェントが実行するためのランブック |

### 1.3 背景・問題

- Phase 1〜4 の実装が完了し、デプロイ可能な状態に到達した
- CI (Lint・テスト・WASM ビルド) は構築済みだが、デプロイパイプラインが存在しない
- リリース手順が未定義であり、再現性のあるデプロイが行えない

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| デプロイの自動化 | タグ push → CI 検証 → GitHub Pages デプロイが自動で完了する |
| リリース管理の標準化 | release-please によるバージョン管理・CHANGELOG 自動生成 |
| コミット規約の強制 | Conventional Commits を CI で検証し、一貫したコミット履歴を維持 |

### 1.5 着手条件

- [x] CI ワークフロー (`ci.yml`) が動作している
- [x] `pnpm build` でプロダクションビルドが成功する
- [x] WASM ビルド (`--features gpu`) が CI 環境で動作する

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `.github/workflows/cd.yml` | 新規 | GitHub Pages デプロイワークフロー |
| `.github/workflows/release-please.yml` | 新規 | release-please ワークフロー |
| `.github/workflows/ci.yml` | 修正 | タグ push 時もトリガーするよう `on` を修正 |
| `release-please-config.json` | 新規 | release-please 設定 |
| `.release-please-manifest.json` | 新規 | release-please バージョン追跡 |
| `vite.config.ts` | 修正 | `base` パスの設定追加 |
| `package.json` | 修正 | `version` フィールドの管理方針確認 |
| `.commitlintrc.json` | 新規 | Conventional Commits 検証設定 |
| `.github/workflows/commitlint.yml` | 新規 | PR コミットメッセージ検証ワークフロー |
| `.github/prompts/gh-pages-release.prompt.md` | 新規 | リリース実行用 prompt (既存 `github-pages-deploy.prompt.md` を置換) |
| `.github/prompts/github-pages-deploy.prompt.md` | 削除 | 旧手動デプロイ prompt (CD パイプラインで代替) |

## 3. 設計方針

### 3.1 全体アーキテクチャ (ハイブリッド方式)

release-please (自動) とリリース prompt (手動トリガー) を組み合わせる。

```
[日常開発: PR を main にマージ]
        │
        ▼
┌────────────────────────────────┐
│  release-please (自動・バックグラウンド) │
│  ・main push のたびに実行         │
│  ・Conventional Commits を解析    │
│  ・リリース PR を自動作成・更新    │
│  ・CHANGELOG.md ドラフト生成      │
│  ・バージョン自動判定             │
└────────────────────────────────┘
        │  リリース PR が常に最新状態で待機
        │
        │  ユーザが任意のタイミングで prompt を起動
        ▼
┌────────────────────────────────┐
│  リリース prompt (手動トリガー)   │
│  1. 最新タグ以降の差分を表示     │
│  2. ユーザがバージョン種別を指定  │
│     (patch / minor / major)     │
│  3. release-please PR を確認     │
│  4. バージョン不一致時は          │
│     Release-As ヘッダで上書き    │
│  5. PR をマージ                  │
└────────────┬───────────────────┘
             │ マージで release-please がタグ作成
             ▼
┌─────────────────────────┐
│  CI ワークフロー          │
│  ・WASM ビルド           │
│  ・Lint (TS + Rust)      │
│  ・テスト (TS + Rust)    │
└────────────┬────────────┘
             │ 全ジョブ成功
             ▼
┌─────────────────────────┐
│  CD ワークフロー          │
│  ・WASM ビルド (GPU 有効) │
│  ・Vite ビルド           │
│  ・GitHub Pages デプロイ  │
└─────────────────────────┘
             │
             ▼
    niart120.github.io/5genSearch-web/
```

### 3.2 コンポーネントの責務分担

| コンポーネント | 種別 | トリガー | 責務 |
|--------------|------|---------|------|
| `release-please.yml` | GitHub Actions | push (main) | リリース PR の自動作成・更新、CHANGELOG ドラフト生成 |
| `release.prompt.md` | Copilot Chat prompt | ユーザが任意に実行 | 差分確認、バージョン種別決定、リリース PR マージ |
| `ci.yml` | GitHub Actions | push (main) / PR (main) / tag (v\*) | 品質検証 (Lint・テスト) |
| `cd.yml` | GitHub Actions | `ci.yml` 完了 (`workflow_run`) | ビルド・GitHub Pages デプロイ |
| `commitlint.yml` | GitHub Actions | PR (main) | コミットメッセージ検証 |

`cd.yml` は `ci.yml` の成功を条件にトリガーする (`workflow_run` + conclusion check)。
タグ push 時のみデプロイを実行し、通常の main push では CD は走らない。

### 3.3 リリース prompt の設計意図

release-please 単独では「main push のたびにリリース PR が更新される → マージすればリリース」というフローになる。ハイブリッド方式では以下の利点を得る:

- **リリースタイミングの制御**: 複数の PR を main にマージした後、まとめてリリースできる
- **バージョンの上書き**: release-please の自動判定と異なるバージョンを指定可能 (`Release-As` ヘッダ)
- **差分の可視化**: リリース前に変更内容を確認し、妥当性を判断できる

### 3.4 GitHub Pages 設定

| 項目 | 値 |
|------|-----|
| ソース | GitHub Actions |
| URL | `https://niart120.github.io/5genSearch-web/` |
| base パス | `/5genSearch-web/` |
| カスタムドメイン | なし |
| HTTPS | 強制 (GitHub Pages デフォルト) |

### 3.5 バージョニング

- SemVer (`MAJOR.MINOR.PATCH`) を採用
- release-please が Conventional Commits から自動判定:
  - `feat:` → MINOR バンプ
  - `fix:` → PATCH バンプ
  - `feat!:` / `BREAKING CHANGE:` → MAJOR バンプ
- 初回リリースは `v0.1.0` から開始

### 3.6 スコープ外

- PWA / Service Worker 対応 (別タスクとして後日対応)
- プレビューデプロイ
- カスタムドメイン

## 4. 実装仕様

### 4.1 `vite.config.ts` — base パス設定

```ts
export default defineConfig({
  base: '/5genSearch-web/',
  plugins: [
    // ... existing plugins
  ],
  // ...
});
```

### 4.2 `.github/workflows/ci.yml` — トリガー修正

```yaml
on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]
```

タグ push 時にも CI が走るようにし、CD の前提条件を満たす。

### 4.3 `.github/workflows/cd.yml` — デプロイワークフロー

```yaml
name: CD

on:
  workflow_run:
    workflows: ['CI']
    types: [completed]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    name: Deploy to GitHub Pages
    runs-on: ubuntu-latest
    if: >-
      github.event.workflow_run.conclusion == 'success' &&
      startsWith(github.event.workflow_run.head_branch, 'v')
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@nightly
        with:
          targets: wasm32-unknown-unknown

      - name: Cache Cargo
        uses: actions/cache@v4
        with:
          path: |
            ~/.cargo/bin/
            ~/.cargo/registry/index/
            ~/.cargo/registry/cache/
            ~/.cargo/git/db/
            target/
          key: ${{ runner.os }}-cargo-wasm-${{ hashFiles('**/Cargo.lock') }}
          restore-keys: ${{ runner.os }}-cargo-wasm-

      - name: Install wasm-pack
        run: |
          if ! command -v wasm-pack; then
            cargo install wasm-pack --locked --version 0.14.0
          fi

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install wasm-opt (binaryen)
        run: |
          curl -L -o binaryen.tar.gz https://github.com/WebAssembly/binaryen/releases/download/version_125/binaryen-version_125-x86_64-linux.tar.gz
          tar -xzf binaryen.tar.gz
          echo "$PWD/binaryen-version_125/bin" >> $GITHUB_PATH

      - name: Build
        run: pnpm build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**設計判断**: CI の WASM アーティファクトを再利用せず CD 内で再ビルドする理由:
- `workflow_run` イベントでは別ワークフローのアーティファクトへのアクセスが煩雑
- WASM ビルドは再現性がありキャッシュにより高速化される
- デプロイ成果物の整合性を保証できる

### 4.4 `.github/workflows/release-please.yml`

```yaml
name: Release Please

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    name: Release Please
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          release-type: node
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json
```

### 4.5 `release-please-config.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "packages": {
    ".": {
      "release-type": "node",
      "changelog-path": "CHANGELOG.md",
      "bump-minor-pre-major": true,
      "bump-patch-for-minor-pre-major": true,
      "include-component-in-tag": false,
      "extra-files": []
    }
  }
}
```

`bump-minor-pre-major: true`: v1.0.0 未満では `feat:` が MINOR ではなく PATCH になる。
`bump-patch-for-minor-pre-major: true`: v1.0.0 未満での保守的なバージョンバンプ。

### 4.6 `.release-please-manifest.json`

```json
{
  ".": "0.0.0"
}
```

初回リリースで `0.1.0` にバンプされる（`feat:` コミットが存在する前提）。

### 4.7 `.commitlintrc.json`

```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"]
    ]
  }
}
```

### 4.8 `.github/workflows/commitlint.yml`

```yaml
name: Commitlint

on:
  pull_request:
    branches: [main]

jobs:
  commitlint:
    name: Lint Commit Messages
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint commits
        run: npx commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }} --verbose
```

### 4.9 devDependencies 追加

```json
{
  "devDependencies": {
    "@commitlint/cli": "^19.0.0",
    "@commitlint/config-conventional": "^19.0.0"
  }
}
```

### 4.10 `.github/prompts/release.prompt.md` — リリース prompt

既存の `github-pages-deploy.prompt.md` を削除し、以下の prompt で置き換える。

```prompt
---
name: release
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
```

## 5. テスト方針

### 5.1 ワークフローの検証

| 検証項目 | 方法 |
|----------|------|
| CD ワークフローの構文 | `actionlint` またはダミータグ push で検証 |
| release-please の動作 | `feat:` コミットを main に push し、リリース PR が作成されることを確認 |
| リリース prompt | prompt 実行 → 差分表示 → PR マージ → タグ作成 → CD 起動の一連フローを確認 |
| commitlint | 規約違反のコミットメッセージで PR を作成し、CI が失敗することを確認 |
| base パス | ビルド成果物の HTML 内で `/5genSearch-web/` パスが正しく参照されていること |
| Pages デプロイ | タグ push 後にサイトがアクセス可能であること |

### 5.2 ローカル検証

```powershell
# Vite ビルドの base パス確認
pnpm build
# dist/index.html 内のアセットパスが /5genSearch-web/ を含むことを確認

# commitlint のローカル実行
npx commitlint --from HEAD~1 --to HEAD --verbose
```

## 6. 実装チェックリスト

- [x] `vite.config.ts` に `base: '/5genSearch-web/'` を追加
- [x] `ci.yml` のトリガーに `tags: ['v*']` を追加
- [x] `.github/workflows/cd.yml` を作成
- [x] `.github/workflows/release-please.yml` を作成
- [x] `release-please-config.json` を作成
- [x] `.release-please-manifest.json` を作成
- [x] `@commitlint/cli`, `@commitlint/config-conventional` をインストール
- [x] `.commitlintrc.json` を作成
- [x] `.github/workflows/commitlint.yml` を作成
- [x] `.github/prompts/gh-pages-release.prompt.md` を作成
- [x] `.github/prompts/github-pages-deploy.prompt.md` を削除
- [ ] GitHub リポジトリ設定で Pages ソースを "GitHub Actions" に変更
- [x] ローカルで `pnpm build` して base パスを検証
- [ ] main マージ後に release-please の動作を確認
- [ ] リリース prompt でリリース PR マージ → タグ作成 → デプロイの一連フローを確認

## 7. リリース手順 (運用ガイド)

### 7.1 日常開発

1. Conventional Commits に従ってコミットする (`feat:`, `fix:`, `docs:` 等)
2. PR を main にマージする
3. release-please が裏でリリース PR を自動作成・更新する (意識不要)

### 7.2 リリース実行

1. VS Code で Copilot Chat を開く
2. `gh-pages-release.prompt.md` を実行し、`releaseType` を指定 (`patch` / `minor` / `major`)
3. prompt が以下を実行:
   - 最新タグ以降の差分を表示
   - release-please PR のバージョンと `releaseType` を照合
   - 必要に応じて `Release-As` ヘッダでバージョンを上書き
   - ユーザ確認後、PR をマージ
4. release-please がタグ + GitHub Release を作成
5. CI → CD が自動実行され、GitHub Pages にデプロイされる

### 7.3 ユーザの操作ポイント

| タイミング | 操作 | 自動化 |
|-----------|------|--------|
| 日常コミット | Conventional Commits プレフィクスを付ける | commitlint が検証 |
| リリース判断 | prompt を起動し `releaseType` を指定 | prompt が差分確認・マージを実行 |
| デプロイ確認 | Pages URL にアクセスして動作確認 | CI/CD が自動実行 |

## 8. ユーザ作業 (手動対応が必要な項目)

エージェントやパイプラインでは自動化できず、リポジトリオーナーが手動で実施する必要がある作業の一覧。

### 8.1 初回セットアップ (GitHub リポジトリ設定)

| # | 作業 | 場所 | 備考 |
|---|------|------|------|
| 1 | GitHub Pages のソースを **GitHub Actions** に変更 | リポジトリ → Settings → Pages → Source | デフォルトは "Deploy from a branch"。Actions に切り替えないと `deploy-pages` が失敗する |
| 2 | GitHub Pages の公開確認 | Settings → Pages | "Your site is live at ..." と表示されれば OK |
| 3 | `GITHUB_TOKEN` の権限確認 | Settings → Actions → General → Workflow permissions | **Read and write permissions** + **Allow GitHub Actions to create and approve pull requests** が必要。release-please がタグ・PR を作成するため |

### 8.2 初回リリース前

| # | 作業 | 備考 |
|---|------|------|
| 1 | main ブランチに本 PR をマージ | release-please が初回のリリース PR を作成する前提 |
| 2 | release-please がリリース PR を作成したことを確認 | main push 後、数分以内に PR が作成される |
| 3 | `gh-pages-release.prompt.md` で初回リリースを実行 | `releaseType=minor` (v0.1.0) を推奨 |
| 4 | デプロイ後に `https://niart120.github.io/5genSearch-web/` にアクセスして動作確認 | WASM ロード・検索実行まで確認 |

### 8.3 継続運用

| 作業 | 頻度 | 備考 |
|------|------|------|
| Conventional Commits の遵守 | 毎コミット | commitlint が PR 時に検証するが、main 直 push 時は検証されない |
| リリース prompt の実行 | 任意 | リリースしたいタイミングで実行。放置しても問題はない (リリース PR が蓄積されるだけ) |
| デプロイ後の動作確認 | 毎リリース | Pages URL でアプリが正常動作することを目視確認 |
| GitHub Actions の使用量確認 | 月次目安 | 無料枠 (2,000 分/月) を超えないよう注意。WASM ビルドが比較的重い |
