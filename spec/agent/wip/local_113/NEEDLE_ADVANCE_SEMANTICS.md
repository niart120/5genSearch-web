# レポート針消費位置整合 仕様書

## 1. 概要

### 1.1 目的

`pokemon-list`、`egg-list`、`needle` で扱うレポート針と消費数の意味を統一する。`Advance = N` は「`GameOffset + N` 回消費された時点」を表し、`Needle` は「その時点でレポートを書いたら表示される針方向」を表すものとする。

現状は、リスト生成系が現在の LCG seed を直接読んで針方向を出す一方、針読み検索はレポート処理として seed を 1 回進めた値から針方向を出している。リスト生成系の `Needle` は実機のレポート針と 1 消費ずれている可能性が高いため、針方向の計算規則を針読み検索側へ揃える。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| Base Seed | 起動時刻検索または手入力で得られる 64-bit LCG 初期 seed |
| GameOffset | ROM バージョンと起動条件により、ユーザ操作前に自動で進む LCG 消費数 |
| Advance N | `Base Seed` から `GameOffset + N` 回進んだ時点。UI の `Advance` カラムが表す値 |
| 位置 seed | `Advance N` 時点の LCG seed。`Lcg64::compute_advance(base_seed, game_offset + N)` と等価 |
| レポート針 | `Advance N` 時点でレポートを書いた場合に表示される針方向。レポート書き込みに伴う 1 消費後の seed から計算する |
| 生 seed 方向 | 位置 seed 自体の上位 bit から直接得る方向。実機のレポート針ではない |
| パターン先頭位置 | 入力された針パターンの 1 文字目を観測する `Advance` |
| パターン末尾位置 | 入力された針パターンの最後の文字を観測する `Advance`。針読み検索では、観測済みパターンによって確定した現在位置として扱う |

### 1.3 背景・問題

現行実装には針方向の似通った関数が複数ある。

| 関数 | 現在の挙動 | 主な呼び出し元 | 問題 |
|------|------------|----------------|------|
| `core::needle::calculate_needle_direction` | 渡された seed の上位 3bit をそのまま読む | `PokemonGenerator`, `EggGenerator` | レポート針としては 1 消費前を見ている |
| `core::needle::calc_report_needle_direction` | 渡された seed を 1 回進め、その上位値から針方向を出す | `search_needle_pattern`, `get_needle_pattern_at` | 実機レポート針に近いが、リスト生成側と不一致 |
| `Lcg64::calc_needle_direction` | `calc_report_needle_direction` と同等に seed を 1 回進めて読む | 現状はテストのみ | 名前が `calculate_needle_direction` と紛らわしく、責務が重複している |

`NeedleSearchResult.advance` は「パターン末尾消費位置」として定義されている。例えば `Advance 10` から 3 針のパターンが一致した場合、検索結果は `12` を返す。この値は、消費数不明の状態から複数回の針観測を行った後に「現在位置がどこまで進んだか」を示す値として有用であるため、本仕様では維持する。

### 1.4 期待効果

| 項目 | 現状 | 変更後 |
|------|------|--------|
| リストの `Needle` | 位置 seed 自体から計算される | `Advance N` でレポートを書いた針として計算される |
| 針読み検索の `advance` | パターン末尾位置を返す | 現状維持。ただし「観測後の現在位置」として仕様上明文化する |
| 針方向関数 | 生 seed 方向とレポート針が曖昧な名前で併存 | レポート針用の関数へ一本化する |
| テストの意味 | 現状挙動を追認している | `Advance N` の意味を固定する |
| UI の一貫性 | 同じ `Advance` でも機能ごとに意味が異なる | `pokemon-list`、`egg-list`、`needle` で同じ定義になる |

### 1.5 着手条件

- 実機挙動として、レポート針はレポート書き込みに伴う 1 消費後の seed から決まる、という前提で進める。
- `Advance` の意味は既存の個体・タマゴ生成と同じく「その時点」を表す。
- `NeedleSearchResult.advance` は、入力パターンの末尾位置、つまり複数回の針観測後に確定した現在位置として扱う。
- パターン先頭位置が必要な場合は、呼び出し側または将来の補助表示で `advance` とパターン長から逆算する。ただし本仕様ではユーザに先頭位置を主表示しない。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/core/needle.rs` | 修正 | レポート針計算を標準関数として明確化し、生 seed 方向関数を削除または private な診断用に限定する |
| `wasm-pkg/src/core/lcg.rs` | 修正 | `Lcg64::calc_needle_direction` を削除し、針方向計算を `core::needle` に集約する |
| `wasm-pkg/src/core/mod.rs` | 修正 | 針方向関数の re-export を標準関数だけに整理する |
| `wasm-pkg/src/generation/algorithm/mod.rs` | 修正 | 針方向関数の re-export を標準関数だけに整理する |
| `wasm-pkg/src/lib.rs` | 修正 | crate root の針方向関数 re-export を整理する |
| `wasm-pkg/src/generation/flows/generator/pokemon.rs` | 修正 | `needle_direction` をレポート針関数で計算する |
| `wasm-pkg/src/generation/flows/generator/egg.rs` | 修正 | `needle_direction` をレポート針関数で計算する |
| `wasm-pkg/src/misc/needle_search.rs` | 修正 | `NeedleSearchResult.advance` がパターン末尾位置を返す理由をコメントで補足する |
| `wasm-pkg/src/types/needle.rs` | 修正 | `NeedleSearchResult.advance` のコメントを観測後の現在位置として補足する |
| `wasm-pkg/src/types/generation.rs` | 修正 | `GeneratedPokemonData` / `GeneratedEggData` の `needle_direction` コメントを補足する |
| `src/wasm/*` | 生成更新 | WASM ビルドにより型定義・JS ラッパーを更新する。公開 TS API に変更がなければ差分なしも許容する |
| `src/test/integration/needle-search.test.ts` | 修正 | 針読み検索結果の `advance` がパターン末尾位置であることを必要に応じて検証する |
| `wasm-pkg/src/misc/needle_search.rs` | テスト修正 | Rust 側の針読み検索テストを新しい `advance` 定義へ更新する |
| `wasm-pkg/src/generation/flows/generator/pokemon.rs` | テスト追加 | リスト生成の `needle_direction` がレポート針であることを検証する |
| `wasm-pkg/src/generation/flows/generator/egg.rs` | テスト追加 | タマゴ生成の `needle_direction` がレポート針であることを検証する |

## 3. 設計方針

### 3.1 採用する消費数定義

`Advance = N` は、次の状態を表す。

```rust
let state_seed = Lcg64::compute_advance(base_seed, u64::from(game_offset + n));
```

この時点でレポートを書いたときの針方向は、次のように計算する。

```rust
let report_seed = Lcg64::compute_next(state_seed);
let upper = report_seed.value() >> 32;
let direction = NeedleDirection::from_value(((upper * 8) >> 32) as u8);
```

つまり `Needle` は「現在 seed の見た目」ではなく、「その消費数の時点で次にレポートを書いたら出る針」である。

### 3.2 関数責務の整理

針方向計算の標準関数は `core::needle::calc_report_needle_direction` に統一する。リスト生成、針読み検索、テストユーティリティはすべてこの関数を使う。

`calculate_needle_direction` は現状の名前ではレポート針なのか生 seed 方向なのか判断しづらい。実装後に呼び出し元がなくなるため、削除を第一候補とする。どうしても診断用途が必要な場合は `raw_seed_needle_direction` のように用途が明確な private 関数として残す。

`Lcg64::calc_needle_direction` は `Lcg64` の責務から外し、削除する。LCG は seed の進行と値取得を担当し、針方向というドメイン計算は `core::needle` に置く。

### 3.3 リスト生成の `needle_direction`

`PokemonGenerator::generate_next` と `EggGenerator::generate_next` では、生成前に取得している `current_seed` を基準に `calc_report_needle_direction(current_seed)` を呼ぶ。

```rust
let current_seed = self.lcg.current_seed();
let needle = calc_report_needle_direction(current_seed);
let advance = self.current_advance;
```

これにより、結果行の `Advance` と `Needle` は次の意味になる。

| カラム | 意味 |
|--------|------|
| `Advance` | その個体・タマゴを生成する基準時点 |
| `Needle` | その基準時点でレポートを書いた場合に出る針 |

レポート書き込み自体は実機上で消費を伴うため、「この針を見た後に同じ `Advance` の個体を出せる」という意味ではない。UI の `Needle` は時点の識別情報として扱う。

### 3.4 針読み検索の `advance`

`search_needle_pattern` は、入力されたパターンが `Advance N` から始まり、パターン長が `K` の場合に `advance: N + K - 1` を返す。この値はパターン末尾位置であり、ユーザが `K` 回の針観測を終えた時点で確定した現在位置を表す。

現行実装の次の方針は維持する。

```rust
let end_advance = advance + pattern_len - 1;
results.push(NeedleSearchResult {
    advance: end_advance,
    source: origin.clone(),
});
```

検索範囲の終端判定も、パターン全体が `max_advance` を超えない条件を維持する。つまり `pattern_len = K` の場合、検索開始位置の最大値は `max_advance - K + 1` のままとする。

### 3.5 UI 表示方針

本仕様では UI の新規カラム追加は行わない。`needle` 検索結果の `Advance` は、観測した針パターンの末尾位置、つまり現在位置として確定した値を表示する。

これは `pokemon-list` / `egg-list` の行ごとの `Advance` とは用途が異なる。リスト生成の `Advance` は「その行の生成基準時点」を表し、針読み検索の `Advance` は「観測結果から現在位置として確定した時点」を表す。どちらも値そのものは `GameOffset` からの相対消費数であり、針方向計算だけをレポート針に統一する。

### 3.6 互換性

今回の変更は計算結果の意味を修正するため、既存の `needle_direction` 値と `needle` 検索結果の `advance` は変わる。永続化 store の schema は変わらないため、localStorage migration は不要とする。

`src/wasm/wasm_pkg.d.ts` 上の `NeedleSearchResult` は `advance: number` のままで、型形状は変わらない。生成物に差分が出る場合は WASM ビルド結果として追従する。

## 4. 実装仕様

### 4.1 `core::needle`

`calc_report_needle_direction` を標準関数として残し、コメントを次の意味に更新する。

- 入力: `Advance N` 時点の位置 seed
- 出力: その時点でレポートを書いた場合に表示される針方向
- 副作用: なし。関数内では `compute_next` を使い、呼び出し元の LCG cursor は進めない

`calculate_needle_direction` は削除する。残す場合でも public re-export から外し、レポート針ではないことが分かる名前に変更する。

### 4.2 `core::lcg`

`Lcg64::calc_needle_direction` を削除する。テスト `test_needle_direction_range` は `core::needle::calc_report_needle_direction` のテストへ移す。

`Lcg64` に残す責務は以下に限定する。

| 責務 | 関数 |
|------|------|
| 現在 seed の保持 | `current_seed`, `set_seed`, `reset` |
| 1 回消費 | `next`, `next_seed`, `compute_next` |
| 複数回消費 | `advance`, `jump`, `compute_advance` |
| MT seed 導出 | `LcgSeed::derive_mt_seed` |

### 4.3 `PokemonGenerator` / `EggGenerator`

`calculate_needle_direction` の import を `calc_report_needle_direction` に置き換える。

生成処理の cursor 進行は変更しない。`needle_direction` の計算だけをレポート針へ変更し、`advance` は既存通り生成前に保存する。

### 4.4 `search_needle_pattern`

`matches_pattern` と `get_needle_pattern_at` は `calc_report_needle_direction` を使い続ける。これは既にレポート針として正しい。

`NeedleSearchResult.advance` には現行通りパターン末尾位置を詰める。実装変更は不要だが、コメントでは「パターン末尾位置」が観測後の現在位置を表すことを補足する。

### 4.5 型コメント

`NeedleSearchResult.advance` のコメントは次の意味へ変更する。

```rust
/// パターン末尾消費位置 (`game_offset` からの相対)。
/// `advance = N` の場合、入力パターンの最後の針は `Advance N` でレポートを書いた時に表示される。
/// 複数回の針観測後に確定した現在位置として扱う。
```

`GeneratedPokemonData.needle_direction` と `GeneratedEggData.needle_direction` には、必要に応じて「`advance` 時点でレポートを書いた場合の針方向」と補足する。

## 5. テスト方針

### 5.1 Rust unit tests

| テスト | 期待 |
|--------|------|
| `calc_report_needle_direction` は `compute_next(seed)` 後の上位値と一致する | 現在 seed 直接読みではないことを固定する |
| `PokemonGenerator::generate_next` の `needle_direction` | `game_offset + advance` 時点の seed に `calc_report_needle_direction` を適用した値と一致する |
| `EggGenerator::generate_next` の `needle_direction` | `game_offset + advance` 時点の seed に `calc_report_needle_direction` を適用した値と一致する |
| `search_needle_pattern` はパターン末尾位置を返す | 3 針パターンが `Advance 10` から一致する場合、結果 `advance` は `12` |
| `get_needle_pattern_at` | 指定位置からのレポート針列を返す |

### 5.2 TypeScript tests

| テスト | 期待 |
|--------|------|
| `needle-search.test.ts` | `search_needle_pattern` の結果構造と `advance >= user_offset` を検証する。可能なら既知 seed で末尾位置の期待値も固定する |
| `use-needle-search.test.ts` | WASM モック結果を Store に同期する既存テストは維持する |
| リスト表示コンポーネント | `Needle` カラムは値変換のみのため、計算ロジック変更では追加テスト不要 |

### 5.3 検証コマンド

```powershell
cargo test --package wasm-pkg needle
cargo test --package wasm-pkg generation::flows::generator
pnpm build:wasm:dev
pnpm test:run -- needle
pnpm exec tsc -b --noEmit
```

WASM 生成物に差分が出た場合は、`pnpm test:run -- needle` と `pnpm exec tsc -b --noEmit` を生成後の成果物に対して実行する。

## 6. 実装チェックリスト

- [ ] `Advance = N` の意味を `GameOffset + N` 回消費された時点として固定する
- [ ] `core::needle::calc_report_needle_direction` をレポート針の標準関数としてコメント更新する
- [ ] `core::needle::calculate_needle_direction` を削除、または public re-export から外して用途名を変更する
- [ ] `Lcg64::calc_needle_direction` を削除し、針方向計算を `core::needle` に集約する
- [ ] `PokemonGenerator` の `needle_direction` をレポート針で計算する
- [ ] `EggGenerator` の `needle_direction` をレポート針で計算する
- [ ] `NeedleSearchResult.advance` はパターン末尾位置として維持する
- [ ] `NeedleSearchResult.advance` のコメントを観測後の現在位置として補足する
- [ ] 既存の針読み検索テストがパターン末尾位置を固定していることを確認する
- [ ] リスト生成の針方向がレポート針であることを Rust unit test で固定する
- [ ] `cargo test --package wasm-pkg needle` を通す
- [ ] `cargo test --package wasm-pkg generation::flows::generator` を通す
- [ ] `pnpm test:run -- needle` を通す
- [ ] `pnpm exec tsc -b --noEmit` を通す
- [ ] 必要に応じて `pnpm build:wasm:dev` と生成物更新を行う
