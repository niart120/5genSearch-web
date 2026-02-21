# アプリアイコン・ブランディング適用 仕様書

## 1. 概要

### 1.1 目的

新たに作成されたアプリケーション固有のアイコン (PNG) を、Web アプリの favicon およびヘッダーのブランドロゴとして適用する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| favicon | ブラウザタブに表示される小さなアイコン |
| Web App Manifest | PWA 向けのメタデータファイル (`manifest.json`) |
| OGP | Open Graph Protocol。SNS シェア時に表示される画像やタイトル |

### 1.3 背景・問題

- 現在 favicon は Vite デフォルトの `vite.svg` を使用しており、アプリ固有のブランドを示していない
- ヘッダーのタイトル (`<h1>`) は `text-sm` で小さく、アイコンも付いていない

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| ブランド認知 | タブやブックマークでアプリを識別可能になる |
| ヘッダー視認性 | タイトルサイズ拡大 + アイコン追加で、ブランド領域の視認性が向上する |

### 1.5 着手条件

- アイコンの PNG ファイルが提供済みであること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `public/icon.png` | 新規 | アプリアイコン原本 (提供された PNG を配置) |
| `public/favicon-32x32.png` | 新規 | 32x32 にリサイズした favicon 用画像 |
| `public/favicon-16x16.png` | 新規 | 16x16 にリサイズした favicon 用画像 |
| `public/apple-touch-icon.png` | 新規 | 180x180 の Apple Touch Icon |
| `public/icon-192.png` | 新規 | PWA manifest 用 192x192 アイコン |
| `public/icon-512.png` | 新規 | PWA manifest 用 512x512 アイコン |
| `public/vite.svg` | 削除 | Vite デフォルトアイコンの除去 |
| `public/manifest.json` | 新規 | Web App Manifest (アイコン・アプリ名定義) |
| `index.html` | 変更 | favicon リンク差し替え、manifest リンク追加、apple-touch-icon 追加 |
| `src/components/layout/header.tsx` | 変更 | タイトルのサイズ拡大、アイコン画像の追加 |

## 3. 設計方針

### 3.1 アイコンアセット生成

提供された PNG から以下のサイズを生成する:

| サイズ | 用途 | ファイル名 |
|--------|------|------------|
| 原本 | マスター画像 (リポジトリ保管) | `public/icon.png` |
| 16x16 | favicon (小) | `public/favicon-16x16.png` |
| 32x32 | favicon (大) | `public/favicon-32x32.png` |
| 180x180 | Apple Touch Icon | `public/apple-touch-icon.png` |
| 192x192 | PWA manifest | `public/icon-192.png` |
| 512x512 | PWA manifest / スプラッシュ | `public/icon-512.png` |

リサイズ処理は手動 (画像編集ツール) または `sharp` 等のスクリプトで実施する。品質劣化を避けるため、縮小方向のみとする。元画像が 512px 未満の場合はアップスケールせず、最寄りのサイズまでにとどめる。

### 3.2 `index.html` の変更

```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.json" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>5genSearch</title>
</head>
```

変更点:
- `vite.svg` への参照を削除し、PNG favicon に差し替え
- `apple-touch-icon` リンクを追加
- `manifest.json` リンクを追加
- `<title>` を `5genSearch` に統一 (ハイフン付き `5gensearch-web` から変更)

### 3.3 Web App Manifest

```json
{
  "name": "5genSearch",
  "short_name": "5genSearch",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff"
}
```

### 3.4 ヘッダーコンポーネントの変更

[src/components/layout/header.tsx](../../../../src/components/layout/header.tsx) の変更:

**現状**:
```tsx
<h1 className="text-sm font-medium">
  <Trans>5genSearch</Trans>
</h1>
```

**変更後**:
```tsx
<div className="flex items-center gap-2">
  <img src="/icon.png" alt="5genSearch" className="size-6" />
  <h1 className="text-base font-semibold">
    <Trans>5genSearch</Trans>
  </h1>
</div>
```

変更点:
- `text-sm` → `text-base` (14px → 16px) にサイズアップ
- `font-medium` → `font-semibold` にウェイト強化
- `<h1>` の左隣に 24x24 (`size-6`) のアイコン画像を配置
- `alt` テキストにアプリ名を設定

### 3.5 ダークモード対応

アイコン PNG がダークモードで視認性に問題がない前提とする。もし背景色との相性が悪い場合、以下で対応する:

- アイコン自体に十分な余白・背景がある場合はそのまま使用
- 視認性に問題がある場合は `dark:` バリアントで `filter` や `bg-*` を追加

## 4. 実装仕様

### 4.1 アイコン配置手順

1. 提供された PNG ファイルを `public/icon.png` として配置
2. 各サイズのバリアントを生成し `public/` に配置
3. `public/vite.svg` を削除

### 4.2 ヘッダーコンポーネント

`header.tsx` 内のブランド名表示セクションを変更する。既存の `<h1>` タグの親 `<div>` 内に `<img>` を追加し、見出しテキストのスタイルを調整する。

レイアウト構造 (変更後):
```
<div className="flex items-center gap-2">
  {menuButton}                               ← 既存 (モバイル用)
  <img ... />                                ← 新規 (アイコン)
  <h1 className="text-base font-semibold">   ← 変更 (サイズ・ウェイト)
    5genSearch
  </h1>
</div>
```

## 5. テスト方針

| テスト種別 | 対象 | 検証内容 |
|------------|------|----------|
| 手動確認 | `index.html` | ブラウザタブに新 favicon が表示されること |
| 手動確認 | ヘッダー | アイコンが表示され、タイトルが大きくなっていること |
| 手動確認 | モバイル表示 | ハンバーガーメニューボタンとアイコンの共存に問題がないこと |
| 手動確認 | ダークモード | アイコンの視認性に問題がないこと |
| 手動確認 | PWA | manifest.json のアイコンパスが有効であること (DevTools > Application) |
| コンポーネントテスト | `Header` | ヘッダー内に `<img>` 要素が存在し、`alt` 属性が設定されていること |

## 6. 実装チェックリスト

- [ ] アイコン原本を `public/icon.png` に配置
- [ ] favicon (16x16, 32x32) を生成・配置
- [ ] Apple Touch Icon (180x180) を生成・配置
- [ ] PWA 用アイコン (192x192, 512x512) を生成・配置
- [ ] `public/vite.svg` を削除
- [ ] `public/manifest.json` を作成
- [ ] `index.html` の `<head>` を更新
- [ ] `header.tsx` にアイコン画像を追加し、タイトルスタイルを変更
- [ ] ダークモードでの視認性を確認
- [ ] モバイル表示でのレイアウト崩れがないことを確認
- [ ] ビルドが通ることを確認 (`pnpm build`)
