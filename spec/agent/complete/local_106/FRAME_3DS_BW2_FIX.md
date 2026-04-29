# 3DS×BW2 Frame 値補正 仕様書

## 1. 概要

### 1.1 目的

初期 Seed 算出用 SHA-1 メッセージの `frame` 値を、3DS×BW2 の組み合わせに限り `9` から `8` に補正する。
現状 `get_frame` は `Hardware` のみで一意決定しており、ROM バージョン (BW/BW2) を考慮していないため、3DS×BW2 における初期 Seed が実機と一致しない。

### 1.2 用語定義

| 用語 | 定義 |
| --- | --- |
| frame | SHA-1 メッセージ `message[7]` 構築時に MAC 上位 32bit と `GX_STAT` に XOR される 1 バイトの値 |
| 初期 Seed | 起動直後 LCG/MT 初期化に用いられる 64bit 値 (SHA-1 ハッシュの上位 64bit を bswap して導出) |
| ハードウェア (Hardware) | 起動に使った本体種別 (`Ds` / `DsLite` / `Dsi` / `Dsi3ds`) |
| ROM バージョン (RomVersion) | プレイ中のソフト (`Black` / `White` / `Black2` / `White2`) |

### 1.3 背景・問題

現状実装 ([wasm-pkg/src/core/sha1/message.rs](wasm-pkg/src/core/sha1/message.rs#L86-L93)):

```rust
pub const fn get_frame(hardware: Hardware) -> u8 {
    match hardware {
        Hardware::Ds => 8,
        Hardware::DsLite | Hardware::Dsi => 6,
        Hardware::Dsi3ds => 9,
    }
}
```

`Hardware::Dsi3ds` のとき常に `9` を返すが、3DS で BW2 を起動した場合の正しい frame は `8` である。BW1 (`Black` / `White`) を 3DS で起動した場合は従来どおり `9`。

実機検証ケース (本仕様の検証で使用):

| 項目 | 値 |
| --- | --- |
| MAC | `98 B6 E9 1D 7C 3B` |
| ROM | Black2 (B2) |
| Region | JPN |
| Hardware | 3DS (`Dsi3ds`) |
| 日時範囲 | 2026/04/29 10:00:35 〜 10:00:40 |
| セーブ | あり (`SavePresence::ExistingSave`) |
| キー入力 | なし (`KeyCode::NONE`) |
| 実機 TID | 44844 |

frame=9 のままでは初期 Seed が一致せず、TID 探索結果が空または別の Seed を返す。frame=8 とすれば TID=44844 を再現できる前提。

### 1.4 期待効果

| 項目 | 期待値 |
| --- | --- |
| 3DS×BW2 環境での初期 Seed 算出 | 実機一致 |
| 3DS×BW1, DS, DSLite, DSi 環境 | 既存動作維持 (リグレッションなし) |
| Frame 決定ロジックの拡張性 | `RomVersion` 単位での切り分けが今後追加可能 |

### 1.5 着手条件

- 上記実機検証ケース (TID=44844) で TID 一致を確認できること (本仕様の e2e テストで担保)
- 既存の `get_frame` 単体テスト (`Ds=8`, `DsLite=6`, `Dsi=6`) が引き続きパスすること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
| --- | --- | --- |
| [wasm-pkg/src/core/sha1/message.rs](wasm-pkg/src/core/sha1/message.rs) | 修正 | `get_frame` のシグネチャに `RomVersion` を追加。3DS×BW2 のみ `8` を返すよう分岐追加。単体テスト更新 |
| [wasm-pkg/src/core/sha1/scalar.rs](wasm-pkg/src/core/sha1/scalar.rs) | 修正 | `get_frame(ds.hardware)` 呼び出し 3 箇所を `get_frame(ds.hardware, ds.version)` に更新 |
| [wasm-pkg/src/core/seed_resolver.rs](wasm-pkg/src/core/seed_resolver.rs) | 修正 | `get_frame` 呼び出し 2 箇所を更新 |
| [wasm-pkg/src/datetime_search/base.rs](wasm-pkg/src/datetime_search/base.rs) | 修正 | `get_frame` 呼び出し 1 箇所を更新 |
| [wasm-pkg/src/gpu/datetime_search/pipeline.rs](wasm-pkg/src/gpu/datetime_search/pipeline.rs) | 修正 | `get_frame` 呼び出し 1 箇所を更新 |
| [wasm-pkg/tests/](wasm-pkg/tests/) | 追加 | 3DS×BW2 e2e テスト (TID=44844 検証) を 1 件追加 |

GPU シェーダ ([wasm-pkg/src/gpu/datetime_search/shader.wgsl](wasm-pkg/src/gpu/datetime_search/shader.wgsl)) は frame をホスト側で `data7_swapped` に焼き込んでから uniform として渡しているため、シェーダ本体の変更は不要。

## 3. 設計方針

### 3.1 アルゴリズム

`get_frame` を以下のロジックに変更する:

```
match (hardware, rom_version):
    (Ds,                    *)            -> 8
    (DsLite | Dsi,          *)            -> 6
    (Dsi3ds,                BW2 (B2/W2))  -> 8   // 新規分岐
    (Dsi3ds,                BW1 (B/W))    -> 9   // 既存挙動維持
```

### 3.2 シグネチャ変更方針

- **方針**: `get_frame` の第 2 引数として `RomVersion` を追加する破壊的変更とする
- **理由**:
  - 全呼び出し元 (6 箇所) はいずれも `DsConfig` を保持しており `ds.version` を渡せる
  - `RomVersion` を内包しない簡易ヘルパは不要 (オーバーロード追加よりも単一定義の方が見通しが良い)
  - 公開 API は wasm-bindgen 越しではなく Rust 内部利用のみ (`pub use` で re-export されているが TS には露出しない)

### 3.3 性能要件

| 指標 | 要件 |
| --- | --- |
| `get_frame` 呼び出しコスト | 既存と同等 (`const fn` を維持) |
| 検索ホットパスへの影響 | なし (frame は探索開始前に 1 回だけ算出され `BaseMessageBuilder` に焼き込まれる) |

### 3.4 後方互換性

- TS / wasm-bindgen 公開 API には影響なし (`get_frame` は wasm export されていない)
- 既存テスト (`Ds=8`, `DsLite=6`, `Dsi=6`, `Dsi3ds=9`) は `Dsi3ds=9` を BW1 ケースとして再構成

## 4. 実装仕様

### 4.1 `get_frame` 新シグネチャ

```rust
use crate::types::{Hardware, RomVersion};

/// Hardware と RomVersion から frame 値を取得
///
/// 3DS×BW2 のみ 8 を返す特例あり。それ以外は Hardware で一意決定。
pub const fn get_frame(hardware: Hardware, version: RomVersion) -> u8 {
    match hardware {
        Hardware::Ds => 8,
        Hardware::DsLite | Hardware::Dsi => 6,
        Hardware::Dsi3ds => {
            if version.is_bw2() {
                8
            } else {
                9
            }
        }
    }
}
```

### 4.2 呼び出し元の更新パターン

各呼び出し元はいずれも `let ds: DsConfig = ...;` のスコープ内にあるため、機械的に置換可能:

```rust
// before
let frame = get_frame(ds.hardware);

// after
let frame = get_frame(ds.hardware, ds.version);
```

## 5. テスト方針

### 5.1 単体テスト ([wasm-pkg/src/core/sha1/message.rs](wasm-pkg/src/core/sha1/message.rs))

`test_get_frame` を以下に置き換える:

```rust
#[test]
fn test_get_frame() {
    use RomVersion::{Black, Black2, White, White2};

    // Hardware で一意決定されるケース (RomVersion 不問)
    for v in [Black, White, Black2, White2] {
        assert_eq!(get_frame(Hardware::Ds, v), 8);
        assert_eq!(get_frame(Hardware::DsLite, v), 6);
        assert_eq!(get_frame(Hardware::Dsi, v), 6);
    }

    // 3DS は BW1 / BW2 で値が異なる
    assert_eq!(get_frame(Hardware::Dsi3ds, Black), 9);
    assert_eq!(get_frame(Hardware::Dsi3ds, White), 9);
    assert_eq!(get_frame(Hardware::Dsi3ds, Black2), 8);
    assert_eq!(get_frame(Hardware::Dsi3ds, White2), 8);
}
```

### 5.2 E2E テスト (新規追加)

実機 TID 一致テスト (1 件) を `wasm-pkg/tests/` 配下に追加。

| 検証項目 | 内容 |
| --- | --- |
| 入力 | §1.3 実機検証ケースの DsConfig / 日時範囲 / SavePresence::ExistingSave / KeyMask=NONE |
| 処理 | datetime_search で初期 Seed 候補列挙 → `calculate_trainer_info` で TID 算出 |
| 期待 | 候補のうち少なくとも 1 件で TID == 44844 が得られる |

```rust
#[test]
fn test_3ds_bw2_initial_seed_yields_real_tid() {
    let ds = DsConfig {
        mac: [0x98, 0xB6, 0xE9, 0x1D, 0x7C, 0x3B],
        hardware: Hardware::Dsi3ds,
        version: RomVersion::Black2,
        region: RomRegion::Jpn,
    };
    let game_config = GameStartConfig {
        start_mode: StartMode::NewGame,
        save: SavePresence::ExistingSave,
        memory_link: MemoryLinkState::Disabled,
        shiny_charm: ShinyCharmState::NotObtained,
    };
    // 日時: 2026/04/29 10:00:35 〜 10:00:40
    // KeyCode: NONE
    // datetime_search を実行し、得られた各 LcgSeed について
    // calculate_trainer_info(seed, Black2, game_config).tid == 44844 となる候補が
    // 1 件以上存在することを確認する。
    // ...
}
```

### 5.3 既存テスト

| テスト | 期待挙動 |
| --- | --- |
| [wasm-pkg/src/core/sha1/scalar.rs](wasm-pkg/src/core/sha1/scalar.rs) の `test_sha1_with_real_case` 系 | DS / White2 のため frame=8 で従来同一 |
| [wasm-pkg/src/core/offset.rs](wasm-pkg/src/core/offset.rs) の `test_blog_bw1_new_game_no_save_tid_case2_match` 等 | LCG Seed を直接与えるため frame 変更の影響なし |
| `cargo test`, `cargo test --features gpu`, `pnpm test:wasm` 全件 | パス |

## 6. 実装チェックリスト

- [x] `RomVersion::is_bw2` の利用可否確認 ([wasm-pkg/src/types/config.rs](wasm-pkg/src/types/config.rs#L42))
- [x] `get_frame` のシグネチャ変更 (`hardware` + `version`)
- [x] `get_frame` 単体テスト更新 (`message.rs`)
- [x] 呼び出し元更新 (scalar.rs × 3, seed_resolver.rs × 2, base.rs × 1, pipeline.rs × 1)
- [x] E2E テスト追加 (3DS×BW2 / TID=44844)
- [x] `cargo fmt` / `cargo clippy --all-targets -- -D warnings`
- [x] `cargo clippy --all-targets --features gpu -- -D warnings`
- [x] `cargo test` (lib 321 件 + e2e 1 件パス)
- [x] `cargo test --features gpu` (359 件、失敗なし)
- [x] `pnpm build:wasm` / `pnpm test:wasm` (テスト 328 件、失敗なし)
- [x] `wip` → `complete` ディレクトリ移動
