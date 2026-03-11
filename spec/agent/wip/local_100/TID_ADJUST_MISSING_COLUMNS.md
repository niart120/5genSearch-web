# TID 調整 検索結果カラム追加 仕様書

## 1. 概要

### 1.1 目的

TID 調整（`tid-adjust`）の検索結果テーブルおよび CSV エクスポートに、`Base Seed`（LCG Seed）と `Key`（キー入力）カラムを追加する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| Base Seed | LCG (Linear Congruential Generator) の初期シード。64bit 整数を 16 桁 hex で表示する |
| Key / キー入力 | DS 起動時に押下するボタンの組み合わせ。内部的には `KeyCode`（`KeyMask XOR 0x2FFF`）として保持される |
| KeyCode | SHA-1 計算用の内部値。`formatKeyCode()` でボタン名文字列に変換して表示する |
| TrainerInfoSearchResult | WASM 側の TID 調整検索結果型。`seed_origin.Startup.base_seed` と `seed_origin.Startup.condition.key_code` を既に含んでいる |

### 1.3 背景・問題

TID 調整の検索結果には現在 6 カラム（日時、Timer0、VCount、TID、SID、色違い）のみ表示されている。WASM 側の `TrainerInfoSearcher` は `base_seed` と `key_code` を計算・返却しているが、テーブル列定義およびエクスポート列定義にこれらが含まれていない。

ユーザから「検索結果に LCGseed とキー入力が表示されず、どのボタンを押せばよいか分からない」との報告があった。

他の検索機能（`datetime-search`、`egg-search`）では `Base Seed` と `Key` カラムは表示・エクスポートされており、TID 調整のみ欠落している状態。

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| キー入力の可視化 | DS 起動時に押すボタンが結果テーブルに表示され、ユーザが操作手順を把握できる |
| Base Seed の可視化 | 他ツールとの突合や検証に利用可能になる |
| エクスポートの一貫性 | CSV エクスポートに `Key` と `Base Seed` が含まれ、`datetime-search` と同等の情報量になる |

### 1.5 着手条件

なし。既存の WASM 返却型に必要なフィールドは含まれており、フロントエンド側の表示追加のみで完結する。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/features/tid-adjust/components/trainer-info-columns.tsx` | 修正 | `Key` カラムと `Base Seed` カラムを追加 |
| `src/services/export-columns.ts` | 修正 | `createTidAdjustExportColumns()` に `key_input` と `base_seed` を追加 |
| `src/i18n/locales/en.po` | 修正 | 新規翻訳キーがあれば追加（既存の `Key` を再利用するため不要の可能性あり） |
| `src/i18n/locales/ja.po` | 修正 | 同上 |
| `src/test/unit/export-columns.test.ts` | 修正 | TID 調整エクスポートカラムのテストケース追加 |

## 3. 設計方針

- `datetime-search` の `seed-origin-columns.tsx` に既に実装されている `Key` カラムと `Base Seed` カラムのパターンを踏襲する
- `formatKeyCode()` と `toBigintHex()` は `src/lib/format.ts` に定義済みのため新規関数は不要
- テーブル上のカラム順序は: 日時 → Timer0 → VCount → **Key** → TID → SID → 色違い → **Base Seed**
  - Key は VCount の直後に配置（`datetime-search` と同じ並び）
  - Base Seed は末尾に配置（テーブル幅を圧迫しないよう右端に寄せる）
- CSV エクスポートのカラム順序もテーブルと一致させる

### 3.1 カラム名称の一貫性

追加する 2 カラムの ID・ヘッダー・i18n 方式・スタイルは `datetime-search` と同一パターンに揃える。

| 属性 | Key カラム | Base Seed カラム | 根拠（`datetime-search` 側の定義） |
|------|-----------|-----------------|----------------------------------|
| Column ID | `key` | `baseSeed` | `seed-origin-columns.tsx` と同一 |
| Header | `t\`Key\`` | `'Base Seed'`（plain string） | `Key` は i18n 対象、`Base Seed` は技術用語で非翻訳。既存と同一 |
| Export key | `key_input` | `base_seed` | `export-columns.ts` の `datetime-search` セクションと同一 |
| Export header | `Key` | `Base Seed` | CSV ヘッダーは英語固定（既存方針） |
| Cell style | なし | `font-mono text-xs` | `datetime-search` の `baseSeed` カラムと同一 |

## 4. 実装仕様

### 4.1 テーブル列定義の変更

`src/features/tid-adjust/components/trainer-info-columns.tsx` に以下の 2 カラムを追加する。

`datetime-search` の `seed-origin-columns.tsx` では Base Seed カラムに `SeedIvTooltip`（個体値ツールチップ）を付与しているが、TID 調整は個体値を扱わないためツールチップは不要。単純な `font-mono text-xs` 表示のみとする。

```typescript
import { toBigintHex, toHex, formatDatetime, formatShiny, formatKeyCode } from '@/lib/format';

// VCount カラムの後に追加
columnHelper.accessor(
  (row) => {
    const s = getStartup(row.seed_origin);
    return s ? formatKeyCode(s.condition.key_code) : '';
  },
  {
    id: 'key',
    header: () => t`Key`,
    size: 100,
  }
),

// 色違いカラムの後（末尾）に追加
columnHelper.accessor(
  (row) => {
    const s = getStartup(row.seed_origin);
    return s ? toBigintHex(s.base_seed, 16) : '';
  },
  {
    id: 'baseSeed',
    header: () => 'Base Seed',
    size: 160,
    cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
  }
),
```

### 4.2 エクスポート列定義の変更

`src/services/export-columns.ts` の `createTidAdjustExportColumns()` に以下を追加する。

```typescript
// VCount の後に追加
{
  key: 'key_input',
  header: 'Key',
  accessor: (r) => {
    const s = getStartup(r.seed_origin);
    return s ? formatKeyCode(s.condition.key_code) : '';
  },
},

// 色違いの後（末尾）に追加
{
  key: 'base_seed',
  header: 'Base Seed',
  accessor: (r) => {
    const s = getStartup(r.seed_origin);
    return s ? toBigintHex(s.base_seed, 16) : '';
  },
},
```

### 4.3 追加 import

`trainer-info-columns.tsx` の import に `toBigintHex` と `formatKeyCode` を追加する。

```typescript
import { toBigintHex, toHex, formatDatetime, formatShiny, formatKeyCode } from '@/lib/format';
```

`export-columns.ts` は `formatKeyCode` と `toBigintHex` が既に import 済みか確認し、不足があれば追加する。

## 5. テスト方針

| テスト種別 | 対象 | 検証内容 |
|------------|------|----------|
| ユニットテスト | `createTidAdjustExportColumns()` | 返却される ExportColumn 配列に `key_input` と `base_seed` が含まれること |
| ユニットテスト | `createTidAdjustExportColumns()` | 各 accessor が `TrainerInfoSearchResult` のモックデータから正しい値を返すこと |
| ユニットテスト | `createTrainerInfoColumns()` | カラム定義に `key` と `baseSeed` が含まれ、`id` が正しいこと |
| 手動確認 | TID 調整画面 | 検索実行後のテーブルに Key と Base Seed カラムが表示されること |
| 手動確認 | CSV エクスポート | エクスポートファイルに Key と Base Seed 列が含まれること |

## 6. 実装チェックリスト

- [ ] `trainer-info-columns.tsx` に `Key` カラムを追加
- [ ] `trainer-info-columns.tsx` に `Base Seed` カラムを追加
- [ ] `trainer-info-columns.tsx` の import に `toBigintHex`、`formatKeyCode` を追加
- [ ] `export-columns.ts` の `createTidAdjustExportColumns()` に `key_input` を追加
- [ ] `export-columns.ts` の `createTidAdjustExportColumns()` に `base_seed` を追加
- [ ] `export-columns.ts` の import に不足があれば追加
- [ ] ユニットテスト追加・実行
- [ ] 翻訳ファイルの更新（必要な場合）
- [ ] 手動動作確認（テーブル表示・CSV エクスポート）
