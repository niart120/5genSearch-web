# 日時探索空間の共通化 設計書

## 1. 概要

### 1.1 目的

日時検索における入力の解釈、分割、列挙、件数計算、GPU の候補番号と日時の対応を `DatetimeSearchSpace` に集約する。

状態: 実装・検証完了（2026-09-06）。導入前の確認基点は `c6cc85c7a4270e65b094adce1ab511ab86ccfa5b`。着手時の `9da2c0fba0ae694a75a38837b2d95e114a6e2a05` との間に `wasm-pkg/`・`src/` の差分はなく、未コミット変更もなかった。1.3 節は導入前の記録、3 節以降は完成した実装の契約を記載する。

関連仕様:

- [local_118: ポケモン検索](../../complete/local_118/POKEMON_SEARCH.md)
- [local_119: ポケモン検索エンジン](../../complete/local_119/POKEMON_SEARCH_ENGINE.md)
- [local_120: ポケモン生成パイプライン](../../complete/local_120/POKEMON_GENERATION_PIPELINE.md)
- [Rust/WASM の配置・責務](../../architecture/rust-structure.md)
- [フロントエンドの配置・責務](../../architecture/frontend-structure.md)

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| DS 時計秒 | 2000-01-01 00:00:00 を 0 とする秒数。DS に設定する暦上の日時を表し、タイムゾーン・夏時間・うるう秒の変換は行わない |
| 日時区間 | DS 時計秒による半開区間 `[start, end)`。終了境界自体は検索しない |
| 日内時刻条件 | 時・分・秒それぞれの許容範囲の直積。連続する時刻区間とは限らない |
| 日時探索空間 | 日時区間のうち日内時刻条件を満たす日時の集合。Timer0、VCount、キー、消費位置は含めない |
| 候補番号 | 基準日の午前 0 時以降の日内時刻条件を満たす日時に、昇順で付ける 0 起点の番号。経過秒数とは異なる |
| 転送用入力型 | Main と Worker の WASM 間で渡す未検証データ。Rust 内部での保証を持たない |

### 1.3 背景・問題

| 導入前の実装 | 確認した挙動・問題 |
|----------|--------------------|
| `types/search.rs` の `DateRangeParams` | `validate()` は年範囲と大小関係を確認するが、月日が実在することを保証しない。`to_search_range()` は検証済みでなくても呼べる |
| `types/search.rs` と `datetime_search/base.rs` | 日付から秒数への変換、閏年判定が重複している |
| `datetime_search/mod.rs::split_search_range()` | 経過秒で分割し、各区間を年月日・日内オフセット・秒数へ戻す。時刻条件は受け取らない |
| `datetime_search/base.rs::DateTimeCodeEnumerator` | 全経過秒を走査し、86,400 要素の `Option` テーブルで対象を選ぶ。SHA-1 は有効日時を最大 4 件ずつ処理する |
| `datetime_search/pokemon.rs` | 独自の `validate_date()`、部分日に対応した `count_datetimes()` を持つ。検証は入口で行い、列挙した各日時の再検証は行っていない |
| MT Seed・タマゴ・ID の CPU 検索器 | 総件数を `ceil(区間秒数 / 86400) × 日内候補数` で求める。分割後の部分日では正確な列挙数にならない場合がある |
| GPU の `iterator.rs` | 日付範囲を丸日区間に変換して処理する。現行の公開入口では日数×日内候補数で正確に数えられる |
| GPU の `shader.wgsl`・`pipeline.rs` | 候補番号から日時を求める。`base_second_offset` は経過秒数ではなく候補番号。開始日内オフセットに対応する候補の読み飛ばしはない |

GPU の件数式を部分日に対応させるだけでは、正しい日時を検索できない。毎日 `10:30:00` と `11:30:00` を選ぶ条件で `[11:00:00, 12:00:00)` を指定した場合、件数を 1 に変えても候補番号 0 から開始すると `10:30:00` を検索する。開始候補番号 1 と終了候補番号 2 を渡す必要がある。

### 1.4 期待効果

| 項目 | 期待効果・完了時の判断基準 |
|------|--------------------------|
| 責務の集約 | 各検索器から日時の実在性判定、区間演算、独自の件数式を削除する |
| CPU/GPU の一致 | 同じ探索空間について件数・日時順序・Seed・結果に表示する日時が一致する |
| 型による保証 | 入力変換後の内部処理は、有効な探索空間だけを受け取り、日付を繰り返し検証しない |
| 変換経路の削減 | 旧 `SearchRangeParams` と新型を往復させる互換変換を設けない |
| 列挙の仕事量 | 対象外の経過秒を全走査する処理を廃止する。実際の速度は別途計測する |

### 1.5 着手条件

本書の対象は日時探索基盤の再設計である。既存 CPU 4 種の日時検索と GPU の MT Seed 日時検索を、対象 API の変更を含めて同じ変更単位で移行する。

ポケモン検索の GPU 化、生成アルゴリズム、個体値、エンカウント対応範囲、結果件数制限、進捗集約器全体の再設計は対象外とする。日時候補数と個体の消費位置数も混同しない。

確認したリポジトリ内では、タスク生成は `src/services/search-tasks.ts` から利用される。`split_search_range()` のアプリからの直接利用は見当たらない。Worker タスクは永続化せず、各検索画面は UI の日付・時刻条件を保存している。外部利用者の存在までは確認していないが、本書では旧 WASM API を維持する互換層を用意しない。

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/core/datetime.rs` | 新規 | `DatetimeSearchSpace`、そのイテレータ、暦変換、候補番号との対応 |
| `wasm-pkg/src/core/mod.rs` | 更新 | 共通処理の公開 |
| `wasm-pkg/src/core/datetime_codes.rs` | 更新 | 月日数・閏年・暦変換の所属を整理。既存 BCD テーブルは利用する |
| `wasm-pkg/src/types/search.rs` | 置換・削除 | `SearchRangeParams` を廃止。転送型を追加し、各検索パラメータの日時部分を置換。旧検証・変換・件数メソッドを削除 |
| `wasm-pkg/src/datetime_search/base.rs` | 縮小 | 日時探索空間の列挙結果をハッシュへ変換する処理に集約。旧秒走査・選別テーブル・暦変換を削除 |
| `wasm-pkg/src/datetime_search/mod.rs` | 削除・更新 | 旧 `split_search_range()` と公開を削除。分割の呼び出しを移行 |
| `wasm-pkg/src/datetime_search/pokemon.rs` | 更新 | 日時検証・独自件数式を削除。日時列挙終了と生成状態から完了を判定 |
| `wasm-pkg/src/datetime_search/mtseed.rs`、`egg.rs`、`trainer_info.rs` | 更新 | 共通入力変換・分割・件数・列挙を利用 |
| `wasm-pkg/src/gpu/datetime_search/iterator.rs` | 更新 | 保証済み探索空間を保持し、候補番号区間の残数で dispatch を制御 |
| `wasm-pkg/src/gpu/datetime_search/pipeline.rs` | 更新 | 探索空間から定数を設定し、同じ番号体系で結果日時を復元 |
| `wasm-pkg/src/gpu/datetime_search/shader.wgsl` | 更新 | 番号の名称・契約を統一。日内直積から日時を算出する処理は利用 |
| `wasm-pkg/src/types/mod.rs`、`lib.rs` | 更新 | 廃止型・関数の公開削除、新しい転送型の公開 |
| `src/services/search-tasks.ts`、`src/workers/types.ts` | 確認 | 生成型を直接参照するため手編集不要。新契約のタスクと例外をそのまま伝播することを確認 |
| `src/workers/search.worker.ts`、`gpu.worker.ts` | 更新 | 全検索器の空探索で 0/0・100% の進捗通知。GPU の例外は既存のエラー通知・解放処理へ伝播 |
| `src/wasm/` | 再生成 | WASM と TypeScript バインディングを同時に更新。生成物を手編集しない |
| `wasm-pkg/src/` の関連テスト・`wasm-pkg/tests/`・`wasm-pkg/benches/` | 更新 | 旧入力型・公開関数の参照移行、境界・CPU/GPU 比較・性能検証 |
| `src/test/integration/`、`src/test/unit/workers/`、日時入力のテスト補助 | 更新 | Worker タスクの形式と例外、結果の回帰検証 |
| `spec/agent/architecture/rust-structure.md`、`worker-design.md` | 更新 | 共通日時処理の配置・責務、転送境界と空探索の契約を反映 |
| `wasm-pkg/examples/datetime_space_bench.rs`、`.json`、`scripts/bench-datetime-space.cjs` | 新規 | native/WASM の条件固定・5回計測用の再現手順 |

## 3. 設計方針

### 3.1 内部型の責務

`DatetimeSearchSpace` が入力変換・分割・件数・列挙・候補番号との対応を担う。区間は標準の `Range<u32>`、時刻条件は非公開の開始値と要素数で表現する。

イテレータは列挙位置と日付キャッシュを所有する。型を分離する場合は、独立した不変条件・利用者・処理を明確にする。

転送用 `DatetimeSearchSpaceParams` はシリアライズ境界だけで使用する。ここに検証や件数のメソッドを置かず、内部型に未検証の値を保持させない。境界を越えない内部処理で転送型を生成して再パースする経路は作らない。

### 3.2 維持する契約と廃止する契約

| 区分 | 判断と理由 |
|------|------------|
| UI の `DateRangeParams`・`TimeRangeParams` | 維持する。入力途中の状態、画面の意味、保存済み条件を表す役割がある。ただし計算メソッドは内部型へ移す |
| 日付の両端を含む UI 指定、時・分・秒の独立軸 | 維持する。検索対象そのものの意味である |
| `SearchRangeParams`・公開 `split_search_range()` | 廃止する。現行の年月日・オフセット・長さへ戻す必要がなくなる |
| 検索結果・生成条件・Worker の結果通知 | 維持する。日時基盤の変更で意味を変える理由がない |
| 旧タスク形式の読み込み | 対応しない。新旧両用のフィールド、非推奨 alias、移行用フォールバックを作らない |
| CPU の対象外秒走査 | 廃止する。同じ時刻条件を選別テーブルでも解釈する責務が残るため |
| SHA-1 SIMD、日時 BCD テーブル、GPU の直積分解 | 利用する。ハッシュ計算・GPU 並列実行という独立した役割がある |

### 3.3 共通化する意味と実行方式

共通化するのは候補番号と日時の対応である。CPU は候補を順に取り出し、GPU は各スレッドが番号から日時を求める。CPU イテレータを GPU に移植したり、GPU 向けに全候補を列挙して転送したりしない。

CPU の最初の候補は `datetime_at()` で求める。後続は `DatetimeSearchIter` 内で秒・分・時を許容軸の範囲内で繰り上げ、日が変わる場合だけ暦変換する。候補番号区間は列挙位置と終端の管理に使う。毎候補の除算方式は密な WASM 検索で 5% 超の遅延が再現したため変更した（5.5 節）。繰り上げ列挙と候補番号からの直接変換の一致を参照テストで検証している。

CPU の列挙方式は、5 節の疎な条件・密な条件の双方で性能を評価する。性能対策も共通の探索空間内で行う。

### 3.4 分割単位

タスク分割は、Worker の負荷分配を維持するため経過秒数による等分割とする。候補のない部分区間も正確に 0 件として扱う。

分割数は `NonZeroU32` を内部で受け取り、外部の `worker_count = 0` はエラーにする。旧 `split_search_range(range, 0)` の「1 に補正する」公開契約は廃止する。起動条件の展開・重複保持は既存処理を利用する。

## 4. 実装仕様

### 4.1 表現と入力境界

転送形式は以下に統一する。各 CPU 検索パラメータの `search_range` と `time_range` を `search_space` に置き換える。

```rust
// types/search.rs: tsify + serde で公開する未検証の転送形式
pub struct DatetimeSearchSpaceParams {
    pub start_seconds: u32,
    pub end_seconds: u32,
    pub time_range: TimeRangeParams,
}
```

内部型は半開区間と計算に使う軸の開始値・要素数を保持する。具体的なメソッド契約は以下とする。コード例は責務を示す抜粋である。

```rust
// core/datetime.rs: フィールドは非公開、未検証 Deserialize を実装しない
pub struct DatetimeSearchSpace {
    seconds: std::ops::Range<u32>,
    starts: [u8; 3], // 時・分・秒
    counts: [u8; 3], // 全要素が 1 以上
}

// from_date_range(date_range, time_range) -> Result<Self, String>
// TryFrom<DatetimeSearchSpaceParams> -> Result<Self, String>
// split(NonZeroU32) -> Vec<Self>
// count() -> u64
// iter() -> DatetimeSearchIter
// candidate_bounds() -> (基準日の通算日番号, Range<u32>)
// datetime_at(基準日からの候補番号) -> Option<Datetime>
// into_params() -> DatetimeSearchSpaceParams
```

`candidate_bounds()` の基準日は必ず当該探索空間の開始秒の属する日とする。`datetime_at()` には同じ探索空間の候補番号だけを指定し、番号が候補区間外なら `None` を返す。各候補の年月日を検証し直す処理はない。

入力の条件:

- `0 <= start_seconds <= end_seconds <= 3_155_760_000`。上限は 2100-01-01 00:00:00。終了境界専用として許し、候補には含めない。
- `start_seconds == end_seconds` は有効な空区間。上限位置での空区間も許す。空区間から年月日・BCD コードを生成しない。
- UI の開始日・終了日は実在する 2000〜2099 年の日付で、開始日が終了日以前であること。同日も許す。
- 時は 0〜23、分秒は 0〜59。各軸は開始値が終了値以下で、両端を含む。逆転は補正せずエラーにする。

UI 日付の実在性を確認してから暦変換する。終了日の翌日の午前 0 時を終了境界とし、2099 年末では日番号に 1 を加えて上限境界を作る。2100 年の日付を通常の検索候補として構築しない。

境界の経路:

```text
UI の日付・時刻条件
  → Main の WASM: DatetimeSearchSpace を構築
  → 内部の split: 保証済みの子探索空間を構築
  → into_params: Worker 転送用入力へ変換
  → Worker の WASM: TryFrom で保証を再構築
  → CPU 検索器: 保証済みの探索空間を受け取る

GPU Worker の既存 context 入力
  → GPU create: 同じ from_date_range で構築
  → Pipeline: 保証済みの探索空間を受け取る
```

WASM 境界を越えた再パースは必要な処理である。GPU の内部 Pipeline 作成や条件切り替え時には、転送型を経由しない。旧 GPU `build_params()` が内部で CPU 用 `MtseedDatetimeSearchParams` を作り直す経路も削除する。

### 4.2 件数と候補番号

1 日の候補数を `D = H × M × S` とする。`H`、`M`、`S` は各軸の要素数で、すべて正である。

日内秒 `r` 未満の候補数を `C(r)` とする。`r` の時・分・秒を順に比較し、全て終わった許容時の数×`M×S`、現在の許容時内で終わった許容分の数×`S`、現在の許容分内で終わった許容秒の数を加える。現在の時または分が条件外なら、下位軸の寄与は 0 とする。対象日時を列挙せず、各軸の差を 0〜要素数に制限する定数回の計算で求める。

```text
F(t) = floor(t / 86400) × D + C(t % 86400)
count = F(end) - F(start)

anchor_day = floor(start / 86400)
begin = F(start) - anchor_day × D
finish = F(end) - anchor_day × D
候補番号区間 = [begin, finish)
```

`F(t)` は `t` 未満の候補数なので、境界が許容時刻と一致した場合も開始を含み終了を含まない。件数と GPU の区間長は同じ式から導出する。`count`、`begin`、`finish` を転送フィールドに追加して入力との整合性を別途検証する設計にはしない。

候補番号 `i` の日時:

```text
day = anchor_day + floor(i / D)
j = i % D
hour = hour_start + floor(j / (M × S))
minute = minute_start + floor((j % (M × S)) / S)
second = second_start + (j % S)
```

全 100 年でも候補数は最大 3,155,760,000 なので、候補番号・区間の排他的終端は `u32` に収まる。起動条件数や消費位置数との積は別に `u64` で計算し、オーバーフローを確認する。GPU の `max(count, 1)` による不正な 0 要素数の救済は不要になり、両側から取り除く。

### 4.3 分割と CPU 検索

分割長は `ceil((end - start) / n)`、子区間は重複しない半開区間とする。空区間の分割結果は空区間一つ。要求分割数が秒数より多い場合、1 秒未満に分割せず、要求数分の不要な容量も確保しない。各子探索空間は自分の開始日を基準に候補番号を求める。子ごとの候補番号をそのまま連結せず、日時の列で分割前との一致を評価する。

`DatetimeSearchIter` は構築時に候補番号区間と最初の日時を求め、その現在位置・通算日・次の日時を保持し、候補だけを取り出す。件数 0 のときは直ちに終了する。候補ごとの区間再構築、暦検証、日内条件の再検証、対象外秒の探索はしない。

`DatetimeHashGenerator` はこのイテレータから最大 4 日時を取り出し、既存の `get_date_code()` と `get_time_code_for_hardware()` でハッシュ入力を作る。`DateTimeCodeEnumerator`、`RangedTimeCodeTable`、`build_ranged_time_code_table()`、未使用の `current_seconds()` は削除する。

各検索器の総件数は共通の `count()` から取得する。ポケモン検索だけは従来どおり消費位置数 `max_advance - user_offset` を掛ける。消費位置数 0 なら Seed の生成を始めず完了する。

ポケモン検索の `prepare_current()` は「生成可能」「日時を使い切った」「生成器構築エラー」を区別する。日時を使い切った状態を `Datetime count mismatch` にしない。完了は日時イテレータの終了、保留 Seed が空、実行中生成器がないことから判断する。進捗件数の一致は検証にも使うが、独自の件数式で列挙を打ち切らない。

### 4.4 GPU 検索と結果復元

`GpuDatetimeSearchIterator` は探索空間と現在の候補番号を保持する。`calculate_seconds_in_range()`、`seconds_per_combo()` の独自計算を削除する。開始候補番号を `begin`、終了を `finish` とし、以下で処理する。

```text
remaining = finish - current_candidate
dispatch_count = min(remaining, device_limit)
dispatch_base = current_candidate
current_candidate += processed
```

件数は GPU の実行範囲そのものであり、単に進捗表示だけには使わない。番号が `finish` に達したら次の起動条件へ進む。条件を切り替えたら候補番号を `begin` に戻す。空探索では Pipeline・日付コードを構築せず終了できる構成にする。

`SearchPipeline::new()` は DS 設定・目標 Seed・起動条件・保証済み探索空間を受け取る。GPU 定数は探索空間から基準日と各軸を取り出して構築する。基準日は区間開始日を用い、常に 2000 年から年を走査するような性能低下を持ち込まない。

Rust の `DispatchState` と WGSL のフィールドを同時に `base_candidate_index` に変更する。WGSL の `idx` はバッチ内番号のまま保持し、`base_candidate_index + idx` を候補番号として日時を算出する。端数スレッドは既存の `idx >= message_count` で除外する。

出力レコードの番号は引き続きバッチ内番号とする。`read_results()` は `record.message_index < dispatch_count` を確認してから、実際に dispatch した開始候補番号を一度だけ加算し、同じ探索空間の `datetime_at()` で復元する。区間開始分を二重加算しない。バッチ外・区間外のレコード番号は正常な一致結果として返さず、読み取りエラーとして伝播する。

このエラーを返すため、`read_results()` と `dispatch()` は `Result` を返す契約へ変更する。公開 `next()` は `Result<Option<GpuSearchBatch>, String>` とし、正常終了の `None` とエラーを区別する。GPU Worker の既存エラー通知へ接続し、エラーを検索完了として扱わない。

`offset_to_datetime()` とそこだけで必要な `offset_to_date()` は削除する。WGSL は同じ数式を実装する必要があるため残すが、Rust の別の日時復元式は残さない。GPU のシェーダー変更と CPU 側の定数・復元処理は同じコミット単位で整合させる。

### 4.5 API・呼び出し元の移行

各 `generate_*_search_tasks()` は不正日時を `Result` で返す。例外を空配列・0 件に置換しない。TypeScript 呼び出し元と Worker のエラー通知へ伝播させる。旧 API を残したまま新 API を追加する並行移行はしない。

UI 入力型と保存形式を維持するため、本変更で localStorage の移行は行わない。UI の入力途中のチェックと、WASM 境界での内部型構築は役割が異なる。`src/services/search-estimation.ts` の検索前見積もりは画面用として残せるが、実行タスクの件数・終了判定には使用しない。見積もりと丸日探索の共通件数が一致することを統合テストで確認する。

移行後、`SearchRangeParams`、`to_search_range()`、`split_search_range()`、各検索器の旧件数関数の実行コード参照を 0 にする。過去の完了仕様書の記録は書き換えない。

### 4.6 実装レビュー観点

| 対象 | 確認事項 |
|------|----------|
| 責務の集約 | 各検索器に日時の検証・区間演算・独自の件数式が残っていないこと |
| 転送境界 | 転送型を境界だけで使用し、Pipeline 作成や条件切り替えで再パースしないこと |
| API 移行 | 旧型の alias・互換変換・フォールバックがないこと |
| CPU 列挙 | ハッシュ生成器が新イテレータを直接利用し、旧列挙器・選別テーブルが削除されていること |
| 候補番号 | 番号・件数を秒区間から導出し、独立した入力値として保持していないこと |
| GPU の日時対応 | 部分日で実際に検索した日時と表示日時が一致すること |
| CPU 性能 | 日付キャッシュが有効で、密な条件でも回帰を評価していること |
| 空区間 | 上限空区間から 2100 年の候補・BCD を作る経路がないこと |

## 5. テスト方針

### 5.1 正しさ

| 分類 | 対象 | 検証内容 |
|------|------|----------|
| 入力変換 | 暦・各軸・秒区間 | 2000 年の閏日、非閏年の 2/29、月 0/13、日 0・月末超過、逆転、範囲外、軸の逆転を確認。不正入力を正規化しない |
| 境界 | 半開区間 | `[0,0)`、1 秒、日跨ぎ、年跨ぎ、末尾 1 秒、上限空区間、上限超過を確認 |
| 時刻条件 | 独立軸の直積 | `10〜11 時・30 分・0 秒` が 2 候補になる。条件の外側・境界上で開始終了する部分日を確認 |
| 件数・列挙 | 共通処理 | 短い区間の単純な参照列挙と全日時が一致し、`count()` と列挙長が一致する。参照側は本番の候補番号式を流用しない |
| 分割 | 空・部分日・多分割 | 子区間の日時列を順につなぐと元の列に一致。欠落・重複なし。子件数の和も一致 |
| 番号対応 | 逆変換 | 最初・最後・区間外・日跨ぎの番号を確認。`[11:00,12:00)` の例で `[1,2)` を確認 |
| CPU 回帰 | 4 検索器 | 既知日時の LCG/MT Seed、タマゴ、ID、ポケモン生成結果が一致。ポケモンはバッチ分割・保留 Seed・消費位置 0 を含む |
| GPU 回帰 | シェーダー・読み取り | 基準日、午後フラグ、閏日、年跨ぎ、部分日、複数バッチ・条件切り替えで CPU と Seed・日時が一致 |
| GPU 件数 | dispatch | 0 件を dispatch しない。開始番号が 0 でない区間、バッチ端数、出力番号の不正値で契約を確認 |
| Worker/WASM | 型生成・直列化 | 新タスク往復、改変した未検証入力の拒否、エラー通知、空探索の完了、キャンセルと解放を確認 |
| 画面見積もり | 丸日入力 | 日付・時刻条件からの見積もりが Rust の日時候補数と一致。実行の正しさを見積もりに依存させない |

CPU/GPU の比較は一致件数だけで済ませない。狭い区間の全候補に対応する MT Seed を参照側で用意し、返された LCG Seed と日時の組まで照合する。GPU が利用できずスキップした結果を検証成功に含めず、実 GPU 環境の実行記録を残す。

### 5.2 性能要件と計測

| 項目 | 要件・計測方法 |
|------|----------------|
| 候補数 | 全候補の列挙や巨大なベクタを使わず算出する。軸ごとの定数回の処理 |
| 探索空間の保持 | 日時範囲の長さに比例するメモリを確保しない。旧 86,400 要素の選別テーブルは廃止 |
| CPU 列挙 | 全時刻・毎分 1 秒・毎日 1 秒の条件で比較。日付キャッシュの効果と候補生成時間を測る |
| CPU 全体 | MT Seed 検索とポケモン検索の既存条件を固定し、release native/WASM の候補毎秒・完了時間を測る |
| GPU | 同じデバイス・dispatch 設定で丸日と部分日を比較。起動時処理と検索時間を区別 |
| 回帰判断 | 基点と実装後を同環境で各 5 回以上測定し中央値を比較。密な条件で 5% 超の低下を調査基準とし、再測定と原因・採否を記録してから完了判断する |

疎な条件で走査回数が減ることと、全検索の実測速度が改善することを区別する。

### 5.3 実装時の検証コマンド

```powershell
cargo test --package wasm-pkg
cargo test --package wasm-pkg --features gpu
cargo clippy --package wasm-pkg --all-targets -- -D warnings
cargo clippy --package wasm-pkg --all-targets --features gpu -- -D warnings
pnpm build
pnpm exec tsc -b --noEmit
pnpm test:run
pnpm format:check
```

### 5.4 検証結果（2026-09-06）

| 検証 | 結果 |
|------|------|
| `cargo test --package wasm-pkg` | 単体 317 件、統合 8 件成功。既存の手動実行用 2 件は除外 |
| `cargo test --package wasm-pkg --features gpu` | 単体 352 件、統合 8 件成功。手動実行用 8 件は除外 |
| `cargo test --release --package wasm-pkg --features gpu gpu::datetime_search -- --ignored --nocapture --test-threads=1` | RTX 5090 上で追加した 3 件を明示実行し成功。スキップで代替していない |
| CPU/GPU 対応 | DS Lite / 3DS、基準日・午後・閏日・日跨ぎ・年跨ぎ・2099 年末・開始番号が非 0 の部分日について全候補の日時と LCG Seed を比較。GPU はバッチ上限 3、端数、2 起動条件を含む |
| 読み取り・空区間 | バッチ外、候補区間外、加算オーバーフローをエラーとして拒否。上限空区間では Pipeline を生成せず終了 |
| 共通探索空間 | 6 種の時刻条件について全日内秒の累積件数を独立の秒走査と比較。部分日・多分割・番号変換・上限・入力拒否・直列化往復が一致 |
| `pnpm test:run` | 128 ファイル・1,500 件成功。既存の条件付きテスト 5 件は除外。追加 4 件で CPU 4 種の不正入力拒否、空区間 0/0・100% 通知、画面見積もりとの一致を検証 |
| `pnpm build` / `pnpm exec tsc -b --noEmit` | 本番 WASM、バインディング再生成、型検査、Vite ビルド成功 |
| clippy / oxlint | GPU 有無それぞれの `cargo clippy --package wasm-pkg --all-targets ... -- -D warnings` と `pnpm exec oxlint` 成功 |
| `pnpm format:check` | 成功 |
| 廃止処理の残存確認 | `wasm-pkg/`・`src/`・`scripts/` の旧型・旧分割・旧列挙器・旧件数関数・GPU 旧復元関数の参照 0 件 |

WASM の初回ビルドは一時ディレクトリのアクセス拒否で停止した。コードを変更せず実行権限を調整した再実行で成功した。依存 wgpu 系の将来互換性通知と Vite の既存サイズ警告は残る。

### 5.5 性能測定と判断

Windows、Ryzen 9 9950X3D、RTX 5090、Rust `1.99.0-nightly (3d6c19bb9 2026-08-11)`、Node `v24.13.0`。基点コードと完成版を同じ release 設定でビルドし、他のテスト・ビルドが終了してから各条件 5 回の中央値を採用した。WASM は `wasm-pack --target nodejs --release -- --features gpu` と同一の wasm-opt 設定で比較した。ブラウザ固有の Worker 転送時間はこの表に含めず、Chromium 統合テストで結果・通知・キャンセルを回帰検証した。

条件は 2024-02-29 から 7 日間、起動条件 1 組。ポケモン検索は固定シンボル・30 消費位置・対象外種族のフィルタとし、結果配列の大きさを固定した。

| 条件 | 日時候補数 | ポケモン消費位置数 |
|------|------------|------------------|
| 全時刻 | 604,800 | 18,144,000 |
| 毎分 0 秒 | 10,080 | 302,400 |
| 毎日 00:00:00 | 7 | 210 |

以下は完了時間の中央値 (ms)、左が基点、右が完成版。

| 環境・対象 | 全時刻 | 毎分 0 秒 | 毎日 00:00:00 |
|------------|--------|-----------|----------------|
| native 列挙 | 2.1204 → 0.7952 | 0.4414 → 0.0147 | 0.4066 → 0.0002 |
| native MT Seed | 37.4918 → 37.3020 | 1.0600 → 0.6378 | 0.4240 → 0.0008 |
| native ポケモン | 243.1839 → 232.0419 | 4.4400 → 3.8266 | 0.4269 → 0.0028 |
| WASM MT Seed | 40.2781 → 39.2496 | 1.0235 → 0.6825 | 0.3294 → 0.0050 |
| WASM ポケモン | 382.9450 → 385.3463 | 6.6570 → 6.2833 | 0.3390 → 0.0145 |

native 列挙の基点は旧列挙器の日時・BCD 出力、完成版は日時イテレータの出力を計測している。BCD を含む全体の比較は MT Seed 行を使う。毎日 1 候補の完成版は計測分解能・呼び出しオーバーヘッドの影響が大きいため、倍率を一般化しない。

毎候補の候補番号分解方式では、密な WASM MT Seed 検索が初回約 5.7%、除算を整理した再測定でも約 6.1% 遅くなった。native 列挙も 2.13 ms に対し 3.43 ms、除算整理後 2.58 ms だった。日時探索空間のイテレータ内で時刻軸を繰り上げる方式へ変更し、CPU/GPU の対応検証を再実行した。最終の密な条件では native MT Seed -0.51%、native ポケモン -4.58%、WASM MT Seed -2.55%、WASM ポケモン +0.63%。5% 超の低下は残らず、この方式を採用した。

GPU は同じデバイス・1 dispatch 最大 1,024 候補で、Pipeline 作成と検索を分離して各 5 回計測した。丸日 86,400 候補は作成 82.1903 ms / 検索 37.7125 ms、部分日 `[11:00,12:00)` の 3,600 候補は作成 81.8843 ms / 検索 1.9771 ms。同期・readback を含む測定で、GPU 単体のハッシュ処理能力を示す値ではない。

再現用の条件は `wasm-pkg/examples/datetime_space_bench.json`。実行例:

```powershell
cargo run --release --example datetime_space_bench -- wasm-pkg/examples/datetime_space_bench.json
wasm-pack build wasm-pkg --target nodejs --out-dir ../target/datetime-bench-wasm --release -- --features gpu
node scripts/bench-datetime-space.cjs target/datetime-bench-wasm/wasm_pkg.js wasm-pkg/examples/datetime_space_bench.json
cargo test --release --package wasm-pkg --features gpu gpu::datetime_search -- --ignored --nocapture --test-threads=1
```

基点側の条件は同じ年月日・期間・時刻軸を当時の入力形式にして比較した。旧入力を受け付ける互換処理は完成版に残していない。

## 6. 実装チェックリスト

- [x] 現行 CPU/GPU と Worker の経路を確認する
- [x] 用語、対象範囲、保証する境界、廃止する API を定義する
- [x] 新しい責務ごとに削除対象を対応させ、自己レビューする
- [x] 参照列挙・境界・GPU 部分日の回帰テストを用意する
- [x] 共通探索空間・転送型を実装し、旧日時型と変換関数を削除する
- [x] CPU 4 検索器・タスク生成・Worker を新契約へ移行する
- [x] GPU の開始番号・件数・結果復元を一体で移行する
- [x] 旧ラッパー・独自件数式・暦計算・選別テーブルの残存を確認する
- [x] WASM バインディングを再生成して全経路を検証する
- [x] 実 GPU 比較・native/WASM 性能計測と判断を記録する
- [x] 実装差分に対して再度自己レビューし、仕様と配置資料を更新する
- [x] 検証完了後に `spec/agent/complete/local_121/` へ移動する
