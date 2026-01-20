# アルゴリズム: エンカウント処理

野生エンカウントに関する乱数処理全般。

## 1. 概要

エンカウント処理は以下の段階で構成される:

1. **エンカウント発生判定** - 歩行時のエンカウント判定
2. **特殊エンカウント発生判定** - 揺れる草むら・砂煙・水泡・橋の影の発生
3. **エンカウント成否判定** - 釣り成功/失敗、砂煙→アイテム等
4. **スロット決定** - 出現するポケモンの種類を決定
5. **レベル決定** - エンカウント種別に応じたレベル決定

### 1.1 エンカウント結果種別

エンカウント処理の結果は以下のいずれかになる:

```rust
/// エンカウント結果
pub enum EncounterResult {
    /// ポケモン生成に進む
    Pokemon,
    /// アイテム取得 (砂煙・橋の影)
    Item(ItemContent),
    /// 失敗 (釣り失敗等)
    Failed,
}

/// アイテム内容
pub enum ItemContent {
    /// 進化の石 (DustCloud)
    EvolutionStone,
    /// ジュエル (DustCloud)
    Jewel,
    /// かわらずの石 (DustCloud)
    Everstone,
    /// 羽根 (PokemonShadow)
    Feather,
}
```

| エンカウント種別 | 結果パターン |
|----------------|-------------|
| Normal/ShakingGrass | 常に Pokemon |
| Surfing/SurfingBubble | 常に Pokemon |
| Fishing/FishingBubble | Pokemon or Failed |
| DustCloud | Pokemon or Item (§5参照) |
| PokemonShadow | Pokemon or Item (§5.5参照) |
| Static* | 常に Pokemon |

## 2. スロット数とエンカウント種別

| エンカウント種別 | スロット数 | 確率分布 |
|----------------|----------|---------|
| Normal (草むら・洞窟) | 12 | 20/20/10/10/10/10/5/5/4/4/1/1 |
| ShakingGrass (揺れる草) | 12 | 20/20/10/10/10/10/5/5/4/4/1/1 |
| Surfing (なみのり) | 5 | 60/30/5/4/1 |
| SurfingBubble (水泡なみのり) | 5 | 60/30/5/4/1 |
| Fishing (釣り) | 5 | 40/40/15/4/1 |
| FishingBubble (水泡釣り) | 5 | 40/40/15/4/1 |
| DustCloud (砂煙) | 12 | Pokemon時: 20/20/10/10/10/10/5/5/4/4/1/1 (§5参照) |
| PokemonShadow (橋の影) | 4 | Pokemon時: 50/30/15/5 (§5.5参照) |
| StaticSymbol | 1 | 固定 |
| StaticStarter | 1 | 固定 |
| StaticFossil | 1 | 固定 |
| StaticEvent | 1 | 固定 |
| Roamer | 1 | 固定 |

**注意**: 揺れる草むらは通常エンカウントと同じ12スロット分布を使用する。

## 3. 百分率換算値の計算

### 3.1 BW/BW2 での違い

BW と BW2 で乱数から百分率換算値 (0-99) への変換式が異なる。
この値はエンカウントスロット決定・歩行エンカウント判定等で共通して使用する。

```rust
/// 乱数値から百分率換算値 (0-99) を計算
/// エンカウントスロット・歩行エンカウント判定等で共通使用
pub fn rand_to_percent(version: RomVersion, rand_value: u32) -> u32 {
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

百分率換算値を使用してスロット番号を決定する。

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

砂煙ではポケモンまたはアイテムが出現する。

### 5.1 Pokemon/Item 判定

最初に Pokemon か Item かを判定する。

```rust
/// 砂煙の結果を判定
/// 生スロット値から Pokemon/Item を決定
pub fn dust_cloud_result(slot_value: u32) -> EncounterResult {
    match slot_value {
        0..=69 => EncounterResult::Pokemon,  // 70%
        _ => {                                // 30%
            let item = dust_cloud_item_content(slot_value);
            EncounterResult::Item(item)
        }
    }
}
```

### 5.2 アイテム内容判定

Item の場合、アイテム種別を決定する (取説.txt 準拠):

```rust
/// 砂煙のアイテム内容を判定
/// 生スロット値 70-99 の範囲から内容を決定
pub fn dust_cloud_item_content(slot_value: u32) -> ItemContent {
    match slot_value {
        70 => ItemContent::EvolutionStone,        // 1% (70のみ)
        71..=94 => ItemContent::Jewel,            // 24% (71-94)
        95..=99 => ItemContent::Everstone,        // 5% (95-99)
        _ => ItemContent::Jewel,                  // フォールバック
    }
}
```

### 5.3 Pokemon 時のスロット決定

Pokemon の場合、通常エンカウントと同じ12スロット分布を使用する。

### 5.4 確率まとめ

| 結果 | 確率 |
|-----|------|
| Pokemon | 70% |
| Item(EvolutionStone) | 1% |
| Item(Jewel) | 24% |
| Item(Everstone) | 5% |

## 5.5 橋の影の内容判定

橋の影ではポケモンまたは羽根アイテムが出現する。

### 5.5.1 Pokemon/Item 判定

```rust
/// 橋の影の結果を判定
/// 生スロット値から Pokemon/Item を決定
pub fn pokemon_shadow_result(slot_value: u32) -> EncounterResult {
    match slot_value {
        0..=29 => EncounterResult::Pokemon,              // 30%
        _ => EncounterResult::Item(ItemContent::Feather), // 70%
    }
}
```

### 5.5.2 Pokemon 時のスロット決定

Pokemon の場合、4スロット (50/30/15/5) 分布を使用する。

### 5.5.3 確率まとめ

| 結果 | 確率 |
|-----|------|
| Pokemon | 30% |
| Item(Feather) | 70% |

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

## 7. 釣り成功判定

釣りは成功/失敗がある。失敗時はポケモン生成に進まない。

```rust
/// 釣り成功判定
/// 50% の確率で成功
pub fn fishing_success(rand_value: u32) -> bool {
    // (rand * 2) >> 32 == 0 で成功
    ((rand_value as u64 * 2) >> 32) == 0
}
```

**注意**: 釣り失敗時は乱数消費のみで個体生成処理には進まない。

## 8. 移動エンカウント発生判定

歩行時のエンカウント発生率判定。あまいかおり使用時は確定エンカウントとなり判定をスキップする。

### 8.1 エンカウント方法

```rust
/// エンカウント発生方法
pub enum EncounterMethod {
    /// あまいかおり使用 (確定エンカウント、判定スキップ)
    SweetScent,
    /// 歩行移動 (エンカウント判定あり)
    Walking,
}
```

### 8.2 歩行エンカウント判定結果

```rust
/// 歩行エンカウント判定結果
pub enum WalkingEncounterLikelihood {
    /// 歩数にかかわらず確定エンカウント (最低閾値も通過)
    Guaranteed,
    /// エンカウントの可能性あり (最高閾値のみ通過)
    Possible,
    /// エンカウント無し (最高閾値も不通過)
    NoEncounter,
}
```

### 8.3 BW のエンカウント判定

BW では単一の閾値で判定。`rand_to_percent` で得られる百分率換算値を使用する。

```rust
/// BW エンカウント判定閾値
const BW_ENCOUNTER_THRESHOLD: u32 = 9;

/// BW エンカウント判定
/// 百分率換算値 < 9 でエンカウント
pub fn check_bw_encounter(rand_value: u32) -> WalkingEncounterLikelihood {
    let percent = rand_to_percent(RomVersion::Black, rand_value);
    
    if percent < BW_ENCOUNTER_THRESHOLD {
        WalkingEncounterLikelihood::Guaranteed
    } else {
        WalkingEncounterLikelihood::NoEncounter
    }
}
```

**注意**: BW では Possible は発生しない (Guaranteed or NoEncounter の2択)。

**補足**: 元の式 `(上位16bit / 656) >> 16 < 9` は `rand_to_percent` と等価。
- 656 = 0x290
- `(rand >> 16) / 656` ≈ `(rand * (0xFFFF / 0x290)) >> 32`

### 8.4 BW2 のエンカウント判定

BW2 では歩数に応じてエンカウント率が変化する:
- 最初の1歩 + 次の行動: 判定なし
- その後: 5% → 8% → 11% → 14%... と段階的に増加

乱数調整では歩数を固定せず、最低 (5%) と最高 (14%) の2つの閾値で判定:

```rust
/// BW2 最低エンカウント率 (初期歩数後)
const BW2_ENCOUNTER_MIN_RATE: u32 = 5;
/// BW2 最高エンカウント率 (十分な歩数後)
const BW2_ENCOUNTER_MAX_RATE: u32 = 14;

/// BW2 エンカウント判定
/// 百分率換算値が閾値を下回ればエンカウント
pub fn check_bw2_encounter(rand_value: u32) -> WalkingEncounterLikelihood {
    let percent = rand_to_percent(RomVersion::Black2, rand_value);
    
    if percent < BW2_ENCOUNTER_MIN_RATE {
        // 最低閾値も通過 → 歩数にかかわらず確定
        WalkingEncounterLikelihood::Guaranteed
    } else if percent < BW2_ENCOUNTER_MAX_RATE {
        // 最高閾値のみ通過 → 歩数次第でエンカウント
        WalkingEncounterLikelihood::Possible
    } else {
        // 最高閾値も不通過 → エンカウント無し
        WalkingEncounterLikelihood::NoEncounter
    }
}
```

### 8.5 統合判定関数

`rand_to_percent` を使用して統合:

```rust
/// 歩行エンカウント判定
pub fn check_walking_encounter(
    version: RomVersion,
    rand_value: u32,
) -> WalkingEncounterLikelihood {
    let percent = rand_to_percent(version, rand_value);
    
    match version {
        RomVersion::Black | RomVersion::White => {
            if percent < BW_ENCOUNTER_THRESHOLD {
                WalkingEncounterLikelihood::Guaranteed
            } else {
                WalkingEncounterLikelihood::NoEncounter
            }
        }
        RomVersion::Black2 | RomVersion::White2 => {
            if percent < BW2_ENCOUNTER_MIN_RATE {
                WalkingEncounterLikelihood::Guaranteed
            } else if percent < BW2_ENCOUNTER_MAX_RATE {
                WalkingEncounterLikelihood::Possible
            } else {
                WalkingEncounterLikelihood::NoEncounter
            }
        }
    }
}
```

### 8.6 判定結果の解釈

| 結果 | 意味 | ツールでの用途 |
|-----|------|--------------|
| Guaranteed | 歩数にかかわらず確定 | フィルタ: 確実にエンカウント可能 |
| Possible | 歩数次第 | フィルタ: エンカウント可能性あり |
| NoEncounter | エンカウント無し | フィルタ: 除外 |

### 8.7 あまいかおりとの関係

あまいかおり使用時 (`EncounterMethod::SweetScent`) は:
- エンカウント判定をスキップ (乱数消費なし)
- 確定でエンカウント発生
- 多くの乱数調整ではこちらを使用

### 8.8 未対応事項

以下は現時点で未対応:
- スプレー効果
- 先頭ポケモンの特性効果 (はっこう、あくしゅう、ありじごく等)
- 場所ごとのエンカウント率差異 (14% は一例、場所により異なる可能性)

## 9. 持ち物判定

野生ポケモンが持ち物を持っているかの判定。

### 9.1 持ち物スロット

持ち物は確率カテゴリ (スロット) で判定。実際のアイテムは種族データから TS 側で解決する。

```rust
/// 持ち物スロット
pub enum HeldItemSlot {
    /// 50% アイテム (通常) / 60% アイテム (ふくがん)
    Common,
    /// 5% アイテム (通常) / 20% アイテム (ふくがん)
    Rare,
    /// 1% アイテム (濃い草むら・泡のみ)
    VeryRare,
    /// 持ち物なし
    None,
}
```

### 9.2 判定アルゴリズム

`rand_to_percent` を使用して百分率換算値を取得し、閾値で判定。

```rust
/// 持ち物判定
pub fn determine_held_item_slot(
    version: RomVersion,
    rand_value: u32,
    lead_ability: &LeadAbilityEffect,
    has_rare_item: bool,  // 濃い草むら・泡のみ true
) -> HeldItemSlot {
    let percent = rand_to_percent(version, rand_value);
    let has_compound_eyes = matches!(lead_ability, LeadAbilityEffect::CompoundEyes);
    
    if has_compound_eyes {
        // ふくがん有り
        match percent {
            0..=59 => HeldItemSlot::Common,     // 60%
            60..=79 => HeldItemSlot::Rare,      // 20%
            80..=84 if has_rare_item => HeldItemSlot::VeryRare, // 5%
            _ => HeldItemSlot::None,            // 15% or 20%
        }
    } else {
        // ふくがん無し
        match percent {
            0..=49 => HeldItemSlot::Common,     // 50%
            50..=54 => HeldItemSlot::Rare,      // 5%
            55 if has_rare_item => HeldItemSlot::VeryRare, // 1%
            _ => HeldItemSlot::None,            // 44% or 45%
        }
    }
}
```

### 9.3 確率まとめ

| スロット | 通常 | ふくがん | 備考 |
|---------|------|---------|------|
| Common | 50% (0-49) | 60% (0-59) | 50% アイテム |
| Rare | 5% (50-54) | 20% (60-79) | 5% アイテム |
| VeryRare | 1% (55) | 5% (80-84) | 濃い草むら・泡のみ |
| None | 44% (56-99) | 15% (85-99) | - |

**注意**: VeryRare は濃い草むら・泡でのみ発生。他のエンカウントでは閾値 55/80-84 に達しても None になる。

### 9.4 持ち物判定の発生条件

持ち物判定の乱数消費は以下の**両方**を満たす場合のみ発生:

1. **エンカウント種別が対応している**: Surfing, SurfingBubble, Fishing, FishingBubble, ShakingGrass
2. **当該スロットの種族が持ち物を持つ可能性がある**: `EncounterSlotConfig.has_held_item == true`

```rust
/// 持ち物判定で乱数を消費するか (エンカウント種別レベル)
pub fn encounter_type_supports_held_item(encounter_type: EncounterType) -> bool {
    matches!(
        encounter_type,
        EncounterType::Surfing
        | EncounterType::SurfingBubble
        | EncounterType::Fishing
        | EncounterType::FishingBubble
        | EncounterType::ShakingGrass
    )
}

/// 持ち物判定で乱数を消費するか (スロット考慮)
pub fn consumes_held_item_rand(
    encounter_type: EncounterType,
    slot_config: &EncounterSlotConfig,
) -> bool {
    encounter_type_supports_held_item(encounter_type) && slot_config.has_held_item
}

/// VeryRare スロットが存在するか
pub fn has_very_rare_item(encounter_type: EncounterType) -> bool {
    matches!(
        encounter_type,
        EncounterType::ShakingGrass | EncounterType::SurfingBubble
    )
}
```

| エンカウント種別 | 判定対応 | VeryRare | 備考 |
|----------------|---------|----------|------|
| Normal | なし | - | - |
| ShakingGrass | あり | あり | `has_held_item` 依存 |
| Surfing | あり | なし | `has_held_item` 依存 |
| SurfingBubble | あり | あり | `has_held_item` 依存 |
| Fishing | あり | なし | `has_held_item` 依存 |
| FishingBubble | あり | なし | `has_held_item` 依存 |
| DustCloud | なし (別処理) | - | - |
| PokemonShadow | なし (別処理) | - | - |
| Static* | なし | - | - |

**重要**: `has_held_item` は `EncounterSlotConfig` から取得する。  
種族データの持ち物テーブル (50%/5%/1%) のいずれかが設定されていれば `true`。  
詳細は [data-structures.md](../data-structures.md#22-encounterslotconfig) を参照。

## 10. ダブルバトル / 大量発生 (TBD)

現時点では対応スコープ外。必要に応じて追加。

### 10.1 ダブル草むら判定

```rust
/// ダブルバトル草むら判定
/// 40未満でダブルバトル
pub fn is_double_grass(version: RomVersion, rand_value: u32) -> bool {
    let percent = rand_to_percent(version, rand_value);
    percent < 40
}
```

### 10.2 大量発生判定

```rust
/// 大量発生ポケモン判定
/// 40未満で大量発生ポケモンが出現
pub fn is_mass_outbreak(version: RomVersion, rand_value: u32) -> bool {
    let percent = rand_to_percent(version, rand_value);
    percent < 40
}
```

## 11. レベル決定

### 11.1 レベル範囲からの決定

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
            (rand_to_percent(version, rand_value) as u64 % range) as u8
        }
        RomVersion::Black2 | RomVersion::White2 => {
            ((rand_value as u64 * range) >> 32) as u8
        }
    };
    
    min_level + offset
}
```

### 11.2 エンカウント種別によるレベル決定

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

## 12. 統合関数

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
    
    // 百分率換算値を計算
    let slot_value = rand_to_percent(version, rand_value);
    
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

## 関連ドキュメント

- [生成フロー: 野生](../flows/pokemon-wild.md)
- [型定義](../data-structures.md)
- [共通型定義](../../common/types.md)
