// MT Seed IV 全探索シェーダー
//
// MT19937 を初期化・Twist し、指定オフセット後の IV を抽出・フィルタリングする。

override WORKGROUP_SIZE: u32 = 64u;
override ITEMS_PER_THREAD: u32 = 1u;

// ===== バッファ構造体 =====

struct DispatchState {
    seed_count: u32,
    base_seed: u32,
    candidate_capacity: u32,
    padding: u32,
};

struct SearchConstants {
    mt_offset: u32,
    is_roamer: u32,
    iv_hp: u32,
    iv_atk: u32,
    iv_def: u32,
    iv_spa: u32,
    iv_spd: u32,
    iv_spe: u32,
    reserved0: u32,
    reserved1: u32,
};

struct MatchRecord {
    seed: u32,
    ivs_packed: u32,
};

struct MatchOutputBuffer {
    match_count: atomic<u32>,
    records: array<MatchRecord>,
};

@group(0) @binding(0) var<storage, read> state: DispatchState;
@group(0) @binding(1) var<uniform> constants: SearchConstants;
@group(0) @binding(2) var<storage, read_write> output_buffer: MatchOutputBuffer;

// ===== MT19937 定数 =====

const MT_N: u32 = 624u;
const MT_M: u32 = 397u;
const MATRIX_A: u32 = 0x9908B0DFu;
const UPPER_MASK: u32 = 0x80000000u;
const LOWER_MASK: u32 = 0x7FFFFFFFu;
const INIT_MULT: u32 = 1812433253u;

// ===== MT19937 関数 =====

fn mt_init(mt: ptr<function, array<u32, 624>>, seed: u32) {
    (*mt)[0] = seed;
    for (var i = 1u; i < MT_N; i = i + 1u) {
        let prev = (*mt)[i - 1u];
        (*mt)[i] = INIT_MULT * (prev ^ (prev >> 30u)) + i;
    }
}

fn mt_twist(mt: ptr<function, array<u32, 624>>) {
    for (var i = 0u; i < MT_N; i = i + 1u) {
        let x = ((*mt)[i] & UPPER_MASK) | ((*mt)[(i + 1u) % MT_N] & LOWER_MASK);
        var x_a = x >> 1u;
        if ((x & 1u) != 0u) {
            x_a = x_a ^ MATRIX_A;
        }
        (*mt)[i] = (*mt)[(i + MT_M) % MT_N] ^ x_a;
    }
}

fn mt_temper(value: u32) -> u32 {
    var y = value;
    y = y ^ (y >> 11u);
    y = y ^ ((y << 7u) & 0x9D2C5680u);
    y = y ^ ((y << 15u) & 0xEFC60000u);
    y = y ^ (y >> 18u);
    return y;
}

fn extract_iv(tempered: u32) -> u32 {
    return tempered >> 27u;
}

fn check_iv_range(value: u32, packed_range: u32) -> bool {
    let min_val = packed_range >> 16u;
    let max_val = packed_range & 0xFFFFu;
    return value >= min_val && value <= max_val;
}

// ===== メインカーネル =====

@compute @workgroup_size(WORKGROUP_SIZE)
fn mt_iv_search(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let base_idx = global_id.x * ITEMS_PER_THREAD;

    for (var item_k = 0u; item_k < ITEMS_PER_THREAD; item_k = item_k + 1u) {
        let idx = base_idx + item_k;
        if (idx >= state.seed_count) {
            return;
        }

        let seed = state.base_seed + idx;

        // MT19937 初期化
        var mt: array<u32, 624>;
        mt_init(&mt, seed);

        // Twist
        mt_twist(&mt);

        // Offset 消費 + IV 抽出
        var mt_index = constants.mt_offset;

        // IV 抽出 (6回)
        var ivs: array<u32, 6>;
        for (var i = 0u; i < 6u; i = i + 1u) {
            // Twist が必要かチェック (mt_index が N を超えた場合)
            if (mt_index >= MT_N) {
                mt_twist(&mt);
                mt_index = mt_index - MT_N;
            }
            ivs[i] = extract_iv(mt_temper(mt[mt_index]));
            mt_index = mt_index + 1u;
        }

        // Roamer 並び替え (HABDSC → HABCDS)
        if (constants.is_roamer != 0u) {
            let tmp_spa = ivs[3];
            let tmp_spd = ivs[4];
            let tmp_spe = ivs[5];
            ivs[3] = tmp_spd;  // spa ← spd 位置の値 (D)
            ivs[4] = tmp_spe;  // spd ← spe 位置の値 (S)
            ivs[5] = tmp_spa;  // spe ← spa 位置の値 (C)
        }

        // IV フィルタリング
        if (!check_iv_range(ivs[0], constants.iv_hp)) { continue; }
        if (!check_iv_range(ivs[1], constants.iv_atk)) { continue; }
        if (!check_iv_range(ivs[2], constants.iv_def)) { continue; }
        if (!check_iv_range(ivs[3], constants.iv_spa)) { continue; }
        if (!check_iv_range(ivs[4], constants.iv_spd)) { continue; }
        if (!check_iv_range(ivs[5], constants.iv_spe)) { continue; }

        // パック IV
        let packed = ivs[0]
                   | (ivs[1] << 5u)
                   | (ivs[2] << 10u)
                   | (ivs[3] << 15u)
                   | (ivs[4] << 20u)
                   | (ivs[5] << 25u);

        // 結果書き込み
        let match_idx = atomicAdd(&output_buffer.match_count, 1u);
        if (match_idx < state.candidate_capacity) {
            output_buffer.records[match_idx].seed = seed;
            output_buffer.records[match_idx].ivs_packed = packed;
        }
    }
}
