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
fn determine_egg_nature(lcg: &mut Lcg64, everstone: EverstoneEffect) -> Nature {
    match everstone {
        EverstoneEffect::None => {
            // かわらずのいしなし: 乱数性格
            Nature::from_u8(nature_roll(lcg.next()))
        }
        EverstoneEffect::Fixed(nature) => {
            // かわらずのいしあり: 50% で固定
            if lcg.next() >> 31 == 1 {
                nature
            } else {
                // 失敗時は乱数性格
                Nature::from_u8(nature_roll(lcg.next()))
            }
        }
    }
}
```

### 3.3 遺伝スロット決定

```rust
fn determine_inheritance(lcg: &mut Lcg64) -> InheritanceSlots {
    let mut slots = [InheritanceSlot::default(); 3];
    let mut used = [false; 6];  // 使用済みステータス
    
    for i in 0..3 {
        // 遺伝先ステータス決定 (重複不可)
        let stat = loop {
            let r = lcg.next();
            let candidate = ((r as u64 * 6) >> 32) as usize;
            if !used[candidate] {
                used[candidate] = true;
                break candidate as u8;
            }
            // 重複時は再抽選 (追加消費)
        };
        
        // 遺伝元親決定 (50%)
        let parent = if lcg.next() >> 31 == 1 {
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
    lcg: &mut Lcg64,
    female_has_hidden: bool,
    uses_ditto: bool,
    allow_hidden: bool,
) -> bool {
    let r = lcg.next();
    
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
    lcg: &mut Lcg64,
    gender_ratio: GenderRatio,
    nidoran_flag: bool,
) -> Gender {
    match gender_ratio {
        GenderRatio::Genderless => Gender::Genderless,
        GenderRatio::MaleOnly => Gender::Male,
        GenderRatio::FemaleOnly => Gender::Female,
        GenderRatio::Threshold(threshold) => {
            let r = lcg.next();
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
    lcg: &mut Lcg64,
    tid: u16,
    sid: u16,
    reroll_count: u8,
) -> (u32, ShinyType) {
    for _ in 0..=reroll_count {
        let r1 = lcg.next();
        let r2 = lcg.next();
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

### 4.1 設計上の注意: BaseSeed と CurrentSeed の分離

卵生成でも野生/固定シンボルと同様に、2種類の seed 概念を区別する必要がある:

```
SHA-1(日時+DS設定) → LcgSeed (BaseSeed)
                         │
                         ├─ derive_mt_seed() → MtSeed → 乱数IV生成 (全消費位置で共通)
                         │
                         └─ advance(n) → n消費後の Lcg64 → 性格/遺伝/PID生成
```

- **BaseSeed**: SHA-1 から導出される初期 seed。MT Seed の導出元として固定
- **CurrentSeed**: n 消費後の LCG 状態。個体生成 (性格/遺伝/PID) に使用

**問題**: `generate_egg(seed: LcgSeed)` 形式だと、探索時に n 消費後の seed を渡すと
IV 計算用の MT Seed が CurrentSeed から導出されてしまい、正しい IV が得られない。

**解決策**: 
1. `generate_egg` は `&mut Lcg64` を受け取り、IV を含まない `RawEggData` を返す
2. IV 計算は `EggGenerator` が保持する `base_seed` から行う

### 4.2 個体生成関数 (IV なし)

```rust
/// 卵の個体生成 (IV を含まない)
/// 
/// 注意: IV は返さない。呼び出し側 (EggGenerator) で BaseSeed から計算すること。
pub fn generate_egg(
    lcg: &mut Lcg64,
    config: &EggGenerationConfig,
) -> RawEggData {
    // 1. 性格決定
    let nature = determine_egg_nature(lcg, config.everstone);
    
    // 2. 遺伝スロット決定
    let inheritance = determine_inheritance(lcg);
    
    // 3. 夢特性判定
    let has_hidden = determine_hidden_ability(
        lcg,
        config.female_has_hidden,
        config.uses_ditto,
        true,
    );
    
    // 4. 性別判定
    let gender = determine_egg_gender(lcg, config.gender_ratio, config.nidoran_flag);
    
    // 5. PID 生成
    let (pid, shiny) = generate_egg_pid_with_reroll(
        lcg,
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
    
    RawEggData {
        nature,
        gender,
        ability,
        shiny,
        pid,
        inheritance,
    }
}
```

### 4.3 EggGenerator での完全な卵生成

```rust
impl EggGenerator {
    /// base_seed: SHA-1 から導出された初期 seed (IV 計算用に保持)
    pub fn new(base_seed: LcgSeed, config: EggGenerationConfig, parents: ParentsIvs) -> Self {
        // MT Seed と乱数 IV は base_seed から一度だけ計算
        let mt_seed = base_seed.derive_mt_seed();
        let rng_ivs = generate_rng_ivs(mt_seed);
        
        Self {
            base_seed,
            mt_seed,
            rng_ivs,
            config,
            parents,
        }
    }
    
    /// 指定消費位置での卵生成
    pub fn generate_at(&self, advance: u32) -> ResolvedEggData {
        // CurrentSeed: n 消費後の LCG 状態
        let mut lcg = Lcg64::new(self.base_seed);
        lcg.advance(advance + 1);  // +1 は MT Seed 導出分
        
        // 個体生成 (IV なし)
        let raw = generate_egg(&mut lcg, &self.config);
        
        // 遺伝適用 (BaseSeed 由来の rng_ivs を使用)
        let final_ivs = apply_inheritance(&self.rng_ivs, &self.parents, &raw.inheritance);
        
        ResolvedEggData {
            advance,
            ivs: final_ivs,
            ..raw.into()
        }
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
