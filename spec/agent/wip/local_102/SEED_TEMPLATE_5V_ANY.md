# 初期Seedテンプレート A抜け5V / C抜け5V 追加 仕様書

## 1. 概要

### 1.1 目的

起動時刻検索 (datetime-search) のテンプレート選択ダイアログに、A抜け5V / C抜け5V の初期Seed一覧を BW / BW2 それぞれに追加する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| A抜け5V | HP, Def, SpA, SpD, Spe が 31 で Atk のみ任意値 (`31-x-31-31-31-31`) |
| C抜け5V | HP, Atk, Def, SpD, Spe が 31 で SpA のみ任意値 (`31-31-31-x-31-31`) |
| MT Seed | Mersenne Twister の 32bit 初期シード値 |
| mt_offset | 個体値生成開始位置の MT 消費オフセット。BW 固定・野生=0, BW2 固定・野生=2 |
| SeedTemplate | `src/data/seed-templates.ts` で定義されるテンプレートデータ型 |

### 1.3 背景・問題

現行のテンプレートには 6V・5VA0・5VS0・V0VVV0・めざパ系が登録されているが、「Atk 不問で他 5V」「SpA 不問で他 5V」のテンプレートが存在しない。特殊アタッカー用の C抜け5V や物理アタッカー用の A抜け5V は需要が高い個体値パターンであり、テンプレートとして提供する価値がある。

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| テンプレート追加数 | 4 件 (BW A抜け5V, BW C抜け5V, BW2 A抜け5V, BW2 C抜け5V) |
| 登録 Seed 数 | BW A抜け5V: 106 件, BW C抜け5V: 162 件, BW2 A抜け5V: 131 件, BW2 C抜け5V: 134 件 |

### 1.5 着手条件

なし。データ追加のみで既存機能への影響はない。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/data/seed-templates.ts` | 修正 | `BW_STATIONARY_TEMPLATES` に A抜け5V / C抜け5V の 2 テンプレートを追加。`BW2_STATIONARY_TEMPLATES` に同様の 2 テンプレートを追加 |

## 3. 設計方針

### 3.1 テンプレート配置

既存テンプレート配列の 6V の直後、5VA0 の前に A抜け5V を配置し、A抜け5V の直後に C抜け5V を配置する。理由: 6V ⊂ A抜け5V ⊂ 全体 という包含関係の順序を保つ。

### 3.2 ID / 名称の命名規則

| テンプレート | id | ja 名 | en 名 |
|-------------|-----|------|------|
| BW A抜け5V | `bw-stationary-5v-any-a` | BW 固定・野生 A抜け5V | BW Stationary/Wild 5V -Atk |
| BW C抜け5V | `bw-stationary-5v-any-c` | BW 固定・野生 C抜け5V | BW Stationary/Wild 5V -SpA |
| BW2 A抜け5V | `bw2-stationary-5v-any-a` | BW2 固定・野生 A抜け5V | BW2 Stationary/Wild 5V -Atk |
| BW2 C抜け5V | `bw2-stationary-5v-any-c` | BW2 固定・野生 C抜け5V | BW2 Stationary/Wild 5V -SpA |

### 3.3 description

| テンプレート | ja / en |
|-------------|---------|
| A抜け5V | `31-x-31-31-31-31` |
| C抜け5V | `31-31-31-x-31-31` |

### 3.4 データソース

GPU 全探索 (GpuMtseedSearchIterator) により導出済みの CSV ファイル:

| CSV ファイル | テンプレート | mt_offset |
|-------------|-------------|-----------|
| `mt_offset_0_5V_anyA.csv` | BW A抜け5V | 0 |
| `mt_offset_0_5V_anyC.csv` | BW C抜け5V | 0 |
| `mt_offset_2_5V_anyA.csv` | BW2 A抜け5V | 2 |
| `mt_offset_2_5V_anyC.csv` | BW2 C抜け5V | 2 |

### 3.5 既存テンプレートとの包含関係

A抜け5V は既存の 6V (Atk=31 のケース) と 5VA0 (Atk=0 のケース) を包含する。C抜け5V も同様に 6V (SpA=31) を包含する。テンプレート選択ダイアログではチェックボックスで複数選択可能で、適用時に Seed が重複排除 (`Set`) されるため、包含関係による問題は生じない。

## 4. 実装仕様

### 4.1 BW 固定・野生テンプレートへの追加

`BW_STATIONARY_TEMPLATES` 配列内、6V テンプレートの直後に以下を追加する:

```typescript
{
  id: 'bw-stationary-5v-any-a',
  name: { ja: 'BW 固定・野生 A抜け5V', en: 'BW Stationary/Wild 5V -Atk' },
  description: { ja: '31-x-31-31-31-31', en: '31-x-31-31-31-31' },
  version: 'BW',
  category: 'stationary',
  seeds: [
    // mt_offset_0_5V_anyA.csv より 106 件
    0x016A4B08, 0x06EFA0A0, 0x07A7B200, /* ... */ 0xFF5C09DF,
  ],
},
{
  id: 'bw-stationary-5v-any-c',
  name: { ja: 'BW 固定・野生 C抜け5V', en: 'BW Stationary/Wild 5V -SpA' },
  description: { ja: '31-31-31-x-31-31', en: '31-31-31-x-31-31' },
  version: 'BW',
  category: 'stationary',
  seeds: [
    // mt_offset_0_5V_anyC.csv より 162 件
    0x02B7FE42, 0x059D51DD, 0x05CBFD3B, /* ... */ 0xFF604777,
  ],
},
```

### 4.2 BW2 固定・野生テンプレートへの追加

`BW2_STATIONARY_TEMPLATES` 配列内、6V テンプレートの直後に以下を追加する:

```typescript
{
  id: 'bw2-stationary-5v-any-a',
  name: { ja: 'BW2 固定・野生 A抜け5V', en: 'BW2 Stationary/Wild 5V -Atk' },
  description: { ja: '31-x-31-31-31-31', en: '31-x-31-31-31-31' },
  version: 'BW2',
  category: 'stationary',
  seeds: [
    // mt_offset_2_5V_anyA.csv より 131 件
    0x072ED893, 0x08D34272, 0x09627344, /* ... */ 0xFF93F944,
  ],
},
{
  id: 'bw2-stationary-5v-any-c',
  name: { ja: 'BW2 固定・野生 C抜け5V', en: 'BW2 Stationary/Wild 5V -SpA' },
  description: { ja: '31-31-31-x-31-31', en: '31-31-31-x-31-31' },
  version: 'BW2',
  category: 'stationary',
  seeds: [
    // mt_offset_2_5V_anyC.csv より 134 件
    0x015ACAE2, 0x04688A64, 0x056C7B9D, /* ... */ 0xFA5EC670,
  ],
},
```

### 4.3 Seed 値のフォーマット規約

既存テンプレートに倣い、以下のフォーマットで記述する:

- 16 進数リテラル、小文字、2 桁ごとにアンダースコア区切り (例: `0x01_6a_4b_08`)
- 1 行あたり最大 6 値、末尾カンマあり
- CSV の MT Seed 列の昇順を維持する

## 5. テスト方針

データ追加のみのため、新規テストは追加しない。以下の既存テストで回帰を確認する:

| テスト | 確認内容 |
|--------|----------|
| `pnpm test:run` | 既存テストに破壊がないこと |
| `pnpm exec tsc -b --noEmit` | 型エラーがないこと |

手動検証:

| 確認項目 | 手順 |
|----------|------|
| テンプレート一覧表示 | 起動時刻検索 → テンプレート選択ダイアログを開く → BW / BW2 でフィルタし、A抜け5V / C抜け5V が表示されること |
| Seed 適用 | A抜け5V / C抜け5V を選択 → 適用 → ターゲット Seed 欄に正しい件数が反映されること |
| 重複排除 | 6V と A抜け5V を同時選択 → 適用 → 重複 Seed が排除されること |

## 6. 実装チェックリスト

- [ ] `src/data/seed-templates.ts` に BW A抜け5V テンプレートを追加
- [ ] `src/data/seed-templates.ts` に BW C抜け5V テンプレートを追加
- [ ] `src/data/seed-templates.ts` に BW2 A抜け5V テンプレートを追加
- [ ] `src/data/seed-templates.ts` に BW2 C抜け5V テンプレートを追加
- [ ] `pnpm exec tsc -b --noEmit` で型エラーがないことを確認
- [ ] `pnpm test:run` で既存テスト通過を確認
