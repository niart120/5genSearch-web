# 結果エクスポート機能 仕様書

## 1. 概要

### 1.1 目的

各検索機能の結果テーブルに表示されたデータを CSV / JSON 形式でファイルダウンロード、またはクリップボードにコピーする機能を提供する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| WYSIWYG エクスポート | テーブルに表示されている内容 (ソート順含む) をそのまま出力する方式 |
| 詳細情報 | detail dialog でのみ表示される付加フィールド (Seed 情報、エンカウント情報など) |
| 解決済みデータ | WASM 側で名称解決・文字列化された `UiPokemonData` / `UiEggData` |
| 生データ | WASM がバッチで返す `GeneratedPokemonData` / `SeedOrigin` 等の未解決データ |

### 1.3 背景・問題

- 検索結果をファイルに保存する手段がなく、ブラウザを閉じると結果が消失する
- 外部ツールや手動での検索結果管理に結果データを渡せない
- リファレンス実装 (`niart120/pokemon-gen5-initseed`) には CSV / JSON / TXT エクスポートが存在するため、同等以上の機能を提供する

### 1.4 期待効果

| 指標 | 内容 |
|------|------|
| 結果の永続化 | 検索結果をローカルファイルとして保存可能にする |
| 外部連携 | CSV / JSON 形式で他ツールへのデータ受け渡しを可能にする |
| 共有 | クリップボードコピーにより、結果の一部または全部を即座に共有可能にする |

### 1.5 着手条件

- 全 7 feature の結果テーブルが実装済み (Phase 3 完了)
- `DataTable` コンポーネントが動作していること
- `UiPokemonData` / `UiEggData` の WASM 変換パイプラインが完成していること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|---------|---------|
| `src/services/export.ts` | 新規 | エクスポートコアロジック (CSV/JSON 変換、ファイルダウンロード、クリップボードコピー) |
| `src/services/export-columns.ts` | 新規 | feature 別の列定義 (export 用) |
| `src/components/data-display/export-toolbar.tsx` | 新規 | エクスポートツールバー UI (テーブル上部) |
| `src/hooks/use-export.ts` | 新規 | エクスポート操作フック |
| `src/features/pokemon-list/components/pokemon-list-page.tsx` | 変更 | ExportToolbar 統合 |
| `src/features/egg-list/components/egg-list-page.tsx` | 変更 | ExportToolbar 統合 |
| `src/features/datetime-search/components/datetime-search-page.tsx` | 変更 | ExportToolbar 統合 |
| `src/features/egg-search/components/egg-search-page.tsx` | 変更 | ExportToolbar 統合 |
| `src/features/mtseed-search/components/mtseed-search-page.tsx` | 変更 | ExportToolbar 統合 |
| `src/features/needle/components/needle-page.tsx` | 変更 | ExportToolbar 統合 |
| `src/features/tid-adjust/components/tid-adjust-page.tsx` | 変更 | ExportToolbar 統合 |
| `src/i18n/locales/ja/messages.po` | 変更 | 翻訳キー追加 |
| `src/i18n/locales/en/messages.po` | 変更 | 翻訳キー追加 |
| `src/test/unit/export.test.ts` | 新規 | エクスポートロジックのユニットテスト |
| `src/test/components/export-toolbar.test.tsx` | 新規 | ExportToolbar コンポーネントテスト |

## 3. 設計方針

### 3.1 全体方針

- **WYSIWYG**: テーブルのソート済みデータをそのまま出力する。フィルタリング機能は現時点で未実装のため、全行 = テーブル表示行となる
- **解決済みデータの使用**: エクスポートは WASM から返された解決済み表示データ (`UiPokemonData`, `UiEggData` 等) をソースとする。生データの再変換は行わない
- **オプション制御**: 「詳細情報を含める」チェックボックスで detail dialog にのみ表示されるフィールドの出力を一括 ON/OFF する
- **statMode 連動**: `pokemon-list` / `egg-list` では現在の IV/Stats 切り替え状態をエクスポートに反映する (WYSIWYG)

### 3.2 レイヤー構成

```
ExportToolbar (UI)
    │
    ▼
useExport (Hook)
    │
    ▼
services/export.ts (CSV/JSON 変換 + ファイルダウンロード / クリップボードコピー)
    │
    ▼
services/export-columns.ts (feature 別列定義)
```

- `services/export.ts` は純粋関数の集合。React / Store に依存しない
- `services/export-columns.ts` は feature ごとの列定義マッピングを提供する
- `useExport` フックが Store (DS 設定・検索結果) と UI をブリッジする
- `ExportToolbar` は UI のみ。ロジックを持たない

### 3.3 CSV / JSON 仕様

#### CSV

- 区切り文字: `,` (カンマ)
- エンコーディング: UTF-8 (BOM 付き)
- 改行: `\r\n` (CRLF)
- ヘッダー行: 1 行目にカラム名
- 値のクオート: カンマ・改行・ダブルクオートを含む値はダブルクオートで囲む。ダブルクオート自体は `""` でエスケープする
- クリップボードコピー時: TSV (タブ区切り) で出力する。スプレッドシート貼り付けを想定

#### JSON

- エンコーディング: UTF-8
- 構造: メタ情報 + 結果配列

```json
{
  "meta": {
    "exportedAt": "2026-02-18T12:00:00.000Z",
    "feature": "pokemon-list",
    "version": "Black",
    "region": "Jpn",
    "hardware": "DsLite",
    "macAddress": "00:11:22:33:44:55",
    "totalResults": 150,
    "includeDetails": true,
    "statMode": "ivs"
  },
  "results": [...]
}
```

- `results` 配列の各要素は feature ごとに異なるスキーマ (Section 4.2 で定義)

### 3.4 ファイル命名規則

```
<timestamp>_<version>_<region>_<hardware>_<macaddr>.<ext>
```

| セグメント | 書式 | 桁数 | 例 |
|-----------|------|------|-----|
| `timestamp` | `yyMMddHHmmss` | 12 | `260218120000` |
| `version` | `b1` / `w1` / `b2` / `w2` | 2 | `b1` |
| `region` | 3 文字略称 | 3 | `jpn` |
| `hardware` | `ods` / `dsL` / `dsi` / `3ds` | 3 | `dsL` |
| `macaddr` | 16 進小文字連結 | 12 | `001122334455` |
| `ext` | csv / json | 3-4 | `csv` |

**マッピングテーブル**:

| `RomVersion` | ファイル名値 |
|-------------|-------------|
| `Black` | `b1` |
| `White` | `w1` |
| `Black2` | `b2` |
| `White2` | `w2` |

| `RomRegion` | ファイル名値 |
|------------|-------------|
| `Jpn` | `jpn` |
| `Kor` | `kor` |
| `Usa` | `usa` |
| `Ger` | `ger` |
| `Fra` | `fra` |
| `Spa` | `spa` |
| `Ita` | `ita` |

| `Hardware` | ファイル名値 |
|-----------|-------------|
| `Ds` | `ods` |
| `DsLite` | `dsL` |
| `Dsi` | `dsi` |
| `Dsi3ds` | `3ds` |

例: `260218120000_b1_jpn_dsL_001122334455.csv`

## 4. 実装仕様

### 4.1 エクスポート形式・アクション

```typescript
/** エクスポートファイル形式 */
type ExportFormat = 'csv' | 'json';

/** エクスポートアクション */
type ExportAction = 'download' | 'clipboard';
```

### 4.2 エクスポートオプション

```typescript
interface ExportOptions {
  /** ファイル形式 */
  format: ExportFormat;
  /** 実行アクション */
  action: ExportAction;
  /** 詳細情報を含めるか */
  includeDetails: boolean;
}
```

### 4.3 feature 別エクスポート列定義

#### 4.3.1 定義型

```typescript
/** エクスポート列定義 */
interface ExportColumn<T> {
  /** CSV ヘッダー / JSON キー */
  key: string;
  /** 表示ラベル (CSV ヘッダー用) */
  header: string;
  /** データ抽出関数 */
  accessor: (row: T) => string;
  /** detail-only フラグ (true の場合 includeDetails=true 時のみ出力) */
  detailOnly?: boolean;
}
```

#### 4.3.2 pokemon-list 列定義

**テーブル列 (常時出力)**:

| key | header | source |
|-----|--------|--------|
| `advance` | Advance | `advance` |
| `needle` | Needle | `needle_direction` → arrow |
| `species` | Species | `species_name` |
| `nature` | Nature | `nature_name` |
| `ability` | Ability | `ability_name` |
| `gender` | Gender | `gender_symbol` |
| `shiny` | Shiny | `shiny_symbol` |
| `hp` / `atk` / `def` / `spa` / `spd` / `spe` | H / A / B / C / D / S | `ivs[i]` or `stats[i]` (statMode 依存) |
| `hidden_power` | Hidden Power | `hidden_power_type` |
| `level` | Lv | `level` |
| `pid` | PID | `pid` |
| `sync` | Sync | `sync_applied` → `〇` / `×` |
| `held_item` | Held item | `held_item_name` |

**詳細列 (`includeDetails=true` 時のみ)**:

| key | header | source |
|-----|--------|--------|
| `base_seed` | Base Seed | `base_seed` |
| `mt_seed` | MT Seed | `mt_seed` |
| `datetime` | Date/Time | `datetime_iso` |
| `timer0` | Timer0 | `timer0` |
| `vcount` | VCount | `vcount` |
| `key_input` | Key input | `key_input` |
| `hp_alt` / ... / `spe_alt` | H(Stats) / ... / S(Stats) | statMode の非表示側 |
| `hidden_power_power` | Hidden Power (Power) | `hidden_power_power` |
| `moving_encounter` | Moving encounter | `moving_encounter_guaranteed` |
| `special_encounter` | Special encounter | `special_encounter_triggered` |
| `special_direction` | Special direction | `special_encounter_direction` |
| `encounter_result` | Encounter result | `encounter_result` |

#### 4.3.3 egg-list 列定義

**テーブル列 (常時出力)**:

| key | header | source |
|-----|--------|--------|
| `advance` | Advance | `advance` |
| `needle` | Needle | `needle_direction` → arrow |
| `species` | Species | `species_name` |
| `nature` | Nature | `nature_name` |
| `ability` | Ability | `ability_name` |
| `gender` | Gender | `gender_symbol` |
| `shiny` | Shiny | `shiny_symbol` |
| `hp` / ... / `spe` | H / ... / S | `ivs[i]` or `stats[i]` (statMode 依存) |
| `hidden_power` | Hidden Power | `hidden_power_type` |
| `pid` | PID | `pid` |
| `margin_frames` | Margin | `margin_frames` |

**詳細列 (`includeDetails=true` 時のみ)**:

| key | header | source |
|-----|--------|--------|
| `base_seed` | Base Seed | `base_seed` |
| `mt_seed` | MT Seed | `mt_seed` |
| `datetime` | Date/Time | `datetime_iso` |
| `timer0` | Timer0 | `timer0` |
| `vcount` | VCount | `vcount` |
| `key_input` | Key input | `key_input` |
| `hp_alt` / ... / `spe_alt` | H(Stats) / ... / S(Stats) | statMode の非表示側 |
| `hidden_power_power` | Hidden Power (Power) | `hidden_power_power` |

#### 4.3.4 datetime-search 列定義

**テーブル列 (常時出力)**:

| key | header | source |
|-----|--------|--------|
| `datetime` | Date/Time | `Startup.datetime` |
| `timer0` | Timer0 | `Startup.condition.timer0` (hex) |
| `vcount` | VCount | `Startup.condition.vcount` (hex) |
| `key_input` | Key | `Startup.condition.key_code` → `formatKeyCode` |
| `base_seed` | Base Seed | `base_seed` (hex) |
| `mt_seed` | MT Seed | `mt_seed` (hex) |

**詳細列**: なし (テーブル列と detail dialog の内容が同一のため)

#### 4.3.5 egg-search 列定義

**テーブル列 (常時出力)**:

| key | header | source |
|-----|--------|--------|
| `datetime` | Date/Time | `egg.source.Startup.datetime` |
| `timer0` | Timer0 | `egg.source.Startup.condition.timer0` |
| `vcount` | VCount | `egg.source.Startup.condition.vcount` |
| `nature` | Nature | `egg.core.nature` |
| `hp` / ... / `spe` | H / ... / S | `egg.core.ivs.*` |
| `ability` | Ability | `egg.core.ability_slot` |
| `gender` | Gender | `egg.core.gender` |
| `shiny` | Shiny | `egg.core.shiny_type` |
| `advance` | Advance | `egg.advance` |
| `margin` | Margin | `egg.margin_frames` |

**詳細列 (`includeDetails=true` 時のみ)**:

| key | header | source |
|-----|--------|--------|
| `base_seed` | Base Seed | `egg.source.*.base_seed` |
| `key_input` | Key input | `egg.source.Startup.condition.key_code` |

#### 4.3.6 mtseed-search 列定義

**テーブル列 (常時出力)**:

| key | header | source |
|-----|--------|--------|
| `seed` | MT Seed | `seed` (hex) |
| `hp` / `atk` / `def` / `spa` / `spd` / `spe` | HP / Atk / Def / SpA / SpD / Spe | `ivs.*` |

**詳細列**: なし

#### 4.3.7 needle 列定義

**テーブル列 (常時出力)**:

| key | header | source |
|-----|--------|--------|
| `advance` | Advance | `advance` |
| `base_seed` | Initial Seed | `source.Startup.base_seed` (hex) |
| `date` | Date | `source.Startup.datetime` (date 部分) |
| `time` | Time | `source.Startup.datetime` (time 部分) |
| `timer0` | Timer0 | `source.Startup.condition.timer0` (hex) |
| `vcount` | VCount | `source.Startup.condition.vcount` (hex) |

**詳細列**: なし

#### 4.3.8 tid-adjust 列定義

**テーブル列 (常時出力)**:

| key | header | source |
|-----|--------|--------|
| `datetime` | Date/Time | `seed_origin.Startup.datetime` |
| `timer0` | Timer0 | `seed_origin.Startup.condition.timer0` (hex) |
| `vcount` | VCount | `seed_origin.Startup.condition.vcount` (hex) |
| `tid` | TID | `trainer.tid` |
| `sid` | SID | `trainer.sid` |
| `shiny` | Shiny | `shiny_type` |

**詳細列**: なし

### 4.4 CSV 変換ロジック

```typescript
function toCsv<T>(rows: readonly T[], columns: ExportColumn<T>[]): string {
  const BOM = '\uFEFF';
  const header = columns.map((c) => escapeCsvField(c.header)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCsvField(c.accessor(row))).join(','))
    .join('\r\n');
  return `${BOM}${header}\r\n${body}`;
}

function toTsv<T>(rows: readonly T[], columns: ExportColumn<T>[]): string {
  const header = columns.map((c) => c.header).join('\t');
  const body = rows
    .map((row) => columns.map((c) => c.accessor(row)).join('\t'))
    .join('\n');
  return `${header}\n${body}`;
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

### 4.5 JSON 変換ロジック

```typescript
interface ExportMeta {
  exportedAt: string;      // ISO 8601
  feature: string;         // feature 識別子
  version: string;         // RomVersion
  region: string;          // RomRegion
  hardware: string;        // Hardware
  macAddress: string;      // "00:11:22:33:44:55"
  totalResults: number;
  includeDetails: boolean;
  statMode?: 'ivs' | 'stats';  // pokemon-list / egg-list のみ
}

function toJson<T>(
  rows: readonly T[],
  columns: ExportColumn<T>[],
  meta: ExportMeta
): string {
  const results = rows.map((row) => {
    const obj: Record<string, string> = {};
    for (const col of columns) {
      obj[col.key] = col.accessor(row);
    }
    return obj;
  });
  return JSON.stringify({ meta, results }, undefined, 2);
}
```

### 4.6 ファイルダウンロード / クリップボード

```typescript
/** Blob 生成 → <a> click → revokeObjectURL */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** クリップボードにテキストをコピー */
async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
```

### 4.7 ファイル名生成

```typescript
const VERSION_MAP: Record<RomVersion, string> = {
  Black: 'b1',
  White: 'w1',
  Black2: 'b2',
  White2: 'w2',
};

const REGION_MAP: Record<RomRegion, string> = {
  Jpn: 'jpn',
  Kor: 'kor',
  Usa: 'usa',
  Ger: 'ger',
  Fra: 'fra',
  Spa: 'spa',
  Ita: 'ita',
};

const HARDWARE_MAP: Record<Hardware, string> = {
  Ds: 'ods',
  DsLite: 'dsL',
  Dsi: 'dsi',
  Dsi3ds: '3ds',
};

function generateExportFilename(
  config: DsConfig,
  ext: 'csv' | 'json'
): string {
  const now = new Date();
  const ts = [
    String(now.getFullYear()).slice(2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  const ver = VERSION_MAP[config.version];
  const reg = REGION_MAP[config.region];
  const hw = HARDWARE_MAP[config.hardware];
  const mac = config.mac.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${ts}_${ver}_${reg}_${hw}_${mac}.${ext}`;
}
```

### 4.8 ExportToolbar UI

テーブル上部に配置するツールバーコンポーネント。

```
┌─────────────────────────────────────────────────┐
│ 150 件  │ □ 詳細情報を含める │ [▼ エクスポート] │
└─────────────────────────────────────────────────┘
```

- 左: 結果件数表示 (既存の表示と統合)
- 中央: 「詳細情報を含める」チェックボックス (detail dialog があるfeature のみ表示)
- 右: ドロップダウンメニュー
  - CSV でダウンロード
  - JSON でダウンロード
  - クリップボードにコピー (TSV)

```typescript
interface ExportToolbarProps<T> {
  /** テーブルデータ (ソート済み) */
  data: readonly T[];
  /** エクスポート列定義 (feature から注入) */
  columns: ExportColumn<T>[];
  /** 詳細列定義 (feature から注入; undefined の場合チェックボックス非表示) */
  detailColumns?: ExportColumn<T>[];
  /** feature 識別子 (JSON meta に使用) */
  featureId: string;
  /** statMode (pokemon-list / egg-list のみ) */
  statMode?: 'ivs' | 'stats';
  /** 結果件数 */
  resultCount: number;
}
```

#### ドロップダウンメニュー構成

Radix `DropdownMenu` を使用:

```
[▼ Export]
├── CSV でダウンロード    (Download as CSV)
├── JSON でダウンロード   (Download as JSON)
├── ────────────
└── クリップボードにコピー (Copy to clipboard)
```

#### Toast 通知

- ダウンロード成功時: 「`{filename}` をダウンロードしました」
- クリップボードコピー成功時: 「クリップボードにコピーしました」
- エラー時: 「エクスポートに失敗しました」

既存の Toast コンポーネント (`components/ui/toast`) を使用。

### 4.9 useExport フック

```typescript
interface UseExportReturn<T> {
  /** CSV ダウンロード */
  downloadCsv: () => void;
  /** JSON ダウンロード */
  downloadJson: () => void;
  /** クリップボードコピー (TSV) */
  copyToClipboard: () => Promise<void>;
  /** 詳細情報を含めるか */
  includeDetails: boolean;
  /** 詳細情報の ON/OFF 切り替え */
  setIncludeDetails: (value: boolean) => void;
}

function useExport<T>(options: {
  data: readonly T[];
  columns: ExportColumn<T>[];
  detailColumns?: ExportColumn<T>[];
  featureId: string;
  statMode?: 'ivs' | 'stats';
}): UseExportReturn<T>;
```

- `includeDetails` は `useState` (ローカル state) で管理。永続化不要
- DS 設定は `useDsConfig` フックから取得 (ファイル名生成に使用)
- Toast 通知は `sonner` 等の Toast ライブラリまたは既存の Toast コンポーネント経由

### 4.10 egg-search の列アクセサ

`egg-search` は解決済みデータ (`Ui*`) ではなく、生データ (`EggDatetimeSearchResult`) を直接扱う。列アクセサは生データから直接値を抽出し、`formatDatetime`, `toHex`, `formatKeyCode`, `formatGender`, `formatShiny`, `formatAbilitySlot`, `formatIvs` 等の既存フォーマッタを使用する。

同様に `datetime-search` (`SeedOrigin`)、`mtseed-search` (`MtseedResult`)、`needle` (`NeedleSearchResult`)、`tid-adjust` (`TrainerInfoSearchResult`) も生データから直接抽出する。

## 5. テスト方針

### 5.1 ユニットテスト (`src/test/unit/export.test.ts`)

| テストケース | 検証内容 |
|-------------|---------|
| `toCsv` — 基本出力 | ヘッダー + データ行が正しく生成されること |
| `toCsv` — カンマ含む値 | フィールドがダブルクオートで囲まれること |
| `toCsv` — ダブルクオート含む値 | `""` でエスケープされること |
| `toCsv` — BOM 付き UTF-8 | 先頭に BOM (`\uFEFF`) が付与されること |
| `toTsv` — 基本出力 | タブ区切りで正しく生成されること |
| `toJson` — 基本出力 | meta + results 構造が正しいこと |
| `toJson` — includeDetails 反映 | `meta.includeDetails` が正しく設定されること |
| `generateExportFilename` — 正常系 | 各セグメントが正しくマッピングされること |
| `generateExportFilename` — 全 version | `b1`, `w1`, `b2`, `w2` の全パターン |
| `generateExportFilename` — 全 hardware | `ods`, `dsL`, `dsi`, `3ds` の全パターン |
| `escapeCsvField` — エスケープ不要 | そのまま返却されること |
| `escapeCsvField` — エスケープ必要 | 正しくエスケープされること |
| `detailOnly 列のフィルタリング` | `includeDetails=false` 時に detailOnly 列が除外されること |
| `pokemon-list columns — statMode=ivs` | IV 列が出力され Stats 列が detailOnly に分類されること |
| `pokemon-list columns — statMode=stats` | Stats 列が出力され IV 列が detailOnly に分類されること |

### 5.2 コンポーネントテスト (`src/test/components/export-toolbar.test.tsx`)

| テストケース | 検証内容 |
|-------------|---------|
| 描画 | ExportToolbar が正しく描画されること |
| 件数表示 | `resultCount` が表示されること |
| ドロップダウン展開 | ボタンクリックでメニューが表示されること |
| CSV ダウンロード | CSV メニュー項目クリックでダウンロード関数が呼ばれること |
| クリップボードコピー | コピー項目クリックでクリップボード関数が呼ばれること |
| 詳細チェックボックス非表示 | `detailColumns` 未指定時にチェックボックスが表示されないこと |
| 詳細チェックボックス表示 | `detailColumns` 指定時にチェックボックスが表示されること |
| データ 0 件 | 結果がない場合にエクスポートボタンが disabled になること |

### 5.3 統合テスト

本機能は WASM / Worker との直接的な統合がない (解決済みデータを入力とする) ため、統合テストは不要。feature ページ内のエクスポート操作はコンポーネントテストでカバーする。

## 6. 状態管理

### 6.1 状態分類

| 状態 | 管理方式 | 永続化 | 理由 |
|------|---------|--------|------|
| `includeDetails` | `useState` (useExport 内) | 不要 | セッション内の一時的な選択 |
| `data` (ソート済み結果) | DataTable 内部 (`@tanstack/react-table`) | 不要 | テーブル表示のソート済みデータを参照 |
| DS 設定 | `useDsConfigStore` (既存) | 既存 | ファイル名生成に使用 |

### 6.2 Store 変更

本機能のための Store 追加・変更は不要。

### 6.3 DataTable からのソート済みデータ取得

現在の `DataTable` コンポーネントはソート済みデータを外部に公開していない。以下のいずれかの方法で対応する:

**案 A: DataTable に `onSortedDataChange` コールバックを追加**

```typescript
interface DataTableOptions<TData> {
  // 既存プロパティ...
  /** ソート済みデータが変更された際のコールバック */
  onSortedDataChange?: (data: TData[]) => void;
}
```

DataTable 内部で `table.getSortedRowModel().rows` を `useEffect` で監視し、変更時にコールバックを発火する。

**案 B: ExportToolbar に渡すデータは元配列をそのまま使用**

ソートは表示上の便宜であり、エクスポートには元の順序 (advance 順等) で出力する。WYSIWYG の原則からはやや外れるが、実用上は問題ない。

→ **案 B を採用する**。理由:
1. DataTable の API 変更を最小化できる
2. 元データの順序は WASM が返した順序 (advance 順) であり、利用者にとって自然
3. ソート状態の同期コストが不要

## 7. 翻訳方針

### 7.1 翻訳対象

| UI ラベル | 翻訳キー (自然文) |
|----------|-----------------|
| エクスポートボタン | `Export` |
| CSV でダウンロード | `Download as CSV` |
| JSON でダウンロード | `Download as JSON` |
| クリップボードにコピー | `Copy to clipboard` |
| 詳細情報を含める | `Include details` |
| ダウンロード成功 Toast | `Downloaded {filename}` |
| クリップボードコピー成功 Toast | `Copied to clipboard` |
| エクスポート失敗 Toast | `Export failed` |

### 7.2 実装方法

- UI ラベル: `<Trans>` マクロまたは `t` タグ関数 (Lingui)
- 動的挿入 (ファイル名): `t\`Downloaded ${filename}\``
- CSV ヘッダーは英語固定 (機械可読性を優先)

## 8. バリデーション

### 8.1 バリデーション対象

本機能にフォーム入力は存在しない。以下の条件分岐のみ:

| 条件 | 処理 |
|------|------|
| `data.length === 0` | エクスポートボタンを `disabled` にする |
| クリップボード API 未対応 | 「クリップボードにコピー」メニュー項目を非表示 |

### 8.2 責務

バリデーション (データ有無チェック) は `ExportToolbar` コンポーネントが担当。`services/export.ts` は空配列入力時も正常動作する (ヘッダーのみの CSV / 空 results の JSON を生成)。

## 9. 実装チェックリスト

- [ ] `src/services/export.ts` — CSV/JSON/TSV 変換、ファイルダウンロード、クリップボードコピー、ファイル名生成
- [ ] `src/services/export-columns.ts` — feature 別列定義 (7 feature 分)
- [ ] `src/components/data-display/export-toolbar.tsx` — ExportToolbar コンポーネント
- [ ] `src/hooks/use-export.ts` — useExport フック
- [ ] `src/features/pokemon-list/` — ExportToolbar 統合
- [ ] `src/features/egg-list/` — ExportToolbar 統合
- [ ] `src/features/datetime-search/` — ExportToolbar 統合
- [ ] `src/features/egg-search/` — ExportToolbar 統合
- [ ] `src/features/mtseed-search/` — ExportToolbar 統合
- [ ] `src/features/needle/` — ExportToolbar 統合
- [ ] `src/features/tid-adjust/` — ExportToolbar 統合
- [ ] `src/i18n/locales/ja/messages.po` — 翻訳キー追加
- [ ] `src/i18n/locales/en/messages.po` — 翻訳キー追加
- [ ] `src/test/unit/export.test.ts` — ユニットテスト
- [ ] `src/test/components/export-toolbar.test.tsx` — コンポーネントテスト
