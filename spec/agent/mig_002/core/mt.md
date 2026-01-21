# 計算コア: MT19937 (メルセンヌ・ツイスタ)

BW/BW2 で使用される Mersenne Twister 乱数生成器の仕様。

## 1. 概要

### 1.1 アルゴリズム

MT19937 は 32bit 出力の擬似乱数生成器。Gen5 では個体値 (IV) 生成に使用。

| 項目 | 値 |
|------|-----|
| 状態サイズ | 624 × 32bit = 19968bit |
| 出力 | 32bit |
| 周期 | 2^19937 - 1 |

### 1.2 用途

| 用途 | 説明 |
|------|------|
| 個体値生成 | `(mt.next() >> 27) & 0x1F` で各ステータス |
| 孵化時 IV | 親からの遺伝後、RNG IV で補完 |

IV 生成ロジックの詳細は [iv-inheritance.md](../generation/algorithm/iv-inheritance.md) を参照。

### 1.3 LCG との関係

```
SHA-1 Hash → LCG Seed (64bit) → MT Seed (32bit) → IV
```

MT Seed は LCG から導出される (導出関数は iv-inheritance.md で定義):

```rust
let mt_seed: MtSeed = derive_mt_seed(lcg_seed);
```

## 2. 定数

```rust
/// 状態配列サイズ
const N: usize = 624;

/// Twist オフセット
const M: usize = 397;

/// Twist マスク
const MATRIX_A: u32 = 0x9908B0DF;

/// 上位ビットマスク
const UPPER_MASK: u32 = 0x80000000;

/// 下位ビットマスク
const LOWER_MASK: u32 = 0x7FFFFFFF;

/// 初期化乗数
const INIT_MULTIPLIER: u32 = 1812433253;
```

## 3. 構造体

### 3.1 Mt19937 (スカラー版)

単一の MT19937 インスタンス。

```rust
/// Mersenne Twister 19937 乱数生成器
#[derive(Clone)]
pub struct Mt19937 {
    /// 内部状態配列 (624 要素)
    state: [u32; N],
    /// 現在のインデックス
    index: usize,
}
```

### 3.2 Mt19937x4 (SIMD 版)

4 系統の MT19937 を Portable SIMD (`std::simd`) で並列処理。

```rust
#![feature(portable_simd)]
use std::simd::{u32x4, num::SimdUint};

/// SIMD 版 MT19937 (4 系統並列)
pub struct Mt19937x4 {
    /// 内部状態配列 (624 × 4 系統、インターリーブ配置)
    state: [u32x4; N],
    /// 現在のインデックス
    index: usize,
}
```

Portable SIMD はアーキテクチャ非依存のため、`cfg` 分岐なしで以下の環境で動作:
- WASM (SIMD128 にコンパイル)
- x86_64 (SSE/AVX にコンパイル)
- aarch64 (NEON にコンパイル)

## 4. スカラー版 API

### 4.1 コンストラクタ

```rust
use crate::common::types::MtSeed;

impl Mt19937 {
    /// 新しい MT19937 インスタンスを作成
    /// 
    /// # Arguments
    /// * `seed` - 32bit 初期シード (MtSeed 型)
    pub fn new(seed: MtSeed) -> Self {
        let seed_val = seed.value();
        let mut state = [0u32; N];
        state[0] = seed_val;
        
        for i in 1..N {
            let prev = state[i - 1];
            state[i] = INIT_MULTIPLIER
                .wrapping_mul(prev ^ (prev >> 30))
                .wrapping_add(i as u32);
        }
        
        Mt19937 { state, index: N }
    }

    /// u32 から直接作成 (内部利用)
    pub fn from_raw(seed: u32) -> Self {
        Self::new(MtSeed::new(seed))
    }
}
```

**初期化式**:
```
state[i] = 1812433253 × (state[i-1] ⊕ (state[i-1] >> 30)) + i
```

### 4.2 乱数生成

```rust
impl Mt19937 {
    /// 次の 32bit 乱数値を取得
    pub fn next_u32(&mut self) -> u32 {
        if self.index >= N {
            self.twist();
        }

        let mut y = self.state[self.index];
        self.index += 1;

        // Tempering
        y ^= y >> 11;
        y ^= (y << 7) & 0x9D2C_5680;
        y ^= (y << 15) & 0xEFC6_0000;
        y ^= y >> 18;

        y
    }
}
```

**Tempering 変換**:
```
y ^= y >> 11
y ^= (y << 7) & 0x9D2C5680
y ^= (y << 15) & 0xEFC60000
y ^= y >> 18
```

### 4.3 Twist 操作

```rust
impl Mt19937 {
    /// 状態配列を更新 (twist)
    fn twist(&mut self) {
        for i in 0..N {
            let x = (self.state[i] & UPPER_MASK) 
                  | (self.state[(i + 1) % N] & LOWER_MASK);
            let mut x_a = x >> 1;
            if (x & 1) != 0 {
                x_a ^= MATRIX_A;
            }
            self.state[i] = self.state[(i + M) % N] ^ x_a;
        }
        self.index = 0;
    }
}
```

### 4.4 消費・スキップ

```rust
impl Mt19937 {
    /// 指定回数だけ乱数を消費
    pub fn discard(&mut self, count: u32) {
        for _ in 0..count {
            self.next_u32();
        }
    }
}
```

## 5. SIMD 版 API

### 5.1 概要

Portable SIMD (`std::simd`) の `u32x4` 型を使用し、4 つの MT19937 を並列処理。

**利点**:
- 4 系統同時に乱数生成可能
- SHA-1 SIMD との親和性
- アーキテクチャ非依存 (WASM/x86_64/aarch64 で同一コード)
- ネイティブ環境でもテスト可能

### 5.2 コンストラクタ

```rust
#![feature(portable_simd)]
use std::simd::{u32x4, num::SimdUint};

impl Mt19937x4 {
    /// 4 つの異なるシードから初期化
    /// 
    /// # Arguments
    /// * `seeds` - 4 つの MtSeed
    pub fn new(seeds: [MtSeed; 4]) -> Self {
        let mut state = [u32x4::splat(0); N];
        
        // 初期状態設定
        state[0] = u32x4::from_array([
            seeds[0].value(), seeds[1].value(), 
            seeds[2].value(), seeds[3].value()
        ]);
        
        for i in 1..N {
            let prev = state[i - 1];
            // state[i] = 1812433253 * (prev ^ (prev >> 30)) + i
            let shifted = prev >> 30;
            let xored = prev ^ shifted;
            let multiplied = xored * u32x4::splat(INIT_MULTIPLIER);
            state[i] = multiplied + u32x4::splat(i as u32);
        }
        
        Mt19937x4 { state, index: N }
    }

    /// u32 配列から直接作成 (内部利用)
    pub fn from_raw(seeds: [u32; 4]) -> Self {
        Self::new(seeds.map(MtSeed::new))
    }
}
```

### 5.3 乱数生成

```rust
impl Mt19937x4 {
    /// 4 系統同時に次の乱数を取得
    /// 
    /// # Returns
    /// [lane0, lane1, lane2, lane3] の 4 つの乱数
    pub fn next_u32x4(&mut self) -> [u32; 4] {
        if self.index >= N {
            self.twist();
        }

        let mut y = self.state[self.index];
        self.index += 1;

        // Tempering (Portable SIMD)
        y ^= y >> 11;
        y ^= (y << 7) & u32x4::splat(0x9D2C_5680);
        y ^= (y << 15) & u32x4::splat(0xEFC6_0000);
        y ^= y >> 18;

        y.to_array()
    }
}
```

## 6. wasm-bindgen エクスポート

MT19937 は主に内部で使用されるため、wasm_bindgen エクスポートは最小限。
IV 生成関連のエクスポートは [iv-inheritance.md](../generation/algorithm/iv-inheritance.md) を参照。

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Mt19937Wasm {
    inner: Mt19937,
}

#[wasm_bindgen]
impl Mt19937Wasm {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32) -> Self {
        Self { inner: Mt19937::new(MtSeed::new(seed)) }
    }

    pub fn next_u32(&mut self) -> u32 {
        self.inner.next_u32()
    }

    pub fn discard(&mut self, count: u32) {
        self.inner.discard(count);
    }
}
```

## 7. GPU 実装 (WGSL)

MT Seed 検索等で GPU を使用する場合の WGSL 実装。

```wgsl
// MT19937 定数
const N: u32 = 624u;
const M: u32 = 397u;
const MATRIX_A: u32 = 0x9908B0DFu;
const UPPER_MASK: u32 = 0x80000000u;
const LOWER_MASK: u32 = 0x7FFFFFFFu;

// スレッドローカル状態
var<private> mt_state: array<u32, 624>;
var<private> mt_index: u32;

// 初期化
fn mt_init(seed: u32) {
    mt_state[0] = seed;
    for (var i = 1u; i < N; i++) {
        let prev = mt_state[i - 1u];
        mt_state[i] = 1812433253u * (prev ^ (prev >> 30u)) + i;
    }
    mt_index = N;
}

// Twist
fn mt_twist() {
    for (var i = 0u; i < N; i++) {
        let next_idx = (i + 1u) % N;
        let m_idx = (i + M) % N;
        let x = (mt_state[i] & UPPER_MASK) | (mt_state[next_idx] & LOWER_MASK);
        var x_a = x >> 1u;
        if ((x & 1u) != 0u) {
            x_a ^= MATRIX_A;
        }
        mt_state[i] = mt_state[m_idx] ^ x_a;
    }
    mt_index = 0u;
}

// 乱数取得
fn mt_next() -> u32 {
    if (mt_index >= N) {
        mt_twist();
    }
    
    var y = mt_state[mt_index];
    mt_index++;
    
    // Tempering
    y ^= y >> 11u;
    y ^= (y << 7u) & 0x9D2C5680u;
    y ^= (y << 15u) & 0xEFC60000u;
    y ^= y >> 18u;
    
    return y;
}
```

## 8. テスト

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mt19937_matches_reference_sequence() {
        // 標準テストベクタ (seed = 5489)
        let mut mt = Mt19937::new(MtSeed::new(5489));
        let expected = [
            3499211612, 581869302, 3890346734, 3586334585, 545404204,
            4161255391, 3922919429, 949333985, 2715962298, 1323567403,
        ];

        for &value in expected.iter() {
            assert_eq!(mt.next_u32(), value);
        }
    }

    #[test]
    fn test_mt19937x4_consistency() {
        let seeds = [100u32, 200, 300, 400].map(MtSeed::new);
        let mut simd = Mt19937x4::new(seeds);
        
        // 個別のスカラー版と結果を比較
        let mut scalars: [Mt19937; 4] = seeds.map(Mt19937::new);
        
        for _ in 0..10 {
            let simd_results = simd.next_u32x4();
            for i in 0..4 {
                assert_eq!(simd_results[i], scalars[i].next_u32());
            }
        }
    }
}
```

## 9. 関連ドキュメント

- [lcg.md](./lcg.md) - 64bit LCG (PID/性格生成用)
- [sha1.md](./sha1.md) - SHA-1 ハッシュ (初期 Seed 計算)
- [types.md](../common/types.md) - 共通型定義 (MtSeed)
- [iv-inheritance.md](../generation/algorithm/iv-inheritance.md) - IV 生成・遺伝処理
- [mtseed.md](../seed-search/mtseed.md) - MT Seed 逆算検索
- [gpu-kernel.md](../datetime-search/gpu-kernel.md) - GPU カーネル設計
