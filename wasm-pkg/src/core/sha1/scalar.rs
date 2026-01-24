//! SHA-1 スカラー実装

use super::{H0, H1, H2, H3, H4, HashValues, K, choice, left_rotate, majority, parity};

/// ポケモン BW/BW2 用 SHA-1 計算
///
/// # Arguments
/// * `message` - 16 ワードメッセージ
///
/// # Returns
/// `HashValues` (h0-h4)
#[allow(clippy::many_single_char_names)]
pub fn calculate_pokemon_sha1(message: &[u32; 16]) -> HashValues {
    // メッセージ拡張 (16 → 80 ワード)
    let mut w = [0u32; 80];
    w[..16].copy_from_slice(message);

    for i in 16..80 {
        w[i] = left_rotate(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }

    // 初期ハッシュ値
    let (mut a, mut b, mut c, mut d, mut e) = (H0, H1, H2, H3, H4);

    // 80 ラウンド処理
    for (i, &w_val) in w.iter().enumerate() {
        let (f, k) = match i {
            0..=19 => (choice(b, c, d), K[0]),
            20..=39 => (parity(b, c, d), K[1]),
            40..=59 => (majority(b, c, d), K[2]),
            _ => (parity(b, c, d), K[3]),
        };

        let temp = left_rotate(a, 5)
            .wrapping_add(f)
            .wrapping_add(e)
            .wrapping_add(k)
            .wrapping_add(w_val);

        e = d;
        d = c;
        c = left_rotate(b, 30);
        b = a;
        a = temp;
    }

    HashValues::new(
        H0.wrapping_add(a),
        H1.wrapping_add(b),
        H2.wrapping_add(c),
        H3.wrapping_add(d),
        H4.wrapping_add(e),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::sha1::message::{
        BaseMessageBuilder, build_date_code, build_time_code, get_frame,
    };
    use crate::core::sha1::nazo::get_nazo_values;
    use crate::types::{Hardware, KeyCode, RomRegion, RomVersion};

    /// 実計算値に基づくテストケース
    ///
    /// 検証条件:
    /// - ROM: White2 (JPN)
    /// - Hardware: DS
    /// - MAC: `00:1B:2C:3D:4E:5F`
    /// - Date/Time: 2006/03/11 18:53:27
    /// - Timer0: `0x10F8`
    /// - `VCount`: `0x82`
    /// - `keyCode`: `0x2FFF` (入力なし)
    ///
    /// 期待値:
    /// - SHA-1 Hash: `7ecdeb6e5c0cd020a31beaea01e4ade7b4f385eb`
    /// - LCG Seed: `0x20D00C5C6EEBCD7E`
    /// - MT Seed: `0xD2F057AD`
    #[test]
    fn test_sha1_with_real_case() {
        // パラメータ
        let nazo = get_nazo_values(RomVersion::White2, RomRegion::Jpn);
        let mac: [u8; 6] = [0x00, 0x1B, 0x2C, 0x3D, 0x4E, 0x5F];
        let hardware = Hardware::Ds;
        let frame = get_frame(hardware);
        let timer0: u16 = 0x10F8;
        let vcount: u8 = 0x82;
        let key_code = KeyCode::NONE;

        // メッセージ構築
        let mut builder = BaseMessageBuilder::new(&nazo, mac, vcount, timer0, key_code, frame);

        // 日時コード: 2006/03/11 18:53:27
        let date_code = build_date_code(2006, 3, 11);
        // DS/DS Lite は is_ds_or_lite = true (PM フラグが bit30 に設定される)
        let time_code = build_time_code(18, 53, 27, true);
        builder.set_datetime(date_code, time_code);

        // デバッグ: メッセージを出力
        let msg = builder.message();
        println!("Message:");
        for (i, &word) in msg.iter().enumerate() {
            println!("  [{i:2}]: 0x{word:08X}");
        }

        // SHA-1 計算
        let hash = calculate_pokemon_sha1(builder.message());

        println!(
            "Hash: {:08X} {:08X} {:08X} {:08X} {:08X}",
            hash.h0, hash.h1, hash.h2, hash.h3, hash.h4
        );

        // LCG Seed
        let lcg_seed = hash.to_lcg_seed();
        println!("LCG Seed: 0x{:016X}", lcg_seed.value());

        // MT Seed
        let mt_seed = hash.to_mt_seed();
        println!("MT Seed: 0x{:08X}", mt_seed.value());

        // SHA-1 ハッシュ検証: 7ecdeb6e5c0cd020a31beaea01e4ade7b4f385eb
        assert_eq!(hash.h0, 0x7ECD_EB6E, "h0 mismatch");
        assert_eq!(hash.h1, 0x5C0C_D020, "h1 mismatch");
        assert_eq!(hash.h2, 0xA31B_EAEA, "h2 mismatch");
        assert_eq!(hash.h3, 0x01E4_ADE7, "h3 mismatch");
        assert_eq!(hash.h4, 0xB4F3_85EB, "h4 mismatch");

        // LCG Seed 検証
        assert_eq!(
            lcg_seed.value(),
            0x20D0_0C5C_6EEB_CD7E,
            "LCG Seed mismatch: expected 0x20D00C5C6EEBCD7E, got 0x{:016X}",
            lcg_seed.value()
        );

        // MT Seed 検証
        assert_eq!(
            mt_seed.value(),
            0xD2F0_57AD,
            "MT Seed mismatch: expected 0xD2F057AD, got 0x{:08X}",
            mt_seed.value()
        );
    }

    /// SHA-1 計算の決定性テスト
    #[test]
    fn test_sha1_deterministic() {
        let nazo = get_nazo_values(RomVersion::White2, RomRegion::Jpn);
        let mac: [u8; 6] = [0x00, 0x1B, 0x2C, 0x3D, 0x4E, 0x5F];
        let frame = get_frame(Hardware::Ds);

        let mut builder = BaseMessageBuilder::new(&nazo, mac, 0x82, 0x10F8, KeyCode::NONE, frame);
        builder.set_datetime(
            build_date_code(2006, 3, 11),
            build_time_code(18, 53, 27, true),
        );

        let hash1 = calculate_pokemon_sha1(builder.message());
        let hash2 = calculate_pokemon_sha1(builder.message());

        assert_eq!(hash1, hash2, "SHA-1 should be deterministic");
    }

    /// `HashValues` の整合性テスト
    #[test]
    fn test_hash_values_consistency() {
        let nazo = get_nazo_values(RomVersion::White2, RomRegion::Jpn);
        let mac: [u8; 6] = [0x00, 0x1B, 0x2C, 0x3D, 0x4E, 0x5F];
        let frame = get_frame(Hardware::Ds);

        let mut builder = BaseMessageBuilder::new(&nazo, mac, 0x82, 0x10F8, KeyCode::NONE, frame);
        builder.set_datetime(
            build_date_code(2006, 3, 11),
            build_time_code(18, 53, 27, true),
        );

        let hash = calculate_pokemon_sha1(builder.message());

        // to_mt_seed() は to_lcg_seed().derive_mt_seed() と同じ結果を返すこと
        let mt_via_lcg = hash.to_lcg_seed().derive_mt_seed();
        let mt_direct = hash.to_mt_seed();

        assert_eq!(
            mt_via_lcg, mt_direct,
            "MT Seed derivation should be consistent"
        );
    }
}
