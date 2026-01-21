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
         ├─ 4. 持ち物判定 (条件による)
         │
         └─ ResolvedPokemonData 出力
```

> **注意**: 本セクションは BW 仕様を基準とする。BW2 での差異は [セクション 6](#6-bwbw2-の差異) を参照。

## 2. 種別ごとの消費パターン

### 2.1 StaticSymbol (固定シンボル)

伝説ポケモン等、マップ上に固定配置されたシンボル。

#### 2.1.1 シンクロ / 先頭特性なし

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | シンクロ判定 | 1 | 対応 |
| 2 | PID 生成 | 1+ | ひかるおまもり対応 |
| 3 | 性格決定 | 1 | シンクロ適用可 |
| 4 | 持ち物判定 | 0-1* | 条件による |
| 5 | (BW) 最後の消費 | 1 | BW2 では消費なし |

**合計 (BW)**: 4-5 (+ ひかるおまもり 0-2)  
**合計 (BW2)**: 3-4 (+ ひかるおまもり 0-2)

#### 2.1.2 ふくがん先頭

ふくがんが先頭の場合、シンクロ判定をスキップする。

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | PID 生成 | 1+ | ひかるおまもり対応 |
| 2 | 性格決定 | 1 | - |
| 3 | 持ち物判定 | 0-1* | 条件による |
| 4 | (BW) 最後の消費 | 1 | BW2 では消費なし |

**合計 (BW)**: 3-4 (+ ひかるおまもり 0-2)  
**合計 (BW2)**: 2-3 (+ ひかるおまもり 0-2)

```rust
fn generate_static_symbol(seed: LcgSeed, config: &PokemonGenerationConfig) -> ResolvedPokemonData {
    let mut lcg = Lcg64::new(seed);
    let is_compound_eyes = config.lead_ability == LeadAbility::CompoundEyes;
    
    // 1. シンクロ判定 (ふくがん先頭時はスキップ)
    let sync_success = if is_compound_eyes {
        false
    } else {
        perform_sync_check(&mut lcg, EncounterType::StaticSymbol, &config.lead_ability)
    };
    
    // 2. PID 生成 (pid-shiny.md の generate_pokemon_pid_wild を使用)
    let pid = generate_pokemon_pid_wild(&mut lcg, config.tid, config.sid, config.shiny_charm);
    
    // 2.1 色違いロック適用 (ゼクロム・レシラム・キュレム等)
    let pid = if config.shiny_locked {
        apply_shiny_lock(pid, config.tid, config.sid)
    } else {
        pid
    };
    
    // 3. 性格決定
    let (nature, sync_applied) = determine_nature(&mut lcg, sync_success, &config.lead_ability);
    
    // 4. 持ち物判定 (対象個体のみ)
    if config.has_held_item {
        lcg.next();
    }
    
    // 5. BW のみ: 最後の消費
    if config.version.is_bw() {
        lcg.next();
    }
    
    build_resolved_pokemon_data(seed, pid, nature, sync_applied, 0, 0, config)
}
```

### 2.2 StaticStarter (御三家)

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 1 | シンクロ判定 | 0 | 非対応 (先頭特性無効) |
| 2 | PID 生成 | 1 | ID 補正なし、色違いロック |
| 3 | 性格決定 | 1 | - |

**合計**: 2

```rust
fn generate_starter(seed: LcgSeed, config: &PokemonGenerationConfig) -> ResolvedPokemonData {
    let mut lcg = Lcg64::new(seed);
    
    // シンクロなし (先頭特性無効)
    
    // PID 生成 (ID 補正なし)
    let pid_base = generate_event_pid(lcg.next());
    // 色違いロック適用
    let pid = apply_shiny_lock(pid_base, config.tid, config.sid);
    
    // 性格決定
    let nature = Nature::from_u8(nature_roll(lcg.next()));
    
    build_resolved_pokemon_data(seed, pid, nature, false, 0, 0, config)
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
fn generate_roamer(seed: LcgSeed, config: &PokemonGenerationConfig) -> ResolvedPokemonData {
    let mut lcg = Lcg64::new(seed);
    
    // シンクロなし
    
    // PID 生成 (pid-shiny.md の generate_pokemon_pid_wild を使用)
    let pid = generate_pokemon_pid_wild(&mut lcg, config.tid, config.sid, config.shiny_charm);
    
    // 性格決定
    let nature = Nature::from_u8(nature_roll(lcg.next()));
    
    build_resolved_pokemon_data(seed, pid, nature, false, 0, 0, config)
}
```

**IV の特殊処理**: 徘徊ポケモンは MT19937 での IV 生成順序が異なる。詳細は [iv-inheritance.md](../algorithm/iv-inheritance.md) 参照。

## 3. 乱数消費まとめ

### 3.1 BW

| 種別 | シンクロ | PID | 性格 | 持ち物 | 最後の消費 | 合計 | 備考 |
|-----|---------|-----|-----|-------|----------|-----|------|
| StaticSymbol | 0-1 | 1-3 | 1 | 0-1 | 1 | 4-7 | ふくがんでシンクロスキップ |
| StaticStarter | 0 | 1 | 1 | - | - | 2 | 色違いロック、先頭特性無効 |
| StaticFossil | 0 | 1 | 1 | - | - | 2 | 色違いロック、先頭特性無効 |
| StaticEvent | 0 | 1 | 1 | - | - | 2 | 個体による、先頭特性無効 |
| Roamer | 0 | 1-3 | 1 | - | - | 2-4 | IV順序特殊 |

### 3.2 BW2

| 種別 | シンクロ | PID | 性格 | 持ち物 | 合計 | 備考 |
|-----|---------|-----|-----|-------|-----|------|
| StaticSymbol | 0-1 | 1-3 | 1 | 0-1 | 3-6 | 最後の消費なし |
| StaticStarter | 0 | 1 | 1 | - | 2 | - |
| StaticFossil | 0 | 1 | 1 | - | 2 | - |
| StaticEvent | 0 | 1 | 1 | - | 2 | - |
| Roamer | 0 | 1-3 | 1 | - | 2-4 | - |

## 4. 色違いロック対象

以下のポケモンは色違いにならない:

### 4.1 BW

| 種別 | ポケモン |
|-----|----------|
| StaticSymbol | レシラム、ゼクロム、ビクティニ |
| StaticEvent | N のポケモン、季節研究所シキジカ、ショウロイーブイ |

### 4.2 BW2

| 種別 | ポケモン |
|-----|----------|
| StaticSymbol | レシラム、ゼクロム、キュレム |
| StaticEvent | N のポケモン、一部配布 |

色違いロックは `PokemonGenerationConfig.shiny_locked` で制御。

> **Note:** StaticSymbol でも色違いロック対象のポケモンが存在する。
> `generate_pokemon_pid_wild` で PID 生成後、`apply_shiny_lock` を適用する。

## 5. 擬似コード: 統合生成関数

```rust
pub fn generate_static_pokemon(
    seed: LcgSeed,
    config: &PokemonGenerationConfig,
) -> ResolvedPokemonData {
    let mut lcg = Lcg64::new(seed);
    let enc_type = config.encounter_type;
    let is_compound_eyes = config.lead_ability == LeadAbility::CompoundEyes;
    
    // シンクロ判定 (StaticSymbol のみ、ふくがん時はスキップ)
    let sync_success = if enc_type == EncounterType::StaticSymbol && !is_compound_eyes {
        perform_sync_check(&mut lcg, enc_type, &config.lead_ability)
    } else {
        false
    };
    
    // PID 生成
    let pid = match enc_type {
        EncounterType::StaticSymbol | EncounterType::Roamer => {
            // pid-shiny.md の generate_pokemon_pid_wild を使用
            let pid = generate_pokemon_pid_wild(&mut lcg, config.tid, config.sid, config.shiny_charm);
            // 色違いロック適用 (ゼクロム・レシラム・キュレム等)
            if config.shiny_locked {
                apply_shiny_lock(pid, config.tid, config.sid)
            } else {
                pid
            }
        }
        EncounterType::StaticStarter
        | EncounterType::StaticFossil
        | EncounterType::StaticEvent => {
            // pid-shiny.md の generate_pokemon_pid_event を使用
            generate_pokemon_pid_event(&mut lcg, config.tid, config.sid, config.shiny_locked)
        }
        _ => unreachable!(),
    };
    
    // 性格決定
    let (nature, sync_applied) = determine_nature(&mut lcg, sync_success, &config.lead_ability);
    
    // 持ち物判定 (StaticSymbol で対象個体のみ)
    if enc_type == EncounterType::StaticSymbol && config.has_held_item {
        lcg.next();
    }
    
    // BW のみ: 最後の消費 (StaticSymbol のみ)
    if enc_type == EncounterType::StaticSymbol && config.version.is_bw() {
        lcg.next();
    }
    
    build_resolved_pokemon_data(seed, pid, nature, sync_applied, 0, 0, config)
}
```

## 6. BW/BW2 の差異

### 6.1 乱数計算式

| バージョン | 計算式 |
|-----------|--------|
| BW | `(乱数 >> 32) * 0xFFFF / 0x290 >> 32` |
| BW2 | `(乱数 >> 32) * 100 >> 32` |

### 6.2 最後の謎の消費 (StaticSymbol)

| バージョン | 消費 |
|-----------|------|
| BW | +1 消費あり |
| BW2 | なし |

### 6.3 固定ポケモン消費数 (持ち物なし、シンクロあり)

| バージョン | 合計消費 |
|-----------|----------|
| BW | 4 |
| BW2 | 3 |

## 関連ドキュメント

- [型定義](../data-structures.md)
- [PID 生成・色違い判定](../algorithm/pid-shiny.md)
- [IV 生成・遺伝](../algorithm/iv-inheritance.md)
- [生成フロー: 野生](./pokemon-wild.md)
