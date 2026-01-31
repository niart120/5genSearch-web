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
| 共通個体情報 | Pokemon/Egg 両方に存在する個体属性群 |

### 1.3 背景・問題

| 問題 | 詳細 |
|------|------|
| PID が u32 のまま | 型レベルでの PID と他の u32 値の区別が不可能 |
| ability_slot が u8 のまま | 0/1/2 以外の値が型レベルで許容される |
| 共通フィールドの重複 | `GeneratedPokemonData` と `GeneratedEggData` に同一フィールドが散在 |
| フィルター引数の冗長性 | `ResultFilter::matches_core` が個別引数を6つ受け取っている |

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 型安全性向上 | コンパイル時に不正な値の混入を防止 |
| コード重複削減 | 共通構造体により一貫した扱いが可能 |
| API 明確化 | enum により取り得る値が明示される |

### 1.5 着手条件

- local_024 までの実装が完了していること
- 既存テストが全て通過すること

## 2. 対象ファイル

### 2.1 新規・変更ファイル一覧

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/pokemon.rs` | 変更 | `Pid` NewType、`AbilitySlot` enum 追加 |
| `wasm-pkg/src/types/generation.rs` | 変更 | `CorePokemonData` 共通構造体追加、既存型のフィールド変更 |
| `wasm-pkg/src/types/filter.rs` | 変更 | `ResultFilter` 引数型を `CorePokemonData` に変更 |
| `wasm-pkg/src/generation/flows/types.rs` | 変更 | `RawPokemonData`/`RawEggData` のフィールド型変更 |
| `wasm-pkg/src/generation/algorithm/pid.rs` | 変更 | 戻り値型を `Pid` に変更 |
| `wasm-pkg/src/generation/flows/pokemon/*.rs` | 変更 | `Pid`/`AbilitySlot` 使用箇所の更新 |
| `wasm-pkg/src/generation/flows/egg.rs` | 変更 | 同上 |

### 2.2 影響範囲詳細

#### PID 関連 (影響箇所: 約 30 箇所)

| ファイル | 行 | 現状 | 変更内容 |
|----------|-----|------|----------|
| `types/generation.rs` | 233 | `pub pid: u32` | `pub pid: Pid` |
| `types/generation.rs` | 264 | `pub pid: u32` | `pub pid: Pid` |
| `generation/flows/types.rs` | 28 | `pub pid: u32` | `pub pid: Pid` |
| `generation/flows/types.rs` | 46 | `pid: 0` | `pid: Pid::ZERO` |
| `generation/flows/types.rs` | 63 | `pub pid: u32` | `pub pid: Pid` |
| `generation/algorithm/pid.rs` | 28 | `fn generate_base_pid(r: u32) -> u32` | `-> Pid` |
| `generation/algorithm/pid.rs` | 47 | `fn generate_wild_pid(...) -> u32` | `-> Pid` |
| `generation/algorithm/pid.rs` | 52 | `fn generate_event_pid(r: u32) -> u32` | `-> Pid` |
| `generation/algorithm/pid.rs` | 60 | `fn generate_egg_pid(r: u32) -> u32` | `-> Pid` |
| `generation/algorithm/pid.rs` | 76 | 戻り値 `(u32, ShinyType)` | `(Pid, ShinyType)` |
| `generation/algorithm/pid.rs` | 99 | 戻り値 `(u32, ShinyType)` | `(Pid, ShinyType)` |
| `types/pokemon.rs` | 113 | `fn determine_gender(self, pid: u32)` | `fn determine_gender(self, pid: Pid)` |
| `generation/flows/pokemon/normal.rs` | 76 | `((pid >> 16) & 1) as u8` | `pid.ability_slot()` |
| `generation/flows/pokemon/fishing.rs` | 94 | 同上 | 同上 |
| `generation/flows/pokemon/surfing.rs` | 88 | 同上 | 同上 |
| `generation/flows/pokemon/phenomena.rs` | 103 | 同上 | 同上 |
| `generation/flows/pokemon/static_encounter.rs` | 90, 165 | 同上 | 同上 |
| `generation/flows/egg.rs` | 99 | 同上 | 同上 |

#### AbilitySlot 関連 (影響箇所: 約 20 箇所)

| ファイル | 行 | 現状 | 変更内容 |
|----------|-----|------|----------|
| `types/generation.rs` | 239 | `pub ability_slot: u8` | `pub ability_slot: AbilitySlot` |
| `types/generation.rs` | 268 | `pub ability_slot: u8` | `pub ability_slot: AbilitySlot` |
| `types/filter.rs` | 149 | `pub ability_slot: Option<u8>` | `pub ability_slot: Option<AbilitySlot>` |
| `generation/flows/types.rs` | 33 | `pub ability_slot: u8` | `pub ability_slot: AbilitySlot` |
| `generation/flows/types.rs` | 51 | `ability_slot: 0` | `ability_slot: AbilitySlot::First` |
| `generation/flows/types.rs` | 66 | `pub ability_slot: u8` | `pub ability_slot: AbilitySlot` |
| 各 flows/*.rs | 多数 | `ability_slot = ((pid >> 16) & 1) as u8` | `ability_slot = pid.ability_slot()` |

## 3. 設計方針

### 3.1 Pid NewType

```rust
/// ポケモンの性格値 (Personality ID)
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
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
    /// 夢特性判定は別途乱数ロールで決定されるため、ここでは 0/1 のみ返す
    #[inline]
    pub const fn normal_ability_bit(self) -> u8 {
        ((self.0 >> 16) & 1) as u8
    }

    /// 性別値 (PID 下位 8bit)
    #[inline]
    pub const fn gender_value(self) -> u8 {
        (self.0 & 0xFF) as u8
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

impl AbilitySlot {
    /// u8 から変換 (0=First, 1=Second, 2=Hidden)
    pub const fn from_u8(v: u8) -> Self {
        match v {
            0 => Self::First,
            1 => Self::Second,
            _ => Self::Hidden,
        }
    }

    /// PID の bit16 から通常特性スロットを決定
    pub const fn from_pid_bit(pid: Pid) -> Self {
        if pid.normal_ability_bit() == 0 {
            Self::First
        } else {
            Self::Second
        }
    }
}
```

### 3.3 CorePokemonData 共通構造体

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

### 3.4 GeneratedPokemonData / GeneratedEggData への適用

```rust
pub struct GeneratedPokemonData {
    // 列挙コンテキスト
    pub advance: u32,
    pub needle_direction: NeedleDirection,
    pub source: SeedOrigin,
    // 共通個体情報 (フラット展開)
    #[serde(flatten)]
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
    // 共通個体情報 (フラット展開)
    #[serde(flatten)]
    pub core: CorePokemonData,
    // 卵固有
    pub inheritance: [InheritanceSlot; 3],
    pub margin_frames: Option<u32>,
}
```

### 3.5 ResultFilter の更新

```rust
impl ResultFilter {
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

    pub fn matches_pokemon(&self, data: &GeneratedPokemonData) -> bool {
        self.matches(&data.core)
    }

    pub fn matches_egg(&self, data: &GeneratedEggData) -> bool {
        self.matches(&data.core)
    }
}
```

## 4. 実装仕様

### 4.1 TypeScript 互換性

| Rust 型 | TypeScript 型 | 備考 |
|---------|---------------|------|
| `Pid` | `number` | tsify の `#[repr(transparent)]` により内部値が直接公開 |
| `AbilitySlot` | `"First" \| "Second" \| "Hidden"` | enum はタグ付きユニオンとして公開 |
| `CorePokemonData` | `{ pid: number; nature: Nature; ... }` | `#[serde(flatten)]` により親構造体にマージ |

### 4.2 フラット展開の選択理由

`#[serde(flatten)]` を使用して `CorePokemonData` をフラット展開する理由:

1. TypeScript 側の互換性維持 (既存の `GeneratedPokemonData` 型と同一構造)
2. JSON シリアライズ時のネスト回避
3. フロントエンド側の変更最小化

### 4.3 migration 戦略

段階的に実装し、各ステップでテストを通過させる:

1. `Pid` NewType 追加 (pokemon.rs)
2. `AbilitySlot` enum 追加 (pokemon.rs)
3. `CorePokemonData` 構造体追加 (generation.rs)
4. algorithm/pid.rs の戻り値型変更
5. flows 内の使用箇所更新
6. filter.rs の更新
7. 既存テスト修正・追加

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | 検証内容 |
|------------|----------|
| `Pid::normal_ability_bit` | bit16 が 0/1 を正しく返すこと |
| `Pid::gender_value` | 下位 8bit を正しく返すこと |
| `AbilitySlot::from_u8` | 0/1/2 の変換が正しいこと |
| `AbilitySlot::from_pid_bit` | PID bit16 から First/Second を正しく判定すること |
| `GenderRatio::determine_gender(Pid)` | 既存テストが Pid 型で動作すること |

### 5.2 統合テスト

| テスト対象 | 検証内容 |
|------------|----------|
| `ResultFilter::matches` | `CorePokemonData` 引数で既存動作と同一結果 |
| 各生成フロー | `GeneratedPokemonData.core` / `GeneratedEggData.core` が正しく構築されること |
| WASM 境界 | TypeScript 側で既存の型構造が維持されること |

### 5.3 回帰テスト

既存の以下のテストが変更なく通過すること:

- `cargo test --package wasm-pkg`
- `pnpm test:run`

## 6. 実装チェックリスト

- [ ] `Pid` NewType を `types/pokemon.rs` に追加
- [ ] `AbilitySlot` enum を `types/pokemon.rs` に追加
- [ ] `CorePokemonData` を `types/generation.rs` に追加
- [ ] `GeneratedPokemonData` を `core` フィールド使用に変更
- [ ] `GeneratedEggData` を `core` フィールド使用に変更
- [ ] `algorithm/pid.rs` の戻り値型を `Pid` に変更
- [ ] `GenderRatio::determine_gender` の引数を `Pid` に変更
- [ ] 各 flows の ability_slot 計算を `AbilitySlot::from_pid_bit` に変更
- [ ] `RawPokemonData` / `RawEggData` のフィールド型更新
- [ ] `ResultFilter` を `CorePokemonData` 引数に変更
- [ ] `ResultFilter::ability_slot` を `Option<AbilitySlot>` に変更
- [ ] ユニットテスト追加・修正
- [ ] `cargo test` 通過確認
- [ ] `cargo clippy` 通過確認
- [ ] `pnpm test:run` 通過確認
- [ ] TypeScript 型定義の互換性確認
