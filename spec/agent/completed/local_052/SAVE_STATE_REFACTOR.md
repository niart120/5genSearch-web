# GameStartConfig 型リファクタリング 仕様書

## 1. 概要

### 1.1 目的

`GameStartConfig` の型表現を改善する。

1. `SaveState` enum (`NoSave | WithSave | WithMemoryLink`) を `SavePresence` (`NoSave | WithSave`) + `MemoryLinkState` (`Disabled | Enabled`) の 2 軸 enum に分解する
2. `shiny_charm: bool` を `ShinyCharmState` (`NotObtained | Obtained`) enum に変更する

ドメインの各概念を独立した 2 値 enum で表現し、意味の明示性と型安全性を向上させる。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| SaveState | 現行のセーブ状態を表す 3 値 enum (廃止対象) |
| SavePresence | セーブデータの有無を表す 2 値 enum (`NoSave`, `WithSave`) |
| MemoryLinkState | 思い出リンクの有無を表す 2 値 enum (`Disabled`, `Enabled`)。BW2 のみ有効 |
| ShinyCharmState | ひかるおまもりの所持状態を表す 2 値 enum (`NotObtained`, `Obtained`)。BW2 のみ有効 |
| GameStartConfig | ゲーム開始設定を表す構造体。`start_mode`, `save`, `memory_link`, `shiny_charm` を持つ |
| offset | PRNG の初期消費数。`GameStartConfig` の組み合わせで決定される |

### 1.3 背景・問題

現在の `SaveState` enum は 3 値だが、実態は以下の 2 つの独立した軸:

1. **セーブの有無**: `NoSave` vs `{WithSave, WithMemoryLink}`
2. **MemoryLink の有無**: `WithMemoryLink` vs `{NoSave, WithSave}`

`offset.rs` のパターンマッチでも BW2 Continue のケースで `WithSave | NoSave` として束ねており、2 軸の直交性が表出している。
enum では「`NoSave` かつ `MemoryLink`」が型レベルで排除されるが、同じ制約を `validate()` や UI の `disabled` で重複表現しており、enum の型安全性の恩恵は限定的。

2 値 enum に分解することで、boolean と同等の直交性を確保しつつ、パターンマッチの網羅性検査や意味の明示性で boolean より優位性がある。

`shiny_charm: bool` も同様に、`ShinyCharmState` enum に変更する。BW では常に `NotObtained` となるべき制約を enum の意味で自然に表現できる。

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 可読性 | パターンマッチの分岐が 2 軸の意味に対応し、ロジックの意図が明確になる |
| 拡張性 | 将来のセーブ関連属性の追加が容易 (enum の列挙子追加より boolean フィールド追加の方が影響が限定的) |
| UI 表現 | チェックボックス 2 つで自然に表現可能 |
| 型安全性 | boolean と異なり、enum のバリアント名で意味が自己文書化される。パターンマッチの exhaustiveness 検査も有効 |
| shiny_charm | `bool` の `true`/`false` より `Obtained`/`NotObtained` の方が意味が明確。BW 側が常に未所持であることを制約として素直に表現可能 |

### 1.5 着手条件

- local_051 (UI 軽微修正) の完了は不要 (独立した変更)
- WASM のリビルドが必要 (`pnpm build:wasm`)

## 2. 対象ファイル

### 2.1 Rust 側

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/generation.rs` | 修正 | `SaveState` enum を `SavePresence` + `MemoryLinkState` に分解、`shiny_charm: bool` を `ShinyCharmState` に変更、`GameStartConfig` のフィールド変更、`validate()` の条件更新 |
| `wasm-pkg/src/types/mod.rs` | 修正 | `SaveState` の re-export を `SavePresence` + `MemoryLinkState` + `ShinyCharmState` に置換 |
| `wasm-pkg/src/lib.rs` | 修正 | 同上 |
| `wasm-pkg/src/core/offset.rs` | 修正 | パターンマッチを 2 軸 enum に変更 (3 関数, 約 8 match arm) |
| `wasm-pkg/src/generation/flows/generator/mod.rs` | 修正 | テスト内の `SaveState::*` 構築を置換 (約 5 箇所) |
| `wasm-pkg/src/generation/flows/generator/egg.rs` | 修正 | テスト内の構築 (1 箇所) |
| `wasm-pkg/src/generation/flows/generator/pokemon.rs` | 修正 | テスト内の構築 (1 箇所) |
| `wasm-pkg/src/generation/flows/pokemon/surfing.rs` | 修正 | テスト内の構築 (1 箇所) + `shiny_charm` の reroll 計算変更 |
| `wasm-pkg/src/generation/flows/pokemon/static_encounter.rs` | 修正 | 同上 |
| `wasm-pkg/src/generation/flows/pokemon/phenomena.rs` | 修正 | 同上 |
| `wasm-pkg/src/generation/flows/pokemon/normal.rs` | 修正 | 同上 |
| `wasm-pkg/src/generation/flows/pokemon/fishing.rs` | 修正 | 同上 |
| `wasm-pkg/src/misc/needle_search.rs` | 修正 | テスト内の構築 (1 箇所) |
| `wasm-pkg/src/datetime_search/trainer_info.rs` | 修正 | テスト内の構築 (約 5 箇所) |
| `wasm-pkg/src/datetime_search/egg.rs` | 修正 | テスト内の構築 (約 2 箇所) |

### 2.2 TypeScript 側

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/wasm/wasm_pkg.d.ts` | 自動生成 | `wasm-pack build` により自動更新 |
| `src/wasm/wasm_pkg.js` | 自動生成 | 同上 |
| `src/lib/game-data-names.ts` | 修正 | `SAVE_STATE_*` → `SAVE_PRESENCE_*` / `MEMORY_LINK_*` / `SHINY_CHARM_*` に分離 |
| `src/stores/settings/ds-config.ts` | 修正 | `save_state` → `save` + `memory_link` + `shiny_charm` enum 化 (persist version 変更なし) |
| `src/features/ds-config/components/game-start-config-form.tsx` | 修正 | Select → チェックボックス 2 つに変更 |
| `src/test/unit/stores/ds-config.test.ts` | 修正 | テストの期待値更新 |
| `src/test/components/ds-config/game-start-config-form.test.tsx` | 修正 | UI テスト更新 |

## 3. 設計方針

### 3.1 変換マッピング

| 旧 `SaveState` | `SavePresence` | `MemoryLinkState` | 備考 |
|-----------------|----------------|-------------------|------|
| `NoSave` | `NoSave` | `Disabled` | MemoryLink は WithSave 前提のため必然的に Disabled |
| `WithSave` | `WithSave` | `Disabled` | |
| `WithMemoryLink` | `WithSave` | `Enabled` | BW2 のみ有効 |

不正状態: `SavePresence::NoSave` + `MemoryLinkState::Enabled` → `validate()` でエラーとする。

### 3.2 バリデーション規則

変更後の `validate()` の制約:

| 条件 | エラーメッセージ |
|------|-----------------|
| `memory_link == Enabled && !is_bw2` | `"MemoryLink is only available in BW2"` |
| `memory_link == Enabled && save == NoSave` | `"MemoryLink requires a save file"` (新規追加) |
| `start_mode == Continue && save == NoSave` | `"Continue requires a save file"` |
| `shiny_charm == Obtained && !is_bw2` | `"Shiny charm is only available in BW2"` |

### 3.3 パターンマッチの変換方針

`offset.rs` の 3 要素タプル `(is_bw2, start_mode, save_state)` を 4 要素タプル `(is_bw2, start_mode, save, memory_link)` に拡張する。

#### `calculate_game_offset()` の変換例

```rust
// 変更前
match (version.is_bw2(), config.start_mode, config.save_state) {
    (false, NewGame, WithSave)       => bw_new_game_with_save(&mut lcg),
    (false, NewGame, NoSave)         => bw_new_game_no_save(&mut lcg),
    (false, Continue, _)             => bw_continue(&mut lcg),
    (true, NewGame, WithMemoryLink)  => bw2_new_game_with_memory_link(&mut lcg),
    (true, NewGame, WithSave)        => bw2_new_game_with_save(&mut lcg),
    (true, NewGame, NoSave)          => bw2_new_game_no_save(&mut lcg),
    (true, Continue, WithMemoryLink) => bw2_continue_with_memory_link(&mut lcg),
    (true, Continue, WithSave | NoSave) => bw2_continue_no_memory_link(&mut lcg),
    _ => return Err("Invalid combination".into()),
}

// 変更後
use SavePresence::{NoSave, WithSave};
use MemoryLinkState::{Disabled, Enabled};

match (version.is_bw2(), config.start_mode, config.save, config.memory_link) {
    (false, NewGame,   WithSave, Disabled) => bw_new_game_with_save(&mut lcg),
    (false, NewGame,   NoSave,   Disabled) => bw_new_game_no_save(&mut lcg),
    (false, Continue,  _,        Disabled) => bw_continue(&mut lcg),
    (true,  NewGame,   WithSave, Enabled)  => bw2_new_game_with_memory_link(&mut lcg),
    (true,  NewGame,   WithSave, Disabled) => bw2_new_game_with_save(&mut lcg),
    (true,  NewGame,   NoSave,   Disabled) => bw2_new_game_no_save(&mut lcg),
    (true,  Continue,  _,        Enabled)  => bw2_continue_with_memory_link(&mut lcg),
    (true,  Continue,  _,        Disabled) => bw2_continue_no_memory_link(&mut lcg),
    _ => return Err("Invalid combination".into()),
}
```

#### `advance_to_tid_sid_point_bw()` / `advance_to_tid_sid_point_bw2()` の変換

関数シグネチャを `save_state: SaveState` → `save: SavePresence` + `memory_link: MemoryLinkState` に変更:

```rust
// 変更後
fn advance_to_tid_sid_point_bw(lcg: &mut Lcg64, save: SavePresence) {
    // memory_link は BW では常に Disabled (validate 保証済み) のため引数不要
    match save {
        SavePresence::WithSave => {
            probability_table_multiple(lcg, 2);
            consume_random(lcg, 2);
        }
        SavePresence::NoSave => {
            probability_table_multiple(lcg, 3);
            consume_random(lcg, 2);
        }
    }
}

fn advance_to_tid_sid_point_bw2(
    lcg: &mut Lcg64,
    save: SavePresence,
    memory_link: MemoryLinkState,
) {
    match (save, memory_link) {
        (WithSave, Enabled) => { /* WithMemoryLink の処理 */ }
        (WithSave, Disabled) => { /* WithSave の処理 */ }
        (NoSave, Disabled) => { /* NoSave の処理 */ }
        (NoSave, Enabled) => unreachable!("validated: memory_link requires save"),
    }
}
```

### 3.4 テストコードの構築パターン

```rust
// 変更前
GameStartConfig {
    start_mode: StartMode::Continue,
    save_state: SaveState::WithSave,
    shiny_charm: false,
}

// 変更後
GameStartConfig {
    start_mode: StartMode::Continue,
    save: SavePresence::WithSave,
    memory_link: MemoryLinkState::Disabled,
    shiny_charm: ShinyCharmState::NotObtained,
}
```

### 3.4.1 shiny_charm の reroll 計算変更

5 つのエンカウント生成関数で同一パターンの変更:

```rust
// 変更前
let reroll_count = if config.game_start.shiny_charm { 2 } else { 0 };

// 変更後
let reroll_count = match config.game_start.shiny_charm {
    ShinyCharmState::Obtained => 2,
    ShinyCharmState::NotObtained => 0,
};
```

### 3.5 TypeScript 側の変更方針

#### Store (ds-config.ts)

```typescript
// 変更前
const DEFAULT_GAME_START: GameStartConfig = {
  start_mode: 'Continue',
  save_state: 'WithSave',
  shiny_charm: false,
};

// 変更後
const DEFAULT_GAME_START: GameStartConfig = {
  start_mode: 'Continue',
  save: 'WithSave',
  memory_link: 'Disabled',
  shiny_charm: 'NotObtained',
};
```

BW2 → BW 切替時のフォールバック:

```typescript
// 変更前
save_state: state.gameStart.save_state === 'WithMemoryLink'
  ? ('WithSave' as const)
  : state.gameStart.save_state,
shiny_charm: false,

// 変更後
memory_link: 'Disabled' as const,
shiny_charm: 'NotObtained' as const,
// save はそのまま保持
```

persist の `version` は変更しない。フィールド名変更により旧データは shallow merge でデフォルト値に落ちる。

#### 名前解決 (game-data-names.ts)

`SAVE_STATE_ORDER` / `SAVE_STATE_NAMES` を廃止し、各 enum の名前マップに分離:

```typescript
const SAVE_PRESENCE_ORDER: SavePresence[] = ['NoSave', 'WithSave'];
const SAVE_PRESENCE_NAMES: Record<SavePresence, Record<SupportedLocale, string>> = {
  NoSave:   { ja: 'セーブなし', en: 'No save' },
  WithSave: { ja: 'セーブあり', en: 'With save' },
};

const MEMORY_LINK_STATE_ORDER: MemoryLinkState[] = ['Disabled', 'Enabled'];
const MEMORY_LINK_STATE_NAMES: Record<MemoryLinkState, Record<SupportedLocale, string>> = {
  Disabled: { ja: '思い出リンクなし', en: 'Without Memory Link' },
  Enabled:  { ja: '思い出リンクあり', en: 'With Memory Link' },
};

const SHINY_CHARM_STATE_ORDER: ShinyCharmState[] = ['NotObtained', 'Obtained'];
const SHINY_CHARM_STATE_NAMES: Record<ShinyCharmState, Record<SupportedLocale, string>> = {
  NotObtained: { ja: '未所持', en: 'Not obtained' },
  Obtained:    { ja: '所持',   en: 'Obtained' },
};
```

#### UI (game-start-config-form.tsx)

Select ドロップダウンからチェックボックス 2 つへの変更:

```tsx
{/* セーブの有無 */}
<Checkbox
  checked={gameStart.save === 'WithSave'}
  onCheckedChange={(checked) => setGameStart({
    save: checked ? 'WithSave' : 'NoSave',
    // save を外すとき memory_link も強制 off
    ...(checked ? {} : { memory_link: 'Disabled' as const }),
  })}
  disabled={gameStart.start_mode === 'Continue'}
/>

{/* 思い出リンク (BW2 のみ) */}
<Checkbox
  checked={gameStart.memory_link === 'Enabled'}
  onCheckedChange={(checked) => setGameStart({
    memory_link: checked ? 'Enabled' : 'Disabled',
  })}
  disabled={!isBw2 || gameStart.save === 'NoSave'}
/>

{/* ひかるおまもり (BW2 のみ) */}
<Checkbox
  checked={gameStart.shiny_charm === 'Obtained'}
  onCheckedChange={(checked) => setGameStart({
    shiny_charm: checked ? 'Obtained' : 'NotObtained',
  })}
  disabled={!isBw2}
/>
```

### 3.6 WASM ビルドとTS型の自動更新

`wasm-pack build` により `src/wasm/wasm_pkg.d.ts` が自動再生成される。
`SaveState` 型は消滅し、代わりに `SavePresence`、`MemoryLinkState`、`ShinyCharmState` が生成される。
`GameStartConfig` のフィールドは `save: SavePresence` + `memory_link: MemoryLinkState` + `shiny_charm: ShinyCharmState` になる。

tsify の derive マクロにより 2 値 enum は TypeScript の string literal union に自動マッピングされる。

## 4. 実装仕様

### 4.1 Rust: 型定義の変更

`wasm-pkg/src/types/generation.rs`:

```rust
// SaveState enum を削除し、以下の 2 enum に分解

#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum SavePresence {
    NoSave,
    WithSave,
}

#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum MemoryLinkState {
    Disabled,
    Enabled,
}

#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ShinyCharmState {
    NotObtained,
    Obtained,
}

#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GameStartConfig {
    pub start_mode: StartMode,
    pub save: SavePresence,
    pub memory_link: MemoryLinkState,
    pub shiny_charm: ShinyCharmState,
}

impl GameStartConfig {
    pub fn validate(&self, version: RomVersion) -> Result<(), String> {
        let is_bw2 = matches!(version, RomVersion::Black2 | RomVersion::White2);

        if self.memory_link == MemoryLinkState::Enabled && !is_bw2 {
            return Err("MemoryLink is only available in BW2".to_string());
        }

        if self.memory_link == MemoryLinkState::Enabled
            && self.save == SavePresence::NoSave
        {
            return Err("MemoryLink requires a save file".to_string());
        }

        if self.start_mode == StartMode::Continue
            && self.save == SavePresence::NoSave
        {
            return Err("Continue requires a save file".to_string());
        }

        if self.shiny_charm == ShinyCharmState::Obtained && !is_bw2 {
            return Err("Shiny charm is only available in BW2".to_string());
        }

        Ok(())
    }
}
```

### 4.2 Rust: re-export の更新

`wasm-pkg/src/types/mod.rs` と `wasm-pkg/src/lib.rs` の `SaveState` を `SavePresence, MemoryLinkState, ShinyCharmState` に置換する。

### 4.3 Rust: offset.rs のパターンマッチ

セクション 3.3 の変換例に従い、3 関数のパターンマッチを 2 軸 enum 版に更新する。

### 4.4 Rust: テストコードの一括置換

セクション 3.4 の構築パターンに従い、約 30 箇所を置換する。

- `save_state: SaveState::*` → `save: SavePresence::*, memory_link: MemoryLinkState::*`
- `shiny_charm: false` → `shiny_charm: ShinyCharmState::NotObtained`
- `shiny_charm: true` → `shiny_charm: ShinyCharmState::Obtained`

### 4.5 TypeScript: Store

`src/stores/settings/ds-config.ts` のデフォルト値とフォールバックロジックを更新する。
persist の `version` は変更しない (リリース前のためマイグレーションは不要)。

`setGameStart` は以下の正規化を行う:

- `start_mode == Continue` のとき `save` を `WithSave` に補正
- `save == NoSave` のとき `memory_link` を `Disabled` に補正
- BW (非 BW2) のとき `memory_link` を `Disabled`、`shiny_charm` を `NotObtained` に補正

### 4.6 TypeScript: UI コンポーネント

セクション 3.5 に従い、Select → Checkbox 2 つに変更する。

## 5. テスト方針

### 5.1 Rust ユニットテスト

| テスト | 検証内容 |
|--------|----------|
| `validate` テスト | BW + `MemoryLinkState::Enabled` → エラー |
| `validate` テスト | `NoSave + Enabled` → エラー (新規) |
| `validate` テスト | `Continue + NoSave` → エラー |
| `validate` テスト | BW + `ShinyCharmState::Obtained` → エラー |
| offset テスト | 全パターン (BW: 3, BW2: 5) の既存テストが通過すること |
| generator テスト | 全 5 パターンの既存テストが通過すること |
| generator テスト | `ShinyCharmState::Obtained` 時の reroll 回数が 2 であること |
| datetime_search テスト | 既存テストが通過すること |

### 5.2 TypeScript テスト

| テスト | 検証内容 |
|--------|----------|
| ds-config store テスト | デフォルト値が `save: 'WithSave', memory_link: 'Disabled', shiny_charm: 'NotObtained'` |
| ds-config store テスト | BW2→BW 切替で `memory_link` が `'Disabled'` に、`shiny_charm` が `'NotObtained'` にリセット |
| ds-config store テスト | `Continue` + `NoSave` の入力が `WithSave` に補正される |
| ds-config store テスト | `NoSave` の入力で `memory_link` が `Disabled` に補正される |
| form テスト | `save` チェックボックスの表示・操作 |
| form テスト | `memory_link` チェックボックスの disabled 制御 (BW / save=NoSave 時) |

### 5.3 WASM 統合テスト

| テスト | 検証内容 |
|--------|----------|
| `cargo test` | Rust 側全テスト通過 |
| `pnpm test:wasm` | WASM ビルド + TS 統合テスト通過 |

## 6. 実装チェックリスト

### Rust 側

- [ ] `wasm-pkg/src/types/generation.rs`: `SaveState` enum を `SavePresence` + `MemoryLinkState` に分解
- [ ] `wasm-pkg/src/types/generation.rs`: `ShinyCharmState` enum を新規追加
- [ ] `wasm-pkg/src/types/generation.rs`: `GameStartConfig` のフィールド変更 (`save: SavePresence`, `memory_link: MemoryLinkState`, `shiny_charm: ShinyCharmState`)
- [ ] `wasm-pkg/src/types/generation.rs`: `validate()` の条件更新 (不正状態チェック追加 + shiny_charm enum 化)
- [ ] `wasm-pkg/src/types/mod.rs`: `SaveState` → `SavePresence, MemoryLinkState, ShinyCharmState` に置換
- [ ] `wasm-pkg/src/lib.rs`: 同上
- [ ] `wasm-pkg/src/core/offset.rs`: `calculate_game_offset()` のパターンマッチ変更
- [ ] `wasm-pkg/src/core/offset.rs`: `advance_to_tid_sid_point_bw()` のシグネチャ・実装変更
- [ ] `wasm-pkg/src/core/offset.rs`: `advance_to_tid_sid_point_bw2()` のシグネチャ・実装変更
- [ ] テスト: `offset.rs` 内テスト (約 15 箇所) の構築パターン更新
- [ ] テスト: `generation/flows/` 内テスト (約 10 箇所) の構築パターン更新
- [ ] テスト: `datetime_search/` 内テスト (約 5 箇所) の構築パターン更新
- [ ] テスト: `misc/needle_search.rs` テスト (1 箇所) の構築パターン更新
- [ ] テスト: ベンチマーク (2 ファイル) の構築パターン更新
- [ ] `generation/flows/pokemon/*.rs`: `shiny_charm` の reroll 計算を enum match に変更 (5 ファイル)
- [ ] `cargo test` 全テスト通過確認
- [ ] `cargo clippy --all-targets -- -D warnings` 通過確認

### WASM ビルド

- [ ] `pnpm build:wasm` で WASM 再ビルド
- [ ] `src/wasm/wasm_pkg.d.ts` から `SaveState` 型が消滅し、`SavePresence`、`MemoryLinkState`、`ShinyCharmState` が生成されていることを確認
- [ ] `GameStartConfig` に `save: SavePresence` + `memory_link: MemoryLinkState` + `shiny_charm: ShinyCharmState` が存在することを確認

### TypeScript 側

- [ ] `src/lib/game-data-names.ts`: `SAVE_STATE_*` を `SAVE_PRESENCE_*` / `MEMORY_LINK_STATE_*` / `SHINY_CHARM_STATE_*` に分離
- [ ] `src/stores/settings/ds-config.ts`: デフォルト値・フォールバック更新 (version 変更なし)
- [ ] `src/features/ds-config/components/game-start-config-form.tsx`: Select → Checkbox 変更 + `shiny_charm` Checkbox 追加
- [ ] テスト: Store テスト更新
- [ ] テスト: Form コンポーネントテスト更新
- [ ] `pnpm test:run` 全テスト通過確認
- [ ] `pnpm lint` 通過確認
