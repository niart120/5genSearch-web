# TID-SID 生成ロジック整理 仕様書

## 1. 概要

### 1.1 目的

`wasm-pkg/src/core/offset.rs` の BW 3 パターン + BW2 5 パターン（計 8 関数）を、BW / BW2 のフローベース関数に再構成する。あわせて `calculate_game_offset` と `calculate_trainer_info` で重複している前半処理を共通化する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| PT | Probability Table 処理。6 段階テーブル (`PT_TABLES`) に基づき可変回数の乱数を消費する |
| Rand | `consume_random` による固定回数の乱数消費 |
| Extra | BW2 Continue 専用の重複値回避ループ処理 |
| パターン | ゲームバージョン + 起動条件の組み合わせで決まる乱数消費列 |

### 1.3 背景・問題

- 8 つのパターン関数 (`bw_new_game_with_save`, `bw2_continue_no_memory_link` 等) が個別定義されており、各関数の構造は同一（ステップの列を順次実行し消費数を積算）
- `calculate_game_offset` は各パターンの全ステップを実行する。`calculate_trainer_info` は TID/SID 決定の直前までを実行する。この「直前まで」のロジックが `advance_to_tid_sid_point_bw/bw2` として再実装されており、8 関数との二重管理になっている
- パターン数が有限（8）かつ今後の追加可能性が低いため過度な抽象化は不要だが、前半処理の重複は保守上のリスクがある
- BW と BW2 はゲーム内の起動フローが異なるため、コード上でもフローを分離することで可読性が向上する

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| 重複削除 | `advance_to_tid_sid_point_*` と各パターン関数の前半処理を統一 |
| 保守性 | BW / BW2 それぞれのフローが独立し修正箇所が明確になる |
| 可読性 | 条件分岐がゲームの起動フローと対応し、パターン列挙よりも意図が読みやすい |

### 1.5 着手条件

- なし（内部リファクタリング、外部インターフェース変更なし）

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/core/offset.rs` | 変更 | パターン関数を BW/BW2 フローベース関数に統合、advance 関数を廃止 |

## 3. 設計方針

### 3.1 BW / BW2 でフロー関数を分離

8 パターンを以下の 4 関数に集約する:

| 関数 | 用途 |
|------|------|
| `bw_game_offset` | BW のオフセット全体計算 (Continue / NewGame を内部で分岐) |
| `bw_trainer_info` | BW の TID/SID 算出 |
| `bw2_game_offset` | BW2 のオフセット全体計算 (Continue / NewGame を内部で分岐) |
| `bw2_trainer_info` | BW2 の TID/SID 算出 |

### 3.2 NewGame 前半処理の共通化

`calculate_game_offset` と `calculate_trainer_info` は、TID/SID 決定直前まで同一の乱数消費を行う。この前半部分を共通関数として抽出する:

| 関数 | 処理 |
|------|------|
| `bw_new_game_before_tid_sid` | BW NewGame の TID/SID 直前まで LCG を進める |
| `bw2_new_game_before_tid_sid` | BW2 NewGame の TID/SID 直前まで LCG を進める |
| `trainer_info_from_lcg` | LCG の次の乱数値から TID/SID を算出する共通ヘルパー |

### 3.3 BW2 の条件分岐構造

BW2 の全パターンは以下の構造で表現できる:

1. **共通プレフィックス**: `Rand(1) → PT(1)`
2. **初期 Rand**: `MemoryLink` と `Save` の組み合わせで消費回数が変わる
3. **Continue / NewGame 分岐**:
   - Continue: `PT(4) → Extra`
   - NewGame: `PT(1) → [NoSave: Rand(4) → PT(1)] → Rand(4) → TidSid`

初期 Rand 消費回数テーブル:

| `MemoryLink` | `Save` | Rand |
|---|---|---|
| `Disabled` | `WithSave` | 3 |
| `Enabled` / `Disabled+NoSave` | * | 2 |

### 3.4 テストの考え方

- 既存テスト (`tests` モジュール) の期待値は一切変更しない
- `calculate_game_offset` と `calculate_trainer_info` の全テストケースが通ることをリファクタリングの正当性検証とする

## 4. 実装仕様

### 4.1 削除対象

以下の関数・型を削除する:

- `Step` enum
- 8 パターン定数 (`BW_NEW_GAME_WITH_SAVE`, ..., `BW2_CONTINUE_NO_MEMORY_LINK`)
- `execute_steps`
- `execute_until_tid_sid`
- `select_pattern`
- `advance_to_tid_sid_point_bw` / `advance_to_tid_sid_point_bw2` (存在する場合)
- 旧パターン関数 8 本 (存在する場合)

### 4.2 追加する関数

```rust
/// BW NewGame の TID/SID 決定直前まで LCG を進める
fn bw_new_game_before_tid_sid(lcg: &mut Lcg64, save: SavePresence) -> u32;

/// BW のゲームオフセットを計算
fn bw_game_offset(lcg: &mut Lcg64, config: GameStartConfig) -> u32;

/// BW の TrainerInfo を計算
fn bw_trainer_info(lcg: &mut Lcg64, save: SavePresence) -> TrainerInfo;

/// BW2 共通プレフィックス直後の Rand 消費回数を決定
fn bw2_initial_rand_count(memory_link: MemoryLinkState, save: SavePresence) -> u32;

/// BW2 NewGame の TID/SID 決定直前まで LCG を進める
fn bw2_new_game_before_tid_sid(lcg: &mut Lcg64, config: GameStartConfig) -> u32;

/// BW2 のゲームオフセットを計算
fn bw2_game_offset(lcg: &mut Lcg64, config: GameStartConfig) -> u32;

/// BW2 の TrainerInfo を計算
fn bw2_trainer_info(lcg: &mut Lcg64, config: GameStartConfig) -> TrainerInfo;

/// LCG の次の乱数値から TID/SID を算出
fn trainer_info_from_lcg(lcg: &mut Lcg64) -> TrainerInfo;
```

### 4.3 変更後の `calculate_game_offset`

```rust
pub fn calculate_game_offset(
    seed: LcgSeed,
    version: RomVersion,
    config: GameStartConfig,
) -> Result<u32, String> {
    config.validate(version)?;
    let mut lcg = Lcg64::new(seed);
    if version.is_bw2() {
        Ok(bw2_game_offset(&mut lcg, config))
    } else {
        Ok(bw_game_offset(&mut lcg, config))
    }
}
```

### 4.4 変更後の `calculate_trainer_info`

```rust
pub fn calculate_trainer_info(
    seed: LcgSeed,
    version: RomVersion,
    config: GameStartConfig,
) -> Result<TrainerInfo, String> {
    if config.start_mode == StartMode::Continue {
        return Err("TrainerInfo search requires NewGame mode".into());
    }
    config.validate(version)?;
    let mut lcg = Lcg64::new(seed);
    if version.is_bw2() {
        Ok(bw2_trainer_info(&mut lcg, config))
    } else {
        Ok(bw_trainer_info(&mut lcg, config.save))
    }
}
```

## 5. テスト方針

| テスト種別 | 対象 | 検証内容 |
|------------|------|----------|
| 既存テスト | `calculate_game_offset` 全 8 パターン | リファクタ前後でオフセット値が一致 |
| 既存テスト | `calculate_trainer_info` 全テストケース | リファクタ前後で TID/SID が一致 |
| 既存テスト | バリデーションエラー | 同一のエラー条件で `Err` を返す |

## 6. 実装チェックリスト

- [x] BW フロー関数を実装 (`bw_game_offset`, `bw_new_game_before_tid_sid`, `bw_trainer_info`)
- [x] BW2 フロー関数を実装 (`bw2_game_offset`, `bw2_initial_rand_count`, `bw2_new_game_before_tid_sid`, `bw2_trainer_info`)
- [x] 共通ヘルパーを実装 (`trainer_info_from_lcg`)
- [x] `calculate_game_offset` を BW/BW2 ディスパッチに書き換え
- [x] `calculate_trainer_info` を BW/BW2 ディスパッチに書き換え
- [x] 旧パターン関数・`Step` enum・`execute_*` 関数・`select_pattern` を削除
- [x] `cargo test -p wasm-pkg` で全テスト通過を確認
- [x] `cargo clippy -p wasm-pkg --all-targets -- -D warnings` で警告なし
