# BW1 NewGame NoSave オフセット計算修正 仕様書

## 1. 概要

### 1.1 目的

BW1 の `NewGame` + `NoSave` 環境において、TID/SID 決定前の LCG 消費量が実機と一致しないケースがある不具合を修正する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| LCG (LCG64) | 64bit 線形合同法。乗数 $0x5D588B656C078965$, 加算 $0x269EC3$ |
| PT (Probability Table) | 6 段の確率テーブル処理。seed 依存で 0〜5 回の乱数消費を行う |
| PT(n) | PT を $n$ 回連続で適用する操作 |
| Rand(n) | 乱数を $n$ 回消費する操作 |
| WithSave | DS 本体にセーブデータが存在する状態で NewGame を開始する |
| NoSave | DS 本体にセーブデータが存在しない状態で NewGame を開始する |
| offset | TID/SID 決定前に LCG が消費する回数。seed ごとに異なる |

### 1.3 背景・問題

BW1 の TID 調整機能で、`NoSave` 時に一部の seed で計算 TID が実機 TID と一致しない報告があった。

外部ブログ記事（BW1 White, NewGame, NoSave, New3DS 環境）の実機検証データ:

| 事例 | seed | 実機 TID | 修正前の計算 TID | 一致 |
|------|------|---------|----------------|------|
| ② | `0x732A69561D8A4759` | 53774 | 53774 | o |
| ③ | `0x4A263601` `12FA8697` | 4219 | 10266 | x |
| ④ | `0x9DEB7BCC6ABA562A` | 20020 | 37174 | x |

修正前のコードでは `NoSave` を `PT(3) → Rand(2)` でモデル化していたが、実機の LCG 消費は `PT(2) → Rand(1) → PT(1) → Rand(2)` であった。

### 1.4 期待効果

| 項目 | 内容 |
|------|------|
| TID 計算の正確性向上 | NoSave 時に全 seed で実機との TID/SID 一致が期待される |
| offset 計算の正確性向上 | NoSave 時のゲームオフセットも同一関数を経由するため同時に修正される |

### 1.5 着手条件

なし。WASM 側の内部関数のみの修正で完結する。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/core/offset.rs` | 修正 | `bw_new_game_before_tid_sid` の NoSave パスの LCG 消費順序を変更。実機検証テスト 3 件を追加。既存テストの期待値を更新 |

## 3. 設計方針

### 3.1 アルゴリズム変更

`bw_new_game_before_tid_sid` 関数の LCG 消費パターンを以下のとおり変更する。

| モード | 変更前 | 変更後 |
|--------|--------|--------|
| WithSave | PT(2) → Rand(2) | 変更なし |
| NoSave | PT(3) → Rand(2) | PT(2) → Rand(1) → PT(1) → Rand(2) |

WithSave と NoSave は先頭 PT(2) を共有し、NoSave のみセーブ未検出に伴う追加初期化 `Rand(1) → PT(1)` を挿入する構造とする。

### 3.2 根拠

実機 TID から逆算した LCG advance 数と各仮説の比較:

| 事例 | 実機 advance | PT(3)+R(2) (修正前) | PT(2)+R(1)+PT(1)+R(2) (採用) |
|------|------------|--------------------|-----------------------------|
| ② | 29 | 29 | 29 |
| ③ | 30 | 28 | 30 |
| ④ | 34 | 31 | 34 |

4 事例すべてで採用仮説が実機と一致した。

### 3.3 未確定事項

`Rand(1) + PT(3) + Rand(2)` という別仮説も 4 事例すべてで同一結果を出す。この 2 仮説は全 seed のうち約 49% で結果が分岐する。本修正では WithSave の PT(2) との共通プレフィックスを持つ構造的整合性を根拠に `PT(2) → Rand(1) → PT(1) → Rand(2)` を採用した。将来、2 仮説が分岐する seed について実機データが得られた場合、再検証が必要になる可能性がある。

## 4. 実装仕様

### 4.1 `bw_new_game_before_tid_sid` の変更

```rust
fn bw_new_game_before_tid_sid(lcg: &mut Lcg64, save: SavePresence) -> u32 {
    // 共通: PT(2)
    let mut advances = probability_table_multiple(lcg, 2);
    // NoSave: セーブ未検出時の追加初期化 Rand(1) → PT(1)
    if save == SavePresence::NoSave {
        advances += consume_random(lcg, 1);
        advances += probability_table_process(lcg);
    }
    // チラーミィ PID + ID
    advances += consume_random(lcg, 2);
    advances
}
```

### 4.2 影響範囲

この関数は以下の 2 つの公開 API から呼び出される。いずれも NoSave 時の動作が修正される。

- `calculate_game_offset` → `bw_game_offset` → `bw_new_game_before_tid_sid`
- `calculate_trainer_info` → `bw_trainer_info` → `bw_new_game_before_tid_sid`

BW2 系の関数 (`bw2_game_offset`, `bw2_trainer_info`) は別パスのため影響なし。

## 5. テスト方針

### 5.1 実機検証テスト (新規追加)

外部ブログの実機 TID データに基づくテスト。BW1 White, NewGame, NoSave 条件で `calculate_trainer_info` を呼び出し、TID が実機値と一致することを検証する。

| テスト名 | seed | 期待 TID | 検証内容 |
|----------|------|---------|---------|
| `test_blog_bw1_new_game_no_save_tid_case2_match` | `0x732A69561D8A4759` | 53774 | 修正前後ともに一致する正常ケース |
| `test_blog_bw1_new_game_no_save_tid_case3` | `0x4A263601` `12FA8697` | 4219 | 修正前は 10266 で不一致だったケース |
| `test_blog_bw1_new_game_no_save_tid_case4` | `0x9DEB7BCC6ABA562A` | 20020 | 修正前は 37174 で不一致だったケース |

### 5.2 既存テストの期待値更新

| テスト名 | 変更内容 |
|----------|----------|
| `test_bw_new_game_no_save_tid_sid` | seed `0x96FD2CBD8A2263A3` の期待値を TID=28363, SID=18153 に変更。元実装の期待値は修正前アルゴリズムに基づいており、実機検証済みではなかった |

### 5.3 リグレッション確認

- BW1 Continue 系テスト: 変更パスが異なるため影響なし → 全テスト pass を確認
- BW2 系テスト: 別関数のため影響なし → 全テスト pass を確認
- 統合テスト (`test_integrated_bw_continue_wild_sync_adamant` 等): pass を確認

## 6. 実装チェックリスト

- [x] `bw_new_game_before_tid_sid` の NoSave パスを `PT(2) → Rand(1) → PT(1) → Rand(2)` に変更
- [x] 実機検証テスト 3 件を追加
- [x] `test_bw_new_game_no_save_tid_sid` の期待値を更新
- [x] 全 326 テスト pass を確認
- [x] `cargo clippy` 警告なしを確認
- [x] ブランチ `fix/offset-calculation-extra-rand` にコミット
