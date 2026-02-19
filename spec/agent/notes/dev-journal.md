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

## 2026-02-13: pokemon-filter-form 内部状態同期の複雑性

現状: `pokemon-filter-form.tsx` はフィルタの有効/無効トグルを持ち、無効時でもフォーム入力値を保持するために3つの内部状態を管理している。

1. `filterEnabled`: トグル有効/無効
2. `internalFilter`: `PokemonFilter` の内容 (トグル OFF でも保持)
3. `internalStats`: `StatsFilter` の内容 (同上)

これらを `propagate` ヘルパーで親に伝搬し、有効時は `internalFilter` / `internalStats` を、無効時は `undefined` を返す。

問題: 親 (`value`/`statsFilter`) ↔ 子 (`internalFilter`/`internalStats`) の双方向同期が useEffect (`syncFromExternal`) で行われており、制御フローの把握が難しい。特に `filterEnabled` 切替時のタイミング依存は、将来的なバグの温床になりうる。

許容理由: フィルタ無効時に入力値を破棄しない UX 要件を満たすには、何らかの内部保持が必要。現状の実装はこの要件を最小コストで実現しており、実際に動作上の問題は確認されていない。

フォローアップ: Feature Store 導入 (`spec/agent/wip/local_088/STATE_PERSISTENCE.md`) により、親側の `filter` / `statsFilter` が `useState` → Feature Store に移行する。pokemon-filter-form は controlled component のため直接の影響は小さいが、Feature Store で入力値が永続化されるため「フィルタ無効時でも値を保持したい」要件の一部が Store 側で自然に解決される可能性がある。local_088 の Phase 3 (Page コンポーネント改修) 実施時にこの箇所の整理を検討する。関連ファイル: `src/features/pokemon-list/components/pokemon-filter-form.tsx`。

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

## 2026-02-19: pendingDetailOrigins の依存配列と pending パターン設計

背景: `feature/state-persistence` ブランチのセルフレビュー (M-1) で検出。`stores/search/results.ts` の `pendingDetailOrigins` を `useEffect` 内で読み取り・クリアするパターンにおいて、`pendingDetailOrigins` 自体が依存配列に含まれるため、自己発火のリスクがある。

現行コード概要:

```ts
// pokemon-list/page.tsx (概念)
useEffect(() => {
  const pending = usePendingDetailOrigins();
  if (pending.length > 0) {
    clearPendingDetailOrigins();
    // pending を使って生成開始
  }
}, [pendingDetailOrigins, ...]);
```

浅い修正案: `getState()` で直接読み取ることで依存配列から除外できるが、React concurrent mode との整合性が低下し、根本的な解決にならない。

根本的な問題: Feature 間データ受け渡しの「pending パターン」は、Store に一時値を書き込み → 受信側が消費してクリアする 2 段階方式であり、以下のトレードオフがある。

| 観点 | pending パターン (現行) | 直接書き込みパターン (代替) |
|------|------------------------|---------------------------|
| 送信側の責務 | pending に書くだけ (受信側の内部構造を知らない) | 受信側 Store の action を直接呼ぶ (結合度高) |
| 受信側の制御 | 自分のタイミングで消費できる | 受動的に書き込まれる |
| 複雑性 | useEffect + クリア + ガード条件 | 単純な関数呼び出し |
| テスト容易性 | pending → consume のフロー再現が必要 | action 単体テストで済む |

判断: 現時点ではコード量が少なく実動作に問題がないため、コード変更は行わない。pending パターンの再設計は影響範囲が広いため、必要が生じた時点で別 issue として対応する。
