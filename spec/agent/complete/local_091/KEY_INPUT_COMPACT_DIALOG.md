# キー入力 UI コンパクト化 (ダイアログ方式) 仕様書

## 1. 概要

### 1.1 目的

DS ボタン選択 UI (`DsButtonToggleGroup`) がフォーム内で大きなスペースを占有している問題を解消する。インライン表示をコンパクトな1行インジケータ + ボタンに縮小し、詳細編集はダイアログで行う方式に変更する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| KeyInput | 確定した1組のボタン入力。`{ buttons: DsButton[] }` |
| KeySpec | 探索対象ボタン組み合わせ仕様。`{ available_buttons: DsButton[] }` |
| インジケータ | 選択中のボタンを1行で表示する read-only の要約表示 |
| DsButtonToggleGroup | DS コントローラ風の 12 ボタントグル UI (既存コンポーネント) |

### 1.3 背景・問題

- `DsButtonToggleGroup` は DS コントローラ風の 3×3 グリッド × 2 + ショルダー + Start/Select のレイアウトで、縦方向に約 180px を占有する
- この UI は `SearchContextForm` (日付検索・ID検索・孵化検索)、`SeedInputSection` (Startup タブ)、針読みの `SeedInput` で使用されており、サイドバー / コントロールパネルの限られたスペースを圧迫する
- 参照実装 (niart120/pokemon-gen5-initseed) では、選択中ボタンのインジケータ表示 + 「キー入力」ボタンの 1 行形式を採用しており、フォームの省スペース化に成功している
- キー入力の変更頻度は低く(一度設定すればほとんど変更しない)、常時展開する必要がない

### 1.4 期待効果

| 指標 | 現状 | 変更後 |
|------|------|--------|
| キー入力 UI の縦幅 | 約 180px (コントローラ風レイアウト全体) | 約 36px (1行: ラベル + インジケータ + ボタン) |
| 操作フロー | 直接ボタンをトグル | インジケータ確認 → ダイアログを開いてトグル → 閉じて反映 |
| 情報の視認性 | ボタン選択状態がトグル UI で確認可能 | インジケータで「A + Start」等のテキスト表示 |

### 1.5 着手条件

- `DsButtonToggleGroup` コンポーネントが安定稼働していること → 済
- `KeyInputSelector` / `KeySpecSelector` が各 feature ページで使用されていること → 済
- Radix UI Dialog コンポーネントが利用可能であること → 済

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/components/forms/key-input-selector.tsx` | 修正 | インジケータ + ダイアログ方式に変更 |
| `src/components/forms/key-spec-selector.tsx` | 修正 | インジケータ + ダイアログ方式に変更 |
| `src/components/forms/ds-button-toggle-group.tsx` | 変更なし | ダイアログ内部で既存コンポーネントをそのまま利用 |
| `src/components/forms/search-context-form.tsx` | 変更なし | `KeySpecSelector` 呼び出し側は props 変更不要 |
| `src/components/forms/seed-input-section.tsx` | 変更なし | `KeyInputSelector` 呼び出し側は props 変更不要 |
| `src/features/needle/components/seed-input.tsx` | 変更なし | `KeySpecSelector` 呼び出し側は props 変更不要 |
| `src/lib/format.ts` | 修正 | `formatDsButtons` 関数を追加 (DsButton[] → 表示文字列) |
| `src/i18n/locales/ja/messages.po` | 修正 | 新規翻訳キー追加 |
| `src/i18n/locales/en/messages.po` | 修正 | 新規翻訳キー追加 |
| `src/test/unit/lib/format.test.ts` | 修正 | `formatDsButtons` テスト追加 |
| `src/test/components/forms/key-spec-selector.test.tsx` | 修正 | ダイアログ方式に対応したテスト更新 |
| `src/test/components/forms/key-spec-input.test.tsx` | 修正 | ダイアログ方式に対応したテスト更新 (重複テストファイル) |

## 3. 設計方針

### 3.1 コンポーネント構成

```
KeySpecSelector (修正)
  ├── インジケータ行 (1行: ラベル + 選択ボタン表示 + 組み合わせ数 + 編集ボタン)
  └── Dialog (Radix UI)
       └── DsButtonToggleGroup (既存・変更なし)

KeyInputSelector (修正)
  ├── インジケータ行 (1行: ラベル + 選択ボタン表示 + 編集ボタン)
  └── Dialog (Radix UI)
       └── DsButtonToggleGroup (既存・変更なし)
```

### 3.2 方針

- **外部インターフェース維持**: `KeyInputSelector` / `KeySpecSelector` の Props (value, onChange, disabled 等) は変更しない。呼び出し側の修正は不要
- **DsButtonToggleGroup 再利用**: ダイアログ内で既存コンポーネントをそのまま使用する。ダイアログ固有のスタイル調整のみ行う
- **リアルタイム反映**: ダイアログ内でボタンをトグルした時点で親に onChange を通知する (確定ボタン方式ではない)。ダイアログは編集ビューの表示/非表示の切り替えに過ぎない
- **インジケータ表示**: `DsButton[]` を `"A + Start"` のように `+` 区切りで表示する。空の場合は「なし」等を表示する

### 3.3 インジケータ行レイアウト

```
[ラベル] [選択中ボタンテキスト (read-only)]  [組み合わせ数*] [キー入力 ボタン]
```

- ラベル: `KeySpecSelector` は "キー入力"、`KeyInputSelector` は "キー入力 (押すボタン)"
- 選択中ボタンテキスト: `formatDsButtons(buttons)` の結果を表示。例: `"A + Start"`、ボタン未選択時は `"なし"`
- 組み合わせ数: `KeySpecSelector` のみ表示 (`combinationCount`)
- 編集ボタン: ダイアログを開くトリガー。テキスト "キー入力" またはアイコンボタン

## 4. 実装仕様

### 4.1 `formatDsButtons` (新規追加: `src/lib/format.ts`)

```typescript
/**
 * DsButton[] を表示用文字列にフォーマット
 * 例: ['A', 'Start'] → "A + Start", [] → "なし"
 */
function formatDsButtons(buttons: DsButton[]): string {
  if (buttons.length === 0) return 'なし';
  return buttons
    .map((b) => BUTTON_LABELS_FORMAT[b])
    .join(' + ');
}
```

`BUTTON_LABELS_FORMAT` は既存の `formatKeyCode` で使用している `KEY_BUTTONS` のラベルと同じ表記を使用する:
- A, B, X, Y, L, R, Start, Select, ↑, ↓, ←, →

### 4.2 `KeySpecSelector` (修正)

```tsx
function KeySpecSelector({ value, onChange, disabled, combinationCount }: KeySpecSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleToggle = useCallback(
    (next: DsButton[]) => {
      onChange({ available_buttons: next });
    },
    [onChange]
  );

  const displayText = formatDsButtons(value.available_buttons);
  const countText = combinationCount === undefined
    ? value.available_buttons.length
    : combinationCount.toLocaleString();

  return (
    <>
      {/* インジケータ行 */}
      <div className="flex items-center gap-2">
        <Label className="shrink-0 text-xs text-muted-foreground">
          <Trans>Key input</Trans>
        </Label>
        <span className="min-w-0 flex-1 truncate text-xs font-mono">
          {displayText}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          ({countText})
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setDialogOpen(true)}
        >
          <Trans>Key input</Trans>
        </Button>
      </div>

      {/* 編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><Trans>Key input</Trans></DialogTitle>
          </DialogHeader>
          <DsButtonToggleGroup
            selected={value.available_buttons}
            onToggle={handleToggle}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            <Trans>Combinations</Trans>: {countText}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### 4.3 `KeyInputSelector` (修正)

`KeySpecSelector` と同構造。差分:
- ラベルが「キー入力 (押すボタン)」
- `combinationCount` を表示しない
- フッターに「選択ボタン数: N」を表示

```tsx
function KeyInputSelector({ value, onChange, disabled }: KeyInputSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleToggle = useCallback(
    (next: DsButton[]) => {
      onChange({ buttons: next });
    },
    [onChange]
  );

  const displayText = formatDsButtons(value.buttons);

  return (
    <>
      <div className="flex items-center gap-2">
        <Label className="shrink-0 text-xs text-muted-foreground">
          <Trans>Key input (buttons held)</Trans>
        </Label>
        <span className="min-w-0 flex-1 truncate text-xs font-mono">
          {displayText}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setDialogOpen(true)}
        >
          <Trans>Key input</Trans>
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><Trans>Key input (buttons held)</Trans></DialogTitle>
          </DialogHeader>
          <DsButtonToggleGroup
            selected={value.buttons}
            onToggle={handleToggle}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            <Trans>Selected buttons</Trans>: {value.buttons.length}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト | ファイル | 検証内容 |
|--------|----------|----------|
| `formatDsButtons` 空配列 | `src/test/unit/lib/format.test.ts` | `[]` → `"なし"` |
| `formatDsButtons` 単一ボタン | 同上 | `['A']` → `"A"` |
| `formatDsButtons` 複数ボタン | 同上 | `['A', 'Start']` → `"A + Start"` |
| `formatDsButtons` D-Pad | 同上 | `['Up', 'Left']` → `"↑ + ←"` |

### 5.2 コンポーネントテスト

| テスト | ファイル | 検証内容 |
|--------|----------|----------|
| インジケータ表示 | `src/test/components/forms/key-spec-selector.test.tsx` | 選択中ボタンのテキストがインジケータに表示される |
| ダイアログ開閉 | 同上 | ボタンクリックでダイアログが開き、閉じることができる |
| ダイアログ内トグル | 同上 | ダイアログ内のボタンをトグルすると onChange が呼ばれる |
| disabled 状態 | 同上 | disabled 時に編集ボタンが無効化される |
| 組み合わせ数表示 | 同上 | `combinationCount` がインジケータ行に表示される |

## 6. 実装チェックリスト

- [x] `src/lib/format.ts` に `formatDsButtons` を追加
- [x] `src/test/unit/lib/format.test.ts` に `formatDsButtons` テストを追加
- [x] `src/components/forms/key-spec-selector.tsx` をダイアログ方式に変更
- [x] `src/components/forms/key-input-selector.tsx` をダイアログ方式に変更
- [x] `src/test/components/forms/key-spec-selector.test.tsx` をダイアログ方式に対応
- [x] `src/test/components/forms/key-spec-input.test.tsx` をダイアログ方式に対応
- [x] i18n メッセージの追加・更新 (`pnpm lingui:extract`) — 新規キーなし (既存キーのみ使用)
- [x] `pnpm lint` / `pnpm exec tsc -b --noEmit` 通過確認
- [x] `pnpm test:run` 通過確認 (105 files, 1314 passed)
- [ ] 画面確認: 各ページでインジケータ行が 1 行で表示される
- [ ] 画面確認: ダイアログ内で DS ボタンのトグルが正常に動作する
