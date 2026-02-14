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

