# Seed 入力テーブル化 仕様書

## 1. 概要

### 1.1 目的

Seed 複数行入力 UI (textarea) を 1 列 × n 行の入力テーブルに置き換える。行単位のバリデーション表示・削除操作・IV ツールチップ表示を可能にする。LCG Seed (64-bit) と MT Seed (32-bit) の両方に対応し、`SeedInputSection` (Seeds タブ) と `TargetSeedsInput` (起動時刻検索) を統合的に置き換える。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| SeedInputSection | Seed 入力セクション (`src/components/forms/seed-input-section.tsx`) |
| TargetSeedsInput | 起動時刻検索の MT Seed 入力 (`src/components/forms/target-seeds-input.tsx`) |
| SeedOriginTable | Import タブの resolve 済み SeedOrigin テーブル (`src/components/forms/seed-origin-table.tsx`) |
| HexSeedInputTable | 本仕様で新規作成する汎用 hex seed 入力テーブルコンポーネント |
| LcgSeed | 64-bit LCG Seed (`bigint`) |
| MtSeed | 32-bit MT Seed (`number`) |
| SeedIvTooltip | MT Seed ホバー時に IV スプレッドを表示するツールチップ (`src/components/data-display/seed-iv-tooltip.tsx`) |
| IvTooltipContext | ツールチップに表示する IV 計算コンテキスト (BW 固定/野生, BW2 固定/野生, タマゴ等) |

### 1.3 背景・問題

現行は 2 箇所で textarea ベースの seed 入力を使用している:

| 箇所 | コンポーネント | seed 種別 | 桁数 |
|------|--------------|----------|------|
| pokemon-list / egg-list / needle の Seeds タブ | `SeedInputSection` | LCG Seed (64-bit) | 16 桁 |
| 起動時刻検索 | `TargetSeedsInput` | MT Seed (32-bit) | 8 桁 |

共通の課題:
- 入力エラー行の特定が困難 (1 行でも不正だと全行が解決されない / 別枠でエラー行番号を列挙)
- 行単位の削除操作ができない
- seed 値の IV ツールチップが表示されない

### 1.4 期待効果

| 指標 | 現状 | 変更後 |
|------|------|--------|
| エラー行の特定 | 不可 / 行番号リスト | 行単位で赤枠表示 |
| 行単位削除 | 不可 (テキスト手動編集) | 削除ボタンで可能 |
| 複数行ペースト | textarea デフォルト動作 | `onPaste` ハンドラで行分配 |
| IV ツールチップ | なし | 有効な seed 行でホバー/フォーカス時に IV スプレッド表示 |
| コンポーネント統一 | textarea × 2 (異なる実装) | `HexSeedInputTable` に統一 |

### 1.5 着手条件

- `local_094` (UI/UX ポリッシュ) の P-09 (SeedInputSection 冗長表示削除) が完了していること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|---------|---------|
| `src/components/forms/hex-seed-input-table.tsx` | 新規作成 | 汎用 hex seed 入力テーブルコンポーネント |
| `src/components/forms/seed-input-section.tsx` | 変更 | Seeds タブの textarea → `HexSeedInputTable` (LCG モード) |
| `src/components/forms/target-seeds-input.tsx` | 変更 | textarea → `HexSeedInputTable` (MT モード) |
| `src/features/datetime-search/components/datetime-search-page.tsx` | 変更 | pending 消費ロジックをテーブル行初期化に適合 |

## 3. 設計方針

### 3.1 コンポーネント設計

`HexSeedInputTable` は seed 種別をジェネリックに扱う。`mode` prop で LCG / MT を切り替え、桁数・パース・ツールチップの挙動を制御する。

```
mode: 'lcg'  → 16 桁 hex, bigint パース, resolve 後の mt_seed でツールチップ
mode: 'mt'   → 8 桁 hex, number パース, 値そのものでツールチップ
```

### 3.2 ペースト対応

`<input>` への改行付きテキストのペースト時、ブラウザのデフォルト動作では改行が除去され 1 セルに結合される。`onPaste` イベントを intercept して自前で行分配する。

```tsx
const handlePaste = (e: React.ClipboardEvent, rowIndex: number) => {
  const text = e.clipboardData.getData('text/plain');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length <= 1) return; // 単行ペーストはデフォルト動作に委任
  e.preventDefault();
  // rowIndex 以降の行に lines を分配。不足行は自動追加
  distributeToRows(rowIndex, lines);
};
```

### 3.3 状態管理

`HexSeedInputTable` は内部で `string[]` (各行のテキスト値) を管理し、有効な seed が変化したタイミングでコールバックを発火する。

- LCG モード: `onSeedsChange: (seeds: LcgSeed[]) => void`
- MT モード: `onSeedsChange: (seeds: MtSeed[]) => void`

### 3.4 IV ツールチップ

有効な値が入力されている行に `SeedIvTooltip` を適用する。

**MT モード**: パース済みの `number` 値を直接 `SeedIvTooltip.mtSeed` に渡す。

**LCG モード**: LCG Seed → MT Seed の変換が必要。`SeedInputSection` 側で `autoResolveSeeds` 実行後に得られる `SeedOrigin[].mt_seed` を、行 index と対応付けて `HexSeedInputTable` に `resolvedMtSeeds` として渡す。

```
SeedInputSection
  ├─ rows: string[] (テーブル行テキスト)
  ├─ onSeedsChange → autoResolveSeeds → SeedOrigin[]
  └─ SeedOrigin[i].mt_seed → resolvedMtSeeds[i] → HexSeedInputTable へ
```

### 3.5 他ページからのコピー受け入れ

#### 起動時刻検索 → pokemon-list / egg-list / needle (LCG モード)

既存フロー:
1. 起動時刻検索の行クリック → `setPendingDetailOrigin(origin)` → SeedInputSection が `consumePendingDetailOrigin` で消費
2. 起動時刻検索の「個体リストにコピー」→ `setPendingSeedOrigins(origins)` → SeedInputSection が `consumePendingSeedOrigins` で消費

変更:
- `initialPending.type === 'seed'` の場合: 消費した `SeedOrigin.Seed.base_seed` を LCG hex 文字列に変換し、テーブルの初期行に設定
- `initialPending.type === 'seeds'` の場合: Import タブ経由のため Seeds タブへの影響なし (変更不要)

#### MT Seed 検索 → 起動時刻検索 (MT モード)

既存フロー:
1. MT Seed 検索の「起動時刻検索」ボタン → `navigateToDatetimeSearch(seeds)` → `setPendingTargetSeeds(seeds)` → datetime-search-page が `pendingTargetSeeds` を消費して `targetSeedsRaw` (textarea テキスト) に反映

変更:
- `pendingTargetSeeds` を消費した `MtSeed[]` を hex 文字列配列に変換し、テーブルの初期行に設定
- `TargetSeedsInput` の props を `value: string` (テキスト) から `rows: string[]` + `onRowsChange` に変更
- `datetime-search-page.tsx` の `targetSeedsRaw: string` (store) → `targetSeedRows: string[]` に変更

## 4. 実装仕様

### 4.1 HexSeedInputTable インターフェース

```tsx
interface HexSeedInputTableProps<T extends bigint | number> {
  /** seed 種別 */
  mode: T extends bigint ? 'lcg' : 'mt';
  /** 各行のテキスト値 */
  rows: string[];
  /** 行テキスト変更 */
  onRowsChange: (rows: string[]) => void;
  /** 有効な seed の変化通知 (バリデーション通過分のみ) */
  onSeedsChange: (seeds: T[]) => void;
  /** IV ツールチップ用 MT Seed 配列 (index 対応)。undefined の行はツールチップなし */
  mtSeeds?: (number | undefined)[];
  /** ツールチップコンテキスト */
  tooltipContexts?: IvTooltipContext[];
  disabled?: boolean;
}
```

MT モードの場合、`mtSeeds` は省略可能 (パース済み値をそのまま使用)。LCG モードの場合、`SeedInputSection` が resolve 結果から `mtSeeds` を構築して渡す。

### 4.2 UI 構造

```
┌──────────────────────────────┬───┐
│ [hex input: 0123456789ABCDEF]│ × │  ← 行 0 (ホバーで IV ツールチップ)
├──────────────────────────────┼───┤
│ [hex input: ________________]│ × │  ← 行 1
├──────────────────────────────┼───┤
│ [hex input: INVALID_VALUE   ]│ × │  ← 行 2 (赤枠)
└──────────────────────────────┴───┘
         [+ 行を追加]
```

- 各行: `SeedIvTooltip` でラップした `<input>` (mono font, uppercase) + 削除ボタン (`X` アイコン)
- 不正値の行: `border-destructive` で赤枠表示、ツールチップなし
- 末尾: 行追加ボタン
- 初期状態: 1 行 (空)
- ツールチップ: 有効な seed を持つ行のみ、ホバー/フォーカスで IV スプレッドを表示

### 4.3 SeedInputSection 変更 (LCG モード)

Seeds タブ内の `<textarea>` ブロックを `HexSeedInputTable` に置換する。

- `seedText: string` → `seedRows: string[]` に変更
- `handleSeedTextChange` → `handleRowsChange` / `handleSeedsChange` に分離
- resolve 結果 (`seedsOrigins: SeedOrigin[]`) から `mtSeeds` を構築して `HexSeedInputTable` に渡す
- `initialPending.type === 'seed'` 時の初期化: `base_seed` を hex 文字列化して `seedRows` の初期値に設定

### 4.4 TargetSeedsInput 変更 (MT モード)

`TargetSeedsInput` の内部実装を `HexSeedInputTable` に置換する。

- props: `value: string` + `onChange` → `rows: string[]` + `onRowsChange` + `onSeedsChange`
- `parsedSeeds` / `errors` は `HexSeedInputTable` 内部でバリデーション表示するため不要
- 外部の parse エラーリスト表示は削除
- `datetime-search-page.tsx`: `targetSeedsRaw` (string) → `targetSeedRows` (string[]) に変更。`useDatetimeSearchStore` の state も合わせて変更

### 4.5 datetime-search Store 変更

```tsx
// datetime-search store (変更箇所)
// 変更前: targetSeedsRaw: string
// 変更後: targetSeedRows: string[]
targetSeedRows: string[];
setTargetSeedRows: (rows: string[]) => void;
```

pending 消費:
```tsx
useEffect(() => {
  const pending = useSearchResultsStore.getState().pendingTargetSeeds;
  if (pending.length > 0) {
    setTargetSeedRows(pending.map((s) => toHex(s, 8)));
    useSearchResultsStore.getState().clearPendingTargetSeeds();
  }
}, [setTargetSeedRows]);
```

## 5. テスト方針

| テスト種別 | 内容 |
|-----------|------|
| コンポーネントテスト | `HexSeedInputTable`: 行追加・削除・バリデーション表示 (LCG / MT 両モード) |
| コンポーネントテスト | `HexSeedInputTable`: 複数行ペーストで行分配されることを検証 |
| コンポーネントテスト | `HexSeedInputTable`: 有効な seed のみ `onSeedsChange` で通知されることを検証 |
| コンポーネントテスト | `HexSeedInputTable`: `mtSeeds` 提供時にツールチップが表示されることを検証 |
| 既存テスト確認 | `SeedInputSection` のテストで textarea に依存するケースの確認・修正 |
| 既存テスト確認 | `TargetSeedsInput` のテストで textarea / props に依存するケースの確認・修正 |
| 統合テスト | MT Seed 検索 → 起動時刻検索への pending 受け渡し → テーブル行初期化 |
| 統合テスト | 起動時刻検索 → pokemon-list への pending 受け渡し → テーブル行初期化 |

## 6. 実装チェックリスト

- [ ] `HexSeedInputTable` コンポーネント新規作成 (LCG / MT 両モード対応)
- [ ] `onPaste` ハンドラによる複数行ペースト対応
- [ ] 行単位バリデーション (不正 hex に赤枠表示)
- [ ] 行追加・削除 UI
- [ ] `SeedIvTooltip` 統合 (有効 seed 行にツールチップ表示)
- [ ] `SeedInputSection` の Seeds タブを `HexSeedInputTable` (LCG モード) に置換
- [ ] `SeedInputSection` の resolve 結果から `mtSeeds` を構築してツールチップに渡す
- [ ] `SeedInputSection` の pending 受け入れ (detail origin → テーブル行初期化) の動作確認
- [ ] `TargetSeedsInput` を `HexSeedInputTable` (MT モード) に置換
- [ ] `useDatetimeSearchStore` の `targetSeedsRaw` → `targetSeedRows` 変更
- [ ] `datetime-search-page.tsx` の pending 消費ロジック更新 (MtSeed[] → テーブル行)
- [ ] テスト作成・既存テスト修正
- [ ] 目視確認: ペースト操作・行追加削除・エラー表示・ツールチップ
