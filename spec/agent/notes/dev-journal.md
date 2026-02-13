# 開発ジャーナル (Dev Journal)

実装中に生じた設計上の気づき・疑問・将来検討事項を蓄積する。

---

## 2026-02-11: MtseedDatetime CPU 検索のスループット低下

現状: CPU パスの MtseedDatetime 検索が約 100M calc/s。参照実装 (`niart120/pokemon-gen5-initseed`) は同一マシンで約 280-300M calc/s を達成している。バッチサイズを 1,000 → 1,000,000 に増やしたが改善なし。Criterion ベンチマーク (ネイティブ) は約 11.9 Melem/s/core。

観察: SHA-1 SIMD 実装に構造差がある。

1. 本リポジトリ: `std::simd::u32x4` (Rust Portable SIMD) を使用。`.cargo/config.toml` なし (= `-C target-feature=+simd128` 未指定)。ただし WASM バイナリに SIMD 命令 (0xFD prefix) は 196 箇所存在しており、一定のベクタ化はされている。
2. 参照実装: `core::arch::wasm32::*` (WASM SIMD intrinsics) を直接使用。`.cargo/config.toml` で `-C target-feature=+simd128` を明示。wasm-opt も `--enable-simd` 付き。

Portable SIMD は抽象レイヤを経由するため、直接 intrinsics より非効率なコード生成になる可能性がある。また `-C target-feature=+simd128` の有無により、LLVM が SIMD 前提のコード最適化 (auto-vectorization 等) を行えるかも変わる。

当面の方針: 以下を段階的に検証する。

1. `wasm-pkg/.cargo/config.toml` を追加し `-C target-feature=+simd128` を有効化 → 効果測定
2. 効果不十分なら SHA-1 実装を `core::arch::wasm32` intrinsics (`v128`, `u32x4_shl` 等) に書き換え
3. wasm-opt オプションに `--enable-simd` を追加

## 2026-02-11: スクレイピング時のエンカウント地名キーと表示名の不整合

現状: `scripts/scrape-encounters.js` の `DUPLICATE_SUFFIX_RULES` が地名にサフィックスを付与し、`giant_chasm_cave` や `reversal_mountain_exterior` のようなサブエリアキーを生成する。一方 `src/lib/game-data-names.ts` の `ENCOUNTER_LOCATION_NAMES` にはサフィックス無しの親キーしか存在せず、生成された JSON に含まれるキーと表示名の対応が欠落していた。

観察:

- スクレイパー側で 12 件のサフィックス付きキーが生成されていたが、`game-data-names.ts` に対応エントリがなかった。
- `celestial_tower`（サフィックス無し）は全フロアが `_2f` 〜 `_5f` に分割されており、ベースキー単独の出現箇所がなかった。生成 JSON にも含まれないため削除した。
- `giant_chasm`, `reversal_mountain`, `virbank_complex`, `challengers_cave` はサフィックス無しのベースキーも DustCloud や水系メソッドで使用されるため、親キーと子キーの両方が必要。
- サフィックスルールの追加・変更時に `game-data-names.ts` 側の同期が漏れやすい構造になっている。

当面の方針: 今回は手動で 12 件を追加し、不要な `celestial_tower` を削除して整合をとった。将来的にはスクレイピング後にキーの過不足を自動検出するスクリプト（または CI チェック）の導入を検討する。

## 2026-02-12: 実ステータスフィルタの責務境界

→ 仕様書として再構築: `spec/agent/wip/local_074/STATS_FILTER_INTEGRATION.md`

## 2026-02-13: pokemon-filter-form 内部状態同期の複雑性

現状: `pokemon-filter-form.tsx` はフィルタの有効/無効トグルを持ち、無効時でもフォーム入力値を保持するために3つの内部状態を管理している。

1. `filterEnabled`: トグル有効/無効
2. `internalFilter`: `PokemonFilter` の内容 (トグル OFF でも保持)
3. `internalStats`: `StatsFilter` の内容 (同上)

これらを `propagate` ヘルパーで親に伝搬し、有効時は `internalFilter` / `internalStats` を、無効時は `undefined` を返す。

問題: 親 (`value`/`statsFilter`) ↔ 子 (`internalFilter`/`internalStats`) の双方向同期が useEffect (`syncFromExternal`) で行われており、制御フローの把握が難しい。特に `filterEnabled` 切替時のタイミング依存は、将来的なバグの温床になりうる。

許容理由: フィルタ無効時に入力値を破棄しない UX 要件を満たすには、何らかの内部保持が必要。現状の実装はこの要件を最小コストで実現しており、実際に動作上の問題は確認されていない。

フォローアップ: フォームの複雑化が進む場合、`useReducer` への移行や状態保持を親コンポーネントに引き上げる案を検討する。関連ファイル: `src/features/pokemon-list/components/pokemon-filter-form.tsx`。

