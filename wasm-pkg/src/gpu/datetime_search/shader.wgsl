// MT Seed 起動時刻検索シェーダー
//
// SHA-1 ハッシュを計算し、ターゲット MT Seed とマッチングする。

// ワークグループサイズ (Rust 側で動的に置換)
const WORKGROUP_SIZE: u32 = WORKGROUP_SIZE_PLACEHOLDERu;

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
    /// マッチした MT Seed
    seed: u32,
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
    var day = day_of_year;
    let feb = select(28u, 29u, leap);
    let months = array<u32, 12>(31u, feb, 31u, 30u, 31u, 30u, 31u, 31u, 30u, 31u, 30u, 31u);
    
    for (var m = 0u; m < 12u; m = m + 1u) {
        if (day <= months[m]) {
            return vec2<u32>(m + 1u, day);
        }
        day = day - months[m];
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

/// SHA-1 圧縮関数
fn sha1_compress(w_in: array<u32, 16>) -> array<u32, 5> {
    var w = w_in;
    var a: u32 = 0x67452301u;
    var b: u32 = 0xEFCDAB89u;
    var c: u32 = 0x98BADCFEu;
    var d: u32 = 0x10325476u;
    var e: u32 = 0xC3D2E1F0u;

    for (var i: u32 = 0u; i < 80u; i = i + 1u) {
        let w_index = i & 15u;
        var w_value: u32;
        if (i < 16u) {
            w_value = w[w_index];
        } else {
            w_value = left_rotate(
                w[(w_index + 13u) & 15u] ^
                w[(w_index + 8u) & 15u] ^
                w[(w_index + 2u) & 15u] ^
                w[w_index],
                1u
            );
            w[w_index] = w_value;
        }

        var f: u32;
        var k: u32;
        if (i < 20u) {
            f = (b & c) | ((~b) & d);
            k = 0x5A827999u;
        } else if (i < 40u) {
            f = b ^ c ^ d;
            k = 0x6ED9EBA1u;
        } else if (i < 60u) {
            f = (b & c) | (b & d) | (c & d);
            k = 0x8F1BBCDCu;
        } else {
            f = b ^ c ^ d;
            k = 0xCA62C1D6u;
        }

        let temp = left_rotate(a, 5u) + f + e + k + w_value;
        e = d;
        d = c;
        c = left_rotate(b, 30u);
        b = a;
        a = temp;
    }

    return array<u32, 5>(
        0x67452301u + a,
        0xEFCDAB89u + b,
        0x98BADCFEu + c,
        0x10325476u + d,
        0xC3D2E1F0u + e
    );
}

// ===== メインカーネル =====

@compute @workgroup_size(WORKGROUP_SIZE)
fn sha1_generate(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let idx = global_id.x;
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

    // SHA-1 計算
    let hash = sha1_compress(w);

    // MT Seed = hash[0] (上位 32bit)
    let mt_seed = hash[0];

    // ターゲットとマッチ判定
    if (linear_search(mt_seed)) {
        let match_idx = atomicAdd(&output_buffer.match_count, 1u);
        if (match_idx < state.candidate_capacity) {
            output_buffer.records[match_idx].message_index = idx;
            output_buffer.records[match_idx].seed = mt_seed;
        }
    }
}
