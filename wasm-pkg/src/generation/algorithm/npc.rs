//! タマゴNPC消費シミュレーション
//!
//! 育て屋前でタマゴ受け取り待機中に発生する乱数消費をシミュレート。

use crate::core::lcg::Lcg64;
use crate::types::LcgSeed;

/// タマゴNPC消費定数 (参照実装準拠)
const FOUR_FRACTION_FRAMES: [u32; 4] = [32, 64, 96, 128];
const LEFT_DIRECTION_FRAMES: u32 = 20;
const RIGHT_DIRECTION_FRAMES: u32 = 16;
const DIRECTION_MISMATCH_FRAMES: u32 = 20;
const INITIAL_NPC_ADVANCE_COST: u32 = 3;
const FINAL_NPC_ADVANCE_COST: u32 = 2;

/// 小屋から出てから育て屋爺に話しかけるまでの最短フレーム数
const NPC_FRAME_THRESHOLD: u32 = 96;

/// タマゴNPC消費結果
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct EggNpcAdvanceResult {
    /// 消費後の Seed
    pub seed: LcgSeed,
    /// 消費した乱数回数
    pub consumed: u32,
    /// 猶予フレーム (閾値超過後の余剰フレーム数)
    pub margin_frames: u32,
}

/// n分率計算
#[inline]
fn roll_fraction(r: u32, n: u32) -> u32 {
    ((u64::from(r) * u64::from(n)) >> 32) as u32
}

/// タマゴ受け取り時のNPC消費シミュレーション
///
/// 育て屋前で待機中に発生するNPC乱数消費をシミュレートし、
/// 閾値超過後の猶予フレームを算出する。
///
/// # Arguments
/// * `seed` - 現在の LCG Seed
///
/// # Returns
/// * `EggNpcAdvanceResult` - 消費後のSeed、消費回数、猶予フレーム
pub fn resolve_egg_npc_advance(seed: LcgSeed) -> EggNpcAdvanceResult {
    let mut lcg = Lcg64::new(seed);
    let mut consumed = 0u32;

    // 初期消費 (3回)
    for _ in 0..INITIAL_NPC_ADVANCE_COST {
        lcg.next();
    }
    consumed += INITIAL_NPC_ADVANCE_COST;

    let mut elapsed = 0u32;
    let mut first_direction: Option<u32> = None;

    // ステップ1: 4分率 (待機時間)
    let roll1 = roll_fraction(lcg.next().unwrap_or(0), 4) as usize;
    consumed += 1;
    elapsed += FOUR_FRACTION_FRAMES[roll1];

    if elapsed <= NPC_FRAME_THRESHOLD {
        // ステップ2: 2分率 (方向決定)
        let direction = roll_fraction(lcg.next().unwrap_or(0), 2);
        consumed += 1;
        first_direction = Some(direction);
        elapsed += if direction == 0 {
            LEFT_DIRECTION_FRAMES
        } else {
            RIGHT_DIRECTION_FRAMES
        };
    }

    if elapsed <= NPC_FRAME_THRESHOLD {
        // ステップ3: 4分率 (待機時間)
        let roll3 = roll_fraction(lcg.next().unwrap_or(0), 4) as usize;
        consumed += 1;
        elapsed += FOUR_FRACTION_FRAMES[roll3];
    }

    if elapsed <= NPC_FRAME_THRESHOLD {
        // ステップ4: 2分率 (方向決定、前回との差で追加フレーム)
        let direction2 = roll_fraction(lcg.next().unwrap_or(0), 2);
        consumed += 1;
        if first_direction == Some(direction2) {
            // 同じ方向 -> 追加なし
        } else if first_direction.is_some() {
            elapsed += DIRECTION_MISMATCH_FRAMES;
        }
    }

    if elapsed <= NPC_FRAME_THRESHOLD {
        // ステップ5: 4分率 (待機時間)
        let roll5 = roll_fraction(lcg.next().unwrap_or(0), 4) as usize;
        consumed += 1;
        elapsed += FOUR_FRACTION_FRAMES[roll5];
    }

    // 最終消費 (2回)
    for _ in 0..FINAL_NPC_ADVANCE_COST {
        lcg.next();
    }
    consumed += FINAL_NPC_ADVANCE_COST;

    // 猶予フレーム算出 (閾値超過分)
    let margin = elapsed.saturating_sub(NPC_FRAME_THRESHOLD);

    EggNpcAdvanceResult {
        seed: lcg.current_seed(),
        consumed,
        margin_frames: margin,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_npc_advance_minimum_consumption() {
        // 最小消費 (3 + 1 + 2 = 6) の場合: 最初の4分率で128フレームを引いて即終了
        // roll_fraction(r, 4) = 3 となる r を使用
        // 0xC0000000以上で roll_fraction(r, 4) = 3
        let seed = LcgSeed::new(0xC000_0000_0000_0000);
        let result = resolve_egg_npc_advance(seed);

        // 初期消費(3) + 4分率(1) + 最終消費(2) = 6
        assert_eq!(result.consumed, 6);
        // elapsed = 128 > 96 → margin = 128 - 96 = 32
        assert_eq!(result.margin_frames, 32);
    }

    #[test]
    fn test_resolve_npc_advance_handles_immediate_threshold() {
        // 閾値ちょうど (elapsed = 96) の場合も次のステップへ進む
        // roll_fraction(r, 4) = 2 で elapsed = 96
        let seed = LcgSeed::new(0x8000_0000_0000_0000);
        let result = resolve_egg_npc_advance(seed);

        // elapsed = 96 <= 96 なので次のステップへ進む
        assert!(result.consumed > 6);
    }

    #[test]
    fn test_resolve_npc_advance_full_steps() {
        // 全ステップを通過するケース (roll_fraction がすべて 0 の場合)
        let seed = LcgSeed::new(0x0000_0000_0000_0000);
        let result = resolve_egg_npc_advance(seed);

        // すべてのステップを通過
        // 3 + 1 + 1 + 1 + 1 + 1 + 2 = 10
        assert_eq!(result.consumed, 10);
    }
}
