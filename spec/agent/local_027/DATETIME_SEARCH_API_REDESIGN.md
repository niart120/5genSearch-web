# Datetime Search API 再設計 仕様書

## 1. 概要

### 1.1 目的

起動時刻検索のタスク生成 API を再設計し、以下を実現する:

1. UI フレンドリーな入力形式 (`DateRangeParams`) の導入
2. Worker 数を考慮した自動タスク分割
3. 組み合わせ数が少ない場合の時間ベース分割

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| `DateRangeParams` | 開始日〜終了日を表す UI 入力型 |
| `SearchRangeParams` | 開始日時 + 秒数を表す内部型 |
| `TimeRangeParams` | 1日内の有効時刻範囲 (時分秒フィルタ) |
| 組み合わせ展開 | Timer0 × VCount × KeyCode の全パターン生成 |
| 時間分割 | 検索期間を複数チャンクに分割 |

### 1.3 背景・問題

現状の API には以下の問題がある:

1. **UI との乖離**: `SearchRangeParams` は「開始日 + 秒数」形式で、UI からは「開始日〜終了日」を指定したい
2. **Worker 活用不足**: 組み合わせ数 < Worker 数の場合、Worker が余る
3. **分割責務の曖昧さ**: `split_search_range` は公開されているが、タスク生成関数と連携していない

### 1.4 期待効果

| 項目 | 現状 | 改善後 |
|------|------|--------|
| UI 入力形式 | 開始日 + 秒数 | 開始日〜終了日 |
| Worker 利用率 | 組み合わせ数に依存 | 常に worker_count 個まで活用 |
| API 一貫性 | 3関数がバラバラの引数 | 統一された引数形式 |

### 1.5 着手条件

- `split_search_range` 実装完了 (local_015 由来、実装済み)
- TrainerInfo 検索実装完了 (local_026、実装済み)

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `types/config.rs` | 追加 | `DateRangeParams` 型定義 |
| `types/mod.rs` | 変更 | `DateRangeParams` の re-export |
| `datetime_search/mod.rs` | 変更 | `create_search_range` ヘルパー追加 |
| `datetime_search/mtseed.rs` | 変更 | `generate_mtseed_search_tasks` 引数変更 |
| `datetime_search/egg.rs` | 変更 | `generate_egg_search_tasks` 引数変更 |
| `datetime_search/trainer_info.rs` | 変更 | `generate_trainer_info_search_tasks` 引数変更 |
| `lib.rs` | 変更 | 新型の re-export |

## 3. 設計方針

### 3.1 新しいタスク生成フロー

```
UI入力
  ├─ DatetimeSearchContext (Timer0/VCount/KeyCode 範囲)
  ├─ DateRangeParams (開始日〜終了日)
  └─ TimeRangeParams (時刻フィルタ) ← Context 内に含まれる
           │
           ▼
  generate_*_search_tasks(context, date_range, worker_count, ...)
           │
           ├─ DateRangeParams → SearchRangeParams 変換
           ├─ expand_combinations() で組み合わせ展開
           └─ split_search_range() で時間分割
           │
           ▼
  組み合わせ × 時間チャンク のクロス積
           │
           ▼
  Vec<*SearchParams>
```

### 3.2 分割アルゴリズム

```rust
fn generate_tasks(
    combinations: Vec<StartupCondition>,
    search_range: SearchRangeParams,
    worker_count: u32,
    /* other params */
) -> Vec<Params> {
    // 時間チャンク数 = ceil(worker_count / combo_count)
    let combo_count = combinations.len() as u32;
    let time_chunks = if combo_count == 0 {
        1
    } else {
        worker_count.div_ceil(combo_count)
    };
    let ranges = split_search_range(search_range, time_chunks);

    // 組み合わせ × 時間チャンク のクロス積
    combinations.iter()
        .flat_map(|c| ranges.iter().map(|r| Params { condition: c, search_range: r, ... }))
        .collect()
}
```

常に時間分割を適用することで:
- ロジックがシンプルになる
- 組み合わせ数が多い場合でも、長期間検索で各 Worker の負荷が均等化される

### 3.3 SearchRangeParams の扱い

- **公開維持**: Worker パラメータとして使用されるため、公開を維持
- **推奨非推奨**: UI からは `DateRangeParams` を使用することを推奨
- **内部変換**: `DateRangeParams` → `SearchRangeParams` の変換関数を提供

## 4. 実装仕様

### 4.1 DateRangeParams 型定義

```rust
// types/config.rs

/// 日付範囲パラメータ (UI 入力用)
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct DateRangeParams {
    /// 開始年 (2000-2099)
    pub start_year: u16,
    /// 開始月 (1-12)
    pub start_month: u8,
    /// 開始日 (1-31)
    pub start_day: u8,
    /// 終了年 (2000-2099)
    pub end_year: u16,
    /// 終了月 (1-12)
    pub end_month: u8,
    /// 終了日 (1-31)
    pub end_day: u8,
}

impl DateRangeParams {
    /// バリデーション
    pub fn validate(&self) -> Result<(), String> {
        // 年範囲チェック
        if self.start_year < 2000 || self.start_year > 2099 {
            return Err("start_year must be 2000-2099".into());
        }
        if self.end_year < 2000 || self.end_year > 2099 {
            return Err("end_year must be 2000-2099".into());
        }
        // 開始 <= 終了 チェック
        let start = (self.start_year, self.start_month, self.start_day);
        let end = (self.end_year, self.end_month, self.end_day);
        if start > end {
            return Err("start date must be <= end date".into());
        }
        Ok(())
    }

    /// `SearchRangeParams` に変換
    pub fn to_search_range(&self) -> SearchRangeParams {
        let start_seconds = datetime_to_seconds(
            self.start_year, self.start_month, self.start_day, 0, 0, 0
        );
        let end_seconds = datetime_to_seconds(
            self.end_year, self.end_month, self.end_day, 23, 59, 59
        );
        let range_seconds = (end_seconds - start_seconds + 1) as u32;

        SearchRangeParams {
            start_year: self.start_year,
            start_month: self.start_month,
            start_day: self.start_day,
            start_second_offset: 0,
            range_seconds,
        }
    }
}
```

### 4.2 タスク生成関数 (新シグネチャ)

#### MT Seed 検索

```rust
// datetime_search/mtseed.rs

#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn generate_mtseed_search_tasks(
    context: DatetimeSearchContext,
    target_seeds: Vec<MtSeed>,
    date_range: DateRangeParams,
    worker_count: u32,
) -> Vec<MtseedDatetimeSearchParams> {
    let search_range = date_range.to_search_range();
    let combinations = expand_combinations(&context);
    let combo_count = combinations.len() as u32;

    // 時間分割
    let time_chunks = calculate_time_chunks(combo_count, worker_count);
    let ranges = split_search_range(search_range, time_chunks);

    // クロス積でタスク生成
    combinations
        .into_iter()
        .flat_map(|condition| {
            ranges.iter().map(move |range| MtseedDatetimeSearchParams {
                target_seeds: target_seeds.clone(),
                ds: context.ds.clone(),
                time_range: context.time_range.clone(),
                search_range: range.clone(),
                condition,
            })
        })
        .collect()
}
```

#### Egg 検索

```rust
// datetime_search/egg.rs

#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn generate_egg_search_tasks(
    context: DatetimeSearchContext,
    date_range: DateRangeParams,
    egg_params: EggGenerationParams,
    gen_config: GenerationConfig,
    filter: Option<EggFilter>,
    worker_count: u32,
) -> Vec<EggDatetimeSearchParams> {
    // 同様のロジック
}
```

#### TrainerInfo 検索

```rust
// datetime_search/trainer_info.rs

#[wasm_bindgen]
#[allow(clippy::needless_pass_by_value)]
pub fn generate_trainer_info_search_tasks(
    context: DatetimeSearchContext,
    filter: TrainerInfoFilter,
    game_start: GameStartConfig,
    date_range: DateRangeParams,
    worker_count: u32,
) -> Vec<TrainerInfoSearchParams> {
    // 同様のロジック
}
```

### 4.3 ヘルパー関数

```rust
// datetime_search/mod.rs

/// 組み合わせ数と Worker 数から時間分割数を計算
pub(crate) fn calculate_time_chunks(combo_count: u32, worker_count: u32) -> u32 {
    if combo_count == 0 {
        1
    } else {
        worker_count.div_ceil(combo_count)
    }
}
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト名 | 検証内容 |
|----------|----------|
| `test_date_range_params_validate` | バリデーション (年範囲、開始<=終了) |
| `test_date_range_to_search_range` | 変換ロジック (1日、複数日、年跨ぎ) |
| `test_calculate_time_chunks` | 時間分割数計算 |
| `test_task_count` | 組み合わせ × 時間チャンク のタスク数 |
| `test_task_coverage` | 生成タスクが全範囲をカバー |

### 5.2 統合テスト

| テスト名 | 検証内容 |
|----------|----------|
| `test_mtseed_tasks_find_known_seed` | 既知 Seed が分割タスクのいずれかで見つかる |
| `test_egg_tasks_boundary` | 分割境界で結果が欠落しない |

## 6. 実装チェックリスト

### Phase 1: 型定義

- [ ] `DateRangeParams` を `types/config.rs` に追加
- [ ] `validate()` メソッド実装
- [ ] `to_search_range()` メソッド実装
- [ ] `types/mod.rs` で re-export
- [ ] `lib.rs` で re-export

### Phase 2: ヘルパー関数

- [ ] `calculate_time_chunks()` を `datetime_search/mod.rs` に追加

### Phase 3: タスク生成関数の更新

- [ ] `generate_mtseed_search_tasks` 引数変更・ロジック更新
- [ ] `generate_egg_search_tasks` 引数変更・ロジック更新
- [ ] `generate_trainer_info_search_tasks` 引数変更・ロジック更新

### Phase 4: テスト

- [ ] `DateRangeParams` のユニットテスト
- [ ] 各タスク生成関数のテスト更新
- [ ] 統合テスト追加

### Phase 5: 検証

- [ ] `cargo test` 全パス
- [ ] `cargo clippy` 警告なし
- [ ] `pnpm build:wasm` 成功
- [ ] TypeScript 型定義に `DateRangeParams` が含まれる
