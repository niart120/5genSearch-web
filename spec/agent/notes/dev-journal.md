# 開発ジャーナル (Dev Journal)

実装中に生じた設計上の気づき・疑問・将来検討事項を蓄積する。

---

## 2026-02-11: スクレイピング時のエンカウント地名キーと表示名の不整合

現状: `scripts/scrape-encounters.js` の `DUPLICATE_SUFFIX_RULES` が地名にサフィックスを付与し、`giant_chasm_cave` や `reversal_mountain_exterior` のようなサブエリアキーを生成する。一方 `src/lib/game-data-names.ts` の `ENCOUNTER_LOCATION_NAMES` にはサフィックス無しの親キーしか存在せず、生成された JSON に含まれるキーと表示名の対応が欠落していた。

観察:

- スクレイパー側で 12 件のサフィックス付きキーが生成されていたが、`game-data-names.ts` に対応エントリがなかった。
- `celestial_tower`（サフィックス無し）は全フロアが `_2f` 〜 `_5f` に分割されており、ベースキー単独の出現箇所がなかった。生成 JSON にも含まれないため削除した。
- `giant_chasm`, `reversal_mountain`, `virbank_complex`, `challengers_cave` はサフィックス無しのベースキーも DustCloud や水系メソッドで使用されるため、親キーと子キーの両方が必要。
- サフィックスルールの追加・変更時に `game-data-names.ts` 側の同期が漏れやすい構造になっている。

当面の方針: 今回は手動で 12 件を追加し、不要な `celestial_tower` を削除して整合をとった。将来的にはスクレイピング後にキーの過不足を自動検出するスクリプト（または CI チェック）の導入を検討する。

## 2026-02-14: WASM Searcher API の共通化

現状: 4つの Searcher (`MtseedDatetimeSearcher`, `MtseedSearcher`, `EggDatetimeSearcher`, `TrainerInfoSearcher`) の `next_batch()` 返却型でプロパティ名が不統一。`MtseedSearcher` のみ `candidates` / `processed` / `total`、他3つは `results` / `processed_count` / `total_count`。

観察: TS 側の `runSearchLoop` 共通ヘルパーで各検索関数を統合済みだが、WASM 返却型の不統一により `processBatch` コールバック内でプロパティ名を個別にマッピングしている。Rust 側で共通トレイト (`SearchBatch<T>`) を定義し返却型を統一すれば、TS 側のアダプター層が不要になる。ただし `wasm-bindgen` のトレイト制約 (tsify でジェネリクスがどこまで扱えるか) の調査が必要。

当面の方針: 現行の薄いラッパー4つで実用上の問題はないため、優先度は低い。WASM API に破壊的変更を入れるタイミングがあれば合わせて検討する。

## 2026-02-14: Searcher / Iterator 命名規則の不統一

現状: Rust 側と TS 側を通じて、検索系型の命名パターンが混在している。

| 型名 | パターン |
|------|----------|
| `MtseedDatetimeSearcher` | `{key}{target}Searcher` |
| `EggDatetimeSearcher` | 同上 |
| `MtseedSearcher` | `{key}Searcher` (target 省略) |
| `TrainerInfoSearcher` | 同上 |
| `GpuDatetimeSearchIterator` | `Gpu{target}SearchIterator` (key 省略) |
| `GpuMtseedSearchTask` (TS) | datetime search 用だが名前に datetime が含まれない |

観察:

- CPU 版 Searcher は `{key}{target}Searcher` が基本だが、`MtseedSearcher` は `{key}Searcher` で target が省略されている。実体は IV 全探索なので `MtseedIvSearcher` が正確。
- GPU 版 `GpuDatetimeSearchIterator` は Searcher ではなく Iterator を名乗るが、CPU 版は Searcher。Rust 側の trait 体系から見ると同じ役割。
- TS の `GpuMtseedSearchTask` (kind: `'gpu-mtseed'`) は datetime search 用だが、名前から datetime であることが読み取れない。新規の GPU MT Seed IV search (kind: `'gpu-mtseed-iv'`) との混同リスクがある。
- 仕様書 `local_078` では GPU 版を `GpuMtseedSearchIterator` と命名したが、これも「何を検索しているか」(IV) が名前に現れない。

当面の方針: 今回の `local_078` 実装では既存命名との整合を優先し、上記の不統一は許容する。将来的にリネームする場合の候補:

- `GpuMtseedSearchTask` → `GpuMtseedDatetimeSearchTask` (kind: `'gpu-mtseed-datetime'`)
- `MtseedSearcher` → `MtseedIvSearcher`
- `GpuDatetimeSearchIterator` → `GpuMtseedDatetimeSearchIterator` (key の明示)
- Searcher / Iterator の呼称統一 (どちらかに寄せる)

WASM API の破壊的変更を伴うため、前エントリの `SearchBatch<T>` 統一と合わせて一括対応が望ましい。

## 2026-02-18: SeedOriginTable における KeyCode / KeyMask のユーザ露出

背景: SEED_ORIGIN_IMPORT 仕様 (local_086) の SeedOriginTable §4.5.1 では、`key_code` を hex 入力させるカラムを定義している。この設計を見直す必要がある。

問題: `KeyCode` は `KeyMask XOR 0x2FFF` で算出される SHA-1 計算用の内部表現であり、ユーザが直感的に理解できる値ではない。例:
- ボタンなし: `KeyCode = 0x2FFF` / `KeyMask = 0x0000`
- A ボタン: `KeyCode = 0x2FFE` / `KeyMask = 0x0001`
- A+Start: `KeyCode = 0x2FF6` / `KeyMask = 0x0009`

`KeyMask` の方がビットフラグとして素直であり、ユーザが各ボタンのビット割り当て (`A=0x0001, B=0x0002, ...`) から手計算する場合にも理解しやすい。

現状の制約: `KeyMask` は Rust 側で `pub(crate)` であり、TypeScript に露出していない。`KeyCode` は `wasm-bindgen` 経由で公開済み。エクスポート JSON の `SerializedSeedOrigin` も `key_code` フィールドで `KeyCode` 値を格納している。

判断: SeedOriginTable の手入力カラムは hex 入力が必要なニッチケースであり、JSON インポートが主要パスとなる想定。JSON にはエクスポート時点で `key_code` が含まれるため、手入力時の UX 問題は影響範囲が限定的。ただし、将来的にボタン選択 UI (チェックボックス等) を提供すれば hex 手入力自体が不要になるため、`KeyMask` 露出の必要性も薄れる。

当面の方針: 仕様は `key_code` (= `KeyCode` 値) のまま据え置く。手入力 UX の改善が必要になった場合、ボタン選択 UI の導入を優先し、`KeyMask` の public 化は最終手段とする。

## 2026-03-11: `getStartup()` のコードクローン

現状: `getStartup(origin: SeedOrigin)` ヘルパー（`Startup` バリアントを抽出する1行関数）が以下 5 箇所にそれぞれローカル定義されている。

- `src/features/tid-adjust/components/trainer-info-columns.tsx`
- `src/features/datetime-search/components/seed-origin-columns.tsx`
- `src/features/egg-search/components/egg-result-columns.tsx`
- `src/features/needle/components/needle-result-columns.tsx`
- `src/services/export-columns.ts`

観察: 実装は全箇所で同一（`if ('Startup' in origin) return origin.Startup; return;`）。`export-columns.ts` にはさらに `getBaseSeed()` / `getMtSeed()` も定義されているが、これらはカラム定義側には伝播していない。

当面の方針: 現状はすべて同一実装のため動作上の問題はない。`src/lib/seed-origin-helpers.ts` 等の共通モジュールへの抽出はフロントエンドリファクタリングのタイミングで対応する。

## 2026-03-11: `Base Seed` と `LCG Seed` の呼称不統一

現状: 同一の概念（`LcgSeed` 型 / `base_seed` フィールド）に対して UI 内で2つの呼称が混在している。

| 呼称 | 使用箇所 |
|------|----------|
| `LCG Seed` | Seed 入力フォーム系（i18n キー `sLdnxh`、`xHRBig`、`wFBYpK` など）|
| `Base Seed` | 検索結果テーブル・CSV エクスポートヘッダー（plain string、非翻訳）|

観察: Rust 型名は `LcgSeed`、フィールド名は `base_seed`。TS 型定義（`wasm_pkg.d.ts`）も `LcgSeed = bigint` / `base_seed: LcgSeed`。i18n 翻訳ファイルには `LCG Seed` として登録されているが、結果テーブルのカラムヘッダーは翻訳を通さず `'Base Seed'` のまま表示している。ユーザ向けには `LCG Seed` に統一する方が型名・翻訳ファイルとの整合性が高い。

当面の方針: 本仕様（local_100）では既存の `datetime-search` パターンに揃えて `'Base Seed'` を採用する。統一するならば全結果テーブルと CSV エクスポートヘッダーの一括変更が必要であり、別途仕様化する。

## 2026-02-25: フォームコンポーネントの onChange シグネチャ不統一

現状: `src/components/forms/` 配下のコンポーネントで、`undefined` を返しうる `onChange` コールバックのシグネチャが2パターン混在している。

1. `onChange: (value: T | undefined) => void` — `shiny-select`, `species-combobox`, `gender-select`, `ability-slot-select`
2. `onChange: (value?: T) => void` — `egg-filter-form`, `level-range-input`, `encounter-result-select`

観察: パターン 1 は `onChange(cond ? undefined : v)` のように常に引数を明示渡ししているため現時点では問題ない。ただし `onChange()` と引数なしで呼ぶコードを追加した場合、`Expected 1 arguments, but got 0` のコンパイルエラーになる。`level-range-input` (local_099) で実際にこの問題が発生し、パターン 2 に修正した。

当面の方針: 既存の4コンポーネントは動作上問題ないため即時修正はしない。次にこれらのファイルに触れる機会があればパターン 2 (`?` オプショナル引数) に統一する。関連コミット: `962d17a`。

## 2026-04-09: 個体生成時点の LCG64 状態が外部に露出していない

現状: `GeneratedPokemonData` / `GeneratedEggData` は `source: SeedOrigin`（初期 `base_seed` + `mt_seed`）と `advance: u32` のみを保持する。Generator 内部では各 advance 時点の LCG64 状態（`self.lcg.current_seed()`）を計算しているが、結果構造体には含めず破棄している。`UiPokemonData` / `UiEggData` にも対応フィールドはなく、wasm-bindgen で `(base_seed, advance) → LCG64 状態` を返す API も存在しない。

観察: `base_seed` + `advance` から LCG64 状態は決定的に再計算可能なため、データの欠損ではない。ただし、ユーザが「この個体の LCG Seed は何か」を知りたい場合、現状では自力で計算するしかない。乱数調整ツールの用途を考えると、advance 時点の LCG64 状態を詳細ダイアログやエクスポートで提供する需要はありうる。実装する場合、Rust 側に `lcg_seed_at_advance(base_seed: LcgSeed, advance: u32) -> LcgSeed` のような関数を追加し、UI 側で呼び出す形になる。

当面の方針: 現時点で具体的なユーザ要求はないため対応しない。需要が確認された場合に別途仕様化する。

## 2026-09-06: 共通検索進捗の整数精度と集計対象

現状: `src/workers/search.worker.ts` の `calculateProgress` は bigint を number に変換し、`src/services/progress.ts` の `ProgressAggregator` は報告済みタスクだけを集計する。

観察: 大きな件数では整数精度が失われ、後続タスクの初回報告で分母が増えて全体進捗率が下がり得る。精度維持と開始時の固定分母には、共通型・タスク総数の受け渡し・集計・表示にまたがる拡張が必要。

当面の方針: `spec/agent/complete/local_119/POKEMON_SEARCH_ENGINE.md` の新検索は既存進捗基盤へ接続する。共通基盤の拡張は今回行わず、必要になった時点で既存 CPU / GPU 検索への影響を含めて別途設計する。

## 2026-09-06: 持ち物判定の対象経路と VeryRare の成立条件

現状: `wasm-pkg/src/generation/algorithm/encounter.rs` の持ち物判定対象は5経路に限られ、`Normal` が外れる。

観察: 移行仕様を追加したコミット `3437bf5` に既にこの分類があるが、通常草むらを除外する根拠は記載されていない。同仕様の `VeryRare` は「濃い草むら」と `ShakingGrass`（揺れる草むら）の記述が食い違い、`ff11390` では水泡釣りも対象に加わっている。現在の分類をゲーム仕様として扱う根拠が不足している。

当面の方針: 持ち物の乱数消費・判定対象経路・`VeryRare` の成立条件は別途調査する。UIでの扱いは `spec/agent/complete/local_122/CONTEXTUAL_SEARCH_FILTERS.md` §4.2 に従う。
