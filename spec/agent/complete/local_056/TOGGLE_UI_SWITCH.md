# 二値トグル UI の Switch 化 仕様書

## 1. 概要

### 1.1 目的

二値 on/off トグルとして使用されている Checkbox を、モバイル UI で標準的な Switch (トグルスイッチ) コンポーネントに置き換える。複数選択リスト内のチェック状態表示には引き続き Checkbox を使用し、用途ごとに UI コンポーネントを使い分ける。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| Switch | Radix UI の `@radix-ui/react-switch` に基づくトグルスイッチコンポーネント |
| Checkbox | 既存の `@radix-ui/react-checkbox` に基づくチェックボックスコンポーネント |
| 二値トグル | on/off の 2 状態を切り替える操作。設定パネル等で使用 |

### 1.3 背景・問題

- 現在、二値 on/off トグル (セーブ有無、Memory Link、光るお守り、Timer0 Auto) に Checkbox を使用している
- モバイル OS の設定画面やアクセシビリティガイドラインでは、即時反映される on/off 切り替えには Switch を使うのが一般的
- Checkbox は「複数選択リストからの項目選択」に適する UI パターンである
- Radix UI に `Switch` プリミティブが存在するが、本プロジェクトでは未導入

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| UI 意図の明確化 | on/off トグル = Switch、項目選択 = Checkbox で役割が視覚的に区別される |
| モバイル UX 向上 | Switch はタッチ操作のターゲットが大きく、モバイルでの操作性が向上する |

### 1.5 着手条件

- [x] Phase 2 共通コンポーネント完了
- [x] DS 設定 (Phase 3.1) 完了

## 2. 対象ファイル

### 2.1 実装ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `package.json` | 変更 | `@radix-ui/react-switch` を dependencies に追加 |
| `src/components/ui/switch.tsx` | 新規 | Switch コンポーネント (Radix UI ラッパー) |
| `src/features/ds-config/components/game-start-config-form.tsx` | 変更 | 3 箇所の Checkbox → Switch に置換 |
| `src/features/ds-config/components/timer0-vcount-section.tsx` | 変更 | 1 箇所の Checkbox → Switch に置換 |

### 2.2 アーキテクチャドキュメント

| ファイル | 変更箇所 | 変更内容 |
|---------|---------|---------|
| `spec/agent/architecture/design-system.md` | Section 6 チェックボックスサイズ | Switch のサイズ定義を追加 |
| `spec/agent/architecture/design-system.md` | Section 14 ファイル構成 | `switch.tsx` を追加 |
| `spec/agent/architecture/design-system.md` | Section 15.3 props 設計 | `forwardRef` 記述を更新 (local_057 と連動) |
| `spec/agent/architecture/implementation-roadmap.md` | Phase 2 Section 4.1 UI 部品 | Switch 行を追加 |

### 2.3 WIP 仕様書

| ファイル | 影響有無 | 理由 |
|---------|---------|------|
| `spec/agent/wip/local_054/DATETIME_SEARCH.md` | 影響なし | Checkbox をトグル用途で使用していない |
| `spec/agent/wip/local_055/EGG_SEARCH.md` | 要確認 | 孵化パラメータに on/off トグル (かわらずのいし、国際孵化等) が含まれる。新規作成時は Switch を使用する |

### 2.4 変更しないファイル

| ファイル | 理由 |
|---------|------|
| `src/components/ui/checkbox.tsx` | 複数選択リスト用途で引き続き使用。変更不要 |
| `src/components/forms/nature-select.tsx` | 複数選択リスト内のチェック → Checkbox のまま |
| `src/components/forms/hidden-power-select.tsx` | 複数選択リスト内のチェック → Checkbox のまま |
| `src/components/forms/iv-range-input.tsx` | 行ごとの「不明」チェック → Checkbox のまま (密集グリッド内で Switch はスペースを取りすぎる) |

## 3. 設計方針

### 3.1 使い分け基準

| 用途 | コンポーネント | 判断根拠 |
|------|--------------|---------|
| on/off 即時反映トグル | Switch | 設定変更が即座に反映される。1 つの独立した設定項目 |
| 複数項目からの選択 | Checkbox | リスト内で複数項目を選択する。送信/確定アクションが伴う場合もある |
| 行ごとの有効/無効化 | Checkbox | 密集したグリッド内でコンパクトに収める必要がある場合 |

### 3.2 Switch コンポーネント設計

`@radix-ui/react-switch` をラップし、既存の Checkbox と同様に shadcn/ui スタイルで実装する。

- React 19 対応のため、`forwardRef` は使用しない (local_057 と整合)
- `cn()` でカスタムクラスを合成可能にする
- デザインシステムのカラートークン (`--primary`, `--input`) を使用

### 3.3 サイズ定義

| 要素 | 参考値 | Tailwind |
|------|-------|----------|
| Switch トラック幅 | 2.25rem (36px) | `w-9` |
| Switch トラック高さ | 1.25rem (20px) | `h-5` |
| Switch サム (つまみ) | 1rem (16px) | `size-4` |

コンパクト設計に合わせ、shadcn/ui のデフォルトより小さめのサイズを採用する。

## 4. 実装仕様

### 4.1 Switch コンポーネント

```tsx
// src/components/ui/switch.tsx
import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

function Switch({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        className
      )}
      ref={ref}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0'
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
```

### 4.2 GameStartConfigForm の変更例

```tsx
// 変更前
import { Checkbox } from '@/components/ui/checkbox';

<div className="flex items-center gap-2">
  <Checkbox
    id="save-presence"
    checked={gameStart.save === 'WithSave'}
    onCheckedChange={(checked) => setGameStart({ ... })}
    disabled={gameStart.start_mode === 'Continue'}
    aria-label={t`With save`}
  />
  <Label htmlFor="save-presence" className="text-xs">
    <Trans>With save</Trans>
  </Label>
</div>

// 変更後
import { Switch } from '@/components/ui/switch';

<div className="flex items-center justify-between">
  <Label htmlFor="save-presence" className="text-xs">
    <Trans>With save</Trans>
  </Label>
  <Switch
    id="save-presence"
    checked={gameStart.save === 'WithSave'}
    onCheckedChange={(checked) => setGameStart({ ... })}
    disabled={gameStart.start_mode === 'Continue'}
    aria-label={t`With save`}
  />
</div>
```

レイアウト変更の要点:

- Checkbox: `[☐ ラベル]` (左にチェック、右にラベル)
- Switch: `[ラベル ──●]` (左にラベル、右にスイッチ)。設定画面の標準配置

### 4.3 Timer0VCountSection の変更

Timer0 Auto のトグルも同様に Switch に置換する。ヘッダー右端への配置はそのまま維持。

## 5. テスト方針

### 5.1 コンポーネントテスト

| テスト | 検証内容 | ファイル |
|--------|---------|---------|
| Switch 基本動作 | クリックで状態遷移、disabled 時の操作無効化 | `src/test/components/switch.test.tsx` |

### 5.2 既存テストへの影響

| テスト | 影響 |
|--------|------|
| `game-start-config-form` テスト (存在する場合) | Checkbox → Switch でロール名が変わる (`checkbox` → `switch`)。テスト内の `getByRole` を更新 |

## 6. 実装チェックリスト

- [x] `@radix-ui/react-switch` をインストール
- [x] `src/components/ui/switch.tsx` を作成
- [x] `game-start-config-form.tsx` で 3 箇所の Checkbox → Switch に変更
- [x] `timer0-vcount-section.tsx` で 1 箇所の Checkbox → Switch に変更
- [ ] Switch のコンポーネントテストを追加
- [ ] 既存テストのロール名を更新 (該当する場合)
- [ ] `design-system.md` に Switch のサイズ定義を追記
- [ ] `design-system.md` のファイル構成に `switch.tsx` を追記
- [ ] `implementation-roadmap.md` の Phase 2 UI 部品に Switch を追記
- [ ] `local_055/EGG_SEARCH.md` の孵化パラメータフォームで Switch 使用を明記
