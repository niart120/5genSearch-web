# DSi/3DS ハードウェア固有 NAZO 値対応 仕様書

## 1. 概要

### 1.1 目的

`get_nazo_values` に `Hardware` パラメータを追加し、DSi/3DS 固有の NAZO 値を返せるようにする。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| NAZO 値 | SHA-1 シード計算に使用する ROM/ハードウェア依存の 5 つの 32bit 定数 |
| Hardware | 実行ハードウェア種別 (DS/DSi/3DS) |
| バイトスワップ | リトルエンディアン ↔ ビッグエンディアン変換 |

### 1.3 背景・問題

- 現在の `get_nazo_values` は DS Lite 用の値のみ返す
- DSi/3DS では異なる NAZO 値が必要だが未実装
- `Hardware` enum は存在するが NAZO 値選択に使用されていない

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| ハードウェア対応 | DS/DSi/3DS 全てで正しいシード計算が可能になる |
| API 整合性 | `Hardware` enum が実際に機能する |

### 1.5 着手条件

- なし（独立して着手可能）

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/core/sha1/nazo.rs` | 修正 | DSi 用テーブル追加、引数を `&DsConfig` に変更 |
| `wasm-pkg/src/datetime_search/base.rs` | 修正 | 呼び出しを `get_nazo_values(ds)` に変更 |
| `wasm-pkg/src/gpu/datetime_search/pipeline.rs` | 修正 | 呼び出しを `get_nazo_values(ds)` に変更 |
| `wasm-pkg/src/core/seed_resolver.rs` | 修正 | 呼び出しを `get_nazo_values(ds)` に変更 |

## 3. 設計方針

### 3.1 NAZO 値テーブル構造

DS 用と DSi 用は完全に別の定数テーブルとして定義する。単純なオフセット加算ではない。

### 3.2 DSi/3DS 用 NAZO 値一覧

以下はビッグエンディアン（本実装形式）に変換済み。

#### Black (DSi/3DS)

| Region | NAZO[0] | NAZO[1] | NAZO[2] | NAZO[3] | NAZO[4] |
|--------|---------|---------|---------|---------|---------|
| JPN | `0x0276_1150` | `0x0276_124C` | `0x0276_124C` | `0x0276_1298` | `0x0276_1298` |
| USA | `0x0276_0190` | `0x0276_028C` | `0x0276_028C` | `0x0276_02D8` | `0x0276_02D8` |
| KOR | `0x0276_1150` | `0x0276_124C` | `0x0276_124C` | `0x0276_1298` | `0x0276_1298` |
| GER | `0x0276_02F0` | `0x0276_03EC` | `0x0276_03EC` | `0x0276_0438` | `0x0276_0438` |
| FRA | `0x0276_0230` | `0x0276_032C` | `0x0276_032C` | `0x0276_0378` | `0x0276_0378` |
| SPA | `0x0276_01F0` | `0x0276_02EC` | `0x0276_02EC` | `0x0276_0338` | `0x0276_0338` |
| ITA | `0x0276_01D0` | `0x0276_02CC` | `0x0276_02CC` | `0x0276_0318` | `0x0276_0318` |

#### White (DSi/3DS)

| Region | NAZO[0] | NAZO[1] | NAZO[2] | NAZO[3] | NAZO[4] |
|--------|---------|---------|---------|---------|---------|
| JPN | `0x0276_1150` | `0x0276_124C` | `0x0276_124C` | `0x0276_1298` | `0x0276_1298` |
| USA | `0x0276_01B0` | `0x0276_02AC` | `0x0276_02AC` | `0x0276_02F8` | `0x0276_02F8` |
| KOR | `0x0276_1150` | `0x0276_124C` | `0x0276_124C` | `0x0276_1298` | `0x0276_1298` |
| GER | `0x0276_02F0` | `0x0276_03EC` | `0x0276_03EC` | `0x0276_0438` | `0x0276_0438` |
| FRA | `0x0276_0250` | `0x0276_034C` | `0x0276_034C` | `0x0276_0398` | `0x0276_0398` |
| SPA | `0x0276_01F0` | `0x0276_02EC` | `0x0276_02EC` | `0x0276_0338` | `0x0276_0338` |
| ITA | `0x0276_01D0` | `0x0276_02CC` | `0x0276_02CC` | `0x0276_0318` | `0x0276_0318` |

#### Black2 (DSi/3DS)

| Region | NAZO[0] | NAZO[1] | NAZO[2] | NAZO[3] | NAZO[4] |
|--------|---------|---------|---------|---------|---------|
| JPN | `0x0209_A8DC` | `0x0203_9AC9` | `0x027A_A730` | `0x027A_A784` | `0x027A_A784` |
| USA | `0x0209_AEE8` | `0x0203_9DE9` | `0x027A_5F70` | `0x027A_5FC4` | `0x027A_5FC4` |
| KOR | `0x0209_B60C` | `0x0203_A4D5` | `0x0220_0770` | `0x0220_07C4` | `0x0220_07C4` |
| GER | `0x0209_AE28` | `0x0203_9D69` | `0x027A_6110` | `0x027A_6164` | `0x027A_6164` |
| FRA | `0x0209_AF08` | `0x0203_9DF9` | `0x027A_5F90` | `0x027A_5FE4` | `0x027A_5FE4` |
| SPA | `0x0209_AEA8` | `0x0203_9DB9` | `0x027A_6070` | `0x027A_60C4` | `0x027A_60C4` |
| ITA | `0x0209_ADE8` | `0x0203_9D69` | `0x027A_5F70` | `0x027A_5FC4` | `0x027A_5FC4` |

#### White2 (DSi/3DS)

| Region | NAZO[0] | NAZO[1] | NAZO[2] | NAZO[3] | NAZO[4] |
|--------|---------|---------|---------|---------|---------|
| JPN | `0x0209_A8FC` | `0x0203_9AF5` | `0x027A_A5F0` | `0x027A_A644` | `0x027A_A644` |
| USA | `0x0209_AF28` | `0x0203_9E15` | `0x027A_5E90` | `0x027A_5EE4` | `0x027A_5EE4` |
| KOR | `0x0209_B62C` | `0x0203_A501` | `0x027A_57B0` | `0x027A_8704` | `0x027A_8704` |
| GER | `0x0209_AE48` | `0x0203_9D95` | `0x027A_6010` | `0x027A_6064` | `0x027A_6064` |
| FRA | `0x0209_AF28` | `0x0203_9E25` | `0x027A_5EF0` | `0x027A_5F44` | `0x027A_5F44` |
| SPA | `0x0209_AEC8` | `0x0203_9DE5` | `0x027A_5FB0` | `0x027A_6004` | `0x027A_6004` |
| ITA | `0x0209_AE28` | `0x0203_9D95` | `0x027A_5ED0` | `0x027A_5F24` | `0x027A_5F24` |

## 4. 実装仕様

### 4.1 API 変更

```rust
// 変更前
pub const fn get_nazo_values(version: RomVersion, region: RomRegion) -> NazoValues;

// 変更後
pub const fn get_nazo_values(ds: &DsConfig) -> NazoValues;
```

`DsConfig` は `version`, `region`, `hardware` を全て保持しており、呼び出し元は既に `DsConfig` を持っている。個別フィールドを展開して渡す必要がなくなり、API が簡潔になる。

### 4.2 実装方針

`DsConfig` の `hardware` フィールドで DS 系 / DSi 系を判別し、`version` × `region` でテーブルを引く。

```rust
pub const fn get_nazo_values(ds: &DsConfig) -> NazoValues {
    match ds.hardware {
        Hardware::Ds | Hardware::DsLite => get_nazo_values_ds(ds.version, ds.region),
        Hardware::Dsi | Hardware::Dsi3ds => get_nazo_values_dsi(ds.version, ds.region),
    }
}
```

内部関数 `get_nazo_values_ds` / `get_nazo_values_dsi` で DS 用・DSi 用テーブルをそれぞれ保持する。

## 5. テスト方針

| テスト種別 | 内容 |
|------------|------|
| ユニットテスト | 各 Version × Region × Hardware の組み合わせで正しい値が返ることを検証 |
| 回帰テスト | 既存の DS 用テストが引き続きパスすることを確認 |

## 6. 実装チェックリスト

- [x] `get_nazo_values` の引数を `&DsConfig` に変更
- [x] DSi 用 NAZO 値テーブルを nazo.rs に追加
- [x] `datetime_search::base` の呼び出し箇所を更新
- [x] `gpu::datetime_search::pipeline` の呼び出し箇所を更新
- [x] `core::seed_resolver` の呼び出し箇所を更新
- [x] ユニットテスト追加（DS 回帰 + DSi/3DS 新規）
- [x] clippy / rustfmt 確認
