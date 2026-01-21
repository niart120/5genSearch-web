# 針計算 (Needle Calculation)

レポート針の計算アルゴリズム。

## 1. 概要

ポケモン BW/BW2 のレポート画面に表示される「針」の方向を計算。

- 単一針計算: `Lcg64::calc_needle_direction()` ([core/lcg.md](../../core/lcg.md#54-レポート針方向))
- 連続針計算・パターン検索: 本モジュール

## 2. 型定義

```rust
use crate::common::types::{LcgSeed, NeedleDirection};
use crate::core::lcg::{Lcg64, LCG_MULTIPLIER, LCG_INCREMENT};
```

## 3. 連続針計算

```rust
/// 連続した針の方向を計算
/// 
/// # Arguments
/// * `seed` - 開始 LCG Seed
/// * `count` - 計算する針の数
/// 
/// # Returns
/// 針の方向の配列
pub fn calc_needle_sequence(seed: LcgSeed, count: usize) -> Vec<NeedleDirection> {
    let mut result = Vec::with_capacity(count);
    let mut lcg = Lcg64::new(seed);
    
    for _ in 0..count {
        let rand = lcg.next();
        let dir = ((rand as u64).wrapping_mul(8)) >> 32;
        result.push(NeedleDirection::from_value((dir & 7) as u8));
    }
    
    result
}

/// SIMD 最適化版 (x4 並列)
/// 
/// 4 つの異なる初期シードから同時に針列を計算
#[cfg(target_feature = "simd128")]
pub fn calc_needle_sequence_x4(
    seeds: [LcgSeed; 4],
    count: usize,
) -> [Vec<NeedleDirection>; 4] {
    // 実装は Lcg64x4 を利用
    todo!()
}
```

## 4. 針パターン検索

```rust
/// 針パターンにマッチする seed を検索
/// 
/// # Arguments
/// * `start_seed` - 検索開始 LCG Seed
/// * `pattern` - 目標の針パターン
/// * `max_advance` - 最大進行数
/// 
/// # Returns
/// マッチした場合は (seed, advance) を返す
pub fn find_needle_pattern(
    start_seed: LcgSeed,
    pattern: &[NeedleDirection],
    max_advance: u32,
) -> Option<(LcgSeed, u32)> {
    let pattern_len = pattern.len();
    if pattern_len == 0 {
        return Some((start_seed, 0));
    }

    let mut lcg = Lcg64::new(start_seed);
    let mut ring_buffer: Vec<NeedleDirection> = Vec::with_capacity(pattern_len);

    for advance in 0..max_advance {
        let rand = lcg.next();
        let dir = ((rand as u64).wrapping_mul(8)) >> 32;
        let needle = NeedleDirection::from_value((dir & 7) as u8);

        if ring_buffer.len() < pattern_len {
            ring_buffer.push(needle);
        } else {
            ring_buffer.rotate_left(1);
            ring_buffer[pattern_len - 1] = needle;
        }

        if ring_buffer.len() == pattern_len && ring_buffer == pattern {
            // パターン開始位置の seed を計算
            let pattern_start_advance = advance.saturating_sub((pattern_len - 1) as u32);
            let pattern_start_seed = Lcg64::compute_advance(
                start_seed,
                (pattern_start_advance + 1) as u64
            );
            return Some((pattern_start_seed, pattern_start_advance));
        }
    }

    None
}
```

## 5. Seed 逆算

```rust
/// LCG Seed を指定回数だけ逆進
/// 
/// 針パターン検索で開始位置を求める際に使用
fn advance_seed_backward(seed: LcgSeed, count: u32) -> LcgSeed {
    // 逆 LCG 定数
    const LCG_MULT_INV: u64 = 0xDEDCEDAE9638806D;
    const LCG_ADD_INV: u64 = 0x9B1AE6E9A384E6F9;
    
    let mut current = seed.value();
    for _ in 0..count {
        current = current.wrapping_sub(LCG_ADD_INV).wrapping_mul(LCG_MULT_INV);
    }
    LcgSeed::new(current)
}
```

## 6. wasm-bindgen エクスポート

```rust
use wasm_bindgen::prelude::*;
use crate::core::lcg::Lcg64;

/// 単一針計算
#[wasm_bindgen]
pub fn wasm_calc_needle(seed: u64) -> u8 {
    Lcg64::calc_needle_direction(LcgSeed::new(seed)).value()
}

/// 連続針計算
#[wasm_bindgen]
pub fn wasm_calc_needle_sequence(seed: u64, count: u32) -> Vec<u8> {
    calc_needle_sequence(LcgSeed::new(seed), count as usize)
        .into_iter()
        .map(|n| n.value())
        .collect()
}

/// 針パターン検索
#[wasm_bindgen]
pub fn wasm_find_needle_pattern(
    start_seed: u64,
    pattern: &[u8],
    max_advance: u32,
) -> JsValue {
    let pattern: Vec<NeedleDirection> = pattern
        .iter()
        .map(|&v| NeedleDirection::from_value(v))
        .collect();
    
    match find_needle_pattern(LcgSeed::new(start_seed), &pattern, max_advance) {
        Some((seed, advance)) => {
            serde_wasm_bindgen::to_value(&(seed.value(), advance)).unwrap()
        }
        None => JsValue::NULL,
    }
}
```

## 7. TypeScript 型

```typescript
export function wasm_calc_needle(seed: bigint): number;
export function wasm_calc_needle_sequence(seed: bigint, count: number): Uint8Array;
export function wasm_find_needle_pattern(
    start_seed: bigint,
    pattern: Uint8Array,
    max_advance: number
): [bigint, number] | null;
```

## 8. テスト

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::lcg::Lcg64;

    #[test]
    fn test_calc_needle_direction() {
        // 針方向は 0-7 の範囲
        let seed = LcgSeed::new(0x123456789ABCDEF0);
        let needle = Lcg64::calc_needle_direction(seed);
        assert!(needle.value() < 8);
    }

    #[test]
    fn test_calc_needle_sequence() {
        let seed = LcgSeed::new(0x0);
        let needles = calc_needle_sequence(seed, 10);
        
        assert_eq!(needles.len(), 10);
        for needle in &needles {
            assert!(needle.value() < 8);
        }
    }

    #[test]
    fn test_find_needle_pattern() {
        let seed = LcgSeed::new(0x1234567890ABCDEF);
        
        // 最初の 3 針を取得
        let first_three = calc_needle_sequence(seed, 3);
        
        // 同じパターンを検索
        let result = find_needle_pattern(seed, &first_three, 100);
        
        assert!(result.is_some());
        let (found_seed, advance) = result.unwrap();
        assert_eq!(advance, 0);
    }

    #[test]
    fn test_seed_backward() {
        let seed = LcgSeed::new(0xABCDEF0123456789);
        
        // 10 回進めて 10 回戻す
        let mut forward = seed.value();
        for _ in 0..10 {
            forward = forward
                .wrapping_mul(LCG_MULTIPLIER)
                .wrapping_add(LCG_INCREMENT);
        }
        
        let backward = advance_seed_backward(LcgSeed::new(forward), 10);
        assert_eq!(backward.value(), seed.value());
    }
}
```

## 9. 関連ドキュメント

- [common/types.md](../../common/types.md) - LcgSeed, NeedleDirection 型定義
- [core/lcg.md](../../core/lcg.md) - Lcg64::calc_needle_direction, LCG PRNG
- [misc/needle-search.md](../../misc/needle-search.md) - 針検索 UI 仕様
