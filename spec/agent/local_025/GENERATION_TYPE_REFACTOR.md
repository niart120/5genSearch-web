# Generation 型リファクタリング 仕様書

## 1. 概要

### 1.1 目的

生成結果データ (`GeneratedPokemonData`, `GeneratedEggData`) の型安全性を向上させ、共通フィールドを構造体に抽出する。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| NewType Pattern | プリミティブ型をラップする単一フィールド構造体でドメイン意味を付与するパターン |
| PID | Personality ID。ポケモンの性格値。性別・特性スロット・色違い判定に使用 |
| AbilitySlot | 特性スロット。通常特性1/通常特性2/夢特性の3種 |
| CorePokemonData | Pokemon/Egg 両方に存在する共通個体属性群 |

### 1.3 背景・問題

| 問題 | 詳細 |
|------|------|
| PID が u32 のまま | 型レベルでの PID と他の u32 値の区別が不可能 |
| ability_slot が u8 のまま | 0/1/2 以外の値が型レベルで許容される |
| 共通フィールドの重複 | `GeneratedPokemonData` と `GeneratedEggData` に同一フィールドが散在 |
| フィルター引数の冗長性 | `ResultFilter::matches_core` が個別引数を6つ受け取っている |
| 命名の一貫性 | `ResultFilter` が `CorePokemonData` と対応関係にあることが名前から読み取れない |

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 型安全性向上 | コンパイル時に不正な値の混入を防止 |
| コード重複削減 | 共通構造体により一貫した扱いが可能 |
| API 明確化 | enum により取り得る値が明示される |
| 導出ロジックの集約 | PID から性別・特性を導出するロジックが `Pid` 型に集約 |

### 1.5 着手条件

- local_024 までの実装が完了していること
- 既存テストが全て通過すること

### 1.6 前提

- フロントエンド未実装のため、後方互換性は不要
- 破壊的変更を許容する

## 2. 対象ファイル

### 2.1 新規・変更ファイル一覧

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/pokemon.rs` | 変更 | `Pid` NewType、`AbilitySlot` enum 追加 |
| `wasm-pkg/src/types/generation.rs` | 変更 | `CorePokemonData` 共通構造体追加、既存型のフィールド変更 |
| `wasm-pkg/src/types/filter.rs` | 変更 | `ResultFilter` → `CoreDataFilter` リネーム、引数型を `CorePokemonData` に変更 |
| `wasm-pkg/src/types/mod.rs` | 変更 | re-export 名変更 |
| `wasm-pkg/src/lib.rs` | 変更 | re-export 名変更 |
| `wasm-pkg/src/generation/flows/types.rs` | 変更 | `RawPokemonData`/`RawEggData` のフィールド型変更 |
| `wasm-pkg/src/generation/algorithm/pid.rs` | 変更 | 戻り値型を `Pid` に変更 |
| `wasm-pkg/src/generation/flows/pokemon/*.rs` | 変更 | `Pid`/`AbilitySlot` 使用箇所の更新 |
| `wasm-pkg/src/generation/flows/egg.rs` | 変更 | 同上 |

### 2.2 影響範囲詳細

#### PID 関連 (影響箇所: 約 30 箇所)

| ファイル | 行 | 現状 | 変更内容 |
|----------|-----|------|----------|
| `types/generation.rs` | 233 | `pub pid: u32` | `core.pid: Pid` (構造体変更) |
| `types/generation.rs` | 264 | `pub pid: u32` | `core.pid: Pid` (構造体変更) |
| `generation/flows/types.rs` | 28 | `pub pid: u32` | `pub pid: Pid` |
| `generation/flows/types.rs` | 46 | `pid: 0` | `pid: Pid::ZERO` |
| `generation/flows/types.rs` | 63 | `pub pid: u32` | `pub pid: Pid` |
| `generation/algorithm/pid.rs` | 28 | `fn generate_base_pid(r: u32) -> u32` | `-> Pid` |
| `generation/algorithm/pid.rs` | 47 | `fn generate_wild_pid(...) -> u32` | `-> Pid` |
| `generation/algorithm/pid.rs` | 52 | `fn generate_event_pid(r: u32) -> u32` | `-> Pid` |
| `generation/algorithm/pid.rs` | 60 | `fn generate_egg_pid(r: u32) -> u32` | `-> Pid` |
| `generation/algorithm/pid.rs` | 76 | 戻り値 `(u32, ShinyType)` | `(Pid, ShinyType)` |
| `generation/algorithm/pid.rs` | 99 | 戻り値 `(u32, ShinyType)` | `(Pid, ShinyType)` |
| `types/pokemon.rs` | 113 | `fn determine_gender(self, pid: u32)` | `fn determine_gender_from_pid(self, pid: Pid)` |
| `generation/flows/pokemon/normal.rs` | 75-76 | `gender = ratio.determine_gender(pid)` + `ability_slot = ((pid >> 16) & 1) as u8` | `gender = pid.gender(ratio)` + `ability_slot = pid.ability_slot()` |
| `generation/flows/pokemon/fishing.rs` | 93-94 | 同上 | 同上 |
| `generation/flows/pokemon/surfing.rs` | 87-88 | 同上 | 同上 |
| `generation/flows/pokemon/phenomena.rs` | 102-103 | 同上 | 同上 |
| `generation/flows/pokemon/static_encounter.rs` | 89-90, 164-165 | 同上 | 同上 |
| `generation/flows/egg.rs` | 45, 99 | 同上 | 同上 |

#### AbilitySlot 関連 (影響箇所: 約 20 箇所)

| ファイル | 行 | 現状 | 変更内容 |
|----------|-----|------|----------|
| `types/generation.rs` | 239 | `pub ability_slot: u8` | `core.ability_slot: AbilitySlot` |
| `types/generation.rs` | 268 | `pub ability_slot: u8` | `core.ability_slot: AbilitySlot` |
| `types/filter.rs` | 149 | `pub ability_slot: Option<u8>` | `pub ability_slot: Option<AbilitySlot>` |
| `generation/flows/types.rs` | 33 | `pub ability_slot: u8` | `pub ability_slot: AbilitySlot` |
| `generation/flows/types.rs` | 51 | `ability_slot: 0` | `ability_slot: AbilitySlot::First` |
| `generation/flows/types.rs` | 66 | `pub ability_slot: u8` | `pub ability_slot: AbilitySlot` |
| 各 flows/*.rs | 多数 | `ability_slot = ((pid >> 16) & 1) as u8` | `ability_slot = pid.ability_slot()` (夢特性時は上書き) |

#### ResultFilter → CoreDataFilter リネーム

| ファイル | 変更内容 |
|----------|----------|
| `types/filter.rs` | `ResultFilter` → `CoreDataFilter` |
| `types/filter.rs` | `PokemonFilter.base: ResultFilter` → `CoreDataFilter` |
| `types/filter.rs` | `EggFilter.base: ResultFilter` → `CoreDataFilter` |
| `types/mod.rs` | re-export 名変更 |
| `lib.rs` | re-export 名変更 |

## 3. 設計方針

### 3.1 Pid NewType

```rust
/// ポケモンの性格値 (Personality ID)
///
/// TypeScript では `export type Pid = number` として公開される。
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[serde(transparent)]
#[repr(transparent)]
pub struct Pid(pub u32);

impl Pid {
    pub const ZERO: Self = Self(0);

    /// 生の値を取得
    #[inline]
    pub const fn raw(self) -> u32 {
        self.0
    }

    /// 通常特性スロット判定 (PID bit16)
    ///
    /// 夢特性は別途乱数ロールで決定されるため、ここでは First/Second のみ返す。
    /// 夢特性が確定した場合は呼び出し側で `AbilitySlot::Hidden` に上書きする。
    #[inline]
    pub const fn ability_slot(self) -> AbilitySlot {
        if (self.0 >> 16) & 1 == 0 {
            AbilitySlot::First
        } else {
            AbilitySlot::Second
        }
    }

    /// 性別を判定
    ///
    /// PID 下位 8bit (性別値) と `GenderRatio` の閾値を比較して性別を決定。
    #[inline]
    pub fn gender(self, ratio: GenderRatio) -> Gender {
        ratio.determine_gender_from_pid(self)
    }

    /// 色違い判定
    ///
    /// PID と TrainerInfo (TID/SID) から色違いタイプを判定。
    /// - xor == 0: Square (ひし形)
    /// - 1 <= xor < 8: Star (星型)
    /// - 8 <= xor: None (通常)
    #[inline]
    pub fn shiny_type(self, trainer: TrainerInfo) -> ShinyType {
        let pid_high = (self.0 >> 16) as u16;
        let pid_low = (self.0 & 0xFFFF) as u16;
        let xor = pid_high ^ pid_low ^ trainer.tid ^ trainer.sid;

        if xor == 0 {
            ShinyType::Square
        } else if xor < 8 {
            ShinyType::Star
        } else {
            ShinyType::None
        }
    }
}
```

### 3.2 AbilitySlot enum

```rust
/// 特性スロット
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum AbilitySlot {
    /// 通常特性1
    #[default]
    First,
    /// 通常特性2
    Second,
    /// 夢特性 (Hidden Ability)
    Hidden,
}
```

### 3.3 GenderRatio の変更

```rust
impl GenderRatio {
    /// PID から性別を判定 (Pid 型を受け取るバージョン)
    ///
    /// 性別値 (PID 下位 8bit) が閾値未満なら Female、以上なら Male。
    #[inline]
    pub fn determine_gender_from_pid(self, pid: Pid) -> Gender {
        let threshold = self.to_threshold();
        match threshold {
            0 => Gender::Male,
            254 => Gender::Female,
            255 => Gender::Genderless,
            t => {
                let gender_value = (pid.raw() & 0xFF) as u8;
                if gender_value < t {
                    Gender::Female
                } else {
                    Gender::Male
                }
            }
        }
    }

    // 既存の determine_gender(u32) は削除または deprecated
}
```

### 3.4 CorePokemonData 共通構造体

```rust
/// ポケモン/卵の共通個体情報
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct CorePokemonData {
    pub pid: Pid,
    pub nature: Nature,
    pub ability_slot: AbilitySlot,
    pub gender: Gender,
    pub shiny_type: ShinyType,
    pub ivs: Ivs,
}
```

### 3.5 GeneratedPokemonData / GeneratedEggData への適用

後方互換性不要のため、ネスト構造を採用する。

```rust
pub struct GeneratedPokemonData {
    // 列挙コンテキスト
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    pub source: SeedOrigin,
    // 共通個体情報 (ネスト)
    pub core: CorePokemonData,
    // ポケモン固有
    pub species_id: u16,
    pub level: u8,
    pub sync_applied: bool,
    pub held_item_slot: HeldItemSlot,
    // エンカウント付加情報
    pub moving_encounter: Option<MovingEncounterInfo>,
    pub special_encounter: Option<SpecialEncounterInfo>,
    pub encounter_result: EncounterResult,
}

pub struct GeneratedEggData {
    // 列挙コンテキスト
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    pub source: SeedOrigin,
    // 共通個体情報 (ネスト)
    pub core: CorePokemonData,
    // 卵固有
    pub inheritance: [InheritanceSlot; 3],
    pub margin_frames: Option<u32>,
}
```

### 3.6 CoreDataFilter (旧 ResultFilter)

```rust
/// 生成結果の共通フィルター条件
///
/// `CorePokemonData` に対応するフィルター。
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct CoreDataFilter {
    /// IV フィルター
    pub iv: Option<IvFilter>,
    /// 性格 (複数指定可、いずれかに一致)
    pub natures: Option<Vec<Nature>>,
    /// 性別
    pub gender: Option<Gender>,
    /// 特性スロット
    pub ability_slot: Option<AbilitySlot>,
    /// 色違い
    pub shiny: Option<ShinyFilter>,
}

impl CoreDataFilter {
    /// 条件なしフィルター (全件通過)
    pub const fn any() -> Self {
        Self {
            iv: None,
            natures: None,
            gender: None,
            ability_slot: None,
            shiny: None,
        }
    }

    /// `CorePokemonData` が条件に一致するか判定
    pub fn matches(&self, core: &CorePokemonData) -> bool {
        // IV フィルター
        if let Some(ref iv_filter) = self.iv
            && !iv_filter.matches(&core.ivs)
        {
            return false;
        }
        // 性格
        if let Some(ref required_natures) = self.natures
            && !required_natures.is_empty()
            && !required_natures.contains(&core.nature)
        {
            return false;
        }
        // 性別
        if let Some(required_gender) = self.gender
            && core.gender != required_gender
        {
            return false;
        }
        // 特性スロット
        if let Some(required_slot) = self.ability_slot
            && core.ability_slot != required_slot
        {
            return false;
        }
        // 色違い
        if let Some(ref shiny_filter) = self.shiny
            && !shiny_filter.matches(core.shiny_type)
        {
            return false;
        }
        true
    }

    /// `GeneratedPokemonData` が条件に一致するか判定
    pub fn matches_pokemon(&self, data: &GeneratedPokemonData) -> bool {
        self.matches(&data.core)
    }

    /// `GeneratedEggData` が条件に一致するか判定
    pub fn matches_egg(&self, data: &GeneratedEggData) -> bool {
        self.matches(&data.core)
    }
}
```

### 3.7 PokemonFilter / EggFilter の更新

```rust
pub struct PokemonFilter {
    /// 共通条件
    pub base: CoreDataFilter,  // 旧 ResultFilter
    /// 種族 ID (複数指定可)
    pub species_ids: Option<Vec<u16>>,
    /// レベル範囲
    pub level_range: Option<(u8, u8)>,
}

pub struct EggFilter {
    /// 共通条件
    pub base: CoreDataFilter,  // 旧 ResultFilter
    /// 猶予フレーム下限
    pub min_margin_frames: Option<u32>,
}
```
```

## 4. 実装仕様

### 4.1 TypeScript 型定義

| Rust 型 | TypeScript 型 | 備考 |
|---------|---------------|------|
| `Pid` | `number` | `#[serde(transparent)]` + `#[repr(transparent)]` により内部値が直接公開 |
| `AbilitySlot` | `"First" \| "Second" \| "Hidden"` | enum はタグ付きユニオンとして公開 |
| `CorePokemonData` | `{ pid: number; nature: Nature; ability_slot: AbilitySlot; ... }` | ネスト構造として公開 |
| `GeneratedPokemonData` | `{ core: CorePokemonData; species_id: number; ... }` | ネスト構造 |

### 4.2 ネスト構造の採用理由

後方互換性が不要なため、ネスト構造を採用:

1. 型構造が明確 (`data.core.pid` vs `data.pid`)
2. `CorePokemonData` を独立して扱える
3. `#[serde(flatten)]` の複雑性を回避
4. TypeScript 側でも `CorePokemonData` 型を直接利用可能

### 4.3 Pid メソッド設計の方針

| メソッド | 引数 | 戻り値 | 説明 |
|----------|------|--------|------|
| `raw()` | なし | `u32` | 生の値を取得 |
| `ability_slot()` | なし | `AbilitySlot` | First/Second を返す。Hidden は呼び出し側で上書き |
| `gender(ratio)` | `GenderRatio` | `Gender` | 性別比を受け取って性別を導出 |
| `shiny_type(trainer)` | `TrainerInfo` | `ShinyType` | TID/SID を受け取って色違いタイプを導出 |

夢特性判定は PID からは導出不可能 (別途乱数ロールで決定) のため、`ability_slot()` は通常特性のみを返す設計とする。

### 4.4 algorithm/pid.rs の変更

既存の関数は `Pid` メソッドに移行し、旧実装は完全に削除する。ヘルパー関数としても残さない。

| 削除対象 | 移行先 |
|----------|--------|
| `calculate_shiny_type(pid: u32, tid: u16, sid: u16)` | `Pid::shiny_type(TrainerInfo)` |
| `GenderRatio::determine_gender(pid: u32)` | `Pid::gender(GenderRatio)` |

```rust
// 移行前
let shiny = calculate_shiny_type(pid, tid, sid);
let gender = slot_config.gender_ratio.determine_gender(pid);
let ability_slot = ((pid >> 16) & 1) as u8;

// 移行後
let shiny = pid.shiny_type(params.trainer);
let gender = pid.gender(slot_config.gender_ratio);
let ability_slot = pid.ability_slot();
```

PID 生成関数 (`generate_wild_pid`, `generate_egg_pid` 等) 内でリロールループ中に色違い判定を行う箇所も、`Pid::shiny_type` を直接使用する形に統一する。

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | 検証内容 |
|------------|----------|
| `Pid::ability_slot` | bit16 が 0 → First、1 → Second を返すこと |
| `Pid::gender` | GenderRatio と組み合わせて正しい Gender を返すこと |
| `Pid::shiny_type` | TrainerInfo と組み合わせて正しい ShinyType を返すこと (Square/Star/None) |
| `GenderRatio::determine_gender_from_pid` | 既存テストと同等の動作 |

### 5.2 統合テスト

| テスト対象 | 検証内容 |
|------------|----------|
| `CoreDataFilter::matches` | `CorePokemonData` 引数で既存動作と同一結果 |
| 各生成フロー | `GeneratedPokemonData.core` / `GeneratedEggData.core` が正しく構築されること |
| WASM 境界 | TypeScript 側で期待の型構造が公開されること |

### 5.3 回帰テスト

既存の以下のテストが変更なく通過すること:

- `cargo test --package wasm-pkg`
- `pnpm test:run`

## 6. 実装チェックリスト

### 6.1 型定義

- [ ] `Pid` NewType を `types/pokemon.rs` に追加
- [ ] `AbilitySlot` enum を `types/pokemon.rs` に追加
- [ ] `Pid::ability_slot()` メソッド実装
- [ ] `Pid::gender(GenderRatio)` メソッド実装
- [ ] `Pid::shiny_type(TrainerInfo)` メソッド実装
- [ ] `GenderRatio::determine_gender_from_pid(Pid)` を追加 (内部実装用)
- [ ] `CorePokemonData` を `types/generation.rs` に追加
- [ ] `GeneratedPokemonData` を `core` フィールド使用に変更 (ネスト構造)
- [ ] `GeneratedEggData` を `core` フィールド使用に変更 (ネスト構造)

### 6.2 旧実装の削除

- [ ] `GenderRatio::determine_gender(pid: u32)` を削除
- [ ] `algorithm/pid.rs` の `calculate_shiny_type(pid: u32, tid: u16, sid: u16)` を削除
- [ ] `((pid >> 16) & 1) as u8` パターンを全て `pid.ability_slot()` に置換
- [ ] `ratio.determine_gender(pid)` パターンを全て `pid.gender(ratio)` に置換

### 6.3 生成フロー更新

- [ ] `algorithm/pid.rs` の戻り値型を `Pid` に変更
- [ ] 各 flows の ability_slot 計算を `pid.ability_slot()` に変更
- [ ] 各 flows の gender 計算を `pid.gender(ratio)` に変更
- [ ] 各 flows の shiny_type 取得を `pid.shiny_type(trainer)` に変更
- [ ] `RawPokemonData` / `RawEggData` のフィールド型更新

### 6.4 フィルター更新

- [ ] `ResultFilter` → `CoreDataFilter` にリネーム
- [ ] `CoreDataFilter::ability_slot` を `Option<AbilitySlot>` に変更
- [ ] `PokemonFilter` / `EggFilter` の `base` フィールド型を `CoreDataFilter` に変更

### 6.5 re-export 更新

- [ ] `types/mod.rs` の re-export 更新
- [ ] `lib.rs` の re-export 更新

### 6.6 検証

- [ ] ユニットテスト追加・修正
- [ ] `cargo test` 通過確認
- [ ] `cargo clippy` 通過確認
- [ ] `pnpm build:wasm` 通過確認
- [ ] TypeScript 型定義の確認
