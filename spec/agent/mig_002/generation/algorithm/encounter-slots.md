# アルゴリズム: エンカウントスロット決定

乱数値からエンカウントスロットを決定するアルゴリズム。

## 1. 概要

エンカウントスロットは出現するポケモンの種類を決定する。
スロット番号は出現テーブルのインデックスに対応。

## 2. スロット数とエンカウント種別

| エンカウント種別 | スロット数 | 確率分布 |
|----------------|----------|---------|
| Normal (草むら・洞窟) | 12 | 20/20/10/10/10/10/5/5/5/4/1/1 |
| Surfing | 5 | 60/30/5/4/1 |
| Fishing | 5 | 70/15/10/5/rare |
| ShakingGrass (揺れる草) | 5 | 40/20/20/15/5 |
| DustCloud (砂煙) | 3 | 70/20/10 |
| PokemonShadow (橋の影) | 4 | 50/30/15/5 |
| SurfingBubble (水泡なみのり) | 4 | 50/30/15/5 |
| FishingBubble (水泡釣り) | 4 | 60/25/10/5 |
| StaticSymbol | 1 | 固定 |
| StaticStarter | 1 | 固定 |
| StaticFossil | 1 | 固定 |
| StaticEvent | 1 | 固定 |
| Roamer | 1 | 固定 |

## 3. 生スロット値の計算

### 3.1 BW/BW2 での違い

BW と BW2 で乱数から生スロット値への変換式が異なる。

```rust
/// 乱数値から生スロット値 (0-99) を計算
pub fn calculate_raw_slot(version: RomVersion, rand_value: u32) -> u32 {
    match version {
        RomVersion::Black | RomVersion::White => {
            // BW: (rand * 0xFFFF / 0x290) >> 32
            ((rand_value as u64 * 0xFFFF / 0x290) >> 32) as u32
        }
        RomVersion::Black2 | RomVersion::White2 => {
            // BW2: (rand * 100) >> 32
            ((rand_value as u64 * 100) >> 32) as u32
        }
    }
}
```

**注意**: BW は `0xFFFF / 0x290` (約 99.93) を使用し、BW2 は直接 `100` を使用する。
結果はほぼ同じだが、境界値付近で異なる場合がある。

## 4. スロット決定アルゴリズム

### 4.1 通常エンカウント (12スロット)

```rust
/// 通常エンカウント: 生スロット値 → スロット番号
/// 確率分布: 20%, 20%, 10%, 10%, 10%, 10%, 5%, 5%, 5%, 4%, 1%, 1%
fn normal_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=19 => 0,    // 20%
        20..=39 => 1,   // 20%
        40..=49 => 2,   // 10%
        50..=59 => 3,   // 10%
        60..=69 => 4,   // 10%
        70..=79 => 5,   // 10%
        80..=84 => 6,   // 5%
        85..=89 => 7,   // 5%
        90..=94 => 8,   // 5%
        95..=98 => 9,   // 4%
        99 => 10,       // 1%
        _ => 11,        // 1%
    }
}
```

### 4.2 なみのり (5スロット)

```rust
/// なみのり: 生スロット値 → スロット番号
/// 確率分布: 60%, 30%, 5%, 4%, 1%
fn surfing_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=59 => 0,    // 60%
        60..=89 => 1,   // 30%
        90..=94 => 2,   // 5%
        95..=98 => 3,   // 4%
        99 => 4,        // 1%
        _ => 4,
    }
}
```

### 4.3 釣り (5スロット)

```rust
/// 釣り: 生スロット値 → スロット番号
/// 確率分布: 70%, 15%, 10%, 5% (+レア)
fn fishing_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=69 => 0,    // 70%
        70..=84 => 1,   // 15%
        85..=94 => 2,   // 10%
        95..=99 => 3,   // 5%
        _ => 4,         // レア
    }
}
```

### 4.4 揺れる草むら (5スロット)

```rust
/// 揺れる草むら: 生スロット値 → スロット番号
/// 確率分布: 40%, 20%, 20%, 15%, 5%
fn shaking_grass_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=39 => 0,    // 40%
        40..=59 => 1,   // 20%
        60..=79 => 2,   // 20%
        80..=94 => 3,   // 15%
        95..=99 => 4,   // 5%
        _ => 4,
    }
}
```

### 4.5 砂煙 (3スロット)

```rust
/// 砂煙: 生スロット値 → スロット番号
/// 確率分布: 70%, 20%, 10%
/// スロット0: ポケモン, スロット1: ジュエル類, スロット2: 進化石類
fn dust_cloud_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=69 => 0,    // 70%
        70..=89 => 1,   // 20%
        90..=99 => 2,   // 10%
        _ => 2,
    }
}
```

### 4.6 橋の影 / ポケモンの影 (4スロット)

```rust
/// 橋の影: 生スロット値 → スロット番号
/// 確率分布: 50%, 30%, 15%, 5%
fn pokemon_shadow_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=49 => 0,    // 50%
        50..=79 => 1,   // 30%
        80..=94 => 2,   // 15%
        95..=99 => 3,   // 5%
        _ => 3,
    }
}
```

### 4.7 水泡なみのり (4スロット)

```rust
/// 水泡なみのり: 生スロット値 → スロット番号
/// 確率分布: 50%, 30%, 15%, 5%
fn surfing_bubble_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=49 => 0,    // 50%
        50..=79 => 1,   // 30%
        80..=94 => 2,   // 15%
        95..=99 => 3,   // 5%
        _ => 3,
    }
}
```

### 4.8 水泡釣り (4スロット)

```rust
/// 水泡釣り: 生スロット値 → スロット番号
/// 確率分布: 60%, 25%, 10%, 5%
fn fishing_bubble_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=59 => 0,    // 60%
        60..=84 => 1,   // 25%
        85..=94 => 2,   // 10%
        95..=99 => 3,   // 5%
        _ => 3,
    }
}
```

### 4.9 固定エンカウント

```rust
/// 固定シンボル・御三家・化石・イベント・徘徊
/// 常にスロット 0
fn fixed_encounter_slot() -> u8 {
    0
}
```

## 5. 統合関数

```rust
/// エンカウント種別と乱数値からスロット番号を決定
pub fn calculate_encounter_slot(
    version: RomVersion,
    encounter_type: EncounterType,
    rand_value: u32,
) -> u8 {
    // 固定エンカウントはスロット不要
    match encounter_type {
        EncounterType::StaticSymbol
        | EncounterType::StaticStarter
        | EncounterType::StaticFossil
        | EncounterType::StaticEvent
        | EncounterType::Roamer => return fixed_encounter_slot(),
        _ => {}
    }
    
    // 生スロット値を計算
    let slot_value = calculate_raw_slot(version, rand_value);
    
    // エンカウント種別に応じてスロット番号に変換
    match encounter_type {
        EncounterType::Normal => normal_encounter_slot(slot_value),
        EncounterType::Surfing => surfing_encounter_slot(slot_value),
        EncounterType::Fishing => fishing_encounter_slot(slot_value),
        EncounterType::ShakingGrass => shaking_grass_encounter_slot(slot_value),
        EncounterType::DustCloud => dust_cloud_encounter_slot(slot_value),
        EncounterType::PokemonShadow => pokemon_shadow_encounter_slot(slot_value),
        EncounterType::SurfingBubble => surfing_bubble_encounter_slot(slot_value),
        EncounterType::FishingBubble => fishing_bubble_encounter_slot(slot_value),
        _ => 0,
    }
}
```

## 6. レベル決定

### 6.1 レベル範囲からの決定

なみのり・釣り等ではレベルが乱数で決定される。

```rust
/// レベル乱数値からレベルを決定
pub fn calculate_level(
    rand_value: u32,
    min_level: u8,
    max_level: u8,
) -> u8 {
    if min_level == max_level {
        return min_level;
    }
    let range = (max_level - min_level + 1) as u32;
    let offset = ((rand_value as u64 * range as u64) >> 32) as u8;
    min_level + offset
}
```

### 6.2 エンカウント種別によるレベル決定

| エンカウント種別 | レベル決定方法 |
|----------------|--------------|
| Normal | 固定 (乱数消費のみ) |
| Surfing | 範囲内乱数 |
| Fishing | 範囲内乱数 |
| FishingBubble | 範囲内乱数 |
| ShakingGrass | 固定 |
| DustCloud | 固定 |
| PokemonShadow | 固定 |
| SurfingBubble | 範囲内乱数 |
| StaticSymbol | 固定 (乱数消費なし) |
| StaticStarter | 固定 (乱数消費なし) |
| StaticFossil | 固定 (乱数消費なし) |
| StaticEvent | 固定 (乱数消費なし) |
| Roamer | 固定 (乱数消費なし) |

```rust
/// レベル決定で乱数を消費するか
pub fn consumes_level_rand(encounter_type: EncounterType) -> bool {
    match encounter_type {
        // 消費するが結果は使わない
        EncounterType::Normal
        | EncounterType::ShakingGrass
        | EncounterType::DustCloud
        | EncounterType::PokemonShadow => true,
        
        // 消費して使用
        EncounterType::Surfing
        | EncounterType::SurfingBubble
        | EncounterType::Fishing
        | EncounterType::FishingBubble => true,
        
        // 消費なし
        EncounterType::StaticSymbol
        | EncounterType::StaticStarter
        | EncounterType::StaticFossil
        | EncounterType::StaticEvent
        | EncounterType::Roamer => false,
    }
}
```

## 関連ドキュメント

- [生成フロー: 野生](../flows/pokemon-wild.md)
- [型定義](../data-structures.md)
- [共通型定義](../../common/types.md)
