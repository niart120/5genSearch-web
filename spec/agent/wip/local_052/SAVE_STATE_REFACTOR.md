# SaveState 2 軸 boolean 移行 仕様書

## 1. 概要

### 1.1 目的

`SaveState` enum (`NoSave | WithSave | WithMemoryLink`) を `has_save: bool` + `memory_link: bool` の 2 軸 boolean に分解し、ドメインの直交する 2 つの概念を型で素直に表現する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| SaveState | 現行のセーブ状態を表す 3 値 enum |
| has_save | セーブデータの有無を表す boolean |
| memory_link | 思い出リンクの有無を表す boolean (BW2 のみ有効) |
| GameStartConfig | ゲーム開始設定を表す構造体。`start_mode`, `save_state`(→ `has_save`, `memory_link`), `shiny_charm` を持つ |
| offset | PRNG の初期消費数。`GameStartConfig` の組み合わせで決定される |

### 1.3 背景・問題

現在の `SaveState` enum は 3 値だが、実態は以下の 2 つの独立した軸:

1. **セーブの有無**: `NoSave` vs `{WithSave, WithMemoryLink}`
2. **MemoryLink の有無**: `WithMemoryLink` vs `{NoSave, WithSave}`

`offset.rs` のパターンマッチでも BW2 Continue のケースで `WithSave | NoSave` として束ねており、2 軸の直交性が表出している。
enum では「`NoSave` かつ `MemoryLink`」が型レベルで排除されるが、同じ制約を `validate()` や UI の `disabled` で重複表現しており、enum の型安全性の恩恵は限定的。

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 可読性 | パターンマッチの分岐が 2 軸の意味に対応し、ロジックの意図が明確になる |
| 拡張性 | 将来のセーブ関連属性の追加が容易 (enum の列挙子追加より boolean フィールド追加の方が影響が限定的) |
| UI 表現 | チェックボックス 2 つで自然に表現可能 (Select ドロップダウンからの変更は任意) |

### 1.5 着手条件

- local_051 (UI 軽微修正) の完了は不要 (独立した変更)
- WASM のリビルドが必要 (`pnpm build:wasm`)

## 2. 対象ファイル

### 2.1 Rust 側

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/generation.rs` | 修正 | `SaveState` enum 削除、`GameStartConfig` のフィールド変更、`validate()` の条件更新 |
| `wasm-pkg/src/types/mod.rs` | 修正 | `SaveState` の re-export 削除 |
| `wasm-pkg/src/lib.rs` | 修正 | `SaveState` の re-export 削除 |
| `wasm-pkg/src/core/offset.rs` | 修正 | パターンマッチを 2 軸に変更 (3 関数, 約 8 match arm) |
| `wasm-pkg/src/generation/flows/generator/mod.rs` | 修正 | テスト内の `SaveState::*` 構築を置換 (約 5 箇所) |
| `wasm-pkg/src/generation/flows/generator/egg.rs` | 修正 | テスト内の構築 (1 箇所) |
| `wasm-pkg/src/generation/flows/generator/pokemon.rs` | 修正 | テスト内の構築 (1 箇所) |
| `wasm-pkg/src/generation/flows/pokemon/surfing.rs` | 修正 | テスト内の構築 (1 箇所) |
| `wasm-pkg/src/generation/flows/pokemon/static_encounter.rs` | 修正 | テスト内の構築 (1 箇所) |
| `wasm-pkg/src/generation/flows/pokemon/phenomena.rs` | 修正 | テスト内の構築 (1 箇所) |
| `wasm-pkg/src/generation/flows/pokemon/normal.rs` | 修正 | テスト内の構築 (1 箇所) |
| `wasm-pkg/src/generation/flows/pokemon/fishing.rs` | 修正 | テスト内の構築 (1 箇所) |
| `wasm-pkg/src/misc/needle_search.rs` | 修正 | テスト内の構築 (1 箇所) |
| `wasm-pkg/src/datetime_search/trainer_info.rs` | 修正 | テスト内の構築 (約 5 箇所) |
| `wasm-pkg/src/datetime_search/egg.rs` | 修正 | テスト内の構築 (約 2 箇所) |

### 2.2 TypeScript 側

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/wasm/wasm_pkg.d.ts` | 自動生成 | `wasm-pack build` により自動更新 |
| `src/wasm/wasm_pkg.js` | 自動生成 | 同上 |
| `src/lib/game-data-names.ts` | 修正 | `SAVE_STATE_*` → `HAS_SAVE_*` / `MEMORY_LINK_*` に分離 |
| `src/stores/settings/ds-config.ts` | 修正 | `save_state` → `has_save` + `memory_link` に変更、マイグレーション追加 |
| `src/features/ds-config/components/game-start-config-form.tsx` | 修正 | Select → チェックボックス 2 つに変更 (任意) |
| `src/test/unit/stores/ds-config.test.ts` | 修正 | テストの期待値更新 |
| `src/test/components/ds-config/game-start-config-form.test.tsx` | 修正 | UI テスト更新 |

## 3. 設計方針

### 3.1 変換マッピング

| 旧 `SaveState` | `has_save` | `memory_link` | 備考 |
|-----------------|------------|---------------|------|
| `NoSave` | `false` | `false` | MemoryLink は has_save 前提のため必然的に false |
| `WithSave` | `true` | `false` | |
| `WithMemoryLink` | `true` | `true` | BW2 のみ有効 |

不正状態: `has_save = false, memory_link = true` → `validate()` でエラーとする。

### 3.2 バリデーション規則

変更後の `validate()` の制約:

| 条件 | エラーメッセージ |
|------|------------------|
| `memory_link && !is_bw2` | `"MemoryLink is only available in BW2"` |
| `memory_link && !has_save` | `"MemoryLink requires a save file"` (新規追加) |
| `start_mode == Continue && !has_save` | `"Continue requires a save file"` |
| `shiny_charm && !is_bw2` | (既存、変更なし) |

### 3.3 パターンマッチの変換方針

`offset.rs` の 3 要素タプル `(is_bw2, start_mode, save_state)` を 4 要素タプル `(is_bw2, start_mode, has_save, memory_link)` に拡張する。

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
match (version.is_bw2(), config.start_mode, config.has_save, config.memory_link) {
    (false, NewGame,   true,  false) => bw_new_game_with_save(&mut lcg),
    (false, NewGame,   false, false) => bw_new_game_no_save(&mut lcg),
    (false, Continue,  _,     false) => bw_continue(&mut lcg),
    (true,  NewGame,   true,  true)  => bw2_new_game_with_memory_link(&mut lcg),
    (true,  NewGame,   true,  false) => bw2_new_game_with_save(&mut lcg),
    (true,  NewGame,   false, false) => bw2_new_game_no_save(&mut lcg),
    (true,  Continue,  _,     true)  => bw2_continue_with_memory_link(&mut lcg),
    (true,  Continue,  _,     false) => bw2_continue_no_memory_link(&mut lcg),
    _ => return Err("Invalid combination".into()),
}
```

#### `advance_to_tid_sid_point_bw()` / `advance_to_tid_sid_point_bw2()` の変換

関数シグネチャを `save_state: SaveState` → `has_save: bool, memory_link: bool` に変更:

```rust
// 変更前
fn advance_to_tid_sid_point_bw(lcg: &mut Lcg64, save_state: SaveState) {
    match save_state {
        SaveState::WithSave => { ... }
        SaveState::NoSave => { ... }
        SaveState::WithMemoryLink => { /* BW では不到達 */ }
    }
}

// 変更後
fn advance_to_tid_sid_point_bw(lcg: &mut Lcg64, has_save: bool) {
    // memory_link は BW では常に false (validate 保証済み) のため引数不要
    if has_save {
        probability_table_multiple(lcg, 2);
        consume_random(lcg, 2);
    } else {
        probability_table_multiple(lcg, 3);
        consume_random(lcg, 2);
    }
}

fn advance_to_tid_sid_point_bw2(lcg: &mut Lcg64, has_save: bool, memory_link: bool) {
    match (has_save, memory_link) {
        (true, true) => { /* WithMemoryLink の処理 */ }
        (true, false) => { /* WithSave の処理 */ }
        (false, false) => { /* NoSave の処理 */ }
        (false, true) => unreachable!("validated: memory_link requires has_save"),
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
    has_save: true,
    memory_link: false,
    shiny_charm: false,
}
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
  has_save: true,
  memory_link: false,
  shiny_charm: false,
};
```

BW2 → BW 切替時のフォールバック:

```typescript
// 変更前
save_state: state.gameStart.save_state === 'WithMemoryLink'
  ? ('WithSave' as const)
  : state.gameStart.save_state,

// 変更後
memory_link: false,
// has_save はそのまま保持
```

#### 名前解決 (game-data-names.ts)

`SAVE_STATE_ORDER` / `SAVE_STATE_NAMES` を廃止し、boolean 値のラベルに変更:

```typescript
const HAS_SAVE_NAMES: Record<string, Record<SupportedLocale, string>> = {
  true: { ja: 'セーブあり', en: 'With save' },
  false: { ja: 'セーブなし', en: 'No save' },
};

const MEMORY_LINK_NAMES: Record<string, Record<SupportedLocale, string>> = {
  true: { ja: '思い出リンクあり', en: 'With Memory Link' },
  false: { ja: '思い出リンクなし', en: 'Without Memory Link' },
};
```

#### UI (game-start-config-form.tsx)

Select ドロップダウンからチェックボックス 2 つへの変更:

```tsx
{/* セーブの有無 */}
<Checkbox
  checked={gameStart.has_save}
  onCheckedChange={(checked) => setGameStart({
    has_save: !!checked,
    // has_save を外すとき memory_link も強制 off
    ...(checked ? {} : { memory_link: false }),
  })}
  disabled={gameStart.start_mode === 'Continue'}
/>

{/* 思い出リンク (BW2 のみ) */}
<Checkbox
  checked={gameStart.memory_link}
  onCheckedChange={(checked) => setGameStart({ memory_link: !!checked })}
  disabled={!isBw2 || !gameStart.has_save}
/>
```

### 3.6 WASM ビルドとTS型の自動更新

`wasm-pack build` により `src/wasm/wasm_pkg.d.ts` が自動再生成される。
`SaveState` 型は消滅し、`GameStartConfig` のフィールドが直接 `has_save: boolean` + `memory_link: boolean` になる。

tsify の derive マクロにより boolean フィールドは TypeScript の `boolean` に自動マッピングされる。

## 4. 実装仕様

### 4.1 Rust: 型定義の変更

`wasm-pkg/src/types/generation.rs`:

```rust
// SaveState enum を削除

#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GameStartConfig {
    pub start_mode: StartMode,
    pub has_save: bool,
    pub memory_link: bool,
    pub shiny_charm: bool,
}

impl GameStartConfig {
    pub fn validate(&self, version: RomVersion) -> Result<(), String> {
        let is_bw2 = matches!(version, RomVersion::Black2 | RomVersion::White2);

        if self.memory_link && !is_bw2 {
            return Err("MemoryLink is only available in BW2".to_string());
        }

        if self.memory_link && !self.has_save {
            return Err("MemoryLink requires a save file".to_string());
        }

        if self.start_mode == StartMode::Continue && !self.has_save {
            return Err("Continue requires a save file".to_string());
        }

        if self.shiny_charm && !is_bw2 {
            return Err("Shiny charm is only available in BW2".to_string());
        }

        Ok(())
    }
}
```

### 4.2 Rust: re-export の更新

`wasm-pkg/src/types/mod.rs` と `wasm-pkg/src/lib.rs` から `SaveState` を削除する。

### 4.3 Rust: offset.rs のパターンマッチ

セクション 3.3 の変換例に従い、3 関数のパターンマッチを更新する。

### 4.4 Rust: テストコードの一括置換

セクション 3.4 の構築パターンに従い、約 30 箇所を置換する。
`save_state: SaveState::WithSave` → `has_save: true, memory_link: false` 等。

### 4.5 TypeScript: Store マイグレーション

`src/stores/settings/ds-config.ts` の persist version をインクリメントし、migrate 関数で旧 `save_state` を新フィールドに変換:

```typescript
migrate: (persisted, version) => {
  if (version < NEW_VERSION) {
    const state = persisted as Record<string, unknown>;
    const gameStart = state.gameStart as Record<string, unknown>;
    const oldSaveState = gameStart.save_state as string;
    gameStart.has_save = oldSaveState !== 'NoSave';
    gameStart.memory_link = oldSaveState === 'WithMemoryLink';
    delete gameStart.save_state;
  }
  return persisted;
},
```

### 4.6 TypeScript: UI コンポーネント

セクション 3.5 に従い、Select → Checkbox 2 つに変更する。

## 5. テスト方針

### 5.1 Rust ユニットテスト

| テスト | 検証内容 |
|--------|----------|
| `validate` テスト | BW + `memory_link=true` → エラー |
| `validate` テスト | `has_save=false, memory_link=true` → エラー (新規) |
| `validate` テスト | `Continue + has_save=false` → エラー |
| offset テスト | 全パターン (BW: 3, BW2: 5) の既存テストが通過すること |
| generator テスト | 全 5 パターンの既存テストが通過すること |
| datetime_search テスト | 既存テストが通過すること |

### 5.2 TypeScript テスト

| テスト | 検証内容 |
|--------|----------|
| ds-config store テスト | デフォルト値が `has_save: true, memory_link: false` |
| ds-config store テスト | BW2→BW 切替で `memory_link` が `false` にリセット |
| ds-config store テスト | マイグレーション: `save_state: 'WithMemoryLink'` → `has_save: true, memory_link: true` |
| form テスト | `has_save` チェックボックスの表示・操作 |
| form テスト | `memory_link` チェックボックスの disabled 制御 (BW / has_save=false 時) |

### 5.3 WASM 統合テスト

| テスト | 検証内容 |
|--------|----------|
| `cargo test` | Rust 側全テスト通過 |
| `pnpm test:wasm` | WASM ビルド + TS 統合テスト通過 |

## 6. 実装チェックリスト

### Rust 側

- [ ] `wasm-pkg/src/types/generation.rs`: `SaveState` enum 削除
- [ ] `wasm-pkg/src/types/generation.rs`: `GameStartConfig` のフィールド変更 (`has_save`, `memory_link`)
- [ ] `wasm-pkg/src/types/generation.rs`: `validate()` の条件更新 (不正状態チェック追加)
- [ ] `wasm-pkg/src/types/mod.rs`: `SaveState` の re-export 削除
- [ ] `wasm-pkg/src/lib.rs`: `SaveState` の re-export 削除
- [ ] `wasm-pkg/src/core/offset.rs`: `calculate_game_offset()` のパターンマッチ変更
- [ ] `wasm-pkg/src/core/offset.rs`: `advance_to_tid_sid_point_bw()` のシグネチャ・実装変更
- [ ] `wasm-pkg/src/core/offset.rs`: `advance_to_tid_sid_point_bw2()` のシグネチャ・実装変更
- [ ] テスト: `offset.rs` 内テスト (約 15 箇所) の構築パターン更新
- [ ] テスト: `generation/flows/` 内テスト (約 10 箇所) の構築パターン更新
- [ ] テスト: `datetime_search/` 内テスト (約 5 箇所) の構築パターン更新
- [ ] テスト: `misc/needle_search.rs` テスト (1 箇所) の構築パターン更新
- [ ] `cargo test` 全テスト通過確認
- [ ] `cargo clippy --all-targets -- -D warnings` 通過確認

### WASM ビルド

- [ ] `pnpm build:wasm` で WASM 再ビルド
- [ ] `src/wasm/wasm_pkg.d.ts` から `SaveState` 型が消滅していることを確認
- [ ] `GameStartConfig` に `has_save: boolean` + `memory_link: boolean` が存在することを確認

### TypeScript 側

- [ ] `src/lib/game-data-names.ts`: `SAVE_STATE_*` を `HAS_SAVE_*` / `MEMORY_LINK_*` に分離
- [ ] `src/stores/settings/ds-config.ts`: デフォルト値・フォールバック・マイグレーション更新
- [ ] `src/features/ds-config/components/game-start-config-form.tsx`: Select → Checkbox 変更
- [ ] テスト: Store テスト更新
- [ ] テスト: Form コンポーネントテスト更新
- [ ] `pnpm test:run` 全テスト通過確認
- [ ] `pnpm lint` 通過確認
