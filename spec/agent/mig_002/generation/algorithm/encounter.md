# アルゴリズム: エンカウント処理

野生エンカウントに関する乱数処理全般。

## 1. 概要

エンカウント処理は以下の段階で構成される:

1. **エンカウント発生判定** - 歩行時のエンカウント判定
2. **特殊エンカウント発生判定** - 揺れる草むら・砂煙・水泡・橋の影の発生
3. **スロット決定** - 出現するポケモンの種類を決定
4. **レベル決定** - エンカウント種別に応じたレベル決定

## 2. スロット数とエンカウント種別

| エンカウント種別 | スロット数 | 確率分布 |
|----------------|----------|---------|
| Normal (草むら・洞窟) | 12 | 20/20/10/10/10/10/5/5/4/4/1/1 |
| ShakingGrass (揺れる草) | 12 | 20/20/10/10/10/10/5/5/4/4/1/1 |
| Surfing (なみのり) | 5 | 60/30/5/4/1 |
| SurfingBubble (水泡なみのり) | 5 | 60/30/5/4/1 |
| Fishing (釣り) | 5 | 40/40/15/4/1 |
| FishingBubble (水泡釣り) | 5 | 40/40/15/4/1 |
| DustCloud (砂煙) | - | ポケモン/アイテム判定 (§5参照) |
| PokemonShadow (橋の影) | 4 | 50/30/15/5 |
| StaticSymbol | 1 | 固定 |
| StaticStarter | 1 | 固定 |
| StaticFossil | 1 | 固定 |
| StaticEvent | 1 | 固定 |
| Roamer | 1 | 固定 |

**注意**: 揺れる草むらは通常エンカウントと同じ12スロット分布を使用する。

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

## 4. スロット決定アルゴリズム

### 4.1 通常エンカウント / 揺れる草むら (12スロット)

```rust
/// 通常エンカウント・揺れる草むら: 生スロット値 → スロット番号
/// 確率分布: 20%, 20%, 10%, 10%, 10%, 10%, 5%, 5%, 4%, 4%, 1%, 1%
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
        90..=93 => 8,   // 4%
        94..=97 => 9,   // 4%
        98 => 10,       // 1%
        _ => 11,        // 1%
    }
}
```

### 4.2 なみのり / 水泡なみのり (5スロット)

```rust
/// なみのり・水泡なみのり: 生スロット値 → スロット番号
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

### 4.3 釣り / 水泡釣り (5スロット)

```rust
/// 釣り・水泡釣り: 生スロット値 → スロット番号
/// 確率分布: 40%, 40%, 15%, 4%, 1%
fn fishing_encounter_slot(slot_value: u32) -> u8 {
    match slot_value {
        0..=39 => 0,    // 40%
        40..=79 => 1,   // 40%
        80..=94 => 2,   // 15%
        95..=98 => 3,   // 4%
        99 => 4,        // 1%
        _ => 4,
    }
}
```

### 4.4 橋の影 / ポケモンの影 (4スロット)

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

### 4.5 固定エンカウント

```rust
/// 固定シンボル・御三家・化石・イベント・徘徊
/// 常にスロット 0
fn fixed_encounter_slot() -> u8 {
    0
}
```

## 5. 砂煙の内容判定

砂煙ではポケモンまたはアイテムが出現する。スロット決定ではなく内容判定を行う。

### 5.1 内容判定

```rust
/// 砂煙の内容種別
pub enum DustCloudContent {
    EvolutionStone,  // 進化の石
    Jewel,           // ジュエル
    Everstone,       // かわらずの石
}

/// 砂煙の内容を判定
/// 生スロット値から内容を決定
pub fn dust_cloud_content(slot_value: u32) -> DustCloudContent {
    match slot_value {
        0 => DustCloudContent::EvolutionStone,      // 1%
        1..=94 => DustCloudContent::Jewel,          // 94%
        95..=99 => DustCloudContent::Everstone,     // 5%
        _ => DustCloudContent::Jewel,
    }
}
```

**注意**: 砂煙からはアイテムのみ出現し、ポケモンは出現しない。
揺れる草むらや水泡とは異なる仕様。

## 6. 特殊エンカウント発生判定

歩行時に特殊エンカウント（揺れる草むら・砂煙・水泡・橋の影）が発生するかの判定。

### 6.1 発生判定

```rust
/// 特殊エンカウント発生判定
/// 10% の確率で発生
pub fn special_encounter_trigger(rand_value: u32) -> bool {
    // (rand >> 32) * 10 >> 32 == 0 で発生
    ((rand_value as u64 * 10) >> 32) == 0
}
```

### 6.2 発生位置判定

発生する場合、4方向のいずれかに特殊エンカウントが発生する。

```rust
/// 特殊エンカウント発生方向
pub enum Direction {
    Right,
    Up,
    Left,
    Down,
}

/// 発生方向を決定
pub fn special_encounter_direction(rand_value: u32) -> Direction {
    let v = ((rand_value as u64 * 4) >> 32) as u8;
    match v {
        0 => Direction::Right,
        1 => Direction::Up,
        2 => Direction::Left,
        _ => Direction::Down,
    }
}
```

## 7. 通常エンカウント発生判定

「あまいかおり」を使用しない場合の通常エンカウント発生判定。

### 7.1 ダブル草むら判定

```rust
/// ダブルバトル草むら判定
/// 40未満でダブルバトル
pub fn is_double_grass(version: RomVersion, rand_value: u32) -> bool {
    let slot = calculate_raw_slot(version, rand_value);
    slot < 40
}
```

### 7.2 大量発生判定

```rust
/// 大量発生ポケモン判定
/// 40未満で大量発生ポケモンが出現
pub fn is_mass_outbreak(version: RomVersion, rand_value: u32) -> bool {
    let slot = calculate_raw_slot(version, rand_value);
    slot < 40
}
```

## 8. レベル決定

### 8.1 レベル範囲からの決定

なみのり・釣り等ではレベルが乱数で決定される。

```rust
/// レベル乱数値からレベルを決定
pub fn calculate_level(
    version: RomVersion,
    rand_value: u32,
    min_level: u8,
    max_level: u8,
) -> u8 {
    if min_level == max_level {
        return min_level;
    }
    
    let range = (max_level - min_level + 1) as u64;
    
    // BW: (rand * 0xFFFF / 0x290) >> 32 % range + min
    // BW2: (rand * range) >> 32 + min
    let offset = match version {
        RomVersion::Black | RomVersion::White => {
            (calculate_raw_slot(version, rand_value) as u64 % range) as u8
        }
        RomVersion::Black2 | RomVersion::White2 => {
            ((rand_value as u64 * range) >> 32) as u8
        }
    };
    
    min_level + offset
}
```

### 8.2 エンカウント種別によるレベル決定

| エンカウント種別 | レベル決定方法 |
|----------------|--------------|
| Normal | 固定 (乱数消費のみ) |
| ShakingGrass | 固定 |
| Surfing | 範囲内乱数 |
| SurfingBubble | 範囲内乱数 |
| Fishing | 範囲内乱数 |
| FishingBubble | 範囲内乱数 |
| DustCloud | - (アイテムのみ) |
| PokemonShadow | 固定 |
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
        | EncounterType::PokemonShadow => true,
        
        // 消費して使用
        EncounterType::Surfing
        | EncounterType::SurfingBubble
        | EncounterType::Fishing
        | EncounterType::FishingBubble => true,
        
        // 消費なし
        EncounterType::DustCloud
        | EncounterType::StaticSymbol
        | EncounterType::StaticStarter
        | EncounterType::StaticFossil
        | EncounterType::StaticEvent
        | EncounterType::Roamer => false,
    }
}
```

## 9. 統合関数

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
        EncounterType::DustCloud => return 0, // 砂煙は別処理
        _ => {}
    }
    
    // 生スロット値を計算
    let slot_value = calculate_raw_slot(version, rand_value);
    
    // エンカウント種別に応じてスロット番号に変換
    match encounter_type {
        EncounterType::Normal
        | EncounterType::ShakingGrass => normal_encounter_slot(slot_value),
        
        EncounterType::Surfing
        | EncounterType::SurfingBubble => surfing_encounter_slot(slot_value),
        
        EncounterType::Fishing
        | EncounterType::FishingBubble => fishing_encounter_slot(slot_value),
        
        EncounterType::PokemonShadow => pokemon_shadow_encounter_slot(slot_value),
        
        _ => 0,
    }
}
```

## 10. 持ち物判定

野生ポケモンが持ち物を持っているかの判定。

### 10.1 持ち物判定

```rust
/// 持ち物判定
/// ふくがん無し: 50% なし, 50%/5%/1% で持ち物
/// ふくがん有り: 60%/20%/5%/15% (分布が異なる)
pub fn held_item_slot(rand_value: u32, has_compound_eyes: bool) -> Option<u8> {
    let slot = ((rand_value as u64 * 0xFFFF / 0x290) >> 32) as u32;
    
    if has_compound_eyes {
        match slot {
            0..=59 => Some(0),    // 60% - 持ち物1
            60..=79 => Some(1),   // 20% - 持ち物2
            80..=84 => Some(2),   // 5% - レア持ち物
            _ => None,            // 15% - なし (揺れる草むら/泡のみ)
        }
    } else {
        match slot {
            0..=49 => None,       // 50% - なし
            50..=54 => Some(0),   // 5% - 持ち物1
            55 => Some(1),        // 1% - 持ち物2 (揺れる草むら/泡のみ)
            _ => None,            // 残り - なし
        }
    }
}
```

## 関連ドキュメント

- [生成フロー: 野生](../flows/pokemon-wild.md)
- [型定義](../data-structures.md)
- [共通型定義](../../common/types.md)
