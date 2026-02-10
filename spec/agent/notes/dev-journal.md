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

## 2026-02-09: 二値トグル UI の形式検討 (Checkbox vs Switch)

local_052 で SaveState Select を Checkbox に変更したが、二値切り替えの UI パターンとして Switch (トグルスイッチ) を採用する選択肢もある。
モバイル OS の設定画面では Switch 形式が一般的であり、Radix UI にも `Switch` プリミティブが存在する。
現時点では Checkbox で統一しているが、モバイル対応を進める段階で Switch への切り替えを検討する価値がある。

## 2026-02-10: pre-commit と Lingui 生成物の整合

現状: `.git/hooks/pre-commit.ps1` で `src/i18n/locales/` を除外し、CI は `pnpm format:check` で全体を検査している。
観察: フックはリポジトリ管理外のため共有されず、生成物の整形漏れが CI で検知される。
当面の方針: `src/i18n/locales/` をチェック対象に戻し、Husky でフック設定をリポジトリ管理に含める方針を検討する。

## 2026-02-10: React 19 での forwardRef 廃止

`src/components/ui/` の既存コンポーネント (tabs.tsx 等) が `React.forwardRef` を使用している。
React 19 では `ref` を通常の prop として渡せるため、`forwardRef` は不要。
対象範囲が `ui/` 全体に及ぶため、専用のリファクタリングタスクとして実施するのが適切。
