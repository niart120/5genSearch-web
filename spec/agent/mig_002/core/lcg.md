# 計算コア: LCG (64bit 線形合同法)

BW/BW2 で使用される 64bit 線形合同法乱数生成器の仕様。

## 1. 概要

### 1.1 アルゴリズム

Gen5 (BW/BW2) の性格値・エンカウント判定等に使用される PRNG。

```
S[n+1] = S[n] × 0x5D588B656C078965 + 0x269EC3
```

| 項目 | 値 |
|------|-----|
| 状態 | 64bit |
| 出力 | 上位 32bit (`S >> 32`) |
| 乗数 (multiplier) | `0x5D588B656C078965` |
| 加算定数 (increment) | `0x269EC3` |

### 1.2 用途

| 用途 | 説明 |
|------|------|
| 性格決定 | `(rand * 25) >> 32` |
| シンクロ判定 | `(rand * 2) >> 32 == 0` |
| エンカウントスロット | `(rand * n) >> 32` |
| PID 生成 | 複数回の `next()` を組み合わせ |
| レポート針方向 | `((S >> 32) * 8) >> 32` |

## 2. 定数

```rust
/// 乗数: 0x5D588B656C078965
pub const LCG_MULTIPLIER: u64 = 0x5D588B656C078965;

/// 加算定数: 0x269EC3
pub const LCG_INCREMENT: u64 = 0x269EC3;
```

## 3. 構造体

### 3.1 Lcg64

64bit LCG 乱数生成器。

```rust
use crate::common::types::LcgSeed;

/// 64bit 線形合同法乱数生成器
#[derive(Debug, Clone, Copy)]
pub struct Lcg64 {
    seed: LcgSeed,
}
```

**設計意図**:
- 状態は `LcgSeed` (NewType over u64)
- Copy trait により値渡し可能
- 型安全性により MtSeed との混同を防止
- `wasm_bindgen` はオプショナル (内部利用メイン)

## 4. メソッド

### 4.1 コンストラクタ

```rust
impl Lcg64 {
    /// 新しい LCG インスタンスを作成
    #[inline]
    pub fn new(seed: LcgSeed) -> Self {
        Self { seed }
    }

    /// u64 から直接作成 (内部利用)
    #[inline]
    pub fn from_raw(seed: u64) -> Self {
        Self { seed: LcgSeed::new(seed) }
    }
}
```

### 4.2 乱数生成

```rust
impl Lcg64 {
    /// 次の 32bit 乱数値を取得 (上位 32bit)
    #[inline]
    pub fn next(&mut self) -> u32 {
        let raw = self.seed.value()
            .wrapping_mul(LCG_MULTIPLIER)
            .wrapping_add(LCG_INCREMENT);
        self.seed = LcgSeed::new(raw);
        (raw >> 32) as u32
    }

    /// 次の LcgSeed を取得 (内部状態を進めて返す)
    #[inline]
    pub fn next_seed(&mut self) -> LcgSeed {
        let raw = self.seed.value()
            .wrapping_mul(LCG_MULTIPLIER)
            .wrapping_add(LCG_INCREMENT);
        self.seed = LcgSeed::new(raw);
        self.seed
    }

    /// 現在の Seed 値を取得
    #[inline]
    pub fn current_seed(&self) -> LcgSeed {
        self.seed
    }

    /// Seed 値を設定
    #[inline]
    pub fn set_seed(&mut self, seed: LcgSeed) {
        self.seed = seed;
    }
}
```

### 4.3 進行・リセット

```rust
impl Lcg64 {
    /// 指定回数だけ乱数を進める
    pub fn advance(&mut self, advances: u32) {
        for _ in 0..advances {
            self.next();
        }
    }

    /// 高速スキップ (O(log n))
    /// 大量の advance に適用
    pub fn skip(&mut self, steps: u64) {
        let (mul, add) = Self::affine_for_steps(steps);
        let raw = Self::apply_raw(self.seed.value(), mul, add);
        self.seed = LcgSeed::new(raw);
    }

    /// Seed をリセット
    #[inline]
    pub fn reset(&mut self, seed: LcgSeed) {
        self.seed = seed;
    }
}
```

## 5. スタティック関数

### 5.1 純関数版 Seed 進行

状態を持たない純関数として Seed 計算を行う。

```rust
impl Lcg64 {
    /// 1 ステップ進めた Seed を計算 (純関数)
    #[inline]
    pub fn compute_next(seed: LcgSeed) -> LcgSeed {
        let raw = seed.value()
            .wrapping_mul(LCG_MULTIPLIER)
            .wrapping_add(LCG_INCREMENT);
        LcgSeed::new(raw)
    }

    /// n ステップ進めた Seed を計算 (純関数)
    pub fn compute_advance(seed: LcgSeed, steps: u64) -> LcgSeed {
        let (mul, add) = Self::affine_for_steps(steps);
        LcgSeed::new(Self::apply_raw(seed.value(), mul, add))
    }
}
```

### 5.2 アフィン変換 (高速スキップ)

LCG の性質を利用し、O(log n) で n ステップ先の Seed を計算。

```rust
impl Lcg64 {
    /// n ステップ分のアフィン変換係数を計算
    /// 
    /// # Returns
    /// (multiplier, increment) のタプル
    pub fn affine_for_steps(steps: u64) -> (u64, u64) {
        let (mut mul, mut add) = (1u64, 0u64);
        let (mut cur_mul, mut cur_add) = (LCG_MULTIPLIER, LCG_INCREMENT);
        let mut k = steps;
        
        while k > 0 {
            if (k & 1) == 1 {
                add = add.wrapping_mul(cur_mul).wrapping_add(cur_add);
                mul = mul.wrapping_mul(cur_mul);
            }
            cur_add = cur_add.wrapping_mul(cur_mul).wrapping_add(cur_add);
            cur_mul = cur_mul.wrapping_mul(cur_mul);
            k >>= 1;
        }
        
        (mul, add)
    }

    /// アフィン変換を適用 (内部用 raw 版)
    #[inline]
    fn apply_raw(seed: u64, mul: u64, add: u64) -> u64 {
        seed.wrapping_mul(mul).wrapping_add(add)
    }
}
```

**計算原理**:

LCG は以下の漸化式を持つ:
```
S[n] = a^n × S[0] + c × (a^(n-1) + a^(n-2) + ... + 1)
     = a^n × S[0] + c × (a^n - 1) / (a - 1)
```

バイナリ法により O(log n) で計算可能。

### 5.3 距離計算

2 つの Seed 間の距離 (消費数) を計算。

```rust
impl Lcg64 {
    /// 2 つの Seed 間の距離を計算
    /// 
    /// # Arguments
    /// * `from_seed` - 開始 Seed
    /// * `to_seed` - 終了 Seed
    /// 
    /// # Returns
    /// from_seed から to_seed までの消費数
    pub fn distance_between(from_seed: LcgSeed, to_seed: LcgSeed) -> u64 {
        // Pohlig-Hellman アルゴリズムによる離散対数計算
        Self::get_index(to_seed).wrapping_sub(Self::get_index(from_seed))
    }

    /// 0x0 からの消費数 (インデックス) を計算
    pub fn get_index(seed: LcgSeed) -> u64 {
        Self::calc_index_recursive(seed.value(), LCG_MULTIPLIER, LCG_INCREMENT, 64)
    }

    /// 再帰的インデックス計算 (Pohlig-Hellman)
    fn calc_index_recursive(seed: u64, a: u64, b: u64, order: u32) -> u64 {
        if order == 0 {
            return 0;
        }

        let half_order = order - 1;
        let half_pow = 1u64 << half_order;

        // 下位ビットの処理
        let a_half = a.wrapping_pow(half_pow as u32);
        let b_half = b.wrapping_mul(
            (a_half.wrapping_sub(1))
                .wrapping_mul(Self::mod_inverse(a.wrapping_sub(1)))
        );

        let seed_half = seed.wrapping_mul(a_half).wrapping_add(b_half);

        // 再帰
        let low = Self::calc_index_recursive(seed_half, a_half.wrapping_mul(a_half), 
            b_half.wrapping_mul(a_half).wrapping_add(b_half), half_order);

        // 上位ビットの判定
        let reconstructed = Self::compute_advance(LcgSeed::new(0), low);
        let high = if reconstructed.value() == seed { 0 } else { half_pow };

        low | high
    }

    /// モジュラ逆元 (2^64 を法とする)
    fn mod_inverse(a: u64) -> u64 {
        // 拡張ユークリッドの互除法
        let mut x = a;
        for _ in 0..6 {
            x = x.wrapping_mul(2u64.wrapping_sub(a.wrapping_mul(x)));
        }
        x
    }
}
```

### 5.4 レポート針方向

針方向計算は Lcg64 のスタティック関数として提供。
連続針計算・パターン検索は [generation/algorithm/needle.md](../generation/algorithm/needle.md) を参照。

```rust
impl Lcg64 {
    /// LCG Seed から針方向を計算 (純関数)
    /// 
    /// # Arguments
    /// * `seed` - 現在の LCG Seed
    /// 
    /// # Returns
    /// NeedleDirection (0-7)
    /// 
    /// # Algorithm
    /// 1. LCG を 1 回進める
    /// 2. `((next >> 32) * 8) >> 32` で 0-7 を算出
    #[inline]
    pub fn calc_needle_direction(seed: LcgSeed) -> NeedleDirection {
        let next = seed.value()
            .wrapping_mul(LCG_MULTIPLIER)
            .wrapping_add(LCG_INCREMENT);
        let dir = ((next >> 32).wrapping_mul(8)) >> 32;
        NeedleDirection::from_value((dir & 7) as u8)
    }
}
```

**計算式**: LCG を 1 回進めた後 `((next >> 32) * 8) >> 32`

## 6. ユーティリティ関数

### 6.1 n 分率計算

```rust
impl Lcg64 {
    /// n 分率を計算: (rand * n) >> 32
    /// 
    /// # Arguments
    /// * `rand` - 乱数値 (32bit)
    /// * `n` - 分母
    /// 
    /// # Returns
    /// 0 から n-1 の値
    #[inline]
    pub fn calc_ratio(rand: u32, n: u32) -> u32 {
        ((rand as u64 * n as u64) >> 32) as u32
    }
}
```

**用途例**:
- 性格決定: `calc_ratio(rand, 25)`
- シンクロ判定: `calc_ratio(rand, 2) == 0`
- エンカウントスロット: `calc_ratio(rand, 100)`

## 7. wasm-bindgen エクスポート

TypeScript から利用する場合のエクスポート。
wasm_bindgen は u64/newtype を直接扱えないため、bigint との相互変換を行う。

```rust
use wasm_bindgen::prelude::*;
use crate::common::types::{LcgSeed, NeedleDirection};

#[wasm_bindgen]
pub struct Lcg64Wasm {
    inner: Lcg64,
}

#[wasm_bindgen]
impl Lcg64Wasm {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u64) -> Self {
        Self { inner: Lcg64::new(LcgSeed::new(seed)) }
    }

    pub fn next(&mut self) -> u32 {
        self.inner.next()
    }

    pub fn next_seed(&mut self) -> u64 {
        self.inner.next_seed().value()
    }

    #[wasm_bindgen(getter)]
    pub fn current_seed(&self) -> u64 {
        self.inner.current_seed().value()
    }

    pub fn advance(&mut self, advances: u32) {
        self.inner.advance(advances);
    }

    pub fn skip(&mut self, steps: u64) {
        self.inner.skip(steps);
    }

    pub fn reset(&mut self, seed: u64) {
        self.inner.reset(LcgSeed::new(seed));
    }
}

/// スタティック関数 (wasm_bindgen)
#[wasm_bindgen]
pub fn lcg_compute_next(seed: u64) -> u64 {
    Lcg64::compute_next(LcgSeed::new(seed)).value()
}

#[wasm_bindgen]
pub fn lcg_compute_advance(seed: u64, steps: u64) -> u64 {
    Lcg64::compute_advance(LcgSeed::new(seed), steps).value()
}

#[wasm_bindgen]
pub fn lcg_distance_between(from_seed: u64, to_seed: u64) -> u64 {
    Lcg64::distance_between(LcgSeed::new(from_seed), LcgSeed::new(to_seed))
}

#[wasm_bindgen]
pub fn lcg_calc_needle_direction(seed: u64) -> u8 {
    Lcg64::calc_needle_direction(LcgSeed::new(seed)) as u8
}
```

## 8. TypeScript 型

```typescript
// 生成される TypeScript 型
export class Lcg64Wasm {
  constructor(seed: bigint);
  next(): number;
  next_seed(): bigint;
  get current_seed(): bigint;
  advance(advances: number): void;
  skip(steps: bigint): void;
  reset(seed: bigint): void;
}

export function lcg_compute_next(seed: bigint): bigint;
export function lcg_compute_advance(seed: bigint, steps: bigint): bigint;
export function lcg_distance_between(from_seed: bigint, to_seed: bigint): bigint;
export function lcg_calc_needle_direction(seed: bigint): number;
```

## 9. テスト

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lcg_basic() {
        let mut lcg = Lcg64::new(LcgSeed::new(0));
        
        // Seed 0 の場合、最初の next() は 0
        assert_eq!(lcg.next(), 0);
        
        // 内部状態は INCREMENT に更新
        assert_eq!(lcg.current_seed().value(), LCG_INCREMENT);
    }

    #[test]
    fn test_lcg_known_sequence() {
        let mut lcg = Lcg64::new(LcgSeed::new(1));
        
        // 既知のシーケンスを検証
        let expected_seed = 1u64
            .wrapping_mul(LCG_MULTIPLIER)
            .wrapping_add(LCG_INCREMENT);
        let expected_value = (expected_seed >> 32) as u32;
        
        assert_eq!(lcg.next(), expected_value);
        assert_eq!(lcg.current_seed().value(), expected_seed);
    }

    #[test]
    fn test_advance_equals_skip() {
        let seed = LcgSeed::new(0x123456789ABCDEF0);
        let steps = 1000u64;
        
        let mut lcg1 = Lcg64::new(seed);
        let mut lcg2 = Lcg64::new(seed);
        
        for _ in 0..steps {
            lcg1.next();
        }
        lcg2.skip(steps);
        
        assert_eq!(lcg1.current_seed(), lcg2.current_seed());
    }

    #[test]
    fn test_distance_calculation() {
        let seed1 = LcgSeed::new(0x123456789ABCDEF0);
        let mut lcg = Lcg64::new(seed1);
        
        for _ in 0..5 {
            lcg.next();
        }
        let seed2 = lcg.current_seed();
        
        assert_eq!(Lcg64::distance_between(seed1, seed2), 5);
    }

    #[test]
    fn test_needle_direction_range() {
        for i in 0..100 {
            let seed = LcgSeed::new(0x123456789ABCDEF0u64.wrapping_add(i));
            let dir = Lcg64::calc_needle_direction(seed);
            assert!((dir as u8) < 8);
        }
    }
}
```

## 10. 関連ドキュメント

- [mt.md](./mt.md) - MT19937 (個体値生成用)
- [sha1.md](./sha1.md) - SHA-1 ハッシュ (初期 Seed 計算)
- [types.md](../common/types.md) - 共通型定義 (LcgSeed, NeedleDirection)
- [needle-search.md](../misc/needle-search.md) - レポート針検索
