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

## 2026-02-10: PC 版 FeatureContent 内部のレイアウト構成

現状: design-system.md のレイアウト図および各機能 spec (DATETIME_SEARCH.md, EGG_SEARCH.md) では、FeatureContent 内部を「上: フォーム → 下: 結果テーブル」の縦積みで暗黙に前提としていた。
観察: PC 版で縦積みにすると、フォーム量が多い機能 (egg-search 等) では 100dvh 制約内で結果テーブルに割ける高さが不足する。また「条件微調整 → 再検索 → 結果確認」の反復操作でフォームと結果が同時に視認できない。
当面の方針: PC 版 (`lg+`) は FeatureContent 内を Controls | Results の横 2 ペインとする。`FeaturePageLayout` Compound Component で Controls / Results の 2 スロットを提供し、各 feature page がスロットに children を渡す設計。Controls ペイン内部の構成 (Accordion/grid 等) は各 feature が自由に決定する。モバイルは縦積み。関連ドキュメント (design-system.md, responsive-design.md, frontend-structure.md, DATETIME_SEARCH.md, EGG_SEARCH.md) を更新済み。

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

## 2026-02-11: Rust/WASM と TypeScript のエンカウントデータ責務分担

現状: エンカウントデータの管理は以下の通り分担されている。

| 責務 | 担当 |
|------|------|
| エンカウントテーブルデータ保持 (場所 × スロット) | TypeScript (JSON) |
| スロット確率分布 (乱数値 → スロット番号) | Rust (ハードコード) |
| 乱数消費・個体値生成 | Rust |
| エンカウント判定 (移動/特殊/釣り成功失敗) | Rust |
| Item/Pokemon 振り分け (DustCloud/PokemonShadow) | Rust |
| 種族メタデータ (種族値/性別比/特性) | Rust (`SPECIES_TABLE`) |
| UI 向け場所・種族選択肢の構築 | TypeScript (helpers) |
| `EncounterSlotConfig` 型定義 | Rust (tsify で TS 型自動生成) |

観察: Rust 側に場所ごとのエンカウントテーブルは存在しない。`PokemonGenerationParams.slots` として TS から WASM に渡される。TS 側の `converter.ts` が JSON スキーマ → WASM 入力型の変換を担当する。`EncounterSlotConfig` や `EncounterType` の型は Rust がオーナーであり、TS 側で独自に定義・拡張しない。
当面の方針: 現在の分担を維持する。TS 側は「どの場所にどのスロットがあるか」を管理し、Rust 側は「乱数からポケモン個体を決定する」計算を担当する。型の二重管理を避けるため、WASM バインディング型を TS 側で re-export する形を取る。

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

## 2026-02-11: エンカウントデータの i18n 戦略

### 現状

エンカウントデータに関する i18n 対象は以下の 3 カテゴリ:

1. **ロケーション名** (`displayNameKey`): 生成 JSON に日本語テキストがハードコードされている (例: `"電気石の洞穴1F"`)
2. **種族名**: Rust 側 `SPECIES_NAMES_JA` / `SPECIES_NAMES_EN` で管理。Lingui 経由ではない
3. **メソッド名** (Normal, ShakingGrass 等): UI ラベルとして Lingui で管理すべき

### バスラオ (speciesId: 550) のフォーム問題

pokebook.jp では「バスラオ赤」「バスラオ青」と区別されるが、スクレイパーの `FORM_ALIASES` で両方とも `speciesId: 550` に解決される。以下の問題がある:

- `EncounterSlotJson` に `formId` がない → フォーム情報が不可逆的に消失
- `helpers.ts` の `listEncounterSpecies` は speciesId でグルーピングするため赤・青が合算される
- Rust 側 `EncounterSlotConfig` にもフォーム情報がない

Gen 5 のゲーム仕様上、バスラオのフォーム (赤/青) はバージョンによって固定 (B/B2=赤縞、W/W2=青縞) であり、乱数で決まるわけではない。したがって、エンカウントスロットの計算結果に直接影響しない。表示上の区別が必要かどうかは UI 設計次第。

### species-ja.json の位置づけ

`species-ja.json` はスクレイパー専用。ランタイムでは未使用。ランタイムの種族名解決は Rust 側 `get_species_name()` が担当する。

### 当面の方針

- ロケーション名: `displayNameKey` を Lingui メッセージカタログのキーとして使用する方向を検討。英語訳は別途用意が必要
- 種族名: 現状の Rust 側管理を維持。フォーム名が必要になった場合は Rust に `get_species_form_name()` を追加する方向
- メソッド名: Lingui の `<Trans>` で UI ラベルを管理
- バスラオのフォーム情報: 当面は `speciesId` のみで管理し、必要に応じて `formId` フィールドを全レイヤー (JSON schema → TS 型 → Rust `EncounterSlotConfig`) に追加する
