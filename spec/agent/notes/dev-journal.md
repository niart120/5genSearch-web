# 開発ジャーナル (Dev Journal)

実装中に生じた設計上の気づき・疑問・将来検討事項を蓄積する。

---

## 2026-02-11: MtseedDatetime CPU 検索のスループット低下

現状: CPU パスの MtseedDatetime 検索が約 100M calc/s。参照実装 (`niart120/pokemon-gen5-initseed`) は同一マシン (32 コア) で約 280-300M calc/s を達成している。バッチサイズを 1,000 → 1,000,000 に増やしたが改善なし。Criterion ベンチマーク (ネイティブ) は約 11.9 Melem/s/core。

観察: コアあたり性能を比較すると、参照実装 (300M / 32core ≈ 9.4M/core) に対し本実装のネイティブベンチマーク (11.9M/core) は上回っている。SHA-1 SIMD 実装自体は問題ない可能性が高い。GPU パスでも同様のスループット劣化 (期待値の約 1/4) が観測されており、GPU 側はネイティブベンチマークで問題が再現しないため、JS/Worker レイヤーの制御オーバーヘッドが共通要因と推定する。

当面の方針: 仕様書 `spec/agent/wip/local_076/SEARCH_THROUGHPUT_OPTIMIZATION.md` に切り出して体系的に調査する。主要仮説は以下の通り:

1. `setTimeout(resolve, 0)` による yield オーバーヘッド (最小 4ms/回)
2. 毎バッチの `postMessage` 進捗報告によるメインスレッド負荷
3. WASM ビルド設定 (`-C target-feature=+simd128`, `wasm-opt --enable-simd`) の未適用
4. GPU: 単一ディスパッチ/await パターンによる GPU アイドル時間

### 検証結果 (2026-02-13)

**C1 (yield オーバーヘッド)**: yield を毎バッチ → 50ms 間隔に変更。スループット ~105M/s で有意な変化なし。診断ログにより、ボトルネックは WASM 実行速度自体 (3.3M/s/core、ネイティブ 11.9M/core の 28%) であることを確認。JS/Worker レイヤーのオーバーヘッドは支配的ではない。

**C3/C4 (WASM ビルド設定)**: `wasm-pkg/.cargo/config.toml` に `-C target-feature=+simd128` を追加し、`scripts/optimize-wasm.js` に `--enable-simd` を追加。リビルド後、WASM バイナリに SIMD 命令 (`v128.load/store`, `i32x4.add` 等) の出力を確認。ブラウザでのスループット計測は未実施。

## 2026-02-11: スクレイピング時のエンカウント地名キーと表示名の不整合

現状: `scripts/scrape-encounters.js` の `DUPLICATE_SUFFIX_RULES` が地名にサフィックスを付与し、`giant_chasm_cave` や `reversal_mountain_exterior` のようなサブエリアキーを生成する。一方 `src/lib/game-data-names.ts` の `ENCOUNTER_LOCATION_NAMES` にはサフィックス無しの親キーしか存在せず、生成された JSON に含まれるキーと表示名の対応が欠落していた。

観察:

- スクレイパー側で 12 件のサフィックス付きキーが生成されていたが、`game-data-names.ts` に対応エントリがなかった。
- `celestial_tower`（サフィックス無し）は全フロアが `_2f` 〜 `_5f` に分割されており、ベースキー単独の出現箇所がなかった。生成 JSON にも含まれないため削除した。
- `giant_chasm`, `reversal_mountain`, `virbank_complex`, `challengers_cave` はサフィックス無しのベースキーも DustCloud や水系メソッドで使用されるため、親キーと子キーの両方が必要。
- サフィックスルールの追加・変更時に `game-data-names.ts` 側の同期が漏れやすい構造になっている。

当面の方針: 今回は手動で 12 件を追加し、不要な `celestial_tower` を削除して整合をとった。将来的にはスクレイピング後にキーの過不足を自動検出するスクリプト（または CI チェック）の導入を検討する。

## 2026-02-13: pokemon-filter-form 内部状態同期の複雑性

現状: `pokemon-filter-form.tsx` はフィルタの有効/無効トグルを持ち、無効時でもフォーム入力値を保持するために3つの内部状態を管理している。

1. `filterEnabled`: トグル有効/無効
2. `internalFilter`: `PokemonFilter` の内容 (トグル OFF でも保持)
3. `internalStats`: `StatsFilter` の内容 (同上)

これらを `propagate` ヘルパーで親に伝搬し、有効時は `internalFilter` / `internalStats` を、無効時は `undefined` を返す。

問題: 親 (`value`/`statsFilter`) ↔ 子 (`internalFilter`/`internalStats`) の双方向同期が useEffect (`syncFromExternal`) で行われており、制御フローの把握が難しい。特に `filterEnabled` 切替時のタイミング依存は、将来的なバグの温床になりうる。

許容理由: フィルタ無効時に入力値を破棄しない UX 要件を満たすには、何らかの内部保持が必要。現状の実装はこの要件を最小コストで実現しており、実際に動作上の問題は確認されていない。

フォローアップ: フォームの複雑化が進む場合、`useReducer` への移行や状態保持を親コンポーネントに引き上げる案を検討する。関連ファイル: `src/features/pokemon-list/components/pokemon-filter-form.tsx`。

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

## 2026-02-14: 検索結果件数の事前見積もりと抑制

背景: ID 調整 (TID/SID 検索) ではフィルタ全未指定を許容する方針にした。フィルタが緩い場合やフィルタ未指定 + 広い検索範囲の場合、結果件数が膨大になりメモリ消費・UI 描画の負荷が問題になりうる。この問題は ID 調整に限らず、datetime-search・egg-search 等の検索系機能に共通する。

検討案:

1. **結果件数キャップ**: 一定件数 (例: 100,000) を超えた時点で検索を打ち切り、ユーザーに通知する。実装はシンプルだが、途中打ち切りは直感に反する可能性がある
2. **事前見積もり**: フィルタ内容と検索範囲から結果件数を概算し、閾値以上なら検索開始前に警告・確認を挟む。TS 側で実装可能だが、見積もりロジックの精度が問題になる
3. **件数キャップ + 警告**: (1) と (2) の組み合わせ。事前に概算警告し、実行時にも上限で打ち切る

当面の方針: 現時点では未実装。実際に問題が顕在化した段階で対応する。対応時は `services/` 層に検索系機能共通のユーティリティとして実装し、各 feature の検索フック (`use-*-search.ts`) から利用する形を想定する。

