# デザインシステム

Phase 2 以降の全 UI コンポーネントが参照するデザインの一貫性ガイドライン。

## 1. 設計目標

1. **一貫性**: 全コンポーネントが共通のトークンとパターンに従うことで、視覚的統一感を維持する
2. **BW テーマ**: ポケモン BW/BW2 の世界観をダーク/ライトの両モードで表現する
3. **コンパクト**: 入力項目と結果データが多い乱数調整ツールに適した情報密度設計
4. **保守性**: CSS 変数ベースのトークン管理で、配色の一括変更・拡張を容易にする

## 2. コンポーネントフレームワーク

### 2.1 採用方針

**shadcn/ui スタイル**を採用する。

| 要素 | 内容 |
|------|------|
| ベース | Radix UI Primitives |
| スタイリング | Tailwind CSS v4 |
| バリアント管理 | class-variance-authority (cva) |
| ユーティリティ | tailwind-merge (cn 関数) |
| 配置 | `src/components/ui/` にコピーペースト方式で配置 |

### 2.2 cva によるバリアント定義パターン

各 UI 部品のバリアントを `cva` で宣言的に管理する。

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2 text-xs",
        lg: "h-9 px-4",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### 2.3 cn ユーティリティ

`tailwind-merge` + `clsx` を組み合わせたクラス結合関数を共通定義する。

```tsx
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export { cn };
```

## 3. カラーシステム

### 3.1 テーマコンセプト

ポケモン BW の対となる世界観をダーク/ライトモードで表現する。

| モード | コンセプト | ベース色調 | アクセント色調 |
|--------|----------|-----------|--------------|
| ダーク | **ブラック** (Zekrom / 理想) | 黒・深灰 | 寒色系 (青・氷青) |
| ライト | **ホワイト** (Reshiram / 真実) | 白・淡灰 | 暖色系 (朱・琥珀) |

### 3.2 セマンティックカラートークン

CSS カスタムプロパティで定義し、Tailwind CSS v4 の `@theme` で参照する。
色値は HSL 形式で管理する。

```css
/* src/index.css */
@layer base {
  :root {
    /* --- Light mode (White / Reshiram) --- */
    --background: 0 0% 98%;          /* 淡い白 */
    --foreground: 0 0% 9%;           /* ほぼ黒 */

    --card: 0 0% 100%;
    --card-foreground: 0 0% 9%;

    --muted: 30 5% 93%;              /* 暖灰 */
    --muted-foreground: 20 5% 45%;

    --accent: 20 80% 52%;            /* 朱・琥珀系アクセント */
    --accent-foreground: 0 0% 100%;

    --primary: 20 80% 52%;           /* プライマリ = アクセントと統一 */
    --primary-foreground: 0 0% 100%;

    --secondary: 30 10% 90%;
    --secondary-foreground: 20 10% 20%;

    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;

    --border: 30 8% 82%;
    --input: 30 8% 82%;
    --ring: 20 80% 52%;

    --radius: 0.25rem;               /* 4px: シャープな角丸 */
  }

  .dark {
    /* --- Dark mode (Black / Zekrom) --- */
    --background: 220 20% 7%;        /* 深い青黒 */
    --foreground: 210 15% 90%;       /* 淡い白青 */

    --card: 220 18% 10%;
    --card-foreground: 210 15% 90%;

    --muted: 215 15% 16%;            /* 寒灰 */
    --muted-foreground: 210 10% 55%;

    --accent: 210 85% 55%;           /* 氷青系アクセント */
    --accent-foreground: 0 0% 100%;

    --primary: 210 85% 55%;          /* プライマリ = アクセントと統一 */
    --primary-foreground: 0 0% 100%;

    --secondary: 215 15% 18%;
    --secondary-foreground: 210 10% 80%;

    --destructive: 0 62% 50%;
    --destructive-foreground: 0 0% 100%;

    --border: 215 15% 20%;
    --input: 215 15% 20%;
    --ring: 210 85% 55%;
  }
}
```

### 3.3 ステータスカラー

検索結果の状態表示に使用する補助色。

| 用途 | ライトモード | ダークモード | 備考 |
|------|------------|------------|------|
| 成功 / 一致 | `hsl(142 72% 29%)` | `hsl(142 72% 45%)` | 目標個体一致 |
| 警告 | `hsl(38 92% 50%)` | `hsl(38 92% 55%)` | 条件部分一致 |
| エラー / 失敗 | `hsl(0 72% 51%)` | `hsl(0 62% 50%)` | destructive と統一 |
| 情報 | `hsl(210 85% 50%)` | `hsl(210 85% 55%)` | ヒント表示 |

### 3.4 ダーク/ライト切替

| 項目 | 方針 |
|------|------|
| 切替方式 | ユーザー手動トグル (`<html>` に `.dark` クラス付与) |
| 初期値 | OS の `prefers-color-scheme` に追従 |
| 永続化 | `localStorage` に保存 (Zustand UI Store 経由) |
| 実装 | `useUiSettings` フックで `theme: 'light' \| 'dark' \| 'system'` を管理 |

## 4. タイポグラフィ

### 4.1 フォントスタック

使い分けルールは **2 択のみ**: 本文は `font-sans`、数値データは `font-mono`。
日付・時刻は本文扱い (`font-sans`)。

| 用途 | フォント | Tailwind クラス |
|------|---------|----------------|
| 本文 | Noto Sans JP, system-ui, sans-serif | `font-sans` |
| 数値 (16進, IV, Seed 等) | JetBrains Mono,  monospace | `font-mono` |

### 4.2 フォント配信と可用性

| フォント | 配信方式 | 可用性 | 備考 |
|---------|---------|--------|------|
| Noto Sans JP | `@fontsource-variable/noto-sans-jp` (npm) | 全環境 | weight: 400, 500, 700 をサブセット読み込み |
| JetBrains Mono | `@fontsource/jetbrains-mono` (npm) | 全環境 | OFL ライセンス。weight: 400, 700 |
| system-ui | OS 同梱 | 全環境 | Noto Sans JP 読み込み完了前のフォールバック専用 |
| monospace | OS 同梱 | 全環境 | JetBrains Mono 読み込み完了前のフォールバック専用 |

**フォールバック順序**: Web フォント (npm) → OS フォント → 総称ファミリ。
ユーザーが意識的に選択する場面はない。`font-sans` か `font-mono` のどちらを当てるかだけ判断する。

### 4.3 フォントサイズスケール (コンパクト設計)

表中のサイズ列は root font-size 16px 時の参考値。実装には Tailwind クラスを使用し、CSS 出力は rem ベースとなる。

| 用途 | 参考サイズ | Tailwind | line-height |
|------|-----------|----------|-------------|
| ページタイトル | 1.25rem (20px) | `text-xl` | 1.4 |
| セクション見出し | 1rem (16px) | `text-base` | 1.5 |
| 本文・ラベル | 0.875rem (14px) | `text-sm` | 1.5 |
| 補足・キャプション | 0.75rem (12px) | `text-xs` | 1.5 |
| テーブルセル | 0.8125rem (13px) | `text-[0.8125rem]` | 1.4 |

### 4.4 数値表示の等幅化

テーブル内や Seed 表示など、数値が並ぶ箇所では `font-mono` + `tabular-nums` を適用する。

```tsx
// 使用例: Seed 表示
<span className="font-mono tabular-nums tracking-tight">
  0x1A2B3C4D5E6F7890
</span>
```

## 5. ビューポート・画面サイズ対応

### 5.1 設計の前提

全サイズの単位に `rem` (Tailwind のデフォルト) を使用し、ブラウザの文字サイズ設定やディスプレイスケール (125%, 150% 等) に自然に追従させる。
固定 `px` レイアウトは使用しない。Tailwind の任意値 (`[]`) を使う場合も `rem` 単位とする。

### 5.2 コンテンツ幅の制約

Sidebar を含むアプリケーション全体のコンテンツ領域に `max-width` を設定し、超広幅ディスプレイでの過度な引き伸ばしを防ぐ。

| トークン | 値 | Tailwind | 用途 |
|---------|-----|----------|------|
| コンテンツ最大幅 | 1280px | `max-w-screen-xl` | Sidebar + メインコンテンツを含む全体。左右中央寄せ |
| テーブル最大幅 | 制限なし | — | 横スクロール (`overflow-x-auto`) で対応 |

### 5.3 対象解像度とテスト基準

| 解像度 | スケール | 実効CSS幅 | 備考 |
|--------|---------|-----------|------|
| HD (1366x768) | 100% | 1366px | ノート PC 最小サイズ目安 |
| Full HD (1920x1080) | 100% | 1920px | 主要ターゲット |
| Full HD (1920x1080) | 125% | 1536px | Windows 既定推奨スケール |
| Full HD (1920x1080) | 150% | 1280px | 高スケール設定 |
| WQHD (2560x1440) | 100% | 2560px | max-width で制約 |
| 4K (3840x2160) | 150% | 2560px | max-width で制約 |
| 4K (3840x2160) | 200% | 1920px | Full HD 相当 |

### 5.4 崩れ防止の方針

| 脅威 | 対策 |
|------|------|
| 超広幅でコンテンツが横に伸びすぎる | `max-w-screen-xl` + `mx-auto` で中央制約 |
| 高スケールで要素が収まらない | `rem` ベースで自然縮小。`min-width` を設定しない (最小は Tailwind `sm: 640px` に追従) |
| HD (1366px) で横幅不足 | サイドバーを折りたたみ可能にする (lg 未満は非表示) |
| zoom 拡大 (Ctrl+/-) | `rem` ベースなのでレイアウト崩れなし |
| 文字サイズ変更 (ブラウザ設定) | `rem` ベースなので追従 |

### 5.5 PC 版 1 画面レイアウト

現行 Web アプリと同様、PC 版 (`lg+`) ではページ全体が**縦スクロールなしで 1 画面に収まる**ことを目指す。

| 項目 | 方針 |
|------|------|
| ページ高さ | ビューポート高さ (`100dvh`) に収める。`overflow: hidden` でページ全体のスクロールを抑制 |
| 結果テーブル | テーブル領域内で独立スクロール (`overflow-y-auto` + `flex-1`)。ページ全体は動かさない |
| フォーム | 折りたたみ・タブ切り替えで表示面積を制御 |
| サイドバー | 固定高さ。内容が溢れる場合は内部スクロール |
| モバイル (`< lg`) | 1 画面制約なし。通常の縦スクロール |

```
┌─ Header ─────────────────────────────┐  ─┐
├─────────┬────────────────────────────┤   │
│         │  Form (compact / tabs)     │   │
│ Sidebar ├────────────────────────────┤   │ 100dvh
│         │  Result Table              │   │
│         │  (internal scroll)         │   │
├─────────┴────────────────────────────┤   │
│ Footer (optional)                    │  ─┘
└──────────────────────────────────────┘
```

### 5.6 ブレークポイント (再掲)

[レスポンシブ対応仕様](./responsive-design.md) のブレークポイント定義に従う。

| Prefix | 最小幅 | 対象 |
|--------|-------|------|
| (default) | 0px | モバイル |
| `sm` | 640px | 大型スマホ |
| `md` | 768px | タブレット |
| `lg` | 1024px | PC |
| `xl` | 1280px | 大型 PC |

## 6. スペーシング

### 6.1 基本単位

Tailwind のデフォルト 4px グリッドを使用する。

### 6.2 コンパクト設計の基準値

表中の値は root font-size 16px 時の参考値。Tailwind クラスの CSS 出力は rem ベース。

| コンテキスト | 参考値 | Tailwind | 備考 |
|-------------|-------|----------|------|
| コンポーネント内パディング | 0.5rem (8px) | `p-2` | ボタン・入力フィールド内部 |
| フォーム要素間ギャップ | 0.5rem (8px) | `gap-2` | ラベル〜入力間 |
| セクション間 | 1rem (16px) | `gap-4` | フォームグループ間 |
| カード内パディング | 0.75rem (12px) | `p-3` | カード・パネル |
| ページ余白 (モバイル) | 1rem (16px) | `px-4` | |
| ページ余白 (PC) | 1.5rem (24px) | `px-6` | |

### 6.3 コンパクトモードの要素高さ

| 要素 | 参考値 | Tailwind | 備考 |
|------|-------|----------|------|
| ボタン (default) | 2rem (32px) | `h-8` | |
| ボタン (sm) | 1.75rem (28px) | `h-7` | |
| 入力フィールド | 2rem (32px) | `h-8` | |
| セレクト | 2rem (32px) | `h-8` | |
| チェックボックス | 1rem (16px) | `size-4` | |
| Switch トラック | 1.25rem × 2.25rem (20×36px) | `h-5 w-9` | on/off トグル用 |
| Switch サム | 1rem (16px) | `size-4` | |
| テーブル行 | 2rem (32px) | `h-8` | |

## 7. 角丸 (Border Radius)

シャープな角丸で情報密度を高める。

| トークン | 値 | Tailwind | 用途 |
|---------|-----|----------|------|
| `--radius` | 0.25rem (4px) | `rounded-sm` | ボタン・入力フィールド・カード |
| 小 | 0.125rem (2px) | `rounded-[0.125rem]` | チェックボックス・タグ |
| 大 | 0.5rem (8px) | `rounded-lg` | ダイアログ・モーダル |
| 完全 | 9999px | `rounded-full` | アバター・バッジ |

## 8. アニメーション・トランジション

### 8.1 方針

ドロップダウン開閉・トースト出現など、状態変化のフィードバックに限定した控えめなトランジションを適用する。

### 8.2 デュレーション定義

| 用途 | 値 | CSS 変数 |
|------|-----|---------|
| ホバー・フォーカス | 100ms | `--duration-fast` |
| ドロップダウン開閉 | 150ms | `--duration-normal` |
| ダイアログ表示 | 200ms | `--duration-slow` |
| トースト出現・退出 | 200ms | `--duration-slow` |

### 8.3 イージング

| 用途 | 値 |
|------|-----|
| 入場 | `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out 寄り) |
| 退場 | `cubic-bezier(0.7, 0, 0.84, 0)` (ease-in 寄り) |
| 汎用 | `cubic-bezier(0.4, 0, 0.2, 1)` |

### 8.4 アクセシビリティ配慮

`prefers-reduced-motion: reduce` 時はアニメーション・トランジションを無効化する。

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## 9. データテーブル

### 9.1 ライブラリ

| ライブラリ | 用途 |
|-----------|------|
| `@tanstack/react-table` | ヘッドレステーブルロジック (ソート・フィルタ・列制御) |
| `@tanstack/react-virtual` | 大量行の仮想スクロール |

### 9.2 テーブルスタイル

| 要素 | スタイル |
|------|---------|
| ヘッダー | `bg-muted` + `text-muted-foreground` + `font-medium text-xs uppercase tracking-wider` |
| 行 | 偶数行に `bg-muted/30` (ゼブラストライプ) |
| セル | `text-sm font-mono tabular-nums` (数値列)、`text-sm` (テキスト列) |
| ホバー | `hover:bg-accent/10` |
| 固定ヘッダー | `sticky top-0` |
| ボーダー | 行間に `border-b border-border` |

### 9.3 モバイル対応

PC ではテーブル表示、モバイル (`< md`) ではカード形式に切り替える。
切り替えは [レスポンシブ対応仕様](./responsive-design.md) の方針に従う。

## 10. フォーム設計

### 10.1 レイアウト

| デバイス | レイアウト |
|---------|----------|
| PC (`lg+`) | グリッド 2-3 列 (`grid-cols-2` / `grid-cols-3`) |
| モバイル | 1 列縦積み (`grid-cols-1`) |

### 10.2 ラベル配置

| パターン | 使い分け |
|---------|---------|
| ラベル上配置 (stacked) | 基本パターン。モバイルでも自然 |
| ラベル左配置 (inline) | IV 入力など、横並びで情報密度を高めたい場合。PC のみ |

### 10.3 バリデーションフィードバック

| 状態 | 視覚表現 |
|------|---------|
| エラー | `border-destructive` + エラーメッセージ (`text-destructive text-xs`) |
| フォーカス | `ring-1 ring-ring` |
| 無効化 | `opacity-50 pointer-events-none` |

### 10.4 フォーカス・入力挙動

数値入力が多いツールのため、フォーカスイン/アウト時の挙動を統一する。

#### フォーカスイン

| 入力タイプ | 挙動 | 理由 |
|-----------|------|------|
| 数値入力 (IV, Seed, Timer0 等) | **テキスト全選択** (`select()`) | 既存値の上書き入力を容易にする。「31」→「25」のように即座に打ち替えられる |
| テキスト入力 (MAC アドレス等) | **テキスト全選択** | 同上 |
| セレクト / チェックボックス | 標準動作 (Radix UI 準拠) | 選択系は全選択不要 |

```tsx
// 共通の onFocus ハンドラ例
function handleFocusSelectAll(e: React.FocusEvent<HTMLInputElement>) {
  e.target.select();
}
```

#### 入力中 (空欄の扱い)

数値フィールドが空欄になった場合、**入力中はデフォルト値へのフォールバックを行わない**。
バリデーションとデフォルト値の適用は blur 時に行う。

| タイミング | 挙動 |
|-----------|------|
| 入力中 (フォーカス中) | 空欄を許容する。入力値をそのまま表示する |
| blur (フォーカスアウト) | 空欄 → デフォルト値に復元。範囲外 → クランプして確定 |

**理由**: 即座にフォールバックさせると、「10」→「31」に書き換える際に「10」→「1」→「**0**」(フォールバック) →「03」→「031」のような意図しない入力シーケンスが発生する。

```tsx
// 数値入力の blur ハンドラ例
function handleBlurWithDefault(
  e: React.FocusEvent<HTMLInputElement>,
  options: { defaultValue: number; min: number; max: number },
) {
  const raw = e.target.value.trim();
  if (raw === "") {
    onChange(options.defaultValue);
    return;
  }
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    onChange(options.defaultValue);
    return;
  }
  onChange(Math.min(Math.max(parsed, options.min), options.max));
}
```

#### Store 反映タイミング

| 方式 | 採用 | 説明 |
|------|------|------|
| onChange 即時反映 | 不採用 | 空欄通過時の中間状態が Store に入る |
| onBlur 確定反映 | **採用** | blur 時にバリデーション済みの値を Store に書き込む |
| ローカル state + blur 同期 | **採用** | コンポーネント内部で `useState` で表示用の生テキストを保持し、blur 時に Store と同期する |

## 11. アクセシビリティ

### 11.1 対応レベル

Radix UI の標準動作に準拠する (キーボードナビゲーション、ARIA ラベル)。
追加の WCAG レベル目標は設定しない。

### 11.2 最低限の対応事項

| 項目 | 対応 |
|------|------|
| キーボード操作 | Radix UI Primitives が標準提供 |
| ARIA ラベル | Radix UI Primitives が標準提供。カスタムコンポーネントには手動付与 |
| フォーカス可視化 | `focus-visible:ring-1 ring-ring` を全対話要素に適用 |
| 色のみに依存しない情報伝達 | アイコン・テキストを併用 |
| `prefers-reduced-motion` | Section 7.4 参照 |

## 12. アイコン

### 12.1 ライブラリ

**Lucide React** (`lucide-react`) を採用する。
shadcn/ui の標準アイコンライブラリであり、Tree-shaking 対応で必要なアイコンのみバンドルされる。

### 12.2 サイズ規約

| コンテキスト | 参考値 | Tailwind |
|-------------|-------|----------|
| ボタン内 | 1rem (16px) | `size-4` |
| インライン (テキスト横) | 0.875rem (14px) | `size-3.5` |
| ナビゲーション | 1.25rem (20px) | `size-5` |

## 13. 依存パッケージ一覧

Phase 2 で追加するパッケージの一覧。

| パッケージ | 種別 | 用途 |
|-----------|------|------|
| `tailwindcss` | devDependencies | CSS フレームワーク (v4) |
| `@tailwindcss/vite` | devDependencies | Vite 統合プラグイン |
| `@radix-ui/react-*` | dependencies | 各 UI プリミティブ (必要に応じて個別追加) |
| `class-variance-authority` | dependencies | コンポーネントバリアント管理 |
| `clsx` | dependencies | 条件付きクラス結合 |
| `tailwind-merge` | dependencies | Tailwind クラスの重複解決 |
| `lucide-react` | dependencies | アイコン |
| `@tanstack/react-table` | dependencies | テーブルロジック |
| `@tanstack/react-virtual` | dependencies | 仮想スクロール |
| `@fontsource-variable/noto-sans-jp` | dependencies | Noto Sans JP フォント |
| `@fontsource/jetbrains-mono` | dependencies | JetBrains Mono フォント |

## 14. ファイル構成

```
src/
├── index.css                 # CSS 変数 (デザイントークン) + Tailwind ベースレイヤー
├── lib/
│   └── utils.ts              # cn() 関数
├── components/
│   └── ui/                   # shadcn/ui スタイルの基本コンポーネント
│       ├── button.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── checkbox.tsx
│       ├── switch.tsx
│       ├── tabs.tsx
│       ├── dialog.tsx
│       └── toast.tsx
```

## 15. コンポーネント実装規約

### 15.1 ファイル命名

- UI 基本部品: `src/components/ui/{component-name}.tsx` (kebab-case)
- フォーム部品: `src/components/forms/{component-name}.tsx`
- レイアウト部品: `src/components/layout/{component-name}.tsx`
- データ表示部品: `src/components/data-display/{component-name}.tsx`

### 15.2 エクスポートパターン

各コンポーネントファイルは名前付きエクスポートを使用する。

```tsx
// src/components/ui/button.tsx
export type { ButtonProps };
export { Button, buttonVariants };
```

### 15.3 props 設計規約

```tsx
// Radix プリミティブを拡張するパターン (React 19)
function MyComponent({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof Primitive.Root>) {
  return <Primitive.Root ref={ref} className={cn('...', className)} {...props} />;
}
```

- `React.ComponentPropsWithRef` で `ref` を含むネイティブ属性を透過 (React 19)
- cva バリアントが必要な場合は `VariantProps` を intersection で追加
- `forwardRef` は使用しない (React 19 では props に `ref` が含まれる)

## 16. 関連ドキュメント

- [フロントエンド構成](./frontend-structure.md) — ディレクトリ構成・命名規則
- [レスポンシブ対応](./responsive-design.md) — ブレークポイント・レイアウトパターン
- [状態管理方針](./state-management.md) — Store 設計・永続化
- [i18n 設計](./i18n-design.md) — 多言語対応・翻訳管理
- [実装ロードマップ](./implementation-roadmap.md) — Phase 2 のコンポーネント一覧
