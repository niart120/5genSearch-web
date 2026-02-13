# TID-SID 生成ロジック整理 仕様書

## 1. 概要

### 1.1 目的

`wasm-pkg/src/core/offset.rs` の BW 3 パターン + BW2 5 パターン（計 8 関数）を、データ駆動の共通ディスパッチ構造にリファクタリングする。あわせて `calculate_game_offset` と `calculate_trainer_info` で重複している前半処理を共通化する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| PT | Probability Table 処理。6 段階テーブル (`PT_TABLES`) に基づき可変回数の乱数を消費する |
| Rand | `consume_random` による固定回数の乱数消費 |
| Extra | BW2 Continue 専用の重複値回避ループ処理 |
| ステップ | 乱数消費の 1 単位。`Rand(n)` / `Pt(n)` / `Extra` のいずれか |
| パターン | ゲームバージョン + 起動条件の組み合わせで決まる乱数消費列 |

### 1.3 背景・問題

- 8 つのパターン関数 (`bw_new_game_with_save`, `bw2_continue_no_memory_link` 等) が個別定義されており、各関数の構造は同一（ステップの列を順次実行し消費数を積算）
- `calculate_game_offset` は各パターンの全ステップを実行する。`calculate_trainer_info` は TID/SID 決定の直前までを実行する。この「直前まで」のロジックが `advance_to_tid_sid_point_bw/bw2` として再実装されており、8 関数との二重管理になっている
- パターン数が有限（8）かつ今後の追加可能性が低いため過度な抽象化は不要だが、前半処理の重複は保守上のリスクがある

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| 重複削除 | `advance_to_tid_sid_point_*` と各パターン関数の前半処理を統一 |
| 保守性 | パターンの修正が 1 箇所に集約される |
| 可読性 | 各パターンの消費列がデータとして宣言的に記述される |

### 1.5 着手条件

- なし（内部リファクタリング、外部インターフェース変更なし）

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/core/offset.rs` | 変更 | パターン関数をデータ駆動に統一、advance 関数を廃止 |

## 3. 設計方針

### 3.1 ステップ列のデータ化

各パターンの乱数消費列を enum `Step` の配列として宣言する。

```rust
enum Step {
    /// 固定回数の乱数消費
    Rand(u32),
    /// Probability Table 処理を指定回数実行
    Pt(u32),
    /// BW2 Continue 専用の Extra 処理
    Extra,
    /// TID/SID 決定 (1 回の乱数消費)
    TidSid,
}
```

### 3.2 パターン定義

8 パターンを `&[Step]` スライスとして定義する。

```rust
const BW_NEW_GAME_WITH_SAVE: &[Step] = &[
    Step::Pt(2),        // PT×2
    Step::Rand(2),      // チラーミィ PID + ID
    Step::TidSid,       // TID/SID 決定
    Step::Pt(4),        // PT×4
];

const BW_NEW_GAME_NO_SAVE: &[Step] = &[
    Step::Pt(3),        // PT×3
    Step::Rand(2),      // チラーミィ PID + ID
    Step::TidSid,       // TID/SID 決定
    Step::Rand(1),      // Rand×1
    Step::Pt(4),        // PT×4
];

const BW_CONTINUE: &[Step] = &[
    Step::Rand(1),      // Rand×1
    Step::Pt(5),        // PT×5
];

const BW2_NEW_GAME_WITH_MEMORY_LINK: &[Step] = &[
    Step::Rand(1),      // Rand×1
    Step::Pt(1),        // PT×1
    Step::Rand(2),      // Rand×2
    Step::Pt(1),        // PT×1
    Step::Rand(2),      // Rand×2
    Step::Rand(2),      // チラチーノ PID + ID
    Step::TidSid,       // TID/SID 決定
];

// ... 残り 4 パターンも同様
```

### 3.3 共通実行関数

```rust
/// ステップ列を全実行し、合計消費数を返す
fn execute_steps(lcg: &mut Lcg64, steps: &[Step]) -> u32 {
    let mut advances = 0;
    for step in steps {
        advances += match step {
            Step::Rand(n) => consume_random(lcg, *n),
            Step::Pt(n)   => probability_table_multiple(lcg, *n),
            Step::Extra   => extra_process(lcg),
            Step::TidSid  => consume_random(lcg, 1),
        };
    }
    advances
}

/// TidSid ステップの直前まで実行し、その後の乱数値から TID/SID を算出する
fn execute_until_tid_sid(lcg: &mut Lcg64, steps: &[Step]) -> Option<TrainerInfo> {
    for step in steps {
        if matches!(step, Step::TidSid) {
            let rand_value = lcg.next().unwrap_or(0);
            let combined = ((u64::from(rand_value) * 0xFFFF_FFFF) >> 32) as u32;
            return Some(TrainerInfo {
                tid: (combined & 0xFFFF) as u16,
                sid: ((combined >> 16) & 0xFFFF) as u16,
            });
        }
        match step {
            Step::Rand(n) => { consume_random(lcg, *n); }
            Step::Pt(n)   => { probability_table_multiple(lcg, *n); }
            Step::Extra   => { extra_process(lcg); }
            Step::TidSid  => unreachable!(),
        }
    }
    None // Continue パターンには TidSid がない
}
```

### 3.4 ディスパッチの統一

`calculate_game_offset` と `calculate_trainer_info` のパターン選択ロジックを共通のヘルパーに抽出する。

```rust
fn select_pattern(
    version: RomVersion,
    config: &GameStartConfig,
) -> Result<&'static [Step], String> {
    match (version.is_bw2(), config.start_mode, config.save, config.memory_link) {
        (false, StartMode::NewGame, SavePresence::WithSave, MemoryLinkState::Disabled) =>
            Ok(BW_NEW_GAME_WITH_SAVE),
        // ... 他 7 パターン
        _ => Err("Invalid combination".into()),
    }
}
```

### 3.5 テストの考え方

- 既存テスト (`tests` モジュール) の期待値は一切変更しない
- `calculate_game_offset` と `calculate_trainer_info` の全テストケースが通ることをリファクタリングの正当性検証とする
- ステップ列の定義が正しいことは既存テストでカバーされるため、新規テストの追加は最小限とする

## 4. 実装仕様

### 4.1 削除対象

以下の関数を `Step` 配列 + `execute_steps` / `execute_until_tid_sid` に置き換えて削除する:

- `bw_new_game_with_save`
- `bw_new_game_no_save`
- `bw_continue`
- `bw2_new_game_with_memory_link`
- `bw2_new_game_with_save`
- `bw2_new_game_no_save`
- `bw2_continue_with_memory_link`
- `bw2_continue_no_memory_link`
- `advance_to_tid_sid_point_bw`
- `advance_to_tid_sid_point_bw2`

### 4.2 変更後の `calculate_game_offset`

```rust
pub fn calculate_game_offset(
    seed: LcgSeed,
    version: RomVersion,
    config: GameStartConfig,
) -> Result<u32, String> {
    config.validate(version)?;
    let pattern = select_pattern(version, &config)?;
    let mut lcg = Lcg64::new(seed);
    Ok(execute_steps(&mut lcg, pattern))
}
```

### 4.3 変更後の `calculate_trainer_info`

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
    let pattern = select_pattern(version, &config)?;
    let mut lcg = Lcg64::new(seed);
    execute_until_tid_sid(&mut lcg, pattern)
        .ok_or_else(|| "No TidSid step in pattern".into())
}
```

## 5. テスト方針

| テスト種別 | 対象 | 検証内容 |
|------------|------|----------|
| 既存テスト | `calculate_game_offset` 全 8 パターン | リファクタ前後でオフセット値が一致 |
| 既存テスト | `calculate_trainer_info` 全テストケース | リファクタ前後で TID/SID が一致 |
| 既存テスト | バリデーションエラー | 同一のエラー条件で Err を返す |

新規テストの追加は必要に応じて行う（`select_pattern` の網羅性確認等）。

## 6. 実装チェックリスト

- [ ] `Step` enum 定義
- [ ] 8 パターンの `&[Step]` 定数を定義
- [ ] `execute_steps` 関数を実装
- [ ] `execute_until_tid_sid` 関数を実装
- [ ] `select_pattern` 関数を実装
- [ ] `calculate_game_offset` を `select_pattern` + `execute_steps` に書き換え
- [ ] `calculate_trainer_info` を `select_pattern` + `execute_until_tid_sid` に書き換え
- [ ] 旧パターン関数 8 本 + advance 関数 2 本を削除
- [ ] `cargo test -p wasm-pkg` で全テスト通過を確認
- [ ] `cargo clippy -p wasm-pkg --all-targets -- -D warnings` で警告なし
