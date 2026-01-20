# 生成フロー: 野生ポケモン

野生ポケモン (草むら、なみのり、釣り、特殊エンカウント) の生成フロー。

## 1. フロー概要

```
LCG Seed
    │
    ├─ Game Offset 適用
    │
    ├─ User Offset 適用
    │
    └─ 個体生成開始
         │
         ├─ 1. シンクロ判定
         ├─ 2. エンカウントスロット決定
         ├─ 3. レベル決定
         ├─ 4. PID 生成
         ├─ 5. 性格決定
         ├─ 6. 持ち物判定 (種別による)
         │
         └─ Resolve (乱数消費なし)
              ├─ 性別 (PID + slot.gender_threshold)
              ├─ 特性スロット ((PID >> 16) & 1)
              ├─ 色違い (PID + TID/SID)
              │
              └─ ResolvedPokemonData 出力
```

## 2. エンカウント種別ごとの消費パターン

> **注意**: 本セクションは BW 仕様を基準とする。BW2 での差異は [セクション 6](#6-bwbw2-の差異) を参照。

### 2.1 Normal (草むら・洞窟)

#### 2.1.1 シンクロ / 先頭特性なし

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | シンクロ判定 | 1 | 結果を保持 |
| 2 | スロット決定 | 1 | - |
| 3 | レベル決定 | 1 | 空消費 (結果未使用) |
| 4 | PID 生成 | 1 | + ひかるおまもり時 最大2追加 |
| 5 | 性格決定 | 1 | シンクロ成功時も消費 |
| 6 | 持ち物判定 | 0-1* | スロット依存 |

**合計**: 5-6 (+ ひかるおまもり 0-2)

#### 2.1.2 ふくがん先頭

ふくがんが先頭の場合、シンクロ判定をスキップする。

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | スロット決定 | 1 | - |
| 2 | レベル決定 | 1 | 空消費 |
| 3 | PID 生成 | 1 | + ひかるおまもり時 最大2追加 |
| 4 | 性格決定 | 1 | - |
| 5 | 持ち物判定 | 0-1* | スロット依存 |

**合計**: 4-5 (+ ひかるおまもり 0-2)

```rust
fn generate_normal(seed: u64, config: &PokemonGenerationConfig) -> ResolvedPokemonData {
    let mut rng = Lcg::new(seed);
    
    // 1. シンクロ判定
    let sync_success = perform_sync_check(&mut rng, EncounterType::Normal, &config.lead_ability);
    
    // 2. スロット決定
    let slot_rand = rng.next();
    let slot = normal_encounter_slot(slot_rand);
    
    // 3. レベル決定 (空消費)
    let _level_rand = rng.next();
    
    // 4. PID 生成
    let pid = if config.shiny_charm {
        generate_pid_with_reroll(&mut rng, config.tid, config.sid, 2, |rng| {
            generate_wild_pid(rng.next(), config.tid, config.sid)
        })
    } else {
        let r = rng.next();
        generate_wild_pid(r, config.tid, config.sid)
    };
    
    // 5. 性格決定
    let (nature, sync_applied) = determine_nature(&mut rng, sync_success, &config.lead_ability);
    
    build_resolved_pokemon_data(seed, pid, nature, sync_applied, slot, 0, config)
}
```

### 2.2 Surfing (なみのり)

#### 2.2.1 シンクロ / 先頭特性なし

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | シンクロ判定 | 1 | - |
| 2 | スロット決定 | 1 | - |
| 3 | レベル決定 | 1 | 結果を使用 |
| 4 | PID 生成 | 1+ | - |
| 5 | 性格決定 | 1 | - |
| 6 | 持ち物判定 | 0-1* | スロット依存 |

**合計**: 5-6 (+ ひかるおまもり 0-2)

#### 2.2.2 ふくがん先頭

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | スロット決定 | 1 | - |
| 2 | レベル決定 | 1 | 結果を使用 |
| 3 | PID 生成 | 1+ | - |
| 4 | 性格決定 | 1 | - |
| 5 | 持ち物判定 | 0-1* | スロット依存 |

**合計**: 4-5 (+ ひかるおまもり 0-2)

```rust
fn generate_surfing(seed: u64, config: &PokemonGenerationConfig) -> ResolvedPokemonData {
    let mut rng = Lcg::new(seed);
    
    let sync_success = perform_sync_check(&mut rng, EncounterType::Surfing, &config.lead_ability);
    let slot = water_encounter_slot(rng.next());
    let level_rand = rng.next();
    
    let pid = generate_pokemon_pid(&mut rng, config);
    let (nature, sync_applied) = determine_nature(&mut rng, sync_success, &config.lead_ability);
    
    let _item_rand = rng.next();  // 持ち物判定
    
    build_resolved_pokemon_data(seed, pid, nature, sync_applied, slot, level_rand, config)
}
```

### 2.3 Fishing (釣り)

#### 2.3.1 シンクロ / 先頭特性なし

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | シンクロ判定 | 1 | - |
| 2 | 釣り成功判定 | 1 | 0: 成功, 1: 失敗 |
| 3 | スロット決定 | 1 | - |
| 4 | レベル決定 | 1 | 結果を使用 |
| 5 | PID 生成 | 1+ | - |
| 6 | 性格決定 | 1 | - |
| 7 | 持ち物判定 | 0-1* | スロット依存 |

**合計**: 6-7 (+ ひかるおまもり 0-2)

#### 2.3.2 ふくがん先頭

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | 釣り成功判定 | 1 | - |
| 2 | スロット決定 | 1 | - |
| 3 | レベル決定 | 1 | 結果を使用 |
| 4 | PID 生成 | 1+ | - |
| 5 | 性格決定 | 1 | - |
| 6 | 持ち物判定 | 0-1* | スロット依存 |

**合計**: 5-6 (+ ひかるおまもり 0-2)

#### 2.3.3 釣り失敗時

| 先頭特性 | 乱数消費 |
|---------|----------|
| シンクロ / なし | 2 (シンクロ判定 + 釣り判定) |
| ふくがん | 1 (釣り判定のみ) |

### 2.4 ShakingGrass (揺れる草)

#### 2.4.1 シンクロ / 先頭特性なし

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | シンクロ判定 | 1 | - |
| 2 | スロット決定 | 1 | - |
| 3 | レベル決定 | 1 | 空消費 |
| 4 | PID 生成 | 1+ | - |
| 5 | 性格決定 | 1 | - |
| 6 | 持ち物判定 | 0-1* | スロット依存 |

**合計**: 5-6 (+ ひかるおまもり 0-2)

#### 2.4.2 ふくがん先頭

シンクロ判定をスキップ。合計: 4-5 (+ ひかるおまもり 0-2)

### 2.5 DustCloud (砂煙)

砂煙はアイテム取得のため、野生ポケモン生成とは別処理。

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | エンカウント判定 | 1 | 40未満でエンカウント |
| 2 | アイテム種別 | 1 | 0: 進化の石, 1-94: ジュエル, 95-99: 変わらずの石 |
| 3 | テーブル決定 | 1 | 進化の石 or ジュエルのテーブル |

**合計**: 2-3

### 2.6 SurfingBubble (水泡)

なみのりと同一のフロー。

### 2.7 FishingBubble (泡釣り)

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | シンクロ判定 | 1 | - |
| 2 | スロット決定 | 1 | 釣り成功判定なし |
| 3 | レベル決定 | 1 | 結果を使用 |
| 4 | PID 生成 | 1+ | - |
| 5 | 性格決定 | 1 | - |
| 6 | 持ち物判定 | 0-1* | スロット依存 |

**合計**: 5-6 (+ ひかるおまもり 0-2)

> **注**: 泡釣りは通常の釣りと異なり、釣り成功判定が存在しない。

## 3. 擬似コード: 統合生成関数

```rust
pub fn generate_wild_pokemon(
    seed: u64,
    config: &PokemonGenerationConfig,
) -> ResolvedPokemonData {
    let mut rng = Lcg::new(seed);
    let enc_type = config.encounter_type;
    let is_compound_eyes = config.lead_ability == LeadAbility::CompoundEyes;
    
    // 1. シンクロ判定 (ふくがん先頭時はスキップ)
    let sync_success = if is_compound_eyes {
        false
    } else {
        perform_sync_check(&mut rng, enc_type, &config.lead_ability)
    };
    
    // 2. 釣り成功判定 (Fishing のみ、FishingBubble は不要)
    if enc_type == EncounterType::Fishing {
        let fishing_result = rng.next();
        if !fishing_success(fishing_result) {
            return FishingFailed;  // 釣り失敗
        }
    }
    
    // 3. スロット決定
    let slot_rand = rng.next();
    let slot = calculate_encounter_slot(enc_type, slot_rand, config.version);
    let slot_config = &config.encounter_resolution.slots[slot as usize];
    
    // 4. レベル決定 (Normal/ShakingGrass は空消費)
    let level_rand = rng.next();
    
    // 5. PID 生成 (pid-shiny.md の generate_pokemon_pid_wild を使用)
    let pid = generate_pokemon_pid_wild(&mut rng, config.tid, config.sid, config.shiny_charm);
    
    // 6. 性格決定
    let (nature, sync_applied) = determine_nature(&mut rng, sync_success, &config.lead_ability);
    
    // 7. 持ち物判定 (エンカウント種別対応 かつ スロットが持ち物を持つ場合のみ)
    let held_item_slot = if consumes_held_item_rand(enc_type, slot_config) {
        let item_rand = rng.next();
        determine_held_item_slot(
            config.version,
            item_rand,
            &config.lead_ability,
            has_very_rare_item(enc_type),
        )
    } else {
        HeldItemSlot::None
    };
    
    // 8. BW のみ: 最後の謎の消費 (ダブル以外)
    if config.version.is_bw() && !is_double_encounter(enc_type) {
        rng.next();
    }
    
    // === Resolve (乱数消費なし) ===
    
    // 性別判定: PID 下位 8bit と gender_threshold を比較
    let gender = determine_gender(pid, slot_config.gender_threshold);
    
    // 特性スロット: PID 上位 16bit の最下位 bit
    let ability_slot = ((pid >> 16) & 1) as u8;
    
    // 色違い判定: (PID上位 ^ PID下位 ^ TID ^ SID) < 8 で色違い
    let shiny_type = calculate_shiny_type(pid, config.tid, config.sid);
    
    // レベル解決 (Normal/ShakingGrass は level_rand を無視)
    let level = resolve_level(level_rand, slot_config.level_min, slot_config.level_max, enc_type);
    
    ResolvedPokemonData {
        seed,
        pid,
        species_id: slot_config.species_id,
        level,
        nature,
        sync_applied,
        ability_slot,
        gender,
        shiny_type,
        held_item_slot,
        ivs: calculate_ivs(seed, config.version, enc_type),
    }
}

/// 性別判定
fn determine_gender(pid: u32, threshold: u8) -> Gender {
    match threshold {
        0 => Gender::Male,      // 固定♂
        254 => Gender::Female,  // 固定♀
        255 => Gender::Unknown, // 性別不明
        t => {
            let gender_value = (pid & 0xFF) as u8;
            if gender_value < t {
                Gender::Female
            } else {
                Gender::Male
            }
        }
    }
}

/// 持ち物判定で乱数を消費するか (スロット考慮)
fn consumes_held_item_rand(enc_type: EncounterType, slot_config: &EncounterSlotConfig) -> bool {
    encounter_type_supports_held_item(enc_type) && slot_config.has_held_item
}

fn encounter_type_supports_held_item(enc_type: EncounterType) -> bool {
    matches!(
        enc_type,
        EncounterType::Surfing
        | EncounterType::SurfingBubble
        | EncounterType::Fishing
        | EncounterType::FishingBubble
        | EncounterType::ShakingGrass
    )
}

fn has_very_rare_item(enc_type: EncounterType) -> bool {
    matches!(
        enc_type,
        EncounterType::ShakingGrass | EncounterType::SurfingBubble
    )
}

// PID 生成は pid-shiny.md の generate_pokemon_pid_wild を使用
// see: ../algorithm/pid-shiny.md#44-高レベルヘルパー関数
```

## 4. 乱数消費まとめ (BW)

### 4.1 シンクロ / 先頭特性なし

| 種別 | シンクロ | 釣り判定 | スロット | レベル | PID | 性格 | 持ち物 | 合計 |
|-----|---------|---------|---------|-------|-----|-----|-------|-----|
| Normal | 1 | - | 1 | 1 | 1-3 | 1 | 0-1* | 5-8 |
| ShakingGrass | 1 | - | 1 | 1 | 1-3 | 1 | 0-1* | 5-8 |
| Surfing | 1 | - | 1 | 1 | 1-3 | 1 | 0-1* | 5-8 |
| SurfingBubble | 1 | - | 1 | 1 | 1-3 | 1 | 0-1* | 5-8 |
| Fishing | 1 | 1 | 1 | 1 | 1-3 | 1 | 0-1* | 6-9 |
| FishingBubble | 1 | - | 1 | 1 | 1-3 | 1 | 0-1* | 5-8 |
| DustCloud | - | - | - | - | - | - | - | 2-3 |

### 4.2 ふくがん先頭

シンクロ判定をスキップするため、各種別で消費が 1 減少。

| 種別 | シンクロ | 釣り判定 | スロット | レベル | PID | 性格 | 持ち物 | 合計 |
|-----|---------|---------|---------|-------|-----|-----|-------|-----|
| Normal | 0 | - | 1 | 1 | 1-3 | 1 | 0-1* | 4-7 |
| Fishing | 0 | 1 | 1 | 1 | 1-3 | 1 | 0-1* | 5-8 |
| (他) | 0 | - | 1 | 1 | 1-3 | 1 | 0-1* | 4-7 |

**\* 持ち物消費**: スロットの種族が持ち物を持つ可能性がある場合のみ消費 (`has_held_item == true`)。  
種族データの 50%/5%/1% いずれかにアイテムが設定されていれば対象。

## 5. ヘルパー関数

### 5.1 build_resolved_pokemon_data

PID から派生値を算出し、`ResolvedPokemonData` を構築するヘルパー関数。

詳細は [data-structures.md §2.10](../data-structures.md#210-build_resolved_pokemon_data) を参照。

## 6. 出力データの解決

`ResolvedPokemonData` は WASM 内で解決済み。TypeScript 側では以下のみ追加:

- `held_item_slot` → アイテム名 (種族データ + ロケールから解決)
- `species_id` → 種族名 (i18n)
- `nature` → 性格名 (i18n)
- `ability_slot` → 特性名 (種族データから参照)

## 7. BW/BW2 の差異

### 7.1 乱数計算式

| バージョン | 計算式 |
|-----------|--------|
| BW | `(乱数 >> 32) * 0xFFFF / 0x290 >> 32` |
| BW2 | `(乱数 >> 32) * 100 >> 32` |

### 7.2 最後の謎の消費

| バージョン | 消費 |
|-----------|------|
| BW | ダブル以外で +1 消費あり |
| BW2 | なし |

### 7.3 固定ポケモン消費数 (持ち物なし)

| バージョン | 合計消費 |
|-----------|----------|
| BW | 4 |
| BW2 | 3 |

### 7.4 N のポケモン判定 (BW2 のみ)

おもいでリンクの N のポケモンフラグが有効な場合、野生エンカウント時に N 判定が発生する。

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | シンクロ判定 | 1 | - |
| 2 | N 判定 | 1 | 5未満で N のポケモン (4種以上なら 40未満) |
| 3 | N 出現テーブル | 1 | N のポケモン出現時のみ |

## 関連ドキュメント

- [型定義](../data-structures.md)
- [エンカウント処理](../algorithm/encounter.md)
- [PID 生成・色違い判定](../algorithm/pid-shiny.md)
- [性格・シンクロ](../algorithm/nature-sync.md)
