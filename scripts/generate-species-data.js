#!/usr/bin/env node
/**
 * gen5-species.json から Rust ソースコードを生成するスクリプト
 *
 * 使用方法:
 *   node scripts/generate-species-data.js
 *
 * 出力先:
 *   wasm-pkg/src/data/species.rs
 *   wasm-pkg/src/data/abilities.rs
 *   wasm-pkg/src/data/items.rs
 *   wasm-pkg/src/data/names.rs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// 入力ファイル
const SPECIES_JSON_PATH = join(ROOT_DIR, 'spec/agent/complete/local_029/gen5-species.json');

// 出力ディレクトリ
const DATA_DIR = join(ROOT_DIR, 'wasm-pkg/src/data');
const VERSION_KEYS = ['black', 'white', 'black-2', 'white-2'];
const VERSION_LABELS = {
  black: 'Black',
  white: 'White',
  'black-2': 'Black2',
  'white-2': 'White2',
};

// 性別比を GenderRatio 列挙型にマッピング
function mapGenderRatio(gender) {
  if (gender.type === 'genderless') {
    return 'GenderRatio::Genderless';
  }
  if (gender.type === 'fixed') {
    if (gender.fixed === 'male') {
      return 'GenderRatio::MaleOnly';
    }
    if (gender.fixed === 'female') {
      return 'GenderRatio::FemaleOnly';
    }
  }
  if (gender.type === 'male-only') {
    return 'GenderRatio::MaleOnly';
  }
  if (gender.type === 'female-only') {
    return 'GenderRatio::FemaleOnly';
  }
  // ratio type
  const threshold = gender.femaleThreshold;
  if (threshold === 32 || threshold === 31) {
    return 'GenderRatio::F1M7';
  }
  if (threshold === 64 || threshold === 63) {
    return 'GenderRatio::F1M3';
  }
  if (threshold === 128 || threshold === 127) {
    return 'GenderRatio::F1M1';
  }
  if (threshold === 192 || threshold === 191) {
    return 'GenderRatio::F3M1';
  }
  // フォールバック
  console.warn(`Unknown gender threshold: ${threshold}, defaulting to F1M1`);
  return 'GenderRatio::F1M1';
}

// メイン処理
function main() {
  console.log('Reading species data...');
  if (!existsSync(SPECIES_JSON_PATH)) {
    throw new Error(`Species data not found: ${SPECIES_JSON_PATH}`);
  }
  const speciesData = JSON.parse(readFileSync(SPECIES_JSON_PATH, 'utf-8'));

  // 出力ディレクトリ作成
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  // 特性を収集 (重複排除)
  const abilityMap = new Map(); // key -> { id, names: { en, ja } }
  abilityMap.set('', { id: 0, names: { en: '', ja: '' } }); // 0番は空

  let nextAbilityId = 1;
  for (const id of Object.keys(speciesData).sort((a, b) => Number(a) - Number(b))) {
    const species = speciesData[id];
    const abilities = species.abilities;

    for (const slot of ['ability1', 'ability2', 'hidden']) {
      const ability = abilities[slot];
      if (ability && ability.key && !abilityMap.has(ability.key)) {
        abilityMap.set(ability.key, {
          id: nextAbilityId++,
          names: ability.names,
        });
      }
    }
  }

  console.log(`Found ${abilityMap.size - 1} unique abilities`);

  // 持ち物を収集 (重複排除)
  const itemMap = new Map(); // key -> { id, names: { en, ja } }
  itemMap.set('', { id: 0, names: { en: '', ja: '' } }); // 0番は空

  let nextItemId = 1;
  for (const id of Object.keys(speciesData).sort((a, b) => Number(a) - Number(b))) {
    const species = speciesData[id];
    for (const version of VERSION_KEYS) {
      for (const item of species.heldItems?.[version] ?? []) {
        if (item.key && !itemMap.has(item.key)) {
          itemMap.set(item.key, {
            id: nextItemId++,
            names: item.names,
          });
        }
      }
    }
  }

  console.log(`Found ${itemMap.size - 1} unique held items`);

  // 種族データを生成
  const speciesEntries = [];
  const speciesNamesJa = [];
  const speciesNamesEn = [];
  const heldItemEntries = [];

  for (let i = 1; i <= 649; i++) {
    const species = speciesData[String(i)];
    if (!species) {
      // 欠番の場合はダミーデータ
      speciesEntries.push(`    // #${String(i).padStart(3, '0')} (missing)
    SpeciesEntry {
        base_stats: BaseStats { hp: 0, attack: 0, defense: 0, special_attack: 0, special_defense: 0, speed: 0 },
        gender_ratio: GenderRatio::Genderless,
        ability_ids: [0, 0, 0],
    }`);
      speciesNamesJa.push(`"???"`);
      speciesNamesEn.push(`"???"`);
      continue;
    }

    const bs = species.baseStats;
    const genderRatio = mapGenderRatio(species.gender);

    // 特性ID取得
    const ability1Id =
      species.abilities.ability1 && species.abilities.ability1.key
        ? abilityMap.get(species.abilities.ability1.key).id
        : 0;
    const ability2Id =
      species.abilities.ability2 && species.abilities.ability2.key
        ? abilityMap.get(species.abilities.ability2.key).id
        : 0;
    const hiddenId =
      species.abilities.hidden && species.abilities.hidden.key
        ? abilityMap.get(species.abilities.hidden.key).id
        : 0;

    speciesEntries.push(`    // #${String(i).padStart(3, '0')} ${species.names.en}
    SpeciesEntry {
        base_stats: BaseStats { hp: ${bs.hp}, attack: ${bs.attack}, defense: ${bs.defense}, special_attack: ${bs.specialAttack}, special_defense: ${bs.specialDefense}, speed: ${bs.speed} },
        gender_ratio: ${genderRatio},
        ability_ids: [${ability1Id}, ${ability2Id}, ${hiddenId}],
    }`);

    speciesNamesJa.push(`"${species.names.ja}"`);
    speciesNamesEn.push(`"${species.names.en}"`);

    for (const version of VERSION_KEYS) {
      const entry = mapHeldItemEntry(species.heldItems?.[version] ?? [], itemMap);
      heldItemEntries.push(`    HeldItemEntry {
        common: ${entry.common},
        rare: ${entry.rare},
        very_rare: ${entry.veryRare},
    }, // ${i} ${VERSION_LABELS[version]}`);
    }
  }

  // species.rs を生成
  const speciesRs = `//! 種族データテーブル
//!
//! このファイルは自動生成されています。直接編集しないでください。
//! 生成コマンド: node scripts/generate-species-data.js

use crate::types::GenderRatio;

/// 種族値
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct BaseStats {
    pub hp: u8,
    pub attack: u8,
    pub defense: u8,
    pub special_attack: u8,
    pub special_defense: u8,
    pub speed: u8,
}

/// 種族エントリ
#[derive(Clone, Copy, Debug)]
pub struct SpeciesEntry {
    pub base_stats: BaseStats,
    pub gender_ratio: GenderRatio,
    /// 特性ID: [通常1, 通常2, 夢] (0 = なし)
    pub ability_ids: [u8; 3],
}

/// 種族テーブル (649件)
pub static SPECIES_TABLE: [SpeciesEntry; 649] = [
${speciesEntries.join(',\n')},
];

/// 種族エントリを取得
///
/// # Arguments
/// * \`species_id\` - 全国図鑑番号 (1-649)
///
/// # Returns
/// 種族エントリへの参照。範囲外の場合はインデックス0 (フシギダネ) を返す。
#[inline]
pub fn get_species_entry(species_id: u16) -> &'static SpeciesEntry {
    let index = if species_id == 0 || species_id > 649 {
        0
    } else {
        (species_id - 1) as usize
    };
    &SPECIES_TABLE[index]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_species_entry_bulbasaur() {
        let entry = get_species_entry(1);
        assert_eq!(entry.base_stats.hp, 45);
        assert_eq!(entry.base_stats.attack, 49);
        assert_eq!(entry.base_stats.speed, 45);
    }

    #[test]
    fn test_get_species_entry_pikachu() {
        let entry = get_species_entry(25);
        assert_eq!(entry.base_stats.hp, 35);
        assert_eq!(entry.base_stats.attack, 55);
        assert_eq!(entry.base_stats.speed, 90);
    }

    #[test]
    fn test_get_species_entry_gen5_corrected_base_stats() {
        assert_eq!(get_species_entry(526).base_stats.special_defense, 70);
        assert_eq!(get_species_entry(25).base_stats.defense, 30);
        assert_eq!(get_species_entry(488).base_stats.defense, 120);
        assert_eq!(get_species_entry(488).base_stats.special_defense, 130);
    }

    #[test]
    fn test_get_species_entry_out_of_range() {
        // 0 と 650 はインデックス0にフォールバック
        let entry0 = get_species_entry(0);
        let entry650 = get_species_entry(650);
        let entry1 = get_species_entry(1);
        assert_eq!(entry0.base_stats.hp, entry1.base_stats.hp);
        assert_eq!(entry650.base_stats.hp, entry1.base_stats.hp);
    }
}
`;

  // abilities.rs を生成
  const abilityEntries = Array.from(abilityMap.entries())
    .sort((a, b) => a[1].id - b[1].id)
    .map(([key, val]) => {
      const jaName = val.names.ja || '';
      const enName = val.names.en || '';
      return `    // ${val.id}: ${key || '(none)'}
    ("${jaName}", "${enName}")`;
    });

  const abilitiesRs = `//! 特性データテーブル
//!
//! このファイルは自動生成されています。直接編集しないでください。
//! 生成コマンド: node scripts/generate-species-data.js

use crate::types::AbilitySlot;
use super::species::get_species_entry;

/// 特性名テーブル: (日本語名, 英語名)
/// インデックス 0 は「なし」を表す空文字列
pub static ABILITY_NAMES: [(&str, &str); ${abilityMap.size}] = [
${abilityEntries.join(',\n')},
];

/// 特性名を取得
///
/// # Arguments
/// * \`species_id\` - 全国図鑑番号 (1-649)
/// * \`slot\` - 特性スロット
/// * \`locale\` - ロケール ("ja" または "en")
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
        assert_eq!(get_ability_name(525, AbilitySlot::Second, "ja"), "がんじょう");
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
`;

  // items.rs を生成
  const itemEntries = Array.from(itemMap.entries())
    .sort((a, b) => a[1].id - b[1].id)
    .map(([key, val]) => {
      const jaName = val.names.ja || '';
      const enName = val.names.en || '';
      return `    // ${val.id}: ${key || '(none)'}
    ("${jaName}", "${enName}")`;
    });

  const itemsRs = `//! 持ち物データテーブル
//
//! このファイルは自動生成されています。直接編集しないでください。
//! 生成コマンド: node scripts/generate-species-data.js

use crate::types::HeldItemSlot;

/// 持ち物名テーブル: (日本語名, 英語名)
/// インデックス 0 は「なし」を表す空文字列
pub static ITEM_NAMES: [(&str, &str); ${itemMap.size}] = [
${itemEntries.join(',\n')},
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
/// インデックス: \`(species_id - 1) * 4 + version_index\`
///
/// \`version_index\`: \`0=Black\`, \`1=White\`, \`2=Black2\`, \`3=White2\`
pub static HELD_ITEMS_TABLE: [HeldItemEntry; 2596] = [
${heldItemEntries.join('\n')}
];

/// 持ち物名を取得
///
/// # Arguments
/// * \`item_id\` - アイテムID
/// * \`locale\` - ロケール ("ja" または "en")
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
/// * \`species_id\` - 全国図鑑番号 (1-649)
/// * \`version\` - ROMバージョン (0=Black, 1=White, 2=Black2, 3=White2)
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
/// * \`species_id\` - 全国図鑑番号 (1-649)
/// * \`version\` - ROMバージョン (0=Black, 1=White, 2=Black2, 3=White2)
/// * \`slot\` - 持ち物スロット
/// * \`locale\` - ロケール ("ja" または "en")
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
        assert_eq!(entry.common, 5); // oran-berry
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
`;

  // names.rs を生成
  const namesRs = `//! ローカライズ名前テーブル
//!
//! このファイルは自動生成されています。直接編集しないでください。
//! 生成コマンド: node scripts/generate-species-data.js

/// 種族名 (日本語)
pub static SPECIES_NAMES_JA: [&str; 649] = [
    ${speciesNamesJa.join(',\n    ')},
];

/// 種族名 (英語)
pub static SPECIES_NAMES_EN: [&str; 649] = [
    ${speciesNamesEn.join(',\n    ')},
];

/// 種族名を取得
///
/// # Arguments
/// * \`species_id\` - 全国図鑑番号 (1-649)
/// * \`locale\` - ロケール ("ja" または "en")
///
/// # Returns
/// 種族名。範囲外の場合は "???" を返す。
pub fn get_species_name(species_id: u16, locale: &str) -> &'static str {
    if species_id == 0 || species_id > 649 {
        return "???";
    }
    let index = (species_id - 1) as usize;
    match locale {
        "ja" => SPECIES_NAMES_JA[index],
        _ => SPECIES_NAMES_EN[index],
    }
}

/// 性格名 (日本語)
pub static NATURE_NAMES_JA: [&str; 25] = [
    "がんばりや", "さみしがり", "ゆうかん", "いじっぱり", "やんちゃ",
    "ずぶとい", "すなお", "のんき", "わんぱく", "のうてんき",
    "おくびょう", "せっかち", "まじめ", "ようき", "むじゃき",
    "ひかえめ", "おっとり", "れいせい", "てれや", "うっかりや",
    "おだやか", "おとなしい", "なまいき", "しんちょう", "きまぐれ",
];

/// 性格名 (英語)
pub static NATURE_NAMES_EN: [&str; 25] = [
    "Hardy", "Lonely", "Brave", "Adamant", "Naughty",
    "Bold", "Docile", "Relaxed", "Impish", "Lax",
    "Timid", "Hasty", "Serious", "Jolly", "Naive",
    "Modest", "Mild", "Quiet", "Bashful", "Rash",
    "Calm", "Gentle", "Sassy", "Careful", "Quirky",
];

/// 性格名を取得
///
/// # Arguments
/// * \`nature_id\` - 性格ID (0-24)
/// * \`locale\` - ロケール ("ja" または "en")
///
/// # Returns
/// 性格名。範囲外の場合は "???" を返す。
pub fn get_nature_name(nature_id: u8, locale: &str) -> &'static str {
    if nature_id >= 25 {
        return "???";
    }
    let index = nature_id as usize;
    match locale {
        "ja" => NATURE_NAMES_JA[index],
        _ => NATURE_NAMES_EN[index],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_species_name_bulbasaur() {
        assert_eq!(get_species_name(1, "ja"), "フシギダネ");
        assert_eq!(get_species_name(1, "en"), "Bulbasaur");
    }

    #[test]
    fn test_get_species_name_pikachu() {
        assert_eq!(get_species_name(25, "ja"), "ピカチュウ");
        assert_eq!(get_species_name(25, "en"), "Pikachu");
    }

    #[test]
    fn test_get_species_name_out_of_range() {
        assert_eq!(get_species_name(0, "ja"), "???");
        assert_eq!(get_species_name(650, "en"), "???");
    }

    #[test]
    fn test_get_nature_name() {
        assert_eq!(get_nature_name(0, "ja"), "がんばりや");
        assert_eq!(get_nature_name(0, "en"), "Hardy");
        assert_eq!(get_nature_name(3, "ja"), "いじっぱり");
        assert_eq!(get_nature_name(3, "en"), "Adamant");
    }

    #[test]
    fn test_get_nature_name_out_of_range() {
        assert_eq!(get_nature_name(25, "ja"), "???");
        assert_eq!(get_nature_name(255, "en"), "???");
    }
}
`;

  // mod.rs を生成
  const modRs = `//! 静的データモジュール
//!
//! 種族データ、特性、名前などの静的マスタデータを提供。
//!
//! このモジュールのファイルは自動生成されています。
//! 生成コマンド: node scripts/generate-species-data.js

pub mod abilities;
pub mod items;
pub mod names;
pub mod species;
pub mod stats;

pub use abilities::get_ability_name;
pub use items::{get_held_item_entry, get_held_item_name, get_item_name, HeldItemEntry};
pub use names::{get_nature_name, get_species_name};
pub use species::{get_species_entry, BaseStats, SpeciesEntry};
pub use stats::{calculate_stats, Stats};
`;

  // ファイル書き出し
  writeFileSync(join(DATA_DIR, 'species.rs'), speciesRs, 'utf-8');
  console.log('Generated: wasm-pkg/src/data/species.rs');

  writeFileSync(join(DATA_DIR, 'abilities.rs'), abilitiesRs, 'utf-8');
  console.log('Generated: wasm-pkg/src/data/abilities.rs');

  writeFileSync(join(DATA_DIR, 'items.rs'), itemsRs, 'utf-8');
  console.log('Generated: wasm-pkg/src/data/items.rs');

  writeFileSync(join(DATA_DIR, 'names.rs'), namesRs, 'utf-8');
  console.log('Generated: wasm-pkg/src/data/names.rs');

  writeFileSync(join(DATA_DIR, 'mod.rs'), modRs, 'utf-8');
  console.log('Generated: wasm-pkg/src/data/mod.rs');

  console.log('\nDone! Generated 5 files in wasm-pkg/src/data/');
}

main();

function mapHeldItemEntry(items, itemMap) {
  const entry = {
    common: 0,
    rare: 0,
    veryRare: 0,
  };

  for (const item of items) {
    const itemId = itemMap.get(item.key)?.id;
    if (!itemId) {
      throw new Error(`Unknown held item: ${item.key}`);
    }

    if (item.rarity === 50 || item.rarity === 100) {
      assignHeldItemSlot(entry, 'common', itemId, item);
    } else if (item.rarity === 5) {
      assignHeldItemSlot(entry, 'rare', itemId, item);
    } else if (item.rarity === 1) {
      assignHeldItemSlot(entry, 'veryRare', itemId, item);
    } else {
      throw new Error(`Unsupported held item rarity: ${item.key} ${item.rarity}`);
    }
  }

  return entry;
}

function assignHeldItemSlot(entry, slot, itemId, item) {
  if (entry[slot] !== 0) {
    throw new Error(`Duplicate held item slot: ${slot} ${item.key}`);
  }
  entry[slot] = itemId;
}
