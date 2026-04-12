# UI ラベル呼称統一 仕様書

## 1. 概要

### 1.1 目的

結果テーブルのカラムヘッダー、詳細ダイアログのラベル、CSV エクスポートヘッダー、および共有コンポーネントで使用される `Base Seed` / `LCG Seed` / `Initial Seed` の呼称を `LCG Seed` に統一する。

Key / Key input の不統一については local_104 (KEY_DISPLAY_IMPROVEMENT) で対応する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| LCG Seed | Linear Congruential Generator の初期シード。Rust 型 `LcgSeed`（64-bit 整数）。統一後の正式表示名 |
| Base Seed | `LCG Seed` の別名。`base_seed` フィールド名に由来する旧表示名 |
| Initial Seed | `LCG Seed` の別名。needle 結果カラムで使用されている旧表示名 |
| MT Seed | Mersenne Twister の初期シード（32-bit 整数）。表示名は全箇所で統一済みのため本仕様の対象外 |
### 1.3 背景・問題

Rust 型名は `LcgSeed`、i18n 翻訳カタログには `LCG Seed`（キー `sLdnxh`）として登録済み。しかし結果テーブルのカラムヘッダー・詳細ダイアログ・CSV エクスポートでは i18n を経由せず `'Base Seed'` をハードコードしている。さらに needle feature のカラムヘッダーは `<Trans>Initial Seed</Trans>`（i18n キー `r909m2`、日本語: 初期Seed）を使用しており、同一データに対して 3 種の表示名が混在している。

| 呼称 | 使用箇所 | i18n |
|------|----------|------|
| `LCG Seed` | フォーム入力ラベル（seed-input-section, needle/seed-input） | あり (`sLdnxh`) |
| `Base Seed` | カラムヘッダー（seed-origin-columns, trainer-info-columns, egg-result-columns）、詳細ダイアログ（全 feature）、CSV エクスポート、seed-origin-table | なし |
| `Initial Seed` | needle カラムヘッダー | あり (`r909m2`) |

### 1.4 期待効果

| 指標 | 変更前 | 変更後 |
|------|--------|--------|
| LCG Seed 概念の表示名数 | 3 種 | 1 種（`LCG Seed`） |
| i18n 経由率（対象ラベル） | 部分的 | 全箇所 |

### 1.5 着手条件

- なし（独立したリファクタリング）

## 2. 対象ファイル

### 2.1 Base Seed → LCG Seed

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/features/datetime-search/components/seed-origin-columns.tsx` | 修正 | `'Base Seed'` → `t\`LCG Seed\`` |
| `src/features/datetime-search/components/result-detail-dialog.tsx` | 修正 | `label="Base Seed"` → `label={t\`LCG Seed\`}` |
| `src/features/tid-adjust/components/trainer-info-columns.tsx` | 修正 | `'Base Seed'` → `t\`LCG Seed\`` |
| `src/features/egg-search/components/egg-result-columns.tsx` | 修正 | `'Base Seed'` → `t\`LCG Seed\`` （該当カラムがある場合） |
| `src/features/egg-search/components/result-detail-dialog.tsx` | 修正 | `label="Base Seed"` → `label={t\`LCG Seed\`}` |
| `src/features/pokemon-list/components/result-detail-dialog.tsx` | 修正 | `label="Base Seed"` → `label={t\`LCG Seed\`}` |
| `src/features/egg-list/components/result-detail-dialog.tsx` | 修正 | `label="Base Seed"` → `label={t\`LCG Seed\`}` |
| `src/features/needle/components/needle-result-columns.tsx` | 修正 | `<Trans>Initial Seed</Trans>` → `t\`LCG Seed\`` |
| `src/components/forms/seed-origin-table.tsx` | 修正 | `Base Seed` → `<Trans>LCG Seed</Trans>` or `t\`LCG Seed\`` |
| `src/services/export-columns.ts` | 修正 | 全 `header: 'Base Seed'` → `header: 'LCG Seed'` |

### 2.2 i18n

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/i18n/locales/en/messages.po` | 修正 | `Initial Seed` エントリの削除確認（lingui:extract で自動処理） |
| `src/i18n/locales/ja/messages.po` | 修正 | 同上 |
| `src/i18n/locales/en/messages.ts` | 自動生成 | `pnpm lingui:compile` で再生成 |
| `src/i18n/locales/ja/messages.ts` | 自動生成 | 同上 |

### 2.3 テスト

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/test/components/seed-origin-columns.test.tsx` | 修正 | `'Base Seed'` の参照を `'LCG Seed'` に変更（該当テストがある場合） |
| `src/test/components/trainer-info-columns.test.tsx` | 修正 | 同上 |

## 3. 設計方針

### 3.1 表示名の統一基準

- **カラムヘッダー・詳細ダイアログラベル**: i18n 関数（`t` タグ付きテンプレートリテラルまたは `<Trans>`）を使用する。i18n キーは既存の `sLdnxh`（`LCG Seed`）を流用する
- **CSV エクスポートヘッダー**: 英語固定の plain string を維持する（機械可読性を優先する既存方針）。表示名は i18n の英語翻訳と一致させる

### 3.2 "Initial Seed" の扱い

needle カラムヘッダーの `Initial Seed`（`r909m2`）は `LCG Seed` に変更する。

`datetime-search-page.tsx` のセクション見出し `<Trans>Initial Seed</Trans>` は、当初は変更対象外としていたが、LCG Seed / MT Seed との区別がつきにくいという問題が生じたため、`<Trans>MT Seed</Trans>` に変更した。同時に `TargetSeedsInput` 内の `<Label>MT Seed</Label>` を除去し、セクション見出しの `<h3>` に `id="mt-seed-heading"` を付与、`textarea` に `aria-labelledby="mt-seed-heading"` を設定してアクセシビリティを維持した。

これにより i18n キー `r909m2`（`Initial Seed` / `初期Seed`）の参照箇所はゼロになったため、PO カタログから当該エントリを削除した。

### 3.3 対象外

以下は本仕様の対象外とする:

- **MT Seed**: 全箇所で `'MT Seed'` に統一済み。i18n 未対応だが呼称の不統一はない
- **Timer0 / VCount**: 全箇所で `'Timer0'` / `'VCount'` に統一済み。技術的略語であり翻訳不要
- **TID / SID / PID / Lv / IV**: 技術的略語であり、呼称の不統一はない。i18n 化は別途検討
- **Key / Key input の不統一**: local_104 (KEY_DISPLAY_IMPROVEMENT) で対応

## 4. 実装仕様

### 4.1 カラムヘッダーの変更パターン

変更前:

```tsx
header: () => 'Base Seed',
```

変更後:

```tsx
header: () => t`LCG Seed`,
```

`t` タグは `@lingui/core/macro` からインポートする。既に同ファイル内で `t` を使用している場合は追加インポート不要。

### 4.2 詳細ダイアログの変更パターン

変更前:

```tsx
<DetailRow label="Base Seed" value={toBigintHex(baseSeed, 16)} />
```

変更後:

```tsx
<DetailRow label={t`LCG Seed`} value={toBigintHex(baseSeed, 16)} />
```

`t` タグが未インポートのファイルでは `import { t } from '@lingui/core/macro'` を追加する。

### 4.3 seed-origin-table の変更

変更前:

```tsx
<th className="px-2 py-1 text-left font-medium">Base Seed</th>
```

変更後:

```tsx
<th className="px-2 py-1 text-left font-medium">
  <Trans>LCG Seed</Trans>
</th>
```

同ファイルで既に `<Trans>` が使用されているため、一貫性を保つ。

### 4.4 CSV エクスポートヘッダーの変更

変更前:

```ts
{ key: 'base_seed', header: 'Base Seed', accessor: (r) => r.base_seed, detailOnly: true },
```

変更後:

```ts
{ key: 'base_seed', header: 'LCG Seed', accessor: (r) => r.base_seed, detailOnly: true },
```

`key` プロパティ（`'base_seed'`）はデータ構造に由来するため変更しない。`header` のみ変更する。

### 4.5 needle カラムヘッダーの変更

変更前:

```tsx
header: () => <Trans>Initial Seed</Trans>,
```

変更後:

```tsx
header: () => t`LCG Seed`,
```

`<Trans>` から `t` タグへの変更に伴い、`Trans` の import が不要になる場合は削除する。

## 5. テスト方針

### 5.1 既存テストの更新

`'Base Seed'` をテキスト検索の対象としているテストがある場合、`'LCG Seed'` に更新する。テストファイルの特定は実装時に `grep` で確認する。

### 5.2 回帰確認

- 各 feature の結果テーブルにカラムヘッダー `LCG Seed` が表示されること
- 各 feature の詳細ダイアログにラベル `LCG Seed` が表示されること
- CSV エクスポートのヘッダー行に `LCG Seed` が出力されること
- needle feature のカラムヘッダーが `LCG Seed` に変更されていること
- `pnpm lingui:extract` 実行後に未使用の `Initial Seed` エントリが PO ファイルから除去されること（datetime-search-page のセクション見出しで引き続き使用される場合は残存する）

### 5.3 型チェック・lint

- `pnpm exec tsc -b --noEmit` でコンパイルエラーがないこと
- `pnpm lint` でエラーがないこと

## 6. 実装チェックリスト

- [ ] `src/features/datetime-search/components/seed-origin-columns.tsx`: `'Base Seed'` → `t\`LCG Seed\``
- [ ] `src/features/datetime-search/components/result-detail-dialog.tsx`: `label="Base Seed"` → `label={t\`LCG Seed\`}`
- [ ] `src/features/tid-adjust/components/trainer-info-columns.tsx`: `'Base Seed'` → `t\`LCG Seed\``
- [ ] `src/features/egg-search/components/result-detail-dialog.tsx`: `label="Base Seed"` → `label={t\`LCG Seed\`}`
- [ ] `src/features/pokemon-list/components/result-detail-dialog.tsx`: `label="Base Seed"` → `label={t\`LCG Seed\`}`
- [ ] `src/features/egg-list/components/result-detail-dialog.tsx`: `label="Base Seed"` → `label={t\`LCG Seed\`}`
- [ ] `src/features/needle/components/needle-result-columns.tsx`: `<Trans>Initial Seed</Trans>` → `t\`LCG Seed\``
- [ ] `src/components/forms/seed-origin-table.tsx`: `Base Seed` → `<Trans>LCG Seed</Trans>`
- [ ] `src/services/export-columns.ts`: 全 `header: 'Base Seed'` → `header: 'LCG Seed'`
- [ ] テストファイルの `'Base Seed'` 参照を更新
- [ ] `pnpm lingui:extract` → `pnpm lingui:compile` で i18n カタログを更新
- [ ] `pnpm exec tsc -b --noEmit` でコンパイルエラーなし
- [ ] `pnpm lint` でエラーなし
- [ ] `pnpm test:run` で既存テスト通過
