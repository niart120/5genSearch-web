# タマゴ個体生成ロジック再設計 仕様書

## 1. 概要

### 1.1 目的

現行の `generate_egg` 実装を参照実装 (pokemon-gen5-initseed) と一致させる。乱数消費順序・PID生成方式の差異を解消し、正確なタマゴ個体生成を実現する。また、NPC消費シミュレーション機能を追加する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| LCG64 | BW/BW2 で使用される 64bit 線形合同法乱数生成器 |
| PID | Personality ID。個体の性格値 |
| TSV | Trainer Shiny Value。`tid ^ sid` |
| PSV | Pokemon Shiny Value。`(pid >> 16) ^ (pid & 0xFFFF)` |
| 夢特性 | Hidden Ability。特定条件下で遺伝可能な第三特性 |
| かわらずのいし | 親の性格を遺伝させるアイテム |
| 国際孵化 | Masuda Method。異なる言語間での孵化による色違い確率上昇。リロール回数は 5 回 |
| ニドランフラグ | ニドラン♂/♀、バルビート/イルミーゼで有効な性別決定ロジック |
| Unknown IV | 親の個体値が不明な場合に使用する番兵値 (32) |
| NPC消費 | 育て屋前でタマゴ受け取り待機中に発生する乱数消費。フレーム経過に応じた消費量が変動 |
| 猶予フレーム | NPC消費においてフレーム閾値を超過した余剰フレーム数。この値が大きいほど「安定した」受け取りが可能 |

### 1.3 背景・問題

現行実装と参照実装の間に以下の差異が存在する。

| 項目 | 現行実装 | 参照実装 | 影響 |
|------|----------|----------|------|
| 処理順序 | 性格→遺伝→夢特性→性別→PID | 性格→夢特性→メタモン消費→遺伝→ニドラン→PID→性別→特性 | 乱数消費位置のずれ |
| 夢特性ロール位置 | 遺伝スロット決定後 | 性格決定直後 | 乱数消費位置のずれ |
| メタモン追加消費 | なし | `uses_ditto` 時に 1 消費 | 乱数消費位置のずれ |
| PID 生成方式 | 2乱数合成 `(r1 >> 16) \| (r2 & 0xFFFF0000)` | 1乱数 `roll_fraction(0xffffffff)` | PID 値の相違 |
| ニドランフラグ | パラメータのみ (未使用) | 実装あり | 性別決定の相違 |

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 互換性 | 参照実装と同一の個体生成結果 |
| 正確性 | 実機挙動との一致 |
| 保守性 | 参照実装との差異解消による検証容易化 |

### 1.5 着手条件

- 参照実装 (pokemon-gen5-initseed) の `egg_iv.rs` を正とする
- BW/BW2 差異対応は本仕様のスコープ外
- パワー系アイテムサポートはスコープ外

---

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/generation/flows/egg.rs` | 修正 | 生成順序の修正 |
| `wasm-pkg/src/generation/algorithm/pid.rs` | 修正 | `generate_egg_pid` を 1 乱数方式に変更 |
| `wasm-pkg/src/generation/algorithm/iv.rs` | 修正 | `InheritanceSlot` に `new` メソッド追加 |
| `wasm-pkg/src/generation/algorithm/npc.rs` | 新規 | タマゴ用NPC消費シミュレーション |
| `wasm-pkg/src/types/generation.rs` | 修正 | `GeneratedEggData` の遺伝情報を配列化、`margin_frames` 追加、`EggGenerationParams` に `allow_hidden_ability` / `consider_npc` 追加 |
| `wasm-pkg/src/types/pokemon.rs` | 修正 | `InheritanceSlot` を tsify 対応で追加 |
| `wasm-pkg/src/generation/flows/types.rs` | 修正 | `RawEggData` 定義の調整 |
| `wasm-pkg/src/generation/flows/generator/egg.rs` | 修正 | NPC消費シミュレーション追加 |

---

## 3. 設計方針

### 3.1 生成フロー (参照実装準拠)

```
1. 性格ロール (25分率)
   └─ かわらずのいし判定 (所持時のみ追加 1 消費)

2. 夢特性ロール (1 消費、値を保持)

3. メタモン追加消費 (uses_ditto 時のみ 1 消費)

4. 遺伝スロット決定 (3箇所)
   └─ 各スロット: ステータス決定 (重複時リトライ) + 親決定

5. ニドランロール (nidoran_flag 時のみ 1 消費)

6. PID 生成 + リロール (国際孵化時は 5 回リロール)
   └─ 色違い判定成功 or 最終試行まで

7. 性別判定
   └─ ニドランロール結果 or PID ベース

8. 特性スロット決定
   └─ 夢特性条件成立時は Hidden、それ以外は PID bit16
```

### 3.2 PID 生成方式

参照実装に準拠し、1 乱数方式を採用する。既存の `generate_egg_pid` / `generate_egg_pid_with_reroll` を修正。

```rust
// 現行 (2乱数方式) → 修正後 (1乱数方式)

// Before:
// pub fn generate_egg_pid(r1: u32, r2: u32) -> u32 {
//     ((r1 & 0xFFFF_0000) >> 16) | (r2 & 0xFFFF_0000)
// }

// After:
pub fn generate_egg_pid(r: u32) -> u32 {
    roll_fraction(r, 0xFFFF_FFFF)
}
```

### 3.3 NPC消費シミュレーション

NPC消費は Generator 側で実装し、ロジック本体は `algorithm/npc.rs` に配置する。理由:

1. NPC消費は「個体受け取り待機中」の前処理であり、個体生成とは別概念
2. Generator は advance を管理しており、NPC消費による追加 advance を反映しやすい
3. `generate_egg` は純粋な個体生成に専念できる
4. 参照実装でも `EggSeedEnumerator` (Generator相当) で処理している

```
[Generator]
    │
    ├─ (consider_npc == true の場合)
    │   └─ resolve_egg_npc_advance(seed, frame_threshold)
    │       └─ 乱数消費 + 猶予フレーム算出
    │
    └─ generate_egg(lcg, params)
        └─ 純粋な個体生成
```

戻り値として `margin_frames` (猶予フレーム) を返す。これは閾値超過後の余剰フレーム数であり、値が大きいほど安定した受け取りが可能。

### 3.4 tsify ネスト対応

`GeneratedEggData` の遺伝情報を `[InheritanceSlot; 3]` 配列として保持する。tsify は固定長配列・ネスト構造に対応しているため、フラットなフィールド展開は不要。

---

## 4. 実装仕様

### 4.1 型定義の変更

#### 4.1.1 `InheritanceSlot` の公開化

```rust
// wasm-pkg/src/types/pokemon.rs (新規追加)

/// 遺伝スロット
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct InheritanceSlot {
    /// 遺伝先ステータス (0=HP, 1=Atk, 2=Def, 3=SpA, 4=SpD, 5=Spe)
    pub stat: u8,
    /// 遺伝元親 (0=Male, 1=Female)
    pub parent: u8,
}
```

#### 4.1.2 `GeneratedEggData` の修正

```rust
// wasm-pkg/src/types/generation.rs

/// 猶予フレーム NewType
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, Default, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct MarginFrames(pub u32);

/// 完全な卵データ
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GeneratedEggData {
    // 列挙コンテキスト
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    pub source: SeedOrigin,
    // 基本情報
    pub pid: u32,
    // 個体情報
    pub nature: Nature,
    pub gender: Gender,
    pub ability_slot: u8,
    pub shiny_type: ShinyType,
    // 遺伝情報 (配列化)
    pub inheritance: [InheritanceSlot; 3],
    // IV (遺伝適用後)
    pub ivs: Ivs,
    // NPC消費による猶予フレーム (consider_npc = false 時は None)
    pub margin_frames: Option<MarginFrames>,
}
```

#### 4.1.3 `EggGenerationParams` の修正

```rust
// wasm-pkg/src/types/generation.rs

#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct EggGenerationParams {
    pub trainer: TrainerInfo,
    pub everstone: EverstonePlan,
    /// 夢特性遺伝を許可するか (♀親が夢特性所持の前提条件)
    pub allow_hidden_ability: bool,
    /// メス親が夢特性か
    pub female_has_hidden: bool,
    pub uses_ditto: bool,
    pub gender_ratio: GenderRatio,
    pub nidoran_flag: bool,
    pub masuda_method: bool,
    pub parent_male: Ivs,
    pub parent_female: Ivs,
    /// NPC消費を考慮するか
    pub consider_npc: bool,
}
```

### 4.2 生成ロジックの修正

#### 4.2.1 `generate_egg` 関数

```rust
// wasm-pkg/src/generation/flows/egg.rs

/// 卵の個体生成 (参照実装準拠)
pub fn generate_egg(lcg: &mut Lcg64, params: &EggGenerationParams) -> RawEggData {
    let tid = params.trainer.tid;
    let sid = params.trainer.sid;

    // 1. 性格決定
    let nature = determine_egg_nature(lcg, params.everstone);

    // 2. 夢特性ロール (値を保持)
    let ha_roll = lcg.next().unwrap_or(0);

    // 3. メタモン追加消費
    if params.uses_ditto {
        let _ = lcg.next();
    }

    // 4. 遺伝スロット決定
    let inheritance = determine_inheritance(lcg);

    // 5. ニドランロール
    let nidoran_roll = if params.nidoran_flag {
        Some(roll_fraction(lcg.next().unwrap_or(0), 2) as u8)
    } else {
        None
    };

    // 6. PID 生成 (リロール付き、国際孵化時は 5 回)
    let reroll_count = if params.masuda_method { 5 } else { 0 };
    let (pid, shiny_type) = generate_egg_pid_with_reroll(
        lcg, tid, sid, reroll_count
    );

    // 7. 性別判定
    let gender = match nidoran_roll {
        Some(0) => Gender::Female,
        Some(_) => Gender::Male,
        None => determine_gender_from_pid(pid, params.gender_ratio),
    };

    // 8. 特性スロット決定
    let ability_slot = determine_ability_slot(
        pid,
        ha_roll,
        params.allow_hidden_ability,
        params.uses_ditto,
        params.female_has_hidden,
    );

    RawEggData {
        pid,
        nature,
        gender,
        ability_slot,
        shiny_type,
        inheritance,
    }
}
```

#### 4.2.2 PID 生成 (1乱数方式)

```rust
// wasm-pkg/src/generation/algorithm/pid.rs

/// n分率計算
#[inline]
pub fn roll_fraction(r: u32, n: u32) -> u32 {
    ((u64::from(r) * u64::from(n)) >> 32) as u32
}

/// 孵化 PID 生成 (1乱数方式、参照実装準拠)
///
/// 既存の 2乱数方式を置き換える。
#[inline]
pub fn generate_egg_pid(r: u32) -> u32 {
    roll_fraction(r, 0xFFFF_FFFF)
}

/// 孵化 PID 生成 (リロール付き、1乱数方式)
///
/// 既存関数を修正。国際孵化時は `reroll_count = 5`。
pub fn generate_egg_pid_with_reroll(
    lcg: &mut Lcg64,
    tid: u16,
    sid: u16,
    reroll_count: u8,
) -> (u32, ShinyType) {
    for _ in 0..reroll_count {
        let pid = generate_egg_pid(lcg.next().unwrap_or(0));
        let shiny = calculate_shiny_type(pid, tid, sid);
        if shiny != ShinyType::None {
            return (pid, shiny);
        }
    }

    // 最後の試行
    let pid = generate_egg_pid(lcg.next().unwrap_or(0));
    let shiny = calculate_shiny_type(pid, tid, sid);
    (pid, shiny)
}
```

#### 4.2.3 夢特性判定

```rust
// wasm-pkg/src/generation/flows/egg.rs

/// 特性スロット決定
fn determine_ability_slot(
    pid: u32,
    ha_roll: u32,
    allow_hidden_ability: bool,
    uses_ditto: bool,
    female_has_hidden: bool,
) -> u8 {
    // 夢特性条件判定
    let ha_candidate = allow_hidden_ability
        && !uses_ditto
        && female_has_hidden
        && (((ha_roll as u64) * 5) >> 32) >= 2;  // 60%

    if ha_candidate {
        2  // Hidden
    } else {
        ((pid >> 16) & 1) as u8  // 0 or 1
    }
}
```

#### 4.2.4 性別判定 (PID ベース)

```rust
// wasm-pkg/src/generation/flows/egg.rs

/// PID から性別を判定
fn determine_gender_from_pid(pid: u32, gender_ratio: GenderRatio) -> Gender {
    match gender_ratio {
        GenderRatio::Genderless => Gender::Genderless,
        GenderRatio::MaleOnly => Gender::Male,
        GenderRatio::FemaleOnly => Gender::Female,
        GenderRatio::Threshold(threshold) => {
            let value = (pid & 0xFF) as u8;
            if value < threshold {
                Gender::Female
            } else {
                Gender::Male
            }
        }
    }
}
```

### 4.3 NPC消費シミュレーション

NPC消費ロジックは `algorithm/npc.rs` に分離し、Generator 側で個体生成前に適用する。

#### 4.3.1 型定義

```rust
// wasm-pkg/src/generation/algorithm/npc.rs

use crate::core::lcg::Lcg64;
use crate::types::generation::MarginFrames;

/// タマゴNPC消費定数 (参照実装準拠)
const FOUR_FRACTION_FRAMES: [u32; 4] = [32, 64, 96, 128];
const LEFT_DIRECTION_FRAMES: u32 = 20;
const RIGHT_DIRECTION_FRAMES: u32 = 16;
const DIRECTION_MISMATCH_FRAMES: u32 = 20;
const INITIAL_NPC_ADVANCE_COST: u32 = 3;
const FINAL_NPC_ADVANCE_COST: u32 = 2;

/// フレーム閾値 NewType
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FrameThreshold(pub u8);

impl Default for FrameThreshold {
    fn default() -> Self {
        Self(96)
    }
}

/// タマゴNPC消費結果
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct EggNpcAdvanceResult {
    /// 消費後の Seed
    pub seed: u64,
    /// 消費した乱数回数
    pub consumed: u32,
    /// 猶予フレーム (閾値超過後の余剰フレーム数)
    pub margin_frames: MarginFrames,
}
```

#### 4.3.2 `resolve_egg_npc_advance` 関数

```rust
// wasm-pkg/src/generation/algorithm/npc.rs

/// タマゴ受け取り時のNPC消費シミュレーション
///
/// 育て屋前で待機中に発生するNPC乱数消費をシミュレートし、
/// 閾値超過後の猶予フレームを算出する。
///
/// # Arguments
/// * `seed` - 現在の LCG Seed
/// * `frame_threshold` - 判定対象フレーム閾値
///
/// # Returns
/// * `EggNpcAdvanceResult` - 消費後のSeed、消費回数、猶予フレーム
pub fn resolve_egg_npc_advance(seed: u64, frame_threshold: FrameThreshold) -> EggNpcAdvanceResult {
    let mut lcg = Lcg64::from_raw(seed);
    let mut consumed = 0u32;

    // 初期消費 (3回)
    for _ in 0..INITIAL_NPC_ADVANCE_COST {
        lcg.next();
    }
    consumed += INITIAL_NPC_ADVANCE_COST;

    let threshold = u32::from(frame_threshold.0);
    let mut elapsed = 0u32;
    let mut first_direction: Option<u32> = None;

    // ステップ1: 4分率 (待機時間)
    let roll1 = roll_fraction(lcg.next().unwrap_or(0), 4) as usize;
    consumed += 1;
    elapsed += FOUR_FRACTION_FRAMES[roll1];

    if elapsed <= threshold {
        // ステップ2: 2分率 (方向決定)
        let direction = roll_fraction(lcg.next().unwrap_or(0), 2);
        consumed += 1;
        first_direction = Some(direction);
        elapsed += if direction == 0 { LEFT_DIRECTION_FRAMES } else { RIGHT_DIRECTION_FRAMES };
    }

    if elapsed <= threshold {
        // ステップ3: 4分率 (待機時間)
        let roll3 = roll_fraction(lcg.next().unwrap_or(0), 4) as usize;
        consumed += 1;
        elapsed += FOUR_FRACTION_FRAMES[roll3];
    }

    if elapsed <= threshold {
        // ステップ4: 2分率 (方向決定、前回との差で追加フレーム)
        let direction2 = roll_fraction(lcg.next().unwrap_or(0), 2);
        consumed += 1;
        if let Some(first) = first_direction {
            if first != direction2 {
                elapsed += DIRECTION_MISMATCH_FRAMES;
            }
        }
    }

    if elapsed <= threshold {
        // ステップ5: 4分率 (待機時間)
        let roll5 = roll_fraction(lcg.next().unwrap_or(0), 4) as usize;
        consumed += 1;
        elapsed += FOUR_FRACTION_FRAMES[roll5];
    }

    // 最終消費 (2回)
    for _ in 0..FINAL_NPC_ADVANCE_COST {
        lcg.next();
    }
    consumed += FINAL_NPC_ADVANCE_COST;

    // 猶予フレーム算出 (閾値超過分)
    let margin = elapsed.saturating_sub(threshold);

    EggNpcAdvanceResult {
        seed: lcg.current_raw(),
        consumed,
        margin_frames: MarginFrames(margin),
    }
}

#[inline]
fn roll_fraction(r: u32, n: u32) -> u32 {
    ((u64::from(r) * u64::from(n)) >> 32) as u32
}
```

#### 4.3.3 Generator での適用

```rust
// wasm-pkg/src/generation/flows/generator/egg.rs

use crate::generation::algorithm::npc::{resolve_egg_npc_advance, FrameThreshold};
use crate::types::generation::MarginFrames;

impl EggGenerator {
    pub fn next(&mut self) -> Option<GeneratedEggData> {
        // ...

        // NPC消費を考慮する場合
        let margin_frames = if self.params.consider_npc {
            let result = resolve_egg_npc_advance(
                self.lcg.current_raw(),
                FrameThreshold::default(), // 96
            );
            // LCG を消費後の状態に更新
            self.lcg = Lcg64::from_raw(result.seed);
            Some(result.margin_frames)
        } else {
            None
        };

        // 個体生成
        let raw = generate_egg(&mut self.lcg, &self.params);

        // GeneratedEggData に margin_frames をセット
        GeneratedEggData {
            // ... other fields ...
            margin_frames,
        }
    }
}
```

### 4.4 Unknown IV サポート

既存の `IV_VALUE_UNKNOWN = 32` を活用。親 IV に 32 が含まれる場合、遺伝適用後も 32 を保持する。

```rust
// wasm-pkg/src/generation/algorithm/iv.rs

/// 遺伝適用 (Unknown 対応)
pub fn apply_inheritance(
    rng_ivs: &Ivs,
    parent_male: &Ivs,
    parent_female: &Ivs,
    slots: &[InheritanceSlot; 3],
) -> Ivs {
    let mut result = *rng_ivs;

    for slot in slots {
        let parent_iv = match slot.parent {
            ParentRole::Male => parent_male.get(slot.stat),
            ParentRole::Female => parent_female.get(slot.stat),
        };
        // Unknown (32) はそのまま伝播
        result.set(slot.stat, parent_iv);
    }

    result
}
```

---

## 5. テスト方針

### 5.1 ユニットテスト

| テストケース | 検証内容 |
|--------------|----------|
| `test_generate_egg_order` | 乱数消費順序が参照実装と一致すること |
| `test_everstone_inheritance` | かわらずのいし判定の乱数消費が正しいこと |
| `test_ditto_consumption` | メタモン使用時の追加消費が発生すること |
| `test_nidoran_gender` | ニドランフラグ有効時の性別決定が正しいこと |
| `test_pid_single_rand` | 1乱数方式でPIDが生成されること |
| `test_hidden_ability_60percent` | 夢特性判定が 60% で成立すること |
| `test_unknown_iv_propagation` | Unknown IV が遺伝時に保持されること |
| `test_egg_npc_advance_consumption` | NPC消費による乱数消費が正しいこと |
| `test_egg_npc_margin_frames` | NPC消費後の猶予フレーム算出が正しいこと |
| `test_egg_npc_immediate_threshold` | 最小消費 (3+1+2=6) でも正しく動作すること |

### 5.2 統合テスト

| テストケース | 検証内容 |
|--------------|----------|
| `test_egg_generation_batch` | 連続生成時の乱数状態が正しく進行すること |
| `test_masuda_reroll` | 国際孵化のリロール回数が 5 回であること |
| `test_generator_with_npc` | Generator で NPC消費が正しく適用されること |

### 5.3 参照実装からの移植テスト

参照実装 (pokemon-gen5-initseed) の以下のテストを移植する。

| 参照テスト | 移植先 | 検証内容 |
|------------|--------|----------|
| `resolve_npc_advance_matches_reference` | `npc.rs` | 複数シードでの NPC 消費結果が一致 |
| `resolve_npc_advance_handles_immediate_threshold` | `npc.rs` | 閾値 32、最小消費 (6回) での動作 |
| `egg_seed_enumerator_reports_npc_stability` | `generator/egg.rs` | Generator での NPC 結果反映 |

移植時の注意点:
- 参照実装の `is_stable` は `margin_frames >= slack` で判定していた
- 本実装では `margin_frames` を直接返すため、テスト側で閾値比較を行う

---

## 6. 実装チェックリスト

- [ ] `InheritanceSlot` を `types/pokemon.rs` に移動し tsify 対応
- [ ] `MarginFrames` NewType を `types/generation.rs` に追加
- [ ] `GeneratedEggData.inheritance` を `[InheritanceSlot; 3]` に変更
- [ ] `GeneratedEggData.margin_frames` を追加
- [ ] `EggGenerationParams.allow_hidden_ability` を追加
- [ ] `EggGenerationParams.consider_npc` を追加
- [ ] `roll_fraction` 関数を追加
- [ ] `generate_egg_pid` を 1乱数方式に修正
- [ ] `generate_egg_pid_with_reroll` を 1乱数方式に修正
- [ ] `generate_egg` の処理順序を参照実装に合わせて修正
- [ ] `determine_ability_slot` を実装
- [ ] `determine_gender_from_pid` を実装
- [ ] メタモン追加消費を実装
- [ ] ニドランフラグ処理を実装
- [ ] `algorithm/npc.rs` を新規作成
- [ ] `resolve_egg_npc_advance` を実装
- [ ] `FrameThreshold` NewType を実装
- [ ] Generator に NPC消費処理を追加
- [ ] 参照実装のテストを移植
- [ ] ユニットテストを追加
- [ ] 既存テストの修正
- [ ] `cargo test` 全件パス
- [ ] `cargo clippy` 警告なし
