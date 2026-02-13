# TrainerInfo 検索機能 仕様書

## 1. 概要

### 1.1 目的

指定した TID/SID/ShinyPID 条件を満たす起動時刻を検索する機能を提供する。

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| TID | トレーナー ID (Trainer ID)。0-65535 の範囲 |
| SID | シークレット ID (Secret ID)。0-65535 の範囲 |
| TrainerInfo | TID と SID のペア |
| LCG Seed | SHA-1 ハッシュから導出される 64bit 初期シード |
| GameStartConfig | 起動設定 (StartMode + SaveState) |
| ShinyPID | 色違いにしたい個体の PID |

### 1.3 背景・問題

現行 webapp (niart120/pokemon-gen5-initseed) の `IdAdjustment` 機能をリアーキテクチャ版に移植する。
現行実装では独自の `GameMode` enum を使用していたが、本プロジェクトでは `GameStartConfig` (StartMode + SaveState) に統一されている。

### 1.4 期待効果

| 項目 | 効果 |
|------|------|
| 機能統合 | 既存の datetime_search 基盤を再利用し、コード重複を削減 |
| 型安全性 | 既存の `TrainerInfo`, `SeedOrigin` 型との整合性を確保 |
| 保守性 | オフセット計算ロジックを `core` に集約し、モジュール間依存を整理 |

### 1.5 着手条件

- `datetime_search` モジュールの `DatetimeHashGenerator` が安定稼働していること
- `generation/algorithm/offset.rs` のオフセット計算ロジックが実装済みであること

## 2. 対象ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/core/mod.rs` | 変更 | `offset` モジュールを追加 |
| `wasm-pkg/src/core/offset.rs` | 新規 | `generation/algorithm/offset.rs` からロジックを移動 + TID/SID 算出関数を追加 |
| `wasm-pkg/src/generation/algorithm/offset.rs` | 削除 | `core/offset.rs` へ移動 |
| `wasm-pkg/src/generation/algorithm/mod.rs` | 変更 | `offset` の re-export を `core` から行う |
| `wasm-pkg/src/datetime_search/mod.rs` | 変更 | `trainer_info` モジュールを追加 |
| `wasm-pkg/src/datetime_search/trainer_info.rs` | 新規 | TrainerInfo 検索器 |
| `wasm-pkg/src/types/filter.rs` | 変更 | `TrainerInfoFilter` を追加 |
| `wasm-pkg/src/lib.rs` | 変更 | 公開 API を追加 |

## 3. 設計方針

### 3.1 レイヤー構成

```
┌─────────────────────────────────────────────────────────┐
│                    lib.rs (公開 API)                     │
├─────────────────────────────────────────────────────────┤
│  datetime_search/                                        │
│  ├── trainer_info.rs    TrainerInfoSearcher             │
│  ├── mtseed.rs          MtseedDatetimeSearcher          │
│  └── egg.rs             EggDatetimeSearcher             │
├─────────────────────────────────────────────────────────┤
│  datetime_search/base.rs                                 │
│  └── DatetimeHashGenerator (SHA1 → LcgSeed)             │
├─────────────────────────────────────────────────────────┤
│  core/                                                   │
│  ├── offset.rs          calculate_game_offset           │
│  │                      calculate_trainer_info          │
│  ├── sha1.rs            SHA-1 計算                       │
│  └── lcg.rs             LCG 演算                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 処理フロー

```
入力: DsConfig + TimeRange + SearchRange + StartupCondition + GameStartConfig + RomVersion
                            ↓
          DatetimeHashGenerator (base.rs)
                            ↓
              日時 + LcgSeed の列挙
                            ↓
           calculate_trainer_info (core/offset.rs)
                            ↓
                 TrainerInfo (TID + SID)
                            ↓
              TrainerInfoFilter でマッチング
                            ↓
出力: TrainerInfoSearchResult (TrainerInfo + SeedOrigin + ShinyType?)
```

### 3.3 ゲームモード制約

`StartMode::Continue` は ID 調整対象外（TID/SID が決定済み）。
検索パラメータで `StartMode::Continue` が指定された場合はエラーを返す。

### 3.4 オフセット計算ロジックの移動理由

`generation/algorithm/offset.rs` に現在配置されているオフセット計算は、
`datetime_search` や `misc/needle_search` など複数モジュールから参照される共通ロジック。
`core` レイヤーに配置することで依存関係を整理する。

## 4. 実装仕様

### 4.1 型定義

#### 4.1.1 TrainerInfoFilter (types/filter.rs)

```rust
/// TrainerInfo 検索フィルタ
#[derive(Tsify, Serialize, Deserialize, Clone, Debug, Default)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TrainerInfoFilter {
    /// 検索対象の TID (None で条件なし)
    pub tid: Option<u16>,
    /// 検索対象の SID (None で条件なし)
    pub sid: Option<u16>,
    /// 色違いにしたい個体の PID (None で条件なし)
    pub shiny_pid: Option<Pid>,
}

impl TrainerInfoFilter {
    /// フィルタ条件に一致するか判定
    pub fn matches(&self, trainer: &TrainerInfo, shiny_type: ShinyType) -> bool {
        // TID フィルタ
        if let Some(tid) = self.tid {
            if trainer.tid != tid {
                return false;
            }
        }
        // SID フィルタ
        if let Some(sid) = self.sid {
            if trainer.sid != sid {
                return false;
            }
        }
        // ShinyPID フィルタ (指定時は色違いであることを要求)
        if self.shiny_pid.is_some() && shiny_type == ShinyType::None {
            return false;
        }
        true
    }
}
```

#### 4.1.2 TrainerInfoSearchParams (datetime_search/trainer_info.rs)

```rust
/// TrainerInfo 検索パラメータ (単一組み合わせ)
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TrainerInfoSearchParams {
    /// 検索フィルタ
    pub filter: TrainerInfoFilter,
    /// DS 設定 (RomVersion を含む)
    pub ds: DsConfig,
    /// 1日内の時刻範囲
    pub time_range: TimeRangeParams,
    /// 検索範囲 (秒単位)
    pub search_range: SearchRangeParams,
    /// 起動条件 (単一: Timer0/VCount/KeyCode)
    pub condition: StartupCondition,
    /// 起動設定
    pub game_start: GameStartConfig,
}
```

#### 4.1.3 TrainerInfoSearchResult (datetime_search/trainer_info.rs)

```rust
/// TrainerInfo 検索結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TrainerInfoSearchResult {
    /// TID + SID
    pub trainer: TrainerInfo,
    /// 生成元情報 (Datetime + StartupCondition)
    pub seed_origin: SeedOrigin,
    /// 色違いタイプ (shiny_pid 指定時のみ有効)
    pub shiny_type: Option<ShinyType>,
}
```

#### 4.1.4 TrainerInfoSearchBatch (datetime_search/trainer_info.rs)

```rust
/// バッチ結果
#[derive(Tsify, Serialize, Deserialize, Clone, Debug)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TrainerInfoSearchBatch {
    /// 見つかった結果
    pub results: Vec<TrainerInfoSearchResult>,
    /// 処理済み件数
    pub processed_count: u64,
    /// 総件数
    pub total_count: u64,
}
```

### 4.2 core/offset.rs への追加

#### 4.2.1 設計方針

既存の `bw_new_game_*` / `bw2_new_game_*` 関数は TID/SID 決定を含む game_offset 全体を計算する。
TrainerInfo 検索では TID/SID 決定ポイントで止めて値を取得する必要がある。

**処理順序の例 (BW NewGame NoSave)**:
```
PT×3 → チラーミィPID → チラーミィID → [TID/SID] → Rand×1 → PT×4
                                        ↑ ここで止める
```

**既存関数はそのまま維持し、TID/SID 算出用の関数を新規追加する。**

#### 4.2.2 calculate_trainer_info

```rust
/// LcgSeed から TrainerInfo を算出
///
/// ゲーム初期化処理を経て TID/SID が決定されるポイントまで LCG を進め、
/// その時点の乱数値から TID/SID を計算する。
///
/// # Errors
/// - `StartMode::Continue` の場合 (ID 調整対象外)
/// - 無効な GameStartConfig の組み合わせ
pub fn calculate_trainer_info(
    seed: LcgSeed,
    version: RomVersion,
    config: GameStartConfig,
) -> Result<TrainerInfo, String> {
    // Continue モードは ID 調整不可
    if config.start_mode == StartMode::Continue {
        return Err("TrainerInfo search requires NewGame mode".into());
    }

    config.validate(version)?;

    let mut lcg = Lcg64::new(seed);

    // TID/SID 決定直前まで進める
    match (version.is_bw2(), config.save_state) {
        // BW
        (false, SaveState::WithSave) => {
            // PT×2 + チラーミィPID + チラーミィID
            probability_table_multiple(&mut lcg, 2);
            consume_random(&mut lcg, 2);
        }
        (false, SaveState::NoSave) => {
            // PT×3 + チラーミィPID + チラーミィID
            probability_table_multiple(&mut lcg, 3);
            consume_random(&mut lcg, 2);
        }
        // BW2
        (true, SaveState::WithMemoryLink) => {
            // Rand×1 + PT×1 + Rand×2 + PT×1 + Rand×2 + チラチーノPID + チラチーノID
            consume_random(&mut lcg, 1);
            probability_table_multiple(&mut lcg, 1);
            consume_random(&mut lcg, 2);
            probability_table_multiple(&mut lcg, 1);
            consume_random(&mut lcg, 2);
            consume_random(&mut lcg, 2);
        }
        (true, SaveState::WithSave) => {
            // Rand×1 + PT×1 + Rand×3 + PT×1 + Rand×2 + チラチーノPID + チラチーノID
            consume_random(&mut lcg, 1);
            probability_table_multiple(&mut lcg, 1);
            consume_random(&mut lcg, 3);
            probability_table_multiple(&mut lcg, 1);
            consume_random(&mut lcg, 2);
            consume_random(&mut lcg, 2);
        }
        (true, SaveState::NoSave) => {
            // Rand×1 + PT×1 + Rand×2 + PT×1 + Rand×4 + PT×1 + Rand×2 + チラチーノPID + チラチーノID
            consume_random(&mut lcg, 1);
            probability_table_multiple(&mut lcg, 1);
            consume_random(&mut lcg, 2);
            probability_table_multiple(&mut lcg, 1);
            consume_random(&mut lcg, 4);
            probability_table_multiple(&mut lcg, 1);
            consume_random(&mut lcg, 2);
            consume_random(&mut lcg, 2);
        }
        _ => return Err("Invalid configuration".into()),
    }

    // TID/SID 算出 (元実装準拠)
    let rand_value = lcg.next().unwrap_or(0);
    let tid_sid_combined = ((u64::from(rand_value) * 0xFFFF_FFFF) >> 32) as u32;
    let tid = (tid_sid_combined & 0xFFFF) as u16;
    let sid = ((tid_sid_combined >> 16) & 0xFFFF) as u16;

    Ok(TrainerInfo { tid, sid })
}
```

### 4.3 TrainerInfoSearcher (datetime_search/trainer_info.rs)

```rust
/// TrainerInfo 起動時刻検索器
#[wasm_bindgen]
pub struct TrainerInfoSearcher {
    /// 検索フィルタ
    filter: TrainerInfoFilter,
    /// 起動時刻とハッシュ値の生成器
    generator: DatetimeHashGenerator,
    /// 起動条件 (結果生成用)
    condition: StartupCondition,
    /// DS 設定 (RomVersion を含む)
    ds: DsConfig,
    /// 起動設定
    game_start: GameStartConfig,
    // 進捗管理
    total_count: u64,
    processed_count: u64,
}

#[wasm_bindgen]
impl TrainerInfoSearcher {
    /// 新しい `TrainerInfoSearcher` を作成
    ///
    /// # Errors
    /// - `StartMode::Continue` が指定された場合
    /// - `GameStartConfig` の検証失敗
    #[wasm_bindgen(constructor)]
    #[allow(clippy::needless_pass_by_value)]
    pub fn new(params: TrainerInfoSearchParams) -> Result<TrainerInfoSearcher, String> {
        // Continue モードは ID 調整不可
        if params.game_start.start_mode == StartMode::Continue {
            return Err("TrainerInfo search requires NewGame mode".into());
        }

        params.game_start.validate(params.ds.version)?;

        let generator = DatetimeHashGenerator::new(
            &params.ds,
            &params.time_range,
            &params.search_range,
            params.condition,
        )?;

        let valid_seconds_per_day = params.time_range.count_valid_seconds();
        let days = params.search_range.range_seconds.div_ceil(86400);
        let total_count = u64::from(valid_seconds_per_day) * u64::from(days);

        Ok(Self {
            filter: params.filter,
            generator,
            condition: params.condition,
            ds: params.ds,
            game_start: params.game_start,
            total_count,
            processed_count: 0,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn is_done(&self) -> bool {
        self.generator.is_exhausted()
    }

    #[wasm_bindgen(getter)]
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        if self.total_count == 0 {
            return 1.0;
        }
        self.processed_count as f64 / self.total_count as f64
    }

    /// 次のバッチを取得
    pub fn next_batch(&mut self, chunk_count: u32) -> TrainerInfoSearchBatch {
        let mut results = Vec::new();
        let mut remaining = u64::from(chunk_count);

        while remaining > 0 && !self.generator.is_exhausted() {
            let (entries, len) = self.generator.next_quad();
            if len == 0 {
                break;
            }

            let processed = u64::from(len);
            self.processed_count += processed;
            remaining = remaining.saturating_sub(processed);

            for (datetime, hash_values) in entries.iter().take(len as usize) {
                let lcg_seed = hash_values.to_lcg_seed();

                // TrainerInfo を算出
                let trainer = match calculate_trainer_info(
                    lcg_seed,
                    self.ds.version,
                    self.game_start,
                ) {
                    Ok(t) => t,
                    Err(_) => continue, // エラーはスキップ (通常発生しない)
                };

                // ShinyType を算出 (shiny_pid 指定時)
                let shiny_type = self.filter.shiny_pid.map(|pid| pid.shiny_type(trainer));

                // フィルタ判定
                if self.filter.matches(&trainer, shiny_type.unwrap_or(ShinyType::None)) {
                    let seed_origin = SeedOrigin::startup(lcg_seed, *datetime, self.condition);
                    results.push(TrainerInfoSearchResult {
                        trainer,
                        seed_origin,
                        shiny_type,
                    });
                }
            }
        }

        TrainerInfoSearchBatch {
            results,
            processed_count: self.processed_count,
            total_count: self.total_count,
        }
    }
}
```

### 4.4 タスク生成関数

```rust
/// 検索タスクを生成
///
/// `DatetimeSearchContext` から `Timer0 × VCount × KeyCode` の全組み合わせを展開し、
/// 各組み合わせに対する `TrainerInfoSearchParams` を生成する。
#[wasm_bindgen]
pub fn generate_trainer_info_search_tasks(
    filter: TrainerInfoFilter,
    ds: DsConfig,
    time_range: TimeRangeParams,
    search_range: SearchRangeParams,
    context: DatetimeSearchContext,
    game_start: GameStartConfig,
) -> Vec<TrainerInfoSearchParams> {
    let combinations = expand_combinations(&context);

    combinations
        .into_iter()
        .map(|condition| TrainerInfoSearchParams {
            filter: filter.clone(),
            ds: ds.clone(),
            time_range: time_range.clone(),
            search_range: search_range.clone(),
            condition,
            game_start,
        })
        .collect()
}
```

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | 検証内容 |
|------------|----------|
| `calculate_trainer_info` | 既知の LcgSeed に対して正しい TID/SID を返すこと |
| `calculate_trainer_info` | `Continue` モードでエラーを返すこと |
| `TrainerInfoFilter::matches` | TID/SID/ShinyPID の各フィルタが正しく動作すること |
| `TrainerInfoSearcher::new` | `Continue` モードでエラーを返すこと |
| `TrainerInfoSearcher::next_batch` | フィルタ条件に一致する結果のみ返すこと |

### 5.2 統合テスト

| テスト対象 | 検証内容 |
|------------|----------|
| 元実装互換性 | 元実装 (niart120/pokemon-gen5-initseed) と同一の結果を返すこと |
| BW/BW2 差分 | 各ゲームモードで正しいオフセット計算が行われること |

### 5.3 元実装テストケース

```rust
#[test]
fn test_bw_new_game_no_save_tid_sid() {
    let seed = LcgSeed::new(0x96FD2CBD8A2263A3);
    let config = GameStartConfig {
        start_mode: StartMode::NewGame,
        save_state: SaveState::NoSave,
    };
    let trainer = calculate_trainer_info(seed, RomVersion::Black, config).unwrap();
    assert_eq!(trainer.tid, 42267);
    assert_eq!(trainer.sid, 29515);
}

#[test]
fn test_bw2_new_game_no_save_tid_sid() {
    let seed = LcgSeed::new(0x90ABCDEF);
    let config = GameStartConfig {
        start_mode: StartMode::NewGame,
        save_state: SaveState::NoSave,
    };
    let trainer = calculate_trainer_info(seed, RomVersion::Black2, config).unwrap();
    assert_eq!(trainer.tid, 910);
    assert_eq!(trainer.sid, 42056);
}
```

## 6. 実装チェックリスト

### Phase 1: core/offset.rs 整理

- [ ] `generation/algorithm/offset.rs` を `core/offset.rs` に移動
- [ ] `generation/algorithm/mod.rs` の re-export を更新
- [ ] `core/mod.rs` に `offset` モジュールを追加
- [ ] `misc/needle_search.rs` の import パスを更新
- [ ] 既存テストが通ることを確認

### Phase 2: TID/SID 算出ロジック

- [ ] `core/offset.rs` に `calculate_trainer_info` を実装
- [ ] `advance_to_tid_sid_point` 内部関数を実装
- [ ] 元実装互換性テストを追加

### Phase 3: TrainerInfoFilter

- [ ] `types/filter.rs` に `TrainerInfoFilter` を追加
- [ ] `TrainerInfoFilter::matches` を実装
- [ ] `types/mod.rs` に re-export を追加

### Phase 4: TrainerInfoSearcher

- [ ] `datetime_search/trainer_info.rs` を新規作成
- [ ] `TrainerInfoSearchParams` を実装
- [ ] `TrainerInfoSearchResult` を実装
- [ ] `TrainerInfoSearchBatch` を実装
- [ ] `TrainerInfoSearcher` を実装
- [ ] `generate_trainer_info_search_tasks` を実装
- [ ] `datetime_search/mod.rs` に re-export を追加

### Phase 5: 公開 API

- [ ] `lib.rs` に公開 API を追加
- [ ] `cargo test` で全テストが通ることを確認
- [ ] `pnpm build:wasm` でビルドが通ることを確認
