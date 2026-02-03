//! 持ち物データテーブル
//
//! このファイルは自動生成されています。直接編集しないでください。
//! 生成コマンド: node scripts/generate-species-data.js

use crate::types::HeldItemSlot;

/// 持ち物名テーブル: (日本語名, 英語名)
/// インデックス 0 は「なし」を表す空文字列
pub static ITEM_NAMES: [(&str, &str); 92] = [
    // 0: (none)
    ("", ""),
    // 1: silver-powder
    ("ぎんのこな", "Silver Powder"),
    // 2: poison-barb
    ("どくバリ", "Poison Barb"),
    // 3: chilan-berry
    ("ホズのみ", "Chilan Berry"),
    // 4: sharp-beak
    ("するどいくちばし", "Sharp Beak"),
    // 5: oran-berry
    ("オレンのみ", "Oran Berry"),
    // 6: light-ball
    ("でんきだま", "Light Ball"),
    // 7: quick-claw
    ("せんせいのツメ", "Quick Claw"),
    // 8: moon-stone
    ("つきのいし", "Moon Stone"),
    // 9: leppa-berry
    ("ヒメリのみ", "Leppa Berry"),
    // 10: comet-shard
    ("すいせいのかけら", "Comet Shard"),
    // 11: rawst-berry
    ("チーゴのみ", "Rawst Berry"),
    // 12: tiny-mushroom
    ("ちいさなキノコ", "Tiny Mushroom"),
    // 13: big-mushroom
    ("おおきなキノコ", "Big Mushroom"),
    // 14: balm-mushroom
    ("かおるキノコ", "Balm Mushroom"),
    // 15: shed-shell
    ("きれいなぬけがら", "Shed Shell"),
    // 16: soft-sand
    ("やわらかいすな", "Soft Sand"),
    // 17: payapa-berry
    ("ウタンのみ", "Payapa Berry"),
    // 18: kings-rock
    ("おうじゃのしるし", "King’s Rock"),
    // 19: twisted-spoon
    ("まがったスプーン", "Twisted Spoon"),
    // 20: everstone
    ("かわらずのいし", "Everstone"),
    // 21: shuca-berry
    ("シュカのみ", "Shuca Berry"),
    // 22: lagging-tail
    ("こうこうのしっぽ", "Lagging Tail"),
    // 23: metal-coat
    ("メタルコート", "Metal Coat"),
    // 24: stick
    ("ながねぎ", "Leek"),
    // 25: nugget
    ("きんのたま", "Nugget"),
    // 26: black-sludge
    ("くろいヘドロ", "Black Sludge"),
    // 27: toxic-orb
    ("どくどくだま", "Toxic Orb"),
    // 28: pearl
    ("しんじゅ", "Pearl"),
    // 29: big-pearl
    ("おおきなしんじゅ", "Big Pearl"),
    // 30: thick-club
    ("ふといホネ", "Thick Club"),
    // 31: smoke-ball
    ("けむりだま", "Smoke Ball"),
    // 32: lucky-egg
    ("しあわせタマゴ", "Lucky Egg"),
    // 33: lucky-punch
    ("ラッキーパンチ", "Lucky Punch"),
    // 34: dragon-scale
    ("りゅうのウロコ", "Dragon Scale"),
    // 35: stardust
    ("ほしのすな", "Stardust"),
    // 36: star-piece
    ("ほしのかけら", "Star Piece"),
    // 37: aspear-berry
    ("ナナシのみ", "Aspear Berry"),
    // 38: metal-powder
    ("メタルパウダー", "Metal Powder"),
    // 39: quick-powder
    ("スピードパウダー", "Quick Powder"),
    // 40: leftovers
    ("たべのこし", "Leftovers"),
    // 41: lum-berry
    ("ラムのみ", "Lum Berry"),
    // 42: sitrus-berry
    ("オボンのみ", "Sitrus Berry"),
    // 43: deep-sea-scale
    ("しんかいのウロコ", "Deep Sea Scale"),
    // 44: coba-berry
    ("バコウのみ", "Coba Berry"),
    // 45: wide-lens
    ("こうかくレンズ", "Wide Lens"),
    // 46: persim-berry
    ("キーのみ", "Persim Berry"),
    // 47: berry-juice
    ("きのみジュース", "Berry Juice"),
    // 48: grip-claw
    ("ねばりのかぎづめ", "Grip Claw"),
    // 49: hard-stone
    ("かたいいし", "Hard Stone"),
    // 50: passho-berry
    ("イトケのみ", "Passho Berry"),
    // 51: moomoo-milk
    ("モーモーミルク", "Moomoo Milk"),
    // 52: sacred-ash
    ("せいなるはい", "Sacred Ash"),
    // 53: pecha-berry
    ("モモンのみ", "Pecha Berry"),
    // 54: charti-berry
    ("ヨロギのみ", "Charti Berry"),
    // 55: kebia-berry
    ("ビアーのみ", "Kebia Berry"),
    // 56: chesto-berry
    ("カゴのみ", "Chesto Berry"),
    // 57: occa-berry
    ("オッカのみ", "Occa Berry"),
    // 58: absorb-bulb
    ("きゅうこん", "Absorb Bulb"),
    // 59: deep-sea-tooth
    ("しんかいのキバ", "Deep Sea Tooth"),
    // 60: tanga-berry
    ("タンガのみ", "Tanga Berry"),
    // 61: sticky-barb
    ("くっつきバリ", "Sticky Barb"),
    // 62: sun-stone
    ("たいようのいし", "Sun Stone"),
    // 63: big-root
    ("おおきなねっこ", "Big Root"),
    // 64: mystic-water
    ("しんぴのしずく", "Mystic Water"),
    // 65: spell-tag
    ("のろいのおふだ", "Spell Tag"),
    // 66: kasib-berry
    ("カシブのみ", "Kasib Berry"),
    // 67: colbur-berry
    ("ナモのみ", "Colbur Berry"),
    // 68: babiri-berry
    ("リリバのみ", "Babiri Berry"),
    // 69: heart-scale
    ("ハートのウロコ", "Heart Scale"),
    // 70: dragon-fang
    ("りゅうのキバ", "Dragon Fang"),
    // 71: yache-berry
    ("ヤチェのみ", "Yache Berry"),
    // 72: metronome
    ("メトロノーム", "Metronome"),
    // 73: honey
    ("あまいミツ", "Honey"),
    // 74: wacan-berry
    ("ソクノのみ", "Wacan Berry"),
    // 75: miracle-seed
    ("きせきのタネ", "Miracle Seed"),
    // 76: air-balloon
    ("ふうせん", "Air Balloon"),
    // 77: chople-berry
    ("ヨプのみ", "Chople Berry"),
    // 78: cheri-berry
    ("クラボのみ", "Cheri Berry"),
    // 79: oval-stone
    ("まんまるいし", "Oval Stone"),
    // 80: haban-berry
    ("ハバンのみ", "Haban Berry"),
    // 81: rindo-berry
    ("リンドのみ", "Rindo Berry"),
    // 82: never-melt-ice
    ("とけないこおり", "Never-Melt Ice"),
    // 83: electirizer
    ("エレキブースター", "Electirizer"),
    // 84: magmarizer
    ("マグマブースター", "Magmarizer"),
    // 85: black-belt
    ("くろおび", "Black Belt"),
    // 86: expert-belt
    ("たつじんのおび", "Expert Belt"),
    // 87: mental-herb
    ("メンタルハーブ", "Mental Herb"),
    // 88: rare-bone
    ("きちょうなホネ", "Rare Bone"),
    // 89: big-nugget
    ("でかいきんのたま", "Big Nugget"),
    // 90: light-clay
    ("ひかりのねんど", "Light Clay"),
    // 91: flame-orb
    ("かえんだま", "Flame Orb"),
];

/// 持ち物エントリ
#[derive(Clone, Copy, Debug, Default)]
pub struct HeldItemEntry {
    /// 50% スロット (アイテムID, 0 = なし)
    pub common: u8,
    /// 5% スロット (アイテムID, 0 = なし)
    pub rare: u8,
    /// 1% スロット (アイテムID, 0 = なし, BW2 のみ)
    pub very_rare: u8,
}

/// 持ち物テーブル (種族 × バージョン)
///
/// インデックス: `(species_id - 1) * 4 + version_index`
///
/// `version_index`: `0=Black`, `1=White`, `2=Black2`, `3=White2`
pub static HELD_ITEMS_TABLE: [HeldItemEntry; 2596] = [
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 1 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 1 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 1 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 1 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 2 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 2 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 2 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 2 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 3 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 3 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 3 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 3 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 4 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 4 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 4 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 4 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 5 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 5 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 5 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 5 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 6 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 6 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 6 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 6 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 7 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 7 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 7 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 7 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 8 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 8 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 8 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 8 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 9 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 9 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 9 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 9 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 10 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 10 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 10 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 10 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 11 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 11 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 11 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 11 White2
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 12 Black
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 12 White
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 12 Black2
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 12 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 13 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 13 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 13 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 13 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 14 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 14 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 14 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 14 White2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 15 Black
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 15 White
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 15 Black2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 15 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 16 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 16 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 16 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 16 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 17 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 17 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 17 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 17 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 18 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 18 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 18 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 18 White2
    HeldItemEntry { common: 0, rare: 3, very_rare: 0 }, // 19 Black
    HeldItemEntry { common: 0, rare: 3, very_rare: 0 }, // 19 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 19 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 19 White2
    HeldItemEntry { common: 0, rare: 3, very_rare: 0 }, // 20 Black
    HeldItemEntry { common: 0, rare: 3, very_rare: 0 }, // 20 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 20 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 20 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 21 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 21 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 21 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 21 White2
    HeldItemEntry { common: 0, rare: 4, very_rare: 0 }, // 22 Black
    HeldItemEntry { common: 0, rare: 4, very_rare: 0 }, // 22 White
    HeldItemEntry { common: 0, rare: 4, very_rare: 0 }, // 22 Black2
    HeldItemEntry { common: 0, rare: 4, very_rare: 0 }, // 22 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 23 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 23 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 23 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 23 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 24 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 24 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 24 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 24 White2
    HeldItemEntry { common: 5, rare: 0, very_rare: 6 }, // 25 Black
    HeldItemEntry { common: 5, rare: 0, very_rare: 6 }, // 25 White
    HeldItemEntry { common: 0, rare: 6, very_rare: 0 }, // 25 Black2
    HeldItemEntry { common: 0, rare: 6, very_rare: 0 }, // 25 White2
    HeldItemEntry { common: 5, rare: 0, very_rare: 0 }, // 26 Black
    HeldItemEntry { common: 5, rare: 0, very_rare: 0 }, // 26 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 26 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 26 White2
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 27 Black
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 27 White
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 27 Black2
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 27 White2
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 28 Black
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 28 White
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 28 Black2
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 28 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 29 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 29 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 29 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 29 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 30 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 30 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 30 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 30 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 31 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 31 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 31 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 31 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 32 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 32 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 32 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 32 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 33 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 33 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 33 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 33 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 34 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 34 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 34 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 34 White2
    HeldItemEntry { common: 9, rare: 8, very_rare: 10 }, // 35 Black
    HeldItemEntry { common: 9, rare: 8, very_rare: 10 }, // 35 White
    HeldItemEntry { common: 9, rare: 8, very_rare: 10 }, // 35 Black2
    HeldItemEntry { common: 9, rare: 8, very_rare: 10 }, // 35 White2
    HeldItemEntry { common: 9, rare: 8, very_rare: 10 }, // 36 Black
    HeldItemEntry { common: 9, rare: 8, very_rare: 10 }, // 36 White
    HeldItemEntry { common: 9, rare: 8, very_rare: 10 }, // 36 Black2
    HeldItemEntry { common: 9, rare: 8, very_rare: 10 }, // 36 White2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 37 Black
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 37 White
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 37 Black2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 37 White2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 38 Black
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 38 White
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 38 Black2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 38 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 39 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 39 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 39 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 39 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 40 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 40 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 40 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 40 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 41 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 41 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 41 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 41 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 42 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 42 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 42 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 42 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 43 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 43 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 43 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 43 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 44 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 44 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 44 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 44 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 45 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 45 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 45 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 45 White2
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 46 Black
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 46 White
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 46 Black2
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 46 White2
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 47 Black
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 47 White
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 47 Black2
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 47 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 48 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 48 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 48 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 48 White2
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 49 Black
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 49 White
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 49 Black2
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 49 White2
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 50 Black
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 50 White
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 50 Black2
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 50 White2
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 51 Black
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 51 White
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 51 Black2
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 51 White2
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 52 Black
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 52 White
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 52 Black2
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 52 White2
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 53 Black
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 53 White
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 53 Black2
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 53 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 54 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 54 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 54 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 54 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 55 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 55 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 55 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 55 White2
    HeldItemEntry { common: 0, rare: 17, very_rare: 0 }, // 56 Black
    HeldItemEntry { common: 0, rare: 17, very_rare: 0 }, // 56 White
    HeldItemEntry { common: 0, rare: 17, very_rare: 0 }, // 56 Black2
    HeldItemEntry { common: 0, rare: 17, very_rare: 0 }, // 56 White2
    HeldItemEntry { common: 0, rare: 17, very_rare: 0 }, // 57 Black
    HeldItemEntry { common: 0, rare: 17, very_rare: 0 }, // 57 White
    HeldItemEntry { common: 0, rare: 17, very_rare: 0 }, // 57 Black2
    HeldItemEntry { common: 0, rare: 17, very_rare: 0 }, // 57 White2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 58 Black
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 58 White
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 58 Black2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 58 White2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 59 Black
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 59 White
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 59 Black2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 59 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 60 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 60 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 60 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 60 White2
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 61 Black
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 61 White
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 61 Black2
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 61 White2
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 62 Black
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 62 White
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 62 Black2
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 62 White2
    HeldItemEntry { common: 0, rare: 19, very_rare: 0 }, // 63 Black
    HeldItemEntry { common: 0, rare: 19, very_rare: 0 }, // 63 White
    HeldItemEntry { common: 0, rare: 19, very_rare: 0 }, // 63 Black2
    HeldItemEntry { common: 0, rare: 19, very_rare: 0 }, // 63 White2
    HeldItemEntry { common: 0, rare: 19, very_rare: 0 }, // 64 Black
    HeldItemEntry { common: 0, rare: 19, very_rare: 0 }, // 64 White
    HeldItemEntry { common: 0, rare: 19, very_rare: 0 }, // 64 Black2
    HeldItemEntry { common: 0, rare: 19, very_rare: 0 }, // 64 White2
    HeldItemEntry { common: 0, rare: 19, very_rare: 0 }, // 65 Black
    HeldItemEntry { common: 0, rare: 19, very_rare: 0 }, // 65 White
    HeldItemEntry { common: 0, rare: 19, very_rare: 0 }, // 65 Black2
    HeldItemEntry { common: 0, rare: 19, very_rare: 0 }, // 65 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 66 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 66 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 66 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 66 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 67 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 67 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 67 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 67 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 68 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 68 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 68 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 68 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 69 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 69 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 69 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 69 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 70 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 70 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 70 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 70 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 71 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 71 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 71 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 71 White2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 72 Black
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 72 White
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 72 Black2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 72 White2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 73 Black
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 73 White
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 73 Black2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 73 White2
    HeldItemEntry { common: 0, rare: 20, very_rare: 0 }, // 74 Black
    HeldItemEntry { common: 0, rare: 20, very_rare: 0 }, // 74 White
    HeldItemEntry { common: 0, rare: 20, very_rare: 0 }, // 74 Black2
    HeldItemEntry { common: 0, rare: 20, very_rare: 0 }, // 74 White2
    HeldItemEntry { common: 0, rare: 20, very_rare: 0 }, // 75 Black
    HeldItemEntry { common: 0, rare: 20, very_rare: 0 }, // 75 White
    HeldItemEntry { common: 0, rare: 20, very_rare: 0 }, // 75 Black2
    HeldItemEntry { common: 0, rare: 20, very_rare: 0 }, // 75 White2
    HeldItemEntry { common: 0, rare: 20, very_rare: 0 }, // 76 Black
    HeldItemEntry { common: 0, rare: 20, very_rare: 0 }, // 76 White
    HeldItemEntry { common: 0, rare: 20, very_rare: 0 }, // 76 Black2
    HeldItemEntry { common: 0, rare: 20, very_rare: 0 }, // 76 White2
    HeldItemEntry { common: 0, rare: 21, very_rare: 0 }, // 77 Black
    HeldItemEntry { common: 0, rare: 21, very_rare: 0 }, // 77 White
    HeldItemEntry { common: 0, rare: 21, very_rare: 0 }, // 77 Black2
    HeldItemEntry { common: 0, rare: 21, very_rare: 0 }, // 77 White2
    HeldItemEntry { common: 0, rare: 21, very_rare: 0 }, // 78 Black
    HeldItemEntry { common: 0, rare: 21, very_rare: 0 }, // 78 White
    HeldItemEntry { common: 0, rare: 21, very_rare: 0 }, // 78 Black2
    HeldItemEntry { common: 0, rare: 21, very_rare: 0 }, // 78 White2
    HeldItemEntry { common: 0, rare: 22, very_rare: 0 }, // 79 Black
    HeldItemEntry { common: 0, rare: 22, very_rare: 0 }, // 79 White
    HeldItemEntry { common: 0, rare: 22, very_rare: 0 }, // 79 Black2
    HeldItemEntry { common: 0, rare: 22, very_rare: 0 }, // 79 White2
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 80 Black
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 80 White
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 80 Black2
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 80 White2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 81 Black
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 81 White
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 81 Black2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 81 White2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 82 Black
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 82 White
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 82 Black2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 82 White2
    HeldItemEntry { common: 0, rare: 24, very_rare: 0 }, // 83 Black
    HeldItemEntry { common: 0, rare: 24, very_rare: 0 }, // 83 White
    HeldItemEntry { common: 0, rare: 24, very_rare: 0 }, // 83 Black2
    HeldItemEntry { common: 0, rare: 24, very_rare: 0 }, // 83 White2
    HeldItemEntry { common: 0, rare: 4, very_rare: 0 }, // 84 Black
    HeldItemEntry { common: 0, rare: 4, very_rare: 0 }, // 84 White
    HeldItemEntry { common: 0, rare: 4, very_rare: 0 }, // 84 Black2
    HeldItemEntry { common: 0, rare: 4, very_rare: 0 }, // 84 White2
    HeldItemEntry { common: 0, rare: 4, very_rare: 0 }, // 85 Black
    HeldItemEntry { common: 0, rare: 4, very_rare: 0 }, // 85 White
    HeldItemEntry { common: 0, rare: 4, very_rare: 0 }, // 85 Black2
    HeldItemEntry { common: 0, rare: 4, very_rare: 0 }, // 85 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 86 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 86 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 86 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 86 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 87 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 87 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 87 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 87 White2
    HeldItemEntry { common: 0, rare: 25, very_rare: 0 }, // 88 Black
    HeldItemEntry { common: 0, rare: 25, very_rare: 0 }, // 88 White
    HeldItemEntry { common: 0, rare: 26, very_rare: 0 }, // 88 Black2
    HeldItemEntry { common: 0, rare: 26, very_rare: 0 }, // 88 White2
    HeldItemEntry { common: 0, rare: 25, very_rare: 0 }, // 89 Black
    HeldItemEntry { common: 0, rare: 25, very_rare: 0 }, // 89 White
    HeldItemEntry { common: 26, rare: 0, very_rare: 27 }, // 89 Black2
    HeldItemEntry { common: 26, rare: 0, very_rare: 27 }, // 89 White2
    HeldItemEntry { common: 28, rare: 29, very_rare: 0 }, // 90 Black
    HeldItemEntry { common: 28, rare: 29, very_rare: 0 }, // 90 White
    HeldItemEntry { common: 28, rare: 29, very_rare: 0 }, // 90 Black2
    HeldItemEntry { common: 28, rare: 29, very_rare: 0 }, // 90 White2
    HeldItemEntry { common: 28, rare: 29, very_rare: 0 }, // 91 Black
    HeldItemEntry { common: 28, rare: 29, very_rare: 0 }, // 91 White
    HeldItemEntry { common: 28, rare: 29, very_rare: 0 }, // 91 Black2
    HeldItemEntry { common: 28, rare: 29, very_rare: 0 }, // 91 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 92 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 92 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 92 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 92 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 93 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 93 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 93 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 93 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 94 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 94 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 94 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 94 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 95 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 95 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 95 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 95 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 96 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 96 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 96 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 96 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 97 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 97 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 97 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 97 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 98 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 98 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 98 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 98 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 99 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 99 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 99 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 99 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 100 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 100 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 100 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 100 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 101 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 101 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 101 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 101 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 102 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 102 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 102 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 102 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 103 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 103 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 103 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 103 White2
    HeldItemEntry { common: 0, rare: 30, very_rare: 0 }, // 104 Black
    HeldItemEntry { common: 0, rare: 30, very_rare: 0 }, // 104 White
    HeldItemEntry { common: 0, rare: 30, very_rare: 0 }, // 104 Black2
    HeldItemEntry { common: 0, rare: 30, very_rare: 0 }, // 104 White2
    HeldItemEntry { common: 0, rare: 30, very_rare: 0 }, // 105 Black
    HeldItemEntry { common: 0, rare: 30, very_rare: 0 }, // 105 White
    HeldItemEntry { common: 0, rare: 30, very_rare: 0 }, // 105 Black2
    HeldItemEntry { common: 0, rare: 30, very_rare: 0 }, // 105 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 106 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 106 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 106 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 106 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 107 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 107 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 107 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 107 White2
    HeldItemEntry { common: 0, rare: 22, very_rare: 0 }, // 108 Black
    HeldItemEntry { common: 0, rare: 22, very_rare: 0 }, // 108 White
    HeldItemEntry { common: 0, rare: 22, very_rare: 0 }, // 108 Black2
    HeldItemEntry { common: 0, rare: 22, very_rare: 0 }, // 108 White2
    HeldItemEntry { common: 0, rare: 31, very_rare: 0 }, // 109 Black
    HeldItemEntry { common: 0, rare: 31, very_rare: 0 }, // 109 White
    HeldItemEntry { common: 0, rare: 31, very_rare: 0 }, // 109 Black2
    HeldItemEntry { common: 0, rare: 31, very_rare: 0 }, // 109 White2
    HeldItemEntry { common: 0, rare: 31, very_rare: 0 }, // 110 Black
    HeldItemEntry { common: 0, rare: 31, very_rare: 0 }, // 110 White
    HeldItemEntry { common: 0, rare: 31, very_rare: 0 }, // 110 Black2
    HeldItemEntry { common: 0, rare: 31, very_rare: 0 }, // 110 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 111 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 111 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 111 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 111 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 112 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 112 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 112 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 112 White2
    HeldItemEntry { common: 33, rare: 32, very_rare: 0 }, // 113 Black
    HeldItemEntry { common: 33, rare: 32, very_rare: 0 }, // 113 White
    HeldItemEntry { common: 33, rare: 32, very_rare: 0 }, // 113 Black2
    HeldItemEntry { common: 33, rare: 32, very_rare: 0 }, // 113 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 114 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 114 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 114 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 114 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 115 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 115 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 115 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 115 White2
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 116 Black
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 116 White
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 116 Black2
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 116 White2
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 117 Black
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 117 White
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 117 Black2
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 117 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 118 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 118 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 118 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 118 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 119 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 119 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 119 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 119 White2
    HeldItemEntry { common: 35, rare: 36, very_rare: 0 }, // 120 Black
    HeldItemEntry { common: 35, rare: 36, very_rare: 0 }, // 120 White
    HeldItemEntry { common: 35, rare: 36, very_rare: 0 }, // 120 Black2
    HeldItemEntry { common: 35, rare: 36, very_rare: 0 }, // 120 White2
    HeldItemEntry { common: 35, rare: 36, very_rare: 0 }, // 121 Black
    HeldItemEntry { common: 35, rare: 36, very_rare: 0 }, // 121 White
    HeldItemEntry { common: 35, rare: 36, very_rare: 0 }, // 121 Black2
    HeldItemEntry { common: 35, rare: 36, very_rare: 0 }, // 121 White2
    HeldItemEntry { common: 0, rare: 9, very_rare: 0 }, // 122 Black
    HeldItemEntry { common: 0, rare: 9, very_rare: 0 }, // 122 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 122 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 122 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 123 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 123 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 123 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 123 White2
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 124 Black
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 124 White
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 124 Black2
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 124 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 125 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 125 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 125 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 125 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 126 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 126 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 126 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 126 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 127 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 127 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 127 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 127 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 128 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 128 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 128 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 128 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 129 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 129 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 129 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 129 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 130 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 130 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 130 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 130 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 131 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 131 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 131 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 131 White2
    HeldItemEntry { common: 39, rare: 38, very_rare: 0 }, // 132 Black
    HeldItemEntry { common: 39, rare: 38, very_rare: 0 }, // 132 White
    HeldItemEntry { common: 39, rare: 38, very_rare: 0 }, // 132 Black2
    HeldItemEntry { common: 39, rare: 38, very_rare: 0 }, // 132 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 133 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 133 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 133 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 133 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 134 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 134 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 134 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 134 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 135 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 135 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 135 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 135 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 136 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 136 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 136 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 136 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 137 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 137 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 137 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 137 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 138 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 138 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 138 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 138 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 139 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 139 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 139 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 139 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 140 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 140 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 140 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 140 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 141 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 141 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 141 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 141 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 142 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 142 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 142 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 142 White2
    HeldItemEntry { common: 40, rare: 0, very_rare: 0 }, // 143 Black
    HeldItemEntry { common: 40, rare: 0, very_rare: 0 }, // 143 White
    HeldItemEntry { common: 40, rare: 0, very_rare: 0 }, // 143 Black2
    HeldItemEntry { common: 40, rare: 0, very_rare: 0 }, // 143 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 144 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 144 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 144 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 144 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 145 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 145 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 145 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 145 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 146 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 146 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 146 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 146 White2
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 147 Black
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 147 White
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 147 Black2
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 147 White2
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 148 Black
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 148 White
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 148 Black2
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 148 White2
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 149 Black
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 149 White
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 149 Black2
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 149 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 150 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 150 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 150 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 150 White2
    HeldItemEntry { common: 41, rare: 0, very_rare: 0 }, // 151 Black
    HeldItemEntry { common: 41, rare: 0, very_rare: 0 }, // 151 White
    HeldItemEntry { common: 41, rare: 0, very_rare: 0 }, // 151 Black2
    HeldItemEntry { common: 41, rare: 0, very_rare: 0 }, // 151 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 152 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 152 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 152 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 152 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 153 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 153 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 153 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 153 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 154 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 154 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 154 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 154 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 155 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 155 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 155 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 155 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 156 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 156 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 156 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 156 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 157 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 157 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 157 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 157 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 158 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 158 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 158 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 158 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 159 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 159 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 159 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 159 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 160 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 160 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 160 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 160 White2
    HeldItemEntry { common: 0, rare: 5, very_rare: 0 }, // 161 Black
    HeldItemEntry { common: 0, rare: 5, very_rare: 0 }, // 161 White
    HeldItemEntry { common: 0, rare: 5, very_rare: 0 }, // 161 Black2
    HeldItemEntry { common: 0, rare: 5, very_rare: 0 }, // 161 White2
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 162 Black
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 162 White
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 162 Black2
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 162 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 163 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 163 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 163 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 163 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 164 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 164 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 164 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 164 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 165 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 165 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 165 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 165 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 166 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 166 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 166 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 166 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 167 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 167 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 167 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 167 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 168 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 168 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 168 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 168 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 169 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 169 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 169 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 169 White2
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 170 Black
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 170 White
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 170 Black2
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 170 White2
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 171 Black
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 171 White
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 171 Black2
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 171 White2
    HeldItemEntry { common: 5, rare: 0, very_rare: 0 }, // 172 Black
    HeldItemEntry { common: 5, rare: 0, very_rare: 0 }, // 172 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 172 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 172 White2
    HeldItemEntry { common: 9, rare: 8, very_rare: 10 }, // 173 Black
    HeldItemEntry { common: 9, rare: 8, very_rare: 10 }, // 173 White
    HeldItemEntry { common: 9, rare: 8, very_rare: 10 }, // 173 Black2
    HeldItemEntry { common: 9, rare: 8, very_rare: 10 }, // 173 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 174 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 174 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 174 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 174 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 175 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 175 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 175 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 175 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 176 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 176 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 176 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 176 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 177 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 177 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 177 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 177 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 178 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 178 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 178 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 178 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 179 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 179 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 179 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 179 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 180 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 180 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 180 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 180 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 181 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 181 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 181 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 181 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 182 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 182 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 182 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 182 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 183 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 183 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 183 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 183 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 184 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 184 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 184 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 184 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 185 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 185 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 185 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 185 White2
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 186 Black
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 186 White
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 186 Black2
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 186 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 187 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 187 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 187 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 187 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 188 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 188 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 188 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 188 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 189 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 189 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 189 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 189 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 190 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 190 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 190 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 190 White2
    HeldItemEntry { common: 0, rare: 44, very_rare: 0 }, // 191 Black
    HeldItemEntry { common: 0, rare: 44, very_rare: 0 }, // 191 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 191 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 191 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 192 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 192 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 192 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 192 White2
    HeldItemEntry { common: 0, rare: 45, very_rare: 0 }, // 193 Black
    HeldItemEntry { common: 0, rare: 45, very_rare: 0 }, // 193 White
    HeldItemEntry { common: 0, rare: 45, very_rare: 0 }, // 193 Black2
    HeldItemEntry { common: 0, rare: 45, very_rare: 0 }, // 193 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 194 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 194 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 194 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 194 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 195 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 195 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 195 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 195 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 196 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 196 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 196 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 196 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 197 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 197 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 197 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 197 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 198 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 198 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 198 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 198 White2
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 199 Black
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 199 White
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 199 Black2
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 199 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 200 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 200 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 200 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 200 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 201 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 201 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 201 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 201 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 202 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 202 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 202 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 202 White2
    HeldItemEntry { common: 0, rare: 46, very_rare: 0 }, // 203 Black
    HeldItemEntry { common: 0, rare: 46, very_rare: 0 }, // 203 White
    HeldItemEntry { common: 0, rare: 46, very_rare: 0 }, // 203 Black2
    HeldItemEntry { common: 0, rare: 46, very_rare: 0 }, // 203 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 204 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 204 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 204 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 204 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 205 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 205 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 205 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 205 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 206 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 206 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 206 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 206 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 207 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 207 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 207 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 207 White2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 208 Black
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 208 White
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 208 Black2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 208 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 209 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 209 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 209 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 209 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 210 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 210 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 210 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 210 White2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 211 Black
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 211 White
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 211 Black2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 211 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 212 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 212 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 212 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 212 White2
    HeldItemEntry { common: 47, rare: 0, very_rare: 0 }, // 213 Black
    HeldItemEntry { common: 47, rare: 0, very_rare: 0 }, // 213 White
    HeldItemEntry { common: 47, rare: 0, very_rare: 0 }, // 213 Black2
    HeldItemEntry { common: 47, rare: 0, very_rare: 0 }, // 213 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 214 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 214 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 214 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 214 White2
    HeldItemEntry { common: 48, rare: 7, very_rare: 0 }, // 215 Black
    HeldItemEntry { common: 48, rare: 7, very_rare: 0 }, // 215 White
    HeldItemEntry { common: 48, rare: 7, very_rare: 0 }, // 215 Black2
    HeldItemEntry { common: 48, rare: 7, very_rare: 0 }, // 215 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 216 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 216 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 216 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 216 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 217 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 217 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 217 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 217 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 218 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 218 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 218 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 218 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 219 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 219 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 219 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 219 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 220 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 220 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 220 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 220 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 221 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 221 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 221 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 221 White2
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 222 Black
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 222 White
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 222 Black2
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 222 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 223 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 223 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 223 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 223 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 224 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 224 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 224 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 224 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 225 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 225 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 225 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 225 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 226 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 226 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 226 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 226 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 227 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 227 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 227 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 227 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 228 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 228 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 228 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 228 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 229 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 229 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 229 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 229 White2
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 230 Black
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 230 White
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 230 Black2
    HeldItemEntry { common: 0, rare: 34, very_rare: 0 }, // 230 White2
    HeldItemEntry { common: 0, rare: 50, very_rare: 0 }, // 231 Black
    HeldItemEntry { common: 0, rare: 50, very_rare: 0 }, // 231 White
    HeldItemEntry { common: 0, rare: 50, very_rare: 0 }, // 231 Black2
    HeldItemEntry { common: 0, rare: 50, very_rare: 0 }, // 231 White2
    HeldItemEntry { common: 0, rare: 50, very_rare: 0 }, // 232 Black
    HeldItemEntry { common: 0, rare: 50, very_rare: 0 }, // 232 White
    HeldItemEntry { common: 0, rare: 50, very_rare: 0 }, // 232 Black2
    HeldItemEntry { common: 0, rare: 50, very_rare: 0 }, // 232 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 233 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 233 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 233 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 233 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 234 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 234 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 234 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 234 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 235 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 235 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 235 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 235 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 236 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 236 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 236 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 236 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 237 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 237 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 237 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 237 White2
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 238 Black
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 238 White
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 238 Black2
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 238 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 239 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 239 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 239 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 239 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 240 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 240 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 240 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 240 White2
    HeldItemEntry { common: 51, rare: 0, very_rare: 0 }, // 241 Black
    HeldItemEntry { common: 51, rare: 0, very_rare: 0 }, // 241 White
    HeldItemEntry { common: 51, rare: 0, very_rare: 0 }, // 241 Black2
    HeldItemEntry { common: 51, rare: 0, very_rare: 0 }, // 241 White2
    HeldItemEntry { common: 32, rare: 0, very_rare: 0 }, // 242 Black
    HeldItemEntry { common: 32, rare: 0, very_rare: 0 }, // 242 White
    HeldItemEntry { common: 32, rare: 0, very_rare: 0 }, // 242 Black2
    HeldItemEntry { common: 32, rare: 0, very_rare: 0 }, // 242 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 243 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 243 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 243 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 243 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 244 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 244 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 244 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 244 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 245 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 245 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 245 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 245 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 246 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 246 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 246 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 246 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 247 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 247 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 247 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 247 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 248 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 248 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 248 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 248 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 249 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 249 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 249 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 249 White2
    HeldItemEntry { common: 52, rare: 0, very_rare: 0 }, // 250 Black
    HeldItemEntry { common: 52, rare: 0, very_rare: 0 }, // 250 White
    HeldItemEntry { common: 52, rare: 0, very_rare: 0 }, // 250 Black2
    HeldItemEntry { common: 52, rare: 0, very_rare: 0 }, // 250 White2
    HeldItemEntry { common: 41, rare: 0, very_rare: 0 }, // 251 Black
    HeldItemEntry { common: 41, rare: 0, very_rare: 0 }, // 251 White
    HeldItemEntry { common: 41, rare: 0, very_rare: 0 }, // 251 Black2
    HeldItemEntry { common: 41, rare: 0, very_rare: 0 }, // 251 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 252 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 252 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 252 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 252 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 253 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 253 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 253 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 253 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 254 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 254 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 254 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 254 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 255 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 255 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 255 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 255 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 256 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 256 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 256 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 256 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 257 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 257 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 257 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 257 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 258 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 258 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 258 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 258 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 259 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 259 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 259 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 259 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 260 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 260 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 260 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 260 White2
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 261 Black
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 261 White
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 261 Black2
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 261 White2
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 262 Black
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 262 White
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 262 Black2
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 262 White2
    HeldItemEntry { common: 0, rare: 5, very_rare: 0 }, // 263 Black
    HeldItemEntry { common: 0, rare: 5, very_rare: 0 }, // 263 White
    HeldItemEntry { common: 0, rare: 5, very_rare: 0 }, // 263 Black2
    HeldItemEntry { common: 0, rare: 5, very_rare: 0 }, // 263 White2
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 264 Black
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 264 White
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 264 Black2
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 264 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 265 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 265 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 265 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 265 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 266 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 266 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 266 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 266 White2
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 267 Black
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 267 White
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 267 Black2
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 267 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 268 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 268 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 268 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 268 White2
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 269 Black
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 269 White
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 269 Black2
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 269 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 270 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 270 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 270 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 270 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 271 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 271 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 271 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 271 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 272 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 272 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 272 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 272 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 273 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 273 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 273 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 273 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 274 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 274 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 274 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 274 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 275 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 275 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 275 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 275 White2
    HeldItemEntry { common: 0, rare: 54, very_rare: 0 }, // 276 Black
    HeldItemEntry { common: 0, rare: 54, very_rare: 0 }, // 276 White
    HeldItemEntry { common: 0, rare: 54, very_rare: 0 }, // 276 Black2
    HeldItemEntry { common: 0, rare: 54, very_rare: 0 }, // 276 White2
    HeldItemEntry { common: 0, rare: 54, very_rare: 0 }, // 277 Black
    HeldItemEntry { common: 0, rare: 54, very_rare: 0 }, // 277 White
    HeldItemEntry { common: 0, rare: 54, very_rare: 0 }, // 277 Black2
    HeldItemEntry { common: 0, rare: 54, very_rare: 0 }, // 277 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 278 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 278 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 278 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 278 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 279 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 279 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 279 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 279 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 280 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 280 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 280 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 280 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 281 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 281 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 281 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 281 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 282 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 282 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 282 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 282 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 283 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 283 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 283 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 283 White2
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 284 Black
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 284 White
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 284 Black2
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 284 White2
    HeldItemEntry { common: 0, rare: 55, very_rare: 0 }, // 285 Black
    HeldItemEntry { common: 0, rare: 55, very_rare: 0 }, // 285 White
    HeldItemEntry { common: 0, rare: 55, very_rare: 0 }, // 285 Black2
    HeldItemEntry { common: 0, rare: 55, very_rare: 0 }, // 285 White2
    HeldItemEntry { common: 0, rare: 55, very_rare: 0 }, // 286 Black
    HeldItemEntry { common: 0, rare: 55, very_rare: 0 }, // 286 White
    HeldItemEntry { common: 0, rare: 55, very_rare: 0 }, // 286 Black2
    HeldItemEntry { common: 0, rare: 55, very_rare: 0 }, // 286 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 287 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 287 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 287 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 287 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 288 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 288 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 288 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 288 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 289 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 289 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 289 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 289 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 290 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 290 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 290 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 290 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 291 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 291 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 291 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 291 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 292 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 292 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 292 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 292 White2
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 293 Black
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 293 White
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 293 Black2
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 293 White2
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 294 Black
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 294 White
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 294 Black2
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 294 White2
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 295 Black
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 295 White
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 295 Black2
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 295 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 296 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 296 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 296 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 296 White2
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 297 Black
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 297 White
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 297 Black2
    HeldItemEntry { common: 0, rare: 18, very_rare: 0 }, // 297 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 298 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 298 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 298 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 298 White2
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 299 Black
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 299 White
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 299 Black2
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 299 White2
    HeldItemEntry { common: 0, rare: 9, very_rare: 0 }, // 300 Black
    HeldItemEntry { common: 0, rare: 9, very_rare: 0 }, // 300 White
    HeldItemEntry { common: 53, rare: 0, very_rare: 0 }, // 300 Black2
    HeldItemEntry { common: 53, rare: 0, very_rare: 0 }, // 300 White2
    HeldItemEntry { common: 0, rare: 9, very_rare: 0 }, // 301 Black
    HeldItemEntry { common: 0, rare: 9, very_rare: 0 }, // 301 White
    HeldItemEntry { common: 53, rare: 0, very_rare: 0 }, // 301 Black2
    HeldItemEntry { common: 53, rare: 0, very_rare: 0 }, // 301 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 302 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 302 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 302 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 302 White2
    HeldItemEntry { common: 0, rare: 57, very_rare: 0 }, // 303 Black
    HeldItemEntry { common: 0, rare: 57, very_rare: 0 }, // 303 White
    HeldItemEntry { common: 0, rare: 57, very_rare: 0 }, // 303 Black2
    HeldItemEntry { common: 0, rare: 57, very_rare: 0 }, // 303 White2
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 304 Black
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 304 White
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 304 Black2
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 304 White2
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 305 Black
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 305 White
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 305 Black2
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 305 White2
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 306 Black
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 306 White
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 306 Black2
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 306 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 307 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 307 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 307 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 307 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 308 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 308 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 308 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 308 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 309 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 309 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 309 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 309 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 310 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 310 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 310 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 310 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 311 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 311 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 311 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 311 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 312 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 312 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 312 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 312 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 313 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 313 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 313 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 313 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 314 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 314 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 314 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 314 White2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 315 Black
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 315 White
    HeldItemEntry { common: 0, rare: 2, very_rare: 58 }, // 315 Black2
    HeldItemEntry { common: 0, rare: 2, very_rare: 58 }, // 315 White2
    HeldItemEntry { common: 0, rare: 29, very_rare: 0 }, // 316 Black
    HeldItemEntry { common: 0, rare: 29, very_rare: 0 }, // 316 White
    HeldItemEntry { common: 0, rare: 29, very_rare: 0 }, // 316 Black2
    HeldItemEntry { common: 0, rare: 29, very_rare: 0 }, // 316 White2
    HeldItemEntry { common: 0, rare: 29, very_rare: 0 }, // 317 Black
    HeldItemEntry { common: 0, rare: 29, very_rare: 0 }, // 317 White
    HeldItemEntry { common: 0, rare: 29, very_rare: 0 }, // 317 Black2
    HeldItemEntry { common: 0, rare: 29, very_rare: 0 }, // 317 White2
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 318 Black
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 318 White
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 318 Black2
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 318 White2
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 319 Black
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 319 White
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 319 Black2
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 319 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 320 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 320 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 320 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 320 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 321 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 321 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 321 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 321 White2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 322 Black
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 322 White
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 322 Black2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 322 White2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 323 Black
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 323 White
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 323 Black2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 323 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 324 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 324 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 324 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 324 White2
    HeldItemEntry { common: 0, rare: 60, very_rare: 0 }, // 325 Black
    HeldItemEntry { common: 0, rare: 60, very_rare: 0 }, // 325 White
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 325 Black2
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 325 White2
    HeldItemEntry { common: 0, rare: 60, very_rare: 0 }, // 326 Black
    HeldItemEntry { common: 0, rare: 60, very_rare: 0 }, // 326 White
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 326 Black2
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 326 White2
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 327 Black
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 327 White
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 327 Black2
    HeldItemEntry { common: 0, rare: 56, very_rare: 0 }, // 327 White2
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 328 Black
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 328 White
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 328 Black2
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 328 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 329 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 329 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 329 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 329 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 330 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 330 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 330 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 330 White2
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 331 Black
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 331 White
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 331 Black2
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 331 White2
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 332 Black
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 332 White
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 332 Black2
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 332 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 333 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 333 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 333 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 333 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 334 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 334 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 334 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 334 White2
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 335 Black
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 335 White
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 335 Black2
    HeldItemEntry { common: 0, rare: 7, very_rare: 0 }, // 335 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 336 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 336 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 336 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 336 White2
    HeldItemEntry { common: 0, rare: 8, very_rare: 10 }, // 337 Black
    HeldItemEntry { common: 0, rare: 8, very_rare: 10 }, // 337 White
    HeldItemEntry { common: 0, rare: 8, very_rare: 10 }, // 337 Black2
    HeldItemEntry { common: 0, rare: 8, very_rare: 10 }, // 337 White2
    HeldItemEntry { common: 0, rare: 62, very_rare: 10 }, // 338 Black
    HeldItemEntry { common: 0, rare: 62, very_rare: 10 }, // 338 White
    HeldItemEntry { common: 0, rare: 62, very_rare: 10 }, // 338 Black2
    HeldItemEntry { common: 0, rare: 62, very_rare: 10 }, // 338 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 339 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 339 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 339 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 339 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 340 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 340 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 340 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 340 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 341 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 341 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 341 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 341 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 342 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 342 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 342 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 342 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 343 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 343 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 343 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 343 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 344 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 344 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 344 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 344 White2
    HeldItemEntry { common: 0, rare: 63, very_rare: 0 }, // 345 Black
    HeldItemEntry { common: 0, rare: 63, very_rare: 0 }, // 345 White
    HeldItemEntry { common: 0, rare: 63, very_rare: 0 }, // 345 Black2
    HeldItemEntry { common: 0, rare: 63, very_rare: 0 }, // 345 White2
    HeldItemEntry { common: 0, rare: 63, very_rare: 0 }, // 346 Black
    HeldItemEntry { common: 0, rare: 63, very_rare: 0 }, // 346 White
    HeldItemEntry { common: 0, rare: 63, very_rare: 0 }, // 346 Black2
    HeldItemEntry { common: 0, rare: 63, very_rare: 0 }, // 346 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 347 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 347 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 347 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 347 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 348 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 348 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 348 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 348 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 349 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 349 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 349 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 349 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 350 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 350 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 350 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 350 White2
    HeldItemEntry { common: 64, rare: 0, very_rare: 0 }, // 351 Black
    HeldItemEntry { common: 64, rare: 0, very_rare: 0 }, // 351 White
    HeldItemEntry { common: 64, rare: 0, very_rare: 0 }, // 351 Black2
    HeldItemEntry { common: 64, rare: 0, very_rare: 0 }, // 351 White2
    HeldItemEntry { common: 0, rare: 46, very_rare: 0 }, // 352 Black
    HeldItemEntry { common: 0, rare: 46, very_rare: 0 }, // 352 White
    HeldItemEntry { common: 0, rare: 46, very_rare: 0 }, // 352 Black2
    HeldItemEntry { common: 0, rare: 46, very_rare: 0 }, // 352 White2
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 353 Black
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 353 White
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 353 Black2
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 353 White2
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 354 Black
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 354 White
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 354 Black2
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 354 White2
    HeldItemEntry { common: 0, rare: 66, very_rare: 0 }, // 355 Black
    HeldItemEntry { common: 0, rare: 66, very_rare: 0 }, // 355 White
    HeldItemEntry { common: 0, rare: 66, very_rare: 0 }, // 355 Black2
    HeldItemEntry { common: 0, rare: 66, very_rare: 0 }, // 355 White2
    HeldItemEntry { common: 0, rare: 66, very_rare: 0 }, // 356 Black
    HeldItemEntry { common: 0, rare: 66, very_rare: 0 }, // 356 White
    HeldItemEntry { common: 0, rare: 66, very_rare: 0 }, // 356 Black2
    HeldItemEntry { common: 0, rare: 66, very_rare: 0 }, // 356 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 357 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 357 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 357 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 357 White2
    HeldItemEntry { common: 0, rare: 67, very_rare: 0 }, // 358 Black
    HeldItemEntry { common: 0, rare: 67, very_rare: 0 }, // 358 White
    HeldItemEntry { common: 0, rare: 67, very_rare: 0 }, // 358 Black2
    HeldItemEntry { common: 0, rare: 67, very_rare: 0 }, // 358 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 359 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 359 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 359 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 359 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 360 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 360 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 360 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 360 White2
    HeldItemEntry { common: 0, rare: 68, very_rare: 0 }, // 361 Black
    HeldItemEntry { common: 0, rare: 68, very_rare: 0 }, // 361 White
    HeldItemEntry { common: 0, rare: 68, very_rare: 0 }, // 361 Black2
    HeldItemEntry { common: 0, rare: 68, very_rare: 0 }, // 361 White2
    HeldItemEntry { common: 0, rare: 68, very_rare: 0 }, // 362 Black
    HeldItemEntry { common: 0, rare: 68, very_rare: 0 }, // 362 White
    HeldItemEntry { common: 0, rare: 68, very_rare: 0 }, // 362 Black2
    HeldItemEntry { common: 0, rare: 68, very_rare: 0 }, // 362 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 363 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 363 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 363 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 363 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 364 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 364 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 364 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 364 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 365 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 365 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 365 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 365 White2
    HeldItemEntry { common: 0, rare: 29, very_rare: 0 }, // 366 Black
    HeldItemEntry { common: 0, rare: 29, very_rare: 0 }, // 366 White
    HeldItemEntry { common: 0, rare: 29, very_rare: 0 }, // 366 Black2
    HeldItemEntry { common: 0, rare: 29, very_rare: 0 }, // 366 White2
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 367 Black
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 367 White
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 367 Black2
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 367 White2
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 368 Black
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 368 White
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 368 Black2
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 368 White2
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 369 Black
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 369 White
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 369 Black2
    HeldItemEntry { common: 0, rare: 43, very_rare: 0 }, // 369 White2
    HeldItemEntry { common: 69, rare: 0, very_rare: 0 }, // 370 Black
    HeldItemEntry { common: 69, rare: 0, very_rare: 0 }, // 370 White
    HeldItemEntry { common: 69, rare: 0, very_rare: 0 }, // 370 Black2
    HeldItemEntry { common: 69, rare: 0, very_rare: 0 }, // 370 White2
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 371 Black
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 371 White
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 371 Black2
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 371 White2
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 372 Black
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 372 White
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 372 Black2
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 372 White2
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 373 Black
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 373 White
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 373 Black2
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 373 White2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 374 Black
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 374 White
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 374 Black2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 374 White2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 375 Black
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 375 White
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 375 Black2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 375 White2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 376 Black
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 376 White
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 376 Black2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 376 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 377 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 377 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 377 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 377 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 378 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 378 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 378 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 378 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 379 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 379 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 379 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 379 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 380 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 380 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 380 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 380 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 381 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 381 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 381 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 381 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 382 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 382 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 382 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 382 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 383 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 383 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 383 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 383 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 384 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 384 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 384 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 384 White2
    HeldItemEntry { common: 36, rare: 0, very_rare: 0 }, // 385 Black
    HeldItemEntry { common: 36, rare: 0, very_rare: 0 }, // 385 White
    HeldItemEntry { common: 36, rare: 0, very_rare: 0 }, // 385 Black2
    HeldItemEntry { common: 36, rare: 0, very_rare: 0 }, // 385 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 386 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 386 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 386 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 386 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 387 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 387 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 387 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 387 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 388 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 388 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 388 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 388 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 389 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 389 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 389 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 389 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 390 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 390 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 390 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 390 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 391 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 391 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 391 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 391 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 392 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 392 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 392 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 392 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 393 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 393 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 393 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 393 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 394 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 394 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 394 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 394 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 395 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 395 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 395 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 395 White2
    HeldItemEntry { common: 0, rare: 71, very_rare: 0 }, // 396 Black
    HeldItemEntry { common: 0, rare: 71, very_rare: 0 }, // 396 White
    HeldItemEntry { common: 0, rare: 71, very_rare: 0 }, // 396 Black2
    HeldItemEntry { common: 0, rare: 71, very_rare: 0 }, // 396 White2
    HeldItemEntry { common: 0, rare: 71, very_rare: 0 }, // 397 Black
    HeldItemEntry { common: 0, rare: 71, very_rare: 0 }, // 397 White
    HeldItemEntry { common: 0, rare: 71, very_rare: 0 }, // 397 Black2
    HeldItemEntry { common: 0, rare: 71, very_rare: 0 }, // 397 White2
    HeldItemEntry { common: 0, rare: 71, very_rare: 0 }, // 398 Black
    HeldItemEntry { common: 0, rare: 71, very_rare: 0 }, // 398 White
    HeldItemEntry { common: 0, rare: 71, very_rare: 0 }, // 398 Black2
    HeldItemEntry { common: 0, rare: 71, very_rare: 0 }, // 398 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 399 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 399 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 399 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 399 White2
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 400 Black
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 400 White
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 400 Black2
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 400 White2
    HeldItemEntry { common: 0, rare: 72, very_rare: 0 }, // 401 Black
    HeldItemEntry { common: 0, rare: 72, very_rare: 0 }, // 401 White
    HeldItemEntry { common: 0, rare: 72, very_rare: 0 }, // 401 Black2
    HeldItemEntry { common: 0, rare: 72, very_rare: 0 }, // 401 White2
    HeldItemEntry { common: 0, rare: 72, very_rare: 0 }, // 402 Black
    HeldItemEntry { common: 0, rare: 72, very_rare: 0 }, // 402 White
    HeldItemEntry { common: 0, rare: 72, very_rare: 0 }, // 402 Black2
    HeldItemEntry { common: 0, rare: 72, very_rare: 0 }, // 402 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 403 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 403 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 403 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 403 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 404 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 404 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 404 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 404 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 405 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 405 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 405 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 405 White2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 406 Black
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 406 White
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 406 Black2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 406 White2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 407 Black
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 407 White
    HeldItemEntry { common: 0, rare: 2, very_rare: 58 }, // 407 Black2
    HeldItemEntry { common: 0, rare: 2, very_rare: 58 }, // 407 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 408 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 408 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 408 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 408 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 409 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 409 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 409 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 409 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 410 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 410 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 410 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 410 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 411 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 411 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 411 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 411 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 412 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 412 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 412 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 412 White2
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 413 Black
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 413 White
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 413 Black2
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 413 White2
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 414 Black
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 414 White
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 414 Black2
    HeldItemEntry { common: 0, rare: 1, very_rare: 0 }, // 414 White2
    HeldItemEntry { common: 73, rare: 0, very_rare: 0 }, // 415 Black
    HeldItemEntry { common: 73, rare: 0, very_rare: 0 }, // 415 White
    HeldItemEntry { common: 0, rare: 73, very_rare: 0 }, // 415 Black2
    HeldItemEntry { common: 0, rare: 73, very_rare: 0 }, // 415 White2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 416 Black
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 416 White
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 416 Black2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 416 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 417 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 417 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 417 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 417 White2
    HeldItemEntry { common: 0, rare: 74, very_rare: 0 }, // 418 Black
    HeldItemEntry { common: 0, rare: 74, very_rare: 0 }, // 418 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 418 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 418 White2
    HeldItemEntry { common: 0, rare: 74, very_rare: 0 }, // 419 Black
    HeldItemEntry { common: 0, rare: 74, very_rare: 0 }, // 419 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 419 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 419 White2
    HeldItemEntry { common: 0, rare: 75, very_rare: 0 }, // 420 Black
    HeldItemEntry { common: 0, rare: 75, very_rare: 0 }, // 420 White
    HeldItemEntry { common: 0, rare: 75, very_rare: 0 }, // 420 Black2
    HeldItemEntry { common: 0, rare: 75, very_rare: 0 }, // 420 White2
    HeldItemEntry { common: 0, rare: 75, very_rare: 0 }, // 421 Black
    HeldItemEntry { common: 0, rare: 75, very_rare: 0 }, // 421 White
    HeldItemEntry { common: 0, rare: 75, very_rare: 0 }, // 421 Black2
    HeldItemEntry { common: 0, rare: 75, very_rare: 0 }, // 421 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 422 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 422 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 422 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 422 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 423 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 423 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 423 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 423 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 424 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 424 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 424 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 424 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 425 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 425 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 425 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 425 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 426 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 426 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 76 }, // 426 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 76 }, // 426 White2
    HeldItemEntry { common: 0, rare: 77, very_rare: 0 }, // 427 Black
    HeldItemEntry { common: 0, rare: 77, very_rare: 0 }, // 427 White
    HeldItemEntry { common: 53, rare: 0, very_rare: 0 }, // 427 Black2
    HeldItemEntry { common: 53, rare: 0, very_rare: 0 }, // 427 White2
    HeldItemEntry { common: 0, rare: 77, very_rare: 0 }, // 428 Black
    HeldItemEntry { common: 0, rare: 77, very_rare: 0 }, // 428 White
    HeldItemEntry { common: 53, rare: 0, very_rare: 0 }, // 428 Black2
    HeldItemEntry { common: 53, rare: 0, very_rare: 0 }, // 428 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 429 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 429 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 429 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 429 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 430 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 430 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 430 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 430 White2
    HeldItemEntry { common: 0, rare: 78, very_rare: 0 }, // 431 Black
    HeldItemEntry { common: 0, rare: 78, very_rare: 0 }, // 431 White
    HeldItemEntry { common: 0, rare: 78, very_rare: 0 }, // 431 Black2
    HeldItemEntry { common: 0, rare: 78, very_rare: 0 }, // 431 White2
    HeldItemEntry { common: 0, rare: 78, very_rare: 0 }, // 432 Black
    HeldItemEntry { common: 0, rare: 78, very_rare: 0 }, // 432 White
    HeldItemEntry { common: 0, rare: 78, very_rare: 0 }, // 432 Black2
    HeldItemEntry { common: 0, rare: 78, very_rare: 0 }, // 432 White2
    HeldItemEntry { common: 0, rare: 67, very_rare: 0 }, // 433 Black
    HeldItemEntry { common: 0, rare: 67, very_rare: 0 }, // 433 White
    HeldItemEntry { common: 0, rare: 67, very_rare: 0 }, // 433 Black2
    HeldItemEntry { common: 0, rare: 67, very_rare: 0 }, // 433 White2
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 434 Black
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 434 White
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 434 Black2
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 434 White2
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 435 Black
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 435 White
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 435 Black2
    HeldItemEntry { common: 0, rare: 53, very_rare: 0 }, // 435 White2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 436 Black
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 436 White
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 436 Black2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 436 White2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 437 Black
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 437 White
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 437 Black2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 437 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 438 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 438 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 438 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 438 White2
    HeldItemEntry { common: 0, rare: 9, very_rare: 0 }, // 439 Black
    HeldItemEntry { common: 0, rare: 9, very_rare: 0 }, // 439 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 439 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 439 White2
    HeldItemEntry { common: 79, rare: 32, very_rare: 0 }, // 440 Black
    HeldItemEntry { common: 79, rare: 32, very_rare: 0 }, // 440 White
    HeldItemEntry { common: 79, rare: 32, very_rare: 0 }, // 440 Black2
    HeldItemEntry { common: 79, rare: 32, very_rare: 0 }, // 440 White2
    HeldItemEntry { common: 0, rare: 72, very_rare: 0 }, // 441 Black
    HeldItemEntry { common: 0, rare: 72, very_rare: 0 }, // 441 White
    HeldItemEntry { common: 0, rare: 72, very_rare: 0 }, // 441 Black2
    HeldItemEntry { common: 0, rare: 72, very_rare: 0 }, // 441 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 442 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 442 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 442 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 442 White2
    HeldItemEntry { common: 0, rare: 80, very_rare: 0 }, // 443 Black
    HeldItemEntry { common: 0, rare: 80, very_rare: 0 }, // 443 White
    HeldItemEntry { common: 0, rare: 80, very_rare: 0 }, // 443 Black2
    HeldItemEntry { common: 0, rare: 80, very_rare: 0 }, // 443 White2
    HeldItemEntry { common: 0, rare: 80, very_rare: 0 }, // 444 Black
    HeldItemEntry { common: 0, rare: 80, very_rare: 0 }, // 444 White
    HeldItemEntry { common: 0, rare: 80, very_rare: 0 }, // 444 Black2
    HeldItemEntry { common: 0, rare: 80, very_rare: 0 }, // 444 White2
    HeldItemEntry { common: 0, rare: 80, very_rare: 0 }, // 445 Black
    HeldItemEntry { common: 0, rare: 80, very_rare: 0 }, // 445 White
    HeldItemEntry { common: 0, rare: 80, very_rare: 0 }, // 445 Black2
    HeldItemEntry { common: 0, rare: 80, very_rare: 0 }, // 445 White2
    HeldItemEntry { common: 40, rare: 0, very_rare: 0 }, // 446 Black
    HeldItemEntry { common: 40, rare: 0, very_rare: 0 }, // 446 White
    HeldItemEntry { common: 40, rare: 0, very_rare: 0 }, // 446 Black2
    HeldItemEntry { common: 40, rare: 0, very_rare: 0 }, // 446 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 447 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 447 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 447 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 447 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 448 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 448 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 448 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 448 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 449 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 449 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 449 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 449 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 450 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 450 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 450 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 450 White2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 451 Black
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 451 White
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 451 Black2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 451 White2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 452 Black
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 452 White
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 452 Black2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 452 White2
    HeldItemEntry { common: 0, rare: 26, very_rare: 0 }, // 453 Black
    HeldItemEntry { common: 0, rare: 26, very_rare: 0 }, // 453 White
    HeldItemEntry { common: 0, rare: 26, very_rare: 0 }, // 453 Black2
    HeldItemEntry { common: 0, rare: 26, very_rare: 0 }, // 453 White2
    HeldItemEntry { common: 0, rare: 26, very_rare: 0 }, // 454 Black
    HeldItemEntry { common: 0, rare: 26, very_rare: 0 }, // 454 White
    HeldItemEntry { common: 0, rare: 26, very_rare: 0 }, // 454 Black2
    HeldItemEntry { common: 0, rare: 26, very_rare: 0 }, // 454 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 455 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 455 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 455 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 455 White2
    HeldItemEntry { common: 0, rare: 81, very_rare: 0 }, // 456 Black
    HeldItemEntry { common: 0, rare: 81, very_rare: 0 }, // 456 White
    HeldItemEntry { common: 0, rare: 81, very_rare: 0 }, // 456 Black2
    HeldItemEntry { common: 0, rare: 81, very_rare: 0 }, // 456 White2
    HeldItemEntry { common: 0, rare: 81, very_rare: 0 }, // 457 Black
    HeldItemEntry { common: 0, rare: 81, very_rare: 0 }, // 457 White
    HeldItemEntry { common: 0, rare: 81, very_rare: 0 }, // 457 Black2
    HeldItemEntry { common: 0, rare: 81, very_rare: 0 }, // 457 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 458 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 458 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 458 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 458 White2
    HeldItemEntry { common: 0, rare: 82, very_rare: 0 }, // 459 Black
    HeldItemEntry { common: 0, rare: 82, very_rare: 0 }, // 459 White
    HeldItemEntry { common: 0, rare: 82, very_rare: 0 }, // 459 Black2
    HeldItemEntry { common: 0, rare: 82, very_rare: 0 }, // 459 White2
    HeldItemEntry { common: 0, rare: 82, very_rare: 0 }, // 460 Black
    HeldItemEntry { common: 0, rare: 82, very_rare: 0 }, // 460 White
    HeldItemEntry { common: 0, rare: 82, very_rare: 0 }, // 460 Black2
    HeldItemEntry { common: 0, rare: 82, very_rare: 0 }, // 460 White2
    HeldItemEntry { common: 48, rare: 7, very_rare: 0 }, // 461 Black
    HeldItemEntry { common: 48, rare: 7, very_rare: 0 }, // 461 White
    HeldItemEntry { common: 48, rare: 7, very_rare: 0 }, // 461 Black2
    HeldItemEntry { common: 48, rare: 7, very_rare: 0 }, // 461 White2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 462 Black
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 462 White
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 462 Black2
    HeldItemEntry { common: 0, rare: 23, very_rare: 0 }, // 462 White2
    HeldItemEntry { common: 0, rare: 22, very_rare: 0 }, // 463 Black
    HeldItemEntry { common: 0, rare: 22, very_rare: 0 }, // 463 White
    HeldItemEntry { common: 0, rare: 22, very_rare: 0 }, // 463 Black2
    HeldItemEntry { common: 0, rare: 22, very_rare: 0 }, // 463 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 464 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 464 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 464 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 464 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 465 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 465 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 465 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 465 White2
    HeldItemEntry { common: 0, rare: 83, very_rare: 0 }, // 466 Black
    HeldItemEntry { common: 0, rare: 83, very_rare: 0 }, // 466 White
    HeldItemEntry { common: 0, rare: 83, very_rare: 0 }, // 466 Black2
    HeldItemEntry { common: 0, rare: 83, very_rare: 0 }, // 466 White2
    HeldItemEntry { common: 0, rare: 84, very_rare: 0 }, // 467 Black
    HeldItemEntry { common: 0, rare: 84, very_rare: 0 }, // 467 White
    HeldItemEntry { common: 0, rare: 84, very_rare: 0 }, // 467 Black2
    HeldItemEntry { common: 0, rare: 84, very_rare: 0 }, // 467 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 468 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 468 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 468 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 468 White2
    HeldItemEntry { common: 0, rare: 45, very_rare: 0 }, // 469 Black
    HeldItemEntry { common: 0, rare: 45, very_rare: 0 }, // 469 White
    HeldItemEntry { common: 0, rare: 45, very_rare: 0 }, // 469 Black2
    HeldItemEntry { common: 0, rare: 45, very_rare: 0 }, // 469 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 470 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 470 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 470 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 470 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 471 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 471 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 471 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 471 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 472 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 472 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 472 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 472 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 473 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 473 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 473 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 473 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 474 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 474 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 474 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 474 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 475 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 475 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 475 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 475 White2
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 476 Black
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 476 White
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 476 Black2
    HeldItemEntry { common: 0, rare: 49, very_rare: 0 }, // 476 White2
    HeldItemEntry { common: 0, rare: 66, very_rare: 0 }, // 477 Black
    HeldItemEntry { common: 0, rare: 66, very_rare: 0 }, // 477 White
    HeldItemEntry { common: 0, rare: 66, very_rare: 0 }, // 477 Black2
    HeldItemEntry { common: 0, rare: 66, very_rare: 0 }, // 477 White2
    HeldItemEntry { common: 0, rare: 68, very_rare: 0 }, // 478 Black
    HeldItemEntry { common: 0, rare: 68, very_rare: 0 }, // 478 White
    HeldItemEntry { common: 0, rare: 68, very_rare: 0 }, // 478 Black2
    HeldItemEntry { common: 0, rare: 68, very_rare: 0 }, // 478 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 479 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 479 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 479 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 479 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 480 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 480 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 480 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 480 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 481 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 481 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 481 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 481 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 482 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 482 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 482 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 482 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 483 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 483 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 483 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 483 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 484 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 484 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 484 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 484 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 485 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 485 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 485 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 485 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 486 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 486 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 486 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 486 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 487 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 487 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 487 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 487 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 488 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 488 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 488 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 488 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 489 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 489 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 489 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 489 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 490 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 490 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 490 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 490 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 491 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 491 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 491 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 491 White2
    HeldItemEntry { common: 41, rare: 0, very_rare: 0 }, // 492 Black
    HeldItemEntry { common: 41, rare: 0, very_rare: 0 }, // 492 White
    HeldItemEntry { common: 41, rare: 0, very_rare: 0 }, // 492 Black2
    HeldItemEntry { common: 41, rare: 0, very_rare: 0 }, // 492 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 493 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 493 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 493 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 493 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 494 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 494 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 494 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 494 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 495 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 495 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 495 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 495 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 496 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 496 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 496 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 496 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 497 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 497 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 497 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 497 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 498 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 498 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 498 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 498 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 499 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 499 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 499 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 499 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 500 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 500 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 500 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 500 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 501 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 501 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 501 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 501 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 502 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 502 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 502 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 502 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 503 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 503 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 503 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 503 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 504 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 504 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 504 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 504 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 505 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 505 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 505 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 505 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 506 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 506 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 506 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 506 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 507 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 507 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 507 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 507 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 508 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 508 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 508 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 508 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 509 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 509 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 509 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 509 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 510 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 510 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 510 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 510 White2
    HeldItemEntry { common: 5, rare: 57, very_rare: 0 }, // 511 Black
    HeldItemEntry { common: 5, rare: 57, very_rare: 0 }, // 511 White
    HeldItemEntry { common: 5, rare: 57, very_rare: 0 }, // 511 Black2
    HeldItemEntry { common: 5, rare: 57, very_rare: 0 }, // 511 White2
    HeldItemEntry { common: 5, rare: 57, very_rare: 0 }, // 512 Black
    HeldItemEntry { common: 5, rare: 57, very_rare: 0 }, // 512 White
    HeldItemEntry { common: 5, rare: 57, very_rare: 0 }, // 512 Black2
    HeldItemEntry { common: 5, rare: 57, very_rare: 0 }, // 512 White2
    HeldItemEntry { common: 5, rare: 50, very_rare: 0 }, // 513 Black
    HeldItemEntry { common: 5, rare: 50, very_rare: 0 }, // 513 White
    HeldItemEntry { common: 5, rare: 50, very_rare: 0 }, // 513 Black2
    HeldItemEntry { common: 5, rare: 50, very_rare: 0 }, // 513 White2
    HeldItemEntry { common: 5, rare: 50, very_rare: 0 }, // 514 Black
    HeldItemEntry { common: 5, rare: 50, very_rare: 0 }, // 514 White
    HeldItemEntry { common: 5, rare: 50, very_rare: 0 }, // 514 Black2
    HeldItemEntry { common: 5, rare: 50, very_rare: 0 }, // 514 White2
    HeldItemEntry { common: 5, rare: 81, very_rare: 0 }, // 515 Black
    HeldItemEntry { common: 5, rare: 81, very_rare: 0 }, // 515 White
    HeldItemEntry { common: 5, rare: 81, very_rare: 0 }, // 515 Black2
    HeldItemEntry { common: 5, rare: 81, very_rare: 0 }, // 515 White2
    HeldItemEntry { common: 5, rare: 81, very_rare: 0 }, // 516 Black
    HeldItemEntry { common: 5, rare: 81, very_rare: 0 }, // 516 White
    HeldItemEntry { common: 5, rare: 81, very_rare: 0 }, // 516 Black2
    HeldItemEntry { common: 5, rare: 81, very_rare: 0 }, // 516 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 517 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 517 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 517 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 517 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 518 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 518 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 518 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 518 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 519 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 519 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 519 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 519 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 520 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 520 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 520 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 520 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 521 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 521 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 521 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 521 White2
    HeldItemEntry { common: 78, rare: 0, very_rare: 0 }, // 522 Black
    HeldItemEntry { common: 78, rare: 0, very_rare: 0 }, // 522 White
    HeldItemEntry { common: 78, rare: 0, very_rare: 0 }, // 522 Black2
    HeldItemEntry { common: 78, rare: 0, very_rare: 0 }, // 522 White2
    HeldItemEntry { common: 78, rare: 0, very_rare: 0 }, // 523 Black
    HeldItemEntry { common: 78, rare: 0, very_rare: 0 }, // 523 White
    HeldItemEntry { common: 78, rare: 0, very_rare: 0 }, // 523 Black2
    HeldItemEntry { common: 78, rare: 0, very_rare: 0 }, // 523 White2
    HeldItemEntry { common: 20, rare: 49, very_rare: 0 }, // 524 Black
    HeldItemEntry { common: 20, rare: 49, very_rare: 0 }, // 524 White
    HeldItemEntry { common: 20, rare: 49, very_rare: 0 }, // 524 Black2
    HeldItemEntry { common: 20, rare: 49, very_rare: 0 }, // 524 White2
    HeldItemEntry { common: 20, rare: 49, very_rare: 0 }, // 525 Black
    HeldItemEntry { common: 20, rare: 49, very_rare: 0 }, // 525 White
    HeldItemEntry { common: 20, rare: 49, very_rare: 0 }, // 525 Black2
    HeldItemEntry { common: 20, rare: 49, very_rare: 0 }, // 525 White2
    HeldItemEntry { common: 20, rare: 49, very_rare: 0 }, // 526 Black
    HeldItemEntry { common: 20, rare: 49, very_rare: 0 }, // 526 White
    HeldItemEntry { common: 20, rare: 49, very_rare: 0 }, // 526 Black2
    HeldItemEntry { common: 20, rare: 49, very_rare: 0 }, // 526 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 527 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 527 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 527 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 527 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 528 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 528 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 528 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 528 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 529 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 529 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 529 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 529 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 530 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 530 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 530 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 530 White2
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 531 Black
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 531 White
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 531 Black2
    HeldItemEntry { common: 5, rare: 42, very_rare: 0 }, // 531 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 532 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 532 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 532 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 532 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 533 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 533 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 533 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 533 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 534 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 534 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 534 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 534 White2
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 535 Black
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 535 White
    HeldItemEntry { common: 53, rare: 0, very_rare: 0 }, // 535 Black2
    HeldItemEntry { common: 53, rare: 0, very_rare: 0 }, // 535 White2
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 536 Black
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 536 White
    HeldItemEntry { common: 53, rare: 0, very_rare: 0 }, // 536 Black2
    HeldItemEntry { common: 53, rare: 0, very_rare: 0 }, // 536 White2
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 537 Black
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 537 White
    HeldItemEntry { common: 53, rare: 0, very_rare: 0 }, // 537 Black2
    HeldItemEntry { common: 53, rare: 0, very_rare: 0 }, // 537 White2
    HeldItemEntry { common: 0, rare: 85, very_rare: 86 }, // 538 Black
    HeldItemEntry { common: 0, rare: 85, very_rare: 86 }, // 538 White
    HeldItemEntry { common: 0, rare: 85, very_rare: 86 }, // 538 Black2
    HeldItemEntry { common: 0, rare: 85, very_rare: 86 }, // 538 White2
    HeldItemEntry { common: 0, rare: 85, very_rare: 86 }, // 539 Black
    HeldItemEntry { common: 0, rare: 85, very_rare: 86 }, // 539 White
    HeldItemEntry { common: 0, rare: 85, very_rare: 86 }, // 539 Black2
    HeldItemEntry { common: 0, rare: 85, very_rare: 86 }, // 539 White2
    HeldItemEntry { common: 0, rare: 87, very_rare: 0 }, // 540 Black
    HeldItemEntry { common: 0, rare: 87, very_rare: 0 }, // 540 White
    HeldItemEntry { common: 0, rare: 87, very_rare: 0 }, // 540 Black2
    HeldItemEntry { common: 0, rare: 87, very_rare: 0 }, // 540 White2
    HeldItemEntry { common: 0, rare: 87, very_rare: 0 }, // 541 Black
    HeldItemEntry { common: 0, rare: 87, very_rare: 0 }, // 541 White
    HeldItemEntry { common: 0, rare: 87, very_rare: 0 }, // 541 Black2
    HeldItemEntry { common: 0, rare: 87, very_rare: 0 }, // 541 White2
    HeldItemEntry { common: 0, rare: 87, very_rare: 0 }, // 542 Black
    HeldItemEntry { common: 0, rare: 87, very_rare: 0 }, // 542 White
    HeldItemEntry { common: 0, rare: 87, very_rare: 0 }, // 542 Black2
    HeldItemEntry { common: 0, rare: 87, very_rare: 0 }, // 542 White2
    HeldItemEntry { common: 53, rare: 2, very_rare: 0 }, // 543 Black
    HeldItemEntry { common: 53, rare: 2, very_rare: 0 }, // 543 White
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 543 Black2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 543 White2
    HeldItemEntry { common: 53, rare: 2, very_rare: 0 }, // 544 Black
    HeldItemEntry { common: 53, rare: 2, very_rare: 0 }, // 544 White
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 544 Black2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 544 White2
    HeldItemEntry { common: 53, rare: 2, very_rare: 0 }, // 545 Black
    HeldItemEntry { common: 53, rare: 2, very_rare: 0 }, // 545 White
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 545 Black2
    HeldItemEntry { common: 0, rare: 2, very_rare: 0 }, // 545 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 546 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 546 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 546 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 546 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 547 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 547 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 547 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 547 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 548 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 548 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 548 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 548 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 549 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 549 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 549 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 549 White2
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 550 Black
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 550 White
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 550 Black2
    HeldItemEntry { common: 0, rare: 59, very_rare: 0 }, // 550 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 551 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 551 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 551 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 551 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 552 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 552 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 552 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 552 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 553 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 553 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 553 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 553 White2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 554 Black
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 554 White
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 554 Black2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 554 White2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 555 Black
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 555 White
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 555 Black2
    HeldItemEntry { common: 11, rare: 0, very_rare: 0 }, // 555 White2
    HeldItemEntry { common: 0, rare: 75, very_rare: 0 }, // 556 Black
    HeldItemEntry { common: 0, rare: 75, very_rare: 0 }, // 556 White
    HeldItemEntry { common: 0, rare: 75, very_rare: 0 }, // 556 Black2
    HeldItemEntry { common: 0, rare: 75, very_rare: 0 }, // 556 White2
    HeldItemEntry { common: 0, rare: 49, very_rare: 88 }, // 557 Black
    HeldItemEntry { common: 0, rare: 49, very_rare: 88 }, // 557 White
    HeldItemEntry { common: 0, rare: 49, very_rare: 88 }, // 557 Black2
    HeldItemEntry { common: 0, rare: 49, very_rare: 88 }, // 557 White2
    HeldItemEntry { common: 0, rare: 49, very_rare: 88 }, // 558 Black
    HeldItemEntry { common: 0, rare: 49, very_rare: 88 }, // 558 White
    HeldItemEntry { common: 0, rare: 49, very_rare: 88 }, // 558 Black2
    HeldItemEntry { common: 0, rare: 49, very_rare: 88 }, // 558 White2
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 559 Black
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 559 White
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 559 Black2
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 559 White2
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 560 Black
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 560 White
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 560 Black2
    HeldItemEntry { common: 0, rare: 15, very_rare: 0 }, // 560 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 561 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 561 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 561 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 561 White2
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 562 Black
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 562 White
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 562 Black2
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 562 White2
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 563 Black
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 563 White
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 563 Black2
    HeldItemEntry { common: 0, rare: 65, very_rare: 0 }, // 563 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 564 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 564 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 564 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 564 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 565 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 565 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 565 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 565 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 566 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 566 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 566 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 566 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 567 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 567 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 567 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 567 White2
    HeldItemEntry { common: 0, rare: 26, very_rare: 25 }, // 568 Black
    HeldItemEntry { common: 0, rare: 26, very_rare: 25 }, // 568 White
    HeldItemEntry { common: 0, rare: 26, very_rare: 25 }, // 568 Black2
    HeldItemEntry { common: 0, rare: 26, very_rare: 25 }, // 568 White2
    HeldItemEntry { common: 26, rare: 25, very_rare: 89 }, // 569 Black
    HeldItemEntry { common: 26, rare: 25, very_rare: 89 }, // 569 White
    HeldItemEntry { common: 26, rare: 25, very_rare: 89 }, // 569 Black2
    HeldItemEntry { common: 26, rare: 25, very_rare: 89 }, // 569 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 570 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 570 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 570 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 570 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 571 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 571 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 571 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 571 White2
    HeldItemEntry { common: 56, rare: 0, very_rare: 0 }, // 572 Black
    HeldItemEntry { common: 56, rare: 0, very_rare: 0 }, // 572 White
    HeldItemEntry { common: 56, rare: 0, very_rare: 0 }, // 572 Black2
    HeldItemEntry { common: 56, rare: 0, very_rare: 0 }, // 572 White2
    HeldItemEntry { common: 56, rare: 0, very_rare: 0 }, // 573 Black
    HeldItemEntry { common: 56, rare: 0, very_rare: 0 }, // 573 White
    HeldItemEntry { common: 56, rare: 0, very_rare: 0 }, // 573 Black2
    HeldItemEntry { common: 56, rare: 0, very_rare: 0 }, // 573 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 574 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 574 White
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 574 Black2
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 574 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 575 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 575 White
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 575 Black2
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 575 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 576 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 576 White
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 576 Black2
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 576 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 577 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 577 White
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 577 Black2
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 577 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 578 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 578 White
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 578 Black2
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 578 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 579 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 579 White
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 579 Black2
    HeldItemEntry { common: 46, rare: 0, very_rare: 0 }, // 579 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 580 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 580 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 580 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 580 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 581 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 581 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 581 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 581 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 582 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 582 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 582 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 582 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 583 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 583 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 583 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 583 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 584 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 584 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 584 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 584 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 585 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 585 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 585 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 585 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 586 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 586 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 586 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 586 White2
    HeldItemEntry { common: 78, rare: 0, very_rare: 0 }, // 587 Black
    HeldItemEntry { common: 78, rare: 0, very_rare: 0 }, // 587 White
    HeldItemEntry { common: 78, rare: 0, very_rare: 0 }, // 587 Black2
    HeldItemEntry { common: 78, rare: 0, very_rare: 0 }, // 587 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 588 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 588 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 588 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 588 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 589 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 589 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 589 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 589 White2
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 590 Black
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 590 White
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 590 Black2
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 590 White2
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 591 Black
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 591 White
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 591 Black2
    HeldItemEntry { common: 12, rare: 13, very_rare: 14 }, // 591 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 592 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 592 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 592 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 592 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 593 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 593 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 593 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 593 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 594 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 594 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 594 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 594 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 595 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 595 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 595 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 595 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 596 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 596 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 596 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 596 White2
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 597 Black
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 597 White
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 597 Black2
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 597 White2
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 598 Black
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 598 White
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 598 Black2
    HeldItemEntry { common: 0, rare: 61, very_rare: 0 }, // 598 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 599 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 599 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 599 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 599 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 600 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 600 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 600 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 600 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 601 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 601 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 601 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 601 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 602 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 602 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 602 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 602 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 603 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 603 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 603 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 603 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 604 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 604 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 604 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 604 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 605 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 605 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 605 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 605 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 606 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 606 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 606 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 606 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 607 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 607 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 607 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 607 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 608 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 608 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 608 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 608 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 609 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 609 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 609 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 609 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 610 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 610 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 610 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 610 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 611 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 611 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 611 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 611 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 612 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 612 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 612 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 612 White2
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 613 Black
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 613 White
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 613 Black2
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 613 White2
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 614 Black
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 614 White
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 614 Black2
    HeldItemEntry { common: 37, rare: 0, very_rare: 0 }, // 614 White2
    HeldItemEntry { common: 0, rare: 82, very_rare: 0 }, // 615 Black
    HeldItemEntry { common: 0, rare: 82, very_rare: 0 }, // 615 White
    HeldItemEntry { common: 0, rare: 82, very_rare: 0 }, // 615 Black2
    HeldItemEntry { common: 0, rare: 82, very_rare: 0 }, // 615 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 616 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 616 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 616 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 616 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 617 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 617 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 617 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 617 White2
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 618 Black
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 618 White
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 618 Black2
    HeldItemEntry { common: 0, rare: 16, very_rare: 0 }, // 618 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 619 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 619 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 619 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 619 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 620 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 620 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 620 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 620 White2
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 621 Black
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 621 White
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 621 Black2
    HeldItemEntry { common: 0, rare: 70, very_rare: 0 }, // 621 White2
    HeldItemEntry { common: 0, rare: 90, very_rare: 0 }, // 622 Black
    HeldItemEntry { common: 0, rare: 90, very_rare: 0 }, // 622 White
    HeldItemEntry { common: 0, rare: 90, very_rare: 0 }, // 622 Black2
    HeldItemEntry { common: 0, rare: 90, very_rare: 0 }, // 622 White2
    HeldItemEntry { common: 0, rare: 90, very_rare: 0 }, // 623 Black
    HeldItemEntry { common: 0, rare: 90, very_rare: 0 }, // 623 White
    HeldItemEntry { common: 0, rare: 90, very_rare: 0 }, // 623 Black2
    HeldItemEntry { common: 0, rare: 90, very_rare: 0 }, // 623 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 624 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 624 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 624 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 624 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 625 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 625 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 625 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 625 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 626 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 626 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 626 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 626 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 627 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 627 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 627 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 627 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 628 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 628 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 628 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 628 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 629 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 629 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 629 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 629 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 630 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 630 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 630 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 630 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 631 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 631 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 91 }, // 631 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 91 }, // 631 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 632 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 632 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 632 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 632 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 633 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 633 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 633 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 633 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 634 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 634 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 634 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 634 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 635 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 635 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 635 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 635 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 636 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 636 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 636 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 636 White2
    HeldItemEntry { common: 1, rare: 0, very_rare: 0 }, // 637 Black
    HeldItemEntry { common: 1, rare: 0, very_rare: 0 }, // 637 White
    HeldItemEntry { common: 1, rare: 0, very_rare: 0 }, // 637 Black2
    HeldItemEntry { common: 1, rare: 0, very_rare: 0 }, // 637 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 638 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 638 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 638 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 638 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 639 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 639 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 639 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 639 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 640 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 640 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 640 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 640 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 641 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 641 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 641 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 641 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 642 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 642 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 642 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 642 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 643 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 643 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 643 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 643 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 644 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 644 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 644 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 644 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 645 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 645 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 645 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 645 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 646 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 646 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 646 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 646 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 647 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 647 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 647 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 647 White2
    HeldItemEntry { common: 36, rare: 0, very_rare: 0 }, // 648 Black
    HeldItemEntry { common: 36, rare: 0, very_rare: 0 }, // 648 White
    HeldItemEntry { common: 36, rare: 0, very_rare: 0 }, // 648 Black2
    HeldItemEntry { common: 36, rare: 0, very_rare: 0 }, // 648 White2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 649 Black
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 649 White
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 649 Black2
    HeldItemEntry { common: 0, rare: 0, very_rare: 0 }, // 649 White2
];

/// 持ち物名を取得
///
/// # Arguments
/// * `item_id` - アイテムID
/// * `locale` - ロケール ("ja" または "en")
///
/// # Returns
/// アイテム名。0 の場合は空文字列を返す。
pub fn get_item_name(item_id: u8, locale: &str) -> &'static str {
    if item_id as usize >= ITEM_NAMES.len() {
        return "";
    }
    let (ja, en) = ITEM_NAMES[item_id as usize];
    match locale {
        "ja" => ja,
        _ => en,
    }
}

/// 種族の持ち物情報を取得
///
/// # Arguments
/// * `species_id` - 全国図鑑番号 (1-649)
/// * `version` - ROMバージョン (0=Black, 1=White, 2=Black2, 3=White2)
///
/// # Returns
/// 持ち物エントリ。範囲外の場合はデフォルト値を返す。
pub fn get_held_item_entry(species_id: u16, version: u8) -> HeldItemEntry {
    if species_id == 0 || species_id > 649 || version > 3 {
        return HeldItemEntry::default();
    }
    let index = ((species_id - 1) as usize) * 4 + (version as usize);
    HELD_ITEMS_TABLE[index]
}

/// 持ち物スロットからアイテム名を取得
///
/// # Arguments
/// * `species_id` - 全国図鑑番号 (1-649)
/// * `version` - ROMバージョン (0=Black, 1=White, 2=Black2, 3=White2)
/// * `slot` - 持ち物スロット
/// * `locale` - ロケール ("ja" または "en")
///
/// # Returns
/// アイテム名。持ち物がない場合は None を返す。
pub fn get_held_item_name(
    species_id: u16,
    version: u8,
    slot: HeldItemSlot,
    locale: &str,
) -> Option<&'static str> {
    let entry = get_held_item_entry(species_id, version);
    let item_id = match slot {
        HeldItemSlot::None => return None,
        HeldItemSlot::Common => entry.common,
        HeldItemSlot::Rare => entry.rare,
        HeldItemSlot::VeryRare => entry.very_rare,
    };
    if item_id == 0 {
        None
    } else {
        Some(get_item_name(item_id, locale))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_item_name() {
        // light-ball (id=6) は「でんきだま」
        assert_eq!(get_item_name(6, "ja"), "でんきだま");
        assert_eq!(get_item_name(6, "en"), "Light Ball");
    }

    #[test]
    fn test_pikachu_held_items() {
        // ピカチュウ (25): オレンのみ(50%), でんきだま(1%)
        let entry = get_held_item_entry(25, 0); // Black
        assert_eq!(entry.common, 5);  // oran-berry
        assert_eq!(entry.very_rare, 6); // light-ball
    }

    #[test]
    fn test_get_held_item_name_pikachu() {
        assert_eq!(
            get_held_item_name(25, 0, HeldItemSlot::Common, "ja"),
            Some("オレンのみ")
        );
        assert_eq!(
            get_held_item_name(25, 0, HeldItemSlot::VeryRare, "en"),
            Some("Light Ball")
        );
    }
}