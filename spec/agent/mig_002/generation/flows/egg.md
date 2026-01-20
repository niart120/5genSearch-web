# 生成フロー: 孵化個体

孵化個体の生成フロー。

## 1. フロー概要

```
LCG Seed (64-bit)
    │
    ├─ Game Offset 適用
    │
    ├─ User Offset 適用
    │
    └─ 個体生成開始
         │
         ├─ MT Seed 導出 (= LCG 1回消費後の上位32bit)
         │     └─ 乱数 IV 生成 (MT19937)
         │
         ├─ 1. 性格決定 (かわらずのいし考慮)
         ├─ 2. 遺伝スロット決定 x3
         ├─ 3. 夢特性判定
         ├─ 4. 性別判定
         ├─ 5. PID 生成 (リロール考慮)
         │
         └─ 遺伝適用 → RawEggData 出力
```

## 2. 乱数消費パターン

| 順序 | 処理 | 乱数消費 | 備考 |
|-----|------|---------|------|
| 0 | MT Seed 導出 | 1 | 個体生成前に消費 |
| 1 | かわらずのいし/性格判定 | 1-2 | 失敗時は追加1回 |
| 2 | 遺伝スロット1 | 2+ | stat (重複回避) + parent |
| 3 | 遺伝スロット2 | 2+ | stat (重複回避) + parent |
| 4 | 遺伝スロット3 | 2+ | stat (重複回避) + parent |
| 5 | 夢特性判定 | 1 | 条件を満たす場合のみ意味あり |
| 6 | 性別判定 | 1 | ニドラン判定含む |
| 7 | PID 生成 | 2 * (1 + reroll) | 国際孵化時は複数回 |

**合計**: 可変 (条件により大きく変動)

## 3. 詳細フロー

### 3.1 MT Seed 導出と乱数 IV

```rust
// LCG を1回消費して MT Seed を取得
let mt_seed = derive_mt_seed(lcg_seed);

// MT19937 で乱数 IV を生成 (7回破棄後、6回取得)
let rng_ivs = generate_rng_ivs(mt_seed);
```

### 3.2 性格決定

```rust
fn determine_egg_nature(rng: &mut Lcg, everstone: EverstoneEffect) -> Nature {
    match everstone {
        EverstoneEffect::None => {
            // かわらずのいしなし: 乱数性格
            Nature::from_u8(nature_roll(rng.next()))
        }
        EverstoneEffect::Fixed(nature) => {
            // かわらずのいしあり: 50% で固定
            if rng.next() >> 31 == 1 {
                nature
            } else {
                // 失敗時は乱数性格
                Nature::from_u8(nature_roll(rng.next()))
            }
        }
    }
}
```

### 3.3 遺伝スロット決定

```rust
fn determine_inheritance(rng: &mut Lcg) -> InheritanceSlots {
    let mut slots = [InheritanceSlot::default(); 3];
    let mut used = [false; 6];  // 使用済みステータス
    
    for i in 0..3 {
        // 遺伝先ステータス決定 (重複不可)
        let stat = loop {
            let r = rng.next();
            let candidate = ((r as u64 * 6) >> 32) as usize;
            if !used[candidate] {
                used[candidate] = true;
                break candidate as u8;
            }
            // 重複時は再抽選 (追加消費)
        };
        
        // 遺伝元親決定 (50%)
        let parent = if rng.next() >> 31 == 1 {
            ParentRole::Male
        } else {
            ParentRole::Female
        };
        
        slots[i] = InheritanceSlot { stat, parent };
    }
    
    slots
}
```

### 3.4 夢特性判定

```rust
fn determine_hidden_ability(
    rng: &mut Lcg,
    female_has_hidden: bool,
    uses_ditto: bool,
    allow_hidden: bool,
) -> bool {
    let r = rng.next();
    
    // 夢特性条件:
    // - 夢特性が許可されている
    // - メタモンを使用していない
    // - ♀親が夢特性
    // - 乱数判定成功 (60%)
    if allow_hidden && !uses_ditto && female_has_hidden {
        ((r as u64 * 5) >> 32) >= 2  // 3/5 = 60%
    } else {
        false
    }
}
```

### 3.5 性別判定

```rust
fn determine_egg_gender(
    rng: &mut Lcg,
    gender_ratio: GenderRatio,
    nidoran_flag: bool,
) -> Gender {
    match gender_ratio {
        GenderRatio::Genderless => Gender::Genderless,
        GenderRatio::MaleOnly => Gender::Male,
        GenderRatio::FemaleOnly => Gender::Female,
        GenderRatio::Threshold(threshold) => {
            let r = rng.next();
            let value = (r & 0xFF) as u8;
            
            // ニドラン♀フラグ時の特殊処理
            if nidoran_flag {
                // ニドラン♂/♀の決定
            }
            
            if value < threshold {
                Gender::Female
            } else {
                Gender::Male
            }
        }
    }
}
```

### 3.6 PID 生成

```rust
fn generate_egg_pid_with_reroll(
    rng: &mut Lcg,
    tid: u16,
    sid: u16,
    reroll_count: u8,
) -> (u32, ShinyType) {
    for _ in 0..=reroll_count {
        let r1 = rng.next();
        let r2 = rng.next();
        let pid = generate_egg_pid(r1, r2);
        
        let shiny = check_shiny_type(tid, sid, pid);
        if shiny != ShinyType::None {
            return (pid, shiny);
        }
    }
    
    // 最後の試行
    let r1 = rng.next();
    let r2 = rng.next();
    let pid = generate_egg_pid(r1, r2);
    let shiny = check_shiny_type(tid, sid, pid);
    
    (pid, shiny)
}
```

## 4. 完全フロー擬似コード

```rust
pub fn generate_egg(
    lcg_seed: u64,
    config: &EggGenerationConfig,
    parents: &ParentsIvs,
) -> RawEggData {
    // MT Seed 導出と乱数 IV
    let mt_seed = derive_mt_seed(lcg_seed);
    let rng_ivs = generate_rng_ivs(mt_seed);
    
    // LCG 状態を進める (MT Seed 導出で1消費済み)
    let mut rng = Lcg::new(lcg_seed);
    rng.advance(1);  // MT Seed 導出分
    
    // 1. 性格決定
    let nature = determine_egg_nature(&mut rng, config.everstone);
    
    // 2. 遺伝スロット決定
    let inheritance = determine_inheritance(&mut rng);
    
    // 3. 夢特性判定
    let has_hidden = determine_hidden_ability(
        &mut rng,
        config.female_has_hidden,
        config.uses_ditto,
        true,
    );
    
    // 4. 性別判定
    let gender = determine_egg_gender(&mut rng, config.gender_ratio, config.nidoran_flag);
    
    // 5. PID 生成
    let (pid, shiny) = generate_egg_pid_with_reroll(
        &mut rng,
        config.tid,
        config.sid,
        config.pid_reroll_count,
    );
    
    // 特性スロット決定
    let ability = if has_hidden {
        AbilitySlot::Hidden
    } else {
        AbilitySlot::from_pid_bit(pid)
    };
    
    // 遺伝適用
    let final_ivs = apply_inheritance(&rng_ivs, parents, &inheritance);
    
    RawEggData {
        advance: 0,  // 呼び出し側で設定
        lcg_seed,
        mt_seed,
        ivs: final_ivs,
        nature,
        gender,
        ability,
        shiny,
        pid,
        inheritance,
    }
}
```

## 5. リロール回数

| 条件 | リロール回数 | 備考 |
|-----|------------|------|
| 通常 | 0 | - |
| 国際孵化 (BW) | 5 | 親の言語が異なる |
| 国際孵化 + ひかるおまもり (BW2) | 6 | - |

## 6. 関連ドキュメント

- [型定義](../data-structures.md)
- [PID 生成・色違い判定](../algorithm/pid-shiny.md)
- [IV 生成・遺伝](../algorithm/iv-inheritance.md)
- [性格・シンクロ](../algorithm/nature-sync.md)
