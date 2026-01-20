# アルゴリズム: 個体値生成・遺伝処理

MT19937 による個体値生成と孵化時の遺伝処理。

## 1. MT Seed 導出

LCG Seed から MT Seed を導出する。

```rust
/// LCG Seed → MT Seed
/// LCG を1回進めた後の上位32bitを取得
pub fn derive_mt_seed(lcg_seed: u64) -> u32 {
    let mut lcg = Lcg::new(lcg_seed);
    lcg.next()  // 上位32bit を返す
}
```

## 2. 個体値生成 (MT19937)

### 2.1 基本アルゴリズム

```rust
/// 徘徊ポケモン用 IV 生成順序
/// 生成順: HP, Atk, Def, Spe, SpA, SpD
/// 格納順: HP, Atk, Def, SpA, SpD, Spe
const ROAMER_ORDER: [usize; 6] = [0, 1, 2, 5, 3, 4];

/// MT19937 から個体値セットを生成
/// offset: 事前に破棄する乱数回数
/// is_roamer: 徘徊ポケモンの場合は特殊順序を使用
pub fn generate_ivs(mt_seed: u32, offset: u32, is_roamer: bool) -> IvSet {
    let mut mt = Mt19937::new(mt_seed);
    
    // offset 回分を破棄
    for _ in 0..offset {
        mt.next_u32();
    }
    
    // 6ステータス分の個体値を生成
    let mut ivs = [0u8; 6];
    if is_roamer {
        // 徘徊: 特殊順序で格納
        for &target_idx in &ROAMER_ORDER {
            ivs[target_idx] = (mt.next_u32() >> 27) as u8;
        }
    } else {
        // 通常: 順番に格納
        for i in 0..6 {
            ivs[i] = (mt.next_u32() >> 27) as u8;
        }
    }
    
    ivs  // [HP, Atk, Def, SpA, SpD, Spe]
}
```

### 2.2 IV オフセット

ゲームバージョン・エンカウント種別により MT の初期破棄回数が異なる。

| 条件 | MT オフセット |
|-----|-------------|
| BW 野生/固定 | 0 |
| BW2 野生/固定 | 2 |
| BW 徘徊 | 1 |
| 孵化 (BW/BW2) | 7 |

```rust
/// エンカウント種別・バージョンによる IV オフセット
pub fn iv_offset(version: RomVersion, encounter_type: EncounterType) -> u32 {
    if encounter_type == EncounterType::Roamer {
        return 1;
    }
    
    match version {
        RomVersion::Black | RomVersion::White => 0,
        RomVersion::Black2 | RomVersion::White2 => 2,
    }
}
```

### 2.3 徘徊ポケモンの特殊順序

徘徊ポケモンは IV の生成順序が異なる。`generate_ivs` の `is_roamer` フラグで制御。

- 通常: HP → Atk → Def → SpA → SpD → Spe
- 徘徊: HP → Atk → Def → Spe → SpA → SpD

## 3. 遺伝処理 (孵化)

### 3.1 遺伝スロット決定

孵化では3箇所のステータスが親から遺伝する。

```rust
/// 遺伝スロットを決定
pub fn determine_inheritance_slots(rng: &mut Lcg) -> InheritanceSlots {
    let mut slots = [InheritanceSlot::default(); 3];
    let mut used_stats = [false; 6];
    
    for i in 0..3 {
        // 遺伝先ステータス決定 (未使用のものから選択)
        let stat = loop {
            let r = rng.next();
            let candidate = ((r as u64 * 6) >> 32) as usize;
            if !used_stats[candidate] {
                used_stats[candidate] = true;
                break candidate as u8;
            }
        };
        
        // 遺伝元親決定 (50%)
        let r = rng.next();
        let parent = if r >> 31 == 1 {
            ParentRole::Male
        } else {
            ParentRole::Female
        };
        
        slots[i] = InheritanceSlot { stat, parent };
    }
    
    slots
}
```

### 3.2 遺伝適用

```rust
/// 遺伝を適用して最終 IV を決定
pub fn apply_inheritance(
    rng_ivs: &IvSet,
    parents: &ParentsIvs,
    inheritance: &InheritanceSlots,
) -> IvSet {
    let mut result = *rng_ivs;
    
    for slot in inheritance {
        let parent_ivs = match slot.parent {
            ParentRole::Male => &parents.male,
            ParentRole::Female => &parents.female,
        };
        result[slot.stat as usize] = parent_ivs[slot.stat as usize];
    }
    
    result
}
```

## 4. 孵化時の完全フロー

孵化では MT オフセット 7 を使用し、遺伝処理を適用する。

```rust
/// 孵化個体の IV を計算
pub fn calculate_egg_ivs(
    lcg_seed: u64,
    parents: &ParentsIvs,
    inheritance: &InheritanceSlots,
) -> IvSet {
    // 1. MT Seed 導出
    let mt_seed = derive_mt_seed(lcg_seed);
    
    // 2. 乱数 IV 生成 (孵化は offset=7, 徘徊ではない)
    let rng_ivs = generate_ivs(mt_seed, 7, false);
    
    // 3. 遺伝適用
    apply_inheritance(&rng_ivs, parents, inheritance)
}
```

## 5. Pokemon 生成時の IV

野生・固定シンボル等ではバージョン・エンカウント種別に応じた offset で生成。

```rust
/// Pokemon 用 IV 計算
pub fn calculate_pokemon_ivs(
    lcg_seed: u64,
    version: RomVersion,
    encounter_type: EncounterType,
) -> IvSet {
    let mt_seed = derive_mt_seed(lcg_seed);
    let offset = iv_offset(version, encounter_type);
    let is_roamer = encounter_type == EncounterType::Roamer;
    
    generate_ivs(mt_seed, offset, is_roamer)
}
```

## 6. めざめるパワー

個体値からめざめるパワーのタイプと威力を計算。

```rust
/// めざパタイプ計算
pub fn hidden_power_type(ivs: &IvSet) -> u8 {
    let bits = (ivs[0] & 1)
        | ((ivs[1] & 1) << 1)
        | ((ivs[2] & 1) << 2)
        | ((ivs[5] & 1) << 3)  // Spe
        | ((ivs[3] & 1) << 4)  // SpA
        | ((ivs[4] & 1) << 5); // SpD
    
    (bits as u16 * 15 / 63) as u8
}

/// めざパ威力計算
pub fn hidden_power_power(ivs: &IvSet) -> u8 {
    let bits = ((ivs[0] >> 1) & 1)
        | (((ivs[1] >> 1) & 1) << 1)
        | (((ivs[2] >> 1) & 1) << 2)
        | (((ivs[5] >> 1) & 1) << 3)
        | (((ivs[3] >> 1) & 1) << 4)
        | (((ivs[4] >> 1) & 1) << 5);
    
    (bits as u16 * 40 / 63 + 30) as u8
}
```

## 関連ドキュメント

- [生成フロー: 野生](../flows/pokemon-wild.md)
- [生成フロー: 孵化](../flows/egg.md)
- [core/mt/ 仕様](../../../architecture/rust-structure.md)
