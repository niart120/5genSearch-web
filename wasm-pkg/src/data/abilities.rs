//! 特性データテーブル
//!
//! このファイルは自動生成されています。直接編集しないでください。
//! 生成コマンド: node scripts/generate-species-data.js

use super::species::get_species_entry;
use crate::types::AbilitySlot;

/// 特性名テーブル: (日本語名, 英語名)
/// インデックス 0 は「なし」を表す空文字列
pub static ABILITY_NAMES: [(&str, &str); 171] = [
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
    // 34: competitive
    ("かちき", "Competitive"),
    // 35: frisk
    ("おみとおし", "Frisk"),
    // 36: inner-focus
    ("せいしんりょく", "Inner Focus"),
    // 37: infiltrator
    ("すりぬけ", "Infiltrator"),
    // 38: stench
    ("あくしゅう", "Stench"),
    // 39: effect-spore
    ("ほうし", "Effect Spore"),
    // 40: dry-skin
    ("かんそうはだ", "Dry Skin"),
    // 41: damp
    ("しめりけ", "Damp"),
    // 42: wonder-skin
    ("ミラクルスキン", "Wonder Skin"),
    // 43: arena-trap
    ("ありじごく", "Arena Trap"),
    // 44: sand-force
    ("すなのちから", "Sand Force"),
    // 45: pickup
    ("ものひろい", "Pickup"),
    // 46: technician
    ("テクニシャン", "Technician"),
    // 47: limber
    ("じゅうなん", "Limber"),
    // 48: cloud-nine
    ("ノーてんき", "Cloud Nine"),
    // 49: swift-swim
    ("すいすい", "Swift Swim"),
    // 50: vital-spirit
    ("やるき", "Vital Spirit"),
    // 51: anger-point
    ("いかりのつぼ", "Anger Point"),
    // 52: defiant
    ("まけんき", "Defiant"),
    // 53: justified
    ("せいぎのこころ", "Justified"),
    // 54: water-absorb
    ("ちょすい", "Water Absorb"),
    // 55: synchronize
    ("シンクロ", "Synchronize"),
    // 56: no-guard
    ("ノーガード", "No Guard"),
    // 57: steadfast
    ("ふくつのこころ", "Steadfast"),
    // 58: gluttony
    ("くいしんぼう", "Gluttony"),
    // 59: clear-body
    ("クリアボディ", "Clear Body"),
    // 60: liquid-ooze
    ("ヘドロえき", "Liquid Ooze"),
    // 61: rock-head
    ("いしあたま", "Rock Head"),
    // 62: sturdy
    ("がんじょう", "Sturdy"),
    // 63: flame-body
    ("ほのおのからだ", "Flame Body"),
    // 64: oblivious
    ("どんかん", "Oblivious"),
    // 65: own-tempo
    ("マイペース", "Own Tempo"),
    // 66: regenerator
    ("さいせいりょく", "Regenerator"),
    // 67: magnet-pull
    ("じりょく", "Magnet Pull"),
    // 68: analytic
    ("アナライズ", "Analytic"),
    // 69: early-bird
    ("はやおき", "Early Bird"),
    // 70: thick-fat
    ("あついしぼう", "Thick Fat"),
    // 71: hydration
    ("うるおいボディ", "Hydration"),
    // 72: ice-body
    ("アイスボディ", "Ice Body"),
    // 73: sticky-hold
    ("ねんちゃく", "Sticky Hold"),
    // 74: poison-touch
    ("どくしゅ", "Poison Touch"),
    // 75: shell-armor
    ("シェルアーマー", "Shell Armor"),
    // 76: skill-link
    ("スキルリンク", "Skill Link"),
    // 77: overcoat
    ("ぼうじん", "Overcoat"),
    // 78: levitate
    ("ふゆう", "Levitate"),
    // 79: cursed-body
    ("のろわれボディ", "Cursed Body"),
    // 80: weak-armor
    ("くだけるよろい", "Weak Armor"),
    // 81: insomnia
    ("ふみん", "Insomnia"),
    // 82: forewarn
    ("よちむ", "Forewarn"),
    // 83: hyper-cutter
    ("かいりきバサミ", "Hyper Cutter"),
    // 84: soundproof
    ("ぼうおん", "Soundproof"),
    // 85: aftermath
    ("ゆうばく", "Aftermath"),
    // 86: harvest
    ("しゅうかく", "Harvest"),
    // 87: battle-armor
    ("カブトアーマー", "Battle Armor"),
    // 88: reckless
    ("すてみ", "Reckless"),
    // 89: unburden
    ("かるわざ", "Unburden"),
    // 90: iron-fist
    ("てつのこぶし", "Iron Fist"),
    // 91: neutralizing-gas
    ("かがくへんかガス", "Neutralizing Gas"),
    // 92: natural-cure
    ("しぜんかいふく", "Natural Cure"),
    // 93: serene-grace
    ("てんのめぐみ", "Serene Grace"),
    // 94: healer
    ("いやしのこころ", "Healer"),
    // 95: leaf-guard
    ("リーフガード", "Leaf Guard"),
    // 96: scrappy
    ("きもったま", "Scrappy"),
    // 97: water-veil
    ("みずのベール", "Water Veil"),
    // 98: illuminate
    ("はっこう", "Illuminate"),
    // 99: filter
    ("フィルター", "Filter"),
    // 100: mold-breaker
    ("かたやぶり", "Mold Breaker"),
    // 101: moxie
    ("じしんかじょう", "Moxie"),
    // 102: rattled
    ("びびり", "Rattled"),
    // 103: imposter
    ("かわりもの", "Imposter"),
    // 104: adaptability
    ("てきおうりょく", "Adaptability"),
    // 105: anticipation
    ("きけんよち", "Anticipation"),
    // 106: volt-absorb
    ("ちくでん", "Volt Absorb"),
    // 107: quick-feet
    ("はやあし", "Quick Feet"),
    // 108: trace
    ("トレース", "Trace"),
    // 109: download
    ("ダウンロード", "Download"),
    // 110: pressure
    ("プレッシャー", "Pressure"),
    // 111: immunity
    ("めんえき", "Immunity"),
    // 112: snow-cloak
    ("ゆきがくれ", "Snow Cloak"),
    // 113: marvel-scale
    ("ふしぎなうろこ", "Marvel Scale"),
    // 114: multiscale
    ("マルチスケイル", "Multiscale"),
    // 115: super-luck
    ("きょううん", "Super Luck"),
    // 116: magic-bounce
    ("マジックミラー", "Magic Bounce"),
    // 117: plus
    ("プラス", "Plus"),
    // 118: huge-power
    ("ちからもち", "Huge Power"),
    // 119: sap-sipper
    ("そうしょく", "Sap Sipper"),
    // 120: drizzle
    ("あめふらし", "Drizzle"),
    // 121: speed-boost
    ("かそく", "Speed Boost"),
    // 122: prankster
    ("いたずらごころ", "Prankster"),
    // 123: shadow-tag
    ("かげふみ", "Shadow Tag"),
    // 124: telepathy
    ("テレパシー", "Telepathy"),
    // 125: light-metal
    ("ライトメタル", "Light Metal"),
    // 126: contrary
    ("あまのじゃく", "Contrary"),
    // 127: pickpocket
    ("わるいてぐせ", "Pickpocket"),
    // 128: honey-gather
    ("みつあつめ", "Honey Gather"),
    // 129: magma-armor
    ("マグマのよろい", "Magma Armor"),
    // 130: moody
    ("ムラっけ", "Moody"),
    // 131: suction-cups
    ("きゅうばん", "Suction Cups"),
    // 132: sand-stream
    ("すなおこし", "Sand Stream"),
    // 133: wind-rider
    ("かぜのり", "Wind Rider"),
    // 134: poison-heal
    ("ポイズンヒール", "Poison Heal"),
    // 135: truant
    ("なまけ", "Truant"),
    // 136: wonder-guard
    ("ふしぎなまもり", "Wonder Guard"),
    // 137: normalize
    ("ノーマルスキン", "Normalize"),
    // 138: stall
    ("あとだし", "Stall"),
    // 139: heavy-metal
    ("ヘヴィメタル", "Heavy Metal"),
    // 140: pure-power
    ("ヨガパワー", "Pure Power"),
    // 141: minus
    ("マイナス", "Minus"),
    // 142: rough-skin
    ("さめはだ", "Rough Skin"),
    // 143: simple
    ("たんじゅん", "Simple"),
    // 144: solid-rock
    ("ハードロック", "Solid Rock"),
    // 145: white-smoke
    ("しろいけむり", "White Smoke"),
    // 146: toxic-boost
    ("どくぼうそう", "Toxic Boost"),
    // 147: storm-drain
    ("よびみず", "Storm Drain"),
    // 148: forecast
    ("てんきや", "Forecast"),
    // 149: color-change
    ("へんしょく", "Color Change"),
    // 150: protean
    ("へんげんじざい", "Protean"),
    // 151: air-lock
    ("エアロック", "Air Lock"),
    // 152: flower-gift
    ("フラワーギフト", "Flower Gift"),
    // 153: flare-boost
    ("ねつぼうそう", "Flare Boost"),
    // 154: klutz
    ("ぶきよう", "Klutz"),
    // 155: heatproof
    ("たいねつ", "Heatproof"),
    // 156: snow-warning
    ("ゆきふらし", "Snow Warning"),
    // 157: motor-drive
    ("でんきエンジン", "Motor Drive"),
    // 158: sharpness
    ("きれあじ", "Sharpness"),
    // 159: slow-start
    ("スロースタート", "Slow Start"),
    // 160: bad-dreams
    ("ナイトメア", "Bad Dreams"),
    // 161: multitype
    ("マルチタイプ", "Multitype"),
    // 162: victory-star
    ("しょうりのほし", "Victory Star"),
    // 163: zen-mode
    ("ダルマモード", "Zen Mode"),
    // 164: mummy
    ("ミイラ", "Mummy"),
    // 165: defeatist
    ("よわき", "Defeatist"),
    // 166: illusion
    ("イリュージョン", "Illusion"),
    // 167: iron-barbs
    ("てつのトゲ", "Iron Barbs"),
    // 168: slush-rush
    ("ゆきかき", "Slush Rush"),
    // 169: turboblaze
    ("ターボブレイズ", "Turboblaze"),
    // 170: teravolt
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
}
