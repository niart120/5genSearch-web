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
         └─ RawPokemonData 出力
```

## 2. エンカウント種別ごとの消費パターン

### 2.1 Normal (草むら・洞窟)

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | シンクロ判定 | 1 | 結果を保持 |
| 2 | スロット決定 | 1 | - |
| 3 | レベル決定 | 1 | 空消費 (結果未使用) |
| 4 | PID 生成 | 1 | + ひかるおまもり時 最大2追加 |
| 5 | 性格決定 | 1 | シンクロ成功時も消費 |
| 6 | 持ち物判定 | 0 | なし |

**合計**: 5 (+ ひかるおまもり 0-2)

```rust
fn generate_normal(seed: u64, config: &PokemonGenerationConfig) -> RawPokemonData {
    let mut rng = Lcg::new(seed);
    
    // 1. シンクロ判定
    let sync_success = perform_sync_check(&mut rng, EncounterType::Normal, config.sync_enabled);
    
    // 2. スロット決定
    let slot_rand = rng.next();
    let slot = normal_encounter_slot(slot_rand);
    
    // 3. レベル決定 (空消費)
    let _level_rand = rng.next();
    
    // 4. PID 生成
    let pid = if config.shiny_charm {
        generate_pid_with_shiny_charm(&mut rng, config.tid, config.sid, generate_wild_pid)
    } else {
        let r = rng.next();
        generate_wild_pid(r, config.tid, config.sid)
    };
    
    // 5. 性格決定
    let (nature, sync_applied) = determine_nature(&mut rng, sync_success, config.sync_nature);
    
    build_pokemon_data(seed, pid, nature, sync_applied, slot, 0, config)
}
```

### 2.2 Surfing (なみのり)

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | シンクロ判定 | 1 | - |
| 2 | スロット決定 | 1 | - |
| 3 | レベル決定 | 1 | 結果を使用 |
| 4 | PID 生成 | 1+ | - |
| 5 | 性格決定 | 1 | - |
| 6 | 持ち物判定 | 1 | - |

**合計**: 6 (+ ひかるおまもり 0-2)

```rust
fn generate_surfing(seed: u64, config: &PokemonGenerationConfig) -> RawPokemonData {
    let mut rng = Lcg::new(seed);
    
    let sync_success = perform_sync_check(&mut rng, EncounterType::Surfing, config.sync_enabled);
    let slot = water_encounter_slot(rng.next());
    let level_rand = rng.next();
    
    let pid = generate_pid_maybe_shiny_charm(&mut rng, config);
    let (nature, sync_applied) = determine_nature(&mut rng, sync_success, config.sync_nature);
    
    let _item_rand = rng.next();  // 持ち物判定
    
    build_pokemon_data(seed, pid, nature, sync_applied, slot, level_rand, config)
}
```

### 2.3 Fishing (釣り)

なみのりと同一のフロー。

### 2.4 DustCloud (砂煙)

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | シンクロ判定 | 1 | - |
| 2 | スロット決定 | 1 | 2スロット |
| 3 | レベル決定 | 1 | 空消費 |
| 4 | PID 生成 | 1+ | - |
| 5 | 性格決定 | 1 | - |
| 6 | 持ち物判定 | 1 | あり |

**合計**: 6 (+ ひかるおまもり 0-2)

### 2.5 SwayGrass (揺れる草), Bridge (橋の影)

砂煙と同一のフロー (ただし持ち物判定なし)。

### 2.6 FishingBubble (水泡)

なみのりと同一のフロー。

## 3. 擬似コード: 統合生成関数

```rust
pub fn generate_wild_pokemon(
    seed: u64,
    config: &PokemonGenerationConfig,
) -> RawPokemonData {
    let mut rng = Lcg::new(seed);
    let enc_type = config.encounter_type;
    
    // 1. シンクロ判定
    let sync_success = perform_sync_check(&mut rng, enc_type, config.sync_enabled);
    
    // 2. スロット決定
    let slot = calculate_encounter_slot(enc_type, rng.next());
    
    // 3. レベル決定
    let level_rand = if consumes_level_rand(enc_type) {
        rng.next()
    } else {
        0
    };
    
    // 4. PID 生成
    let pid = generate_pokemon_pid(&mut rng, config);
    
    // 5. 性格決定
    let (nature, sync_applied) = determine_nature(&mut rng, sync_success, config.sync_nature);
    
    // 6. 持ち物判定
    let held_item_slot = if consumes_held_item_rand(enc_type) {
        let item_rand = rng.next();
        determine_held_item_slot(
            config.version,
            item_rand,
            config.has_compound_eyes,
            has_very_rare_item(enc_type),
        )
    } else {
        HeldItemSlot::None
    };
    
    build_pokemon_data(seed, pid, nature, sync_applied, slot, level_rand, held_item_slot, config)
}

fn consumes_held_item_rand(enc_type: EncounterType) -> bool {
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
```

## 4. 乱数消費まとめ

| 種別 | シンクロ | スロット | レベル | PID | 性格 | 持ち物 | 合計 |
|-----|---------|---------|-------|-----|-----|-------|-----|
| Normal | 1 | 1 | 1 | 1-3 | 1 | 0 | 5-7 |
| ShakingGrass | 1 | 1 | 1 | 1-3 | 1 | 1 | 6-8 |
| Surfing | 1 | 1 | 1 | 1-3 | 1 | 1 | 6-8 |
| SurfingBubble | 1 | 1 | 1 | 1-3 | 1 | 1 | 6-8 |
| Fishing | 1 | 1 | 1 | 1-3 | 1 | 1 | 6-8 |
| FishingBubble | 1 | 1 | 1 | 1-3 | 1 | 1 | 6-8 |
| DustCloud | - | - | - | - | - | - | (別処理) |
| PokemonShadow | - | - | - | - | - | - | (別処理) |

## 5. 出力データの解決

`ResolvedPokemonData` は WASM 内で解決済み。TypeScript 側では以下のみ追加:

- `held_item_slot` → アイテム名 (種族データ + ロケールから解決)
- `species_id` → 種族名 (i18n)
- `nature` → 性格名 (i18n)
- `ability_slot` → 特性名 (種族データから参照)

## 関連ドキュメント

- [型定義](../data-structures.md)
- [エンカウント処理](../algorithm/encounter.md)
- [PID 生成・色違い判定](../algorithm/pid-shiny.md)
- [性格・シンクロ](../algorithm/nature-sync.md)
