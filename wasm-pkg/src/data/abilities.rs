//! 特性データテーブル
//!
//! このファイルは自動生成されています。直接編集しないでください。
//! 生成コマンド: node scripts/generate-species-data.js

use super::species::get_species_entry;
use crate::types::AbilitySlot;

/// 特性名テーブル: (日本語名, 英語名)
/// インデックス 0 は「なし」を表す空文字列
pub static ABILITY_NAMES: [(&str, &str); 165] = [
    // 0: (none)
    ("", ""),
    // 1: overgrow
    ("しんりょく", "Overgrow"),
    // 2: chlorophyll
    ("ようりょくそ", "Chlorophyll"),
    // 3: blaze
    ("もうか", "Blaze"),
    // 4: solar-power
    ("サンパワー", "Solar Power"),
    // 5: torrent
    ("げきりゅう", "Torrent"),
    // 6: rain-dish
    ("あめうけざら", "Rain Dish"),
    // 7: shield-dust
    ("りんぷん", "Shield Dust"),
    // 8: run-away
    ("にげあし", "Run Away"),
    // 9: shed-skin
    ("だっぴ", "Shed Skin"),
    // 10: compound-eyes
    ("ふくがん", "Compound Eyes"),
    // 11: tinted-lens
    ("いろめがね", "Tinted Lens"),
    // 12: swarm
    ("むしのしらせ", "Swarm"),
    // 13: sniper
    ("スナイパー", "Sniper"),
    // 14: keen-eye
    ("するどいめ", "Keen Eye"),
    // 15: tangled-feet
    ("ちどりあし", "Tangled Feet"),
    // 16: big-pecks
    ("はとむね", "Big Pecks"),
    // 17: guts
    ("こんじょう", "Guts"),
    // 18: hustle
    ("はりきり", "Hustle"),
    // 19: intimidate
    ("いかく", "Intimidate"),
    // 20: unnerve
    ("きんちょうかん", "Unnerve"),
    // 21: static
    ("せいでんき", "Static"),
    // 22: lightning-rod
    ("ひらいしん", "Lightning Rod"),
    // 23: sand-veil
    ("すながくれ", "Sand Veil"),
    // 24: sand-rush
    ("すなかき", "Sand Rush"),
    // 25: poison-point
    ("どくのトゲ", "Poison Point"),
    // 26: rivalry
    ("とうそうしん", "Rivalry"),
    // 27: sheer-force
    ("ちからずく", "Sheer Force"),
    // 28: cute-charm
    ("メロメロボディ", "Cute Charm"),
    // 29: magic-guard
    ("マジックガード", "Magic Guard"),
    // 30: friend-guard
    ("フレンドガード", "Friend Guard"),
    // 31: unaware
    ("てんねん", "Unaware"),
    // 32: flash-fire
    ("もらいび", "Flash Fire"),
    // 33: drought
    ("ひでり", "Drought"),
    // 34: frisk
    ("おみとおし", "Frisk"),
    // 35: inner-focus
    ("せいしんりょく", "Inner Focus"),
    // 36: infiltrator
    ("すりぬけ", "Infiltrator"),
    // 37: stench
    ("あくしゅう", "Stench"),
    // 38: effect-spore
    ("ほうし", "Effect Spore"),
    // 39: dry-skin
    ("かんそうはだ", "Dry Skin"),
    // 40: damp
    ("しめりけ", "Damp"),
    // 41: wonder-skin
    ("ミラクルスキン", "Wonder Skin"),
    // 42: arena-trap
    ("ありじごく", "Arena Trap"),
    // 43: sand-force
    ("すなのちから", "Sand Force"),
    // 44: pickup
    ("ものひろい", "Pickup"),
    // 45: technician
    ("テクニシャン", "Technician"),
    // 46: limber
    ("じゅうなん", "Limber"),
    // 47: cloud-nine
    ("ノーてんき", "Cloud Nine"),
    // 48: swift-swim
    ("すいすい", "Swift Swim"),
    // 49: vital-spirit
    ("やるき", "Vital Spirit"),
    // 50: anger-point
    ("いかりのつぼ", "Anger Point"),
    // 51: defiant
    ("まけんき", "Defiant"),
    // 52: justified
    ("せいぎのこころ", "Justified"),
    // 53: water-absorb
    ("ちょすい", "Water Absorb"),
    // 54: synchronize
    ("シンクロ", "Synchronize"),
    // 55: no-guard
    ("ノーガード", "No Guard"),
    // 56: steadfast
    ("ふくつのこころ", "Steadfast"),
    // 57: gluttony
    ("くいしんぼう", "Gluttony"),
    // 58: clear-body
    ("クリアボディ", "Clear Body"),
    // 59: liquid-ooze
    ("ヘドロえき", "Liquid Ooze"),
    // 60: rock-head
    ("いしあたま", "Rock Head"),
    // 61: sturdy
    ("がんじょう", "Sturdy"),
    // 62: flame-body
    ("ほのおのからだ", "Flame Body"),
    // 63: oblivious
    ("どんかん", "Oblivious"),
    // 64: own-tempo
    ("マイペース", "Own Tempo"),
    // 65: regenerator
    ("さいせいりょく", "Regenerator"),
    // 66: magnet-pull
    ("じりょく", "Magnet Pull"),
    // 67: analytic
    ("アナライズ", "Analytic"),
    // 68: early-bird
    ("はやおき", "Early Bird"),
    // 69: thick-fat
    ("あついしぼう", "Thick Fat"),
    // 70: hydration
    ("うるおいボディ", "Hydration"),
    // 71: ice-body
    ("アイスボディ", "Ice Body"),
    // 72: sticky-hold
    ("ねんちゃく", "Sticky Hold"),
    // 73: poison-touch
    ("どくしゅ", "Poison Touch"),
    // 74: shell-armor
    ("シェルアーマー", "Shell Armor"),
    // 75: skill-link
    ("スキルリンク", "Skill Link"),
    // 76: overcoat
    ("ぼうじん", "Overcoat"),
    // 77: levitate
    ("ふゆう", "Levitate"),
    // 78: weak-armor
    ("くだけるよろい", "Weak Armor"),
    // 79: insomnia
    ("ふみん", "Insomnia"),
    // 80: forewarn
    ("よちむ", "Forewarn"),
    // 81: hyper-cutter
    ("かいりきバサミ", "Hyper Cutter"),
    // 82: soundproof
    ("ぼうおん", "Soundproof"),
    // 83: aftermath
    ("ゆうばく", "Aftermath"),
    // 84: harvest
    ("しゅうかく", "Harvest"),
    // 85: battle-armor
    ("カブトアーマー", "Battle Armor"),
    // 86: reckless
    ("すてみ", "Reckless"),
    // 87: unburden
    ("かるわざ", "Unburden"),
    // 88: iron-fist
    ("てつのこぶし", "Iron Fist"),
    // 89: natural-cure
    ("しぜんかいふく", "Natural Cure"),
    // 90: serene-grace
    ("てんのめぐみ", "Serene Grace"),
    // 91: healer
    ("いやしのこころ", "Healer"),
    // 92: leaf-guard
    ("リーフガード", "Leaf Guard"),
    // 93: scrappy
    ("きもったま", "Scrappy"),
    // 94: water-veil
    ("みずのベール", "Water Veil"),
    // 95: illuminate
    ("はっこう", "Illuminate"),
    // 96: filter
    ("フィルター", "Filter"),
    // 97: mold-breaker
    ("かたやぶり", "Mold Breaker"),
    // 98: moxie
    ("じしんかじょう", "Moxie"),
    // 99: rattled
    ("びびり", "Rattled"),
    // 100: imposter
    ("かわりもの", "Imposter"),
    // 101: adaptability
    ("てきおうりょく", "Adaptability"),
    // 102: anticipation
    ("きけんよち", "Anticipation"),
    // 103: volt-absorb
    ("ちくでん", "Volt Absorb"),
    // 104: quick-feet
    ("はやあし", "Quick Feet"),
    // 105: trace
    ("トレース", "Trace"),
    // 106: download
    ("ダウンロード", "Download"),
    // 107: pressure
    ("プレッシャー", "Pressure"),
    // 108: immunity
    ("めんえき", "Immunity"),
    // 109: snow-cloak
    ("ゆきがくれ", "Snow Cloak"),
    // 110: marvel-scale
    ("ふしぎなうろこ", "Marvel Scale"),
    // 111: multiscale
    ("マルチスケイル", "Multiscale"),
    // 112: super-luck
    ("きょううん", "Super Luck"),
    // 113: magic-bounce
    ("マジックミラー", "Magic Bounce"),
    // 114: plus
    ("プラス", "Plus"),
    // 115: huge-power
    ("ちからもち", "Huge Power"),
    // 116: sap-sipper
    ("そうしょく", "Sap Sipper"),
    // 117: drizzle
    ("あめふらし", "Drizzle"),
    // 118: speed-boost
    ("かそく", "Speed Boost"),
    // 119: prankster
    ("いたずらごころ", "Prankster"),
    // 120: shadow-tag
    ("かげふみ", "Shadow Tag"),
    // 121: telepathy
    ("テレパシー", "Telepathy"),
    // 122: light-metal
    ("ライトメタル", "Light Metal"),
    // 123: contrary
    ("あまのじゃく", "Contrary"),
    // 124: pickpocket
    ("わるいてぐせ", "Pickpocket"),
    // 125: honey-gather
    ("みつあつめ", "Honey Gather"),
    // 126: magma-armor
    ("マグマのよろい", "Magma Armor"),
    // 127: moody
    ("ムラっけ", "Moody"),
    // 128: suction-cups
    ("きゅうばん", "Suction Cups"),
    // 129: sand-stream
    ("すなおこし", "Sand Stream"),
    // 130: poison-heal
    ("ポイズンヒール", "Poison Heal"),
    // 131: truant
    ("なまけ", "Truant"),
    // 132: wonder-guard
    ("ふしぎなまもり", "Wonder Guard"),
    // 133: normalize
    ("ノーマルスキン", "Normalize"),
    // 134: stall
    ("あとだし", "Stall"),
    // 135: heavy-metal
    ("ヘヴィメタル", "Heavy Metal"),
    // 136: pure-power
    ("ヨガパワー", "Pure Power"),
    // 137: minus
    ("マイナス", "Minus"),
    // 138: rough-skin
    ("さめはだ", "Rough Skin"),
    // 139: simple
    ("たんじゅん", "Simple"),
    // 140: solid-rock
    ("ハードロック", "Solid Rock"),
    // 141: white-smoke
    ("しろいけむり", "White Smoke"),
    // 142: toxic-boost
    ("どくぼうそう", "Toxic Boost"),
    // 143: storm-drain
    ("よびみず", "Storm Drain"),
    // 144: forecast
    ("てんきや", "Forecast"),
    // 145: color-change
    ("へんしょく", "Color Change"),
    // 146: cursed-body
    ("のろわれボディ", "Cursed Body"),
    // 147: air-lock
    ("エアロック", "Air Lock"),
    // 148: flower-gift
    ("フラワーギフト", "Flower Gift"),
    // 149: flare-boost
    ("ねつぼうそう", "Flare Boost"),
    // 150: klutz
    ("ぶきよう", "Klutz"),
    // 151: heatproof
    ("たいねつ", "Heatproof"),
    // 152: snow-warning
    ("ゆきふらし", "Snow Warning"),
    // 153: motor-drive
    ("でんきエンジン", "Motor Drive"),
    // 154: slow-start
    ("スロースタート", "Slow Start"),
    // 155: bad-dreams
    ("ナイトメア", "Bad Dreams"),
    // 156: multitype
    ("マルチタイプ", "Multitype"),
    // 157: victory-star
    ("しょうりのほし", "Victory Star"),
    // 158: zen-mode
    ("ダルマモード", "Zen Mode"),
    // 159: mummy
    ("ミイラ", "Mummy"),
    // 160: defeatist
    ("よわき", "Defeatist"),
    // 161: illusion
    ("イリュージョン", "Illusion"),
    // 162: iron-barbs
    ("てつのトゲ", "Iron Barbs"),
    // 163: turboblaze
    ("ターボブレイズ", "Turboblaze"),
    // 164: teravolt
    ("テラボルテージ", "Teravolt"),
];

/// 特性名を取得
///
/// # Arguments
/// * `species_id` - 全国図鑑番号 (1-649)
/// * `slot` - 特性スロット
/// * `locale` - ロケール ("ja" または "en")
///
/// # Returns
/// 特性名。見つからない場合は "???" を返す。
pub fn get_ability_name(species_id: u16, slot: AbilitySlot, locale: &str) -> &'static str {
    let entry = get_species_entry(species_id);
    let ability_id = match slot {
        AbilitySlot::First => entry.ability_ids[0],
        AbilitySlot::Second => entry.ability_ids[1],
        AbilitySlot::Hidden => entry.ability_ids[2],
    } as usize;

    // 特性2がない場合は特性1にフォールバック
    let ability_id = if ability_id == 0 && matches!(slot, AbilitySlot::Second) {
        entry.ability_ids[0] as usize
    } else {
        ability_id
    };

    if ability_id >= ABILITY_NAMES.len() {
        return "???";
    }

    let (ja, en) = ABILITY_NAMES[ability_id];
    match locale {
        "ja" => {
            if ja.is_empty() {
                "???"
            } else {
                ja
            }
        }
        _ => {
            if en.is_empty() {
                "???"
            } else {
                en
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_ability_name_bulbasaur_first() {
        // フシギダネの特性1: しんりょく/Overgrow
        let ja = get_ability_name(1, AbilitySlot::First, "ja");
        let en = get_ability_name(1, AbilitySlot::First, "en");
        assert_eq!(ja, "しんりょく");
        assert_eq!(en, "Overgrow");
    }

    #[test]
    fn test_get_ability_name_bulbasaur_hidden() {
        // フシギダネの夢特性: ようりょくそ/Chlorophyll
        let ja = get_ability_name(1, AbilitySlot::Hidden, "ja");
        let en = get_ability_name(1, AbilitySlot::Hidden, "en");
        assert_eq!(ja, "ようりょくそ");
        assert_eq!(en, "Chlorophyll");
    }

    #[test]
    fn test_get_ability_name_fallback_to_first() {
        // 特性2がない場合、特性1にフォールバック
        // フシギダネは特性2がない
        let ja = get_ability_name(1, AbilitySlot::Second, "ja");
        assert_eq!(ja, "しんりょく");
    }

    #[test]
    fn test_get_ability_name_gen5_corrected_slots() {
        assert_eq!(
            get_ability_name(525, AbilitySlot::Second, "ja"),
            "がんじょう"
        );
        assert_eq!(get_ability_name(525, AbilitySlot::Second, "en"), "Sturdy");
        assert_eq!(get_ability_name(94, AbilitySlot::First, "ja"), "ふゆう");
        assert_eq!(get_ability_name(94, AbilitySlot::First, "en"), "Levitate");
        assert_eq!(get_ability_name(393, AbilitySlot::Hidden, "ja"), "まけんき");
        assert_eq!(get_ability_name(393, AbilitySlot::Hidden, "en"), "Defiant");
    }

    #[test]
    fn test_get_ability_name_missing_hidden_ability_returns_unknown() {
        assert_eq!(get_ability_name(396, AbilitySlot::Hidden, "ja"), "???");
        assert_eq!(get_ability_name(396, AbilitySlot::Hidden, "en"), "???");
    }
}
