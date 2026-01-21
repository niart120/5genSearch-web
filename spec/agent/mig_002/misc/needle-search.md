# レポート針検索 (Needle Search) 仕様書

観測した針の並び順から起動条件・消費数を逆算する機能の仕様。

## 1. 概要

### 1.1 機能概要

ゲーム内セーブ画面で観測できる「レポート針」の並びパターンを入力し、その並びに一致する起動条件（Boot-Timing）または消費位置を検索する。

### 1.2 ユースケース

1. **起動確認**: 狙った起動条件で起動できたかを、針の並びで検証
2. **消費位置特定**: 現在の乱数消費位置を、連続する針観測から特定
3. **Timer0/VCount 特定**: 複数の候補から実際の Timer0/VCount を針パターンで絞り込み

### 1.3 検索モード

| モード | 入力 | 用途 |
|--------|------|------|
| `startup` | 起動日時 + Timer0/VCount 範囲 | 起動条件の検証・特定 |
| `initial-seed` | LCG Seed (hex) | 既知 Seed からの消費位置特定 |

## 2. 入力型

### 2.1 NeedleSearchMode

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum NeedleSearchMode {
    /// 起動条件から検索
    Startup,
    /// LCG Seed から検索
    InitialSeed,
}
```

### 2.2 NeedlePattern

針の並びパターン。

```rust
/// 針方向の列 (0-7 の値)
/// 例: [0, 4, 2, 5] = ↑↓→↙
pub type NeedlePattern = Vec<u8>;
```

### 2.3 NeedleSearchRequest (Startup モード)

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchStartupRequest {
    /// 針パターン
    pub pattern: NeedlePattern,
    /// DS 設定
    pub ds_config: DsConfig,
    /// 起動日時
    pub datetime: DatetimeParams,
    /// Timer0 範囲
    pub timer0_range: RangeU16,
    /// VCount 範囲
    pub vcount_range: RangeU8,
    /// キー入力マスク
    pub key_mask: u32,
    /// 消費数検索範囲
    pub advance_range: AdvanceRange,
}

#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct RangeU16 {
    pub min: u16,
    pub max: u16,
}

#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct RangeU8 {
    pub min: u8,
    pub max: u8,
}
```

### 2.4 NeedleSearchRequest (InitialSeed モード)

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchSeedRequest {
    /// 針パターン
    pub pattern: NeedlePattern,
    /// 初期 LCG Seed
    pub initial_seed: LcgSeed,
    /// Timer0 範囲 (結果表示用、Seed モードでは単一値)
    pub timer0_range: RangeU16,
    /// VCount 範囲 (結果表示用、Seed モードでは単一値)
    pub vcount_range: RangeU8,
    /// 消費数検索範囲
    pub advance_range: AdvanceRange,
}
```

## 3. 出力型

### 3.1 NeedleSearchResult

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchResult {
    /// パターン開始消費数
    pub consumption_index: u64,
    /// Timer0 値
    pub timer0: u16,
    /// VCount 値
    pub vcount: u8,
    /// 初期 Seed (hex)
    pub initial_seed_hex: String,
    /// パターン開始時点の Seed (hex)
    pub current_seed_hex: String,
}
```

### 3.2 NeedleSearchResults

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct NeedleSearchResults {
    pub results: Vec<NeedleSearchResult>,
    pub processed_count: u64,
    pub total_count: u64,
}
```

## 4. 検索アルゴリズム

### 4.1 基本フロー

```
1. 初期 Seed を決定
   - Startup モード: 日時 + Timer0 + VCount + KeyCode から SHA-1 計算
   - InitialSeed モード: 入力 Seed をそのまま使用

2. advance_range.min まで LCG を進める

3. advance_range.min から advance_range.max まで:
   a. 現在位置から pattern.len() 個の針方向を計算
   b. pattern と一致するか判定
   c. 一致すれば結果に追加
   d. LCG を 1 回進める
```

### 4.2 針方向計算

```rust
fn calculate_needle_sequence(seed: u64, count: usize) -> Vec<u8> {
    let mut result = Vec::with_capacity(count);
    let mut current = seed;
    
    for _ in 0..count {
        result.push(NeedleDirection::from_seed(current) as u8);
        current = lcg_next(current);
    }
    
    result
}
```

### 4.3 パターンマッチング

```rust
fn matches_pattern(seed: u64, pattern: &[u8]) -> bool {
    let mut current = seed;
    
    for &expected in pattern {
        let actual = NeedleDirection::from_seed(current) as u8;
        if actual != expected {
            return false;
        }
        current = lcg_next(current);
    }
    
    true
}
```

## 5. Startup モードの探索空間

### 5.1 セグメント構成

Startup モードでは以下の直積を探索:

```
探索空間 = Timer0範囲 × VCount範囲 × KeyCode候補
```

### 5.2 KeyCode 列挙

`key_mask` から有効なキー組み合わせを列挙:

```rust
fn enumerate_key_codes(mask: u32) -> Vec<u32> {
    // mask のビットが立っている位置のべき集合を列挙
    // 例: mask = 0b0011 → [0b0000, 0b0001, 0b0010, 0b0011]
}
```

## 6. WASM API

### 6.1 イテレータ API

```rust
#[wasm_bindgen]
pub struct NeedleSearchIterator {
    // 内部状態
}

#[wasm_bindgen]
impl NeedleSearchIterator {
    #[wasm_bindgen(constructor)]
    pub fn new_startup(request: NeedleSearchStartupRequest) -> Result<Self, String>;
    
    #[wasm_bindgen(constructor)]
    pub fn new_seed(request: NeedleSearchSeedRequest) -> Result<Self, String>;
    
    /// 次のバッチを処理
    pub fn next_batch(&mut self, batch_size: u32) -> NeedleSearchResults;
    
    /// 検索完了判定
    pub fn is_exhausted(&self) -> bool;
    
    /// 進捗取得
    pub fn progress(&self) -> f64;
}
```

## 7. UI 連携

### 7.1 針入力 UI

- 0-7 のボタンで針方向を入力
- 入力した針は並び順で表示 (例: "0425" = ↑↓→↙)
- バックスペースで末尾削除

### 7.2 結果表示

| カラム | 内容 |
|--------|------|
| Position | パターン開始消費数 |
| Timer0 | Timer0 値 (hex) |
| VCount | VCount 値 (hex) |
| Initial Seed | 初期 Seed (hex) |
| Current Seed | パターン開始時点の Seed (hex) |

## 8. 関連ドキュメント

- [共通型定義](../common/types.md) - `NeedleDirection`, `DsConfig`
- [datetime-search/base.md](../datetime-search/base.md) - SHA-1 計算、起動条件
- [generation/data-structures.md](../generation/data-structures.md) - `AdvanceRange`
