# 生成フロー: 固定シンボル・イベント・徘徊

固定シンボル、御三家、化石、イベント配布、徘徊ポケモンの生成フロー。

## 1. フロー概要

固定エンカウントは野生エンカウントより乱数消費が少ない。

```
LCG Seed
    │
    ├─ Game Offset 適用
    │
    ├─ User Offset 適用
    │
    └─ 個体生成開始
         │
         ├─ 1. シンクロ判定 (対応種別のみ)
         ├─ 2. PID 生成
         ├─ 3. 性格決定
         │
         └─ RawPokemonData 出力
```

## 2. 種別ごとの消費パターン

### 2.1 StaticSymbol (固定シンボル)

伝説ポケモン等、マップ上に固定配置されたシンボル。

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | シンクロ判定 | 1 | 対応 |
| 2 | PID 生成 | 1+ | ひかるおまもり対応 |
| 3 | 性格決定 | 1 | シンクロ適用可 |

**合計**: 3 (+ ひかるおまもり 0-2)

```rust
fn generate_static_symbol(seed: u64, config: &PokemonGenerationConfig) -> RawPokemonData {
    let mut rng = Lcg::new(seed);
    
    // 1. シンクロ判定
    let sync_success = perform_sync_check(
        &mut rng, 
        EncounterType::StaticSymbol, 
        config.sync_enabled
    );
    
    // 2. PID 生成
    let pid = if config.shiny_charm {
        generate_pid_with_shiny_charm(&mut rng, config.tid, config.sid, |r| {
            generate_static_pid(r, config.tid, config.sid)
        })
    } else {
        generate_static_pid(rng.next(), config.tid, config.sid)
    };
    
    // 3. 性格決定
    let (nature, sync_applied) = determine_nature(&mut rng, sync_success, config.sync_nature);
    
    build_pokemon_data(seed, pid, nature, sync_applied, 0, 0, config)
}
```

### 2.2 StaticStarter (御三家)

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | シンクロ判定 | 0 | 非対応 |
| 2 | PID 生成 | 1 | ID 補正なし、色違いロック |
| 3 | 性格決定 | 1 | - |

**合計**: 2

```rust
fn generate_starter(seed: u64, config: &PokemonGenerationConfig) -> RawPokemonData {
    let mut rng = Lcg::new(seed);
    
    // シンクロなし
    
    // PID 生成 (ID 補正なし)
    let pid_base = generate_event_pid(rng.next());
    // 色違いロック適用
    let pid = apply_shiny_lock(pid_base, config.tid, config.sid);
    
    // 性格決定
    let nature = Nature::from_u8(nature_roll(rng.next()));
    
    build_pokemon_data(seed, pid, nature, false, 0, 0, config)
}
```

### 2.3 StaticFossil (化石)

御三家と同一のフロー。

### 2.4 StaticEvent (イベント配布)

御三家と同一のフロー (色違いロックは個体による)。

### 2.5 Roamer (徘徊)

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | シンクロ判定 | 0 | 非対応 |
| 2 | PID 生成 | 1+ | ID 補正あり |
| 3 | 性格決定 | 1 | - |

**合計**: 2 (+ ひかるおまもり 0-2)

```rust
fn generate_roamer(seed: u64, config: &PokemonGenerationConfig) -> RawPokemonData {
    let mut rng = Lcg::new(seed);
    
    // シンクロなし
    
    // PID 生成
    let pid = if config.shiny_charm {
        generate_pid_with_shiny_charm(&mut rng, config.tid, config.sid, |r| {
            generate_roamer_pid(r, config.tid, config.sid)
        })
    } else {
        generate_roamer_pid(rng.next(), config.tid, config.sid)
    };
    
    // 性格決定
    let nature = Nature::from_u8(nature_roll(rng.next()));
    
    build_pokemon_data(seed, pid, nature, false, 0, 0, config)
}
```

**IV の特殊処理**: 徘徊ポケモンは MT19937 での IV 生成順序が異なる。詳細は [iv-inheritance.md](../algorithm/iv-inheritance.md) 参照。

## 3. 乱数消費まとめ

| 種別 | シンクロ | PID | 性格 | 合計 | 備考 |
|-----|---------|-----|-----|-----|------|
| StaticSymbol | 1 | 1-3 | 1 | 3-5 | シンクロ対応 |
| StaticStarter | 0 | 1 | 1 | 2 | 色違いロック |
| StaticFossil | 0 | 1 | 1 | 2 | 色違いロック |
| StaticEvent | 0 | 1 | 1 | 2 | 個体による |
| Roamer | 0 | 1-3 | 1 | 2-4 | IV順序特殊 |

## 4. 色違いロック対象

以下のポケモンは色違いにならない:

- **BW**: 御三家、N のポケモン、一部配布
- **BW2**: 御三家、一部配布

色違いロックは `PokemonGenerationConfig.shiny_locked` で制御。

## 5. 擬似コード: 統合生成関数

```rust
pub fn generate_static_pokemon(
    seed: u64,
    config: &PokemonGenerationConfig,
) -> RawPokemonData {
    let mut rng = Lcg::new(seed);
    let enc_type = config.encounter_type;
    
    // シンクロ判定 (StaticSymbol のみ)
    let sync_success = if enc_type == EncounterType::StaticSymbol {
        perform_sync_check(&mut rng, enc_type, config.sync_enabled)
    } else {
        false
    };
    
    // PID 生成
    let pid = match enc_type {
        EncounterType::StaticSymbol => {
            generate_pokemon_pid(&mut rng, config)
        }
        EncounterType::StaticStarter
        | EncounterType::StaticFossil
        | EncounterType::StaticEvent => {
            let base = generate_event_pid(rng.next());
            if config.shiny_locked {
                apply_shiny_lock(base, config.tid, config.sid)
            } else {
                base
            }
        }
        EncounterType::Roamer => {
            if config.shiny_charm {
                generate_pid_with_shiny_charm(&mut rng, config.tid, config.sid, |r| {
                    generate_roamer_pid(r, config.tid, config.sid)
                })
            } else {
                generate_roamer_pid(rng.next(), config.tid, config.sid)
            }
        }
        _ => unreachable!(),
    };
    
    // 性格決定
    let (nature, sync_applied) = if sync_success {
        (config.sync_nature, true)
    } else {
        (Nature::from_u8(nature_roll(rng.next())), false)
    };
    
    build_pokemon_data(seed, pid, nature, sync_applied, 0, 0, config)
}
```

## 関連ドキュメント

- [型定義](../data-structures.md)
- [PID 生成・色違い判定](../algorithm/pid-shiny.md)
- [IV 生成・遺伝](../algorithm/iv-inheritance.md)
- [生成フロー: 野生](./pokemon-wild.md)
