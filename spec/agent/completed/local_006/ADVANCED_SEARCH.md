# 高度な検索機能 仕様書

## 1. 概要

### 1.1 目的

レポート針検索と MT Seed 全探索機能を実装する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| レポート針 | ゲーム内セーブ画面で表示される針の方向 (0-7 の 8 方向) |
| NeedleSearch | レポート針パターンからの消費位置・起動条件検索 |
| MtseedSearch | 指定オフセットで条件を満たす IV が生成される MT Seed を全探索 |
| IvFilter | IV フィルタ条件 (最小値・最大値による範囲指定) |
| IvCode | IV の 30bit 圧縮表現 (各 IV 5bit × 6) |

### 1.3 背景・問題

- local_003-005 で基盤機能が実装済み
- レポート針検索と MT Seed 検索を misc/ に実装
- pokemon-gen5-initseed の既存実装を参照し、互換性を確保

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| レポート針検索 | 観測したレポート針パターンから消費位置または起動条件を特定 |
| MT Seed 全探索 | 指定オフセットで条件を満たす IV が生成される MT Seed を特定 |

### 1.5 着手条件

- local_001-005 が完了

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/lib.rs` | 変更 | misc モジュール追加 |
| `wasm-pkg/src/misc/mod.rs` | 新規 | モジュール宣言 |
| `wasm-pkg/src/misc/needle_search.rs` | 新規 | レポート針検索 |
| `wasm-pkg/src/misc/mtseed_search.rs` | 新規 | MT Seed 全探索 |
| `wasm-pkg/src/generation/algorithm/needle.rs` | 変更 | 計算方法の修正 (pokemon-gen5-initseed 準拠) |

## 3. 設計方針

### 3.1 モジュール構成

```
wasm-pkg/src/
├── lib.rs              # misc モジュール追加
└── misc/
    ├── mod.rs          # re-export
    ├── needle_search.rs # レポート針検索
    └── mtseed_search.rs # MT Seed 全探索
```

### 3.2 依存関係

```
types/ + core/ + generation/algorithm/
           ↓
misc/needle_search.rs   ← generation/algorithm/needle.rs を活用
misc/mtseed_search.rs   ← generation/algorithm/iv.rs を活用
```

### 3.3 レポート針検索の設計

#### 3.3.1 統合設計

入力ソースを enum で表現し、1 つの `NeedleSearcher` で両パターンを処理する。

```rust
/// 検索入力ソース
pub enum NeedleSearchInput {
    /// 既知 Seed から検索 (消費位置特定)
    Seed { initial_seed: LcgSeed },
    /// 起動条件から検索 (Timer0/VCount 範囲探索)
    Startup {
        ds: DsConfig,
        datetime: DatetimeParams,
        timer0_range: (u16, u16),
        vcount_range: (u8, u8),
        key_code: u32,
    },
}
```

| 入力 | 検索空間 | 用途 |
|------|----------|------|
| `Seed` | 消費位置 (advance_min..advance_max) | 既知 Seed からの消費位置特定 |
| `Startup` | Timer0 × VCount × 消費位置 | 起動条件の検証・特定 |

#### 3.3.2 Startup 入力時の処理フロー

既存の `datetime_search` 基盤を活用し、SHA-1 計算 → LCG Seed 導出 → 針パターン照合 の流れで実装する。

```
起動条件 (DateTime + Timer0 + VCount + KeyCode)
    │
    └─ Timer0 × VCount 範囲を列挙
           │
           └─ 各組み合わせで SHA-1 計算 → LCG Seed
                  │
                  └─ 消費範囲内で針パターン照合
```

**結果情報**: 検索結果には `GenerationSource` を保持し、後続の個体生成に活用できるようにする。

- `Seed` 入力時: `GenerationSource::Fixed { base_seed }`
- `Startup` 入力時: `GenerationSource::Datetime { base_seed, datetime, timer0, vcount, key_code }`

#### 3.3.3 針方向計算の修正

**重要**: 現行の `generation/algorithm/needle.rs` の計算方法は pokemon-gen5-initseed と異なる。

| 実装 | 計算方法 |
|------|----------|
| 現行 | `(seed >> 32) >> 29` (上位3bit) |
| pokemon-gen5-initseed | `((next_seed >> 32) * 8) >> 32` (1回進めた後の上位32bit × 8 >> 32) |

pokemon-gen5-initseed の方式に統一する必要がある。

```rust
/// レポート針方向を計算 (0-7)
///
/// pokemon-gen5-initseed 準拠: Seed を 1 回進めた後の上位 32bit を使用
pub fn calc_report_needle_direction(seed: LcgSeed) -> NeedleDirection {
    let next = Lcg64::compute_next(seed);
    let upper = next.value() >> 32;
    let dir = (upper.wrapping_mul(8)) >> 32;
    NeedleDirection::from_value((dir & 7) as u8)
}
```

#### 3.3.4 既存実装の活用

- 針方向計算: `generation/algorithm/needle::calc_report_needle_direction(LcgSeed)` (修正後)
- LCG 操作: `core/lcg::Lcg64`
- 型定義: `types::LcgSeed`, `types::NeedleDirection`

### 3.4 MT Seed 全探索の設計

#### 3.4.1 機能概要

指定したオフセットから検索条件 (IV フィルタ) を満たす個体値が生成される MT Seed を全探索する。

```
MT Seed 空間 (0x00000000 - 0xFFFFFFFF)
    │
    └─ 各 Seed に対して:
        1. MT19937 を初期化
        2. 指定オフセット分スキップ
        3. IV を生成
        4. IV フィルタ条件と照合
        5. 一致すれば候補として記録
```

#### 3.4.2 IvCode 圧縮表現

pokemon-gen5-initseed では IV を 30bit に圧縮した `IvCode` を使用している。フィルタ条件の高速照合に有効。

```rust
/// IvCode: IV の 30bit 圧縮表現
/// 配置: [HP:5bit][Atk:5bit][Def:5bit][SpA:5bit][SpD:5bit][Spe:5bit]
pub type IvCode = u32;

/// IV セットを IvCode にエンコード
pub fn encode_iv_code(ivs: &[u8; 6]) -> IvCode {
    (u32::from(ivs[0]) << 25)
        | (u32::from(ivs[1]) << 20)
        | (u32::from(ivs[2]) << 15)
        | (u32::from(ivs[3]) << 10)
        | (u32::from(ivs[4]) << 5)
        | u32::from(ivs[5])
}

/// IvCode を IV セットにデコード
pub fn decode_iv_code(code: IvCode) -> [u8; 6] {
    [
        ((code >> 25) & 0x1F) as u8,
        ((code >> 20) & 0x1F) as u8,
        ((code >> 15) & 0x1F) as u8,
        ((code >> 10) & 0x1F) as u8,
        ((code >> 5) & 0x1F) as u8,
        (code & 0x1F) as u8,
    ]
}
```

#### 3.4.3 IV フィルタ条件

```rust
/// IV フィルタ条件
pub struct IvFilter {
    pub hp:  (u8, u8),  // (min, max)
    pub atk: (u8, u8),
    pub def: (u8, u8),
    pub spa: (u8, u8),
    pub spd: (u8, u8),
    pub spe: (u8, u8),
}
```

#### 3.4.4 徘徊ポケモン対応

徘徊ポケモンの IV は取得順序が通常と異なる。

| ステータス | 通常順序 | 徘徊順序 |
|-----------|---------|---------|
| HP | 1 | 1 |
| Atk | 2 | 2 |
| Def | 3 | 3 |
| SpA | 4 | **6** |
| SpD | 5 | **4** |
| Spe | 6 | **5** |

**HABCDS → HABDSC への順序変換**が必要。pokemon-gen5-initseed の `reorder_for_roamer` に準拠。

```rust
/// 徘徊ポケモン用 IV 生成 (HABDSC 順序)
///
/// MT19937 の最初の 7 回を破棄後、HABDSC 順で 6 回取得し、標準順 (HABCDS) に並び替え。
pub fn generate_roamer_ivs(seed: MtSeed) -> Ivs {
    let mut mt = Mt19937::new(seed);

    // 最初の 7 回を破棄
    for _ in 0..7 {
        mt.next_u32();
    }

    // HABDSC 順で取得
    let hp = extract_iv(mt.next_u32());   // H
    let atk = extract_iv(mt.next_u32());  // A
    let def = extract_iv(mt.next_u32());  // B
    let spd = extract_iv(mt.next_u32());  // D (SpD)
    let spe = extract_iv(mt.next_u32());  // S (Spe)
    let spa = extract_iv(mt.next_u32());  // C (SpA)

    // 標準順 (HABCDS) で返却
    Ivs::new(hp, atk, def, spa, spd, spe)
}
```

**IvCode の順序変換** (検索用):

```rust
/// 徘徊ポケモン用 IvCode 順序変換
///
/// 検索対象の IvCode を徘徊順序に変換する。
/// 通常: HABCDS (HP, Atk, Def, SpA, SpD, Spe)
/// 徘徊: HABDSC (HP, Atk, Def, SpD, Spe, SpA)
pub fn reorder_iv_code_for_roamer(iv_code: IvCode) -> IvCode {
    let hp  = (iv_code >> 25) & 0x1F;
    let atk = (iv_code >> 20) & 0x1F;
    let def = (iv_code >> 15) & 0x1F;
    let spa = (iv_code >> 10) & 0x1F;
    let spd = (iv_code >> 5) & 0x1F;
    let spe = iv_code & 0x1F;

    // HABDSC 順で再配置
    (hp << 25) | (atk << 20) | (def << 15) | (spe << 10) | (spa << 5) | spd
}
```

**注意**: MT Seed 全探索では徘徊モードをフラグで指定し、IvCode 変換または IV 生成関数を切り替える。

#### 3.4.5 既存実装の活用

- IV 生成: `generation/algorithm/iv::generate_rng_ivs_with_offset(MtSeed, offset)`
- MT 操作: `core/mt::Mt19937`
- 型定義: `types::MtSeed`, `types::Ivs`

## 4. 実装仕様

### 4.1 generation/algorithm/needle.rs の修正

```rust
//! 針方向計算アルゴリズム

use crate::core::lcg::Lcg64;
use crate::types::{LcgSeed, NeedleDirection};

/// レポート針方向を計算 (0-7)
///
/// pokemon-gen5-initseed 準拠:
/// - Seed を 1 回進めた後の上位 32bit を使用
/// - `((upper >> 32) * 8) >> 32` で 0-7 に変換
pub fn calc_report_needle_direction(seed: LcgSeed) -> NeedleDirection {
    let next = Lcg64::compute_next(seed);
    let upper = (next.value() >> 32) as u64;
    let dir = (upper.wrapping_mul(8)) >> 32;
    NeedleDirection::from_value((dir & 7) as u8)
}

/// 旧実装 (互換性のため残す、非推奨)
#[deprecated(note = "Use calc_report_needle_direction instead")]
pub fn calculate_needle_direction(seed: LcgSeed) -> NeedleDirection {
    let value = seed.value();
    let upper32 = (value >> 32) as u32;
    let direction = (upper32 >> 29) as u8;
    NeedleDirection::from_value(direction)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calc_report_needle_direction() {
        // pokemon-gen5-initseed のテストケースを移植
        let seed = LcgSeed::new(0xE295B27C208D2A98);
        assert_eq!(calc_report_needle_direction(seed).value(), 7);

        let seed = LcgSeed::new(0x1AC6A030ADCBC4BB);
        assert_eq!(calc_report_needle_direction(seed).value(), 0);

        let seed = LcgSeed::new(0x8B3C1E8EE2F04F8A);
        assert_eq!(calc_report_needle_direction(seed).value(), 4);
    }
}
```

### 4.2 misc/needle_search.rs

参照: [mig_002/misc/needle-search.md](../mig_002/misc/needle-search.md)

```rust
//! レポート針検索
//!
//! 観測したレポート針パターンから消費位置を特定する機能。
//! 入力ソースとして LcgSeed 直接指定と起動条件指定の両方に対応。

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::core::lcg::Lcg64;
use crate::core::sha1::{hash_to_lcg_seed, Sha1Message};
use crate::generation::algorithm::calc_report_needle_direction;
use crate::types::{DatetimeParams, DsConfig, GenerationSource, LcgSeed};

/// レポート針パターン (0-7 の方向値列)
pub type NeedlePattern = Vec<u8>;

// ===== 検索入力ソース =====

/// 検索入力ソース
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(tag = "type")]
pub enum NeedleSearchInput {
    /// 既知 Seed から検索 (消費位置特定)
    Seed {
        initial_seed: LcgSeed,
    },
    /// 起動条件から検索 (Timer0/VCount 範囲探索)
    Startup {
        ds: DsConfig,
        datetime: DatetimeParams,
        timer0_min: u16,
        timer0_max: u16,
        vcount_min: u8,
        vcount_max: u8,
        key_code: u32,
    },
}

// ===== 検索パラメータ =====

/// レポート針検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchParams {
    /// 入力ソース (Seed または Startup)
    pub input: NeedleSearchInput,
    /// 観測したレポート針パターン (0-7)
    pub pattern: NeedlePattern,
    /// 検索開始消費位置
    pub advance_min: u32,
    /// 検索終了消費位置
    pub advance_max: u32,
}

// ===== 検索結果 =====

/// レポート針検索結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchResult {
    /// パターン開始消費位置
    pub advance: u32,
    /// 生成元情報
    pub source: GenerationSource,
}

/// レポート針検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchBatch {
    pub results: Vec<NeedleSearchResult>,
    pub processed: u64,
    pub total: u64,
}

// ===== 検索器 =====

/// レポート針検索器
#[wasm_bindgen]
pub struct NeedleSearcher {
    // 共通フィールド
    pattern: NeedlePattern,
    advance_min: u32,
    advance_max: u32,
    // 状態
    state: SearcherState,
}

/// 内部検索状態
enum SearcherState {
    /// Seed 入力モード
    Seed {
        lcg: Lcg64,
        current_advance: u32,
        base_seed: u64,
    },
    /// Startup 入力モード
    Startup {
        ds: DsConfig,
        datetime: DatetimeParams,
        timer0_min: u16,
        timer0_max: u16,
        vcount_min: u8,
        vcount_max: u8,
        key_code: u32,
        // 現在の探索位置
        current_timer0: u16,
        current_vcount: u8,
        current_advance: u32,
        // キャッシュ: 現在の (timer0, vcount) に対応する LCG
        current_lcg: Option<Lcg64>,
        current_base_seed: u64,
    },
}
```

**Seed 入力時の処理**:

```rust
impl NeedleSearcher {
    fn next_batch_seed(&mut self, chunk_size: u32) -> NeedleSearchBatch {
        // 既存実装と同様: lcg を進めながらパターン照合
        // 結果には GenerationSource::Fixed { base_seed } を設定
    }
}
```

**Startup 入力時の処理**:

```

// ===== ユーティリティ関数 =====

/// 指定 Seed から針パターンを取得
#[wasm_bindgen]
pub fn get_needle_pattern(seed: LcgSeed, length: u32) -> Vec<u8> {
    let mut pattern = Vec::with_capacity(length as usize);
    let mut current_seed = seed;

    for _ in 0..length {
        let direction = calc_report_needle_direction(current_seed);
        pattern.push(direction.value());
        current_seed = Lcg64::compute_next(current_seed);
    }

    pattern
}

/// 針方向を矢印文字に変換
pub fn needle_direction_arrow(direction: u8) -> &'static str {
    match direction & 7 {
        0 => "↑",
        1 => "↗",
        2 => "→",
        3 => "↘",
        4 => "↓",
        5 => "↙",
        6 => "←",
        7 => "↖",
        _ => "?",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_needle_pattern() {
        let seed = LcgSeed::new(0x0123456789ABCDEF);
        let pattern = get_needle_pattern(seed, 5);
        assert_eq!(pattern.len(), 5);
        assert!(pattern.iter().all(|&d| d <= 7));
    }

    #[test]
    fn test_needle_searcher_seed_input() {
        let seed = LcgSeed::new(0x0123456789ABCDEF);
        let pattern = get_needle_pattern(seed, 3);

        let params = NeedleSearchParams {
            input: NeedleSearchInput::Seed { initial_seed: seed },
            pattern,
            advance_min: 0,
            advance_max: 10,
        };

        let mut searcher = NeedleSearcher::new(params).unwrap();
        let batch = searcher.next_batch(100);

        // 先頭位置で一致するはず
        assert!(!batch.results.is_empty());
        assert_eq!(batch.results[0].advance, 0);
        // GenerationSource::Fixed であること
        assert!(matches!(batch.results[0].source, GenerationSource::Fixed { .. }));
    }
}
```

### 4.3 misc/mod.rs

```rust
//! 雑多なユーティリティ

pub mod mtseed_search;
pub mod needle_search;

pub use mtseed_search::{
    decode_iv_code, encode_iv_code, IvCode, IvFilter, MtseedResult, MtseedSearchBatch,
    MtseedSearcher, MtseedSearchParams, reorder_iv_code_for_roamer,
};
pub use needle_search::{
    get_needle_pattern, needle_direction_arrow, NeedlePattern, NeedleSearchBatch,
    NeedleSearcher, NeedleSearchInput, NeedleSearchParams, NeedleSearchResult,
};
```

### 4.4 misc/mtseed_search.rs

参照: [mig_002/seed-search/mtseed.md](../mig_002/seed-search/mtseed.md)

**機能**: 指定オフセットで IV フィルタ条件を満たす MT Seed を全探索する。

```rust
//! MT Seed 全探索
//!
//! 指定オフセットから検索条件を満たす IV が生成される MT Seed を全探索する機能。
//! pokemon-gen5-initseed の実装を参照。

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::generation::algorithm::generate_rng_ivs_with_offset;
use crate::types::{Ivs, MtSeed};

// ===== IvCode (30bit 圧縮表現) =====

/// IvCode: IV の 30bit 圧縮表現
/// 配置: [HP:5bit][Atk:5bit][Def:5bit][SpA:5bit][SpD:5bit][Spe:5bit]
pub type IvCode = u32;

/// IV セットを IvCode にエンコード
#[inline]
pub fn encode_iv_code(ivs: &[u8; 6]) -> IvCode {
    (u32::from(ivs[0]) << 25)
        | (u32::from(ivs[1]) << 20)
        | (u32::from(ivs[2]) << 15)
        | (u32::from(ivs[3]) << 10)
        | (u32::from(ivs[4]) << 5)
        | u32::from(ivs[5])
}

/// IvCode を IV セットにデコード
#[inline]
pub fn decode_iv_code(code: IvCode) -> [u8; 6] {
    [
        ((code >> 25) & 0x1F) as u8,
        ((code >> 20) & 0x1F) as u8,
        ((code >> 15) & 0x1F) as u8,
        ((code >> 10) & 0x1F) as u8,
        ((code >> 5) & 0x1F) as u8,
        (code & 0x1F) as u8,
    ]
}

/// Ivs を配列に変換
fn ivs_to_array(ivs: &Ivs) -> [u8; 6] {
    [ivs.hp, ivs.atk, ivs.def, ivs.spa, ivs.spd, ivs.spe]
}

// ===== IV フィルタ =====

/// IV フィルタ条件
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct IvFilter {
    /// HP (min, max)
    pub hp: (u8, u8),
    /// 攻撃 (min, max)
    pub atk: (u8, u8),
    /// 防御 (min, max)
    pub def: (u8, u8),
    /// 特攻 (min, max)
    pub spa: (u8, u8),
    /// 特防 (min, max)
    pub spd: (u8, u8),
    /// 素早さ (min, max)
    pub spe: (u8, u8),
}

impl IvFilter {
    /// 全範囲 (0-31) を許容するフィルタ
    pub const fn any() -> Self {
        Self {
            hp: (0, 31),
            atk: (0, 31),
            def: (0, 31),
            spa: (0, 31),
            spd: (0, 31),
            spe: (0, 31),
        }
    }

    /// 指定 IV が条件を満たすか判定
    #[inline]
    pub fn matches(&self, ivs: &Ivs) -> bool {
        ivs.hp >= self.hp.0
            && ivs.hp <= self.hp.1
            && ivs.atk >= self.atk.0
            && ivs.atk <= self.atk.1
            && ivs.def >= self.def.0
            && ivs.def <= self.def.1
            && ivs.spa >= self.spa.0
            && ivs.spa <= self.spa.1
            && ivs.spd >= self.spd.0
            && ivs.spd <= self.spd.1
            && ivs.spe >= self.spe.0
            && ivs.spe <= self.spe.1
    }
}

/// MT Seed 検索パラメータ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedSearchParams {
    /// IV フィルタ条件
    pub iv_filter: IvFilter,
    /// MT オフセット (IV 生成開始位置、通常 7)
    pub mt_offset: u32,
    /// 徘徊ポケモンモード
    pub is_roamer: bool,
}

/// MT Seed 検索結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedResult {
    /// 一致した MT Seed
    pub seed: MtSeed,
    /// 生成された IV
    pub ivs: Ivs,
    /// IvCode
    pub iv_code: IvCode,
}

/// MT Seed 検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedSearchBatch {
    /// 条件を満たした候補
    pub candidates: Vec<MtseedResult>,
    /// 処理済み Seed 数
    pub processed: u64,
    /// 総 Seed 数 (0x100000000)
    pub total: u64,
}

/// MT Seed 検索器
#[wasm_bindgen]
pub struct MtseedSearcher {
    iv_filter: IvFilter,
    mt_offset: u32,
    is_roamer: bool,
    current_seed: u64,
}

const TOTAL_SEEDS: u64 = 0x100000000;

#[wasm_bindgen]
impl MtseedSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new(params: MtseedSearchParams) -> MtseedSearcher {
        Self {
            iv_filter: params.iv_filter,
            mt_offset: params.mt_offset,
            is_roamer: params.is_roamer,
            current_seed: 0,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.current_seed >= TOTAL_SEEDS
    }

    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64 {
        self.current_seed as f64 / TOTAL_SEEDS as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_size: u32) -> MtseedSearchBatch {
        let mut candidates = Vec::new();
        let end_seed = (self.current_seed + chunk_size as u64).min(TOTAL_SEEDS);

        while self.current_seed < end_seed {
            let seed = MtSeed::new(self.current_seed as u32);
            
            // 徘徊ポケモンモード時は専用関数、通常は汎用関数
            let ivs = if self.is_roamer {
                generate_roamer_ivs(seed)
            } else {
                generate_rng_ivs_with_offset(seed, self.mt_offset)
            };

            if self.iv_filter.matches(&ivs) {
                let iv_code = encode_iv_code(&ivs_to_array(&ivs));
                candidates.push(MtseedResult {
                    seed,
                    ivs,
                    iv_code,
                });
            }

            self.current_seed += 1;
        }

        MtseedSearchBatch {
            candidates,
            processed: self.current_seed,
            total: TOTAL_SEEDS,
        }
    }
}

// ===== WASM エクスポート関数 =====

/// IvCode エンコード (WASM 公開)
#[wasm_bindgen]
pub fn encode_iv_code_wasm(ivs: &[u8]) -> Result<IvCode, String> {
    if ivs.len() != 6 {
        return Err("ivs must have exactly 6 elements".into());
    }
    let arr: [u8; 6] = ivs.try_into().unwrap();
    Ok(encode_iv_code(&arr))
}

/// IvCode デコード (WASM 公開)
#[wasm_bindgen]
pub fn decode_iv_code_wasm(code: IvCode) -> Vec<u8> {
    decode_iv_code(code).to_vec()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_decode_iv_code() {
        let ivs = [31, 30, 29, 28, 27, 26];
        let code = encode_iv_code(&ivs);
        let decoded = decode_iv_code(code);
        assert_eq!(ivs, decoded);
    }

    #[test]
    fn test_iv_filter_matches() {
        let filter = IvFilter {
            hp: (31, 31),
            atk: (0, 31),
            def: (0, 31),
            spa: (0, 31),
            spd: (0, 31),
            spe: (31, 31),
        };

        let ivs_match = Ivs::new(31, 15, 20, 10, 25, 31);
        let ivs_no_match = Ivs::new(30, 15, 20, 10, 25, 31);

        assert!(filter.matches(&ivs_match));
        assert!(!filter.matches(&ivs_no_match));
    }

    #[test]
    fn test_mtseed_searcher() {
        let params = MtseedSearchParams {
            iv_filter: IvFilter::any(),
            mt_offset: 7,
            is_roamer: false,
        };

        let mut searcher = MtseedSearcher::new(params);
        let batch = searcher.next_batch(100);

        // 全範囲フィルタなので 100 件すべて一致
        assert_eq!(batch.candidates.len(), 100);
        assert_eq!(batch.processed, 100);
    }

    #[test]
    fn test_roamer_iv_filter() {
        // 徘徊ポケモンは HABDSC 順で IV を取得
        // 6V 検索: 通常と同じ 6 個の IV が決定される (順序のみ異なる)
        let filter = IvFilter {
            hp: (31, 31),
            atk: (31, 31),
            def: (31, 31),
            spa: (31, 31),
            spd: (31, 31),
            spe: (31, 31),
        };

        let params = MtseedSearchParams {
            iv_filter: filter,
            mt_offset: 7,  // 無視される
            is_roamer: true,
        };

        let mut searcher = MtseedSearcher::new(params);
        let batch = searcher.next_batch(100000);

        // 6V の候補が見つかるはず (HABDSC 順序で取得されるが、標準順 HABCDS に並び替えて返却)
        assert!(batch.candidates.iter().all(|c| {
            c.ivs.hp == 31 && c.ivs.atk == 31 &&
            c.ivs.def == 31 && c.ivs.spa == 31 &&
            c.ivs.spd == 31 && c.ivs.spe == 31
        }));
    }
}
```

### 4.5 lib.rs の更新

```rust
// 既存のモジュール宣言に追加
pub mod misc;

// re-export
pub use misc::{
    // MT Seed 検索
    decode_iv_code_wasm, encode_iv_code_wasm, IvCode, IvFilter, MtseedResult, MtseedSearchBatch,
    MtseedSearcher, MtseedSearchParams,
    // レポート針検索
    get_needle_pattern, NeedlePattern, NeedleSearchBatch, NeedleSearcher, NeedleSearchParams,
    NeedleSearchResult,
};
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | テスト内容 |
|-----------|-----------|
| `needle.rs` | 針方向計算 (pokemon-gen5-initseed 互換性確認) |
| `needle_search.rs` | パターン一致検出、既知 Seed での針パターン取得 |
| `mtseed_search.rs` | IvCode エンコード/デコード、IvFilter 判定、徘徊ポケモン IV 生成 |

### 5.2 統合テスト

| テスト対象 | テスト内容 |
|-----------|-----------|
| NeedleSearcher | 既知パターンでの検索一致確認 |
| MtseedSearcher | 特定 IV 条件での候補絞り込み確認、徘徊モードでの HP/Atk のみ検索確認 |

### 5.3 コマンド

```powershell
cd wasm-pkg
cargo test
wasm-pack build --target web
```

## 6. 実装チェックリスト

- [ ] `wasm-pkg/src/generation/algorithm/needle.rs` 修正
  - [ ] `calc_report_needle_direction` 追加 (pokemon-gen5-initseed 準拠)
  - [ ] 旧実装を deprecated 化
  - [ ] ユニットテスト
- [ ] `wasm-pkg/src/misc/mod.rs` 作成
- [ ] `wasm-pkg/src/misc/needle_search.rs` 作成
  - [ ] NeedleSearchParams (InitialSeed モード)
  - [ ] NeedleSearcher
  - [ ] NeedleStartupSearchParams/Result (Startup モード型定義、GenerationSource 相当の情報保持)
  - [ ] get_needle_pattern
  - [ ] needle_direction_arrow
  - [ ] ユニットテスト
- [ ] `wasm-pkg/src/misc/mtseed_search.rs` 作成
  - [ ] IvCode エンコード/デコード
  - [ ] IvFilter
  - [ ] MtseedSearchParams (is_roamer フラグ)
  - [ ] MtseedSearcher (徘徊モード時は generate_roamer_ivs 使用)
  - [ ] WASM エクスポート関数
  - [ ] ユニットテスト
- [ ] `wasm-pkg/src/lib.rs` 更新
- [ ] `cargo test` パス確認
- [ ] `wasm-pack build --target web` 成功確認

## 7. pokemon-gen5-initseed との差異・互換性

### 7.1 針方向計算

| 項目 | pokemon-gen5-initseed | 本実装 |
|------|----------------------|--------|
| 計算方法 | `((next_seed >> 32) * 8) >> 32` | 同左に修正 |
| 関数名 | `calc_report_needle_direction` | `calc_report_needle_direction` |

### 7.2 MT Seed 検索

| 項目 | pokemon-gen5-initseed | 本実装 |
|------|----------------------|--------|
| IvCode 形式 | 30bit 圧縮 | 同左 |
| 徘徊モード | HP/Atk のみ乱数、他は 0 固定 | 同左 (既存 `generate_roamer_ivs` を使用) |
| SIMD 最適化 | あり (Mt19937x4) | 将来対応 (local_007 以降) |
| GPU 対応 | あり (WebGPU) | 将来対応 (local_007) |
