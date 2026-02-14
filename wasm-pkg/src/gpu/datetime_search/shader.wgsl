// MT Seed 起動時刻検索シェーダー
//
// SHA-1 ハッシュを計算し、ターゲット MT Seed とマッチングする。

// ワークグループサイズ (パイプライン作成時にRust側から注入)
override WORKGROUP_SIZE: u32 = 64u;

// 1 スレッドあたりの処理アイテム数 (パイプライン作成時に注入)
// 値を増やすとディスパッチ回数が減り、WASM 非同期境界オーバーヘッドを削減できる。
override ITEMS_PER_THREAD: u32 = 1u;

// ===== バッファ構造体 =====

struct DispatchState {
    /// 処理するメッセージ数
    message_count: u32,
    /// 基準秒オフセット (開始時刻からの経過秒)
    base_second_offset: u32,
    /// 候補バッファ容量
    candidate_capacity: u32,
    /// パディング
    padding: u32,
};

struct SearchConstants {
    /// Timer0 | (VCount << 16) (バイトスワップ済み)
    timer0_vcount_swapped: u32,
    /// MAC アドレス下位4バイト
    mac_lower: u32,
    /// データ7 (バイトスワップ済み)
    data7_swapped: u32,
    /// キー入力 (バイトスワップ済み)
    key_input_swapped: u32,
    /// ハードウェアタイプ (0: DS, 1: DSLite, 2: DSi, 3: 3DS)
    hardware_type: u32,
    /// 開始年 (2000-2099)
    start_year: u32,
    /// 開始日 (年内通算日、1-366)
    start_day_of_year: u32,
    /// 開始曜日 (0: 日曜 - 6: 土曜)
    start_day_of_week: u32,
    /// 時間範囲開始
    hour_range_start: u32,
    /// 時間範囲カウント
    hour_range_count: u32,
    /// 分範囲開始
    minute_range_start: u32,
    /// 分範囲カウント
    minute_range_count: u32,
    /// 秒範囲開始
    second_range_start: u32,
    /// 秒範囲カウント
    second_range_count: u32,
    /// NAZO 値 (5ワード)
    nazo0: u32,
    nazo1: u32,
    nazo2: u32,
    nazo3: u32,
    nazo4: u32,
    /// 予約
    reserved0: u32,
};

struct TargetSeedBuffer {
    /// ターゲット数
    count: u32,
    /// ターゲット MT Seed 配列
    values: array<u32>,
};

struct MatchRecord {
    /// マッチしたメッセージインデックス
    message_index: u32,
    /// SHA-1 ハッシュ h0
    h0: u32,
    /// SHA-1 ハッシュ h1
    h1: u32,
    /// パディング (アライメント用)
    padding: u32,
};

struct MatchOutputBuffer {
    /// マッチ数 (atomic)
    match_count: atomic<u32>,
    /// マッチレコード配列
    records: array<MatchRecord>,
};

// ===== バインディング =====

@group(0) @binding(0) var<storage, read> state: DispatchState;
@group(0) @binding(1) var<uniform> constants: SearchConstants;
@group(0) @binding(2) var<storage, read> target_seeds: TargetSeedBuffer;
@group(0) @binding(3) var<storage, read_write> output_buffer: MatchOutputBuffer;

// ===== 月の日数テーブル =====

const MONTH_LENGTHS_COMMON: array<u32, 12> = array<u32, 12>(
    31u, 28u, 31u, 30u, 31u, 30u, 31u, 31u, 30u, 31u, 30u, 31u
);

const MONTH_LENGTHS_LEAP: array<u32, 12> = array<u32, 12>(
    31u, 29u, 31u, 30u, 31u, 30u, 31u, 31u, 30u, 31u, 30u, 31u
);

// ===== BCD ルックアップテーブル (0-99) =====

const BCD_LOOKUP: array<u32, 100> = array<u32, 100>(
    0x00u, 0x01u, 0x02u, 0x03u, 0x04u, 0x05u, 0x06u, 0x07u, 0x08u, 0x09u,
    0x10u, 0x11u, 0x12u, 0x13u, 0x14u, 0x15u, 0x16u, 0x17u, 0x18u, 0x19u,
    0x20u, 0x21u, 0x22u, 0x23u, 0x24u, 0x25u, 0x26u, 0x27u, 0x28u, 0x29u,
    0x30u, 0x31u, 0x32u, 0x33u, 0x34u, 0x35u, 0x36u, 0x37u, 0x38u, 0x39u,
    0x40u, 0x41u, 0x42u, 0x43u, 0x44u, 0x45u, 0x46u, 0x47u, 0x48u, 0x49u,
    0x50u, 0x51u, 0x52u, 0x53u, 0x54u, 0x55u, 0x56u, 0x57u, 0x58u, 0x59u,
    0x60u, 0x61u, 0x62u, 0x63u, 0x64u, 0x65u, 0x66u, 0x67u, 0x68u, 0x69u,
    0x70u, 0x71u, 0x72u, 0x73u, 0x74u, 0x75u, 0x76u, 0x77u, 0x78u, 0x79u,
    0x80u, 0x81u, 0x82u, 0x83u, 0x84u, 0x85u, 0x86u, 0x87u, 0x88u, 0x89u,
    0x90u, 0x91u, 0x92u, 0x93u, 0x94u, 0x95u, 0x96u, 0x97u, 0x98u, 0x99u
);

// ===== ヘルパー関数 =====

/// 左回転
fn left_rotate(value: u32, amount: u32) -> u32 {
    return (value << amount) | (value >> (32u - amount));
}

/// 閏年判定
fn is_leap_year(year: u32) -> bool {
    return (year % 4u == 0u) && ((year % 100u != 0u) || (year % 400u == 0u));
}

/// 年内通算日から月と日を計算
fn month_day_from_day_of_year(day_of_year: u32, leap: bool) -> vec2<u32> {
    var remaining = day_of_year;
    var month = 1u;
    for (var i = 0u; i < 12u; i = i + 1u) {
        let length = select(MONTH_LENGTHS_COMMON[i], MONTH_LENGTHS_LEAP[i], leap);
        if (remaining <= length) {
            return vec2<u32>(month, remaining);
        }
        remaining = remaining - length;
        month = month + 1u;
    }
    return vec2<u32>(12u, 31u);
}

/// ターゲット Seed との線形探索マッチング
fn linear_search(code: u32) -> bool {
    for (var i = 0u; i < target_seeds.count; i = i + 1u) {
        if (target_seeds.values[i] == code) {
            return true;
        }
    }
    return false;
}

// ===== 64bit 演算補助構造体 =====

struct WideProduct {
    lo: u32,
    hi: u32,
};

struct CarryResult {
    sum: u32,
    carry: u32,
};

/// 32bit x 32bit -> 64bit 乗算
fn mulExtended(a: u32, b: u32) -> WideProduct {
    let a_lo = a & 0xFFFFu;
    let a_hi = a >> 16u;
    let b_lo = b & 0xFFFFu;
    let b_hi = b >> 16u;

    let low = a_lo * b_lo;
    let mid1 = a_lo * b_hi;
    let mid2 = a_hi * b_lo;
    let high = a_hi * b_hi;

    let carry_mid = (low >> 16u) + (mid1 & 0xFFFFu) + (mid2 & 0xFFFFu);
    let lo = (low & 0xFFFFu) | ((carry_mid & 0xFFFFu) << 16u);
    let hi = high + (mid1 >> 16u) + (mid2 >> 16u) + (carry_mid >> 16u);

    return WideProduct(lo, hi);
}

/// キャリー付き加算
fn addCarry(a: u32, b: u32) -> CarryResult {
    let sum = a + b;
    let carry = select(0u, 1u, sum < a);
    return CarryResult(sum, carry);
}

/// SHA-1 ハッシュから MT Seed を計算 (64bit LCG 演算)
fn compute_seed_from_hash(h0: u32, h1: u32) -> u32 {
    // リトルエンディアン変換
    let le0 = ((h0 & 0x000000FFu) << 24u) |
              ((h0 & 0x0000FF00u) << 8u) |
              ((h0 & 0x00FF0000u) >> 8u) |
              ((h0 & 0xFF000000u) >> 24u);
    let le1 = ((h1 & 0x000000FFu) << 24u) |
              ((h1 & 0x0000FF00u) << 8u) |
              ((h1 & 0x00FF0000u) >> 8u) |
              ((h1 & 0xFF000000u) >> 24u);

    let mul_lo: u32 = 0x6C078965u;
    let mul_hi: u32 = 0x5D588B65u;
    let increment: u32 = 0x00269EC3u;

    let prod0 = mulExtended(le0, mul_lo);
    let prod1 = mulExtended(le0, mul_hi);
    let prod2 = mulExtended(le1, mul_lo);
    let inc = addCarry(prod0.lo, increment);

    // ((le1<<32 | le0) * multiplier + increment) の上位32bit
    var upper_word = prod0.hi;
    upper_word = upper_word + prod1.lo;
    upper_word = upper_word + prod2.lo;
    upper_word = upper_word + inc.carry;

    return upper_word;
}

// ===== メインカーネル =====

@compute @workgroup_size(WORKGROUP_SIZE)
fn sha1_generate(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let base_idx = global_id.x * ITEMS_PER_THREAD;

    for (var item_k = 0u; item_k < ITEMS_PER_THREAD; item_k = item_k + 1u) {
        let idx = base_idx + item_k;
        if (idx >= state.message_count) {
            return;
        }

    // 時刻範囲から日時を計算
    let combos_per_day = max(constants.hour_range_count, 1u)
                       * max(constants.minute_range_count, 1u)
                       * max(constants.second_range_count, 1u);
    let total_offset = state.base_second_offset + idx;

    let day_offset = total_offset / combos_per_day;
    let remainder = total_offset - day_offset * combos_per_day;

    let entries_per_hour = max(constants.minute_range_count, 1u) 
                         * max(constants.second_range_count, 1u);
    let hour_index = remainder / entries_per_hour;
    let remainder2 = remainder - hour_index * entries_per_hour;
    let minute_index = remainder2 / max(constants.second_range_count, 1u);
    let second_index = remainder2 - minute_index * max(constants.second_range_count, 1u);

    let hour = constants.hour_range_start + hour_index;
    let minute = constants.minute_range_start + minute_index;
    let second = constants.second_range_start + second_index;

    // 年・月・日を計算
    var year = constants.start_year;
    var day_of_year = constants.start_day_of_year + day_offset;
    loop {
        let year_length = select(365u, 366u, is_leap_year(year));
        if (day_of_year <= year_length) { break; }
        day_of_year = day_of_year - year_length;
        year = year + 1u;
    }

    let leap = is_leap_year(year);
    let month_day = month_day_from_day_of_year(day_of_year, leap);
    let month = month_day.x;
    let day = month_day.y;
    let day_of_week = (constants.start_day_of_week + day_offset) % 7u;

    // BCD 形式で日時ワードを構築
    let year_mod = year % 100u;
    let date_word = (BCD_LOOKUP[year_mod] << 24u) |
                    (BCD_LOOKUP[month] << 16u) |
                    (BCD_LOOKUP[day] << 8u) |
                    BCD_LOOKUP[day_of_week];

    let is_pm = (constants.hardware_type <= 1u) && (hour >= 12u);
    let pm_flag = select(0u, 1u, is_pm);
    let time_word = (pm_flag << 30u) |
                    (BCD_LOOKUP[hour] << 24u) |
                    (BCD_LOOKUP[minute] << 16u) |
                    (BCD_LOOKUP[second] << 8u);

    // SHA-1 メッセージ構築 (13 ワード + パディング)
    var w: array<u32, 16>;
    w[0] = constants.nazo0;
    w[1] = constants.nazo1;
    w[2] = constants.nazo2;
    w[3] = constants.nazo3;
    w[4] = constants.nazo4;
    w[5] = constants.timer0_vcount_swapped;
    w[6] = constants.mac_lower;
    w[7] = constants.data7_swapped;
    w[8] = date_word;
    w[9] = time_word;
    w[10] = 0u;
    w[11] = 0u;
    w[12] = constants.key_input_swapped;
    w[13] = 0x80000000u;  // パディング開始
    w[14] = 0u;
    w[15] = 0x000001A0u;  // メッセージ長 (52 * 8 = 416 = 0x1A0)

    // SHA-1 計算 (インライン展開)
    var a: u32 = 0x67452301u;
    var b: u32 = 0xEFCDAB89u;
    var c: u32 = 0x98BADCFEu;
    var d: u32 = 0x10325476u;
    var e: u32 = 0xC3D2E1F0u;

    // Round 0-19: f = (b & c) | ((~b) & d), k = 0x5A827999
    var i: u32 = 0u;
    for (; i < 20u; i = i + 1u) {
        let w_index = i & 15u;
        var w_value: u32;
        if (i < 16u) {
            w_value = w[w_index];
        } else {
            let expanded = w[(i - 3u) & 15u] ^ w[(i - 8u) & 15u] ^ w[(i - 14u) & 15u] ^ w[w_index];
            let rotated = left_rotate(expanded, 1u);
            w[w_index] = rotated;
            w_value = rotated;
        }

        let temp = left_rotate(a, 5u) + ((b & c) | ((~b) & d)) + e + 0x5A827999u + w_value;
        e = d;
        d = c;
        c = left_rotate(b, 30u);
        b = a;
        a = temp;
    }

    // Round 20-39: f = b ^ c ^ d, k = 0x6ED9EBA1
    for (; i < 40u; i = i + 1u) {
        let w_index = i & 15u;
        let expanded = w[(i - 3u) & 15u] ^ w[(i - 8u) & 15u] ^ w[(i - 14u) & 15u] ^ w[w_index];
        let rotated = left_rotate(expanded, 1u);
        w[w_index] = rotated;

        let temp = left_rotate(a, 5u) + (b ^ c ^ d) + e + 0x6ED9EBA1u + rotated;
        e = d;
        d = c;
        c = left_rotate(b, 30u);
        b = a;
        a = temp;
    }

    // Round 40-59: f = (b & c) | (b & d) | (c & d), k = 0x8F1BBCDC
    for (; i < 60u; i = i + 1u) {
        let w_index = i & 15u;
        let expanded = w[(i - 3u) & 15u] ^ w[(i - 8u) & 15u] ^ w[(i - 14u) & 15u] ^ w[w_index];
        let rotated = left_rotate(expanded, 1u);
        w[w_index] = rotated;

        let temp = left_rotate(a, 5u) + ((b & c) | (b & d) | (c & d)) + e + 0x8F1BBCDCu + rotated;
        e = d;
        d = c;
        c = left_rotate(b, 30u);
        b = a;
        a = temp;
    }

    // Round 60-79: f = b ^ c ^ d, k = 0xCA62C1D6
    for (; i < 80u; i = i + 1u) {
        let w_index = i & 15u;
        let expanded = w[(i - 3u) & 15u] ^ w[(i - 8u) & 15u] ^ w[(i - 14u) & 15u] ^ w[w_index];
        let rotated = left_rotate(expanded, 1u);
        w[w_index] = rotated;

        let temp = left_rotate(a, 5u) + (b ^ c ^ d) + e + 0xCA62C1D6u + rotated;
        e = d;
        d = c;
        c = left_rotate(b, 30u);
        b = a;
        a = temp;
    }

    let h0 = 0x67452301u + a;
    let h1 = 0xEFCDAB89u + b;

    // MT Seed = SHA-1 ハッシュから 64bit LCG 演算で導出
    let mt_seed = compute_seed_from_hash(h0, h1);

    // ターゲットとマッチ判定
    if (linear_search(mt_seed)) {
        let match_idx = atomicAdd(&output_buffer.match_count, 1u);
        if (match_idx < state.candidate_capacity) {
            output_buffer.records[match_idx].message_index = idx;
            output_buffer.records[match_idx].h0 = h0;
            output_buffer.records[match_idx].h1 = h1;
            output_buffer.records[match_idx].padding = 0u;
        }
    }

    } // end ITEMS_PER_THREAD loop
}
