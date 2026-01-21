# アルゴリズム: 個体値生成・遺伝処理

MT19937 による個体値生成と孵化時の遺伝処理。
本モジュールで IV 生成に関する全てのロジックを集約する。

## 1. 型定義

```rust
use crate::common::types::{LcgSeed, MtSeed, IvSet, RomVersion, EncounterType};
use crate::core::mt::Mt19937;
```

**Seed 変換**: `LcgSeed::derive_mt_seed()` を使用 ([types.md](../../common/types.md#214-lcgseed))

## 2. 個体値生成 (MT19937)

### 2.1 定数

```rust
/// 標準順序: HP, Atk, Def, SpA, SpD, Spe
const STANDARD_ORDER: [usize; 6] = [0, 1, 2, 3, 4, 5];

/// 徘徊順序: HP, Atk, Def, Spe, SpA, SpD
const ROAMER_ORDER: [usize; 6] = [0, 1, 2, 5, 3, 4];

/// 孵化時の MT オフセット
const EGG_OFFSET: u32 = 7;
```

### 2.2 基本アルゴリズム

```rust
/// MT19937 から個体値セットを生成
/// 
/// # Arguments
/// * `mt_seed` - MT Seed
/// * `offset` - 事前に破棄する乱数回数
/// * `is_roamer` - 徘徊ポケモンの場合は特殊順序を使用
pub fn generate_ivs(mt_seed: MtSeed, offset: u32, is_roamer: bool) -> IvSet {
    let mut mt = Mt19937::new(mt_seed);
    mt.discard(offset);
    
    let order = if is_roamer { ROAMER_ORDER } else { STANDARD_ORDER };
    let mut ivs = [0u8; 6];
    
    for &stat_index in &order {
        ivs[stat_index] = (mt.next_u32() >> 27) as u8;
    }
    
    ivs  // [HP, Atk, Def, SpA, SpD, Spe]
}
```

**IV 計算式**: `(mt.next() >> 27) & 0x1F`

### 2.3 IV オフセット

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

### 2.4 徘徊ポケモンの特殊順序

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
    lcg_seed: LcgSeed,
    parents: &ParentsIvs,
    inheritance: &InheritanceSlots,
) -> IvSet {
    // 1. MT Seed 導出
    let mt_seed = lcg_seed.derive_mt_seed();
    
    // 2. 乱数 IV 生成 (孵化は offset=7, 徘徊ではない)
    let rng_ivs = generate_ivs(mt_seed, EGG_OFFSET, false);
    
    // 3. 遺伝適用
    apply_inheritance(&rng_ivs, parents, inheritance)
}
```

## 5. Pokemon 生成時の IV

野生・固定シンボル等ではバージョン・エンカウント種別に応じた offset で生成。

```rust
/// Pokemon 用 IV 計算
pub fn calculate_pokemon_ivs(
    lcg_seed: LcgSeed,
    version: RomVersion,
    encounter_type: EncounterType,
) -> IvSet {
    let mt_seed = lcg_seed.derive_mt_seed();
    let offset = iv_offset(version, encounter_type);
    let is_roamer = encounter_type == EncounterType::Roamer;
    
    generate_ivs(mt_seed, offset, is_roamer)
}
```

## 6. IV コードエンコーディング

IV の比較・検索用に 32bit コードにエンコード。

```rust
/// IV セットを 32bit コードにエンコード
/// 
/// 各 IV は 5bit (0-31)、計 30bit 使用
/// フォーマット: [Spe:5][SpD:5][SpA:5][Def:5][Atk:5][HP:5]
#[inline]
pub fn encode_iv_code(ivs: &IvSet) -> u32 {
    (ivs[0] as u32)
        | ((ivs[1] as u32) << 5)
        | ((ivs[2] as u32) << 10)
        | ((ivs[3] as u32) << 15)
        | ((ivs[4] as u32) << 20)
        | ((ivs[5] as u32) << 25)
}

/// 32bit コードを IV セットにデコード
#[inline]
pub fn decode_iv_code(code: u32) -> IvSet {
    [
        (code & 0x1F) as u8,
        ((code >> 5) & 0x1F) as u8,
        ((code >> 10) & 0x1F) as u8,
        ((code >> 15) & 0x1F) as u8,
        ((code >> 20) & 0x1F) as u8,
        ((code >> 25) & 0x1F) as u8,
    ]
}
```

## 8. めざめるパワー

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

## 7. めざめるパワー

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

## 8. wasm-bindgen エクスポート

```rust
use wasm_bindgen::prelude::*;
use crate::generation::seed_conversion::derive_mt_seed;

/// IV セットを生成
#[wasm_bindgen]
pub fn wasm_generate_ivs(mt_seed: u32, offset: u32, is_roamer: bool) -> Vec<u8> {
    generate_ivs(MtSeed::new(mt_seed), offset, is_roamer).to_vec()
}

/// IV コードをエンコード
#[wasm_bindgen]
pub fn wasm_encode_iv_code(ivs: &[u8]) -> u32 {
    if ivs.len() != 6 { return 0; }
    let arr: IvSet = [ivs[0], ivs[1], ivs[2], ivs[3], ivs[4], ivs[5]];
    encode_iv_code(&arr)
}

/// IV コードをデコード
#[wasm_bindgen]
pub fn wasm_decode_iv_code(code: u32) -> Vec<u8> {
    decode_iv_code(code).to_vec()
}
```

## 9. 関連ドキュメント

- [core/mt.md](../../core/mt.md) - MT19937 PRNG
- [core/lcg.md](../../core/lcg.md) - LCG PRNG
- [seed-conversion.md](../seed-conversion.md) - Seed 変換 (derive_mt_seed)
- [common/types.md](../../common/types.md) - 型定義 (LcgSeed, MtSeed, IvSet)
