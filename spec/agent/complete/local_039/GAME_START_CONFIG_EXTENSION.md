# GameStartConfig 拡張・プロファイル Store 仕様書

## 1. 概要

### 1.1 目的

Rust 側の `GameStartConfig` に `shiny_charm: bool` フィールドを追加し、ゲーム進行状態を一つの型に集約する。併せて TS 側の `useDsConfigStore` を拡張し、`GameStartConfig` を永続化対象に含める。

### 1.2 用語定義

| 用語 | 説明 |
|------|------|
| `GameStartConfig` | ゲーム起動設定。`StartMode` + `SaveState` + `shiny_charm` を保持する |
| `StartMode` | 起動方法。`NewGame` (最初から) / `Continue` (続きから) |
| `SaveState` | セーブ状態。`NoSave` / `WithSave` / `WithMemoryLink` |
| `shiny_charm` | ひかるおまもり所持フラグ。BW2 のみ有効 |
| プロファイル | DS 本体設定 + ROM + ゲーム進行状態をまとめた永続化単位 |

### 1.3 背景・問題

local_038 で構築した状態管理基盤には、ゲーム起動条件 (`GameStartConfig`) とひかるおまもり (`shiny_charm`) が含まれていない。参照実装 (`niart120/pokemon-gen5-initseed`) では、これらを DS 設定と同じプロファイル内に永続化している。

現状の問題:

1. `shiny_charm` が `PokemonGenerationParams` に埋もれており、ユーザ設定としての位置付けが不明確
2. `GameStartConfig` が永続化対象に含まれていない
3. BW1 で `shiny_charm: true` を指定できてしまう (バリデーション不足)

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 型の凝集度 | ゲーム進行状態が `GameStartConfig` に集約され、型の増殖を防止 |
| バリデーション強化 | `validate()` で BW1 + `shiny_charm` の禁止を一元管理 |
| 永続化 | ゲーム起動条件がブラウザリロード後も保持される |
| 参照実装との整合 | プロファイル相当の情報が揃い、Phase 3 の設定画面に対応可能 |

### 1.5 着手条件

- local_038 (状態管理基盤) が完了していること (達成済み)
- WASM ビルド環境 (`wasm-pack`) が利用可能であること

## 2. 対象ファイル

### 2.1 Rust 側

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/generation.rs` | 変更 | `GameStartConfig` に `shiny_charm: bool` 追加、`validate()` 拡張 |
| `wasm-pkg/src/core/offset.rs` | 変更 | テストの `GameStartConfig` リテラル更新 (約 15 箇所) |
| `wasm-pkg/src/generation/flows/generator/mod.rs` | 変更 | テストの `GameStartConfig` リテラル更新 (約 5 箇所) |
| `wasm-pkg/src/generation/flows/generator/pokemon.rs` | 変更 | テストヘルパー `make_game_start()` + リテラル更新 |
| `wasm-pkg/src/generation/flows/generator/egg.rs` | 変更 | テストヘルパー `make_game_start()` + リテラル更新 |
| `wasm-pkg/src/datetime_search/trainer_info.rs` | 変更 | テストリテラル更新 (約 3 箇所) |
| `wasm-pkg/src/datetime_search/egg.rs` | 変更 | テストリテラル更新 (約 2 箇所) |
| `wasm-pkg/src/misc/needle_search.rs` | 変更 | テストリテラル更新 (1 箇所) |

### 2.2 TypeScript 側

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/wasm/wasm_pkg.d.ts` | 自動生成 | `wasm-pack build` で再生成 |
| `src/stores/settings/ds-config.ts` | 変更 | `gameStart: GameStartConfig` フィールド追加 |
| `src/hooks/use-ds-config.ts` | 変更 | `gameStart` のセレクタ追加 |
| `src/test/unit/stores/ds-config.test.ts` | 変更 | `gameStart` 関連テスト追加 |
| `src/test/integration/workers/searcher.test.ts` | 変更 | `GameStartConfig` リテラルに `shiny_charm` 追加 (3 箇所) |

## 3. 設計方針

### 3.1 `shiny_charm` の配置先

`GameStartConfig` に統合する。

| 候補 | 評価 |
|------|------|
| `GameStartConfig` に追加 (採用) | 「ROM の進行状態」に集約。型の増殖を防止。プロファイル永続化と親和性が高い |
| `GameProgressConfig` を新設 (不採用) | ラッパー型が増え、`GameStartConfig` との使い分けが不明確になる |
| `PokemonGenerationParams` に据え置き (不採用) | ユーザ設定としての位置付けが不明確。永続化の粒度が合わない |

### 3.2 `PokemonGenerationParams.shiny_charm` の扱い

`PokemonGenerationParams.shiny_charm` は **削除** する。`shiny_charm` の値は `GameStartConfig` から取得し、生成フロー内で参照する。

変更が必要な生成フロー:
- `normal.rs`, `surfing.rs`, `fishing.rs`, `phenomena.rs`, `static_encounter.rs`

各フローは現在 `params.shiny_charm` を参照しているが、`GameStartConfig` が `GenerationConfig` 経由で渡されるため、`config.game_start.shiny_charm` に変更する。

### 3.3 卵生成における `shiny_charm`

Gen5 の孵化処理では「ひかるおまもり」の効果がない (現行実装はBWのみを対象としており、リロールは `masuda_method` のみ)。`EggGenerationParams` への追加は不要。`GameStartConfig` にフィールドが存在するが、卵生成フローでは参照しない。

### 3.4 バリデーション拡張

```rust
impl GameStartConfig {
    pub fn validate(&self, version: RomVersion) -> Result<(), String> {
        let is_bw2 = matches!(version, RomVersion::Black2 | RomVersion::White2);

        if self.save_state == SaveState::WithMemoryLink && !is_bw2 {
            return Err("MemoryLink is only available in BW2".to_string());
        }
        if self.start_mode == StartMode::Continue && self.save_state == SaveState::NoSave {
            return Err("Continue requires a save file".to_string());
        }
        if self.shiny_charm && !is_bw2 {
            return Err("Shiny Charm is only available in BW2".to_string());
        }

        Ok(())
    }
}
```

### 3.5 TS Store 拡張

`useDsConfigStore` に `gameStart: GameStartConfig` を追加。デフォルト値:

```typescript
const DEFAULT_GAME_START: GameStartConfig = {
  start_mode: 'Continue',
  save_state: 'WithSave',
  shiny_charm: false,
};
```

Actions に `setGameStart` を追加:

```typescript
interface DsConfigActions {
  // ... 既存 ...
  setGameStart: (gameStart: Partial<GameStartConfig>) => void;
}

### 3.6 persist 運用方針

本プロジェクトは公開前のため、当面は migrate を実装しない。破壊的変更が続く間は以下の運用で統一する。

| 状況 | 方針 |
|------|------|
| 追加のみ (後方互換) | persist の `version` は据え置き。`merge` により初期値が補完される前提で対応する |
| 破壊的変更 | `name` を変更してストレージを切り替える。必要に応じて `reset` を案内する |
| 安定化後 | 影響の大きい変更に限り `migrate` を導入する |
```

## 4. 実装仕様

### 4.1 Rust: `GameStartConfig` 変更

```rust
/// 起動設定
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct GameStartConfig {
    /// 起動方法 (最初から / 続きから)
    pub start_mode: StartMode,
    /// セーブ状態
    pub save_state: SaveState,
    /// ひかるおまもり所持 (BW2 のみ有効)
    pub shiny_charm: bool,
}
```

### 4.2 Rust: 生成フロー変更パターン

各ポケモン生成フロー (`normal.rs` 等) の変更:

```rust
// Before:
let reroll_count = if params.shiny_charm { 2 } else { 0 };

// After:
let reroll_count = if config.game_start.shiny_charm { 2 } else { 0 };
```

`params` は `PokemonGenerationParams`、`config` は `GenerationConfig` を指す。

### 4.3 Rust: `PokemonGenerationParams` から `shiny_charm` 削除

```rust
// Before:
pub struct PokemonGenerationParams {
    pub trainer: TrainerInfo,
    pub encounter_type: EncounterType,
    pub encounter_method: EncounterMethod,
    pub lead_ability: LeadAbilityEffect,
    pub shiny_charm: bool,
    pub slots: Vec<EncounterSlotConfig>,
}

// After:
pub struct PokemonGenerationParams {
    pub trainer: TrainerInfo,
    pub encounter_type: EncounterType,
    pub encounter_method: EncounterMethod,
    pub lead_ability: LeadAbilityEffect,
    pub slots: Vec<EncounterSlotConfig>,
}
```

### 4.4 TS: Store 拡張

```typescript
// src/stores/settings/ds-config.ts (変更箇所)

import type {
  DsConfig,
  GameStartConfig,
  Timer0VCountRange,
} from '../../wasm/wasm_pkg.js';

interface DsConfigState {
  config: DsConfig;
  ranges: Timer0VCountRange[];
  gameStart: GameStartConfig;
}

interface DsConfigActions {
  setConfig: (partial: Partial<DsConfig>) => void;
  replaceConfig: (config: DsConfig) => void;
  setRanges: (ranges: Timer0VCountRange[]) => void;
  setGameStart: (partial: Partial<GameStartConfig>) => void;
  reset: () => void;
}

const DEFAULT_GAME_START: GameStartConfig = {
  start_mode: 'Continue',
  save_state: 'WithSave',
  shiny_charm: false,
};

const DEFAULT_STATE: DsConfigState = {
  config: DEFAULT_DS_CONFIG,
  ranges: DEFAULT_RANGES,
  gameStart: DEFAULT_GAME_START,
};
```

### 4.5 TS: カスタムフック拡張

```typescript
// src/hooks/use-ds-config.ts (変更箇所)

export function useDsConfig() {
  // ... 既存 ...
  const gameStart = useDsConfigStore((s) => s.gameStart);
  const setGameStart = useDsConfigStore((s) => s.setGameStart);

  return {
    config, ranges, gameStart,
    setConfig, replaceConfig, setRanges, setGameStart, reset,
  } as const;
}
```

## 5. テスト方針

### 5.1 Rust テスト

| テスト | 検証内容 |
|--------|---------|
| `validate()` — BW1 + `shiny_charm: true` | エラーを返す |
| `validate()` — BW2 + `shiny_charm: true` | OK |
| 既存テスト全通過 | `shiny_charm: false` を追加したリテラルで既存の動作が変わらない |

### 5.2 TS テスト

| テスト | 検証内容 |
|--------|---------|
| `gameStart` 初期値 | デフォルト値が正しい |
| `setGameStart` 部分更新 | `shiny_charm` のみ変更し、他フィールドが保持される |
| `reset` | `gameStart` がデフォルトに戻る |

## 6. 実装チェックリスト

### Rust

- [ ] `wasm-pkg/src/types/generation.rs` — `GameStartConfig` に `shiny_charm: bool` 追加
- [ ] `wasm-pkg/src/types/generation.rs` — `validate()` に BW1 + shiny_charm チェック追加
- [ ] `wasm-pkg/src/types/generation.rs` — `PokemonGenerationParams` から `shiny_charm` 削除
- [ ] 生成フロー 5 ファイル — `params.shiny_charm` → `config.game_start.shiny_charm`
- [ ] `wasm-pkg/src/core/offset.rs` — テストリテラル更新
- [ ] `wasm-pkg/src/generation/flows/generator/*.rs` — テストリテラル更新
- [ ] `wasm-pkg/src/datetime_search/*.rs` — テストリテラル更新
- [ ] `wasm-pkg/src/misc/needle_search.rs` — テストリテラル更新
- [ ] `cargo test -p wasm-pkg` パス
- [ ] `cargo clippy -p wasm-pkg --all-targets -- -D warnings` パス

### WASM ビルド

- [ ] `pnpm build:wasm:dev` — WASM 再ビルド + 型再生成

### TypeScript

- [ ] `src/stores/settings/ds-config.ts` — `gameStart` フィールド・アクション追加
- [ ] `src/hooks/use-ds-config.ts` — `gameStart` / `setGameStart` 追加
- [ ] `src/test/unit/stores/ds-config.test.ts` — `gameStart` テスト追加
- [ ] `src/test/integration/workers/searcher.test.ts` — `GameStartConfig` リテラル更新
- [ ] `pnpm test:run` 全テストパス
- [ ] `pnpm lint` / `pnpm format:check` パス
