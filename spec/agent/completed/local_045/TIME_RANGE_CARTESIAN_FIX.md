# TimeRange 独立軸直積化修正 仕様書

## 1. 概要

### 1.1 目的

CPU 側の時刻範囲処理 (`build_ranged_time_code_table` / `count_valid_seconds`) が連続区間として実装されており、GPU 側の独立軸直積と不整合を起こしている。これを GPU 側と同じ独立軸直積に統一する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| 連続区間 | `HH:MM:SS ~ HH:MM:SS` で表される 1 次元の秒数列。時分秒を通算秒に変換し、start から end まで連番で列挙する |
| 独立軸直積 | `hour_start~hour_end × minute_start~minute_end × second_start~second_end` の 3 軸直積。各軸が独立した範囲を持つ |
| `TimeRangeParams` | `wasm-pkg/src/types/search.rs` で定義。`hour_start`, `hour_end`, `minute_start`, `minute_end`, `second_start`, `second_end` の 6 フィールド |
| `RangedTimeCodeTable` | `Box<[Option<u32>; 86400]>`。1 日 86,400 秒分のルックアップテーブル。`Some(time_code)` が検索対象の秒を示す |
| `DateTimeCodeEnumerator` | `RangedTimeCodeTable` を走査し、有効な日時エントリを順次返す列挙器 |

### 1.3 背景・問題

`TimeRangeParams` は 6 フィールド (`hour_start/end`, `minute_start/end`, `second_start/end`) を持つが、その解釈が CPU 側と GPU 側で異なる。

**具体例**: `hour: 10~12, minute: 20~40, second: 0~59`

| 方式 | 列挙される時刻 | 有効秒数 |
|------|-------------|---------|
| 連続区間 (CPU 側・現状) | `10:20:00 ~ 12:40:59` — 途中の 10:41:00, 11:00:00 等も含む | `12*3600+40*60+59 - 10*3600+20*60+0 + 1 = 8,460` |
| 独立軸直積 (GPU 側・正) | `10:20:00 ~ 10:40:59`, `11:20:00 ~ 11:40:59`, `12:20:00 ~ 12:40:59` | `3 * 21 * 60 = 3,780` |

この不整合により:
- CPU と GPU で異なる検索結果が返る
- 進捗表示が CPU / GPU 検索で不正確になる (有効秒数の計算が異なるため)

**影響範囲**:

| ファイル | 問題箇所 |
|---------|---------|
| `wasm-pkg/src/datetime_search/base.rs` | `build_ranged_time_code_table()` — 連続区間としてテーブルを構築 |
| `wasm-pkg/src/types/search.rs` | `count_valid_seconds()` — 連続区間の秒数を返す |
| `wasm-pkg/src/datetime_search/mtseed.rs` | `count_valid_seconds()` を呼び出して進捗計算 |
| `wasm-pkg/src/datetime_search/trainer_info.rs` | 同上 |
| `wasm-pkg/src/datetime_search/egg.rs` | 同上 |
| `wasm-pkg/src/gpu/datetime_search/iterator.rs` | `count_valid_seconds()` を呼び出して進捗計算 (GPU 側も影響) |

### 1.4 期待効果

| 指標 | 修正前 | 修正後 |
|------|--------|--------|
| CPU/GPU の検索結果一致 | 不一致 (意図しない時刻が含まれる/欠落する) | 一致 |
| `count_valid_seconds()` の正確性 | 連続区間の秒数を返す | 直積の組み合わせ数を返す |
| 進捗表示の正確性 | CPU/GPU で不正確 | CPU/GPU とも正確 |

### 1.5 着手条件

- [x] bug の存在を確認済み (`FORM_COMPONENTS.md` Section 4.3.6)
- [x] GPU 側の正しい実装を確認済み (`shader.wgsl`)
- [x] 参考実装 (niart120/pokemon-gen5-initseed) の `combosPerDay = hourRange.count * minuteRange.count * secondRange.count` で独立軸直積が正であることを確認済み

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/search.rs` | 修正 | `count_valid_seconds()` を直積に修正 |
| `wasm-pkg/src/datetime_search/base.rs` | 修正 | `build_ranged_time_code_table()` を直積に修正 |
| `wasm-pkg/src/datetime_search/mtseed.rs` | 修正 | 既存テストを直積ベースに修正 |
| `wasm-pkg/src/datetime_search/base.rs` (テスト) | 修正 | 既存テスト + 直積検証テスト追加 |

## 3. 設計方針

### 3.1 修正方針

GPU 側 (`shader.wgsl`) の実装が正しいため、CPU 側をそれに合わせる。

- `build_ranged_time_code_table()`: 3 重ループを単純な全範囲イテレーションに変更
- `count_valid_seconds()`: 各軸の count の積に変更
- 呼び出し側 (mtseed, trainer_info, egg, gpu/iterator) は `count_valid_seconds()` の戻り値を使うだけなので、関数シグネチャの変更は不要

### 3.2 パフォーマンスへの影響

`build_ranged_time_code_table()` はイテレーション回数が変わるが、86,400 秒分のテーブル構築は十分高速なため問題ない。テーブルサイズ自体は変わらない (`Box<[Option<u32>; 86400]>`)。

### 3.3 既存テストへの影響

`count_valid_seconds()` のテストケースは修正が必要。既存のテストケースは:
- `hour: 10, minute: 0, second: 0~59` → 60 秒 (連続区間と直積で同じ値)
- `hour: 0~23, minute: 0~59, second: 0~59` → 86,400 秒 (同上)

これらは hour/minute が範囲を持たない (start=end) か全範囲なので、連続区間と直積で結果が一致する。テストとしては通過し続けるが、不整合を検出できないため、軸が独立であることを確認するテストケースを追加する。

## 4. 実装仕様

### 4.1 `count_valid_seconds()` の修正

```rust
// wasm-pkg/src/types/search.rs

impl TimeRangeParams {
    /// 有効な秒数をカウント (独立軸の直積)
    pub fn count_valid_seconds(&self) -> u32 {
        let hours = u32::from(self.hour_end) - u32::from(self.hour_start) + 1;
        let minutes = u32::from(self.minute_end) - u32::from(self.minute_start) + 1;
        let seconds = u32::from(self.second_end) - u32::from(self.second_start) + 1;
        hours * minutes * seconds
    }
}
```

### 4.2 `build_ranged_time_code_table()` の修正

```rust
// wasm-pkg/src/datetime_search/base.rs

fn build_ranged_time_code_table(
    range: &TimeRangeParams,
    hardware: Hardware,
) -> RangedTimeCodeTable {
    let mut table: RangedTimeCodeTable = Box::new([None; 86400]);
    let is_ds_or_lite = matches!(hardware, Hardware::DsLite | Hardware::Ds);

    // 各軸を独立にイテレーション (直積)
    for hour in range.hour_start..=range.hour_end {
        for minute in range.minute_start..=range.minute_end {
            for second in range.second_start..=range.second_end {
                let seconds_of_day =
                    u32::from(hour) * 3600 + u32::from(minute) * 60 + u32::from(second);
                let idx = seconds_of_day as usize;
                table[idx] = Some(get_time_code_for_hardware(seconds_of_day, is_ds_or_lite));
            }
        }
    }
    table
}
```

修正前との差分:
- `minute` のループ範囲: `min_start..=min_end` (hour 依存) → `range.minute_start..=range.minute_end` (固定)
- `second` のループ範囲: `sec_start..=sec_end` (hour, minute 依存) → `range.second_start..=range.second_end` (固定)
- 条件分岐 (`if hour == range.hour_start ...`) の削除

## 5. テスト方針

### 5.1 テスト環境

| 分類 | 実行環境 | コマンド |
|------|---------|---------|
| ユニットテスト | `cargo test` | `cargo test --package wasm-pkg` |

### 5.2 テスト対象

#### `count_valid_seconds()` テスト修正・追加

| テストケース | 入力 | 期待値 | 備考 |
|-------------|------|--------|------|
| 単一時間 60 秒 | `hour: 10~10, min: 0~0, sec: 0~59` | 60 | 既存 (修正不要) |
| 全日 | `hour: 0~23, min: 0~59, sec: 0~59` | 86,400 | 既存 (修正不要) |
| 独立軸直積の検証 | `hour: 10~12, min: 20~40, sec: 0~59` | `3 * 21 * 60 = 3,780` | **新規追加** — 連続区間なら 8,460 になるため不一致を検出可能 |
| 各軸 1 値 | `hour: 5~5, min: 30~30, sec: 15~15` | 1 | **新規追加** |
| 秒だけ範囲あり | `hour: 0~0, min: 0~0, sec: 10~20` | 11 | **新規追加** |

#### `build_ranged_time_code_table()` テスト修正・追加

| テストケース | 入力 | 期待値 | 備考 |
|-------------|------|--------|------|
| 全日 86,400 エントリ | `hour: 0~23, min: 0~59, sec: 0~59` | `count = 86,400` | 既存 (修正不要) |
| 単一時間 60 エントリ | `hour: 10~10, min: 0~0, sec: 0~59` | `count = 60` | 既存 (修正不要) |
| 直積で不連続な範囲 | `hour: 10~12, min: 0~0, sec: 0~0` | `count = 3`, `Some` は `10:00:00`, `11:00:00`, `12:00:00` のみ | **新規追加** |
| 直積展開の確認 | `hour: 10~11, min: 30~31, sec: 0~0` | `count = 4`, `Some` は `10:30:00`, `10:31:00`, `11:30:00`, `11:31:00` | **新規追加** — 連続区間なら `10:30:00 ~ 11:31:00` の 3,721 エントリになるため差が大きい |
| 連続区間との差分確認 | `hour: 10~11, min: 58~2` | バリデーションエラー (`minute_start > minute_end`) | 独立軸では各軸 start ≤ end が前提 |

#### CPU/GPU 一致テスト

| テストケース | 検証内容 | 備考 |
|-------------|---------|------|
| テーブルエントリ数 = `count_valid_seconds()` | `build_ranged_time_code_table` で `Some` のエントリ数が `count_valid_seconds()` と一致すること | **新規追加** — 任意の有効パラメータで成立すべき不変条件 |

## 6. 実装チェックリスト

- [x] `wasm-pkg/src/types/search.rs`: `count_valid_seconds()` を直積に修正
- [x] `wasm-pkg/src/datetime_search/base.rs`: `build_ranged_time_code_table()` を直積に修正
- [x] `wasm-pkg/src/datetime_search/mtseed.rs`: `test_time_range_count_valid_seconds` に直積テストケース追加
- [x] `wasm-pkg/src/datetime_search/base.rs`: `test_time_code_table_*` に直積テストケース追加
- [x] テーブルエントリ数と `count_valid_seconds()` の一致テスト追加
- [x] `cargo test --package wasm-pkg` 全テスト通過
- [x] `cargo clippy --all-targets -- -D warnings` 通過
- [x] `cargo fmt --check` 通過
