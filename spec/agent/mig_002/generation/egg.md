# WASM API 仕様書: 孵化個体生成

LCG Seed から孵化個体を生成する機能。起動時刻検索とは独立したモジュール。

## 1. 概要

### 1.1 責務の分離

| モジュール | 責務 |
|-----------|------|
| datetime-search | 起動時刻 → LCG Seed 計算 (SHA-1) |
| **egg-generation** | LCG Seed → 孵化個体生成 |
| egg-search | 上記2つを組み合わせた検索 |

このモジュールは **LCG Seed を入力として受け取り、孵化個体を生成する** ことのみを責務とする。

### 1.2 計算フロー

```
LCG Seed (64-bit)
    ↓
Game Offset 適用 → Adjusted Seed
    ↓
User Offset 適用 → Start Seed
    ↓
LCG 消費しながら孵化個体を生成
    ↓
出力: EggIndividual[]
```

### 1.3 個体値決定

孵化個体の個体値は以下の3要素から決定:

1. **乱数個体値**: MT Seed (= LCG Seed 上位32bit) から MT19937 で生成
2. **親個体値**: ♂親 / ♀親 の個体値
3. **遺伝スロット**: LCG 消費で決定 (3箇所)

```
MT Seed → MT19937 → 乱数個体値 [6]
                          ↓
遺伝スロット決定 → 親個体値で上書き
                          ↓
                     最終個体値 [6]
```

## 2. 入力型

### 2.1 EggGenerationParams

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggGenerationParams {
    /// LCG Seed (64-bit)
    pub lcg_seed: u64,
    /// ゲームモード (オフセット決定)
    pub game_mode: GameMode,
    /// ユーザー指定オフセット
    pub user_offset: u64,
    /// 生成する消費数範囲
    pub advance_range: AdvanceRange,
    /// 孵化条件
    pub conditions: EggConditions,
    /// 親個体値
    pub parents: ParentsIVs,
}
```

### 2.2 AdvanceRange

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct AdvanceRange {
    pub min: u64,
    pub max: u64,
}
```

### 2.3 EggConditions

孵化時の生成条件。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggConditions {
    /// トレーナーID (色違い判定用)
    pub tid: u16,
    /// 裏ID
    pub sid: u16,
    /// 性別比
    pub gender_ratio: GenderRatio,
    /// かわらずのいし設定
    pub everstone: EverstoneEffect,
    /// ニドラン♀フラグ
    pub nidoran_flag: bool,
    /// メタモン使用
    pub uses_ditto: bool,
    /// ♀親が夢特性か
    pub female_has_hidden: bool,
    /// PID 再抽選回数 (国際孵化: 6 or 5, 通常: 0)
    pub pid_reroll_count: u8,
}
```

### 2.4 EverstoneEffect

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum EverstoneEffect {
    None,
    Fixed(Nature),
}
```

### 2.5 ParentsIVs

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct ParentsIVs {
    /// ♂親の個体値 [HP, Atk, Def, SpA, SpD, Spe]
    pub male: [u8; 6],
    /// ♀親の個体値
    pub female: [u8; 6],
}
```

## 3. 出力型

### 3.1 EggIndividual

生成された孵化個体。

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggIndividual {
    /// 消費数
    pub advance: u64,
    /// 個体値 [HP, Atk, Def, SpA, SpD, Spe]
    pub ivs: [u8; 6],
    /// 性格
    pub nature: Nature,
    /// 性別
    pub gender: Gender,
    /// 特性スロット
    pub ability: AbilitySlot,
    /// 色違い種別
    pub shiny: ShinyType,
    /// PID
    pub pid: u32,
    /// めざパタイプ
    pub hidden_power_type: u8,
    /// めざパ威力
    pub hidden_power_power: u8,
    /// 遺伝情報 (デバッグ用、省略可)
    pub inheritance: Option<InheritanceInfo>,
}
```

### 3.2 ShinyType

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ShinyType {
    None,
    Star,
    Square,
}
```

### 3.3 InheritanceInfo

```rust
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct InheritanceInfo {
    /// 各ステータスの遺伝元 (None = 乱数)
    pub sources: [Option<ParentRole>; 6],
}

#[derive(Tsify, Serialize, Deserialize, Clone, Copy)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ParentRole {
    Male,
    Female,
}
```

## 4. WASM API

### 4.1 EggGenerator

```rust
#[wasm_bindgen]
pub struct EggGenerator {
    // LCG 状態
    current_seed: u64,
    current_advance: u64,
    max_advance: u64,
    
    // 固定パラメータ
    conditions: EggConditions,
    parents: ParentsIVs,
    
    // 事前計算
    rng_ivs: [u8; 6],  // MT19937 から生成した乱数個体値
}

#[wasm_bindgen]
impl EggGenerator {
    #[wasm_bindgen(constructor)]
    pub fn new(params: EggGenerationParams) -> EggGenerator {
        // Game Offset を計算・適用
        let game_offset = calculate_game_offset(params.lcg_seed, params.game_mode);
        let adjusted_seed = lcg_advance(params.lcg_seed, game_offset);
        
        // User Offset を適用
        let start_seed = lcg_advance(adjusted_seed, params.user_offset + params.advance_range.min);
        
        // MT Seed から乱数個体値を事前計算
        let mt_seed = (params.lcg_seed >> 32) as u32;
        let rng_ivs = generate_rng_ivs(mt_seed);
        
        EggGenerator {
            current_seed: start_seed,
            current_advance: params.advance_range.min,
            max_advance: params.advance_range.max,
            conditions: params.conditions,
            parents: params.parents,
            rng_ivs,
        }
    }
    
    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.current_advance >= self.max_advance
    }
    
    #[wasm_bindgen(getter)]
    pub fn progress(&self) -> f64 {
        // 進捗計算
        todo!()
    }
    
    /// 次のバッチを生成
    pub fn next_batch(&mut self, batch_size: u32) -> Vec<EggIndividual> {
        let mut results = Vec::with_capacity(batch_size as usize);
        
        for _ in 0..batch_size {
            if self.is_done() { break; }
            
            let egg = self.generate_one();
            results.push(egg);
            
            // LCG を進める
            self.current_seed = lcg_next(self.current_seed);
            self.current_advance += 1;
        }
        
        results
    }
    
    fn generate_one(&self) -> EggIndividual {
        // PID 決定 (再抽選考慮)
        // 性格決定 (かわらずのいし考慮)
        // 性別決定
        // 特性決定
        // 遺伝スロット決定
        // 個体値決定
        todo!()
    }
}
```

### 4.2 単発生成関数

特定の消費数のみ必要な場合。

```rust
#[wasm_bindgen]
pub fn generate_egg_at(
    lcg_seed: u64,
    game_mode: GameMode,
    advance: u64,
    conditions: EggConditions,
    parents: ParentsIVs,
) -> EggIndividual {
    let params = EggGenerationParams {
        lcg_seed,
        game_mode,
        user_offset: 0,
        advance_range: AdvanceRange { min: advance, max: advance + 1 },
        conditions,
        parents,
    };
    let mut gen = EggGenerator::new(params);
    gen.next_batch(1).pop().unwrap()
}
```

## 5. 生成アルゴリズム

### 5.1 乱数個体値の生成

```rust
fn generate_rng_ivs(mt_seed: u32) -> [u8; 6] {
    let mut mt = Mt19937::new(mt_seed);
    
    // 7回空消費 (ゲーム仕様)
    for _ in 0..7 {
        mt.next_u32();
    }
    
    // 6ステータス分
    let mut ivs = [0u8; 6];
    for iv in &mut ivs {
        *iv = (mt.next_u32() >> 27) as u8;  // 上位5bit
    }
    ivs
}
```

### 5.2 遺伝スロット決定

```rust
struct InheritSlot {
    stat: usize,      // 0-5: HP, Atk, Def, SpA, SpD, Spe
    parent: ParentRole,
}

fn determine_inheritance(seed: &mut u64, uses_ditto: bool) -> [InheritSlot; 3] {
    let mut inherited = [false; 6];
    let mut slots = Vec::with_capacity(3);
    
    for _ in 0..3 {
        // ステータス選択 (重複なし)
        let stat = loop {
            let val = lcg_next_value(seed) % 6;
            if !inherited[val as usize] {
                inherited[val as usize] = true;
                break val as usize;
            }
        };
        
        // 親選択
        let parent = if uses_ditto {
            // メタモン使用時は固定ロジック
            if lcg_next_value(seed) % 2 == 0 { ParentRole::Male } else { ParentRole::Female }
        } else {
            if lcg_next_value(seed) % 2 == 0 { ParentRole::Male } else { ParentRole::Female }
        };
        
        slots.push(InheritSlot { stat, parent });
    }
    
    slots.try_into().unwrap()
}
```

### 5.3 個体値決定

```rust
fn resolve_ivs(
    rng_ivs: [u8; 6],
    parents: &ParentsIVs,
    inheritance: &[InheritSlot; 3],
) -> [u8; 6] {
    let mut ivs = rng_ivs;
    
    for slot in inheritance {
        let parent_ivs = match slot.parent {
            ParentRole::Male => &parents.male,
            ParentRole::Female => &parents.female,
        };
        ivs[slot.stat] = parent_ivs[slot.stat];
    }
    
    ivs
}
```

## 6. Game Offset 計算

```rust
fn calculate_game_offset(lcg_seed: u64, game_mode: GameMode) -> u64 {
    // ゲームモードに応じた初期オフセット
    match game_mode {
        GameMode::BwNew => calc_bw_new_offset(lcg_seed),
        GameMode::BwContinue => calc_bw_continue_offset(lcg_seed),
        GameMode::Bw2New => calc_bw2_new_offset(lcg_seed),
        GameMode::Bw2Continue => calc_bw2_continue_offset(lcg_seed),
    }
}
```

具体的な計算式はゲーム解析結果に基づく (実装時に詳細化)。

## 7. フィルタリング

個体フィルタは **呼び出し側** で適用する設計。このモジュールは純粋に生成のみを行う。

```typescript
// 使用例: TypeScript 側でフィルタリング
const generator = new EggGenerator(params);
const filter: IndividualFilter = { /* ... */ };

while (!generator.is_done) {
    const batch = generator.next_batch(100);
    const matched = batch.filter(egg => matchesFilter(egg, filter));
    if (matched.length > 0) {
        // 条件に一致する個体を発見
    }
}
```

高速化が必要な場合は WASM 側にフィルタを渡すオプションを追加可能。

## 8. 関連ドキュメント

- [types.md](../common/types.md) - GameMode, Nature, Gender 等の共通型
- [base.md](../datetime-search/base.md) - 起動時刻 → LCG Seed 計算
- [egg.md](../datetime-search/egg.md) - 孵化起動時刻検索 (本モジュールを利用)
