# UI/UX ポリッシュ 統合仕様書

## 1. 概要

### 1.1 目的

各 feature ページおよび共通コンポーネントの視覚的一貫性、レイアウト、ユーザビリティの改善を一括で実施する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| KeySpecSelector | DS ボタン組み合わせ選択 UI (`src/components/forms/key-spec-selector.tsx`) |
| KeyInputSelector | DS ボタン入力選択 UI (`src/components/forms/key-input-selector.tsx`) |
| IvRangeInput | 個体値範囲入力グリッド (`src/components/forms/iv-range-input.tsx`) |
| FeaturePageLayout | Controls/Results 2 ペイン構成レイアウト (`src/components/layout/feature-page-layout.tsx`) |
| ResponsiveContainer | サイドバー + メインコンテンツの外枠レイアウト (`src/components/layout/responsive-container.tsx`) |
| EmptyState | 結果ゼロ時の空状態表示 (`src/components/data-display/empty-state.tsx`) |
| SeedInputSection | Seed 入力セクション (`src/components/forms/seed-input-section.tsx`) |
| SpinnerNumField | スピナー付き数値入力 (`src/components/ui/spinner-num-field.tsx`) |

### 1.3 背景・問題

アプリの主要機能が出揃い安定稼働している段階で、UI/UX の不整合・改善点が残っている。本仕様書では P-01 〜 P-17 のカテゴリで一括管理する。

### 1.4 着手条件

- `local_093` (GPU プロファイル検出再設計) が完了していること

## 2. 修正項目一覧

| ID | カテゴリ | 概要 | 主な対象ファイル |
|----|----------|------|-----------------|
| P-01 | 空状態統一 | 全ページで `EmptyState` コンポーネントに統一 | 各ページコンポーネント |
| P-02 | 二重パディング | FeaturePageLayout + ResponsiveContainer の累積パディング解消 | `feature-page-layout.tsx`, `responsive-container.tsx` |
| P-03 | KeySpecSelector | 組み合わせ件数の削除、ボタンラベル「編集」に変更 | `key-spec-selector.tsx` |
| P-04 | KeyInputSelector | `(buttons held)` 削除、ダイアログ内選択数削除、ボタンラベル「編集」に変更 | `key-input-selector.tsx` |
| P-05 | IvRangeInput | min/max ヘッダ行の常時表示 | `iv-range-input.tsx` |
| P-06 | MtseedSearch 結果表示 | 結果表示エリアの他ページとの統一 | `mtseed-search-page.tsx` |
| P-07 | TID Adjust セーブ注記 | 「セーブ状態」見出し追加 + 注記削除 | `tid-adjust-page.tsx` |
| P-08 | キー入力表示順 | `formatDsButtons` のソート順を統一 | `format.ts` |
| P-09 | SeedInputSection 冗長表示 | DS 設定読み込み文言と解決済み Seed 件数の削除 | `seed-input-section.tsx` |
| P-10 | フィルター初期状態 | フィルターをデフォルト有効化 | `pokemon-filter-form.tsx` |
| P-11 | セレクタサイズ統一 | NatureSelect, HiddenPowerSelect のトリガー高さ統一 | `nature-select.tsx`, `hidden-power-select.tsx` |
| P-12 | エンカウント設定レイアウト | 場所 + エンカウント方法の同一行化、「固定」→「あまいかおり」 | `pokemon-params-form.tsx`, i18n |
| P-13 | SpinnerNumField フォーカス | フォーカス時全選択の共通ヘルパー適用 | `spinner-num-field.tsx` |
| P-14 | ツール タブ並び順 | 針読み → TID 調整 → MT Seed 検索 に変更 | `navigation.ts` |
| P-15 | TID Adjust レイアウト | TID / SID / PID を一行に配置 | `tid-adjust-form.tsx` |
| P-16 | 針読み入力プレースホルダ | 方向数値入力のプレースホルダ "24267" を削除 | `needle-input.tsx` |
| P-17 | 「転記」→「コピー」 | UI 上の "転記" 表現を "コピー" に統一 | i18n (`ja.po`) |
| P-18 | めざパフィルター同行化 | タイプ選択と威力下限を同一行に配置 | `hidden-power-select.tsx` |
| P-19 | キー入力ダイアログ改善 | OK 確定 + 全選択/全解除ボタン追加 | `key-spec-selector.tsx`, `key-input-selector.tsx` |
| P-20 | 検索ボタン高さ安定化 | GPU トグル有無による高さ変動を防止 | `search-controls.tsx` |
| P-21 | TID/SID/PID グリッド化 | 3 列 grid で幅を均等化 | `tid-adjust-form.tsx` |
| P-22 | 針読み Seed 表示省略 | SeedInput の初期 Seed 解決結果表示を削除 | `seed-input.tsx` |
| P-23 | フィルター並び順 | ステータス → 特性スロット → 性別 → 性格 → 色違い → (種族) の順に変更 | `pokemon-filter-form.tsx`, `egg-filter-form.tsx` |
| P-24 | フィルター ラベル追加 | NatureSelect / SpeciesSelect にラベルを追加し、トリガーからラベル重複を除去 | `nature-select.tsx`, `pokemon-filter-form.tsx` |
| P-25 | フィルター 2 列化 | 特性スロット / 性別 / 性格 / 色違いを `grid-cols-2` で配置 | `pokemon-filter-form.tsx`, `egg-filter-form.tsx` |
| P-26 | タマゴ IV 補足削除 | 「空欄にすると個体値が「?」で表示されます」を削除 | `egg-params-form.tsx` |
| P-27 | SpinnerNumField 全選択修正 | ゼロ埋め値フォーカス時の全選択が解除される問題の修正 | `spinner-num-field.tsx` |
| P-28 | タマゴパラメータ 2 列化 | ♀親特性 / かわらずのいし / 性別比 / 種族 を 2 列配置 | `egg-params-form.tsx` |
| P-29 | 種族→性別比の自動導出 | 種族選択時に WASM から性別比を取得して自動設定 | `egg-params-form.tsx`, `lib.rs` |
| P-30 | EggFilter デフォルト有効化 | `EggFilterForm` のフィルターをデフォルト有効化、リセットでも有効維持 | `egg-filter-form.tsx` |
| P-31 | タマゴ結果 種族列削除 | タマゴ個体生成結果の種族列を削除 (検索条件から自明) | `egg-result-columns.tsx`, `export-columns.ts` |

## 3. 設計方針

- カテゴリ間に依存関係なし。任意の順序で実装可能
- 動作変更を伴わない純粋な見た目・レイアウトの調整は、テスト追加不要
- 既存コンポーネントの props 変更を伴う場合は、既存テストへの影響を確認
- i18n キー変更時は `pnpm run extract` で `.po` を更新し、`ja.po` / `en.po` の訳を修正
- 各カテゴリを独立したコミットに対応させる

## 4. 実装仕様

### P-01: EmptyState コンポーネントの統一

**現状**: 各ページがインラインでテキスト表示。`EmptyState` コンポーネントが存在するが未使用のページがある。

**変更**: 全ページで `EmptyState` コンポーネントを使用。ページ固有のガイダンスメッセージは `message` prop で渡す。

対象ページと現行メッセージ:

| ページ | 現行メッセージ | 対応 |
|--------|--------------|------|
| datetime-search | 「結果が見つかりませんでした。MT Seedを入力して検索を開始してください。」 | `EmptyState` の `message` prop に渡す |
| egg-search | 「結果が見つかりませんでした。パラメータを設定して検索を開始してください。」 | 同上 |
| pokemon-list | 「結果が見つかりませんでした。パラメータを設定して生成を開始してください。」 | 同上 |
| egg-list | 「結果が見つかりませんでした。パラメータを設定して生成を開始してください。」 | 同上 |
| mtseed-search | 「結果なし」 | 同上 |
| tid-adjust | 「結果なし」 | 同上 |
| needle | 「結果なし」 | 同上 |

### P-02: 二重パディングの解消

**現状**:
- `ResponsiveContainer` 内部: `<div className="px-4 py-4 lg:px-6">`
- `FeaturePageLayout`: `<div className="... p-4 ...">`
- 累積: モバイル 水平 32px / デスクトップ 水平 40px

**変更**: `FeaturePageLayout` の `p-4` を削除。`ResponsiveContainer` 側のパディングに統一。

```tsx
// feature-page-layout.tsx (変更後)
function FeaturePageLayout({ children, className }: FeaturePageLayoutProps) {
  return (
    <div className={cn('flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row', className)}>
      {children}
    </div>
  );
}
```

影響: `FeaturePageLayout` を使用する全ページ。各ページの `className="pb-32 lg:pb-4"` 等のオーバーライドは再調整が必要。

### P-03: KeySpecSelector の改善

**現状**: インジケータ行に「キー入力」ラベル + 選択値 + `(N)` カウント + 「キー入力」ボタン。テキスト重複、カウント意味不明。

**変更**:
1. 組み合わせ件数表示 `(countText)` を削除
2. ダイアログ内の組み合わせ数表示も削除
3. ボタンラベルを「編集」に変更

```tsx
// インジケータ行 (変更後)
<div className="flex items-center gap-2">
  <Label className="shrink-0 text-xs text-muted-foreground">
    <Trans>Key input</Trans>
  </Label>
  <span className="min-w-0 flex-1 truncate text-xs font-mono">
    {displayText || <Trans>None</Trans>}
  </span>
  <Button type="button" variant="outline" size="sm"
    disabled={disabled} onClick={() => setDialogOpen(true)}>
    <Trans>Edit</Trans>
  </Button>
</div>
```

呼び出し元で `combinationCount` を渡している箇所 (`SearchContextForm`) の props 変更も必要。`countKeyCombinations` 自体は検索見積もりで使用するため計算は残す。

### P-04: KeyInputSelector の改善

**現状**: ラベルが `Key input (buttons held)` で冗長。ダイアログ内に「Selected buttons: N」が表示される。ボタンラベルも「キー入力」で重複。

**変更**:
1. ラベルを `Key input` に変更 (`(buttons held)` を削除)
2. ダイアログタイトルも `Key input` に変更
3. ダイアログ内の「Selected buttons: N」を削除
4. ボタンラベルを「編集」に変更

### P-05: IvRangeInput の min/max ラベル常時表示

**現状**: `allowUnknown === true` 時のみヘッダ行 (min / max / Any) を表示。`allowUnknown === false` 時 (MT Seed 検索) はヘッダなし。

**変更**: ヘッダ行を常時表示。`Any` カラムのみ `allowUnknown` 時に表示。

```tsx
// IvRangeInput (変更後 — ヘッダ部分)
<div className={cn('grid items-center gap-x-2 gap-y-0 mb-1', gridCols)}>
  <span className="text-xs text-muted-foreground" />
  <span className="text-xs text-muted-foreground text-center">min</span>
  <span className="text-xs text-muted-foreground text-center">max</span>
  {allowUnknown && (
    <span className="text-xs text-muted-foreground text-center">
      <Trans>Any</Trans>
    </span>
  )}
</div>
```

### P-06: MtseedSearch 結果表示の統一

**現状**: 結果あり時は `text-sm` で「N seeds found」+ 起動時刻検索ボタン + エクスポート。結果なし時は `text-xs` で「Results: 0」+ エクスポート。他ページの `検索結果: N` + エクスポートと不整合。

**変更**: 結果あり/なし問わず統一的な構造にする。

```tsx
// 変更後
<div className="flex items-center justify-between">
  <p className="text-xs text-muted-foreground">
    <Trans>Results</Trans>: {results.length.toLocaleString()}
  </p>
  <div className="flex items-center gap-2">
    {results.length > 0 && (
      <Button variant="outline" size="sm" onClick={handleNavigateToDatetimeSearch}>
        <Trans>Search Boot Timing</Trans>
      </Button>
    )}
    <ExportToolbar resultCount={results.length} exportActions={exportActions} />
  </div>
</div>
```

### P-07: TID Adjust セーブ注記の改善

**現状**: セーブなし/セーブあり タブの下に「この設定はサイドバーとは独立しています。」の注記。

**変更**: タブの上に「セーブ状態」のセクション見出し (`h3`) を追加し、注記は削除。

```tsx
// 変更後
<h3 className="text-sm font-medium">
  <Trans>Save state</Trans>
</h3>
<Tabs value={effectiveSaveMode} onValueChange={(v) => setSaveMode(v as SaveMode)}>
  {/* ... */}
</Tabs>
{/* 注記削除 */}
```

### P-08: キー入力表示順の統一

**現状**: `formatDsButtons` は渡された配列の順序に依存。DsButtonToggleGroup のトグル順序に応じて並び順が不安定。

**変更**: `formatDsButtons` 内部で固定のソート順を適用する。

ソート順: `A, B, X, Y, L, R, ↑, ↓, ←, →, Start, Select`

```ts
// format.ts
const DISPLAY_ORDER: DsButton[] = [
  'A', 'B', 'X', 'Y', 'L', 'R', 'Up', 'Down', 'Left', 'Right', 'Start', 'Select',
];

function formatDsButtons(buttons: DsButton[]): string {
  const sorted = [...buttons].sort(
    (a, b) => DISPLAY_ORDER.indexOf(a) - DISPLAY_ORDER.indexOf(b)
  );
  return sorted.map((b) => BUTTON_LABELS[b]).join(', ');
}
```

結果テーブルのキー入力カラム (`formatKeyCode`) で使用している `KEY_BUTTONS` の並び順も `DISPLAY_ORDER` に合わせ、Start/Select を末尾に移動する。

### P-09: SeedInputSection 冗長表示の削除

**現状**:
- 起動条件タブに「DS設定とTimer0/VCount範囲はサイドバーの設定から読み込まれます。」の説明文
- 各タブ (起動条件 / Seed 入力 / インポート) に「解決済みSeed: N」の件数表示

**変更**: 両方とも削除。

### P-10: フィルター初期状態の有効化

**現状**: `PokemonFilterForm` の `filterEnabled` は `value !== undefined || statsFilter !== undefined` で初期化。フィルタ値が未設定時は `false`。

**変更**: `useState(true)` に変更し、フィルターをデフォルト有効にする。

```tsx
// pokemon-filter-form.tsx (変更後)
const [filterEnabled, setFilterEnabled] = useState(true);
```

`EggFilterForm` の `showToggle === true` (egg-search) 時の挙動も確認し、必要に応じて同様に変更。

### P-11: セレクタサイズの統一

**現状**: Radix Select ベースのコンポーネント (`AbilitySlotSelect`, `GenderSelect`, `ShinySelect`) は `h-8 text-xs`。Popover ベースの `NatureSelect`, `HiddenPowerSelect` は `w-full` の Button トリガーで高さ指定なし。

**変更**: `NatureSelect`, `HiddenPowerSelect` のトリガー Button に `h-8 text-xs` を追加。

### P-12: エンカウント設定レイアウト改善

**現状**: 「場所」と「エンカウント方法」が縦積み。「Stationary」の日本語訳が「固定」。

**変更**:
1. 「場所」と「エンカウント方法」を同一行に配置 (場所: flex-1、エンカウント方法: 固定幅)
2. `Stationary` の日本語訳を「固定」→「あまいかおり」に変更 (英語は維持)

```tsx
// 同一行レイアウト
<div className="flex gap-2">
  <div className="flex min-w-0 flex-1 flex-col gap-1">
    <Label className="text-xs"><Trans>Location</Trans></Label>
    <Select ...>...</Select>
  </div>
  <div className="flex w-32 shrink-0 flex-col gap-1">
    <Label className="text-xs"><Trans>Encounter method</Trans></Label>
    <Select ...>...</Select>
  </div>
</div>
```

### P-13: SpinnerNumField のフォーカス時全選択

**現状**: `SpinnerNumField` は `e.target.select()` を直接呼んでいるが、共通ヘルパー `handleFocusSelectAll` を未使用。

**変更**: `handleFocusSelectAll` を import して使用する。

### P-14: ツール タブ並び順の変更

**現状**: `navigation.ts` — `features: ['mtseed-search', 'tid-adjust', 'needle']`、`defaultFeature: 'mtseed-search'`

**変更**: `features: ['needle', 'tid-adjust', 'mtseed-search']`、`defaultFeature: 'needle'`

### P-15: TID Adjust TID/SID/PID 一行配置

**現状**: TID + SID は横並び (`flex gap-4`)、Shiny PID は別行。

**変更**: 3 つを同一行に配置。Shiny PID の `w-40` 固定幅を `min-w-0 flex-1` に変更。

### P-16: 針読み入力プレースホルダの削除

**現状**: 「針の方向 (数値)」入力欄の `placeholder="24267"`。値が入力済みと誤認されうる。

**変更**: `placeholder` を空文字列にする。

### P-17: 「転記」→「コピー」への統一

**現状**: UI 上の日本語に「転記」が使用されている。

| msgid | 現行 (ja) | 変更後 (ja) |
|-------|----------|------------|
| Transfer to Pokemon list | 個体リストに転記 | 個体リストにコピー |
| Copied to seed input | Seed 入力に転記しました | Seed 入力にコピーしました |
| Transferred {0} seeds | {0} 件の Seed を転記しました | {0} 件の Seed をコピーしました |
| Copy to seed input | Seed 入力に転記 | Seed 入力にコピー |

英語訳は維持。コメント内の「転記」は自然言語のためそのまま。

### P-18: めざパフィルター タイプ + 威力の同一行配置

**現状**: `HiddenPowerSelect` コンポーネント内で、タイプ選択 Popover ボタン (full width) と「Min power」ラベル + 入力が `flex-col gap-1` で縦積み。

**変更**: タイプ選択ボタンと威力入力を同一行に配置する。

```tsx
// hidden-power-select.tsx (変更後 — ルート div)
<div className="flex items-center gap-2">
  <Popover.Root>
    <Popover.Trigger asChild disabled={disabled}>
      <Button
        variant="outline"
        className="min-w-0 flex-1 justify-between"
        aria-label="hidden-power-select-trigger"
      >
        <span className="truncate">
          <Trans>Hidden Power</Trans> ({triggerLabel})
        </span>
        <ChevronDown className="ml-1 size-3.5 shrink-0 opacity-50" />
      </Button>
    </Popover.Trigger>
    {/* Popover.Portal / Content は変更なし */}
  </Popover.Root>

  {/* 威力下限 (onMinPowerChange が渡された場合のみ表示) */}
  {onMinPowerChange && (
    <div className="flex shrink-0 items-center gap-1">
      <Label className="shrink-0 text-xs">{t`Min power`}</Label>
      <Input
        className="h-7 w-16 text-xs tabular-nums"
        inputMode="numeric"
        value={localMinPower}
        onChange={(e) => setLocalMinPower(e.target.value)}
        onFocus={handleFocusSelectAll}
        onBlur={/* 既存ロジック維持 */}
        disabled={disabled}
        placeholder="30"
      />
    </div>
  )}
</div>
```

Popover トリガーの `w-full` を `min-w-0 flex-1` に変更し、威力入力を横に配置。威力入力の幅を `w-20` → `w-16` に縮小してコンパクトにする。

### P-19: キー入力ダイアログ — OK 確定 + 全選択/全解除

**現状**: `KeySpecSelector` / `KeyInputSelector` はダイアログ内でボタンをトグルすると即座に `onChange` が親に伝播する。キャンセル操作がない。

**変更**:
1. ダイアログ内でローカル state (`draft`) にトグル結果を保持し、親の `onChange` は呼ばない
2. ダイアログフッターに「全選択」「全解除」「OK」ボタンを追加
3. 「OK」クリック時のみ `onChange(draft)` を親に反映
4. ダイアログを閉じた場合 (×ボタン、オーバーレイクリック) は変更を破棄
5. ダイアログオープン時に `value` → `draft` をコピーして初期化

```tsx
// key-spec-selector.tsx (変更後のダイアログ部分)
<Dialog open={dialogOpen} onOpenChange={(open) => {
  if (!open) setDialogOpen(false); // キャンセル扱い
  else { setDraft(value.available_buttons); setDialogOpen(true); }
}}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle><Trans>Key input</Trans></DialogTitle>
    </DialogHeader>
    <DsButtonToggleGroup selected={draft} onToggle={setDraft} disabled={disabled} />
    <DialogFooter>
      <Button variant="outline" size="sm" onClick={handleSelectAll}><Trans>Select all</Trans></Button>
      <Button variant="outline" size="sm" onClick={handleDeselectAll}><Trans>Deselect all</Trans></Button>
      <Button size="sm" onClick={handleConfirm}><Trans>OK</Trans></Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

`KeyInputSelector` も同様の変更を行う。

### P-20: 検索ボタン高さの安定化

**現状**: `SearchControls` の `buttonRow` は `flex items-center gap-3`。GPU トグルが存在するとき Switch + Label の高さでボタン行が高くなり、GPU トグルが無い場合と高さが異なる。

**変更**: `buttonRow` の `div` に `min-h-9` を追加し、GPU トグルの有無にかかわらず最低高さを統一する。

```tsx
<div className={cn('flex min-h-9 items-center gap-3', layout === 'mobile' && 'mt-2')}>
```

### P-21: TID/SID/PID 3 列 grid

**現状**: `TidAdjustForm` は `flex items-start gap-4` で TID (`w-24`) / SID (`w-24`) / Shiny PID (`min-w-0 flex-1`) を横並び。幅が不均一。

**変更**: `grid grid-cols-3 gap-4` で 3 列均等配置。各入力から固定幅クラスを除去。

```tsx
<div className="grid grid-cols-3 gap-4">
  <div className="flex flex-col gap-1.5">
    <Label htmlFor="tid-filter">TID</Label>
    <Input ... className="w-full" />
  </div>
  <div className="flex flex-col gap-1.5">
    <Label htmlFor="sid-filter">SID</Label>
    <Input ... className="w-full" />
  </div>
  <div className="flex flex-col gap-1.5">
    <Label htmlFor="shiny-pid"><Trans>Shiny PID</Trans></Label>
    <Input ... className="w-full font-mono" />
  </div>
</div>
```

### P-22: 針読み Seed 解決結果表示の省略

**現状**: `SeedInput` コンポーネント末尾に `Initial Seed: XXXXXXXXXXXXXXXX (+Y)` 形式で解決結果を表示している。情報量が少なく、テーブル結果側で同等の情報を確認できる。

**変更**: `SeedInput` の末尾にある `seedDisplay` ブロック (Initial Seed 表示) を削除する。

### P-23: フィルター並び順の統一

**現状**: `PokemonFilterForm` は 特性スロット → 性別 → 性格 → 色違い → IV/Stats → 種族 の順。`EggFilterForm` は IV/Stats → 性格 → 性別 → 特性 → 色違い の順。IV/Stats フィルタの位置も不統一。

**変更**: 両フォームとも以下の統一順序に変更する。

1. IV / 実ステータス フィルター
2. 特性スロット
3. 性別
4. 性格
5. 色違い
6. 種族 (PokemonFilterForm のみ)

### P-24: NatureSelect / SpeciesSelect のラベル追加

**現状**: `NatureSelect` のトリガーは `性格 (指定なし)` / `性格 (N件選択)` と、コンポーネント名を兼ねたラベルがトリガー文言に含まれている。`SpeciesSelect` も同様に `種族 (指定なし)` 表示。

**変更**:
1. `NatureSelect`: トリガー上に `Label` で「性格」を表示し、トリガー表示は `指定なし` / `N件選択` のみにする
2. `SpeciesSelect`: トリガー上に `Label` で「種族」を表示し、同様にトリガー表示を簡素化

### P-25: フィルター項目の 2 列レイアウト

**現状**: 特性スロット / 性別 / 性格 / 色違いは各々全幅で縦積み。

**変更**: `grid grid-cols-2 gap-2` で 2 列配置。各コンポーネントは既に `Label` + `Select` / `Popover` の構造を持つため、そのまま grid セル内に収まる。

### P-26: タマゴ IV 補足テキストの削除

**現状**: `EggParamsForm` の種族入力下に「空欄にすると個体値が「?」で表示されます」の `<p>` 要素。

**変更**: 当該 `<p>` 要素を削除する。

### P-27: SpinnerNumField 全選択修正

**現状**: `SpinnerNumField` でゼロ埋め表示値 (例: `"001"`) をフォーカスすると `setLocalInput(String(value))` が `"1"` をセットし、React の再レンダーで全選択が解除される。

**変更**:
- `onFocus` 内で `setLocalInput(formatValue(value))` を使い、表示値を維持して不要な再レンダーを防止
- `requestAnimationFrame(() => input.select())` で全選択を非同期化し、レンダー後に確実に選択

### P-28: タマゴパラメータ 2 列化 + 種族→性別比の自動導出

**現状**: `EggParamsForm` の ♀親特性 / かわらずのいし / 性別比 / 種族 が縦 1 列。種族と性別比が独立設定。

**変更**:
- 4 フィールドを `grid grid-cols-2 gap-2` で 2 列配置
- WASM に `get_species_gender_ratio(species_id: u16) -> GenderRatio` を追加 (`lib.rs`)
- `handleSpeciesChange` で種族選択時に性別比を自動設定

### P-29: 種族→性別比の自動導出 (WASM 側)

**現状**: WASM に種族から性別比を取得する関数がない。

**変更**: `wasm-pkg/src/lib.rs` に `get_species_gender_ratio` を追加。`data::species::get_species_entry(species_id).gender_ratio` を返す。

### P-30: EggFilter デフォルト有効化

**現状**: `EggFilterForm` でフィルターがデフォルト無効 (`useState(false)`)。リセットでフィルターが無効化される。

**変更**:
- `filterEnabled` のデフォルトを `useState(true)` に変更
- `handleReset` から `setFilterEnabled(false)` を削除
- `PokemonFilterForm` の `handleReset` からも `setFilterEnabled(false)` を削除 (一貫性)

### P-31: タマゴ結果 種族列削除

**現状**: タマゴ個体生成結果テーブルに「種族」列がある。タマゴ検索では種族をパラメータで指定するため全行同一値となり冗長。

**変更**: `egg-result-columns.tsx` から `species` 列を削除。`export-columns.ts` の `createEggListExportColumns` では通常エクスポートから削除し、`detailColumns` に `detailOnly: true` で追加 (詳細エクスポート時のみ出力)。

## 5. テスト方針

| カテゴリ | テスト種別 | 内容 |
|----------|-----------|------|
| P-01 | - | `EmptyState` への置き換え。表示テキスト変更なし |
| P-02 | 目視確認 | パディング調整後のモバイル/デスクトップ表示確認 |
| P-03 | 既存テスト確認 | `combinationCount` prop の削除で既存テストが壊れないか確認 |
| P-04 | - | テキスト変更のみ |
| P-05 | コンポーネントテスト | `allowUnknown=false` 時にも min/max ヘッダが表示されることを検証 |
| P-06 | - | 表示形式変更のみ。目視確認 |
| P-07 | - | テキスト変更のみ。目視確認 |
| P-08 | ユニットテスト | `formatDsButtons` のソート順が期待通りであることを検証 |
| P-09 | 既存テスト確認 | SeedInputSection のテストで文言に依存するケースの確認 |
| P-10 | コンポーネントテスト | フィルターが初期状態で有効であることを検証 |
| P-11 | 目視確認 | セレクタ高さが統一されていることを確認 |
| P-12 | 目視確認 | レイアウトと訳語の確認 |
| P-13 | - | 動作変更なし (実装統一のみ) |
| P-14 | - | タブ順変更。目視確認 |
| P-15 | 目視確認 | 一行配置の確認 |
| P-16 | - | プレースホルダ削除のみ |
| P-17 | - | 翻訳変更のみ |
| P-18 | 目視確認 | タイプ選択と威力入力が同一行に並ぶことを確認 |
| P-19 | コンポーネントテスト | OK 確定でのみ onChange が呼ばれること、全選択/全解除の動作を検証 |
| P-20 | 目視確認 | GPU トグル有無でボタン行高さが変わらないことを確認 |
| P-21 | 目視確認 | 3 列均等配置の確認 |
| P-22 | - | 表示削除のみ |
| P-23 | 目視確認 | フィルター並び順が正しいことを確認 |
| P-24 | 目視確認 | 性格・種族ラベルの表示確認 |
| P-25 | 目視確認 | フィルター 2 列配置の確認 |
| P-26 | - | 補足テキスト削除のみ |
| P-27 | コンポーネントテスト | ゼロ埋め値フォーカス時の全選択維持を検証 |
| P-28 | 目視確認 | タマゴパラメータ 2 列配置の確認。種族選択時の性別比自動設定を確認 |
| P-29 | ユニットテスト | `get_species_gender_ratio` の戻り値検証 |
| P-30 | コンポーネントテスト | フィルターデフォルト有効、リセット後も有効であることを検証 |
| P-31 | - | 列削除のみ |

## 6. 実装チェックリスト

- [x] P-01: EmptyState — 全ページで `DataTable` 経由で `EmptyState` を使用済み (変更不要)
- [x] P-02: 二重パディング — `FeaturePageLayout` から `p-4` を削除
- [x] P-03: KeySpecSelector — 件数削除、ボタンラベル変更
- [x] P-04: KeyInputSelector — `(buttons held)` 削除、ダイアログ内表示削除、ボタンラベル変更
- [x] P-05: IvRangeInput — min/max ヘッダ行の常時表示
- [x] P-06: MtseedSearch — 結果表示エリアの統一
- [x] P-07: TID Adjust — 「セーブ状態」見出し追加 + 注記削除
- [x] P-08: キー入力表示順 — `formatDsButtons` にソート追加、`KEY_BUTTONS` 並び順変更
- [x] P-09: SeedInputSection — DS 設定説明文と解決済み Seed 件数の削除
- [x] P-10: フィルター初期状態 — `PokemonFilterForm` のデフォルト有効化
- [x] P-11: セレクタサイズ — `NatureSelect`, `HiddenPowerSelect` のトリガー高さ統一
- [x] P-12: エンカウント設定 — 場所 + エンカウント方法の同一行化、「固定」→「あまいかおり」
- [x] P-13: SpinnerNumField — `handleFocusSelectAll` の適用
- [x] P-14: ツール タブ並び順 — needle → tid-adjust → mtseed-search
- [x] P-15: TID Adjust — TID / SID / PID 一行配置
- [x] P-16: 針読み — プレースホルダ削除
- [x] P-17: 翻訳 — 「転記」→「コピー」
- [x] P-18: めざパフィルター — タイプ + 威力の同一行化
- [x] P-19: キー入力ダイアログ — OK 確定 + 全選択/全解除
- [x] P-20: 検索ボタン高さ — `min-h-9` で安定化
- [x] P-21: TID/SID/PID — 3 列 grid 化
- [x] P-22: 針読み Seed 表示 — 初期 Seed 解決結果の省略
- [x] P-23: フィルター並び順 — ステータス → 特性スロット → 性別 → 性格 → 色違い → (種族)
- [x] P-24: フィルター ラベル — NatureSelect / SpeciesSelect にラベル追加、トリガー簡素化
- [x] P-25: フィルター 2 列化 — 特性スロット / 性別 / 性格 / 色違いを 2 列配置
- [x] P-26: タマゴ IV 補足 — 種族下の補足テキスト削除
- [x] P-27: SpinnerNumField 全選択 — `formatValue` + `requestAnimationFrame` で修正
- [x] P-28: タマゴパラメータ 2 列化 — ♀親特性 / かわらずのいし / 性別比 / 種族 の 2 列配置 + 種族→性別比自動導出
- [x] P-29: WASM `get_species_gender_ratio` — `lib.rs` に追加
- [x] P-30: EggFilter デフォルト有効 — `useState(true)` + リセット時有効維持
- [x] P-31: タマゴ結果 種族列削除 — テーブル列削除、通常エクスポートから削除、詳細エクスポート (`detailOnly`) には残す
- [x] i18n: 変更に伴う翻訳キーの追加・更新 (`pnpm run extract` → `ja.po`, `en.po`)
- [ ] 目視確認: 全ページのデスクトップ/モバイル/ライトモード/ダークモード表示
