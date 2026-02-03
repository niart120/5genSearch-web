# 種族データアーキテクチャ仕様書

## 1. 概要

### 1.1 目的

ポケモン個体情報の解決処理を Rust/WASM 側に統合し、TypeScript 側の Resolver 層を削減する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| 種族データ | 種族名、種族値、性別比、特性、持ち物などの固定マスタデータ |
| 解決 (Resolve) | 数値ID・スロット番号から表示用文字列やステータス値へ変換する処理 |
| CorePokemonData | ポケモン/卵共通の個体情報構造体 |
| GeneratedPokemonData | 野生/固定エンカウント生成結果 |
| GeneratedEggData | 卵生成結果 |
| UiPokemonData | 表示用に解決済みのポケモンデータ |
| UiEggData | 表示用に解決済みの卵データ |
| BaseStats | 種族値 (HP/Atk/Def/SpA/SpD/Spe) |
| Stats | 計算済み実数値 (レベル・IV・性格補正適用後) |
| KeyCode | キー入力コード (KeyMask XOR 0x2FFF で変換された値、SHA-1 計算用) |

### 1.3 背景・問題

現行実装の課題:

1. **責務の分散**: 種族データが TypeScript 側 (`gen5-species.json`) に存在し、Rust 生成結果を TypeScript で再解決している
2. **二重管理**: 性別比・特性マッピングの定義が Rust/TypeScript 両方に存在
3. **拡張困難**: 持ち物解決やステータス計算を追加する際に TypeScript 側の複雑化が進む
4. **パフォーマンス**: WASM-JS 境界を跨ぐ変換処理が分散

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 責務統合 | 解決処理を WASM に一元化し、TypeScript 側は表示のみに専念 |
| データ一元化 | 種族データを Rust 側で管理し、二重定義を解消 |
| 拡張性 | 持ち物解決・ステータス計算を WASM 内で完結 |
| 型安全性 | tsify による TypeScript 型自動生成で型不一致を防止 |

### 1.5 着手条件

- local_001 (型基盤) 完了済み
- local_004 (生成アルゴリズム) 完了済み
- local_005 (生成フロー) 完了済み

---

## 2. 対象ファイル

### 2.1 新規作成

| ファイル | 内容 |
|----------|------|
| `wasm-pkg/src/data/mod.rs` | データモジュールルート |
| `wasm-pkg/src/data/species.rs` | 種族データテーブル |
| `wasm-pkg/src/data/abilities.rs` | 特性データテーブル |
| `wasm-pkg/src/data/items.rs` | 持ち物データテーブル |
| `wasm-pkg/src/data/names.rs` | ローカライズ文字列テーブル |
| `wasm-pkg/src/types/stats.rs` | BaseStats / Stats 型定義 |
| `wasm-pkg/src/types/ui.rs` | UiPokemonData / UiEggData 型定義 |
| `wasm-pkg/src/resolve/mod.rs` | 解決モジュールルート |
| `wasm-pkg/src/resolve/pokemon.rs` | ポケモン解決ロジック |
| `wasm-pkg/src/resolve/egg.rs` | 卵解決ロジック |
| `wasm-pkg/src/resolve/stats.rs` | ステータス計算ロジック |
| `scripts/generate-species-data.js` | JSONからRustコード生成スクリプト (書き捨て) |

### 2.2 変更

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/generation.rs` | 修正 | CorePokemonData に species_id, level, stats 追加。GeneratedPokemonData から species_id, level を削除 |
| `wasm-pkg/src/types/mod.rs` | 修正 | 新規型の re-export 追加 |
| `wasm-pkg/src/lib.rs` | 修正 | 解決API の WASM 公開 |
| `wasm-pkg/Cargo.toml` | 修正 | data / resolve モジュール追加 |
| `wasm-pkg/src/generation/flows/*.rs` | 修正 | 生成フローで種族データ参照・ステータス計算を追加 |

---

## 3. 設計方針

### 3.1 データレイヤー構成

```
wasm-pkg/src/
├── data/                    # 静的マスタデータ
│   ├── mod.rs
│   ├── species.rs          # 種族テーブル (649件)
│   ├── abilities.rs        # 特性テーブル (~160件)
│   ├── items.rs            # 持ち物テーブル (~100件)
│   └── names.rs            # ローカライズ文字列
│
├── resolve/                 # 解決ロジック
│   ├── mod.rs
│   ├── pokemon.rs          # GeneratedPokemonData → UiPokemonData
│   ├── egg.rs              # GeneratedEggData → UiEggData
│   └── stats.rs            # ステータス計算
│
└── types/
    ├── stats.rs            # BaseStats / Stats 型
    └── ui.rs               # UiPokemonData / UiEggData 型
```

### 3.2 データ埋め込み方針

- 既存の `gen5-species.json` から書き捨てスクリプトで Rust コードを1回生成
- 生成後はスクリプトは使用せず、Rust コードを直接メンテナンス
- `&'static str` でコンパイル時に埋め込み (ランタイム解析不要)

### 3.3 ステータス計算式

```
HP  = floor((2 * base + iv) * level / 100) + level + 10
他  = floor(floor((2 * base + iv) * level / 100) + 5) * nature_modifier)
```

- EV は常に 0 と仮定
- `nature_modifier`: 1.1 (上昇) / 0.9 (下降) / 1.0 (無補正)

### 3.4 API 設計方針

- 単体変換 API: `resolve_pokemon_data(data, locale) -> UiPokemonData`
- バッチ変換 API: `resolve_pokemon_data_batch(data[], locale) -> UiPokemonData[]`
- ロケールは引数で指定 (`"ja"` / `"en"`)

### 3.5 番兵値とデフォルト値

#### 3.5.1 IV の番兵値

既存の `IV_VALUE_UNKNOWN` (32) を番兵値として使用。

```rust
/// 不明な個体値を示す番兵値
pub const IV_VALUE_UNKNOWN: u8 = 32;
```

UI 解決時の変換:
- `iv == IV_VALUE_UNKNOWN` → `"?"`
- それ以外 → 数値文字列 (`"31"`, `"0"` など)

#### 3.5.2 Stats の番兵値

IV が不明な場合、Stats は計算不可。UI 表示では `"?"` を使用。

#### 3.5.3 めざパの番兵値

IV が1つでも不明な場合、めざパは計算不可。
- `hidden_power_type` → `"?"`
- `hidden_power_power` → `"?"`

#### 3.5.4 種族データ参照のデフォルト値

不正な `species_id` が渡された場合の挙動:

| フィールド | デフォルト値 |
|-----------|-------------|
| `species_name` | `"???"` |
| `ability_name` | `"???"` |
| `base_stats` | 全て 0 |
| `gender_ratio` | `Genderless` |

---

## 4. 実装仕様

### 4.1 型定義

#### 4.1.1 BaseStats (新規)

```rust
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
```

#### 4.1.2 Stats (新規)

```rust
/// 計算済みステータス
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct Stats {
    pub hp: u16,
    pub attack: u16,
    pub defense: u16,
    pub special_attack: u16,
    pub special_defense: u16,
    pub speed: u16,
}
```

#### 4.1.3 CorePokemonData (変更)

```rust
/// ポケモン/卵の共通個体情報
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct CorePokemonData {
    /// 性格値
    pub pid: Pid,
    /// 性格
    pub nature: Nature,
    /// 特性スロット
    pub ability_slot: AbilitySlot,
    /// 性別
    pub gender: Gender,
    /// 色違い種別
    pub shiny_type: ShinyType,
    /// 個体値
    pub ivs: Ivs,
    
    // === 追加フィールド ===
    /// 種族 ID
    /// - ポケモン: 常に設定 (GeneratedPokemonData から移動)
    /// - 卵: Option で外部指定
    pub species_id: Option<u16>,
    /// レベル
    /// - ポケモン: 生成時に決定 (GeneratedPokemonData から移動)
    /// - 卵: 常に 1
    pub level: u8,
    /// 計算済みステータス
    /// - species_id が Some の場合: 生成時に計算して設定
    /// - species_id が None の場合: None
    pub stats: Option<Stats>,
}
```

**変更による影響**:
- `GeneratedPokemonData.species_id` → 削除 (`core.species_id` に移動)
- `GeneratedPokemonData.level` → 削除 (`core.level` に移動)
- 生成フローで種族データ参照が必要になる

#### 4.1.4 GeneratedPokemonData (変更後)

```rust
/// 完全な個体データ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GeneratedPokemonData {
    // 列挙コンテキスト
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    /// 生成元情報
    pub source: SeedOrigin,
    
    // 共通個体情報 (ネスト)
    // ※ species_id, level, stats は core 内に含まれる
    pub core: CorePokemonData,
    
    // ポケモン固有 (species_id, level は core に移動)
    pub sync_applied: bool,
    pub held_item_slot: HeldItemSlot,
    
    // === エンカウント付加情報 (排反) ===
    pub moving_encounter: Option<MovingEncounterInfo>,
    pub special_encounter: Option<SpecialEncounterInfo>,
    pub encounter_result: EncounterResult,
}
```

#### 4.1.5 GeneratedEggData (変更後)

```rust
/// 完全な卵データ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GeneratedEggData {
    // 列挙コンテキスト
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    /// 生成元情報
    pub source: SeedOrigin,
    
    // 共通個体情報 (ネスト)
    // ※ species_id は Option、level は 1 固定、stats は species_id 指定時のみ計算
    pub core: CorePokemonData,
    
    // 卵固有
    pub inheritance: [InheritanceSlot; 3],
    pub margin_frames: Option<u32>,
}
```

#### 4.1.6 UiPokemonData (新規)

```rust
/// 表示用ポケモンデータ (解決済み)
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct UiPokemonData {
    // === 列挙コンテキスト ===
    pub advance: u32,
    pub needle_direction: u8,
    
    // === Seed 情報 (prefix無し16進数) ===
    pub base_seed: String,      // e.g., "1234567890ABCDEF"
    pub mt_seed: String,        // e.g., "12345678"
    /// 起動条件 (SeedOrigin::Startup の場合のみ Some)
    pub datetime_iso: Option<String>,
    pub timer0: Option<String>, // e.g., "0C80"
    pub vcount: Option<String>, // e.g., "5E"
    pub key_input: Option<String>,
    
    // === 個体情報 (解決済み文字列) ===
    pub species_name: String,
    pub nature_name: String,
    pub ability_name: String,
    pub gender_symbol: String,  // "♂" / "♀" / "-"
    pub shiny_symbol: String,   // "" / "◇" / "☆"
    
    // === 個体情報 (数値/文字列) ===
    pub level: u8,
    /// 個体値 (表示用文字列)
    /// - 通常: "31", "0" など
    /// - 不明時: "?" (卵の遺伝未確定など)
    pub ivs: [String; 6],       // [H, A, B, C, D, S]
    /// ステータス (表示用文字列)
    /// - 通常: "187", "100" など
    /// - 不明時: "?" (IV不明または species_id 未指定)
    pub stats: [String; 6],     // [H, A, B, C, D, S]
    /// めざパタイプ (表示用文字列)
    /// - 通常: "ドラゴン" / "Dragon" など
    /// - 不明時: "?"
    pub hidden_power_type: String,
    /// めざパ威力 (表示用文字列)
    /// - 通常: "70" など
    /// - 不明時: "?"
    pub hidden_power_power: String,
    /// 性格値 (prefix無し16進数)
    /// - e.g., "12345678"
    pub pid: String,
    
    // === エンカウント情報 ===
    pub sync_applied: bool,
    pub held_item_name: Option<String>,
    
    // === 移動/特殊エンカウント情報 ===
    /// 移動エンカウント確定状態 (表示用文字列)
    /// - "〇": 確定エンカウント (Guaranteed)
    /// - "?": 歩数次第 (Possible, BW2 のみ)
    /// - "×": エンカウント無し (NoEncounter)
    pub moving_encounter_guaranteed: Option<String>,
    /// 特殊エンカウント発生 (表示用文字列)
    /// - "〇": 発生する (triggered = true)
    /// - "×": 発生しない (triggered = false)
    pub special_encounter_triggered: Option<String>,
    pub special_encounter_direction: Option<String>,
    pub encounter_result: String, // "Pokemon" / "Item:EvolutionStone" / etc.
}
```

#### 4.1.7 UiEggData (新規)

```rust
/// 表示用卵データ (解決済み)
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct UiEggData {
    // === 列挙コンテキスト ===
    pub advance: u32,
    pub needle_direction: u8,
    
    // === Seed 情報 (prefix無し16進数) ===
    pub base_seed: String,
    pub mt_seed: String,
    pub datetime_iso: Option<String>,
    pub timer0: Option<String>,
    pub vcount: Option<String>,
    pub key_input: Option<String>,
    
    // === 個体情報 (解決済み文字列) ===
    /// 種族名 (species_id が指定された場合のみ)
    pub species_name: Option<String>,
    pub nature_name: String,
    /// 特性名
    /// - species_id 指定時: 種族データから解決した確定特性名 (e.g., "しぜんかいふく", "Natural Cure")
    /// - species_id 未指定時: スロット名 ("特性1" / "特性2" / "夢特性")
    pub ability_name: String,
    pub gender_symbol: String,
    pub shiny_symbol: String,
    
    // === 個体情報 (数値/文字列) ===
    pub level: u8,              // 常に 1
    /// 個体値 (表示用文字列)
    /// - 確定時: "31", "0" など
    /// - 遺伝未確定時: "?" (IV_VALUE_UNKNOWN の場合)
    pub ivs: [String; 6],
    /// ステータス (表示用文字列)
    /// - 計算可能時: "12", "8" など (Lv.1 時点)
    /// - 計算不可時: "?" (IV不明 or species_id 未指定)
    pub stats: [String; 6],
    /// めざパタイプ (表示用文字列)
    pub hidden_power_type: String,
    /// めざパ威力 (表示用文字列)
    pub hidden_power_power: String,
    /// 性格値 (prefix無し16進数)
    /// - e.g., "12345678"
    pub pid: String,
    
    // === 卵固有情報 ===
    pub margin_frames: Option<u32>,
}
```

### 4.2 データテーブル

#### 4.2.1 種族データ構造

```rust
/// 種族エントリ
pub struct SpeciesEntry {
    pub base_stats: BaseStats,
    pub gender_ratio: GenderRatio,
    pub ability_ids: [u8; 3],  // [通常1, 通常2, 夢] (0 = なし)
}

/// 種族テーブル (649件)
pub static SPECIES_TABLE: [SpeciesEntry; 649] = [
    // #001 Bulbasaur
    SpeciesEntry {
        base_stats: BaseStats { hp: 45, attack: 49, defense: 49, special_attack: 65, special_defense: 65, speed: 45 },
        gender_ratio: GenderRatio::ratio(31),  // ♂7:♀1
        ability_ids: [65, 65, 34],  // Overgrow, Overgrow, Chlorophyll
    },
    // ...
];
```

#### 4.2.2 ローカライズテーブル

```rust
/// 種族名 (日本語)
pub static SPECIES_NAMES_JA: [&str; 649] = [
    "フシギダネ", "フシギソウ", "フシギバナ", // ...
];

/// 種族名 (英語)
pub static SPECIES_NAMES_EN: [&str; 649] = [
    "Bulbasaur", "Ivysaur", "Venusaur", // ...
];
```

#### 4.2.3 特性テーブル

特性名は ID ベースで管理。種族データの `ability_ids` から特性 ID を取得し、名前テーブルから引く。

```rust
/// 特性名 (日本語)
/// インデックス 0 は「なし」を表す空文字列
pub static ABILITY_NAMES_JA: [&str; 165] = [
    "",           // 0: なし
    "あくしゅう",  // 1: Stench
    "あめふらし",  // 2: Drizzle
    // ...
];

/// 特性名 (英語)
pub static ABILITY_NAMES_EN: [&str; 165] = [
    "",           // 0: なし
    "Stench",     // 1
    "Drizzle",    // 2
    // ...
];

/// 特性名を取得
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
    
    match locale {
        "ja" => ABILITY_NAMES_JA.get(ability_id).unwrap_or(&"???"),
        _ => ABILITY_NAMES_EN.get(ability_id).unwrap_or(&"???"),
    }
}
```

#### 4.2.4 性格テーブル

```rust
/// 性格名 (日本語)
pub static NATURE_NAMES_JA: [&str; 25] = [
    "がんばりや", "さみしがり", "ゆうかん", // ...
];

/// 性格名 (英語)
pub static NATURE_NAMES_EN: [&str; 25] = [
    "Hardy", "Lonely", "Brave", // ...
];
```

#### 4.2.5 持ち物テーブル

```rust
/// 持ち物エントリ
pub struct HeldItemEntry {
    pub common: Option<u8>,    // 50% スロット (アイテムID)
    pub rare: Option<u8>,      // 5% スロット
    pub very_rare: Option<u8>, // 1% スロット (BW2)
}

/// 持ち物テーブル (種族 × バージョン)
/// インデックス: (species_id - 1) * 4 + version_index
pub static HELD_ITEMS_TABLE: [HeldItemEntry; 649 * 4] = [
    // ...
];

/// アイテム名 (日本語)
pub static ITEM_NAMES_JA: [&str; 100] = [
    "", "でんきだま", "ひかりのこな", // ...
];

/// アイテム名 (英語)
pub static ITEM_NAMES_EN: [&str; 100] = [
    "", "Light Ball", "Bright Powder", // ...
];
```

### 4.3 解決API

#### 4.3.1 単体解決

```rust
/// ポケモンデータを表示用に解決
#[wasm_bindgen]
pub fn resolve_pokemon_data(
    data: GeneratedPokemonData,
    version: RomVersion,
    locale: &str,
) -> UiPokemonData {
    // ...
}

/// 卵データを表示用に解決
#[wasm_bindgen]
pub fn resolve_egg_data(
    data: GeneratedEggData,
    locale: &str,
) -> UiEggData {
    // ...
}
```

#### 4.3.2 バッチ解決

```rust
/// ポケモンデータをバッチ解決
#[wasm_bindgen]
pub fn resolve_pokemon_data_batch(
    data: Vec<GeneratedPokemonData>,
    version: RomVersion,
    locale: &str,
) -> Vec<UiPokemonData> {
    data.into_iter()
        .map(|d| resolve_pokemon_data(d, version, locale))
        .collect()
}

/// 卵データをバッチ解決
#[wasm_bindgen]
pub fn resolve_egg_data_batch(
    data: Vec<GeneratedEggData>,
    locale: &str,
) -> Vec<UiEggData> {
    data.into_iter()
        .map(|d| resolve_egg_data(d, locale))
        .collect()
}
```

#### 4.3.3 ステータス計算 (内部API)

```rust
/// ステータスを計算
pub fn calculate_stats(
    base: BaseStats,
    ivs: Ivs,
    nature: Nature,
    level: u8,
) -> Stats {
    let nature_mods = nature.stat_modifiers(); // [1.0, 1.0, 1.0, 1.0, 1.0, 1.0] or with 1.1/0.9
    
    Stats {
        hp: calc_hp(base.hp, ivs.hp(), level),
        attack: calc_stat(base.attack, ivs.attack(), level, nature_mods[0]),
        defense: calc_stat(base.defense, ivs.defense(), level, nature_mods[1]),
        special_attack: calc_stat(base.special_attack, ivs.special_attack(), level, nature_mods[2]),
        special_defense: calc_stat(base.special_defense, ivs.special_defense(), level, nature_mods[3]),
        speed: calc_stat(base.speed, ivs.speed(), level, nature_mods[4]),
    }
}

fn calc_hp(base: u8, iv: u8, level: u8) -> u16 {
    let base = base as u32;
    let iv = iv as u32;
    let level = level as u32;
    ((2 * base + iv) * level / 100 + level + 10) as u16
}

fn calc_stat(base: u8, iv: u8, level: u8, nature_mod: f32) -> u16 {
    let base = base as u32;
    let iv = iv as u32;
    let level = level as u32;
    let raw = (2 * base + iv) * level / 100 + 5;
    (raw as f32 * nature_mod).floor() as u16
}
```

### 4.4 ヘルパー関数

#### 4.4.1 SeedOrigin 展開

```rust
impl SeedOrigin {
    /// base_seed を prefix無し16進数で取得
    pub fn base_seed_hex(&self) -> String {
        format!("{:016X}", self.base_seed().raw())
    }
    
    /// mt_seed を prefix無し16進数で取得
    pub fn mt_seed_hex(&self) -> String {
        format!("{:08X}", self.mt_seed().raw())
    }
    
    /// Timer0 を prefix無し16進数で取得 (Startup のみ)
    pub fn timer0_hex(&self) -> Option<String> {
        match self {
            Self::Startup { condition, .. } => Some(format!("{:04X}", condition.timer0)),
            _ => None,
        }
    }
    
    /// VCount を prefix無し16進数で取得 (Startup のみ)
    pub fn vcount_hex(&self) -> Option<String> {
        match self {
            Self::Startup { condition, .. } => Some(format!("{:02X}", condition.vcount)),
            _ => None,
        }
    }
    
    /// key_input を表示用文字列で取得 (Startup のみ)
    ///
    /// KeyCode からボタン名を復元し、`[A]+[B]+[Start]` 形式で結合。
    /// ボタンなしの場合は空文字列を返す。
    pub fn key_input_display(&self) -> Option<String> {
        match self {
            Self::Startup { key_code, .. } => Some(format_key_code(*key_code)),
            _ => None,
        }
    }
}

/// KeyCode を表示用文字列に変換
///
/// ボタンの順序は以下の固定順:
/// A, B, X, Y, L, R, Start, Select, Up, Down, Left, Right
///
/// # Example
/// - `KeyCode(0x2FFF)` (ボタンなし) → `""`
/// - `KeyCode(0x2FFE)` (A) → `"[A]"`
/// - `KeyCode(0x2FF6)` (A+Start) → `"[A]+[Start]"`
fn format_key_code(key_code: KeyCode) -> String {
    // KeyCode から KeyMask を復元: mask = key_code XOR 0x2FFF
    let mask = key_code.value() ^ 0x2FFF;
    
    // ボタン定義 (表示順序)
    const BUTTONS: [(u32, &str); 12] = [
        (0x0001, "A"),
        (0x0002, "B"),
        (0x0400, "X"),
        (0x0800, "Y"),
        (0x0200, "L"),
        (0x0100, "R"),
        (0x0008, "Start"),
        (0x0004, "Select"),
        (0x0040, "Up"),
        (0x0080, "Down"),
        (0x0020, "Left"),
        (0x0010, "Right"),
    ];
    
    let pressed: Vec<&str> = BUTTONS
        .iter()
        .filter(|(bit, _)| mask & bit != 0)
        .map(|(_, name)| *name)
        .collect();
    
    if pressed.is_empty() {
        String::new()
    } else {
        pressed.iter().map(|s| format!("[{}]", s)).collect::<Vec<_>>().join("+")
    }
}
```

#### 4.4.2 PID 変換

```rust
/// PID を prefix無し16進数文字列に変換
fn pid_hex(pid: Pid) -> String {
    format!("{:08X}", pid.raw())
}
```

#### 4.4.3 シンボル解決

```rust
/// 性別シンボルを取得
fn gender_symbol(gender: Gender) -> &'static str {
    match gender {
        Gender::Male => "♂",
        Gender::Female => "♀",
        Gender::Genderless => "-",
    }
}

/// 色違いシンボルを取得
fn shiny_symbol(shiny_type: ShinyType) -> &'static str {
    match shiny_type {
        ShinyType::None => "",
        ShinyType::Square => "◇",
        ShinyType::Star => "☆",
    }
}

/// 特性スロット名を取得 (卵用、species_id 未指定時)
fn ability_slot_name(slot: AbilitySlot, locale: &str) -> &'static str {
    match (slot, locale) {
        (AbilitySlot::First, "ja") => "特性1",
        (AbilitySlot::Second, "ja") => "特性2",
        (AbilitySlot::Hidden, "ja") => "夢特性",
        (AbilitySlot::First, _) => "Ability 1",
        (AbilitySlot::Second, _) => "Ability 2",
        (AbilitySlot::Hidden, _) => "Hidden",
    }
}

/// 移動エンカウント確定状態を表示用文字列に変換
fn moving_encounter_symbol(likelihood: MovingEncounterLikelihood) -> &'static str {
    match likelihood {
        MovingEncounterLikelihood::Guaranteed => "〇",
        MovingEncounterLikelihood::Possible => "?",
        MovingEncounterLikelihood::NoEncounter => "×",
    }
}

/// 特殊エンカウント発生を表示用文字列に変換
fn special_encounter_symbol(triggered: bool) -> &'static str {
    if triggered { "〇" } else { "×" }
}
```

---

## 5. テスト方針

### 5.1 ユニットテスト

| テスト | 検証内容 |
|--------|----------|
| `test_calculate_stats_basic` | Lv.50 ピカチュウの実数値計算 |
| `test_calculate_stats_nature_boost` | 性格補正 (1.1倍) の適用 |
| `test_calculate_stats_nature_drop` | 性格補正 (0.9倍) の適用 |
| `test_species_lookup` | 種族ID → 種族データ取得 |
| `test_ability_name_lookup` | 種族ID + スロット → 特性名 |
| `test_held_item_lookup` | 種族ID + バージョン + スロット → アイテム名 |
| `test_resolve_pokemon_seed_origin` | SeedOrigin の16進数展開 |
| `test_resolve_pokemon_ja` | 日本語ロケールでの解決 |
| `test_resolve_pokemon_en` | 英語ロケールでの解決 |
| `test_resolve_egg_with_species` | 種族ID指定ありの卵解決 (特性名確定) |
| `test_resolve_egg_without_species` | 種族ID指定なしの卵解決 (スロット名) |
| `test_format_key_code_none` | キー入力なし → 空文字列 |
| `test_format_key_code_single` | 単一ボタン → `"[A]"` |
| `test_format_key_code_multi` | 複数ボタン → `"[A]+[Start]"` |
| `test_pid_hex` | PID → prefix無し16進数 (`"12345678"`) |
| `test_moving_encounter_symbol` | MovingEncounterLikelihood → `"〇"` / `"?"` / `"×"` |
| `test_special_encounter_symbol` | triggered → `"〇"` / `"×"` |

### 5.2 統合テスト

| テスト | 検証内容 |
|--------|----------|
| `test_full_generation_and_resolve` | 生成 → 解決のE2Eフロー |
| `test_batch_resolve_performance` | 1000件バッチ解決の性能 (<100ms) |

### 5.3 WASM テスト

| テスト | 検証内容 |
|--------|----------|
| `test_wasm_resolve_pokemon_data` | WASM経由での解決API |
| `test_wasm_resolve_batch` | WASM経由でのバッチ解決 |

---

## 6. 実装チェックリスト

### 6.1 データ準備

- [x] `scripts/generate-species-data.js` 作成
- [x] `gen5-species.json` から Rust コード生成
- [x] 生成コードの動作検証

### 6.2 型定義

- [x] `wasm-pkg/src/data/stats.rs` 作成 (Stats, calculate_stats)
- [x] `wasm-pkg/src/types/ui.rs` 作成 (UiPokemonData, UiEggData)
- [ ] `CorePokemonData` に species_id, level, stats 追加 (※破壊的変更のため保留)
- [x] `wasm-pkg/src/types/mod.rs` に re-export 追加
- [x] `Nature::stat_modifiers()` 追加 (性格補正の10倍表現、`[u8; 5]`)

### 6.3 データモジュール

- [x] `wasm-pkg/src/data/mod.rs` 作成
- [x] `wasm-pkg/src/data/species.rs` 作成
- [x] `wasm-pkg/src/data/abilities.rs` 作成
- [x] `wasm-pkg/src/data/items.rs` 作成
- [x] `wasm-pkg/src/data/names.rs` 作成

### 6.4 解決モジュール

- [x] `wasm-pkg/src/resolve/mod.rs` 作成
- [x] `wasm-pkg/src/resolve/pokemon.rs` 作成
- [x] `wasm-pkg/src/resolve/egg.rs` 作成

### 6.5 WASM API

- [x] `wasm-pkg/src/lib.rs` に解決API追加
- [x] バッチ解決API追加

### 6.6 テスト

- [x] ユニットテスト実装
- [x] 統合テスト実装
- [ ] WASM テスト実装 (wasm-pack test 環境のセットアップが必要)

### 6.7 TypeScript 連携

- [ ] 型定義の自動生成確認
- [ ] 既存 Resolver 層との互換性確認
