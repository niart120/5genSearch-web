# WASM バイナリ分割・クレート名リネーム 仕様書

## 1. 概要
### 1.1 目的
- 肥大化している WASM バイナリの分割戦略を定義し、最小構成で読み込めるようにする。
- `wasm-core` クレート名のリネーム方針と候補名を整理する。

### 1.2 用語定義
| 用語 | 定義 |
| --- | --- |
| 旧クレート | 既存の `wasm-core` クレートを指す。 |
| コアデータ | 種族値データや実ステータス解決ロジックなど、分割後も本体に残るべきデータ/ロジックの総称。 |
| 分割対象データ | i18n、所持アイテム解決、その他の参照頻度が低いデータ群。 |
| WASM 分割 | 複数の wasm パッケージやデータパッケージに分離すること。 |
| 欠番 | 検討結果により実装を見送り、仕様のみ残す扱い。 |

### 1.3 背景・問題
- WASM バイナリが肥大化しており、初回ロードコストが高い。
- データ量の増加により、実行不要なデータも一括で読み込まれている。
- `wasm-core` という名称が役割と一致していない可能性がある。
- 検討の結果、分割/リネームのみではサイズ削減効果が限定的であることが分かった。

### 1.4 期待効果
| 指標 | 現状 | 目標 | 備考 |
| --- | --- | --- | --- |
| WASM サイズ (core/ui, GPU 有, wasm-opt -O4) | 930,606 / 940,318 bytes | 目標設定なし | 計測値のみ記録。 |
| WASM サイズ (core/ui, GPU 無, wasm-opt -O4) | 827,880 / 944,486 bytes | 目標設定なし | GPU 無効化の差分を記録。 |
| wasm-opt 最適化差分 (-Oz) | core -1,342 bytes / ui -1,874 bytes | 目標設定なし | 効果は数 KB。 |

### 1.5 着手条件
- 現状の WASM サイズ計測結果があること。
- 分割後に残すコアデータの範囲が合意されていること。

### 1.6 結論
- 分割/リネームのみでは期待するサイズ削減効果が得られないため、本件は検討破棄とする。
- 本仕様は欠番として保持する。

## 2. 対象ファイル
| ファイル | 変更種別 | 変更内容 |
| --- | --- | --- |
| [wasm-core/Cargo.toml](wasm-core/Cargo.toml) | 検討 | 実装見送り。 |
| [wasm-core/src/lib.rs](wasm-core/src/lib.rs) | 検討 | 実装見送り。 |
| [wasm-core/src/core/](wasm-core/src/core/) | 検討 | 実装見送り。 |
| [wasm-ui/src/data/](wasm-ui/src/data/) | 検討 | 実装見送り。 |
| [wasm-ui/src/resolve/](wasm-ui/src/resolve/) | 検討 | 実装見送り。 |
| [src/services/worker-pool.ts](src/services/worker-pool.ts) | 検討 | 実装見送り。 |
| [src/services/search-tasks.ts](src/services/search-tasks.ts) | 検討 | 実装見送り。 |
| [src/workers/search.worker.ts](src/workers/search.worker.ts) | 検討 | 実装見送り。 |

## 3. 設計方針
- 分割対象は i18n / 所持アイテム解決 / 種族値データ / 実ステータス解決ロジックを中心に検討する。
- コア側の WASM は個体生成ロジックを最小構成で持ち、UI 用データ解決は別 WASM に分離する。
- Worker 内の WASM インスタンスを小さくして、並列化時のメモリ圧迫を抑制する。
- JS/npm 公開は現時点で不要なため、命名は Rust 内部での可読性を優先する。
- 分割方式は 2 段階で進める。
  - 段階 1: クレート名のリネームと内部モジュール分割。
  - 段階 2: wasm を「コアロジック」と「UI データ解決」に分割。

### クレート名
- 旧 `wasm-core` は `gen5-search-wasm-core` にリネームする。

### 分割の論点
- コア側には種族 ID と種族値データを保持し、個体生成に必要な最小限の参照のみ許容する。
- UI データ解決側は i18n / 所持アイテム解決 / 画面表示用の派生データを担当する。
- 現状の密結合を解消するため、データ参照の依存境界を見直す。

### 期待する処理フロー
- Worker-pool で個体生成を行い、生成結果をメインスレッドへ返却する。
- メインスレッド側で UI 用データ解決を実行し、表示に必要な情報だけを組み立てる。

### 3.1 API 境界の分析
#### 現状の API 依存
- Worker は `EggDatetimeSearcher` / `MtseedDatetimeSearcher` / `MtseedSearcher` / `TrainerInfoSearcher` を使用して検索を実行する。
- メインスレッドは `generate_*_search_tasks` でタスク分割を行う。
- UI 表示用の解決は `resolve_pokemon_data` / `resolve_egg_data` と `UiPokemonData` / `UiEggData` を使用する。

#### 分割後の API 境界 (案)
| 区分 | コアロジック WASM | UI データ解決 WASM |
| --- | --- | --- |
| 生成 | `GenerationConfig` / `PokemonGenerationParams` / `EggGenerationParams` | なし |
| 検索 | `EggDatetimeSearcher` / `MtseedDatetimeSearcher` / `MtseedSearcher` / `TrainerInfoSearcher` | なし |
| 検索タスク生成 | `generate_*_search_tasks` | なし |
| 生成結果 | `GeneratedPokemonData` / `GeneratedEggData` / `EggDatetimeSearchResult` | なし |
| 解決 | なし | `resolve_pokemon_data` / `resolve_egg_data` |
| 表示用型 | なし | `UiPokemonData` / `UiEggData` |

#### 受け渡しデータの最小化方針
- Worker → メインスレッド: `GeneratedPokemonData` / `GeneratedEggData` を基本形として返却する。
- UI 側で必要な表示情報は `resolve_*` によって解決し、所持アイテム名や種族名などの i18n 依存は UI WASM 側に集約する。
- コア側には種族 ID と種族値データのみ保持し、解決済み文字列は保持しない。
- UI 解決の入力は `locale` / `RomVersion` を必須、卵のみ `species_id` を任意とする。

### 3.2 現行実装に沿ったデータ境界
#### コア側に残るデータ候補 (現行実装ベース)
- 種族値データ: `SpeciesEntry` は種族値・性別比・特性 ID を保持する。
- ステータス計算: `calculate_stats` は種族値・個体値・性格・レベルのみを使用する。
- 成長曲線データは現行実装に存在せず、実数値計算も EV を 0 とする固定ロジックで完結している。

#### UI データ解決側に寄せるデータ
- 種族名・性格名のローカライズ: `get_species_name` / `get_nature_name` に依存する。
- 特性名・所持アイテム名の解決: `get_ability_name` / `get_held_item_name` に依存する。

#### 直近の方針決定
- 成果物は 2 wasm (core / ui) + それぞれの JS ラッパとする。
- 受け渡しは `GeneratedPokemonData` / `GeneratedEggData` をそのまま使用する。
- コア側の追加データはなし。`AbilitySlot` のみ保持し、`ability_ids` は UI 側へ移す。
- UI 側のデータは names + abilities + items を集約する。
- core 側はアイテム所持有無の判定に必要な情報のみを保持し、名称解決は UI 側で行う。
- 密結合の解消は `SpeciesEntry` の持ち方の見直しから着手し、`resolve_*` の依存整理へつなげる。
- 起動時に core/ui の両 wasm を初期化する。Worker 内では core のみ初期化する。
- Worker からの各バッチ受信時に UI 解決を即時実行する。
- wasm 出力は `/wasm/gen5-search-wasm-core_bg.wasm` と `/wasm/gen5-search-wasm-ui_bg.wasm` を使用する。
- 公開型は core/ui で重複させず、それぞれが必要な型のみを公開する。
- core/ui の `d.ts` は明確に分離して TS 側で使い分ける。
- Cargo 構成は `gen5-search-wasm-core` / `gen5-search-wasm-ui` の別クレートに分割する。
- Worker/検索系は core のみを import する。
- UI 解決・表示系は ui を import する。
- 共通型は core 側に寄せる (例: `Generated*`)。
- テスト移管は core: 検索・生成・フィルタ・種族値/ステータス計算、ui: `resolve_*` と i18n 依存ロジック。
- 既存テストは可能な限り移設し、追加は UI 側のみとする。
- 段階 1 を完了した後に段階 2 (core/ui 分割) に着手する。
- 計測は wasm サイズのみ記録し、この仕様書の表に追記する。

### 3.3 検討結果 (サイズ)
| 構成 | core wasm サイズ | 条件 | 備考 |
| --- | --- | --- | --- |
| full | 949,122 bytes | GPU 無 / wasm-opt 無効 | 基準値。 |
| generation のみ | 331,132 bytes | GPU 無 / wasm-opt 無効 | export を限定。 |
| misc のみ | 354,614 bytes | GPU 無 / wasm-opt 無効 | export を限定。 |
| datetime のみ | 922,418 bytes | GPU 無 / wasm-opt 無効 | ほぼ full 相当。 |

## 4. 実装仕様
- 本件は検討破棄のため実装しない。

### 4.1 クレート名リネーム
- `wasm-core` のクレート名を `gen5-search-wasm-core` に更新し、Cargo の依存関係を更新する。
- wasm 出力ファイル名の変更が必要な場合は、フロントエンドの読み込みコードも更新する。

```toml
[package]
name = "gen5-search-wasm-core"
```

### 4.2 コアデータ境界
- `core` に残すべきモジュールの基準を「個体生成に必要な最小データ」に統一する。
- 種族 ID と種族値データはコアに残す。
- i18n や所持アイテム解決は UI データ解決側へ移す。

```rust
pub mod core;
pub mod resolve;
```

### 4.3 分割方式の検討項目
- wasm 分割案: コアロジック用 wasm と UI データ解決用 wasm に分割し、ユースケースに応じて遅延ロードする。
- データ分割案: wasm から JSON/バイナリデータを分離し、必要時にフェッチする。
- 分割後の API は後方互換性を必須としない。
- 分割案はフロントエンド側のロード戦略とセットで設計する。

## 5. テスト方針
- ユニットテスト
  - 種族値データと実ステータス解決の整合性チェック。
  - 分割後のデータ解決結果が一致することの検証。
- 統合テスト
  - Web Worker での WASM 初期化が成功すること。
  - 分割データの遅延ロードが失敗しないこと。
- ベンチマーク
  - WASM サイズの計測と、分割前後の差分記録。

## 6. 実装チェックリスト
- [x] 現状 WASM サイズの計測値を記録する。
- [ ] クレート名を `gen5-search-wasm-core` に変更する。
- [ ] コアデータの残存範囲を確定する。
- [ ] 分割対象データの切り出し方針を確定する。
- [ ] 分割後の WASM ロードフローを整理する。
- [ ] テスト観点の更新と追加を行う。
- [x] 検討破棄と欠番扱いを記録する。
