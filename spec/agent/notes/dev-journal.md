# 開発ジャーナル (Dev Journal)

実装中に生じた設計上の気づき・疑問・将来検討事項を蓄積する。

---

## 2026-02-09: calculate_game_offset / TID-SID 生成ロジックの整理

`offset.rs` には BW 3 パターン + BW2 5 パターンの計 8 関数が個別定義されている。
各パターンは「前半の乱数消費列 + チラーミィ/チラチーノ PID・ID 決定 + TID/SID 決定」という共通構造を持つ。
`advance_to_tid_sid_point_bw/bw2` も `bw_new_game_*` / `bw2_new_game_*` と処理が重複している。

以下のリファクタリングが考えられる:
- 各パターンの "前半消費列" をデータ駆動 (ステップ列) で表現し、ディスパッチ関数を統一する
- `calculate_game_offset` と `calculate_trainer_info` で重複する前半処理を共通化する
- ただしパターン数が有限かつコメントで元実装との対応が明示されているため、可読性とのトレードオフがある

## 2026-02-10: pre-commit と Lingui 生成物の整合

現状: `.git/hooks/pre-commit.ps1` で `src/i18n/locales/` を除外し、CI は `pnpm format:check` で全体を検査している。
観察: フックはリポジトリ管理外のため共有されず、生成物の整形漏れが CI で検知される。
当面の方針: `src/i18n/locales/` をチェック対象に戻し、Husky でフック設定をリポジトリ管理に含める方針を検討する。

## 2026-02-10: 数値入力での IME 自動無効化

現状: 数値系 input はブラウザと IME の状態に依存しており、入力時に日本語 IME が残る場合がある。
観察: 数値入力中に IME が有効だと、変換候補表示や確定操作が混ざり、入力体験とバリデーションが不安定になる。
当面の方針: 数値系 form の focus 時に IME を無効化し、英数入力を強制する方法を検討する。

## 2026-02-11: WASM ビルドターゲットの `bundler` 移行検討

現状: `wasm-pack build --target web` で生成し、メインスレッド・Worker ともに手動で `initWasm()` を呼んで初期化している。`--target web` ではインポートだけでは WASM が使えず、初期化漏れによるバグが local_060 で発生した。
観察: `vite-plugin-wasm` + `vite-plugin-top-level-await` を導入し `--target bundler` に切り替えれば、import 時に自動初期化される。Worker 内でも `worker.plugins` に同プラグインを追加すれば動作する (`vite-plugin-wasm` README の Web Worker セクション参照)。これにより `initMainThreadWasm()` や Worker 内の手動初期化コード、`public/wasm/` への配信パイプラインが不要になる。
当面の方針: local_060 では `src/services/wasm-init.ts` にシングルトン初期化関数を新設して対処する。`bundler` ターゲットへの移行はビルドパイプライン全体の変更を伴うため、別タスクとして検討する。

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

## 2026-02-11: EggParamsForm の配置先

現状: `src/features/egg-search/components/egg-params-form.tsx` に配置。孵化検索専用コンポーネント。
観察: 個体生成 (egg-generation) でも同じ `EggGenerationParams` の入力 UI が必要になる見込み。
`SearchContextForm` や `KeySpecInput` と同様に `src/components/forms/` に昇格すれば複数機能で共有可能。
当面の方針: 個体生成機能の仕様確定時に移動する。現状では props が `EggGenerationParams` + `GenerationConfig` で WASM 型ベースのため、移動時の変更は最小限で済む。`EggFilterForm` も同様に共有候補。

## 2026-02-11: エンカウントデータの eager 読み込みとバンドルサイズ

現状: `import.meta.glob('./generated/v1/**/*.json', { eager: true })` により 28 JSON ファイル全量がバンドルに含まれる。
観察: ユーザは通常 1 バージョン + 1 メソッドの組み合わせしか選択しない。dynamic import に切り替えれば未使用 JSON を遅延読み込みでき、初期バンドルサイズを削減できる。ただし現時点では JSON は tree-shaking 対象外で実害は軽微。
当面の方針: ファイル数が増加した場合やパフォーマンス計測で問題が確認された場合に、`eager: false` (dynamic import) への移行を検討する。

## 2026-02-11: About ページの新設計画

経緯: pokebook.jp の出典表記をフッターに配置したが、フッターは常時表示されるため画面領域を圧迫する。出典情報は「About」タブ (独立ページ) にまとめたほうが適切。
方針: navigation.ts にカテゴリまたはスタンドアロンページとして `about` を追加し、BottomNav とサイドバーからアクセスする形を検討する。

About ページに掲載する内容候補 (別途検討):

- アプリ概要 (何ができるツールか、対象タイトル)
- データの出典 (pokebook.jp「ポケモンの友」+ niart120 参照実装)
- 使用技術・ライセンス情報
- リポジトリへのリンク
- 免責事項・利用条件

当面の方針: About ページの実装は別タスクとする。フッターコンポーネントは廃止済み (footer.tsx 削除、app.tsx から除去)。

## 2025-07-24: スクレイピング時のエンカウント地名キーと表示名の不整合

現状: `scripts/scrape-encounters.js` の `DUPLICATE_SUFFIX_RULES` が地名にサフィックスを付与し、`giant_chasm_cave` や `reversal_mountain_exterior` のようなサブエリアキーを生成する。一方 `src/lib/game-data-names.ts` の `ENCOUNTER_LOCATION_NAMES` にはサフィックス無しの親キーしか存在せず、生成された JSON に含まれるキーと表示名の対応が欠落していた。

観察:

- スクレイパー側で 12 件のサフィックス付きキーが生成されていたが、`game-data-names.ts` に対応エントリがなかった。
- `celestial_tower`（サフィックス無し）は全フロアが `_2f` 〜 `_5f` に分割されており、ベースキー単独の出現箇所がなかった。生成 JSON にも含まれないため削除した。
- `giant_chasm`, `reversal_mountain`, `virbank_complex`, `challengers_cave` はサフィックス無しのベースキーも DustCloud や水系メソッドで使用されるため、親キーと子キーの両方が必要。
- サフィックスルールの追加・変更時に `game-data-names.ts` 側の同期が漏れやすい構造になっている。

当面の方針: 今回は手動で 12 件を追加し、不要な `celestial_tower` を削除して整合をとった。将来的にはスクレイピング後にキーの過不足を自動検出するスクリプト（または CI チェック）の導入を検討する。

