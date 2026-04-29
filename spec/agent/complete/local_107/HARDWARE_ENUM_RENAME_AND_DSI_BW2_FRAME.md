# `Hardware` enum リネーム & DSi×BW2 frame 値補正 仕様書

## 1. 概要

### 1.1 目的

`Hardware` enum の命名整理と、DSi×BW2 で frame 値が `6` ではなく `8` となる仕様への対応を併せて行う。

- `Hardware::Dsi3ds` を `Hardware::N3ds` にリネームする (Rust / TS / WGSL コメント等を全件追従)
- `get_frame` の DSi 分岐に BW2 特例を追加 (3DS×BW2 と同じ frame=8 とする)

[local_106 (3DS×BW2 frame 補正)](../../complete/local_106/FRAME_3DS_BW2_FIX.md) の追加修正に位置付ける。

### 1.2 用語定義

| 用語 | 定義 |
| --- | --- |
| Hardware | 起動に使った本体種別 (`Ds` / `DsLite` / `Dsi` / `N3ds`) |
| RomVersion | プレイ中のソフト (`Black` / `White` / `Black2` / `White2`) |
| frame | SHA-1 メッセージ `message[7]` 構築時に MAC 上位 32bit と `GX_STAT` に XOR される 1 バイトの値 |
| BW1 / BW2 | `Black`/`White` (BW1) と `Black2`/`White2` (BW2) の総称 |

### 1.3 背景・問題

#### 問題 1: 命名の混乱 (`Dsi3ds`)

現行 `Hardware` enum:

```rust
pub enum Hardware { Ds, DsLite, Dsi, Dsi3ds }
```

- `Dsi3ds` は **3DS 単一機種**を表すが、名前から「DSi または 3DS」を兼ねる識別子のように読める
- 実際は表示名 `'3DS'` ([src/lib/game-data-names.ts](../../../../src/lib/game-data-names.ts#L239))、export 略号 `'3ds'` ([src/services/export.ts](../../../../src/services/export.ts#L97)) と外部表現は「3DS」単独
- Rust 識別子は数字始まり禁止のため `3Ds` は不可。代替案として `N3ds` を採用 (Nintendo 3DS の略)

#### 問題 2: DSi×BW2 の frame 値

現行 `get_frame` ([wasm-pkg/src/core/sha1/message.rs](../../../../wasm-pkg/src/core/sha1/message.rs#L88-L99)):

```rust
pub const fn get_frame(hardware: Hardware, version: RomVersion) -> u8 {
    match hardware {
        Hardware::Ds => 8,
        Hardware::DsLite | Hardware::Dsi => 6,
        Hardware::Dsi3ds => if version.is_bw2() { 8 } else { 9 },
    }
}
```

local_106 で 3DS×BW2 のみ `9 → 8` の特例を追加したが、**DSi も 3DS と同じ frame 仕様**であることが判明した。すなわち DSi は現状 `6` 固定で誤っており、正しくは BW1=9 / BW2=8 となる。

### 1.4 期待効果

| 項目 | 期待値 |
| --- | --- |
| `Hardware` enum の意図明確化 | 識別子名と実機種が一対一対応 (`N3ds` = 3DS) |
| DSi×BW2 環境での初期 Seed 算出 | 実機一致 |
| 既存の DSi×BW1, 3DS, DS, DSLite 環境 | 既存動作維持 |

### 1.5 着手条件

- 既存の frame 単体テスト (`get_frame` の 16 ケース) が新仕様で再構築可能なこと
- リネームに伴う TS 側 (i18n を含む) の参照が機械置換で完結すること
- 公開前 (現段階) のため persist 移行は不要 (ユーザの localStorage に旧値 `'Dsi3ds'` が残るのは公開前として許容)

## 2. 対象ファイル

### 2.1 Rust 側

| ファイル | 変更種別 | 変更内容 |
| --- | --- | --- |
| [wasm-pkg/src/types/config.rs](../../../../wasm-pkg/src/types/config.rs) | 修正 | enum バリアント `Dsi3ds` → `N3ds` |
| [wasm-pkg/src/core/sha1/message.rs](../../../../wasm-pkg/src/core/sha1/message.rs) | 修正 | `get_frame` の DSi 分岐に BW2 特例追加。`Dsi3ds` → `N3ds`。単体テスト更新 |
| [wasm-pkg/src/core/sha1/nazo.rs](../../../../wasm-pkg/src/core/sha1/nazo.rs) | 修正 | `Hardware::Dsi3ds` 参照 2 箇所を `Hardware::N3ds` に更新。コメント整理 |
| [wasm-pkg/src/gpu/datetime_search/pipeline.rs](../../../../wasm-pkg/src/gpu/datetime_search/pipeline.rs) | 修正 | `Hardware::Dsi3ds` 参照 1 箇所を更新 |
| [wasm-pkg/src/gpu/datetime_search/shader.wgsl](../../../../wasm-pkg/src/gpu/datetime_search/shader.wgsl) | 修正 | コメント `(0: DS, 1: DSLite, 2: DSi, 3: 3DS)` のみ。シェーダロジック変更なし |
| [wasm-pkg/tests/frame_3ds_bw2.rs](../../../../wasm-pkg/tests/frame_3ds_bw2.rs) | 修正 | `Hardware::Dsi3ds` → `Hardware::N3ds` |

### 2.2 TS 側 (リネーム追従のみ)

| ファイル | 変更種別 | 変更内容 |
| --- | --- | --- |
| [src/wasm/wasm_pkg.d.ts](../../../../src/wasm/wasm_pkg.d.ts) | 自動生成 | `pnpm build:wasm` で再生成 (`"Dsi3ds"` → `"N3ds"`) |
| [src/data/timer0-vcount-defaults.ts](../../../../src/data/timer0-vcount-defaults.ts) | 修正 | `'Dsi3ds'` 参照を `'N3ds'` に更新 |
| [src/lib/validation.ts](../../../../src/lib/validation.ts) | 修正 | `VALID_HARDWARE` 配列の値を更新 |
| [src/lib/game-data-names.ts](../../../../src/lib/game-data-names.ts) | 修正 | `HARDWARE_ORDER` / `HARDWARE_NAMES` のキーを更新 |
| [src/services/export.ts](../../../../src/services/export.ts) | 修正 | export 略号マップのキーを更新 (値 `'3ds'` は維持) |
| [src/test/unit/data/timer0-vcount-defaults.test.ts](../../../../src/test/unit/data/timer0-vcount-defaults.test.ts) | 修正 | テストのリテラル `'Dsi3ds'` を更新 |

### 2.3 影響なし

- `spec/agent/complete/local_*` 配下の既存仕様書: 履歴として残すため変更しない
- i18n locales (`src/i18n/locales/**`): `'Dsi3ds'` 文字列リテラルなし (本文は `'3DS'` 表記)
- persist (`localStorage`): 公開前のため migration 不要。旧値は `validation.ts` の検証で弾かれ初期値補完される

## 3. 設計方針

### 3.1 `Hardware` enum の命名

- **採用**: `N3ds` (Nintendo 3DS の略)
- **却下案**:
  - `ThreeDs`: 数字を英単語化する案。Rust 慣例 (`Ipv4Addr` 等) と整合するが冗長
  - `Threeds`: 全小文字側に倒した形。視認性低下
  - 旧 `Dsi3ds` 維持: 命名混乱が解消されない

### 3.2 `get_frame` 新ロジック

```
match (hardware, version):
    (Ds,            *)            -> 8
    (DsLite,        *)            -> 6
    (Dsi  | N3ds,   BW1)          -> 9   // DSi は新規 (本仕様)、3DS は local_106 から維持
    (Dsi  | N3ds,   BW2)          -> 8   // DSi は新規 (本仕様)、3DS は local_106 対応済
```

`Dsi` と `N3ds` で frame 値が完全に一致するため、両者をまとめて 1 アームに統合する。

```rust
pub const fn get_frame(hardware: Hardware, version: RomVersion) -> u8 {
    match hardware {
        Hardware::Ds => 8,
        Hardware::DsLite => 6,
        Hardware::Dsi | Hardware::N3ds => if version.is_bw2() { 8 } else { 9 },
    }
}
```

### 3.3 性能要件

| 指標 | 要件 |
| --- | --- |
| `get_frame` 呼び出しコスト | 既存と同等 (`const fn` 維持) |
| 検索ホットパスへの影響 | なし (frame は探索開始前に 1 回だけ算出) |

### 3.4 後方互換性

- TS 公開型: `Hardware = "Ds" | "DsLite" | "Dsi" | "Dsi3ds"` → `... | "N3ds"` の破壊的変更
  - 公開前のため migration 不要 (本リポジトリの TypeScript 規約 §「永続化 (persist) 変更の運用」に従う)
  - 旧 persist 値が残っているケースは `validation.ts` で弾く
- WASM ABI: `Hardware` は `Tsify` 経由で文字列として serialize されるため、Rust enum 名がそのまま TS リテラルになる。バイナリ互換性ではなく文字列契約のみ更新

## 4. 実装仕様

### 4.1 Rust 変更

#### 4.1.1 `wasm-pkg/src/types/config.rs`

```rust
pub enum Hardware {
    Ds,
    DsLite,
    Dsi,
    N3ds,
}
```

#### 4.1.2 `wasm-pkg/src/core/sha1/message.rs`

```rust
/// `Hardware` と `RomVersion` から frame 値を取得
///
/// DSi / 3DS は BW1 で 9、BW2 で 8 となる。
/// DS / DS Lite は RomVersion 不問。
pub const fn get_frame(hardware: Hardware, version: RomVersion) -> u8 {
    match hardware {
        Hardware::Ds => 8,
        Hardware::DsLite => 6,
        Hardware::Dsi | Hardware::N3ds => {
            if version.is_bw2() {
                8
            } else {
                9
            }
        }
    }
}
```

#### 4.1.3 機械置換 (識別子のみ)

| 対象 | 旧 | 新 |
| --- | --- | --- |
| Rust enum バリアント | `Hardware::Dsi3ds` | `Hardware::N3ds` |
| Rust テスト関数名 | `test_dsi_and_3ds_return_same_values` | (現状維持。中身のみ `N3ds` 参照に更新) |
| WGSL コメント | `(... 3: 3DS)` | (表示名は `3DS` のまま) |

### 4.2 TS 変更

#### 4.2.1 リテラル置換

```ts
// before / after
'Dsi3ds' → 'N3ds'
```

#### 4.2.2 表示名 / 略号 (値はそのまま)

- `game-data-names.ts`: キーのみ `Dsi3ds` → `N3ds`、表示名 `{ ja: '3DS', en: '3DS' }` は維持
- `services/export.ts`: キーのみ `Dsi3ds` → `N3ds`、値 `'3ds'` は維持

## 5. テスト方針

### 5.1 単体テスト更新 ([wasm-pkg/src/core/sha1/message.rs](../../../../wasm-pkg/src/core/sha1/message.rs))

```rust
#[test]
fn test_get_frame() {
    use RomVersion::{Black, Black2, White, White2};

    // Hardware で一意決定されるケース (RomVersion 不問)
    for v in [Black, White, Black2, White2] {
        assert_eq!(get_frame(Hardware::Ds, v), 8);
        assert_eq!(get_frame(Hardware::DsLite, v), 6);
    }

    // DSi / 3DS: BW1 → 9, BW2 → 8 (両者同一)
    for hw in [Hardware::Dsi, Hardware::N3ds] {
        assert_eq!(get_frame(hw, Black), 9);
        assert_eq!(get_frame(hw, White), 9);
        assert_eq!(get_frame(hw, Black2), 8);
        assert_eq!(get_frame(hw, White2), 8);
    }
}
```

### 5.2 既存テスト

| テスト | 期待挙動 |
| --- | --- |
| [wasm-pkg/tests/frame_3ds_bw2.rs](../../../../wasm-pkg/tests/frame_3ds_bw2.rs) | リネーム追従のみ。引き続き TID=44844 一致を確認 |
| [wasm-pkg/src/core/sha1/nazo.rs](../../../../wasm-pkg/src/core/sha1/nazo.rs) `test_dsi_and_3ds_return_same_values` | リネーム追従のみ |
| [src/test/unit/data/timer0-vcount-defaults.test.ts](../../../../src/test/unit/data/timer0-vcount-defaults.test.ts) | リネーム追従のみ |
| `cargo test`, `cargo test --features gpu`, `pnpm test:wasm`, `pnpm test:run` 全件 | パス |

### 5.3 E2E テスト

DSi×BW2 の実機検証データは未取得のため、本仕様では E2E テスト追加は行わず単体テストで担保する。実機データが入手できた場合は別仕様として追加する。

## 6. 実装チェックリスト

- [x] `Hardware::Dsi3ds` → `Hardware::N3ds` リネーム (Rust)
- [x] `get_frame` ロジック更新 (DSi×BW1 → 9, DSi×BW2 → 8)
- [x] `get_frame` 単体テスト更新 (16 ケース)
- [x] `wasm-pkg/src/core/sha1/nazo.rs`, `wasm-pkg/src/gpu/datetime_search/pipeline.rs` の参照更新
- [x] `wasm-pkg/tests/frame_3ds_bw2.rs` の `Dsi3ds` 参照更新
- [x] `pnpm build:wasm` で `src/wasm/wasm_pkg.d.ts` 再生成
- [x] TS 側リテラル置換 (`timer0-vcount-defaults.ts`, `validation.ts`, `game-data-names.ts`, `services/export.ts`, テスト)
- [x] `cargo fmt` / `cargo clippy --all-targets -- -D warnings`
- [x] `cargo clippy --all-targets --features gpu -- -D warnings`
- [x] `cargo test` (321 + 1 + 6 件パス) / `cargo test --features gpu` (359 + 1 + 6 件パス)
- [x] `pnpm format` / `pnpm lint` / `pnpm exec tsc -b --noEmit`
- [x] `pnpm test:run` (1393 件パス) / `pnpm test:wasm` (321 + 1 + 6 件パス)
- [x] `wip` → `complete` ディレクトリ移動
