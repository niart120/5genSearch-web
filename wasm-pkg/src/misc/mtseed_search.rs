//! MT Seed 全探索
//!
//! 指定オフセットから検索条件を満たす IV が生成される MT Seed を全探索する機能。
//! pokemon-gen5-initseed の実装を参照。

use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

use crate::generation::algorithm::{generate_rng_ivs_with_offset, generate_roamer_ivs};
use crate::types::{IvCode, Ivs, MtSeed};

// ===== ヘルパー関数 =====

/// IV セットを `IvCode` にエンコード
#[inline]
pub fn encode_iv_code(ivs: &[u8; 6]) -> IvCode {
    IvCode::encode(ivs)
}

/// `IvCode` を IV セットにデコード
#[inline]
pub fn decode_iv_code(code: IvCode) -> [u8; 6] {
    code.decode()
}

/// 徘徊ポケモン用 `IvCode` 順序変換
///
/// 検索対象の `IvCode` を徘徊順序に変換する。
/// 通常: HABCDS (HP, Atk, Def, `SpA`, `SpD`, Spe)
/// 徘徊: HABDSC (HP, Atk, Def, `SpD`, Spe, `SpA`)
#[inline]
pub fn reorder_iv_code_for_roamer(iv_code: IvCode) -> IvCode {
    iv_code.reorder_for_roamer()
}

/// Ivs を配列に変換
#[inline]
fn ivs_to_array(ivs: Ivs) -> [u8; 6] {
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

    /// 6V フィルタ
    pub const fn six_v() -> Self {
        Self {
            hp: (31, 31),
            atk: (31, 31),
            def: (31, 31),
            spa: (31, 31),
            spd: (31, 31),
            spe: (31, 31),
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

// ===== MT Seed 検索 =====

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
    /// `IvCode`
    pub iv_code: IvCode,
}

/// MT Seed 検索バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MtseedSearchBatch {
    /// 条件を満たした候補
    pub candidates: Vec<MtseedResult>,
    /// 処理済み Seed 数
    #[tsify(type = "bigint")]
    pub processed: u64,
    /// 総 Seed 数 (0x100000000)
    #[tsify(type = "bigint")]
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

const TOTAL_SEEDS: u64 = 0x1_0000_0000;

#[wasm_bindgen]
impl MtseedSearcher {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::needless_pass_by_value)]
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
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        self.current_seed as f64 / TOTAL_SEEDS as f64
    }

    /// 次のバッチを検索
    pub fn next_batch(&mut self, chunk_size: u32) -> MtseedSearchBatch {
        let mut candidates = Vec::new();
        let end_seed = (self.current_seed + u64::from(chunk_size)).min(TOTAL_SEEDS);

        while self.current_seed < end_seed {
            #[allow(clippy::cast_possible_truncation)]
            let seed = MtSeed::new(self.current_seed as u32);

            // 徘徊ポケモンモード時は専用関数、通常は汎用関数
            let ivs = if self.is_roamer {
                generate_roamer_ivs(seed)
            } else {
                generate_rng_ivs_with_offset(seed, self.mt_offset)
            };

            if self.iv_filter.matches(&ivs) {
                let iv_code = encode_iv_code(&ivs_to_array(ivs));
                candidates.push(MtseedResult { seed, ivs, iv_code });
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

/// `IvCode` エンコード (WASM 公開)
#[wasm_bindgen]
pub fn encode_iv_code_wasm(hp: u8, atk: u8, def: u8, spa: u8, spd: u8, spe: u8) -> IvCode {
    encode_iv_code(&[hp, atk, def, spa, spd, spe])
}

/// `IvCode` デコード (WASM 公開)
#[wasm_bindgen]
pub fn decode_iv_code_wasm(code: IvCode) -> Vec<u8> {
    decode_iv_code(code).to_vec()
}

/// 徘徊ポケモン用 `IvCode` 順序変換 (WASM 公開)
#[wasm_bindgen]
pub fn reorder_iv_code_for_roamer_wasm(iv_code: IvCode) -> IvCode {
    reorder_iv_code_for_roamer(iv_code)
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
    fn test_encode_decode_6v() {
        let ivs = [31, 31, 31, 31, 31, 31];
        let code = encode_iv_code(&ivs);
        assert_eq!(code.value(), 0x3FFF_FFFF); // 全ビット 1 (30bit)
        let decoded = decode_iv_code(code);
        assert_eq!(ivs, decoded);
    }

    #[test]
    fn test_reorder_iv_code_for_roamer() {
        // HABCDS → HABDSC
        let ivs = [31, 30, 29, 28, 27, 26]; // HP=31, Atk=30, Def=29, SpA=28, SpD=27, Spe=26
        let code = encode_iv_code(&ivs);
        let roamer_code = reorder_iv_code_for_roamer(code);
        let roamer_ivs = decode_iv_code(roamer_code);
        // 変換後: HP=31, Atk=30, Def=29, SpD=27, Spe=26, SpA=28
        assert_eq!(roamer_ivs, [31, 30, 29, 27, 26, 28]);
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
    fn test_mtseed_searcher_6v() {
        let params = MtseedSearchParams {
            iv_filter: IvFilter::six_v(),
            mt_offset: 7,
            is_roamer: false,
        };

        let mut searcher = MtseedSearcher::new(params);
        // 最初の 10000 件には 6V はほぼ見つからない
        let batch = searcher.next_batch(10000);
        // 6V は確率的に非常に低い
        assert!(batch.candidates.len() <= 1);
    }
}
