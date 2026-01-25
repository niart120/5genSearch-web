# API Input/Output 正規化 仕様書

## 1. 概要

### 1.1 目的

TS 側から WASM API を Worker 経由で呼び出す際の input/output を整理し、命名の一貫性と可読性を向上させる。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| Searcher | 条件検索を行う API (バッチ処理型) |
| Generator | 個体生成を行う API (Iterator 型) |
| Params | API 呼び出し時の入力パラメータ |
| Result | 単一の検索/生成結果 |
| Batch | バッチ処理の戻り値 (結果配列 + 進捗情報) |
| Config | 設定オブジェクト (ハードウェア、ゲーム条件等) |
| Source | 入力元を表す union 型 |

### 1.3 背景・問題

local_009/local_010 で型整理を進めてきたが、以下の課題が残存:

| 問題 | 詳細 |
|------|------|
| 命名の不統一 | `~Config`, `~Source`, `~Params` が混在し、役割が不明確 |
| 内部型と公開型の混同 | `PokemonGenerationConfig` 等が TS 公開されていない |
| Generator の非公開 | `WildPokemonGenerator` 等が WASM API として未公開 |
| 入力構造の重複 | `DsConfig` + `DatetimeParams` + `SearchSegment` の組み合わせが複数箇所で出現 |

### 1.4 スコープ

本仕様書では以下を対象とする:

1. 現状の API input/output の可視化 (PlantUML)
2. 命名規則の整理方針
3. Generator の WASM API 公開設計

## 2. 現状分析

### 2.1 公開 Searcher API

| Searcher | Params 型 | Batch 型 | Result 型 |
|----------|-----------|----------|-----------|
| `MtseedSearcher` | `MtseedSearchParams` | `MtseedSearchBatch` | `MtseedResult` |
| `MtseedDatetimeSearcher` | `MtseedDatetimeSearchParams` | `MtseedDatetimeSearchBatch` | `MtseedDatetimeResult` |
| `NeedleSearcher` | `NeedleSearchParams` | `NeedleSearchBatch` | `NeedleSearchResult` |

### 2.2 入力パラメータの構成要素

#### MtseedSearchParams

```typescript
interface MtseedSearchParams {
    iv_filter: IvFilter;      // フィルタ条件
    mt_offset: number;        // MT オフセット
    is_roamer: boolean;       // 徘徊モード
}
```

- シンプルな構成
- `SeedSource` 不要 (全 Seed を探索)

#### MtseedDatetimeSearchParams

```typescript
interface MtseedDatetimeSearchParams {
    target_seeds: MtSeed[];       // 検索対象 Seed
    ds: DsConfig;                 // DS 設定
    time_range: TimeRangeParams;  // 時刻範囲
    search_range: SearchRangeParams; // 検索範囲
    segment: SearchSegment;       // Timer0/VCount/KeyCode
}
```

- 複数の Config 型を組み合わせ
- `segment` は単一指定 (範囲指定なし)

#### NeedleSearchParams

```typescript
interface NeedleSearchParams {
    input: SeedSource;        // 入力ソース (統合型)
    pattern: NeedlePattern;   // 観測パターン
    advance_min: number;      // 消費範囲 min
    advance_max: number;      // 消費範囲 max
}
```

- `SeedSource` により Seed 直接指定/起動条件指定を統合

### 2.3 出力構造

#### 共通パターン

```typescript
interface XxxBatch {
    results: XxxResult[];     // 結果配列
    processed: number|bigint; // 処理済み件数
    total: number|bigint;     // 総件数
}
```

#### Result 型の構成

| Result | 主要フィールド |
|--------|---------------|
| `MtseedResult` | `seed`, `ivs` |
| `MtseedDatetimeResult` | `seed`, `datetime`, `segment` |
| `NeedleSearchResult` | `advance`, `source` |

### 2.4 Generator (非公開)

現状、Generator は WASM API として公開されていない:

| Generator | 入力型 (内部) | 出力型 |
|-----------|-------------|--------|
| `WildPokemonGenerator` | `PokemonGenerationConfig` + `EncounterSlotConfig[]` | `GeneratedPokemonData` |
| `StaticPokemonGenerator` | `PokemonGenerationConfig` | `GeneratedPokemonData` |
| `EggGenerator` | `EggGenerationConfig` | `GeneratedEggData` |

## 3. 可視化

### 3.1 PlantUML 図

[worker-api-io.puml](./worker-api-io.puml) を参照。

図の構成:

1. **共通入力型**: `DsConfig`, `DatetimeParams`, `SearchSegment` 等
2. **Searcher APIs**: 3 種の Searcher とその Params/Batch/Result
3. **Generator APIs**: 内部型の構成 (今後公開を検討)
4. **共通出力型**: `GeneratedPokemonData`, `GeneratedEggData` 等

## 4. 課題と改善方針

### 4.1 命名規則の整理

#### 現状の命名パターン

| 接尾辞 | 現状の使用箇所 | 想定される役割 |
|--------|--------------|--------------|
| `~Config` | `DsConfig`, `GameStartConfig`, `PokemonGenerationConfig` | 設定・構成情報 |
| `~Params` | `MtseedSearchParams`, `DatetimeParams`, `TimeRangeParams` | API 入力パラメータ |
| `~Source` | `SeedSource`, `GenerationSource` | 入力元/生成元を表す union |
| `~Result` | `MtseedResult`, `NeedleSearchResult` | 単一の検索結果 |
| `~Batch` | `MtseedSearchBatch` | バッチ処理の戻り値 |
| `~Info` | `MovingEncounterInfo`, `SpecialEncounterInfo` | 付加情報 |
| `~Filter` | `IvFilter` | フィルタ条件 |

#### 改善案

| 役割 | 命名規則 | 例 |
|------|---------|-----|
| ハードウェア/ゲーム設定 | `~Config` | `DsConfig`, `GameStartConfig` |
| API 呼び出しパラメータ | `~Params` | `MtseedSearchParams` |
| 範囲指定 | `~Range` or `~Params` | `TimeRangeParams`, `SearchRangeParams` |
| 入力ソース union | `~Source` | `SeedSource` |
| 出力ソース union | `~Source` | `GenerationSource` |
| 単一検索結果 | `~Result` | `MtseedResult` |
| バッチ戻り値 | `~Batch` | `MtseedSearchBatch` |
| 生成結果 | `Generated~Data` | `GeneratedPokemonData` |
| 付加情報 | `~Info` | `MovingEncounterInfo` |
| フィルタ条件 | `~Filter` | `IvFilter` |

### 4.2 DatetimeParams の位置づけ

`DatetimeParams` は「Params」だが API 入力パラメータではなく日時構造体。

**選択肢**:
1. `Datetime` にリネーム
2. 現状維持 (既存コード影響大のため)

**方針**: 当面は現状維持。将来的に破壊的変更を許容できるタイミングでリネームを検討。

### 4.3 SeedSource の拡張

`SeedSource` は `NeedleSearcher` で導入された。今後の統合:

| 対象 | 現状 | 統合後 |
|------|------|--------|
| `MtseedDatetimeSearchParams` | `ds` + `datetime` + `segment` 個別 | `SeedSource::Startup` 使用を検討 |
| Generator 入力 | 未公開 | `SeedSource` ベースの統一インターフェース |

**注意**: `MtseedDatetimeSearcher` は「Seed から起動時刻を逆算」する用途のため、`SeedSource` とは逆方向。統合は不要。

### 4.4 Generator の WASM API 公開

#### 必要性

- 現状: Rust 内部でのみ Generator を使用
- 課題: TS 側から直接個体生成を行えない
- 要件: Worker 経由で Generator を呼び出し、UI に結果をストリーミング表示

#### 公開設計案

```typescript
// 新規公開 Params 型
interface WildPokemonGeneratorParams {
    source: SeedSource;           // 入力ソース
    game_start: GameStartConfig;  // 起動設定
    generation: PokemonGenerationConfig; // 生成設定 (公開化)
    slots: EncounterSlotConfig[]; // スロット設定 (公開化)
    offset: OffsetConfig;         // オフセット設定 (公開化)
}

interface WildPokemonGeneratorBatch {
    results: GeneratedPokemonData[];
    processed: number;
    total: number;
}
```

## 5. 実装計画

### 5.1 Phase 1: 可視化 (本仕様書)

- [x] PlantUML で現状の input/output を図示
- [x] 命名規則の整理方針を文書化

### 5.2 Phase 2: 命名統一 (将来)

- [ ] `~Config` / `~Params` の境界を明確化
- [ ] 必要に応じて型名リネーム

### 5.3 Phase 3: Generator 公開 (将来)

- [ ] 内部設定型に tsify 属性を付与
- [ ] WASM API として Generator クラスを公開
- [ ] Worker 呼び出しインターフェースを設計

## 6. 補足

### 6.1 関連仕様書

- [local_009/TYPES_MODULE_RESTRUCTURE.md](../local_009/TYPES_MODULE_RESTRUCTURE.md): types モジュール分割
- [local_010/API_AND_TYPE_NORMALIZATION.md](../local_010/API_AND_TYPE_NORMALIZATION.md): API 公開戦略・型正規化

### 6.2 設計原則

1. **TS 側のシンプルさ優先**: 内部の複雑さを隠蔽し、直感的なインターフェースを提供
2. **命名の一貫性**: 役割に応じた接尾辞を統一
3. **段階的な公開**: 必要になった時点で Generator を公開
