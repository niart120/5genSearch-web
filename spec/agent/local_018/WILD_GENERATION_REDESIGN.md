# 野生ポケモン生成フロー再設計 仕様書

## 1. 概要

### 1.1 目的

野生ポケモン生成処理を、エンカウントパターン別に専用関数へ分割し、各パターン固有の乱数消費順序とレベル決定ロジックを正確に実装する。

### 1.2 用語定義

| 用語 | 定義 |
|:-----|:-----|
| Consumed パターン | 乱数を消費するが、値は使用しない (テーブル固定レベル) |
| Range パターン | 乱数値から min-max 範囲内でレベルを計算 |
| Static パターン | 乱数消費なし、固定レベル |
| HiddenGrotto | BW2 限定の隠し穴エンカウント |

### 1.3 背景・問題

参考資料 `取説.txt` の表は「n番目の乱数が何に使われるか」を示し、空欄は「乱数を消費するが未使用」を意味する。

現行実装の問題:

| 問題 | 詳細 |
|:-----|:-----|
| レベル計算の誤り | Surfing/Fishing 等で乱数値からレベルを計算すべきだが、常に `level_min` を返却 |
| 単一関数の肥大化 | `generate_wild_pokemon` がエンカウント種別ごとの分岐で複雑化 |
| 隠し穴未対応 | HiddenGrotto の処理順序が他と根本的に異なるが未実装 |

### 1.4 期待効果

| 効果 | 内容 |
|:-----|:-----|
| 正確なレベル計算 | Range パターンで乱数値からレベルを正しく算出 |
| 保守性向上 | エンカウントパターン別の専用関数で責務が明確化 |
| 拡張性向上 | 新規エンカウント種別追加時の影響範囲を限定 |

### 1.5 着手条件

- local_016 (GENERATOR_REDESIGN) の実装が完了していること
- local_017 (EGG_GENERATION_REDESIGN) の実装が完了していること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|:---------|:---------|:---------|
| `wasm-pkg/src/types/generation.rs` | 修正 | `EncounterType::HiddenGrotto` 追加 |
| `wasm-pkg/src/generation/algorithm/encounter.rs` | 修正 | レベル決定関数追加 |
| `wasm-pkg/src/generation/algorithm/mod.rs` | 修正 | 新関数の export |
| `wasm-pkg/src/generation/flows/pokemon/mod.rs` | 修正 | 新モジュール追加、export 整理 |
| `wasm-pkg/src/generation/flows/pokemon/wild.rs` | 削除 | 分割のため削除 |
| `wasm-pkg/src/generation/flows/pokemon/normal.rs` | 新規 | 通常エンカウント (Normal, ShakingGrass) |
| `wasm-pkg/src/generation/flows/pokemon/phenomena.rs` | 新規 | 特殊現象エンカウント (DustCloud, PokemonShadow) |
| `wasm-pkg/src/generation/flows/pokemon/surfing.rs` | 新規 | 波乗りエンカウント (Surfing, SurfingBubble) |
| `wasm-pkg/src/generation/flows/pokemon/fishing.rs` | 新規 | 釣りエンカウント (Fishing, FishingBubble) |
| `wasm-pkg/src/generation/flows/pokemon/static_encounter.rs` | 修正 | HiddenGrotto 追加 |
| `wasm-pkg/src/generation/flows/mod.rs` | 修正 | export 整理 |

## 3. 設計方針

### 3.1 エンカウント分類

| 分類 | EncounterType | 特徴 |
|:-----|:--------------|:-----|
| **通常 (Normal)** | Normal, ShakingGrass | 基本フロー、レベル消費あり・値未使用 |
| **特殊現象 (Phenomena)** | DustCloud, PokemonShadow | エンカウント判定分岐あり |
| **波乗り (Surfing)** | Surfing, SurfingBubble | レベル範囲計算 |
| **釣り (Fishing)** | Fishing, FishingBubble | 釣り成功判定 + レベル範囲計算 |
| **固定 (Static)** | StaticSymbol, StaticStarter, StaticFossil, StaticEvent, Roamer, HiddenGrotto | レベル消費なし or 特殊順序 |

### 3.2 HiddenGrotto の位置付け

HiddenGrotto は以下の特徴から Static 系に分類:

- 色違い無効、ID 補正なし
- 出現ポケモンが固定 (スロット決定なし)
- 処理順序が Wild 系と大きく異なる

### 3.3 レベル決定パターン

| パターン | 乱数消費 | レベル値 | 対象 |
|:---------|:---------|:---------|:-----|
| **Consumed** | あり | テーブル定義値 | Normal, ShakingGrass, DustCloud, PokemonShadow |
| **Range** | あり | min-max 範囲計算 | Surfing, SurfingBubble, Fishing, FishingBubble |
| **Static** | なし | slot.level_min | StaticSymbol, StaticStarter, StaticFossil, StaticEvent, Roamer |
| **GrottoRange** | あり (先頭) | min-max 範囲計算 | HiddenGrotto |

### 3.4 乱数消費順序

#### 3.4.1 陸上 (Normal) - シンクロ/特性なし

| 乱数 | 用途 |
|:----:|:-----|
| 1 | シンクロ判定 |
| 2 | 出現ポケモン |
| 3 | (空欄) ← Consumed |
| 4 | 性格値 |
| 5 | 性格 |
| 6 | (持ち物) |
| 7 | 終わり (BW のみ) |

#### 3.4.2 水上 (Surfing) - シンクロ/特性なし

| 乱数 | 用途 |
|:----:|:-----|
| 1 | シンクロ判定 |
| 2 | 出現ポケモン |
| 3 | レベル ← Range |
| 4 | 性格値 |
| 5 | 性格 |
| 6 | (持ち物) |
| 7 | 終わり (BW のみ) |

#### 3.4.3 釣り (Fishing) - シンクロ/特性なし

| 乱数 | 用途 |
|:----:|:-----|
| 1 | シンクロ判定 |
| 2 | 釣り判定 |
| 3 | 出現ポケモン |
| 4 | レベル ← Range |
| 5 | 性格値 |
| 6 | 性格 |
| 7 | (持ち物) |
| 8 | 終わり (BW のみ) |

#### 3.4.4 隠し穴 (HiddenGrotto) - BW2 限定

| 乱数 | 用途 |
|:----:|:-----|
| 1 | レベル ← GrottoRange |
| 2 | シンクロ判定 |
| 3 | 性格値 |
| 4 | 性別値 |
| 5 | 性格 |
| 6 | (持ち物) |

特徴: 色違い無効、ID 補正なし

### 3.5 ファイル構成

```
wasm-pkg/src/generation/flows/pokemon/
├── mod.rs                  # エントリポイント、dispatch
├── normal.rs               # 通常エンカウント (Normal, ShakingGrass)
├── phenomena.rs            # 特殊現象エンカウント (DustCloud, PokemonShadow)
├── surfing.rs              # 波乗りエンカウント (Surfing, SurfingBubble)
├── fishing.rs              # 釣りエンカウント (Fishing, FishingBubble)
└── static_encounter.rs     # 固定エンカウント + HiddenGrotto
```

## 4. 実装仕様

### 4.1 EncounterType 追加

```rust
pub enum EncounterType {
    // 野生エンカウント - 陸上
    Normal,
    ShakingGrass,
    DustCloud,
    PokemonShadow,
    // 野生エンカウント - 水上
    Surfing,
    SurfingBubble,
    Fishing,
    FishingBubble,
    // 固定エンカウント
    StaticSymbol,
    StaticStarter,
    StaticFossil,
    StaticEvent,
    Roamer,
    HiddenGrotto,  // 追加
    // 孵化
    Egg,
}
```

### 4.2 レベル決定関数

```rust
/// レベル乱数値を使用するか (Range パターン)
pub fn uses_level_rand_value(encounter_type: EncounterType) -> bool {
    matches!(
        encounter_type,
        EncounterType::Surfing
            | EncounterType::SurfingBubble
            | EncounterType::Fishing
            | EncounterType::FishingBubble
            | EncounterType::HiddenGrotto
    )
}

/// レベル乱数を消費するか
pub fn consumes_level_rand(encounter_type: EncounterType) -> bool {
    matches!(
        encounter_type,
        EncounterType::Normal
            | EncounterType::ShakingGrass
            | EncounterType::DustCloud
            | EncounterType::PokemonShadow
            | EncounterType::Surfing
            | EncounterType::SurfingBubble
            | EncounterType::Fishing
            | EncounterType::FishingBubble
    )
}

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
    
    match version {
        RomVersion::Black | RomVersion::White => {
            let percent = rand_to_percent(version, rand_value);
            let offset = (percent as u64 % range) as u8;
            min_level + offset
        }
        RomVersion::Black2 | RomVersion::White2 => {
            let offset = ((rand_value as u64 * range) >> 32) as u8;
            min_level + offset
        }
    }
}
```

### 4.3 通常エンカウント関数

```rust
// normal.rs

/// 通常野生ポケモン生成
/// 対象: Normal, ShakingGrass
pub fn generate_normal_pokemon(
    lcg: &mut Lcg64,
    params: &PokemonGenerationParams,
    version: RomVersion,
) -> Result<RawPokemonData, GenerationError> {
    // 1. シンクロ判定
    // 2. スロット決定
    // 3. レベル消費 (値未使用)
    // 4. PID 生成
    // 5. 性格決定
    // 6. 持ち物判定
    // 7. BW 末尾消費
}
```

### 4.4 特殊現象エンカウント関数

```rust
// phenomena.rs

/// 特殊現象野生ポケモン生成
/// 対象: DustCloud, PokemonShadow
pub fn generate_phenomena_pokemon(
    lcg: &mut Lcg64,
    params: &PokemonGenerationParams,
    version: RomVersion,
) -> Result<RawPokemonData, GenerationError> {
    // 0. エンカウント判定 (Pokemon vs Item)
    // 1. シンクロ判定
    // 2. スロット決定
    // 3. レベル消費 (値未使用)
    // 4. PID 生成
    // 5. 性格決定
    // 6. 持ち物判定
    // 7. BW 末尾消費
}
```

### 4.5 波乗りエンカウント関数

```rust
// surfing.rs

/// 波乗り野生ポケモン生成
/// 対象: Surfing, SurfingBubble
pub fn generate_surfing_pokemon(
    lcg: &mut Lcg64,
    params: &PokemonGenerationParams,
    version: RomVersion,
) -> Result<RawPokemonData, GenerationError> {
    // 0. SurfingBubble: 泡判定 (TBD)
    // 1. シンクロ判定
    // 2. スロット決定
    // 3. レベル決定 (Range)
    // 4. PID 生成
    // 5. 性格決定
    // 6. 持ち物判定
    // 7. BW 末尾消費
}
```

### 4.6 釣りエンカウント関数

```rust
// fishing.rs

/// 釣り野生ポケモン生成
/// 対象: Fishing, FishingBubble
pub fn generate_fishing_pokemon(
    lcg: &mut Lcg64,
    params: &PokemonGenerationParams,
    version: RomVersion,
) -> Result<RawPokemonData, GenerationError> {
    // 0. FishingBubble: 泡判定 (TBD)
    // 1. シンクロ判定
    // 2. 釣り成功判定
    // 3. スロット決定
    // 4. レベル決定 (Range)
    // 5. PID 生成
    // 6. 性格決定
    // 7. 持ち物判定
    // 8. BW 末尾消費
}
```

### 4.7 隠し穴エンカウント関数

```rust
// static_encounter.rs に追加

/// 隠し穴ポケモン生成 (BW2 限定)
pub fn generate_hidden_grotto_pokemon(
    lcg: &mut Lcg64,
    params: &PokemonGenerationParams,
    slot: &EncounterSlotConfig,
) -> RawPokemonData {
    // 1. レベル決定 (Range, 先頭)
    // 2. シンクロ判定
    // 3. 性格値生成 (色違い無効、ID補正なし)
    // 4. 性別値決定
    // 5. 性格決定
    // 6. 持ち物判定
}
```

### 4.8 ディスパッチ関数

```rust
// mod.rs

/// 野生ポケモン生成 (エンカウント種別に応じてディスパッチ)
pub fn generate_wild_pokemon(
    lcg: &mut Lcg64,
    params: &PokemonGenerationParams,
    version: RomVersion,
) -> Result<RawPokemonData, GenerationError> {
    match params.encounter_type {
        EncounterType::Normal
        | EncounterType::ShakingGrass => normal::generate_normal_pokemon(lcg, params, version),

        EncounterType::DustCloud
        | EncounterType::PokemonShadow => phenomena::generate_phenomena_pokemon(lcg, params, version),

        EncounterType::Surfing
        | EncounterType::SurfingBubble => surfing::generate_surfing_pokemon(lcg, params, version),

        EncounterType::Fishing
        | EncounterType::FishingBubble => fishing::generate_fishing_pokemon(lcg, params, version),

        _ => Err(GenerationError::UnsupportedEncounterType),
    }
}
```

## 5. テスト方針

### 5.1 消費数テスト

| テスト | 検証内容 |
|:-------|:---------|
| `test_normal_consumption` | Normal の消費数が BW: 6, BW2: 5 であること |
| `test_shaking_grass_consumption` | ShakingGrass の消費数が BW: 7, BW2: 6 であること |
| `test_dust_cloud_pokemon_consumption` | DustCloud (Pokemon) の消費数が正しいこと |
| `test_dust_cloud_item_consumption` | DustCloud (Item) の消費数が正しいこと |
| `test_surfing_consumption` | Surfing の消費数が BW: 6, BW2: 5 であること |
| `test_fishing_consumption` | Fishing の消費数が BW: 8, BW2: 7 であること |
| `test_hidden_grotto_consumption` | HiddenGrotto の消費数が 5 (持ち物なし) / 6 (持ち物あり) であること |

### 5.2 レベル計算テスト

| テスト | 検証内容 |
|:-------|:---------|
| `test_calculate_level_bw` | BW でのレベル計算が正しいこと |
| `test_calculate_level_bw2` | BW2 でのレベル計算が正しいこと |
| `test_surfing_level_range` | Surfing で min != max 時にレベルが正しく計算されること |
| `test_fishing_level_range` | Fishing で min != max 時にレベルが正しく計算されること |

### 5.3 隠し穴テスト

| テスト | 検証内容 |
|:-------|:---------|
| `test_hidden_grotto_shiny_lock` | 色違いにならないこと |
| `test_hidden_grotto_gender_value` | 性別値が別途消費されること |
| `test_hidden_grotto_level_first` | レベルが最初に決定されること |

## 6. 実装チェックリスト

- [ ] `types/generation.rs` に `EncounterType::HiddenGrotto` を追加
- [ ] `generation/algorithm/encounter.rs` にレベル決定関数を追加
- [ ] `generation/algorithm/mod.rs` で新関数を export
- [ ] `generation/flows/pokemon/normal.rs` を新規作成
- [ ] `generation/flows/pokemon/phenomena.rs` を新規作成
- [ ] `generation/flows/pokemon/surfing.rs` を新規作成
- [ ] `generation/flows/pokemon/fishing.rs` を新規作成
- [ ] `generation/flows/pokemon/static_encounter.rs` に HiddenGrotto 関数を追加
- [ ] `generation/flows/pokemon/mod.rs` を修正 (ディスパッチ関数追加)
- [ ] `generation/flows/pokemon/wild.rs` を削除
- [ ] `generation/flows/mod.rs` の export を整理
- [ ] 既存テスト (`wild.rs` 内) を各モジュールへ移植
- [ ] 消費数テストを追加
- [ ] レベル計算テストを追加
- [ ] 隠し穴テストを追加
- [ ] `cargo test` 通過
- [ ] `cargo clippy` 通過
- [ ] `pnpm test:wasm` 通過
