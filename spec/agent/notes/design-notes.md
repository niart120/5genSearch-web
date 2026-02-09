# 設計メモ (Design Notes)

実装中に生じた設計上の気づき・疑問・将来検討事項を蓄積する。

---

## 2026-02-09: `design-notes.md` のリネーム
[spec/agent/notes/design-notes.md](./design-notes.md) が既存のアーキテクチャドキュメントである[spec/agent/architecture/design-system.md](../architecture/design-system.md) と類似した名称を持っており混乱を招く恐れがある
英名・日本語名をより分かりやすい名称にリネームする。

## 2026-02-09: 言語切り替えボタンの表記

言語ボタンは現在 "JA" / "EN" （大文字 ISO-639-1 コード）を採用。
代替案として小文字 "ja" / "en" (BCP 47 準拠) が考えられる。Phase 2 で多言語対応を拡張する際に表記統一を検討する価値あり。

## 2026-02-09: ダークモード / ライトモード切り替えの UI 設計

Theme toggle は 3 状態 (Light / Dark / System) をサポートするが、現在は単一アイコンボタンで実装。
「System preference に従う」と「Dark に固定」の見た目の違いが曖昧で、ユーザーが現在の状態を誤認する可能性がある。

改善案：
1. ラジオボタン化して 3 状態を明示的に表示
2. 現在の状態をテキストで表示（例: "Auto (Dark)"）
3. Settings ページで詳細設定を提供

Phase 2 以降の UI/UX レビューで改善を検討すべき項目。

## 2026-02-09: メインコンテンツ未実装時の空画面

`App.tsx` の `<ResponsiveContainer>` に `children` を渡していないため、PC 版では sidebar + 空白の main、モバイル版では完全な白画面となる。
`max-w-screen-xl mx-auto` によるコンテナ中央寄せの影響で、小さめのモニタではサイドバーが画面中央に見える。

対処すべき事項は 2 つ:

1. **Phase 3 未実装時の暫定表示**: メインコンテンツが空のときにプレースホルダー（例: "検索条件を設定してください"）を表示する。既存の `EmptyState` コンポーネントを流用可能。
2. **ロード失敗時のフォールバック**: Error Boundary による React レンダリングエラーのキャッチ + フォールバック UI。Phase 3 のフィーチャーページ実装時に合わせて検討する。

DS Config (local_050) のスコープ外。Phase 3 で対応する。

## 2026-02-09: GameStartConfig の SaveState 表現の再検討

`SaveState` は現在 `"NoSave" | "WithSave" | "WithMemoryLink"` の enum だが、MemoryLink は BW2 専用かつ WithSave の上位互換という性質を持つ。
これは実質的に「セーブあり/なし」と「MemoryLink あり/なし」の直交する 2 軸であり、`save_state: SaveState` ではなく `has_save: boolean` + `memory_link: boolean` と分離した方が制約の表現が素直になる可能性がある。

現状は WASM 側の `SaveState` enum に合わせているため、TS 側だけ変えると境界変換が必要になる。
WASM API 側も含めて変更するかどうかは、他の設計判断への波及も考慮して判断すべき。
当面は BW2→BW 切替時の Store リセット (WithMemoryLink → WithSave) で回避する。
