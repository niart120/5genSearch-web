# API 公開戦略・型正規化 仕様書

## 1. 概要

### 1.1 目的

local_009 で対処しなかったリファクタリング項目を整理し、将来の実装に備える。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| wasm-bindgen | Rust と JavaScript/TypeScript 間のバインディングを生成するツール |
| re-export | 下位モジュールの公開要素を上位モジュールから再公開すること |
| 型正規化 | 重複・類似した型定義を統合し、一貫性を持たせること |

### 1.3 背景・問題

local_009 では緊急度の高い項目（types 分割、公開範囲整理）を対処した。以下の項目は影響範囲が広いため、別途計画する。

- lib.rs の re-export 複雑化
- WASM 公開関数の散在
- 類似型・導出可能型の整理

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| re-export 戦略統一 | 新規型追加時の手順が明確化 |
| WASM API 集約 | 公開 API の把握が容易に |
| 型の正規化 | 重複定義の削減、変換コストの低減 |

### 1.5 着手条件

- local_009 のリファクタリングが完了していること
- 既存テストが全て通過すること

## 2. 対象項目

### 2.1 lib.rs の re-export 戦略

#### 2.1.1 現状

```rust
// lib.rs (65行)
pub use core::sha1::{hash_to_lcg_seed, hash_to_mt_seed, sha1_hash_batch, sha1_hash_single};
pub use datetime_search::{
    MtseedDatetimeResult, MtseedDatetimeSearchBatch, MtseedDatetimeSearchParams,
    MtseedDatetimeSearcher, SearchRangeParams, TimeRangeParams,
};
pub use types::{DatetimeParams, DsConfig, GenerationSource, SearchSegment, VCountTimer0Range};
pub use types::{
    EncounterType, GameStartConfig, GenderRatio, IV_VALUE_UNKNOWN, Ivs, LeadAbilityEffect,
    SaveState, StartMode,
};
// ... 続く
```

#### 2.1.2 問題点

- 新規型追加時に lib.rs の修正が必須
- どの型が WASM 公開されているか把握困難
- re-export 漏れによる TypeScript 側での型欠落リスク

#### 2.1.3 方針案

**案A: モジュール単位の re-export**
```rust
pub use types::*;
pub use datetime_search::*;
pub use generation::*;
pub use misc::*;
```

**案B: 公開専用モジュールの導入**
```rust
// wasm_api/mod.rs に公開 API を集約
pub mod wasm_api;
pub use wasm_api::*;
```

**案C: 現状維持 + ドキュメント整備**
- WASM_API.md に公開 API 一覧を記載

### 2.2 WASM 公開関数の集約

#### 2.2.1 現状の散在状況

| ファイル | 公開関数/型 |
|----------|-------------|
| `lib.rs` | `init`, `health_check` |
| `core/sha1/mod.rs` | `sha1_hash_single`, `sha1_hash_batch`, `hash_to_lcg_seed`, `hash_to_mt_seed` |
| `datetime_search/mtseed.rs` | `MtseedDatetimeSearcher` |
| `misc/mtseed_search.rs` | `MtseedSearcher`, `MtseedSearchBatch` |
| `misc/needle_search.rs` | `NeedleSearcher`, `NeedleSearchBatch` |

#### 2.2.2 問題点

- `#[wasm_bindgen]` 属性が各所に散在
- 公開 API の一覧性がない
- API 命名規則の一貫性が保ちにくい

#### 2.2.3 方針案

**案A: トップレベル集約**
```rust
// lib.rs または wasm_api.rs
#[wasm_bindgen]
pub fn sha1_hash_single(message: Uint32Array) -> Uint32Array {
    core::sha1::sha1_hash_single_impl(message)
}
```

**案B: 現状維持 + 命名規則文書化**
- 各モジュールで `#[wasm_bindgen]` を付与する現行方式を維持
- 命名規則ガイドラインを作成

**案C: wasm-bindgen の skip 属性活用**
- 内部関数には `#[wasm_bindgen(skip)]` を付与
- 公開関数を明示的にマーク

### 2.3 類似型・導出可能型の整理

#### 2.3.1 検知した類似性

| 型A | 型B | 関係 |
|-----|-----|------|
| `RawPokemonData` | `GeneratedPokemonData` | Raw + IV + メタ情報 = Generated |
| `RawEggData` | `GeneratedEggData` | Raw + IV + メタ情報 = Generated |
| `MtseedDatetimeResult` | `GenerationSource::Datetime` | ほぼ同じフィールド |
| `SearchSegment` | `MtseedDatetimeResult` の一部 | timer0, vcount, key_code が重複 |

#### 2.3.2 統合案

**SearchSegment の活用**
```rust
// 現状
pub struct MtseedDatetimeResult {
    pub seed: u32,
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
    pub second: u8,
    pub timer0: u16,
    pub vcount: u8,
    pub key_code: u32,
}

// 統合案
pub struct MtseedDatetimeResult {
    pub seed: MtSeed,
    pub datetime: DatetimeParams,
    pub segment: SearchSegment,
}
```

**GenerationSource への変換ヘルパー**
```rust
impl MtseedDatetimeResult {
    pub fn to_generation_source(&self, base_seed: u64) -> GenerationSource {
        GenerationSource::Datetime {
            base_seed,
            datetime: self.datetime,
            timer0: self.segment.timer0,
            vcount: self.segment.vcount,
            key_code: self.segment.key_code,
        }
    }
}
```

#### 2.3.3 懸念事項

- TypeScript 側での型構造変更による破壊的変更
- ネストした型の serde/tsify 互換性
- パフォーマンスへの影響（コピーコスト）

## 3. 優先度と依存関係

| 項目 | 優先度 | 依存 | 備考 |
|------|--------|------|------|
| lib.rs re-export 戦略 | 中 | local_009 完了 | 案A が最小コスト |
| WASM 関数集約 | 低 | lib.rs 戦略決定後 | 案B で十分な可能性 |
| 類似型整理 | 低 | なし | 破壊的変更のため慎重に |

## 4. 実装順序案

1. lib.rs re-export 戦略の決定と実装
2. WASM API ドキュメント整備
3. 類似型整理（メジャーバージョンアップ時）

## 5. テスト方針

### 5.1 re-export 変更時

- 全 TypeScript 型が維持されることを確認
- `wasm_pkg.d.ts` の差分チェック

### 5.2 型統合時

- 既存テストの書き換え
- TypeScript 側の型互換性テスト
- E2E テストでの動作確認

## 6. 実装チェックリスト

### lib.rs re-export
- [ ] re-export 戦略の決定
- [ ] lib.rs の修正
- [ ] wasm_pkg.d.ts 差分確認

### WASM API ドキュメント
- [ ] 公開 API 一覧の作成
- [ ] 命名規則ガイドラインの作成

### 類似型整理
- [ ] 統合対象型の決定
- [ ] 変換ヘルパーの実装
- [ ] TypeScript 側の対応
- [ ] マイグレーションガイドの作成
