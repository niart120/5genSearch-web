# 開発ジャーナル (Dev Journal)

実装中に生じた設計上の気づき・疑問・将来検討事項を蓄積する。

---

## 2026-02-09: GameStartConfig の SaveState 表現の再検討

`SaveState` は現在 `"NoSave" | "WithSave" | "WithMemoryLink"` の enum だが、MemoryLink は BW2 専用かつ WithSave の上位互換という性質を持つ。
これは実質的に「セーブあり/なし」と「MemoryLink あり/なし」の直交する 2 軸であり、`save_state: SaveState` ではなく `has_save: boolean` + `memory_link: boolean` と分離した方が制約の表現が素直になる可能性がある。

現状は WASM 側の `SaveState` enum に合わせているため、TS 側だけ変えると境界変換が必要になる。
WASM API 側も含めて変更するかどうかは、他の設計判断への波及も考慮して判断すべき。
当面は BW2→BW 切替時の Store リセット (WithMemoryLink → WithSave) で回避する。
