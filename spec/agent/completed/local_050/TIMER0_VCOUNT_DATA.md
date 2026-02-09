# Timer0 / VCount デフォルト範囲データ

## 1. 概要

DS 設定機能で使用する Timer0 / VCount のデフォルト範囲を、ハードウェア群 × ROM バージョン × リージョンの全組み合わせについてまとめる。

### 1.1 用語定義

| 用語 | 定義 |
|------|------|
| DS/DSLite 群 | `Hardware::Ds` / `Hardware::DsLite`。frame 値のみ異なり Timer0/VCount 範囲は共通 |
| DSi/3DS 群 | `Hardware::Dsi` / `Hardware::Dsi3ds`。DS/DSLite 群とは異なる Timer0/VCount 範囲を取る |
| セグメント | Timer0 範囲と VCount の対応 1 件。一部リージョンでは VCount ずれにより複数セグメントが必要 |

### 1.2 ハードウェア依存性

Timer0/VCount 範囲は **ハードウェア群に依存する**。

| ハードウェア群 | 対象 Hardware | Timer0/VCount 特性 |
|---------------|-------------|-------------------|
| DS/DSLite | `Ds`, `DsLite` | BW: Timer0 ~0x0C67–0x0C87, VCount 0x5E–0x60 / BW2: Timer0 ~0x10E4–0x110D, VCount 0x81–0x83 |
| DSi/3DS | `Dsi`, `Dsi3ds` | BW: Timer0 ~0x1232–0x1238, VCount 0x8C / BW2: Timer0 ~0x150D–0x18B3, VCount 0xA2–0xBE |

同一ハードウェア群内 (例: Ds と DsLite) では Timer0/VCount 範囲は同一。差異は frame 値のみ (WASM 内部で処理)。

### 1.3 情報源

| ハードウェア群 | ソース | 信頼度 |
|---------------|--------|--------|
| DS/DSLite | [niart120/pokemon-gen5-initseed](https://github.com/niart120/pokemon-gen5-initseed) `src/data/rom-parameters.ts` (元データ: https://blog.bzl-web.com/entry/2020/09/18/235128) | 全 28 パターン確定済み |
| DSi/3DS JPN | ユーザー提供データ | JPN 4 パターン確定済み |
| DSi/3DS JPN 以外 | 未収集 | 仮値 (TODO) |

---

## 2. DS / DSLite 群

### 2.1 Black (DS/DSLite)

| Region | VCount | Timer0 Min | Timer0 Max | セグメント数 |
|--------|--------|------------|------------|-------------|
| Jpn | 0x60 | 0x0C79 | 0x0C7A | 1 |
| Kor | 0x60 | 0x0C84 | 0x0C85 | 1 |
| Usa | 0x60 | 0x0C7B | 0x0C7C | 1 |
| Ger | 0x5F | 0x0C77 | 0x0C78 | 1 |
| Fra | 0x5F | 0x0C73 | 0x0C74 | 1 |
| Spa | 0x60 | 0x0C86 | 0x0C87 | 1 |
| Ita | 0x5F | 0x0C6A | 0x0C6B | 1 |

### 2.2 White (DS/DSLite)

| Region | VCount | Timer0 Min | Timer0 Max | セグメント数 |
|--------|--------|------------|------------|-------------|
| Jpn | 0x5F | 0x0C67 | 0x0C69 | 1 |
| Kor | 0x60 | 0x0C7B | 0x0C7C | 1 |
| Usa | 0x60 | 0x0C7E | 0x0C80 | 1 |
| Ger | 0x60 | 0x0C7A | 0x0C7B | 1 |
| Fra | 0x5F | 0x0C6E | 0x0C6F | 1 |
| Spa | 0x5F | 0x0C70 | 0x0C71 | 1 |
| Ita | 0x60 | 0x0C7B | 0x0C7C | 1 |

### 2.3 Black 2 (DS/DSLite)

| Region | VCount | Timer0 Min | Timer0 Max | セグメント数 |
|--------|--------|------------|------------|-------------|
| Jpn | 0x82 | 0x1102 | 0x1108 | 1 |
| Kor | 0x82 | 0x10EF | 0x10F4 | 1 |
| Usa | 0x82 | 0x1102 | 0x1108 | 1 |
| Ger | ※複数 | — | — | 2 |
| Fra | 0x82 | 0x10F4 | 0x10F8 | 1 |
| Spa | 0x82 | 0x1101 | 0x1106 | 1 |
| Ita | ※複数 | — | — | 2 |

#### Black 2 / Ger (2 セグメント)

| セグメント | VCount | Timer0 Min | Timer0 Max |
|-----------|--------|------------|------------|
| 1 | 0x81 | 0x10E5 | 0x10E8 |
| 2 | 0x82 | 0x10E9 | 0x10EC |

#### Black 2 / Ita (2 セグメント)

| セグメント | VCount | Timer0 Min | Timer0 Max |
|-----------|--------|------------|------------|
| 1 | 0x82 | 0x1107 | 0x1109 |
| 2 | 0x83 | 0x1109 | 0x110D |

### 2.4 White 2 (DS/DSLite)

| Region | VCount | Timer0 Min | Timer0 Max | セグメント数 |
|--------|--------|------------|------------|-------------|
| Jpn | 0x82 | 0x10F5 | 0x10FB | 1 |
| Kor | 0x81 | 0x10E4 | 0x10E9 | 1 |
| Usa | 0x82 | 0x10F2 | 0x10F6 | 1 |
| Ger | 0x82 | 0x10E5 | 0x10ED | 1 |
| Fra | 0x82 | 0x10EC | 0x10F0 | 1 |
| Spa | 0x82 | 0x10EF | 0x10F4 | 1 |
| Ita | 0x82 | 0x10FF | 0x1104 | 1 |

---

## 3. DSi / 3DS 群

### 3.1 確定値 (JPN)

| Version | Region | VCount | Timer0 Min | Timer0 Max | セグメント数 |
|---------|--------|--------|------------|------------|-------------|
| Black | Jpn | 0x8C | 0x1237 | 0x1238 | 1 |
| White | Jpn | 0x8C | 0x1232 | 0x1234 | 1 |
| Black2 | Jpn | 0xA2 | 0x150D | 0x1514 | 1 |
| White2 | Jpn | 0xBE | 0x18AF | 0x18B3 | 1 |

### 3.2 未確定値 (JPN 以外) — TODO / WIP

以下のリージョンについては実測データが未収集。
JPN 確定値が存在することから、各リージョンにも固有の範囲が存在すると想定されるが、値は未確定。

**仮値の扱い**: 実装時は JPN 以外のエントリを `undefined` (未定義) として扱い、ユーザーに Manual 入力を促す設計とする。JPN の値をフォールバックとして使用しない (誤った Seed 計算の原因となるため)。

| Version | Region | VCount | Timer0 Min | Timer0 Max | 状態 |
|---------|--------|--------|------------|------------|------|
| Black | Kor | — | — | — | 未収集 |
| Black | Usa | — | — | — | 未収集 |
| Black | Ger | — | — | — | 未収集 |
| Black | Fra | — | — | — | 未収集 |
| Black | Spa | — | — | — | 未収集 |
| Black | Ita | — | — | — | 未収集 |
| White | Kor | — | — | — | 未収集 |
| White | Usa | — | — | — | 未収集 |
| White | Ger | — | — | — | 未収集 |
| White | Fra | — | — | — | 未収集 |
| White | Spa | — | — | — | 未収集 |
| White | Ita | — | — | — | 未収集 |
| Black2 | Kor | — | — | — | 未収集 |
| Black2 | Usa | — | — | — | 未収集 |
| Black2 | Ger | — | — | — | 未収集 |
| Black2 | Fra | — | — | — | 未収集 |
| Black2 | Spa | — | — | — | 未収集 |
| Black2 | Ita | — | — | — | 未収集 |
| White2 | Kor | — | — | — | 未収集 |
| White2 | Usa | — | — | — | 未収集 |
| White2 | Ger | — | — | — | 未収集 |
| White2 | Fra | — | — | — | 未収集 |
| White2 | Spa | — | — | — | 未収集 |
| White2 | Ita | — | — | — | 未収集 |

---

## 4. データ構造上の考慮事項

### 4.1 ルックアップキー

データを一意に引くには `HardwareGroup × RomVersion × RomRegion` の 3 軸が必要。

```
HardwareGroup = "DsLite" | "Dsi"   (同一群内の代表値)
RomVersion    = "Black" | "White" | "Black2" | "White2"
RomRegion     = "Jpn" | "Kor" | "Usa" | "Ger" | "Fra" | "Spa" | "Ita"
```

全パターン数: 2 群 × 4 version × 7 region = **56 パターン** (うち DS/DSLite 28 確定、DSi/3DS 4 確定 + 24 未収集)

### 4.2 未収集データの扱い

`lookupDefaultRanges()` の戻り値を `Timer0VCountRange[] | undefined` とし、`undefined` の場合は Auto モードが利用不可であることを UI に反映する。
