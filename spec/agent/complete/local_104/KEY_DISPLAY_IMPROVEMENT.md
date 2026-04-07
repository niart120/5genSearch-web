# KeyCode → KeyMask 境界変更 仕様書

## 1. 概要

### 1.1 目的

WASM 境界で公開されている `KeyCode` 型（SHA-1 計算用内部値）を `KeyMask` 型（ボタン押下ビットフラグ）に置き換え、TypeScript 側での XOR 変換を全廃する。あわせて以下を対応する:

1. SeedOriginTable の Key カラム表示を hex 値からボタン名文字列に変更
2. CSV エクスポートヘッダーの `'Key'` / `'Key input'` 不統一を `'Key input'` に統一
3. JSON エクスポートフォーマットの `key_code` → `key_mask` 変更（旧形式フォールバック付き）

### 1.2 用語定義

| 用語 | 定義 |
|------|------|
| KeyCode | SHA-1 計算用内部値。`KeyMask XOR 0x2FFF` で算出される `u32`。変更後は `pub(crate)` に降格する |
| KeyMask | DS ボタン押下状態のビットフラグ `u32`。例: ボタンなし = `0x0000`、A = `0x0001`、A+Start = `0x0009`。変更後は `pub` に昇格し WASM 境界で公開する |
| StartupCondition | DS 起動条件。`timer0`, `vcount`, `key_mask`（現: `key_code`）を保持する構造体 |
| SeedOriginTable | Import タブの resolve 済み SeedOrigin 一覧テーブル |

### 1.3 背景・問題

#### KeyCode の不直感性

`KeyCode` は SHA-1 メッセージの word 12 に配置するための内部表現であり、ユーザにとって直感的でない:

| ボタン | KeyMask (直感的) | KeyCode (内部値) |
|--------|---------|---------|
| なし | `0x0000` | `0x2FFF` |
| A | `0x0001` | `0x2FFE` |
| A+Start | `0x0009` | `0x2FF6` |

TypeScript 側では `key_code` を受け取るたびに `^ 0x2FFF` で KeyMask 相当に変換してから使用している（`formatKeyCode()`, `keyCodeToKeyInput()` の 2 箇所）。この変換は冗長であり、WASM 境界で KeyMask を直接露出すれば不要になる。

#### SeedOriginTable の hex 表示

SeedOriginTable の Key カラムは `toHex(keyCode, 4)` で KeyCode 値を hex 表示しており（例: `2FFF`）、ユーザがどのボタンに対応するか判断できない。他の結果テーブルでは `formatKeyCode()` でボタン名文字列に変換済み。

#### CSV エクスポートヘッダーの不統一

`'Key'`（datetime-search, tid-adjust の 2 箇所）と `'Key input'`（pokemon-list, egg-list, egg-search の 3 箇所）が混在している。

### 1.4 期待効果

| 指標 | 変更前 | 変更後 |
|------|--------|--------|
| WASM 境界の Key 型 | `KeyCode`（内部値） | `KeyMask`（ビットフラグ） |
| TS 側の XOR 変換箇所 | 2 箇所 | 0 箇所 |
| SeedOriginTable Key カラム表示 | hex 値（例: `2FFF`） | ボタン名（例: `なし`、`A + Start`） |
| CSV エクスポートの Key ヘッダー名 | 2 種混在 | `'Key input'` に統一 |
| JSON エクスポート | `key_code: 12287` | `key_mask: 0`（旧形式読み込み可） |

### 1.5 着手条件

- なし（独立した改修）

## 2. 対象ファイル

### 2.1 Rust (WASM)

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `wasm-pkg/src/types/keyinput.rs` | 修正 | `KeyMask` を `pub` + Tsify export に昇格。`KeyCode` を `pub(crate)` に降格。`to_display_string()` を `KeyMask` に移動 |
| `wasm-pkg/src/types/config.rs` | 修正 | `StartupCondition.key_code: KeyCode` → `key_mask: KeyMask`。`key_code()` メソッド追加（SHA-1 用） |
| `wasm-pkg/src/core/sha1/message.rs` | 修正 | `BaseMessageBuilder::new()` の引数を `KeyMask` に変更し内部で `KeyCode` に変換、または `StartupCondition.key_code()` メソッド経由 |
| `wasm-pkg/src/core/seed_resolver.rs` | 修正 | `key_input.to_key_code()` → `key_input.to_key_mask()` |
| `wasm-pkg/src/datetime_search/mod.rs` | 修正 | `KeySpec::combinations()` の返り値を `Vec<KeyMask>` に変更 |
| `wasm-pkg/src/datetime_search/base.rs` | 修正 | `DatetimeHashGenerator` の condition 内 key_mask → key_code 変換 |
| `wasm-pkg/src/datetime_search/{egg,mtseed,trainer_info}.rs` | 修正 | `StartupCondition` 生成箇所の更新 |
| `wasm-pkg/src/types/seeds.rs` | 修正 | `SeedOrigin::Startup.condition` の型が自動的に追従 |
| `wasm-pkg/src/resolve/{pokemon,egg}.rs` | 修正 | `to_display_string()` の呼び出し元を `key_mask` に変更 |
| `wasm-pkg/src/lib.rs` | 修正 | `pub use` の `KeyCode` → `KeyMask` 差し替え |

### 2.2 TypeScript (フロントエンド)

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/lib/format.ts` | 修正 | `formatKeyCode()` → `formatKeyMask()` にリネーム、XOR 除去。`keyCodeToKeyInput()` → `keyMaskToKeyInput()` にリネーム、XOR 除去 |
| `src/services/seed-origin-serde.ts` | 修正 | `SerializedSeedOrigin` の `key_code` → `key_mask`。デシリアライズに旧形式フォールバック追加 |
| `src/services/export-columns.ts` | 修正 | `condition.key_code` → `condition.key_mask`。`header: 'Key'` → `header: 'Key input'`（2 箇所） |
| `src/components/forms/seed-origin-table.tsx` | 修正 | `getKeyCode()` → `getKeyMask()` + `toHex()` → `formatKeyMask()` |
| `src/features/datetime-search/components/seed-origin-columns.tsx` | 修正 | `condition.key_code` → `condition.key_mask` |
| `src/features/datetime-search/components/result-detail-dialog.tsx` | 修正 | `condition.key_code` → `condition.key_mask` |
| `src/features/tid-adjust/components/trainer-info-columns.tsx` | 修正 | `condition.key_code` → `condition.key_mask` |
| `src/features/egg-search/components/result-detail-dialog.tsx` | 修正 | `condition.key_code` → `condition.key_mask` |
| `src/features/needle/components/needle-result-columns.tsx` | 修正 | `condition.key_code` → `condition.key_mask`（該当箇所がある場合） |
| `src/components/forms/seed-input-section.tsx` | 修正 | `keyCodeToKeyInput()` → `keyMaskToKeyInput()` |
| `src/features/needle/components/needle-page.tsx` | 修正 | `keyCodeToKeyInput()` → `keyMaskToKeyInput()` |

### 2.3 テスト

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/test/unit/lib/format.test.ts` | 修正 | `formatKeyCode` → `formatKeyMask` テスト。入力値を KeyMask 値に変更 |
| `src/test/unit/seed-origin-serde.test.ts` | 修正 | `key_code` → `key_mask` + 旧形式フォールバックテスト追加 |
| `src/test/integration/seed-origin-import.test.ts` | 修正 | `key_code` → `key_mask` |
| `src/test/integration/wasm-binding.test.ts` | 修正 | `key_code: 0x2f_ff` → `key_mask: 0x0000` |
| `src/test/integration/workers/searcher.test.ts` | 修正 | `key_code` → `key_mask`、アサーション値を KeyMask 値に変更 |
| `src/test/integration/helpers/worker-test-utils.ts` | 修正 | `createTestStartupCondition()` の `key_code` → `key_mask` |
| `src/test/unit/export.test.ts` | 修正 | `key_code` → `key_mask`、`header: 'Key'` → `header: 'Key input'` |
| `src/test/unit/stores/results.test.ts` | 修正 | テストデータの `key_code` → `key_mask` |
| `src/test/unit/workers/types.test.ts` | 修正 | テストデータの `key_code` → `key_mask` |
| `src/test/unit/pokemon-list-validation.test.ts` | 修正 | テストデータの `key_code` → `key_mask` |
| `wasm-pkg/` テスト | 修正 | Rust テスト内の `KeyCode` 参照を `KeyMask` に変更 |

### 2.4 自動生成

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `src/wasm/wasm_pkg.d.ts` | 自動生成 | `wasm-pack build` で再生成。`KeyCode` → `KeyMask` に差し替わる |
| `src/wasm/wasm_pkg_bg.js` | 自動生成 | 同上 |

## 3. 設計方針

### 3.1 可視性の反転

| 型 | 変更前 | 変更後 | 用途 |
|----|--------|--------|------|
| `KeyMask` | `pub(crate)` | `pub` + Tsify export | WASM 境界、TS 側での全使用 |
| `KeyCode` | `pub` + Tsify export | `pub(crate)` | SHA-1 メッセージ構築のみ |

### 3.2 SHA-1 への KeyCode 供給

SHA-1 メッセージの word 12 には引き続き KeyCode 値を配置する必要がある。変換は `StartupCondition` 内に閉じ込める:

```rust
impl StartupCondition {
    /// SHA-1 計算用の KeyCode を返す
    pub(crate) fn key_code(&self) -> KeyCode {
        KeyCode::from_mask(self.key_mask)
    }
}
```

`BaseMessageBuilder::new()` は `StartupCondition` を受け取る形に変更するか、または `condition.key_code()` の結果を渡す。

### 3.3 KeyInput / KeySpec / 組み合わせ列挙の変更

`KeyInput::to_key_code()` → `to_key_mask()` にリネーム。`KeySpec::combinations()` → `Vec<KeyMask>` を返すように変更。いずれも XOR 変換を内部で行わなくなるため、ビットフラグの OR 結果をそのまま `KeyMask` として返す。

内部実装の影響範囲:

| 関数 | 変更内容 |
|------|----------|
| `generate_key_combinations()` | 返り値を `Vec<KeyCode>` → `Vec<KeyMask>` に変更。末尾の `KeyCode::from_mask()` 呼び出しを除去し `KeyMask::new(mask)` をそのまま返す |
| `is_invalid_button_combination()` | 変更なし。元々 mask（ビットフラグ）で動作しており KeyCode に依存していない |
| `KeySpec::combination_count()` | 変更なし（`combinations().len()` のラッパーであり型に依存しない） |
| `KeySpec::combinations()` テスト | `code.0 ^ 0x2FFF` で mask を復元する検証コードが不要になる。`KeyMask` の `.0` を直接検証する形に単純化 |

### 3.4 TS 側の XOR 全廃

`src/lib/format.ts` の以下 2 箇所から XOR 変換を除去する:

- `formatKeyCode()` → `formatKeyMask(keyMask: number)`: 引数を直接ビットマスクとして使用
- `keyCodeToKeyInput()` → `keyMaskToKeyInput(keyMask: number)`: 同上

### 3.5 JSON エクスポートの破壊的変更

**新形式:**

```json
{
  "Startup": {
    "condition": { "timer0": 1536, "vcount": 94, "key_mask": 0 }
  }
}
```

**旧形式フォールバック:**

デシリアライズ時に `key_code` フィールドが存在し `key_mask` が不在の場合、`key_code ^ 0x2FFF` で KeyMask 値に変換する:

```typescript
function migrateCondition(cond: Record<string, unknown>): { timer0: number; vcount: number; key_mask: number } {
  if ('key_mask' in cond && typeof cond.key_mask === 'number') {
    return { timer0: cond.timer0 as number, vcount: cond.vcount as number, key_mask: cond.key_mask };
  }
  if ('key_code' in cond && typeof cond.key_code === 'number') {
    return { timer0: cond.timer0 as number, vcount: cond.vcount as number, key_mask: (cond.key_code as number) ^ 0x2FFF };
  }
  throw new Error('Missing key_mask or key_code');
}
```

### 3.6 SeedOriginTable の表示変更

Key カラムの表示を `toHex(keyCode, 4)` → `formatKeyMask(keyMask)` に変更。ボタン名文字列（例: `A + Start`、`なし`）を表示する。

### 3.7 CSV エクスポートヘッダー統一

`header: 'Key'` の 2 箇所（datetime-search, tid-adjust）を `header: 'Key input'` に統一する。

### 3.8 対象外

- `formatKeyMask()` の `"なし"` ハードコードの i18n 化（別途対応）
- SeedOriginTable へのボタン選択 UI の導入
- Rust 側 `KeyCode::to_display_string()` の `"[A]+[Start]+"` 形式の i18n 対応（`UiPokemonData.key_input` / `UiEggData.key_input` で使用されるが、表示形式の変更は本仕様の対象外）

## 4. 実装仕様

### 4.1 Rust: KeyMask の昇格

変更前:

```rust
pub(crate) struct KeyMask(pub u32);
```

変更後:

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[repr(transparent)]
pub struct KeyMask(pub u32);
```

`to_display_string()` を `KeyCode` から `KeyMask` に移動する。KeyMask ではビットを直接検査できるため XOR 変換が不要になる:

```rust
impl KeyMask {
    pub fn to_display_string(&self) -> String {
        let mut parts = Vec::new();
        for &(mask, name) in &BUTTON_TABLE {
            if self.0 & mask != 0 {
                parts.push(name);
            }
        }
        if parts.is_empty() { String::new() } else { parts.join("+") }
    }
}
```

### 4.2 Rust: KeyCode の降格

変更前:

```rust
#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[repr(transparent)]
pub struct KeyCode(pub u32);
```

変更後:

```rust
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(transparent)]
pub(crate) struct KeyCode(pub(crate) u32);
```

Tsify / Serialize / Deserialize derive を除去。`to_display_string()` メソッドを除去。`from_mask()`, `value()`, `NONE` は維持（SHA-1 メッセージ構築で必要）。

### 4.3 Rust: StartupCondition の変更

変更前:

```rust
pub struct StartupCondition {
    pub timer0: u16,
    pub vcount: u8,
    pub key_code: KeyCode,
}
```

変更後:

```rust
pub struct StartupCondition {
    pub timer0: u16,
    pub vcount: u8,
    pub key_mask: KeyMask,
}

impl StartupCondition {
    pub fn new(timer0: u16, vcount: u8, key_mask: KeyMask) -> Self {
        Self { timer0, vcount, key_mask }
    }

    /// SHA-1 計算用の KeyCode を返す (crate 内部のみ)
    pub(crate) fn key_code(&self) -> KeyCode {
        KeyCode::from_mask(self.key_mask)
    }
}
```

### 4.4 Rust: SHA-1 メッセージ構築

`BaseMessageBuilder::new()` の `key_code: KeyCode` 引数は維持するが、呼び出し元で `condition.key_code()` を渡す形に変更する:

```rust
// seed_resolver.rs
let key_mask = key_input.to_key_mask();
let condition = StartupCondition::new(timer0, vcount, key_mask);
let builder = BaseMessageBuilder::new(
    &nazo, ds.mac, condition.vcount, condition.timer0,
    condition.key_code(),  // KeyMask → KeyCode の変換はここで1回だけ
    frame,
);
```

### 4.5 Rust: KeyInput / KeySpec / 組み合わせ列挙の変更

```rust
impl KeyInput {
    pub fn to_key_mask(&self) -> KeyMask {
        let mask = self.buttons.iter().fold(0u32, |acc, b| acc | b.bit_mask());
        KeyMask::new(mask)
    }
}

impl KeySpec {
    pub fn combinations(&self) -> Vec<KeyMask> {
        generate_key_combinations(&self.available_buttons)
    }
}
```

`generate_key_combinations()` の変更:

```rust
fn generate_key_combinations(buttons: &[DsButton]) -> Vec<KeyMask> {
    let n = buttons.len();
    let mut result = Vec::with_capacity(1 << n);

    for bits in 0..(1u32 << n) {
        let mask = buttons
            .iter()
            .enumerate()
            .filter(|(i, _)| bits & (1 << i) != 0)
            .fold(0u32, |acc, (_, b)| acc | b.bit_mask());

        if !is_invalid_button_combination(mask) {
            result.push(KeyMask::new(mask));
        }
    }
    result
}
```

`is_invalid_button_combination()` は変更なし（元々 `u32` mask で動作）。

`expand_combinations()` (`datetime_search/mod.rs`) の変更:

```rust
pub(crate) fn expand_combinations(context: &DatetimeSearchContext) -> Vec<StartupCondition> {
    let key_masks = context.key_spec.combinations();  // Vec<KeyMask>
    let mut combinations = Vec::new();

    for range in &context.ranges {
        for timer0 in range.timer0_min..=range.timer0_max {
            for vcount in range.vcount_min..=range.vcount_max {
                for &key_mask in &key_masks {
                    combinations.push(StartupCondition::new(timer0, vcount, key_mask));
                }
            }
        }
    }
    combinations
}
```

### 4.6 TS: formatKeyMask / keyMaskToKeyInput

変更前:

```typescript
function formatKeyCode(keyCode: number): string {
  const mask = keyCode ^ 0x2f_ff;
  const pressed: string[] = [];
  for (const [bit, name] of KEY_BUTTONS) {
    if ((mask & bit) !== 0) pressed.push(name);
  }
  return pressed.length === 0 ? 'なし' : pressed.join(' + ');
}
```

変更後:

```typescript
function formatKeyMask(keyMask: number): string {
  const pressed: string[] = [];
  for (const [bit, name] of KEY_BUTTONS) {
    if ((keyMask & bit) !== 0) pressed.push(name);
  }
  return pressed.length === 0 ? 'なし' : pressed.join(' + ');
}
```

同様に `keyCodeToKeyInput` → `keyMaskToKeyInput`:

```typescript
function keyMaskToKeyInput(keyMask: number): KeyInput {
  const buttons: DsButton[] = [];
  for (const [bit, name] of KEY_BUTTON_MAP) {
    if ((keyMask & bit) !== 0) buttons.push(name);
  }
  return { buttons };
}
```

### 4.7 TS: SeedOriginTable の表示変更

変更前:

```tsx
{keyCode === undefined ? '-' : toHex(keyCode, 4)}
```

変更後:

```tsx
{keyMask === undefined ? '-' : formatKeyMask(keyMask)}
```

### 4.8 TS: seed-origin-serde.ts の変更

**SerializedSeedOrigin 型:**

```typescript
condition: { timer0: number; vcount: number; key_mask: number };
```

**バリデーション (旧形式フォールバック):**

```typescript
// 新形式: key_mask が存在
if (typeof cond.key_mask === 'number') return true;
// 旧形式: key_code が存在 → デシリアライズ時に変換
if (typeof cond.key_code === 'number') return true;
return false;
```

**デシリアライズ:**

```typescript
const condRaw = serialized.Startup.condition as Record<string, unknown>;
const key_mask = typeof condRaw.key_mask === 'number'
  ? condRaw.key_mask
  : (condRaw.key_code as number) ^ 0x2FFF;
const condition = { timer0: condRaw.timer0 as number, vcount: condRaw.vcount as number, key_mask };
```

### 4.9 TS: CSV エクスポートヘッダー統一

`src/services/export-columns.ts` 内の `header: 'Key'` 2 箇所を `header: 'Key input'` に変更。`condition.key_code` → `condition.key_mask` への変更も全箇所で実施。

## 5. テスト方針

### 5.1 Rust テスト

- `cargo test`: `KeyMask::to_display_string()` のテスト（ボタン名変換）
- `KeyCode::from_mask()` / `KeyMask::new()` の変換テスト
- `StartupCondition::key_code()` が正しく XOR 変換された KeyCode を返すこと
- `cargo clippy --all-targets -- -D warnings`: 警告なし

### 5.2 TS ユニットテスト

- `formatKeyMask()`: KeyMask 値 → ボタン名文字列の変換テスト
  - `0x0000` → `'なし'`
  - `0x0001` → `'A'`
  - `0x0009` → `'A + Start'`
- `keyMaskToKeyInput()`: KeyMask 値 → `KeyInput` 変換テスト
- `seed-origin-serde`: 新形式 (`key_mask`) の round-trip テスト
- `seed-origin-serde`: 旧形式 (`key_code`) からの migration テスト
  - `{ key_code: 0x2FFF }` → `key_mask: 0`
  - `{ key_code: 0x2FFE }` → `key_mask: 1`

### 5.3 統合テスト

- WASM binding テスト: `StartupCondition` の `key_mask` フィールドを使用
- Worker searcher テスト: 検索結果の `condition.key_mask` の値を検証

### 5.4 回帰確認

- `pnpm build:wasm` でビルドエラーなし
- `pnpm exec tsc -b --noEmit` でコンパイルエラーなし
- `pnpm lint` / `cargo clippy` でエラーなし
- `pnpm test:run` / `cargo test` で既存テスト通過

## 6. 実装チェックリスト

### Phase 1: Rust 側変更

- [x] `wasm-pkg/src/types/keyinput.rs`: `KeyMask` を `pub` + Tsify export に変更
- [x] `wasm-pkg/src/types/keyinput.rs`: `to_display_string()` を `KeyMask` に移動
- [x] `wasm-pkg/src/types/keyinput.rs`: `KeyCode` を `pub(crate)` に降格、Tsify 除去
- [x] `wasm-pkg/src/types/keyinput.rs`: `KeyInput::to_key_code()` → `to_key_mask()`
- [x] `wasm-pkg/src/types/keyinput.rs`: `KeySpec::combinations()` の返り値を `Vec<KeyMask>` に変更
- [x] `wasm-pkg/src/types/config.rs`: `StartupCondition.key_code` → `key_mask`、`key_code()` メソッド追加
- [x] `wasm-pkg/src/core/sha1/message.rs`: `key_code` 引数の呼び出し元を更新
- [x] `wasm-pkg/src/core/seed_resolver.rs`: `to_key_code()` → `to_key_mask()`、`StartupCondition::new()` 更新
- [x] `wasm-pkg/src/datetime_search/mod.rs`: `expand_combinations()` を `Vec<KeyMask>` に対応
- [x] `wasm-pkg/src/datetime_search/{base,egg,mtseed,trainer_info}.rs`: `StartupCondition` 生成箇所の更新
- [x] `wasm-pkg/src/resolve/{pokemon,egg}.rs`: `to_display_string()` を `key_mask` 経由に変更
- [x] `wasm-pkg/src/lib.rs`: `pub use` の `KeyCode` → `KeyMask` 差し替え
- [x] `cargo test` 通過
- [x] `cargo clippy --all-targets -- -D warnings` 通過

### Phase 2: WASM ビルド & 型生成

- [x] `pnpm build:wasm` で型定義 (`wasm_pkg.d.ts`) が `KeyMask` に更新されることを確認

### Phase 3: TypeScript 側変更

- [x] `src/lib/format.ts`: `formatKeyCode()` → `formatKeyMask()`、XOR 除去
- [x] `src/lib/format.ts`: `keyCodeToKeyInput()` → `keyMaskToKeyInput()`、XOR 除去
- [x] `src/services/seed-origin-serde.ts`: `SerializedSeedOrigin` の `key_code` → `key_mask` + 旧形式フォールバック
- [x] `src/services/export-columns.ts`: `condition.key_code` → `condition.key_mask` (全箇所)
- [x] `src/services/export-columns.ts`: `header: 'Key'` → `header: 'Key input'` (2 箇所)
- [x] `src/components/forms/seed-origin-table.tsx`: `getKeyCode()` → `getKeyMask()` + `formatKeyMask()` 表示
- [x] `src/features/datetime-search/components/seed-origin-columns.tsx`: `key_code` → `key_mask`
- [x] `src/features/datetime-search/components/result-detail-dialog.tsx`: `key_code` → `key_mask`
- [x] `src/features/tid-adjust/components/trainer-info-columns.tsx`: `key_code` → `key_mask`
- [x] `src/features/egg-search/components/result-detail-dialog.tsx`: `key_code` → `key_mask`
- [x] `src/components/forms/seed-input-section.tsx`: `keyCodeToKeyInput()` → `keyMaskToKeyInput()`
- [x] `src/features/needle/components/needle-page.tsx`: `keyCodeToKeyInput()` → `keyMaskToKeyInput()`

### Phase 4: テスト更新

- [x] `src/test/unit/lib/format.test.ts`: `formatKeyMask` テスト、入力値を KeyMask 値に変更
- [x] `src/test/unit/seed-origin-serde.test.ts`: `key_mask` テスト + 旧形式フォールバックテスト
- [x] `src/test/integration/seed-origin-import.test.ts`: 変更不要（condition 全体の等価比較で自動追従）
- [x] `src/test/integration/wasm-binding.test.ts`: `key_code: 0x2f_ff` → `key_mask: 0`
- [x] `src/test/integration/workers/searcher.test.ts`: `key_code` → `key_mask`
- [x] `src/test/integration/helpers/worker-test-utils.ts`: `key_code` → `key_mask`
- [x] `src/test/unit/export.test.ts`: `key_code` → `key_mask`、ヘッダー検証更新
- [x] `src/test/unit/stores/results.test.ts`: `key_code` → `key_mask`
- [x] `src/test/unit/workers/types.test.ts`: `key_code` → `key_mask`
- [x] `src/test/unit/pokemon-list-validation.test.ts`: `key_code` → `key_mask`

### Phase 5: 検証

- [x] `pnpm exec tsc -b --noEmit` でコンパイルエラーなし
- [x] `pnpm lint` でエラーなし
- [x] `cargo fmt --check` で差分なし
- [x] `pnpm test:run` で既存テスト通過 (1393 tests)
- [x] `pnpm test:wasm` で WASM テスト通過
