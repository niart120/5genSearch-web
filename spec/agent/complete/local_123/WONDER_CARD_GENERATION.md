# BW / BW2 配達員の個体生成 仕様書

## 1. 概要

### 1.1 目的

BW / BW2 の配達員から受け取るポケモンについて、LCG の消費順序と個体生成条件を定義する。対象は Rust 内部の一個体生成処理とする。

生成手順と Rust 内部の入出力インタフェースを本書で定義する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| LCG | 第五世代の 64 bit 線形合同法乱数生成器。PIDRNG とも呼ばれる |
| 消費 | LCG の状態を一回更新すること。描画フレーム数ではない |
| 受取開始位置 | 起動時消費と操作による消費を適用済みで、カード前処理を始める直前の LCG 状態 |
| 固定値 | 配布条件により指定され、受取時の乱数で選ばない値 |
| 性別指定 | 配布条件によるオスまたはメスの指定。種族の性別比とは別の条件 |
| 使用する ID | PID の色違い補正・判定に使う TID / SID |

### 1.3 背景・問題

配達員の個体値・PID・性格は同じ LCG の列から決まる。個体値に MT を使う既存のポケモン生成とは、個体値の取得元と消費順序が異なる。

固定個体値の数、性別指定、性格固定の有無により消費数が変わる。生成方式を一律の消費数で分類せず、指定された条件から前処理と生成本体の消費を求める。

### 1.4 期待効果

| 項目 | 期待効果 |
|------|----------|
| 生成の再現 | 受取開始位置と生成条件から個体値・PID・性格・性別・特性・色違いを決定できる |
| 消費の再現 | 個体の値に加え、生成後の LCG 状態も再現できる |
| 入力の範囲 | 乱数計算に必要な条件だけで一個体を生成できる |
| 入力検証 | 生成条件の構築時に一回検証し、同じ条件による個体生成では再検証しない |

### 1.5 着手条件

本書の対象は、受取時に PID を生成し、レベルが固定されている配布条件とする。特性は通常特性 1 / 2 のランダム、通常特性 1 固定、通常特性 2 固定、隠れ特性固定を扱う。

固定 PID、ランダムレベル、隠れ特性を含む 3 択のランダム特性は、消費仕様を別途確定する対象とする。

## 2. 対象ファイル

実装と完了処理の対象は以下のとおり。

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/generation/flows/wondercard.rs` | 新規 | 専用の入力型・結果型、一個体生成関数 |
| `wasm-pkg/src/generation/flows/wondercard/tests.rs` | 新規 | 構築時検証・生成順序・PID 補正の単体テストと固定期待値 |
| `wasm-pkg/src/generation/flows/mod.rs` | 変更 | `wondercard` モジュールの宣言 |
| `wasm-pkg/src/generation/algorithm/iv.rs` | 変更 | 既存の `extract_iv()` が MT / LCG 共通の変換であることを明記 |
| `wasm-pkg/src/generation/algorithm/mod.rs` | 変更 | `extract_iv()` を生成フローから再利用するため内部再エクスポート |
| `wasm-pkg/src/generation/algorithm/nature.rs` | 変更 | `nature_roll()` の範囲変換を共通の `roll_fraction()` に集約 |
| `spec/agent/architecture/rust-structure.md` | 変更 | 生成フローの配置と責務を追記 |
| `spec/agent/complete/local_123/WONDER_CARD_GENERATION.md` | 移動・変更 | 検証結果と完了チェックを記録し、`wip` から移動 |
| `spec/agent/wip/local_124/WONDER_CARD_INTEGRATION.md` | 変更 | 完了移動後の本仕様書へのリンクを更新 |

## 3. 設計方針

### 3.1 一個体の生成を関数として定義する

入力は受取開始位置の `Lcg64` と生成条件、出力は六つの個体情報とする。LCG は生成関数が消費し、呼び出し後に生成終了位置を保持する。

生成条件は `WonderCardGenerationParams::new()` で検証してから使用する。一個体生成関数は検証済みの条件を受け取り、個体データを直接返す。

この関数には開始位置の列挙や検索を持たせない。隣接する消費位置を比較する呼び出し側は、各開始位置の LCG を複製して渡す。

### 3.2 入力の責務

種族から性別比を解決し、使用する TID / SID を選んでから生成関数を呼ぶ。種族 ID、レベル、配布タマゴかどうか、カード名・番号、親名・言語・技・持ち物は生成関数の引数に含めない。

通常の配布個体では配布元の TID / SID、配布タマゴでは受取人の TID / SID を使用する。受取後のタマゴ交換・孵化による親情報の変化は、この生成処理の範囲外とする。

BW / BW2 は同じ生成手順を使う。ROM バージョン、起動設定、思い出リンク、操作による消費は受取開始位置の計算で扱う。前処理の消費数は生成条件から内部で計算し、入力項目にはしない。

### 3.3 出力の責務

個体値・PID・性格・性別・特性スロット・色違い種別を返す。種族・レベルの付与、実数値・めざめるパワー・個性の算出、生成元情報・消費位置・針方向の付与は呼び出し側で扱う。

既存の `RawPokemonData` は個体値を持たず、`CorePokemonData` は種族、レベル、実数値を含むため、専用の結果型 `RawWonderCardData` を定義する。

### 3.4 実装範囲

Rust 内部から呼び出せる関数として追加する。WASM 公開 API、個体リスト・日時検索、フィルター、UI、配布データ一覧は別の作業とする。

### 3.5 上位経路の方針

個体リスト・日時検索は CPU で実行し、GPU 対応は行わない。共通化は配達員の二つの経路内に留める。

カード情報はアプリに同梱する JSON で管理し、TS 側で選択したカードの情報と受取人情報から生成条件へ変換する。内部の一個体生成関数には、3.2 で定めた計算に必要な条件だけを渡す。

上位経路の型・呼び出し・バッチ処理は [local_124 の接続仕様](../../wip/local_124/WONDER_CARD_INTEGRATION.md) で定義する。

### 3.6 既存処理の再利用とファイル分割

| 処理 | 再利用先・配置理由 |
|------|--------------------|
| 乱数の更新・範囲変換 | `Lcg64` / `roll_fraction()` を使用 |
| 個体値・性格の抽出 | 既存の `extract_iv()` / `nature_roll()` を使用。乱数の取得元と取得位置は配達員フローが決める |
| 色違い禁止・最終個体情報の判定 | `apply_shiny_lock()`、`Pid::gender()` / `ability_slot()` / `shiny_type()` を使用 |
| 配達員固有の処理 | 前処理、性別値の補正、下位 8 bit からの色違い確定化、最後の特性補正を本フローに配置。既存の野生・イベント・孵化の PID 生成は補正内容や消費順序が異なる |
| 型とテスト | 条件型・構築時検証・生成本体は約 160 行の `wondercard.rs` にまとめ、約 670 行のテストを `wondercard/tests.rs` に分離 |

条件型は本生成処理だけがフィールドを読むため、同じモジュールに置いて非公開フィールドを維持する。型だけを別モジュールへ移すためのアクセサーや可視性拡大は行わない。`RawWonderCardData` も 3.3 の責務に合わせて専用型を維持する。テスト分割で生成関数の Rust パスや公開範囲は変えない。

## 4. 実装仕様

### 4.1 入出力インタフェース

一個体生成関数は既存の `generate_static_pokemon()` などと同じ `generate_*_pokemon` 形式、内部の結果型は `RawPokemonData` / `RawEggData` と同じ `Raw*Data` 形式にする。生成条件型は `*GenerationParams` 形式、コンストラクターは `new()` に揃える。

以下に型定義と関数のシグネチャを示す。関数本体は省略する。

```rust
use crate::core::lcg::Lcg64;
use crate::generation::flows::types::GenerationError;
use crate::types::{
    AbilitySlot, Gender, GenderRatio, Ivs, Nature, Pid, ShinyType, TrainerInfo,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WonderCardShinyPolicy {
    Never,
    Random,
    Always,
}

#[derive(Clone, Debug)]
pub struct WonderCardGenerationParams {
    trainer: TrainerInfo,
    gender_ratio: GenderRatio,
    fixed_ivs: [Option<u8>; 6],
    fixed_nature: Option<Nature>,
    fixed_gender: Option<Gender>,
    fixed_ability_slot: Option<AbilitySlot>,
    shiny_policy: WonderCardShinyPolicy,
}

impl WonderCardGenerationParams {
    pub fn new(
        trainer: TrainerInfo,
        gender_ratio: GenderRatio,
        fixed_ivs: [Option<u8>; 6],
        fixed_nature: Option<Nature>,
        fixed_gender: Option<Gender>,
        fixed_ability_slot: Option<AbilitySlot>,
        shiny_policy: WonderCardShinyPolicy,
    ) -> Result<Self, GenerationError>;
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct RawWonderCardData {
    pub ivs: Ivs,
    pub pid: Pid,
    pub nature: Nature,
    pub gender: Gender,
    pub ability_slot: AbilitySlot,
    pub shiny_type: ShinyType,
}

pub fn generate_wondercard_pokemon(
    lcg: &mut Lcg64,
    params: &WonderCardGenerationParams,
) -> RawWonderCardData;
```

`trainer` は選択済みの TID / SID を表す。配布元と受取人の ID を二組持たせない。

| フィールド | 指定の意味 |
|------------|------------|
| `fixed_ivs` | H・A・B・C・D・S 順。各要素の `Some(0..=31)` は固定、`None` はランダム |
| `fixed_nature` | `Some` は指定性格、`None` は全 25 性格から生成 |
| `fixed_gender` | `Some(Gender::Male)` または `Some(Gender::Female)` は性別補正を行う。`None` は PID と性別比から決定 |
| `fixed_ability_slot` | `Some` は指定スロット、`None` は通常特性 1 / 2 から決定 |
| `shiny_policy` | 色違い禁止、通常判定、色違い確定のいずれか |

`fixed_gender = None` の場合、カードによる性別補正を行わず、種族の性別比に従って性別を決定する。オスのみ、メスのみ、性別不明の種族にも指定できる。

新設する型には、この段階で `Tsify` / `Serialize` / `Deserialize` を付けない。既存のドメイン型はそのまま使用する。

### 4.2 生成条件の構築時検証

`WonderCardGenerationParams` は検証済みの生成条件を表す。`new()` は以下の条件を一回検証し、成功時だけ `Self` を構築する。不正な入力では `GenerationError::InvalidConfig` を返す。

| 条件 | 判定 |
|------|------|
| 固定個体値が `32..=255` | 不正 |
| `fixed_gender = Some(Gender::Genderless)` | 不正。性別不明は `gender_ratio` と `fixed_gender = None` で指定 |
| 性別比が `Genderless` でオスまたはメスを指定 | 不正 |
| `MaleOnly` にメス指定、`FemaleOnly` にオス指定 | 不正 |

TID / SID の `0` は有効値とする。特性の選択肢は配布条件として渡し、種族の特性一覧との照合はコンストラクターで行わない。

全フィールドを非公開とし、外部からの構造体リテラルによる生成やフィールドの書き換えを許可しない。公開の更新メソッド、可変参照を返すアクセサー、検証を迂回するコンストラクターは設けない。条件を変更する場合は `new()` で新しく構築する。`Clone` は検証済みの値をそのまま複製する。

コンストラクターは LCG を受け取らず、乱数を消費しない。`generate_wondercard_pokemon()` は `&WonderCardGenerationParams` を受け取り、入力検証を繰り返さない。個体生成ごとの `Result` や入力不正の分岐は設けず、検証済みの条件から必ず一個体を返す。

外部データからの構築経路を追加する場合も `new()` に検証を集約する。`WonderCardGenerationParams` に検証を経ない `Deserialize` や可変アクセスを追加しない。

### 4.3 LCG と乱数値の変換

LCG の更新を次の式で定義する。

$$
s_{i+1} = (s_i \times \mathtt{0x5D588B656C078965} + \mathtt{0x269EC3}) \bmod 2^{64}
$$

一回の乱数取得は状態を更新した後の上位 32 bit、$r_i = s_{i+1} \gg 32$ を返す。`Lcg64` を使用する。

範囲変換は $\operatorname{scale}(r, n) = \lfloor r n / 2^{32} \rfloor$ とし、`roll_fraction` を使用する。以下の `rand(n)` は、一回乱数を取得してこの範囲変換を行う操作を表す。

### 4.4 消費順序

$R$ はランダム個体値の数、$G$ は性別指定があれば 1・なければ 0、$N$ は性格がランダムなら 1・固定なら 0 とする。

| 順序 | 処理 | 消費数 |
|------|------|--------|
| 1 | カード前処理 | $L = 8 + 2R + 2G + 2N$ |
| 2 | H・A・B・C・D・S 順に個体値を設定 | $R$ |
| 3 | 結果に使用しない乱数取得 | 2 |
| 4 | 元 PID を取得 | 1 |
| 5 | 性別指定があれば PID を補正 | $G$ |
| 6 | 色違い条件に応じて PID を補正 | 0 |
| 7 | 特性条件に応じて PID を補正 | 0 |
| 8 | 結果に使用しない乱数取得 | 1 |
| 9 | 性格を設定 | $N$ |

生成本体の消費数を $B$ とすると、$B = R + G + N + 4$、$L = 2B$、合計消費数は $L+B = 3B$ となる。本書の対応範囲では、取得した乱数の値によって合計消費数は変化しない。

順序 8 の一消費は性格固定時も行う。順序 3・8 の消費は、用途の推測に依存せず上記の回数を実行する。

### 4.5 個体値と性格

個体値は H・A・B・C・D・S 順に処理する。固定値はそのまま設定し、ランダムな箇所だけ一回乱数を取得して `r >> 27` を設定する。結果の `Ivs` はすべて `0..=31` であり、未確定値を含まない。

性格は固定なら指定値を設定する。ランダムなら、順序 8 の消費後に `rand(25)` を取得し、`Nature` の番号に対応させる。PID から性格を算出しない。

### 4.6 PID と性別

順序 4 では一回取得した 32 bit 乱数値をそのまま元 PID とする。この時点では bit 16 の反転や、野生個体向けの ID 補正を行わない。

性別指定がある場合は追加で一回乱数を取得し、次の式で性別値 $g$ を求める。$t$ は `GenderRatio::to_threshold()` の値とする。

| 性別比と指定 | 性別値 $g$ |
|--------------|-------------|
| オスとメスが存在する種族でオス指定 | $\operatorname{rand}(254-t)+t$ |
| オスとメスが存在する種族でメス指定 | $\operatorname{rand}(t-1)+1$ |
| オスのみの種族 (`MaleOnly`) でオス指定 | $\operatorname{rand}(246)+8$ |
| メスのみの種族 (`FemaleOnly`) でメス指定 | $\operatorname{rand}(8)+1$ |

PID は `(pid & 0xFFFF_FF00) | g` に更新する。既に指定の性別を満たす元 PID でも補正と一消費を行う。性別が一致するまで引き直す処理は行わない。

性別指定がない場合は PID を変更しない。出力の性別は最終 PID と `gender_ratio` から `Pid::gender()` で求める。

### 4.7 色違い補正

性別補正後の PID に対し、$x = (pid \gg 16) \mathbin{\mathrm{xor}} (pid \mathbin{\&} 65535) \mathbin{\mathrm{xor}} tid \mathbin{\mathrm{xor}} sid$ を求める。

| 条件 | PID の処理 |
|------|------------|
| `Never` | $x < 8$ なら `pid ^= 0x1000_0000` |
| `Random` | 変更しない |
| `Always` | `low = pid & 0xFF` とし、`pid = ((low ^ tid ^ sid) << 16) \| low` |

補正による追加消費はない。`Always` で保持するのは下位 8 bit であり、下位 16 bit ではない。

### 4.8 特性補正と最終結果

色違い補正後の PID に対し、特性条件を適用する。

| 条件 | PID の処理 | 出力スロット |
|------|------------|--------------|
| `Some(First)` | bit 16 を 0 にする | `First` |
| `Some(Second)` | bit 16 を 1 にする | `Second` |
| `Some(Hidden)` | bit 16 を 0 にする | `Hidden` |
| `None` | bit 16 を反転する | 反転後の `Pid::ability_slot()` |

追加消費はない。隠れ特性は PID の特性ビットから判定せず、固定条件から出力する。

出力の `shiny_type` は特性補正まで終えた最終 PID と `trainer` から `Pid::shiny_type()` で求める。既存の `ShinyType` の `Square` / `Star` は XOR 値の分類として使用し、BW / BW2 内に二種類の色違い演出があることを意味しない。

### 4.9 開始位置と終了位置の例

以下は起動時消費を含まず、受取開始位置から数えた LCG の呼出順を 1 始まりで表す。

| 生成条件 | 前処理 | 個体値取得位置 | 元 PID | 性別補正 | 性格取得位置 | 合計消費 |
|----------|--------|----------------|--------|----------|--------------|----------|
| 個体値 6 箇所ランダム・性別指定なし・性格ランダム | 22 | 23〜28 | 31 | なし | 33 | 33 |
| 個体値 6 箇所ランダム・性別指定あり・性格ランダム | 24 | 25〜30 | 33 | 34 | 36 | 36 |
| 個体値 1 箇所固定・性別指定あり・性格固定 | 20 | 21〜25 | 28 | 29 | なし | 30 |
| 個体値 6 箇所固定・性別指定なし・性格固定 | 8 | なし | 11 | なし | なし | 12 |

関数終了時の LCG 状態は、入力時の状態を合計消費数だけ進めた状態と一致する。この終了位置は本書の生成処理についての契約であり、受取後の操作による消費は含めない。

## 5. テスト方針

| 分類 | 対象 | 検証内容 |
|------|------|----------|
| 消費順序 | 固定値の組み合わせ | 個体値・性格・PID の採用位置と最終 LCG 状態。4.9 の例を含む |
| 固定個体値 | 六つの各位置 | 固定した値を保ち、後続の個体値と PID の乱数位置が変わる |
| 性別 | 各性別比と指定 | 下位 8 bit の補正式、元 PID が指定の性別を満たしていても補正すること、オスのみまたはメスのみの種族での固定指定の有無による消費差 |
| 色違い | 三条件 | 色違い禁止の境界 $x=7,8$、確定化での下位 8 bit の保持、最終特性補正後の判定 |
| 特性 | 三固定条件と通常特性ランダム | 最終 PID の bit 16 と出力スロット。隠れ特性固定時も bit 16 が 0 |
| 性格 | 固定・ランダム | 固定時も直前の一消費があり、ランダム時は 25 分率で決まる |
| 構築時検証 | `WonderCardGenerationParams::new()` | 不正な固定値・性別条件を拒否し、TID / SID の 0 を受け付ける |
| 条件の再利用 | 一つの検証済み条件 | 同じ条件を参照して複数の開始状態から個体生成でき、生成前後で条件が変わらない |
| 再現性 | 開始状態と条件 | 同じ入力から同じ個体と終了状態を得る |

期待値には、特定の開始状態からの乱数列と生成位置を固定したケースを使う。検証対象の生成関数から期待値を作り直すテストにはしない。

### 5.1 実装との対応

`wasm-pkg/src/generation/flows/wondercard/tests.rs` に 16 件の単体テストを配置した。期待値は生成関数を使わず、4.3 の LCG 漸化式を整数演算で展開して固定した。テスト内に開始状態、乱数の採用位置、期待する個体情報と終了状態を記載している。

| 要件 | 検証内容 |
|------|----------|
| 消費順序と個体値 | 4.9 の四例、六つの固定位置、固定・ランダムの交互配置を固定期待値で照合。全 64 通りの個体値固定配置 × 性別指定 3 通り × 性格条件 2 通りの 384 条件で終了状態と固定値の保持を検証 |
| 性別 | 全性別比で指定の有無を検証。オス・メスの補正値を範囲の下端・上端・中間で照合し、元 PID が既に指定性別を満たす場合も検証 |
| 色違い・特性 | XOR 0・1・7・8、全特性条件、元 PID の bit 16 が 0 / 1 の両方を検証。性別→色違い→特性の補正順序、確定化での下位 8 bit 保持、最終 PID による分類を照合 |
| 性格 | 固定時の末尾消費とランダム時の採用位置、25 分率の最小値 0・最大値 24 を検証 |
| 構築時検証 | 各位置の固定個体値 32・33・255、全性別比と性別指定の組み合わせを検証。有効な個体値 0〜31、TID / SID の 0・65535、全特性条件の受け付けを確認 |
| 条件の再利用・再現性 | 一つの検証済み条件とその `Clone` を参照し、0・1・`0x123456789ABCDEF0`・`u64::MAX` の四開始状態から繰り返し生成して固定期待値と照合 |

生成条件の全フィールドは非公開で、公開の構築経路は `new()` のみ。更新メソッド、可変参照を返すアクセサー、`Deserialize` は追加していない。生成関数は共有参照で条件を受け取り、構築時検証を呼び直さず `RawWonderCardData` を直接返すことをコードで確認した。

### 5.2 検証結果

2026-09-10 に実行。既存関数の再利用とテスト分割後にも、Rust 全体テスト・Clippy・フォーマット検査を再実行して成功した。

| コマンド | 結果 |
|----------|------|
| `cargo test --package wasm-pkg` | 成功。単体 338 件・統合 8 件が成功、既存の性能測定 2 件は `ignored`。追加した配達員テスト 16 件を含む |
| `cargo clippy --package wasm-pkg --all-targets -- -D warnings` | 成功 |
| `cargo check --package wasm-pkg --target wasm32-unknown-unknown --features gpu` | 成功。既存依存 `wgpu v28.0.0` の将来互換性警告あり |
| `cargo fmt --check` | 成功 |

## 6. 実装チェックリスト

- [x] 生成条件と消費順序を文書化する
- [x] Rust 内部の入出力インタフェースを記載する
- [x] 非公開フィールドを持つ生成条件型と構築時検証を実装する
- [x] 検証済みの条件を受け取る一個体生成処理を実装する
- [x] 生成結果・最終 LCG 状態の単体テストを実装して実行する
- [x] Rust ディレクトリ構成と検証結果を更新する

## 7. 参考資料

生成仕様の根拠とカードの項目定義を確認するための資料。

- [配布条件ごとの生成順序と消費数の検証（2013-07-12、投稿 #1040）](https://www.smogon.com/forums/threads/past-gen-rng-research.61090/page-42#post-4756078)
- [PID の性別・色違い・特性変換](https://github.com/chiizu/PPRNG/blob/master/libpprng/PIDRNG.h)
- [第五世代の Wonder Card データ構造](https://projectpokemon.org/home/docs/gen-5/5th-generation-wondercard-map-r2/)
